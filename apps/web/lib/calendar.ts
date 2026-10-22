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
 * A one-event calendar file. The UID stays the same for a plan and SEQUENCE follows
 * the plan's version, so re-adding after the plan moves updates the event instead of
 * adding a second one.
 */
export function planIcs(plan: Plan, url: string): string {
  const start = new Date(plan.starts_at!);
  const end = new Date(start.getTime() + DURATION_MS);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//dibs//plans//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
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
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

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
