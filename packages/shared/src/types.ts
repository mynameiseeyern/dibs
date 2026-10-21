// Shared row types. Mirrors supabase/migrations/0001_init.sql.
// Replace with `supabase gen types typescript` once the project is linked.

export type Vibe = "chill" | "extra" | "straight";
export type PlanStatus = "voting" | "locked" | "wrapped" | "cancelled";
export type Role = "organiser" | "cohost" | "guest";
export type Rsvp = "in" | "maybe" | "out";

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

export const MONOGRAM_COLOURS = ["violet", "lime", "sun", "mint", "tangerine"] as const;
export type MonogramColour = (typeof MONOGRAM_COLOURS)[number];
