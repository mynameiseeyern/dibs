// Shared row types. Mirrors supabase/migrations.
// Replace with `supabase gen types typescript` once the project is linked.

export type Vibe = "chill" | "extra" | "straight";
export type PlanStatus = "voting" | "locked" | "wrapped" | "cancelled";
export type Role = "organiser" | "cohost" | "guest";
export type Rsvp = "in" | "maybe" | "out";
export type SplitMode = "even" | "amount" | "percent" | "exclude" | "roulette";
export type ShareStatus = "owed" | "says_paid" | "confirmed";

export type DibbyVolume = "quiet" | "normal" | "loud";

export interface Plan {
  id: string;
  slug: string;
  /** Null once the organiser deleted their account. */
  organiser_id: string | null;
  title: string;
  area: string | null;
  starts_at: string | null;
  venue_place_id: string | null;
  venue_name: string | null;
  /** A custom (typed-in) set place's address. Only shown to people in the plan. */
  venue_address: string | null;
  /** Wrapped with "Nothing to split": no Square up card unless someone adds a bill anyway. */
  no_bills: boolean;
  vibe: Vibe;
  status: PlanStatus;
  vote_deadline: string | null;
  capacity: number;
  plus_ones: boolean;
  version: number;
  updated_note: string | null;
  expires_at: string | null;
  /** How chatty Dibby's automatic messages are on this plan. Set by the organiser. */
  dibby_volume: DibbyVolume;
  /** Optional label ("Food", "Run", or one the organiser made up). */
  category: string | null;
  /** Optional details from the organiser: what to bring, where to meet. Public like the title. */
  description: string | null;
  /** Extras the organiser switched off ("chat", "photos", "bills", "recap"). Empty: all on. */
  extras_off: string[];
  created_at: string;
}

export interface PlanMember {
  id: string;
  plan_id: string;
  user_id: string | null;
  guest_id: string | null;
  role: Role;
  display_name: string;
  colour: MonogramColour;
  rsvp: Rsvp | null;
  plus_one: boolean;
  waitlisted: boolean;
  attended: boolean | null;
  /** Hide Dibby's automatic nudges for this member. */
  dibby_muted: boolean;
  /** When they last opened the plan's chat (null: never). Drives the new-messages badge. */
  chat_seen_at?: string | null;
  joined_at: string;
}

export interface PlanOption {
  id: string;
  plan_id: string;
  kind: "venue" | "activity";
  place_id: string | null;
  label: string;
  note: string | null;
  added_by: string | null;
  created_at: string;
}

export interface Vote {
  option_id: string;
  member_id: string;
}

export interface Message {
  id: string;
  plan_id: string;
  member_id: string | null;
  kind: "text" | "dibby" | "system";
  body: string;
  mentions_dibby: boolean;
  /** Dibby posted this on its own (a nudge), not in reply to a tag. Hidden for muted members. */
  auto: boolean;
  /** For Dibby's templated messages: what to re-render in the plan's current vibe. */
  template: unknown | null;
  created_at: string;
}

export interface Bill {
  id: string;
  plan_id: string;
  payer_member_id: string;
  title: string;
  total_cents: number;
  currency: string;
  split_mode: SplitMode;
  seed: string;
  /** PayID entered on the bill, for payers without a profile (guests). */
  payid: string | null;
  payid_name: string | null;
  roulette_loser_id: string | null;
  roulette_entrants: string[];
  created_at: string;
}

export interface BillShare {
  bill_id: string;
  member_id: string;
  amount_cents: number;
  status: ShareStatus;
  says_paid_at: string | null;
  confirmed_at: string | null;
}

export const MONOGRAM_COLOURS = ["violet", "lime", "sun", "mint", "tangerine", "sky", "coral", "rose", "aqua", "ivory"] as const;
export type MonogramColour = (typeof MONOGRAM_COLOURS)[number];


/** A time the host put to the crew ("When works?"). */
export interface PlanTime {
  id: string;
  plan_id: string;
  starts_at: string;
}

/** Someone ticked that they're free at a time. */
export interface TimeVote {
  time_id: string;
  member_id: string;
}

/** A photo someone took with the Dibby camera. The image itself is in private storage. */
export interface PlanPhoto {
  id: string;
  plan_id: string;
  member_id: string;
  /** Four colours from the shot's corners ("rrggbb,rrggbb,rrggbb,rrggbb"), worked out on the phone. Only a blur of colour: the developing tile glows with it. */
  glow: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
}
