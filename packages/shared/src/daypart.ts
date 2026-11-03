// Parts of the day: the quick times on "When are we going?" and the word the recap uses for the plan.
// Plans happen any time, so nothing here assumes a meal or a night out.

import { isWholeDay, sydneyTime } from "./when";

/** Quick times. Each is a fixed fact, like any time someone picks. */
export const TIME_PRESETS = [
  { label: "Super early", at: "06:00" },
  { label: "Morning", at: "09:00" },
  { label: "Midday", at: "12:00" },
  { label: "Arvo", at: "15:00" },
  { label: "Evening", at: "18:00" },
  { label: "Night", at: "20:00" },
  { label: "Late", at: "22:00" },
] as const;

/** What the recap calls the plan: "Rate the arvo", "How was the morning?". "hang" when there's no time. */
export type RecapNoun = "morning" | "arvo" | "night" | "hang";

/**
 * From a plan's start (UTC ISO). Before noon is the morning, noon to 6pm the arvo,
 * 6pm on (and before 4am) the night. No start, or a day with no time set, is a hang.
 */
export function recapNoun(startsAt: string | null | undefined): RecapNoun {
  if (!startsAt) return "hang";
  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime())) return "hang";
  const hhmm = sydneyTime(d);
  if (isWholeDay(`0000-00-00T${hhmm}`)) return "hang";
  const hour = Number(hhmm.slice(0, 2));
  if (hour < 4 || hour >= 18) return "night";
  if (hour < 12) return "morning";
  return "arvo";
}

/** "the arvo", "the hang": for running copy. */
export const theRecapNoun = (startsAt: string | null | undefined) => `the ${recapNoun(startsAt)}`;
