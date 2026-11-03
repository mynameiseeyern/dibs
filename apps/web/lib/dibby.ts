import "server-only";
import type { Message, Plan, PlanMember, PlanOption, Vibe } from "@dibs/shared/types";
import { searchPlaces, searchVenues, type Venue } from "./places";
import { TZ } from "./time";
import { resolveStart, sydneyDate } from "@dibs/shared/when";
import { qualifyArea, type WhereAsk } from "./area";

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

/**
 * The next two weeks with their dates, so Dibby looks "Friday" up instead of working it out
 * (date maths is where it used to go wrong).
 */
function calendar(): string {
  const fmt = new Intl.DateTimeFormat("en-AU", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
  const days: string[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(Date.now() + i * 86400_000);
    days.push(`${i === 0 ? "today" : i === 1 ? "tomorrow" : "         "} ${fmt.format(d)} = ${sydneyDate(d)}`);
  }
  return `Right now in Sydney it is ${nowInSydney()}.\nCalendar (use it, don't work dates out yourself):\n${days.join("\n")}`;
}

const RULES = `You are Dibby, the AI member of a friend group's plan. Dibby is also the name of the app they plan in.
Rules:
- Keep replies to one to three short sentences. Australian spelling.
- Banter is playful, never personal: you can tease about RSVPs and lateness only.
- Never mention who owes money, amounts owed, looks, health, or anything sensitive.
- Say what and where, not what you're doing or who asked. Not "Someone's after more options, so I've gone hunting". Yes "Asian fusion in the CBD, coming up".
- If you can't find options, say so and ask one question (area or budget). Don't make up venues as if you checked them.
- Never guess where the crew is. If you don't know where to look, ask; the app shows area chips under your reply.
- You can't book, pay, or message anyone outside this plan.
- If someone asks what they missed or for a catch-up, sum up the recent messages and the plan's state in at most two sentences: decisions, changes, who's in. Never repeat money owed, private details, or anyone's exact words at length.`;

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
        description:
          "Start in Sydney local time as YYYY-MM-DDTHH:mm. Only when the organiser named a day: look the date up in the calendar ('Friday' is the next Friday; 'this weekend' is the coming Saturday). For the time use what they said; if they named a part of the day or a meal but no time use super early 06:00, morning or brekkie 09:00, brunch 11:00, midday 12:00, lunch 12:30, arvo 15:00, evening or drinks 18:00, dinner 19:00, night 20:00, late 22:00. If they gave no day, null. Never make up a day or a time.",
      },
      search_query: { type: "string", description: "What to search for venues, e.g. 'cheap dumplings' or 'casual dinner'. Include the cuisine or activity and any budget words." },
      reply: {
        type: "string",
        description: "One short line to the organiser, in the vibe's voice, saying what you drafted. If you set a time, say it plainly (e.g. 'Fri 7pm'). If no day was given, say the time's still to be decided.",
      },
    },
    required: ["title", "area", "starts_at_local", "search_query", "reply"],
  },
};

interface DraftInput {
  title: string;
  area: string | null;
  starts_at_local: string | null;
  search_query: string;
  reply: string;
}

const LOCAL_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/**
 * Real venues for a draft, from Google Places only (every place on a plan is a real business).
 * Biased to where the organiser is when they tapped "Near me". No results means no options.
 */
async function finishDraft(i: DraftInput, vibe: Vibe, near: { lat: number; lng: number } | null = null): Promise<PlanDraft> {
  // A place they named wins; otherwise search around where they are.
  const found = await searchPlaces(i.search_query, i.area ? null : near, i.area);
  const venues: Venue[] = (found ?? []).slice(0, 3).map((p) => ({ placeId: p.placeId, name: p.name, address: p.address, rating: p.rating, priceLevel: null }));
  return {
    title: String(i.title).slice(0, 80),
    area: i.area,
    startsAtLocal: i.starts_at_local && LOCAL_RE.test(i.starts_at_local) ? i.starts_at_local : null,
    vibe,
    venues,
    checked: venues.length > 0,
    reply: i.reply,
  };
}

/** What the organiser tapped on the Ask Dibby chips. These are facts, not hints. */
export interface DraftPicks {
  /** "2026-10-24" */
  date?: string | null;
  /** "19:00" */
  time?: string | null;
  /** 1 cheap, 2 mid, 3 fancy */
  spend?: 1 | 2 | 3 | null;
  near?: { lat: number; lng: number } | null;
}

const SPEND_WORDS = { 1: "cheap", 2: "mid-range", 3: "fancy" } as const;

export async function draftPlan(prompt: string, vibe: Vibe, picks: DraftPicks = {}): Promise<PlanDraft> {
  const fixed = [
    picks.date && `Day: ${new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${picks.date}T00:00:00Z`))} = ${picks.date} (fixed, use exactly this)`,
    picks.time && `Time: ${picks.time} (fixed, use exactly this)`,
    picks.spend && `Budget: ${SPEND_WORDS[picks.spend]} (put it in the search)`,
    picks.near && "Where: the app has the organiser's location and searches around it. Leave area null unless they named a place.",
  ].filter(Boolean);
  const content = `${prompt.slice(0, 500) || "Set up a plan."}${fixed.length ? `\n\nThe organiser also tapped:\n${fixed.join("\n")}` : ""}`;
  const system = `${RULES}\nVoice: ${VOICE[vibe]}\n${calendar()}`;
  const res = await claude(system, [{ role: "user", content }], [DRAFT_TOOL], { type: "tool", name: "draft_plan" });
  const call = res.content.find((b): b is Extract<Block, { type: "tool_use" }> => b.type === "tool_use");
  if (!call) throw new Error("Dibby didn't draft a plan");
  const input = call.input as unknown as DraftInput;
  if (picks.spend && !input.search_query.toLowerCase().includes(SPEND_WORDS[picks.spend])) input.search_query = `${SPEND_WORDS[picks.spend]} ${input.search_query}`;
  const draft = await finishDraft(input, vibe, picks.near ?? null);
  draft.startsAtLocal = resolveStart(draft.startsAtLocal, picks);
  return draft;
}


// ---------- More options for a vote that's already open ----------

const MORE_TOOL: Tool = {
  name: "find_places",
  description: "Turn what the group is after into a venue search.",
  input_schema: {
    type: "object",
    properties: {
      search_query: { type: "string", description: "What to search for venues, e.g. 'cheap dumplings' or 'rooftop bar'. Include the cuisine or activity and any budget words." },
      area: { type: ["string", "null"], description: "Only if the ask names a place ('ramen in Tokyo' → 'Tokyo'). Otherwise null and the app keeps looking where it was." },
      reply: {
        type: "string",
        description: "One short line to the group, in the vibe's voice, naming what and where, e.g. 'Asian fusion in the CBD, coming up'. Don't list the places (the app does) and don't say who asked.",
      },
    },
    required: ["search_query", "area", "reply"],
  },
};

/**
 * Three more real spots for an open vote, skipping what's already on it. Same rule as a draft:
 * Google Places only, nothing made up, and no results means none added.
 */
export async function suggestMore(
  ask: string,
  vibe: Vibe,
  area: string | null,
  have: { placeId: string | null; label: string }[],
  near: { lat: number; lng: number } | null = null
): Promise<{ venues: Venue[]; reply: string; query: string; area: string | null; near: boolean; ask: WhereAsk | null }> {
  const where = area ? `We're looking in ${area}.` : near ? "We're looking near the asker (the app has their location)." : "Nobody has said where yet.";
  const content = `The vote already has: ${have.map((h) => h.label).join(", ") || "nothing yet"}. ${where}\nSomeone asked for more: ${ask.slice(0, 500) || "more like these"}`;
  const res = await claude(`${RULES}\nVoice: ${VOICE[vibe]}`, [{ role: "user", content }], [MORE_TOOL], { type: "tool", name: "find_places" });
  const call = res.content.find((b): b is Extract<Block, { type: "tool_use" }> => b.type === "tool_use");
  if (!call) throw new Error("Dibby didn't search");
  const input = call.input as { search_query: string; area?: string | null; reply: string };
  const named = qualifyArea(input.area);
  const useArea = named ?? qualifyArea(area);
  const aroundMe = !useArea && Boolean(near);
  const query = String(input.search_query ?? ask).slice(0, 120);
  // No place named, none on the plan and no location: ask rather than search all of Australia.
  if (!useArea && !aroundMe) return { venues: [], reply: WHERE_LINE, query, area: null, near: false, ask: { query, areas: [] } };
  const found = (await searchPlaces(input.search_query, aroundMe ? near : null, useArea)) ?? [];
  const ids = new Set(have.map((h) => h.placeId));
  const names = new Set(have.map((h) => h.label.toLowerCase()));
  const venues: Venue[] = found
    .filter((p) => !ids.has(p.placeId) && !names.has(p.name.toLowerCase()))
    .slice(0, 3)
    .map((p) => ({ placeId: p.placeId, name: p.name, address: p.address, rating: p.rating, priceLevel: null }));
  return { venues, reply: String(input.reply ?? "").slice(0, 300), query, area: useArea, near: aroundMe, ask: null };
}

/** What Dibby says when it doesn't know where to look. The chips do the rest. */
export const WHERE_LINE = "Where abouts? Tap one, or tell me a suburb.";

// ---------- Reply when tagged in a plan thread ----------

/** Where Dibby last looked on this plan, kept on its message so the next ask starts there. */
export interface SearchMemo {
  k: "search";
  query: string;
  area: string | null;
  /** Searched around the asker's location (never the coordinates themselves). */
  near?: boolean;
}
export const asSearchMemo = (raw: unknown): SearchMemo | null =>
  raw && typeof raw === "object" && (raw as SearchMemo).k === "search" && typeof (raw as SearchMemo).query === "string" ? (raw as SearchMemo) : null;

export interface ThreadContext {
  plan: Plan;
  members: PlanMember[];
  options: (PlanOption & { votes: number })[];
  recent: Message[];
  nameOf: (memberId: string | null) => string;
  /** The asker's rounded location, if their browser shared it. Only used to bias Places. */
  near: { lat: number; lng: number } | null;
}

export interface ThreadResult {
  reply: string;
  addOptions: Venue[];
  /** A separate plan Dibby set up, for the action to create. At most one per ask. */
  newPlan: PlanDraft | null;
  /** The last venue search this turn, to remember for the next ask. */
  searched: SearchMemo | null;
  /** Set when Dibby didn't know where to look and asked: the search to rerun once they pick. */
  ask: WhereAsk | null;
}

const THREAD_TOOLS: Tool[] = [
  {
    name: "search_venues",
    description: "Search Google Places for venues. Returns up to 3 real places.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to look for, e.g. 'korean bbq' or 'rooftop bar'. Budget words welcome." },
        area: {
          type: ["string", "null"],
          description:
            "Where to look: a suburb, city or country, e.g. 'Hong Kong', 'Newtown'. Keep the place the conversation is already about: if the crew were looking at Hong Kong and someone asks 'how about korean?', the area is still Hong Kong. Null when nobody has named a place: then the app searches around the asker's location (or the plan's area if it doesn't have one).",
        },
      },
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
  // Where we've been looking: the last search Dibby ran on this plan, before the plan's own area.
  // Default is where the asker is; a place someone named (now or earlier in this plan) wins.
  const memo = [...ctx.recent].reverse().map((m) => (m.kind === "dibby" ? asSearchMemo(m.template) : null)).find(Boolean) ?? null;
  const near = ctx.near;
  const lookingIn = qualifyArea(memo?.area ?? (near ? null : plan.area ?? null));
  const whereDefault =
    lookingIn ?? (near ? "near the asker (the app has their location)" : "nowhere yet: nobody has said where, so if they don't name a place, ask where (one short line) instead of guessing");
  const context = [
    `Plan: ${plan.title}. Status: ${plan.status}. Area: ${plan.area ?? "not set"}. When: ${plan.starts_at ?? "not set"}.`,
    `Venue: ${plan.venue_name ?? "not decided"}. Vote options: ${options.map((o) => `${o.label}${o.note ? `, ${o.note}` : ""} (${o.votes} votes)`).join("; ") || "none yet"}.`,
    `If nobody names a place, searches go: ${whereDefault}.`,
    memo ? `Last search: ${memo.query} ${memo.area ? `in ${memo.area}` : "near the asker"}. A follow-up like "how about korean?" means the same place.` : "",
    "When you searched, start your reply with where you looked, e.g. 'Korean in Hong Kong:' or 'Korean near you:', so the crew can see what you did.",
    `Going: ${going.join(", ") || "nobody yet"}. Haven't replied: ${quiet.join(", ") || "nobody"}.`,
    `Recent messages:\n${ctx.recent.map((m) => `${ctx.nameOf(m.member_id)}: ${m.body}`).join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n");
  const system = `${RULES}\nVoice: ${VOICE[plan.vibe]}\n${calendar()}\n\n${context}`;

  const turns: Turn[] = [{ role: "user", content: ask.slice(0, 500) }];
  const found = new Map<string, Venue>();
  const toAdd: Venue[] = [];
  let newPlan: PlanDraft | null = null;
  let searched: SearchMemo | null = null;
  let asked: WhereAsk | null = null;

  for (let step = 0; step < 4; step++) {
    const res = await claude(system, turns, THREAD_TOOLS);
    const calls = res.content.filter((b): b is Extract<Block, { type: "tool_use" }> => b.type === "tool_use");
    if (calls.length === 0) {
      const text = res.content.filter((b): b is Extract<Block, { type: "text" }> => b.type === "text").map((b) => b.text).join(" ").trim();
      // Only keep the chips if Dibby didn't go on to search somewhere after asking.
      return { reply: text || newPlan?.reply || (asked ? WHERE_LINE : "On it."), addOptions: toAdd, newPlan, searched, ask: searched ? null : asked };
    }
    turns.push({ role: "assistant", content: res.content });
    const results: Block[] = [];
    for (const c of calls) {
      if (c.name === "search_venues") {
        const q = c.input as { query: string; area: string | null };
        const area = qualifyArea(q.area) ?? lookingIn;
        const aroundMe = !area && Boolean(near);
        if (!area && !aroundMe) {
          asked = { query: String(q.query ?? "").slice(0, 120), areas: [] };
          results.push({
            type: "tool_result",
            tool_use_id: c.id,
            content:
              "Not searched: nobody named a place, the plan has no area and the app doesn't have the asker's location. Don't search again and don't guess a place. Reply in one short line asking where abouts; the app shows area chips under your reply.",
          });
          continue;
        }
        const venues = await searchVenues(q.query, area, 3, aroundMe ? near : null);
        for (const v of venues ?? []) found.set(v.name.toLowerCase(), v);
        searched = { k: "search", query: q.query, area, near: aroundMe };
        results.push({
          type: "tool_result",
          tool_use_id: c.id,
          content:
            venues === null
              ? "Search is unavailable right now."
              : `Searched "${q.query}" ${area ? `in ${area}` : aroundMe ? "near the asker" : "with no particular area"}: ${JSON.stringify(venues.map((v) => ({ name: v.name, address: v.address, rating: v.rating })))}`,
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
          content: `New plan "${newPlan.title}" is set up with a vote on: ${where}. Everyone from this plan is invited. A button to open it appears under your reply, so don't paste a link. Reply in one short line.`,
        });
      }
    }
    turns.push({ role: "user", content: results });
  }
  return { reply: newPlan?.reply ?? (asked && !searched ? WHERE_LINE : "Done. Have a look at the vote."), addOptions: toAdd, newPlan, searched, ask: searched ? null : asked };
}

export const mentionsDibby = (text: string) => /(^|\s)@dibby\b/i.test(text);
