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

/** "Fri 28 Nov · 3:00 pm", Sydney time: the web's formatWhen (apps/web/lib/time.ts). */
export function whenLong(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", weekday: "short", day: "numeric", month: "short" }).format(d);
  const time = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", hour: "numeric", minute: "2-digit" }).format(d);
  return `${day} · ${time}`;
}

/** "Sat, 7 Nov" and "11:00 am", Sydney time: the two lines of the web's When fact. */
export function whenParts(iso: string | null): { day: string; time: string } | null {
  if (!iso) return null;
  const parts = whenLong(iso)!.split(" · ");
  return { day: parts[0], time: parts[1] };
}

/** "Starting soon", "Tonight", "In 3 hours", "Tomorrow", "4 days to go": the web's countdown (apps/web/lib/time.ts). */
export function countdown(iso: string | null, now = Date.now()): string | null {
  if (!iso) return null;
  const start = Date.parse(iso);
  const ms = start - now;
  if (ms <= 0) return null;
  if (ms < 60 * 60 * 1000) return "Starting soon";
  const day = (t: number) => Date.parse(`${sydneyToday(new Date(t))}T00:00:00Z`) / 86_400_000;
  const days = day(start) - day(now);
  if (days === 0) {
    const hours = Math.round(ms / 3_600_000);
    const hour = Number(new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", hour: "numeric", hourCycle: "h23" }).format(new Date(start)));
    return hour >= 17 ? "Tonight" : `In ${hours} ${hours === 1 ? "hour" : "hours"}`;
  }
  if (days === 1) return "Tomorrow";
  return `${days} days to go`;
}
