// When a plan starts, from what the organiser told Dibby. Pure, so it's tested.

const TZ = "Australia/Sydney";

/** "2026-10-24" for a moment, in Sydney. */
export function sydneyDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** "19:05" for a moment, in Sydney. */
export function sydneyTime(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
}

export interface WhenPicks {
  /** "2026-10-24", tapped on a chip. */
  date?: string | null;
  /** "19:00", tapped on a chip. */
  time?: string | null;
}

/**
 * The start, as "YYYY-MM-DDTHH:mm" Sydney time, or null for "to be decided".
 * Tapped chips win over what Dibby read from the text. A time with no day means today, or
 * tomorrow if that time has already gone. A day with no time stays undecided: never made up.
 */
export function resolveStart(fromText: string | null, picks: WhenPicks, now = new Date()): string | null {
  const text = fromText && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(fromText) ? fromText : null;
  const date = picks.date ?? text?.slice(0, 10) ?? null;
  const time = picks.time ?? text?.slice(11, 16) ?? null;
  if (date && time) return `${date}T${time}`;
  if (time) return `${time > sydneyTime(now) ? sydneyDate(now) : sydneyDate(new Date(now.getTime() + 86_400_000))}T${time}`;
  return null;
}
