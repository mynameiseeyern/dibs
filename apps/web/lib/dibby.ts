import "server-only";
import type { Message, Plan, PlanMember, PlanOption, Vibe } from "@dibs/shared/types";
import { searchVenues, type Venue } from "./places";
import { TZ } from "./time";

// Dibby: Claude Haiku with tools. Reads only messages that tag @dibby (plus recent context),
// keeps no memory between plans, never talks about money owed or anything personal.

const MODEL = process.env.DIBBY_MODEL ?? "claude-haiku-5-5";
const TIMEOUT_MS = 15_000;

export const BRB = "brb, try me again in a sec";

type Block =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };
type Turn = { role: "user" | "assistant"; content: string | Block[] };
interface Tool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

async function claude(system: string, messages: Turn[], tools: Tool[], toolChoice?: { type: "tool"; name: string }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("No ANTHROPIC_API_KEY");
  const res = await fetch(`${process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com"}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 800, system, messages, tools, ...(toolChoice ? { tool_choice: toolChoice } : {}) }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as { content: Block[]; stop_reason: string };
}

const VOICE: Record<Vibe, string> = {
  chill: "Chill: casual, warm, a little cheeky, light Aussie slang. Emoji rarely, at most one.",
  extra: "Extra: hyped and playful, emoji welcome (two or three max), still short.",
  straight: "Straight up: plain and clear, no banter, no emoji.",
};

function nowInSydney() {
  return new Intl.DateTimeFormat("en-AU", { timeZone: TZ, dateStyle: "full", timeStyle: "short" }).format(new Date());
}

const RULES = `You are Dibby, the AI member of a friend group's plan in the dibs app.
Rules:
- Keep replies to one to three short sentences. Australian spelling.
- Banter is playful, never personal: you can tease about RSVPs and lateness only.
- Never mention who owes money, amounts owed, looks, health, or anything sensitive.
- If you can't find options, say so and ask one question (area or budget). Don't make up venues as if you checked them.
- You can't book, pay, or message anyone outside this plan.`;

// ---------- Draft a plan from one message ----------

export interface PlanDraft {
  title: string;
  area: string | null;
  startsAtLocal: string | null; // "2026-10-23T19:00" Sydney time
  vibe: Vibe;
  venues: Venue[];
  /** True when the venues came from Google Places; false when Dibby only suggested names. */
  checked: boolean;
  reply: string;
}

const DRAFT_TOOL: Tool = {
  name: "draft_plan",
  description: "Turn the organiser's message into a plan draft.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Short plan name in sentence case, e.g. 'Friday dinner'. Max 40 characters." },
      area: { type: ["string", "null"], description: "Suburb or area, e.g. 'Surry Hills'. Null if not given." },
      starts_at_local: {
        type: ["string", "null"],
        description: "Start in Sydney local time as YYYY-MM-DDTHH:mm, resolving words like 'Friday' to the next such date. Default dinner 19:00, lunch 12:30, drinks 18:00. Null if no day given.",
      },
      search_query: { type: "string", description: "What to search for venues, e.g. 'cheap dumplings' or 'casual dinner'." },
      suggestions: {
        type: "array",
        items: { type: "string" },
        description: "Three well-known real venue names in that area that fit, used only if search is unavailable.",
      },
      reply: { type: "string", description: "One short line to the organiser, in the vibe's voice, saying what you drafted." },
    },
    required: ["title", "area", "starts_at_local", "search_query", "suggestions", "reply"],
  },
};

interface DraftInput {
  title: string;
  area: string | null;
  starts_at_local: string | null;
  search_query: string;
  suggestions: string[];
  reply: string;
}

/** Search real venues for a draft, falling back to Dibby's suggestions when search is down. */
async function finishDraft(i: DraftInput, vibe: Vibe): Promise<PlanDraft> {
  const found = await searchVenues(i.search_query, i.area);
  const venues: Venue[] =
    found && found.length > 0
      ? found.slice(0, 3)
      : (i.suggestions ?? []).slice(0, 3).map((name) => ({ placeId: null, name, address: null, rating: null, priceLevel: null }));
  return {
    title: String(i.title).slice(0, 80),
    area: i.area,
    startsAtLocal: i.starts_at_local,
    vibe,
    venues,
    checked: Boolean(found && found.length > 0),
    reply: i.reply,
  };
}

export async function draftPlan(prompt: string, vibe: Vibe): Promise<PlanDraft> {
  const system = `${RULES}\nVoice: ${VOICE[vibe]}\nRight now in Sydney it is ${nowInSydney()}.`;
  const res = await claude(system, [{ role: "user", content: prompt.slice(0, 500) }], [DRAFT_TOOL], { type: "tool", name: "draft_plan" });
  const call = res.content.find((b): b is Extract<Block, { type: "tool_use" }> => b.type === "tool_use");
  if (!call) throw new Error("Dibby didn't draft a plan");
  return finishDraft(call.input as unknown as DraftInput, vibe);
}

// ---------- Reply when tagged in a plan thread ----------

export interface ThreadContext {
  plan: Plan;
  members: PlanMember[];
  options: (PlanOption & { votes: number })[];
  recent: Message[];
  nameOf: (memberId: string | null) => string;
}

export interface ThreadResult {
  reply: string;
  addOptions: Venue[];
  /** A separate plan Dibby set up, for the action to create. At most one per ask. */
  newPlan: PlanDraft | null;
}

const THREAD_TOOLS: Tool[] = [
  {
    name: "search_venues",
    description: "Search Google Places for venues. Returns up to 3 real places.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" }, area: { type: ["string", "null"] } },
      required: ["query", "area"],
    },
  },
  {
    name: "add_options",
    description: "Add venues to the plan's vote. Only add venues returned by search_venues.",
    input_schema: {
      type: "object",
      properties: { names: { type: "array", items: { type: "string" } } },
      required: ["names"],
    },
  },
  {
    name: "create_plan",
    description:
      "Start a separate new plan for the same crew, with its own vote. Use only when someone asks for a new or different outing (another day, another activity). For more options on this plan, use search_venues and add_options instead. At most once per message.",
    input_schema: { ...DRAFT_TOOL.input_schema, properties: { ...(DRAFT_TOOL.input_schema.properties as object) } },
  },
];

export async function replyInThread(ctx: ThreadContext, ask: string): Promise<ThreadResult> {
  const { plan, members, options } = ctx;
  const going = members.filter((m) => m.rsvp === "in").map((m) => m.display_name);
  const quiet = members.filter((m) => !m.rsvp).map((m) => m.display_name);
  const context = [
    `Plan: ${plan.title}. Status: ${plan.status}. Area: ${plan.area ?? "not set"}. When: ${plan.starts_at ?? "not set"}.`,
    `Venue: ${plan.venue_name ?? "not decided"}. Vote options: ${options.map((o) => `${o.label} (${o.votes} votes)`).join(", ") || "none yet"}.`,
    `Going: ${going.join(", ") || "nobody yet"}. Haven't replied: ${quiet.join(", ") || "nobody"}.`,
    `Recent messages:\n${ctx.recent.map((m) => `${ctx.nameOf(m.member_id)}: ${m.body}`).join("\n")}`,
  ].join("\n");
  const system = `${RULES}\nVoice: ${VOICE[plan.vibe]}\nRight now in Sydney it is ${nowInSydney()}.\n\n${context}`;

  const turns: Turn[] = [{ role: "user", content: ask.slice(0, 500) }];
  const found = new Map<string, Venue>();
  const toAdd: Venue[] = [];
  let newPlan: PlanDraft | null = null;

  for (let step = 0; step < 4; step++) {
    const res = await claude(system, turns, THREAD_TOOLS);
    const calls = res.content.filter((b): b is Extract<Block, { type: "tool_use" }> => b.type === "tool_use");
    if (calls.length === 0) {
      const text = res.content.filter((b): b is Extract<Block, { type: "text" }> => b.type === "text").map((b) => b.text).join(" ").trim();
      return { reply: text || newPlan?.reply || "On it.", addOptions: toAdd, newPlan };
    }
    turns.push({ role: "assistant", content: res.content });
    const results: Block[] = [];
    for (const c of calls) {
      if (c.name === "search_venues") {
        const q = c.input as { query: string; area: string | null };
        const venues = await searchVenues(q.query, q.area ?? plan.area);
        for (const v of venues ?? []) found.set(v.name.toLowerCase(), v);
        results.push({
          type: "tool_result",
          tool_use_id: c.id,
          content: venues === null ? "Search is unavailable right now." : JSON.stringify(venues.map((v) => ({ name: v.name, address: v.address, rating: v.rating }))),
        });
      } else if (c.name === "add_options") {
        const names = ((c.input as { names?: string[] }).names ?? []).slice(0, 3);
        const added = names.map((n) => found.get(n.toLowerCase())).filter((v): v is Venue => Boolean(v));
        toAdd.push(...added);
        results.push({ type: "tool_result", tool_use_id: c.id, content: added.length ? `Added ${added.map((a) => a.name).join(", ")}.` : "Nothing added: only venues from search can be added." });
      } else if (c.name === "create_plan") {
        if (newPlan) {
          results.push({ type: "tool_result", tool_use_id: c.id, content: "Already set up one new plan for this message." });
          continue;
        }
        newPlan = await finishDraft(c.input as unknown as DraftInput, plan.vibe);
        const where = newPlan.venues.map((v) => v.name).join(", ") || "no venues yet";
        results.push({
          type: "tool_result",
          tool_use_id: c.id,
          content: `New plan "${newPlan.title}" is set up with a vote on: ${where}${newPlan.checked ? "" : " (not checked on Maps)"}. Everyone from this plan is invited. A button to open it appears under your reply, so don't paste a link. Reply in one short line.`,
        });
      }
    }
    turns.push({ role: "user", content: results });
  }
  return { reply: newPlan?.reply ?? "Done. Have a look at the vote.", addOptions: toAdd, newPlan };
}

export const mentionsDibby = (text: string) => /(^|\s)@dibby\b/i.test(text);
