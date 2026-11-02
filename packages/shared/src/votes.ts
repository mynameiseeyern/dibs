// How many places each person can pick on a plan's vote.
// New plans let everyone pick up to MULTI_VOTES; the organiser can switch it to one each.
// Plans from before this keep one pick (max_votes 1, or missing).

export const MULTI_VOTES = 3;

/** The most picks one person has on this plan's vote. */
export const maxVotes = (plan: { max_votes?: number | null }): number => Math.min(MULTI_VOTES, Math.max(1, plan.max_votes ?? 1));

/**
 * Picks someone can actually use right now: the plan's setting (never more than three), and
 * always one fewer than there are places, so nobody can tick the lot and every vote says
 * something. Two places: one pick. Three: two. Four or more: three.
 */
export function picksAllowed(plan: { max_votes?: number | null }, optionCount: number): number {
  return Math.max(1, Math.min(maxVotes(plan), optionCount - 1));
}

export type VoteStep =
  /** Pick it as well. */
  | { kind: "add" }
  /** One pick: your vote moves here (any other picks go). */
  | { kind: "move" }
  /** Untick it. */
  | { kind: "remove" }
  /** Already your one pick: nothing to do. */
  | { kind: "none" }
  /** Every pick's used: untick one first. */
  | { kind: "full"; max: number };

/**
 * What a tap on an option does, given the options this person has already picked and the picks
 * allowed now (picksAllowed). Someone left holding more than that (a place came off the vote)
 * keeps them, and can untick, but can't add until they're under.
 */
export function voteStep(mine: readonly string[], optionId: string, max: number): VoteStep {
  if (mine.includes(optionId)) return max <= 1 && mine.length <= 1 ? { kind: "none" } : { kind: "remove" };
  if (max <= 1) return { kind: "move" };
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


/** Fewer options than this and every one gets a full card. */
export const LEADERS_FROM = 4;

export type LeaderSplit = {
  /** How many options from the top get a big card (the rest are compact rows). */
  big: number;
  /** The label over the big cards, or null when every option is a big card. */
  eyebrow: "First up" | "Out in front" | "Out in front · tied" | null;
  /** When it's a tie: the vote count the leaders share, so a third (or more) tied option says "also tied". */
  tiedAt: number | null;
};

/**
 * Which options get the big cards. `votes` is each option's saved count, leaders first.
 * No votes yet: the first two added. One leader: just that one. A tie: two, and any more tied
 * options lead the list. Three or fewer options: all of them.
 */
export function splitLeaders(votes: readonly number[]): LeaderSplit {
  if (votes.length < LEADERS_FROM) return { big: votes.length, eyebrow: null, tiedAt: null };
  const top = Math.max(...votes);
  if (top === 0) return { big: 2, eyebrow: "First up", tiedAt: null };
  const leaders = votes.filter((v) => v === top).length;
  if (leaders === 1) return { big: 1, eyebrow: "Out in front", tiedAt: null };
  return { big: 2, eyebrow: "Out in front · tied", tiedAt: top };
}
