import type { MonogramColour, PlanMember, Rsvp } from "./types";
import { MONOGRAM_COLOURS } from "./types";

const SLUG_CHARS = "abcdefghjkmnpqrstuvwxyz23456789"; // no 0/o, 1/l/i

/** Short, unguessable-enough plan slug for links: /p/k7m2qx9a */
export function makeSlug(length = 8, random: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < length; i++) s += SLUG_CHARS[Math.floor(random() * SLUG_CHARS.length)];
  return s;
}

/** First letters of first and last name, e.g. "Sam Lee" -> "SL". */
export function monogram(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

/**
 * Picks a monogram colour so two people with the same initials on one plan look different.
 */
export function pickColour(name: string, taken: readonly { display_name: string; colour: MonogramColour }[]): MonogramColour {
  const mine = monogram(name);
  const clashing = new Set(taken.filter((m) => monogram(m.display_name) === mine).map((m) => m.colour));
  const counts = new Map<MonogramColour, number>(MONOGRAM_COLOURS.map((c) => [c, 0]));
  for (const m of taken) counts.set(m.colour, (counts.get(m.colour) ?? 0) + 1);
  const free = MONOGRAM_COLOURS.filter((c) => !clashing.has(c));
  const pool = free.length ? free : [...MONOGRAM_COLOURS];
  return pool.sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0))[0]!;
}

export function countIn(members: readonly Pick<PlanMember, "rsvp" | "plus_one" | "waitlisted">[]): number {
  return members.filter((m) => m.rsvp === "in" && !m.waitlisted).reduce((n, m) => n + 1 + (m.plus_one ? 1 : 0), 0);
}

/** Whether a new "in" RSVP fits, or goes on the waitlist. */
export function hasRoom(members: Parameters<typeof countIn>[0], capacity: number, plusOne = false): boolean {
  return countIn(members) + 1 + (plusOne ? 1 : 0) <= capacity;
}

export const RSVP_LABEL: Record<Rsvp, string> = { in: "I'm in", maybe: "Maybe", out: "Can't go" };

/**
 * Prefilled group-chat message: the event first (what, when, where), then one ask.
 * "Friday dinner · Fri 7pm · Chat Thai. You in? 👉 link"
 * While the place is still being voted on it says so, so people know there's a vote to do.
 */
/** What someone who deleted their account shows as, in plans they were part of. */
export const FORMER_MEMBER = "Former member";

export function shareText(opts: { title: string; when?: string | null; place?: string | null; voting?: boolean; deadline?: string | null; url: string }): string {
  const head = [opts.title, opts.when, opts.voting ? null : opts.place].filter(Boolean).join(" · ");
  const vote = opts.voting ? ` Place is up for a vote${opts.deadline ? ` till ${opts.deadline}` : ""}.` : "";
  return `${head}.${vote} You in? 👉 ${opts.url}`;
}

/**
 * What someone on the plan can do with the vote, chat and who's in, from their RSVP.
 * Going: take part. Maybe, not replied yet, or on the waitlist: read along. Can't go: hidden.
 * Hosts always take part, since they run the plan.
 */
export type Access = { level: "full" } | { level: "read"; why: "maybe" | "unreplied" | "waitlist" } | { level: "hidden" };

export function planAccess(me: Pick<PlanMember, "rsvp" | "waitlisted" | "role">): Access {
  if (me.role === "organiser" || me.role === "cohost") return { level: "full" };
  if (me.rsvp === "out") return { level: "hidden" };
  if (me.rsvp === "in") return me.waitlisted ? { level: "read", why: "waitlist" } : { level: "full" };
  return { level: "read", why: me.rsvp === "maybe" ? "maybe" : "unreplied" };
}

/** The line shown when someone who can only read tries to vote, chat or add a place. */
export const READ_ONLY_NOTE = {
  maybe: "You're a maybe, so you can only read along. Tap I'm in to vote and chat.",
  unreplied: "You can only take part if you're going. Tap I'm in to vote and chat.",
  waitlist: "You're on the waitlist, so you can only read along until a spot opens.",
} as const;

/** A place typed in instead of picked on the map: a title, and an optional address. */
export interface CustomPlace {
  name: string;
  address: string | null;
}

export const CUSTOM_PLACE_LIMITS = { name: 60, address: 160 } as const;

/** Tidies a typed-in place. Null if there's no title. */
export function cleanCustomPlace(name: unknown, address: unknown): CustomPlace | null {
  const tidy = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  const n = tidy(name, CUSTOM_PLACE_LIMITS.name);
  if (!n) return null;
  const a = tidy(address, CUSTOM_PLACE_LIMITS.address);
  return { name: n, address: a || null };
}

/**
 * Whether a title looks like a street address ("12 Smith St"), so the form can point out that
 * anyone with the link will see it. A hint only: it never blocks.
 */
export function looksLikeAddress(text: string): boolean {
  return /\b\d+[a-z]?(\/\d+)?\s+[a-z][a-z' -]*\s(st|street|rd|road|ave|avenue|pde|parade|ct|court|pl|place|dr|drive|ln|lane|way|cres|crescent|tce|terrace|hwy|highway|blvd|boulevard|cl|close|gr|grove|sq|square)\b/i.test(text);
}

/**
 * How many chat messages are new to someone: things other people or Dibby said since they last
 * opened the chat (or since they joined, if they never have). System lines don't count.
 */
export function unreadCount(
  messages: { kind: string; member_id: string | null; created_at: string }[],
  me: { id: string; joined_at: string; chat_seen_at?: string | null }
): number {
  const since = Date.parse(me.chat_seen_at ?? me.joined_at);
  return messages.filter((m) => m.kind !== "system" && m.member_id !== me.id && Date.parse(m.created_at) > since).length;
}

/**
 * Whether a host can wrap a plan up yet. A locked plan is ready once its start time has
 * passed, or straight away if it never got a time. Before the start, hosts can still wrap
 * it up early (it happened sooner, or they sorted it outside the app): "early".
 */
export function wrapState(plan: { status: string; starts_at: string | null }, now = Date.now()): "ready" | "early" | "no" {
  if (plan.status !== "locked") return "no";
  if (!plan.starts_at || Date.parse(plan.starts_at) <= now) return "ready";
  return "early";
}

/**
 * Plan categories. Optional, a label for the organiser more than anyone. Kept broad so most
 * plans fit one; anything else is typed in, and a signed-in organiser keeps what they type as
 * their own preset.
 */
export const PLAN_CATEGORIES = [
  { label: "Food", icon: "ri-restaurant-2-line" },
  { label: "Drinks", icon: "ri-goblet-line" },
  { label: "Coffee", icon: "ri-cup-line" },
  { label: "Walk", icon: "ri-walk-line" },
  { label: "Run", icon: "ri-run-line" },
  { label: "Sport", icon: "ri-basketball-line" },
  { label: "Games", icon: "ri-gamepad-line" },
  { label: "Social", icon: "ri-group-line" },
] as const;

export const CATEGORY_MAX = 30;
export const DESCRIPTION_MAX = 500;
/** How many made-up categories an organiser keeps. */
export const SAVED_CATEGORIES_MAX = 12;

/** Tidies a typed category: one line, trimmed, sentence case for a preset match ("food" → "Food"). */
export function cleanCategory(v: unknown): string | null {
  const t = String(v ?? "").replace(/\s+/g, " ").trim().slice(0, CATEGORY_MAX);
  if (!t) return null;
  const preset = PLAN_CATEGORIES.find((c) => c.label.toLowerCase() === t.toLowerCase());
  return preset ? preset.label : t;
}

/** The icon for a category: the preset's, or a plain tag for one someone made up. */
export const categoryIcon = (label: string) => PLAN_CATEGORIES.find((c) => c.label === label)?.icon ?? "ri-price-tag-3-line";

/** A description keeps its line breaks (up to one blank line in a row), trimmed. */
export function cleanDescription(v: unknown): string | null {
  const t = String(v ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, DESCRIPTION_MAX)
    .trim();
  return t || null;
}

/**
 * An organiser's saved categories after using `label`: newest first, no duplicates (ignoring
 * case), never a preset, at most SAVED_CATEGORIES_MAX.
 */
export function rememberCategory(saved: readonly string[], label: string | null): string[] {
  if (!label || PLAN_CATEGORIES.some((c) => c.label === label)) return [...saved];
  const rest = saved.filter((s) => s.toLowerCase() !== label.toLowerCase());
  return [label, ...rest].slice(0, SAVED_CATEGORIES_MAX);
}
