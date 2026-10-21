import "server-only";
import { currentOrganiser, type Organiser } from "./auth";
import { currentGuest } from "./guest";
import { store, type Guest, type Plan, type PlanMember } from "./store";

export interface PlanView {
  plan: Plan;
  members: PlanMember[];
  /** The person looking at the page, if they're on this plan. */
  me: PlanMember | null;
  organiser: Organiser | null;
  guest: Guest | null;
  isHost: boolean;
}

/** Loads a plan by its link and works out who's looking. Null if the link is wrong or expired. */
export async function loadPlan(slug: string): Promise<PlanView | null> {
  const plan = await store.getPlanBySlug(slug);
  if (!plan) return null;
  if (plan.expires_at && Date.parse(plan.expires_at) < Date.now()) return null;

  const [members, organiser, guest] = await Promise.all([store.listMembers(plan.id), currentOrganiser(), currentGuest()]);
  const me =
    members.find((m) => (organiser && m.user_id === organiser.id) || (guest && m.guest_id === guest.id)) ?? null;
  return { plan, members, me, organiser, guest, isHost: me?.role === "organiser" || me?.role === "cohost" };
}
