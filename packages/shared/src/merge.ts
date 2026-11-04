// Merging two spots on one plan that are the same person (ARV: guest duplicates). A guest is one
// browser, so opening a plan link in Messenger and then Safari makes two of them. A host folds the
// extra spot ("from") into the one to keep ("into"): its votes, chat and the rest move across and
// the extra spot goes. Pure: the store carries the result out.

import type { PlanMember } from "./types";

export type MergeBlock =
  | "same"
  | "account" // the extra spot has an account: an account belongs to a person, hosts can't fold it away
  | "organiser" // the organiser's spot never goes
  | "bill" // money: the extra spot is on a bill, so its share would quietly change hands
  | "former"; // either spot isn't someone any more

export interface MergeInput {
  from: PlanMember;
  into: PlanMember;
  /** Picks each person can hold on this plan's vote (maxVotes). */
  maxVotes: number;
  /** Option ids each one has picked. */
  fromVotes: readonly string[];
  intoVotes: readonly string[];
  /** "When works?" times each one ticked. */
  fromTimes: readonly string[];
  intoTimes: readonly string[];
  /** Whether each one answered the recap. */
  fromRecap: boolean;
  intoRecap: boolean;
  /** The extra spot paid a bill or has a share on one. */
  fromOnBill: boolean;
}

export interface MergePlan {
  /** What the kept spot becomes. */
  intoPatch: Partial<Pick<PlanMember, "rsvp" | "waitlisted" | "waitlisted_at" | "plus_one" | "plus_one_name" | "attended" | "chat_seen_at">>;
  /** Picks to add to the kept spot, within the plan's limit. */
  addVotes: string[];
  /** Times to tick for the kept spot. */
  addTimes: string[];
  /** Move the extra spot's recap answer across (the kept spot hadn't answered). */
  moveRecap: boolean;
}

/** Further in wins: going beats waitlisted beats maybe beats can't go beats no answer. */
function rank(m: PlanMember): number {
  if (m.rsvp === "in") return m.waitlisted ? 3 : 4;
  if (m.rsvp === "maybe") return 2;
  if (m.rsvp === "out") return 1;
  return 0;
}

export function mergeBlock(i: Pick<MergeInput, "from" | "into" | "fromOnBill">, formerName: string): MergeBlock | null {
  if (i.from.id === i.into.id) return "same";
  if (i.from.plan_id !== i.into.plan_id) return "same";
  if (i.from.user_id) return "account";
  if (i.from.role === "organiser") return "organiser";
  if (i.from.display_name === formerName || i.into.display_name === formerName) return "former";
  if (!i.from.guest_id || (!i.into.guest_id && !i.into.user_id)) return "former";
  if (i.fromOnBill) return "bill";
  return null;
}

export function planMerge(i: MergeInput): MergePlan {
  const { from, into } = i;
  const intoPatch: MergePlan["intoPatch"] = {};

  // The answer that's furthest in, with its +1 and place in the queue.
  if (rank(from) > rank(into)) {
    intoPatch.rsvp = from.rsvp;
    intoPatch.waitlisted = from.waitlisted;
    intoPatch.waitlisted_at = from.waitlisted_at ?? null;
    intoPatch.plus_one = from.plus_one;
    intoPatch.plus_one_name = from.plus_one_name ?? null;
  }
  if (into.attended === null && from.attended !== null) intoPatch.attended = from.attended;
  const seen = [into.chat_seen_at, from.chat_seen_at].filter((s): s is string => Boolean(s)).sort();
  if (seen.length && seen[seen.length - 1] !== into.chat_seen_at) intoPatch.chat_seen_at = seen[seen.length - 1];

  // Votes only count for people going: no picks unless the kept spot ends up going.
  const going = (intoPatch.rsvp ?? into.rsvp) === "in" && !(intoPatch.waitlisted ?? into.waitlisted);
  const room = going ? Math.max(0, i.maxVotes - i.intoVotes.length) : 0;
  const addVotes = i.fromVotes.filter((o) => !i.intoVotes.includes(o)).slice(0, room);
  const addTimes = going ? i.fromTimes.filter((t) => !i.intoTimes.includes(t)) : [];

  return { intoPatch, addVotes, addTimes, moveRecap: i.fromRecap && !i.intoRecap };
}

/** Likely duplicates for a host to merge: guests with the same name (ignoring case and spaces) as someone else on the plan. */
export function likelyDuplicates(members: readonly PlanMember[], formerName: string): Map<string, string> {
  const key = (n: string) => n.toLowerCase().replace(/\s+/g, "");
  const out = new Map<string, string>();
  const live = members.filter((m) => m.display_name !== formerName);
  for (const m of live) {
    if (m.user_id || m.role === "organiser") continue;
    const twin = live.find((o) => o.id !== m.id && key(o.display_name) === key(m.display_name));
    if (twin) out.set(m.id, twin.id);
  }
  return out;
}
