/** Sydney wall-clock days, the same strings the web's DateTime uses ("2026-11-14"). */

const TZ = "Australia/Sydney";

export function sydneyToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** "Today", "Tomorrow", "Sat 8". */
export function dayLabel(ymd: string, today = sydneyToday()): string {
  if (ymd === today) return "Today";
  if (ymd === addDays(today, 1)) return "Tomorrow";
  const d = new Date(`${ymd}T00:00:00Z`);
  const wd = new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", weekday: "short" }).format(d);
  return `${wd} ${d.getUTCDate()}`;
}

/** "Saturday", for the reply after picking ("Saturday arvo, sweet."). */
export function dayWord(ymd: string, today = sydneyToday()): string {
  if (ymd === today) return "Today";
  if (ymd === addDays(today, 1)) return "Tomorrow";
  return new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", weekday: "long" }).format(new Date(`${ymd}T00:00:00Z`));
}
