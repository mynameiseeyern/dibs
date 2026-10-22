import "server-only";
import type { Plan, PlanMember, PlanOption, Vibe, Vote } from "@dibs/shared/types";
import { store } from "./store";
import { TZ } from "./time";

// Dibby's automatic nudges (ARV-24). Triggers come from app state (RSVPs, votes, deadlines),
// never from reading the chat. We're on Vercel Hobby, where cron runs at most daily, so this
// runs when someone opens the plan, like closeIfDue. If nobody opens it, the nudge waits.
// Plain templates, no AI call: instant, free, and can't go off-script.

/** Ask the quiet ones once the plan has been out this long. */
const RSVP_AFTER_MS = 3 * 60 * 60 * 1000;
/** Remind about the vote in its last hour. */
const VOTE_CLOSING_MS = 60 * 60 * 1000;
/** At most this many automatic messages per plan in any 24 hours. */
const DAILY_CAP = 3;

const sydneyHour = (d: Date) => Number(new Intl.DateTimeFormat("en-AU", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).format(d));
const sydneyDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); // YYYY-MM-DD
/** 10pm to 8am: RSVP nudges wait until morning. */
const quietHours = (d: Date) => {
  const h = sydneyHour(d);
  return h >= 22 || h < 8;
};

const firstName = (m: PlanMember) => m.display_name.split(" ")[0] || m.display_name;

/** "Tom", "Tom and Priya", "Tom, Priya and Jess", "Tom, Priya, Jess and 2 others". */
export function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length <= 3) return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  const rest = names.length - 3;
  return `${names.slice(0, 3).join(", ")} and ${rest} ${rest === 1 ? "other" : "others"}`;
}

export function rsvpNudge(vibe: Vibe, title: string, names: string[]): string {
  const who = listNames(names);
  const you = names.length === 1 ? "You" : names.length === 2 ? "You two" : "You lot";
  if (vibe === "extra") return `${who}, the crew is waiting on you 👀 are you in for ${title}? 🙏`;
  if (vibe === "straight") return `${who} ${names.length === 1 ? "hasn't" : "haven't"} replied to ${title} yet.`;
  return `Still waiting on ${who} for ${title}. ${you} in?`;
}

const inTime = (ms: number) => {
  const mins = Math.max(1, Math.round(ms / 60000));
  if (mins >= 55) return "in an hour";
  return `in ${mins} ${mins === 1 ? "minute" : "minutes"}`;
};

export function voteClosingNudge(vibe: Vibe, msLeft: number, ranked: { label: string; votes: number }[]): string {
  const when = inTime(msLeft);
  const [top, second] = ranked;
  if (!top || top.votes === 0) {
    if (vibe === "extra") return `voting closes ${when} and NOBODY has voted 😭 tap something, anything`;
    if (vibe === "straight") return `Voting closes ${when}. No votes yet.`;
    return `Voting closes ${when} and no one's voted yet. Get a tap in.`;
  }
  const tied = ranked.filter((r) => r.votes === top.votes);
  if (tied.length > 1) {
    const between = listNames(tied.map((t) => t.label));
    if (vibe === "extra") return `it's neck and neck between ${between} 😤 voting closes ${when}, settle it`;
    if (vibe === "straight") return `Voting closes ${when}. Tied: ${between} (${top.votes} each).`;
    return `Dead heat between ${between}. Voting closes ${when}, so tip it.`;
  }
  const score = second ? `${top.votes} to ${second.votes}` : `${top.votes} ${top.votes === 1 ? "vote" : "votes"}`;
  if (vibe === "extra") return `voting closes ${when} 🗳️ ${top.label}'s out in front ${score}, don't be the reason we end up somewhere worse 😭`;
  if (vibe === "straight") return `Voting closes ${when}. Leading: ${top.label} (${top.votes} ${top.votes === 1 ? "vote" : "votes"}).`;
  return `${top.label}'s winning ${score}. Voting closes ${when}.`;
}

/**
 * Post whichever nudge is due, at most one per page load. Never throws: a failed nudge
 * must not break the plan page.
 */
export async function nudgeIfDue(
  plan: Plan,
  members: PlanMember[],
  options: PlanOption[],
  votes: Vote[],
  now = new Date()
): Promise<boolean> {
  try {
    const due = pickNudge(plan, members, options, votes, now);
    if (!due) return false;
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    if ((await store.countNudgesSince(plan.id, since)) >= DAILY_CAP) return false;
    if (!(await store.claimNudge(plan.id, due.kind, due.key))) return false;
    await store.addMessage({ planId: plan.id, memberId: null, kind: "dibby", body: due.body });
    return true;
  } catch (e) {
    console.error("[nudge]", plan.id, e);
    return false;
  }
}

function pickNudge(plan: Plan, members: PlanMember[], options: PlanOption[], votes: Vote[], now: Date) {
  const t = now.getTime();
  const started = plan.starts_at ? Date.parse(plan.starts_at) <= t : false;
  if (started || (plan.status !== "voting" && plan.status !== "locked")) return null;

  // Vote closing soon: once per deadline, so moving the deadline re-arms it.
  if (plan.status === "voting" && plan.vote_deadline) {
    const left = Date.parse(plan.vote_deadline) - t;
    if (left > 0 && left <= VOTE_CLOSING_MS) {
      const ranked = options
        .map((o) => ({ label: o.label, votes: votes.filter((v) => v.option_id === o.id).length }))
        .sort((a, b) => b.votes - a.votes);
      return { kind: "vote_closing", key: plan.vote_deadline, body: voteClosingNudge(plan.vibe, left, ranked) };
    }
  }

  // Slow RSVPs: once a day, outside quiet hours, naming who hasn't replied.
  if (!quietHours(now) && t - Date.parse(plan.created_at) >= RSVP_AFTER_MS) {
    const quiet = members.filter((m) => m.role !== "organiser" && !m.rsvp && !m.waitlisted);
    if (quiet.length > 0) {
      return { kind: "rsvp", key: sydneyDay(now), body: rsvpNudge(plan.vibe, plan.title, quiet.map(firstName)) };
    }
  }
  return null;
}
