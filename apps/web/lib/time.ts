// Plans are in Australian time for the POC. Sydney and Melbourne share a time zone.
export const TZ = "Australia/Sydney";

/** "2026-10-23T19:00" typed in Sydney time -> ISO string in UTC. */
export function localToIso(local: string, tz = TZ): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const asUtc = Date.parse(local + ":00Z");
  // Find the zone's offset at that moment, then correct once more for DST edges.
  const offset = (t: number) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date(t));
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const wall = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
    return wall - t;
  };
  let t = asUtc - offset(asUtc);
  t = asUtc - offset(t);
  return new Date(t).toISOString();
}

/** "Fri 23 Oct · 7:00 pm" */
export function formatWhen(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-AU", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).format(d);
  const time = new Intl.DateTimeFormat("en-AU", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(d);
  return `${day} · ${time}`;
}

/** "Thu 7pm" style deadline for share messages. */
export function formatShort(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-AU", { timeZone: TZ, weekday: "short" }).format(d);
  const time = new Intl.DateTimeFormat("en-AU", { timeZone: TZ, hour: "numeric", minute: "2-digit" })
    .format(d)
    .replace(":00", "")
    .replace(/\s/g, "");
  return `${day} ${time}`;
}

/** The film-style stamp on a Dibby camera photo: "24 OCT · 9:41PM". */
export function formatStamp(iso: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-AU", { timeZone: TZ, day: "numeric", month: "short" }).format(d).toUpperCase();
  const time = new Intl.DateTimeFormat("en-AU", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(d).replace(/\s/g, "").toUpperCase();
  return `${day} · ${time}`;
}

/** ISO → "2026-10-23T19:00" in Sydney wall-clock time ("" for none), for pickers. */
export function isoToLocal(iso: string | null, tz = TZ): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
