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

/** At most this many days on a "Which day works?" poll. */
export const MAX_TIMES = 4;

/**
 * "Which day works?" puts days to the crew, not times. A day is kept as midnight Sydney time;
 * older polls held a day and a time, and those keep their own time.
 */
export const isWholeDay = (localStart: string) => localStart.slice(11, 16) === "00:00";

/**
 * The start when the host goes with a day, as "YYYY-MM-DDTHH:mm" Sydney time, or null if
 * there's no time to go with it yet. A time the host picks wins, then the plan's own time.
 * Never made up.
 */
export function startOnDay(option: string, picked: string | null, planTime: string | null): string | null {
  if (!isWholeDay(option)) return option;
  const time = [picked, planTime].find((t) => t && /^\d{2}:\d{2}$/.test(t)) ?? null;
  return time ? `${option.slice(0, 10)}T${time}` : null;
}

export interface RankedTime<T extends { id: string; starts_at: string }> {
  time: T;
  /** Member IDs free at this time, counting only people who can take part. */
  free: string[];
}

/**
 * "When works?": the times in order, who's free for each, and the best one. Only people who can
 * take part (going, and hosts) count, so a vote left behind by someone who stepped down doesn't.
 * Best is the most people free; a tie goes to the earliest. No best until someone's said.
 */
export function rankTimes<T extends { id: string; starts_at: string }>(
  times: T[],
  votes: { time_id: string; member_id: string }[],
  counted: Set<string>
): { rows: RankedTime<T>[]; bestId: string | null } {
  const rows = [...times]
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
    .map((time) => ({ time, free: [...new Set(votes.filter((v) => v.time_id === time.id && counted.has(v.member_id)).map((v) => v.member_id))] }));
  let best: RankedTime<T> | null = null;
  for (const r of rows) if (r.free.length > 0 && (!best || r.free.length > best.free.length)) best = r;
  return { rows, bestId: best?.time.id ?? null };
}
