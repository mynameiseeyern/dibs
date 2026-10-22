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
  here: Here;
}

export interface Here {
  organiser: Organiser | null;
  guest: Guest | null;
  /** First and last name if we know it, else the email. Null when nobody's here. */
  name: string | null;
  /** Signed in and has a profile (name and 18+), so can organise. */
  canOrganise: boolean;
}

/**
 * Who's on this browser. When someone is signed in, guest plans joined on this browser,
 * or by a guest who asked for a link to their email, move onto their account.
 */
export async function whoIsHere(): Promise<Here> {
  const [organiser, guest] = await Promise.all([currentOrganiser(), currentGuest()]);
  if (organiser) {
    try {
      await store.claimGuests(organiser.id, organiser.email, guest?.id ?? null);
    } catch (e) {
      console.error("[claim guests]", e);
    }
  }
  const profile = organiser ? await store.getProfile(organiser.id) : null;
  const name = profile
    ? `${profile.first_name} ${profile.last_name}`
    : guest
      ? `${guest.first_name} ${guest.last_name}`
      : organiser
        ? (organiser.email ?? "You")
        : null;
  return { organiser, guest, name, canOrganise: Boolean(profile) };
}

/** Loads a plan by its link and works out who's looking. Null if the link is wrong or expired. */
export async function loadPlan(slug: string): Promise<PlanView | null> {
  const plan = await store.getPlanBySlug(slug);
  if (!plan) return null;
  if (plan.expires_at && Date.parse(plan.expires_at) < Date.now()) return null;

  const here = await whoIsHere();
  const { organiser, guest } = here;
  const members = await store.listMembers(plan.id);
  const me =
    members.find((m) => organiser && m.user_id === organiser.id) ?? members.find((m) => guest && m.guest_id === guest.id) ?? null;
  return { plan, members, me, organiser, guest, isHost: me?.role === "organiser" || me?.role === "cohost", here };
}
