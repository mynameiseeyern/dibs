import { countIn } from "./plans";
import type { Plan, PlanMember, PlanStatus } from "./types";

/**
 * What the native app gets for a plan link (`GET /api/v1/plans/:slug`). The web and the app both
 * read this shape, so a change here is a change to both: add fields, don't rename or remove them,
 * because older app versions stay on people's phones for weeks.
 *
 * Only what the plan page already shows anyone with the link (the same facts as the link
 * preview): never an address, a balance, who owes what, or who's going by name.
 */
export interface PlanSummary {
  slug: string;
  title: string;
  status: PlanStatus;
  /** ISO start time, or null when the day is still being worked out. */
  starts_at: string | null;
  /** "Fri 7pm", Sydney time, formatted on the server so the app needn't know the time zone. */
  when: string | null;
  /** The set place's name, or null while it's up for a vote. */
  place: string | null;
  area: string | null;
  category: string | null;
  description: string | null;
  /** Going, counting plus-ones, not counting the waitlist. */
  going: number;
  /** Spots, or null for an open plan. */
  capacity: number | null;
  /** The place is still up for a vote. */
  voting: boolean;
}

export const API_VERSION = 1;

export function toPlanSummary(plan: Plan, members: readonly PlanMember[], when: string | null): PlanSummary {
  const voting = plan.status === "voting" && !plan.venue_name;
  return {
    slug: plan.slug,
    title: plan.title,
    status: plan.status,
    starts_at: plan.starts_at,
    when,
    place: voting ? null : plan.venue_name,
    area: plan.area,
    category: plan.category,
    description: plan.description,
    going: countIn(members),
    capacity: plan.capacity,
    voting,
  };
}
