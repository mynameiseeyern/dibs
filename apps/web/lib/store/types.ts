import type { AppEvent, LoggedEvent } from "@dibs/shared/metrics";
import type { Bill, BillShare, Message, Plan, PlanMember, PlanOption, PlanPhoto, PlanTime, Rsvp, TimeVote, Vibe, Role, Vote } from "@dibs/shared/types";

export interface Profile {
  user_id: string;
  first_name: string;
  last_name: string;
  dob: string;
  payid: string | null;
  payid_name: string | null;
  /** When they said yes or no to beta updates anywhere. Null: show the one-time card. */
  beta_prompt_answered_at?: string | null;
  /** Categories they made up, newest first. */
  plan_categories?: string[];
}

export interface Subscription {
  email: string;
  token: string;
  subscribed: boolean;
}

export interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  removed_at: string | null;
}

export interface NewPlan {
  /** Signed-in organiser, or a guest organiser (no account): exactly one is set. */
  organiserUserId: string | null;
  organiserGuestId?: string | null;
  organiserName: string;
  category?: string | null;
  description?: string | null;
  extrasOff?: string[];
  title: string;
  area: string | null;
  startsAt: string | null;
  vibe: Vibe;
  plusOnes: boolean;
  /** The organiser already has a place: the plan starts locked to it, with no vote. */
  /** A business from the map (placeId), or a typed-in place (no placeId, optional address). */
  venue?: { placeId: string | null; name: string; address?: string | null } | null;
}

export interface NewMember {
  planId: string;
  userId?: string | null;
  guestId?: string | null;
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
  /** Replaces an organiser's saved categories. */
  setSavedCategories(userId: string, labels: string[]): Promise<void>;

  findGuestByTokenHash(hash: string): Promise<Guest | null>;
  createGuest(g: { first_name: string; last_name: string; tokenHash: string }): Promise<Guest>;
  removeGuest(guestId: string): Promise<void>;
  /** A guest by id (not removed), for rejoin links. */
  getGuest(guestId: string): Promise<Guest | null>;
  /** Points a guest at a new device token: their old browser stops working, this one starts. */
  setGuestTokenHash(guestId: string, hash: string): Promise<void>;
  /** One plan member by id. */
  getMember(memberId: string): Promise<PlanMember | null>;
  /** Moves a membership onto a guest (a host's rejoin link), or detaches it (null). */
  setMemberGuest(memberId: string, guestId: string | null): Promise<void>;
  /** A guest asked for a sign-in link to this email, to keep their plans. */
  setGuestEmail(guestId: string, email: string): Promise<void>;
  /**
   * Moves guest memberships onto an account: the guest on this browser, plus any guest
   * that asked for a link to this email in the last hour. Skips plans the account is
   * already on. Returns how many plans moved.
   */
  claimGuests(userId: string, email: string | null, guestId: string | null): Promise<number>;

  /**
   * Email lists (today just beta updates). Opt-in only: a row appears when someone says yes,
   * and unsubscribing keeps the row with unsubscribed_at as the record that we stopped.
   */
  getSubscription(list: string, who: { userId: string } | { token: string }): Promise<Subscription | null>;
  subscribe(list: string, s: { email: string; userId: string | null; source: "onboarding" | "account" | "resubscribe" | "home-card" | "app-page" }): Promise<Subscription>;
  /** They answered the beta updates question (yes or no), so the card stops showing. */
  answerBetaPrompt(userId: string): Promise<void>;
  unsubscribe(list: string, who: { userId: string } | { token: string }): Promise<Subscription | null>;

  createPlan(p: NewPlan): Promise<Plan>;
  getPlanBySlug(slug: string): Promise<Plan | null>;
  getPlanById(planId: string): Promise<Plan | null>;
  listPlansForUser(userId: string): Promise<{ plan: Plan; member: PlanMember }[]>;
  /** Plans this device has joined as a guest. */
  listPlansForGuest(guestId: string): Promise<{ plan: Plan; member: PlanMember }[]>;

  updatePlan(planId: string, patch: Partial<Pick<Plan, "status" | "venue_name" | "venue_place_id" | "venue_address" | "no_bills" | "starts_at" | "vote_deadline" | "version" | "updated_note" | "title" | "area" | "dibby_volume" | "vibe" | "capacity" | "plus_ones" | "organiser_id" | "category" | "description" | "extras_off">>): Promise<Plan>;

  listMembers(planId: string): Promise<PlanMember[]>;
  addMember(m: NewMember): Promise<PlanMember>;
  updateMember(memberId: string, patch: Partial<Pick<PlanMember, "role" | "rsvp" | "plus_one" | "plus_one_name" | "waitlisted" | "waitlisted_at" | "display_name" | "attended" | "dibby_muted" | "chat_seen_at">>): Promise<void>;

  listOptions(planId: string): Promise<PlanOption[]>;
  addOption(o: { planId: string; label: string; placeId?: string | null; note?: string | null; addedBy?: string | null }): Promise<PlanOption>;
  /** Hosts take an option off the vote. Its votes go with it. */
  removeOption(planId: string, optionId: string): Promise<void>;
  listVotes(planId: string): Promise<Vote[]>;
  /** Takes back someone's vote on a plan (they're no longer going). */
  removeVote(planId: string, memberId: string): Promise<void>;
  /** One vote per person per plan; voting again moves it. */
  castVote(planId: string, optionId: string, memberId: string): Promise<void>;

  listMessages(planId: string, limit?: number): Promise<Message[]>;
  addMessage(m: { planId: string; memberId: string | null; kind: Message["kind"]; body: string; mentionsDibby?: boolean; auto?: boolean; template?: unknown }): Promise<Message>;

  listBills(planId: string): Promise<Bill[]>;
  createBill(b: Omit<Bill, "id" | "created_at" | "seed" | "roulette_entrants" | "roulette_loser_id"> & { seed: string }, shares: Omit<BillShare, "bill_id" | "says_paid_at" | "confirmed_at">[]): Promise<Bill>;
  updateBill(billId: string, patch: Partial<Pick<Bill, "roulette_entrants" | "roulette_loser_id">>): Promise<void>;
  replaceShares(billId: string, shares: Omit<BillShare, "bill_id" | "says_paid_at" | "confirmed_at">[]): Promise<void>;
  listShares(planId: string): Promise<BillShare[]>;
  updateShare(billId: string, memberId: string, patch: Partial<Pick<BillShare, "status" | "says_paid_at" | "confirmed_at">>): Promise<void>;
  recordSpin(billId: string, entrantIds: string[], resultMemberId: string): Promise<void>;

  listRecap(planId: string): Promise<RecapAnswer[]>;
  saveRecap(a: RecapAnswer): Promise<void>;

  listReactions(planId: string): Promise<Reaction[]>;
  /** Adds the reaction, or takes it off if this person already left it. */
  toggleReaction(r: Reaction & { planId: string }): Promise<void>;

  /** Claim one of Dibby's automatic nudges. True only for the first caller; false if already sent. */
  claimNudge(planId: string, kind: string, key: string): Promise<boolean>;
  /** How many automatic nudges a plan has had since a time, for the daily cap. */
  countNudgesSince(planId: string, sinceIso: string): Promise<number>;

  /**
   * Deletes an account (ARV-53). Their memberships become "Former member" (so bills stay right),
   * their profile, PayID and mailing-list rows go, events lose their ID, and the sign-in is deleted.
   */
  deleteAccount(userId: string): Promise<void>;

  /** The Dibby camera: photos on a plan (metadata), newest last. */
  listPhotos(planId: string): Promise<PlanPhoto[]>;
  /** Saves a JPEG to private storage and records it. */
  addPhoto(p: { planId: string; memberId: string; bytes: Uint8Array; width: number | null; height: number | null; glow: string | null }): Promise<PlanPhoto>;
  /** The image itself, for the app's own photo route. */
  photoBytes(photo: PlanPhoto): Promise<Uint8Array | null>;
  /** Deletes a photo and its file. */
  removePhoto(planId: string, photoId: string): Promise<void>;
  /** Deletes every photo these members took (account deletion, a guest removing themselves). */
  removePhotosBy(memberIds: string[]): Promise<void>;

  /** "When works?" (ARV-21): times the host put to the crew, and who's free for each. */
  listTimes(planId: string): Promise<PlanTime[]>;
  listTimeVotes(planId: string): Promise<TimeVote[]>;
  /** Adds a time; the same time twice is a no-op. */
  addTime(planId: string, startsAt: string): Promise<void>;
  removeTime(planId: string, timeId: string): Promise<void>;
  /** Ticks you as free for a time, or unticks you. */
  toggleTimeVote(planId: string, timeId: string, memberId: string): Promise<void>;
  /** Takes back everything someone ticked (they stepped down from going). */
  removeTimeVotes(planId: string, memberId: string): Promise<void>;
  /** The host went with a time: the poll's done. */
  clearTimes(planId: string): Promise<void>;

  /** The pilot's event log (ARV-50). Never throws: a lost event mustn't break what the person did. */
  logEvent(e: AppEvent): Promise<void>;
  /** Events since a time, oldest first, for /admin/metrics. */
  listEvents(sinceIso: string): Promise<LoggedEvent[]>;
}

export interface RecapAnswer {
  plan_id: string;
  member_id: string;
  stars: number | null;
  best_moment: string | null;
  mvp_member_id: string | null;
}

export type { Plan, PlanMember, Rsvp, PlanOption, Vote, Message, Bill, BillShare, PlanTime, TimeVote, PlanPhoto };

export const REACTIONS = ["👍", "❤️", "😂", "🎉"] as const;
export interface Reaction {
  message_id: string;
  member_id: string;
  emoji: (typeof REACTIONS)[number];
}
