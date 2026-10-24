// The Dibby camera: three shots each, hidden until they "develop" when the host wraps up the plan
// (who came), for people who were there. Pure rules, so they're tested. No clock or timezone: the
// reveal is tied to the event, not the time of day, so it suits a brunch as well as a big night.
import { planAccess } from "./plans";
import type { Plan, PlanMember } from "./types";

/** Shots per person per plan. */
export const MAX_PHOTOS = 3;

/** Photos develop when the host wraps the plan up. */
export function photosRevealed(plan: Pick<Plan, "status">): boolean {
  return plan.status === "wrapped";
}

type Who = Pick<PlanMember, "rsvp" | "waitlisted" | "role" | "attended">;

/**
 * Who sees the photos: people who came. Before the host wraps up (so before anyone's ticked as
 * came), that's people going and the hosts, who see the developing cards.
 */
export function canSeePhotos(plan: Pick<Plan, "status">, me: Who): boolean {
  if (plan.status === "cancelled") return false;
  if (plan.status === "wrapped") return Boolean(me.attended);
  return planAccess(me).level === "full";
}

/** Who can take photos: the same people, from when the plan starts (and after, in the recap). */
export function canAddPhotos(plan: Pick<Plan, "status" | "starts_at">, me: Who, now: Date): boolean {
  if (plan.status !== "locked" && plan.status !== "wrapped") return false;
  if (plan.status === "locked" && (!plan.starts_at || Date.parse(plan.starts_at) > now.getTime())) return false;
  return canSeePhotos(plan, me);
}
