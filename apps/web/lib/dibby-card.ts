// What Dibby's chat messages carry (in `template`, beside the search memo and place IDs) for the
// confirm card and Undo (ARV-59):
//
// - `by`: the member whose @dibby ask this answers. They can undo it; so can hosts.
// - `pending_plan`: a new plan Dibby drafted but hasn't made. Only the asker sees the card,
//   and nothing is created or anyone invited until they tap Set it up.
// - `plan_state`: what happened to that draft ("making" while it's being set up, then "made" or
//   "declined"), so the card shows once and two taps can't make two plans.
// - `undone`: the places Dibby added were taken back off the vote.
//
// Places terms: a drafted venue keeps only its Google place ID. Its name and address are looked
// up again when the plan's made. Venues Dibby only suggested by name (no place ID) keep the name.

import type { Vibe } from "@dibs/shared/types";
import { formatWhen, localToIso } from "./time";

export interface PendingPlan {
  title: string;
  area: string | null;
  /** "2026-10-23T19:00" Sydney time, or null. */
  startsAtLocal: string | null;
  vibe: Vibe;
  reply: string;
  /** The @dibby message it answers, posted first in the new plan's chat. */
  ask: string;
  venues: ({ placeId: string } | { name: string })[];
}

export type PlanState = "making" | "made" | "declined";

type Card = { by?: unknown; pending_plan?: unknown; plan_state?: unknown; undone?: unknown };
const card = (t: unknown): Card => (t && typeof t === "object" ? (t as Card) : {});

export const withBy = (template: object | null | undefined, memberId: string): object => ({ ...(template ?? {}), by: memberId });

export const withPending = (template: object | null | undefined, p: PendingPlan): object => ({ ...(template ?? {}), pending_plan: p });

export const byOf = (t: unknown): string | null => (typeof card(t).by === "string" ? (card(t).by as string) : null);

export const planStateOf = (t: unknown): PlanState | null => {
  const s = card(t).plan_state;
  return s === "making" || s === "made" || s === "declined" ? s : null;
};

/** The draft still waiting on the asker, or null once it's been made or turned down. */
export function pendingOf(t: unknown): PendingPlan | null {
  if (planStateOf(t)) return null;
  const p = card(t).pending_plan;
  if (!p || typeof p !== "object") return null;
  const q = p as Partial<PendingPlan>;
  if (typeof q.title !== "string" || !Array.isArray(q.venues)) return null;
  return {
    title: q.title,
    area: typeof q.area === "string" ? q.area : null,
    startsAtLocal: typeof q.startsAtLocal === "string" ? q.startsAtLocal : null,
    vibe: (q.vibe ?? "chill") as Vibe,
    reply: typeof q.reply === "string" ? q.reply : "",
    ask: typeof q.ask === "string" ? q.ask : "",
    venues: q.venues.filter((v): v is PendingPlan["venues"][number] => Boolean(v && typeof v === "object" && ("placeId" in v || "name" in v))).slice(0, 5),
  };
}

export const undoneOf = (t: unknown): boolean => card(t).undone === true;

export const setCard = (t: unknown, patch: Partial<{ pending_plan: null; plan_state: PlanState; undone: true }>): object => ({ ...(t && typeof t === "object" ? t : {}), ...patch });

/** Who can take Dibby's places back off the vote: whoever asked, or a host. */
export const canUndo = (t: unknown, me: { id: string } | null, isHost: boolean): boolean => Boolean(me && (isHost || byOf(t) === me.id));

/** "Fri 28 Nov, 7:00 pm · Newtown · 3 places to vote on", for the card. */
export function pendingFacts(p: PendingPlan): string {
  const n = p.venues.length;
  return [p.startsAtLocal ? formatWhen(localToIso(p.startsAtLocal)) : null, p.area, n ? `${n} ${n === 1 ? "place" : "places"} to vote on` : null].filter(Boolean).join(" · ");
}
