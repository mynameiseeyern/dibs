import "server-only";
import { seededPick } from "@dibs/shared/bills";
import { offWaitlist } from "@dibs/shared/plans";
import type { Plan } from "@dibs/shared/types";
import { store } from "./store";
import { renderTemplate, type Template } from "./copy";

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
    // A typed-in option keeps its address (the option's note) as the plan's private address.
    venue_address: winner.place_id ? null : winner.note,
    version: plan.version + 1,
    updated_note: note,
  });
  const template: Template = { k: "locked", winner: winner.label, tie: tied.length > 1, deadline: why === "deadline" };
  await store.addMessage({ planId: plan.id, memberId: null, kind: "dibby", body: renderTemplate(template, plan.vibe), template });
  return true;
}

/** Votes close on their own once the deadline passes. Called when a plan page loads. */
export async function closeIfDue(plan: Plan): Promise<boolean> {
  if (plan.status !== "voting" || !plan.vote_deadline) return false;
  if (Date.parse(plan.vote_deadline) > Date.now()) return false;
  return closeVote(plan, "deadline");
}

/**
 * A spot opened up (someone stepped back, a +1 came off, the host raised the limit or opened the
 * plan): move people off the waitlist, first on, first off, and say so in the chat so they see it.
 */
export async function fillFromWaitlist(plan: Plan): Promise<void> {
  if (plan.status === "cancelled" || plan.status === "wrapped") return;
  const members = await store.listMembers(plan.id);
  const ids = offWaitlist(members, plan.capacity);
  if (ids.length === 0) return;
  for (const id of ids) await store.updateMember(id, { waitlisted: false, waitlisted_at: null });
  const names = members.filter((m) => ids.includes(m.id)).map((m) => m.display_name.split(" ")[0]);
  const who = names.length === 1 ? `${names[0]} is` : `${names.slice(0, -1).join(", ")} and ${names.at(-1)} are`;
  await store.addMessage({ planId: plan.id, memberId: null, kind: "system", body: `A spot opened up: ${who} off the waitlist and in.` });
}
