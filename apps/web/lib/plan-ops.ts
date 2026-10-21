import "server-only";
import { seededPick } from "@dibs/shared/bills";
import type { Plan } from "@dibs/shared/types";
import { store } from "./store";

/**
 * Closes the vote: the option with the most votes wins; a tie is settled by a seeded spin
 * so it replays the same way. Used by the host's "Lock it in" and when the deadline passes.
 */
export async function closeVote(plan: Plan, why: "host" | "deadline"): Promise<boolean> {
  if (plan.status !== "voting") return false;
  const [options, votes] = await Promise.all([store.listOptions(plan.id), store.listVotes(plan.id)]);
  if (options.length === 0) return false;
  const counts = options.map((o) => ({ o, n: votes.filter((v) => v.option_id === o.id).length }));
  const top = Math.max(...counts.map((c) => c.n));
  const tied = counts.filter((c) => c.n === top).map((c) => c.o);
  let winner = tied[0]!;
  let note = `Locked in: ${winner.label}`;
  if (tied.length > 1) {
    const pickId = seededPick(
      tied.map((t) => t.id),
      `${plan.id}:tie`
    );
    winner = tied.find((t) => t.id === pickId)!;
    note = `It was a tie, so Dibby spun for it: ${winner.label}`;
  }
  await store.updatePlan(plan.id, {
    status: "locked",
    venue_name: winner.label,
    venue_place_id: winner.place_id,
    version: plan.version + 1,
    updated_note: note,
  });
  const lead = why === "deadline" ? "Voting's closed. " : "";
  await store.addMessage({ planId: plan.id, memberId: null, kind: "dibby", body: `${lead}${note}. See you there.` });
  return true;
}

/** Votes close on their own once the deadline passes. Called when a plan page loads. */
export async function closeIfDue(plan: Plan): Promise<boolean> {
  if (plan.status !== "voting" || !plan.vote_deadline) return false;
  if (Date.parse(plan.vote_deadline) > Date.now()) return false;
  return closeVote(plan, "deadline");
}
