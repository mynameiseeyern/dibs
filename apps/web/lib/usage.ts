import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Dibby's AI spend for /admin/usage.
//
// Tokens and cost come straight from Anthropic's Usage & Cost Admin API (needs an Admin key,
// which only Console organisations can make). Anthropic reports per day, not per person, so each
// day's cost is split evenly across that day's @dibby messages: every Claude call Dibby makes
// (draftPlan, replyInThread, suggestMore) starts from one. Nudges and recaps are templates and
// cost nothing. Each share is charged to whoever wrote the @dibby, and rolls up to the plan and
// its organiser.

const API = process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com";
const MODEL = process.env.DIBBY_MODEL ?? "claude-haiku-5-5";
const DAY = 86_400_000;

export interface DayUsage {
  day: string; // UTC date, YYYY-MM-DD (Anthropic's buckets are UTC days)
  inputTokens: number; // uncached + cache writes
  cachedTokens: number; // cache reads
  outputTokens: number;
  costUsd: number;
  mentions: number;
}

export interface Asker {
  memberId: string;
  name: string;
  guest: boolean;
  mentions: number;
  costUsd: number;
}

export interface PlanUsage {
  planId: string;
  title: string;
  slug: string;
  mentions: number;
  costUsd: number;
  askers: Asker[];
}

export interface OrganiserUsage {
  key: string;
  name: string;
  mentions: number;
  costUsd: number;
  plans: PlanUsage[];
}

export interface UsageReport {
  model: string;
  since: string;
  days: DayUsage[];
  totals: { costUsd: number; inputTokens: number; cachedTokens: number; outputTokens: number; mentions: number; unattributedUsd: number };
  organisers: OrganiserUsage[];
  /** Set when Anthropic couldn't be read; the Supabase side still shows. */
  anthropicError: string | null;
}

const dayOf = (iso: string) => iso.slice(0, 10);

let client: SupabaseClient | null = null;
function db(): SupabaseClient | null {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

// ---------- Anthropic ----------

interface Page<T> {
  data: { starting_at: string; results: T[] }[];
  has_more: boolean;
  next_page: string | null;
}
interface UsageRow {
  uncached_input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation?: { ephemeral_5m_input_tokens?: number; ephemeral_1h_input_tokens?: number };
  output_tokens?: number;
}
interface CostRow {
  amount: string;
  model?: string | null;
  workspace_id?: string | null;
}

async function pages<T>(path: string, params: [string, string][]): Promise<Page<T>["data"]> {
  const key = process.env.ANTHROPIC_ADMIN_KEY;
  if (!key) throw new Error("ANTHROPIC_ADMIN_KEY isn't set");
  const out: Page<T>["data"] = [];
  let page: string | null = null;
  for (let i = 0; i < 20; i++) {
    const q = new URLSearchParams(params);
    if (page) q.set("page", page);
    const res = await fetch(`${API}${path}?${q}`, {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "user-agent": "Dibby admin" },
      next: { revalidate: 300 }, // the report lags a few minutes anyway; spares the rate limit
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const body = (await res.json()) as Page<T>;
    out.push(...body.data);
    if (!body.has_more || !body.next_page) break;
    page = body.next_page;
  }
  return out;
}

async function anthropicDays(since: Date, until: Date) {
  const workspace = process.env.DIBBY_ANTHROPIC_WORKSPACE_ID;
  const base: [string, string][] = [
    ["starting_at", since.toISOString()],
    ["ending_at", until.toISOString()],
    ["bucket_width", "1d"],
    ["limit", "31"],
  ];
  const usageParams: [string, string][] = [...base, ["models[]", MODEL]];
  if (workspace) usageParams.push(["workspace_ids[]", workspace]);
  // The cost report can't filter, so group and keep Dibby's model (and workspace, if set) here.
  const costParams: [string, string][] = [...base, ["group_by[]", "description"], ["group_by[]", "workspace_id"]];

  const [usage, cost] = await Promise.all([
    pages<UsageRow>("/v1/organizations/usage_report/messages", usageParams),
    pages<CostRow>("/v1/organizations/cost_report", costParams),
  ]);

  const days = new Map<string, Omit<DayUsage, "day" | "mentions">>();
  const get = (d: string) => {
    let v = days.get(d);
    if (!v) days.set(d, (v = { inputTokens: 0, cachedTokens: 0, outputTokens: 0, costUsd: 0 }));
    return v;
  };
  for (const b of usage) {
    const d = get(dayOf(b.starting_at));
    for (const r of b.results) {
      d.inputTokens += (r.uncached_input_tokens ?? 0) + (r.cache_creation?.ephemeral_5m_input_tokens ?? 0) + (r.cache_creation?.ephemeral_1h_input_tokens ?? 0);
      d.cachedTokens += r.cache_read_input_tokens ?? 0;
      d.outputTokens += r.output_tokens ?? 0;
    }
  }
  for (const b of cost) {
    const d = get(dayOf(b.starting_at));
    for (const r of b.results) {
      if (r.model && r.model !== MODEL) continue;
      if (!r.model) continue; // web search, code execution: Dibby uses neither
      if (workspace && r.workspace_id !== workspace) continue;
      d.costUsd += Number(r.amount) / 100; // amounts are decimal strings in cents
    }
  }
  return days;
}

// ---------- Supabase ----------

interface Mention {
  id: string;
  plan_id: string;
  member_id: string | null;
  created_at: string;
}

async function mentionsSince(since: Date) {
  const sb = db();
  if (!sb) return { mentions: [] as Mention[], members: new Map(), plans: new Map(), names: new Map<string, string>() };
  const mentions = must(
    await sb.from("messages").select("id, plan_id, member_id, created_at").eq("mentions_dibby", true).gte("created_at", since.toISOString()).limit(10_000)
  ) as Mention[];
  const planIds = [...new Set(mentions.map((m) => m.plan_id))];
  const memberIds = [...new Set(mentions.map((m) => m.member_id).filter((x): x is string => Boolean(x)))];
  const [plans, members] = await Promise.all([
    planIds.length ? must(await sb.from("plans").select("id, title, slug, organiser_id").in("id", planIds)) : [],
    memberIds.length ? must(await sb.from("plan_members").select("id, display_name, user_id, guest_id, role, plan_id").in("id", memberIds)) : [],
  ]) as [
    { id: string; title: string; slug: string; organiser_id: string | null }[],
    { id: string; display_name: string; user_id: string | null; guest_id: string | null; role: string; plan_id: string }[],
  ];
  const organiserIds = [...new Set(plans.map((p) => p.organiser_id).filter((x): x is string => Boolean(x)))];
  const profiles = organiserIds.length
    ? (must(await sb.from("profiles").select("user_id, first_name, last_name").in("user_id", organiserIds)) as { user_id: string; first_name: string; last_name: string }[])
    : [];
  return {
    mentions,
    plans: new Map(plans.map((p) => [p.id, p])),
    members: new Map(members.map((m) => [m.id, m])),
    names: new Map(profiles.map((p) => [p.user_id, `${p.first_name} ${p.last_name}`.trim()])),
  };
}

// ---------- Report ----------

export async function usageReport(sinceDays: number): Promise<UsageReport> {
  const until = new Date(Math.ceil(Date.now() / DAY) * DAY); // end of today, UTC
  const since = new Date(until.getTime() - sinceDays * DAY);

  const [ant, sb] = await Promise.all([
    anthropicDays(since, until).then(
      (d) => ({ days: d, error: null as string | null }),
      (e: Error) => ({ days: new Map<string, Omit<DayUsage, "day" | "mentions">>(), error: e.message })
    ),
    mentionsSince(since),
  ]);

  const perDay = new Map<string, number>();
  for (const m of sb.mentions) perDay.set(dayOf(m.created_at), (perDay.get(dayOf(m.created_at)) ?? 0) + 1);

  const days: DayUsage[] = [];
  for (let t = since.getTime(); t < until.getTime(); t += DAY) {
    const day = new Date(t).toISOString().slice(0, 10);
    const a = ant.days.get(day) ?? { inputTokens: 0, cachedTokens: 0, outputTokens: 0, costUsd: 0 };
    days.push({ day, ...a, mentions: perDay.get(day) ?? 0 });
  }
  const costByDay = new Map(days.map((d) => [d.day, d]));

  // Roll each mention's share up: asker → plan → organiser.
  const organisers = new Map<string, OrganiserUsage>();
  for (const m of sb.mentions) {
    const d = costByDay.get(dayOf(m.created_at));
    const share = d && d.mentions ? d.costUsd / d.mentions : 0;
    const plan = sb.plans.get(m.plan_id);
    const orgKey = plan?.organiser_id ?? "unknown";
    let org = organisers.get(orgKey);
    if (!org) {
      org = { key: orgKey, name: (plan?.organiser_id && sb.names.get(plan.organiser_id)) || "No organiser", mentions: 0, costUsd: 0, plans: [] };
      organisers.set(orgKey, org);
    }
    let p = org.plans.find((x) => x.planId === m.plan_id);
    if (!p) org.plans.push((p = { planId: m.plan_id, title: plan?.title ?? "Deleted plan", slug: plan?.slug ?? "", mentions: 0, costUsd: 0, askers: [] }));
    const member = m.member_id ? sb.members.get(m.member_id) : undefined;
    const askerId = m.member_id ?? "former";
    let a = p.askers.find((x) => x.memberId === askerId);
    if (!a) p.askers.push((a = { memberId: askerId, name: member?.display_name ?? "Former member", guest: Boolean(member && !member.user_id), mentions: 0, costUsd: 0 }));
    for (const x of [org, p, a]) {
      x.mentions += 1;
      x.costUsd += share;
    }
  }
  const byCost = <T extends { costUsd: number; mentions: number }>(a: T, b: T) => b.costUsd - a.costUsd || b.mentions - a.mentions;
  const list = [...organisers.values()].sort(byCost);
  for (const o of list) {
    o.plans.sort(byCost);
    for (const p of o.plans) p.askers.sort(byCost);
  }

  const sum = (k: keyof Omit<DayUsage, "day">) => days.reduce((n, d) => n + d[k], 0);
  return {
    model: MODEL,
    since: since.toISOString(),
    days,
    totals: {
      costUsd: sum("costUsd"),
      inputTokens: sum("inputTokens"),
      cachedTokens: sum("cachedTokens"),
      outputTokens: sum("outputTokens"),
      mentions: sum("mentions"),
      // Spend on days with no @dibby (playground tests, another app on the same key).
      unattributedUsd: days.filter((d) => d.mentions === 0).reduce((n, d) => n + d.costUsd, 0),
    },
    organisers: list,
    anthropicError: ant.error,
  };
}
