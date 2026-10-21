// Shared row types. Mirrors supabase/migrations.
// Replace with `supabase gen types typescript` once the project is linked.

export type Vibe = "chill" | "extra" | "straight";
export type PlanStatus = "voting" | "locked" | "wrapped" | "cancelled";
export type Role = "organiser" | "cohost" | "guest";
export type Rsvp = "in" | "maybe" | "out";
export type SplitMode = "even" | "amount" | "percent" | "exclude" | "roulette";
export type ShareStatus = "owed" | "says_paid" | "confirmed";

export interface Plan {
  id: string;
  slug: string;
  organiser_id: string;
  title: string;
  area: string | null;
  starts_at: string | null;
  venue_place_id: string | null;
  venue_name: string | null;
  vibe: Vibe;
  status: PlanStatus;
  vote_deadline: string | null;
  capacity: number;
  plus_ones: boolean;
  version: number;
  updated_note: string | null;
  expires_at: string | null;
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

export const MONOGRAM_COLOURS = ["violet", "lime", "sun", "mint", "tangerine"] as const;
export type MonogramColour = (typeof MONOGRAM_COLOURS)[number];

