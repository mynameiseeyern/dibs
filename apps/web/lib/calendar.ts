import type { Plan } from "@dibs/shared/types";

/** How long a plan runs in calendars. Plans only have a start time. */
const DURATION_MS = 2 * 60 * 60 * 1000;

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** RFC 5545 line folding: no line longer than 75 octets. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut)) > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
}

export const canAddToCalendar = (plan: Plan) =>
  !!plan.starts_at && (plan.status === "locked" || plan.status === "wrapped");

/** Name, plus a typed-in place's address (callers only pass that for people in the plan). */
const place = (plan: Plan) => (plan.venue_name && plan.venue_address ? `${plan.venue_name}, ${plan.venue_address}` : plan.venue_name ?? plan.area ?? "");

/**
 * One plan as calendar lines. The UID stays the same for a plan and SEQUENCE follows the plan's
 * version, so re-adding after the plan moves updates the event instead of adding a second one.
 */
function planEvent(plan: Plan, url: string, status?: "confirmed" | "tentative"): string[] {
  const start = new Date(plan.starts_at!);
  const end = new Date(start.getTime() + DURATION_MS);
  return [
    "BEGIN:VEVENT",
    `UID:${plan.id}@dibby.social`,
    `SEQUENCE:${plan.version ?? 1}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(plan.title)}`,
    ...(place(plan) ? [`LOCATION:${escape(place(plan))}`] : []),
    `DESCRIPTION:${escape(`Who's coming and what's changed: ${url}`)}`,
    `URL:${url}`,
    ...(status ? [`STATUS:${status === "tentative" ? "TENTATIVE" : "CONFIRMED"}`] : []),
    "END:VEVENT",
  ];
}

const HEADER = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//dibby//plans//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
const finish = (lines: string[]) => lines.map(fold).join("\r\n") + "\r\n";

/** A one-event calendar file, for "Add to calendar" on a plan. */
export function planIcs(plan: Plan, url: string): string {
  return finish([...HEADER, ...planEvent(plan, url), "END:VCALENDAR"]);
}

/**
 * Someone's calendar subscription: every plan they're in (feedStatus), as one calendar the
 * calendar app re-reads about hourly. A plan that drops off (called off, can't go) disappears
 * from their calendar on the next refresh.
 */
export function feedIcs(events: { plan: Plan; url: string; status: "confirmed" | "tentative" }[]): string {
  return finish([
    ...HEADER,
    "X-WR-CALNAME:Dibby plans",
    "X-WR-CALDESC:Plans you're in. Updates on its own.",
    "X-WR-TIMEZONE:Australia/Sydney",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    ...events.flatMap((e) => planEvent(e.plan, e.url, e.status)),
    "END:VCALENDAR",
  ]);
}

/** The subscription link's path, from a token. */
export const feedPath = (token: string) => `/cal/${token}.ics`;

/** Google Calendar's own "add event" page, for people on desktop or without Apple Calendar. */
export function googleCalendarLink(plan: Plan, url: string): string {
  const start = new Date(plan.starts_at!);
  const end = new Date(start.getTime() + DURATION_MS);
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: plan.title,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: `Who's coming and what's changed: ${url}`,
    location: place(plan),
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

/** Outlook's add-event page. `work` uses Microsoft 365 (outlook.office.com), otherwise Outlook.com. */
export function outlookCalendarLink(plan: Plan, url: string, work = false): string {
  const start = new Date(plan.starts_at!);
  const end = new Date(start.getTime() + DURATION_MS);
  const q = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: plan.title,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: `Who's coming and what's changed: ${url}`,
    location: place(plan),
  });
  return `https://${work ? "outlook.office.com" : "outlook.live.com"}/calendar/0/deeplink/compose?${q}`;
}
