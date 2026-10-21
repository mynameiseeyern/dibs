import type { Plan, PlanMember, Rsvp, Vibe, Role } from "@dibs/shared/types";

export interface Profile {
  user_id: string;
  first_name: string;
  last_name: string;
  dob: string;
  payid: string | null;
  payid_name: string | null;
}

export interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  removed_at: string | null;
}

export interface NewPlan {
  organiserUserId: string;
  organiserName: string;
  title: string;
  area: string | null;
  startsAt: string | null;
  vibe: Vibe;
  plusOnes: boolean;
}

export interface NewMember {
  planId: string;
  userId?: string;
  guestId?: string;
  name: string;
  role: Role;
}

/**
 * Everything the web app reads or writes. Two implementations: Supabase (real),
 * and an in-memory store for running locally before Supabase is set up.
 * All calls run on the server; access checks happen in lib/viewer.ts and the actions.
 */
export interface Store {
  kind: "supabase" | "memory";
  getProfile(userId: string): Promise<Profile | null>;
  upsertProfile(p: Profile): Promise<void>;

  findGuestByTokenHash(hash: string): Promise<Guest | null>;
  createGuest(g: { first_name: string; last_name: string; tokenHash: string }): Promise<Guest>;
  removeGuest(guestId: string): Promise<void>;

  createPlan(p: NewPlan): Promise<Plan>;
  getPlanBySlug(slug: string): Promise<Plan | null>;
  listPlansForUser(userId: string): Promise<{ plan: Plan; member: PlanMember }[]>;

  listMembers(planId: string): Promise<PlanMember[]>;
  addMember(m: NewMember): Promise<PlanMember>;
  updateMember(memberId: string, patch: Partial<Pick<PlanMember, "rsvp" | "plus_one" | "waitlisted" | "display_name">>): Promise<void>;
}

export type { Plan, PlanMember, Rsvp };
