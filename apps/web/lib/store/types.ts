import type { Bill, BillShare, Message, Plan, PlanMember, PlanOption, Rsvp, Vibe, Role, Vote } from "@dibs/shared/types";

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

  updatePlan(planId: string, patch: Partial<Pick<Plan, "status" | "venue_name" | "venue_place_id" | "starts_at" | "vote_deadline" | "version" | "updated_note" | "title" | "area">>): Promise<Plan>;

  listMembers(planId: string): Promise<PlanMember[]>;
  addMember(m: NewMember): Promise<PlanMember>;
  updateMember(memberId: string, patch: Partial<Pick<PlanMember, "rsvp" | "plus_one" | "waitlisted" | "display_name" | "attended">>): Promise<void>;

  listOptions(planId: string): Promise<PlanOption[]>;
  addOption(o: { planId: string; label: string; placeId?: string | null; note?: string | null; addedBy?: string | null }): Promise<PlanOption>;
  listVotes(planId: string): Promise<Vote[]>;
  /** One vote per person per plan; voting again moves it. */
  castVote(planId: string, optionId: string, memberId: string): Promise<void>;

  listMessages(planId: string, limit?: number): Promise<Message[]>;
  addMessage(m: { planId: string; memberId: string | null; kind: Message["kind"]; body: string; mentionsDibby?: boolean }): Promise<Message>;

  listBills(planId: string): Promise<Bill[]>;
  createBill(b: Omit<Bill, "id" | "created_at" | "seed" | "roulette_entrants" | "roulette_loser_id"> & { seed: string }, shares: Omit<BillShare, "bill_id" | "says_paid_at" | "confirmed_at">[]): Promise<Bill>;
  updateBill(billId: string, patch: Partial<Pick<Bill, "roulette_entrants" | "roulette_loser_id">>): Promise<void>;
  replaceShares(billId: string, shares: Omit<BillShare, "bill_id" | "says_paid_at" | "confirmed_at">[]): Promise<void>;
  listShares(planId: string): Promise<BillShare[]>;
  updateShare(billId: string, memberId: string, patch: Partial<Pick<BillShare, "status" | "says_paid_at" | "confirmed_at">>): Promise<void>;
  recordSpin(billId: string, entrantIds: string[], resultMemberId: string): Promise<void>;

  listRecap(planId: string): Promise<RecapAnswer[]>;
  saveRecap(a: RecapAnswer): Promise<void>;
}

export interface RecapAnswer {
  plan_id: string;
  member_id: string;
  stars: number | null;
  best_moment: string | null;
  mvp_member_id: string | null;
}

export type { Plan, PlanMember, Rsvp, PlanOption, Vote, Message, Bill, BillShare };
