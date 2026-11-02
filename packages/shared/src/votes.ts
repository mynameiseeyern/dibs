// How many places each person can pick on a plan's vote.
// New plans let everyone pick up to MULTI_VOTES; the organiser can switch it to one each.
// Plans from before this keep one pick (max_votes 1, or missing).

export const MULTI_VOTES = 3;

/** The most picks one person has on this plan's vote. */
export const maxVotes = (plan: { max_votes?: number | null }): number => Math.min(MULTI_VOTES, Math.max(1, plan.max_votes ?? 1));

export type VoteStep =
  /** Pick it (with one pick each, this moves your vote here). */
  | { kind: "add" }
  /** Untick it: you'd already picked it, and you have more than one pick. */
  | { kind: "remove" }
  /** Already your one pick: nothing to do. */
  | { kind: "none" }
  /** Every pick's used: untick one first. */
  | { kind: "full"; max: number };

/** What a tap on an option does, given the options this person has already picked. */
export function voteStep(mine: readonly string[], optionId: string, max: number): VoteStep {
  const picked = mine.includes(optionId);
  if (max <= 1) return picked ? { kind: "none" } : { kind: "add" };
  if (picked) return { kind: "remove" };
  if (mine.length >= max) return { kind: "full", max };
  return { kind: "add" };
}

/**
 * Going back to fewer picks: each person keeps their latest `keep` and the rest go.
 * `votes` is in the order they were cast (oldest first). Returns the ones to take back.
 */
export function overLimit<V extends { member_id: string }>(votes: readonly V[], keep: number): V[] {
  const seen = new Map<string, number>();
  const drop: V[] = [];
  for (let i = votes.length - 1; i >= 0; i--) {
    const v = votes[i]!;
    const n = (seen.get(v.member_id) ?? 0) + 1;
    seen.set(v.member_id, n);
    if (n > keep) drop.push(v);
  }
  return drop.reverse();
}

