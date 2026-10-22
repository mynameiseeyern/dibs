import "server-only";
import type { DibbyVolume, Plan, PlanMember, PlanOption, Vibe, Vote } from "@dibs/shared/types";
import { store } from "./store";
import { TZ } from "./time";
import { renderTemplate, type Template } from "./copy";

// Dibby's automatic nudges (ARV-24). Triggers come from app state (RSVPs, votes, times, bills),
// never from reading the chat. We're on Vercel Hobby, where cron runs at most daily, so the
// time-based ones are checked when someone opens the plan, like closeIfDue; if nobody opens
// it, the nudge waits. Event-based ones (someone bails) run from the action that caused them.
// Plain templates, no AI call: instant, free, and can't go off-script.
//
// Copy lives in lib/copy.ts; each nudge is stored as a template so it re-renders in the
// plan's current vibe (ARV-28).

const HOUR = 60 * 60 * 1000;
/** Ask the quiet ones once the plan has been out this long. */
const RSVP_AFTER_MS = 3 * HOUR;
/** Remind about the vote in its last hour. */
const VOTE_CLOSING_MS = HOUR;
/** Prompt the organiser to wrap up this long after the start. */
const WRAP_AFTER_MS = 3 * HOUR;
/** Day-before recap: from 30 hours out, until 2 hours before. */
const RECAP_FROM_MS = 30 * HOUR;
/** Nudge the maybes in the last two days, until 2 hours before. */
const MAYBE_FROM_MS = 48 * HOUR;
const TOO_LATE_MS = 2 * HOUR;

export type NudgeKind = "vote_closing" | "wrap_up" | "day_before" | "maybe" | "rsvp" | "bail";

/** How chatty Dibby is, set by the organiser. Quiet keeps only the useful reminders. */
const VOLUME: Record<DibbyVolume, { cap: number; kinds: NudgeKind[] }> = {
  quiet: { cap: 1, kinds: ["vote_closing", "wrap_up", "day_before"] },
  normal: { cap: 3, kinds: ["vote_closing", "wrap_up", "day_before", "maybe", "rsvp", "bail"] },
  loud: { cap: 5, kinds: ["vote_closing", "wrap_up", "day_before", "maybe", "rsvp", "bail"] },
};

const sydneyHour = (d: Date) => Number(new Intl.DateTimeFormat("en-AU", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).format(d));
const sydneyDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); // YYYY-MM-DD
/** 10pm to 8am: chatty nudges wait until morning. The vote reminder doesn't, it can't wait. */
const quietHours = (d: Date) => {
  const h = sydneyHour(d);
  return h >= 22 || h < 8;
};

const firstName = (m: PlanMember) => m.display_name.split(" ")[0] || m.display_name;

/** "Today 7pm", "Tomorrow 7:30pm", "Sat 7pm". */
export function whenLabel(startIso: string, now: Date): string {
  const start = new Date(startIso);
  const time = new Intl.DateTimeFormat("en-AU", { timeZone: TZ, hour: "numeric", minute: "2-digit" })
    .format(start)
    .replace(":00", "")
    .replace(/\s/g, "")
    .toLowerCase();
  const day = sydneyDay(start);
  if (day === sydneyDay(now)) return `Today ${time}`;
  if (day === sydneyDay(new Date(now.getTime() + 24 * HOUR))) return `Tomorrow ${time}`;
  return `${new Intl.DateTimeFormat("en-AU", { timeZone: TZ, weekday: "short" }).format(start)} ${time}`;
}

// Private money reminders: shown only to the person, never posted. Copy is in lib/copy.ts.
/** Unpaid for this long: remind the person who owes, privately. Again at day 5. */
export const OWE_REMIND_AFTER_MS = 2 * 24 * HOUR;
export const OWE_REMIND_AGAIN_MS = 5 * 24 * HOUR;
/** Unpaid for this long: tell the payer, privately. */
export const TELL_PAYER_AFTER_MS = 5 * 24 * HOUR;

// ---------- Time-based nudges, checked on page load ----------

/**
 * Post whichever nudge is due, at most one per page load. Never throws: a failed nudge
 * must not break the plan page.
 */
export async function nudgeIfDue(plan: Plan, members: PlanMember[], options: PlanOption[], votes: Vote[], now = new Date()): Promise<boolean> {
  try {
    // Several can be due at once; post the first that hasn't gone out yet.
    for (const due of dueNudges(plan, members, options, votes, now)) {
      const r = await post(plan, due, now);
      if (r !== "already-sent") return r === "posted";
    }
    return false;
  } catch (e) {
    console.error("[nudge]", plan.id, e);
    return false;
  }
}

interface Due {
  kind: NudgeKind;
  key: string;
  template: Template;
}

/** Check the plan's volume and daily cap, claim the nudge, post it. */
async function post(plan: Plan, due: Due, now: Date): Promise<"posted" | "already-sent" | "blocked"> {
  const volume = VOLUME[plan.dibby_volume ?? "normal"];
  if (!volume.kinds.includes(due.kind)) return "blocked";
  const since = new Date(now.getTime() - 24 * HOUR).toISOString();
  if ((await store.countNudgesSince(plan.id, since)) >= volume.cap) return "blocked";
  if (!(await store.claimNudge(plan.id, due.kind, due.key))) return "already-sent";
  await store.addMessage({ planId: plan.id, memberId: null, kind: "dibby", body: renderTemplate(due.template, plan.vibe), template: due.template, auto: true });
  return "posted";
}

/** Every nudge due right now, most important first. */
function* dueNudges(plan: Plan, members: PlanMember[], options: PlanOption[], votes: Vote[], now: Date): Generator<Due> {
  if (plan.status !== "voting" && plan.status !== "locked") return;
  const t = now.getTime();
  const allowed = VOLUME[plan.dibby_volume ?? "normal"].kinds;
  const ok = (k: NudgeKind) => allowed.includes(k);
  const start = plan.starts_at ? Date.parse(plan.starts_at) : null;
  const untilStart = start === null ? null : start - t;
  const quiet = quietHours(now);

  // Vote closing soon: once per deadline, so moving the deadline re-arms it.
  if (ok("vote_closing") && plan.status === "voting" && plan.vote_deadline) {
    const left = Date.parse(plan.vote_deadline) - t;
    if (left > 0 && left <= VOTE_CLOSING_MS) {
      const ranked = options
        .map((o) => ({ label: o.label, votes: votes.filter((v) => v.option_id === o.id).length }))
        .sort((a, b) => b.votes - a.votes);
      yield { kind: "vote_closing", key: plan.vote_deadline, template: { k: "vote_closing", mins: Math.max(1, Math.round(left / 60000)), ranked } };
    }
  }
  if (quiet) return;

  // After the night: the organiser hasn't wrapped up yet.
  if (ok("wrap_up") && plan.status === "locked" && untilStart !== null && -untilStart >= WRAP_AFTER_MS) {
    const host = members.find((m) => m.role === "organiser");
    if (host) yield { kind: "wrap_up", key: plan.starts_at!, template: { k: "wrap_up", host: firstName(host) } };
  }
  if (untilStart !== null && untilStart <= TOO_LATE_MS) return;

  // Day before: the recap card. Keyed to the start, so moving the plan re-arms it.
  if (ok("day_before") && plan.status === "locked" && untilStart !== null && untilStart <= RECAP_FROM_MS) {
    const coming = members.filter((m) => m.rsvp === "in" && !m.waitlisted).reduce((n, m) => n + 1 + (m.plus_one ? 1 : 0), 0);
    yield {
      kind: "day_before",
      key: plan.starts_at!,
      template: { k: "day_before", when: whenLabel(plan.starts_at!, now), where: plan.venue_name ?? plan.area, coming },
    };
  }

  // The maybes, in the last two days.
  if (ok("maybe") && untilStart !== null && untilStart <= MAYBE_FROM_MS) {
    const maybes = members.filter((m) => m.role !== "organiser" && m.rsvp === "maybe" && !m.waitlisted);
    if (maybes.length > 0) yield { kind: "maybe", key: plan.starts_at!, template: { k: "maybe", title: plan.title, names: maybes.map(firstName) } };
  }

  // Slow RSVPs: once a day, naming who hasn't replied.
  if (ok("rsvp") && t - Date.parse(plan.created_at) >= RSVP_AFTER_MS) {
    const silent = members.filter((m) => m.role !== "organiser" && !m.rsvp && !m.waitlisted);
    if (silent.length > 0) yield { kind: "rsvp", key: sydneyDay(now), template: { k: "rsvp", title: plan.title, names: silent.map(firstName) } };
  }
}

// ---------- Event-based nudges ----------

/** Someone who was in now can't make it. Once per person per day; respects volume and the cap. */
export async function nudgeOnBail(plan: Plan, member: PlanMember, now = new Date()): Promise<void> {
  try {
    if (plan.status !== "voting" && plan.status !== "locked") return;
    if (plan.starts_at && Date.parse(plan.starts_at) <= now.getTime()) return;
    if (quietHours(now)) return;
    await post(plan, { kind: "bail", key: `${member.id}:${sydneyDay(now)}`, template: { k: "bail", name: firstName(member) } }, now);
  } catch (e) {
    console.error("[nudge bail]", plan.id, e);
  }
}
