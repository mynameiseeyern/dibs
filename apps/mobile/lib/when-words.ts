// The web's words for a day and a time (apps/web/components/DateTime.tsx and app/new/PlanChat.tsx),
// so making a plan on the phone says them back the same way.

import { addDays, sydneyToday } from "./dates";

const TZ = "Australia/Sydney";

/** "Fri, 27 Nov". */
export const dateLabel = (ymd: string) =>
  new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(`${ymd}T00:00:00Z`));

/** "7pm", "7:30pm". */
export function timeLabel(hhmm: string): string {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  const suffix = h < 12 ? "am" : "pm";
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${suffix}` : `${h12}${suffix}`;
}

/** "Tomorrow, 7pm", "Fri, 27 Nov, 6pm", "7pm" or null: the answer so far, said back. */
export function whenLine(date: string | null, time: string | null, today = sydneyToday()): string | null {
  const day = !date ? null : date === today ? "Today" : date === addDays(today, 1) ? "Tomorrow" : dateLabel(date);
  const at = time ? timeLabel(time) : null;
  return [day, at].filter(Boolean).join(", ") || null;
}

/** "Today, 3pm" → "today, 3pm" mid-sentence. */
export const lc = (s: string) => s.replace(/^(Today|Tomorrow)\b/, (w) => w.toLowerCase());

/** The same word every time for the same plan name ("love it", "keen"…), like the web. */
export const pick = <T>(xs: T[], seed: string) => xs[[...seed].reduce((n, c) => n + c.charCodeAt(0), 0) % xs.length];

/** "November", for the day strip's range. */
export const monthName = (ymd: string) => new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", month: "long" }).format(new Date(`${ymd}T00:00:00Z`));

/** A Sydney wall-clock day and time as an instant, for the date and time pickers. */
export function sydneyInstant(ymd: string, hhmm = "12:00"): Date {
  const asUtc = Date.parse(`${ymd}T${hhmm}:00Z`);
  const offset = (t: number) => {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(t));
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute")) - t;
  };
  let t = asUtc - offset(asUtc);
  t = asUtc - offset(t);
  return new Date(t);
}

/** "19:05" in Sydney, for an instant from the time picker. */
export const sydneyHhmm = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
