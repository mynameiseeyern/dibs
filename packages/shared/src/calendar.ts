// Which of someone's plans go in their calendar subscription, and how.

/** Past plans drop off the feed after this long, so the feed stays small. */
export const FEED_KEEP_DAYS = 60;

export type FeedStatus = "confirmed" | "tentative";

/**
 * A plan is in your calendar once it's locked in with a time, and you're going (or hosting).
 * Maybe shows as tentative. Can't go, not replied, waitlisted, still voting or called off:
 * not in it, so the event disappears from the calendar on the next refresh.
 */
export function feedStatus(
  plan: { status: string; starts_at: string | null },
  me: { rsvp: string | null; role: string; waitlisted: boolean },
  now = Date.now()
): FeedStatus | null {
  if (!plan.starts_at || (plan.status !== "locked" && plan.status !== "wrapped")) return null;
  if (Date.parse(plan.starts_at) < now - FEED_KEEP_DAYS * 86400 * 1000) return null;
  if (me.waitlisted || me.rsvp === "out") return null;
  if (me.rsvp === "in" || me.role === "organiser" || me.role === "cohost") return "confirmed";
  if (me.rsvp === "maybe") return "tentative";
  return null;
}
