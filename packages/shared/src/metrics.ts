/**
 * The pilot's event log and the four numbers it answers (ARV-50).
 *
 * Events hold IDs and small counts only: never names, messages, places or amounts. They have no
 * foreign keys, so deleting a plan or an account never breaks the log, and an ID on its own says
 * nothing about anyone.
 */

export const EVENT_NAMES = [
  /** A plan was made (form, Ask Dibby, or Dibby from a thread). */
  "plan_created",
  /** The place was decided: the vote closed, or the host picked it. */
  "plan_locked",
  /** Someone joined a plan from the link. `guestId` set when they have no account. */
  "member_joined",
  /** Someone tapped a share button. props.kind: "invite" (host) | "im_in" (guest) | "bills". */
  "plan_shared",
  /** A guest tapped "Get the Dibby app". */
  "app_interest",
  /** A bill was added. props.owed: shares still to be paid. */
  "bill_created",
  /** A bill's shares were (re)set, e.g. after card roulette. props.owed as above. */
  "bill_shares_set",
  /** One share was confirmed paid. */
  "share_settled",
  /** A funnel gate was shown, e.g. "Keep this plan". props.gate: a `Gate`. Once per view. */
  "gate_shown",
  /** Someone did what a gate asked (sent their email). props.gate as above. */
  "gate_converted",
] as const;
export type EventName = (typeof EVENT_NAMES)[number];

/**
 * The asks that move someone up a stage of the funnel: an organiser keeping a plan they made
 * without an account, and a guest adding an email so they can chat.
 */
export const GATES = ["keep_plan", "chat"] as const;
export type Gate = (typeof GATES)[number];

export interface AppEvent {
  name: EventName;
  planId?: string | null;
  userId?: string | null;
  guestId?: string | null;
  billId?: string | null;
  props?: Record<string, string | number | boolean | null>;
}

/** As stored. */
export interface LoggedEvent extends AppEvent {
  at: string;
}

export interface Rate {
  /** null when there's nothing to measure yet. */
  rate: number | null;
  num: number;
  den: number;
}

export interface Metrics {
  /** Plans that reached a decision, of plans made. */
  plansLocked: Rate;
  /** Shares paid within 7 days of the bill, of shares owed. */
  billsSettled: Rate;
  /** Plans per organiser per active month, and the share of those months with two or more plans. */
  repeatPlans: { perOrganiserMonth: number | null; repeatShare: Rate };
  /** Guests who tapped "Get the app", of guests who joined. */
  webToApp: Rate;
}

const DAY = 86_400_000;
const rate = (num: number, den: number): Rate => ({ num, den, rate: den === 0 ? null : num / den });

export function computeMetrics(events: LoggedEvent[]): Metrics {
  const by = (name: EventName) => events.filter((e) => e.name === name);

  // Plans locked: distinct plans made that were locked at some point.
  const made = new Set(by("plan_created").flatMap((e) => (e.planId ? [e.planId] : [])));
  const locked = new Set(by("plan_locked").flatMap((e) => (e.planId && made.has(e.planId) ? [e.planId] : [])));

  // Bills settled within 7 days: owed is the latest count for each bill.
  const billStart = new Map<string, number>();
  const owed = new Map<string, { at: number; owed: number }>();
  for (const e of [...by("bill_created"), ...by("bill_shares_set")]) {
    if (!e.billId) continue;
    const at = Date.parse(e.at);
    if (e.name === "bill_created") billStart.set(e.billId, Math.min(at, billStart.get(e.billId) ?? at));
    const n = Number(e.props?.owed ?? 0);
    const prev = owed.get(e.billId);
    if (!prev || at >= prev.at) owed.set(e.billId, { at, owed: n });
  }
  let settledInWeek = 0;
  for (const e of by("share_settled")) {
    const start = e.billId ? billStart.get(e.billId) : undefined;
    if (start !== undefined && Date.parse(e.at) - start <= 7 * DAY) settledInWeek++;
  }
  const owedTotal = [...owed.entries()].filter(([id]) => billStart.has(id)).reduce((s, [, o]) => s + o.owed, 0);

  // Repeat plans: per organiser per calendar month (UTC) they made at least one plan.
  const months = new Map<string, number>();
  for (const e of by("plan_created")) {
    if (!e.userId) continue;
    const key = `${e.userId}:${e.at.slice(0, 7)}`;
    months.set(key, (months.get(key) ?? 0) + 1);
  }
  const counts = [...months.values()];
  const perOrganiserMonth = counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : null;

  // Web to app: distinct guests.
  const joined = new Set(by("member_joined").flatMap((e) => (e.guestId ? [e.guestId] : [])));
  const keen = new Set(by("app_interest").flatMap((e) => (e.guestId && joined.has(e.guestId) ? [e.guestId] : [])));

  return {
    plansLocked: rate(locked.size, made.size),
    billsSettled: rate(Math.min(settledInWeek, owedTotal), owedTotal),
    repeatPlans: { perOrganiserMonth, repeatShare: rate(counts.filter((n) => n >= 2).length, counts.length) },
    webToApp: rate(keen.size, joined.size),
  };
}

/**
 * For each gate: the people who did what it asked, of the people shown it. A person is their
 * guest or account ID, counted once per gate and plan however often they saw it.
 */
export function computeGates(events: LoggedEvent[]): Record<Gate, Rate> {
  const key = (e: LoggedEvent) => {
    const who = e.guestId ?? e.userId;
    return who ? `${who}:${e.planId ?? ""}` : null;
  };
  const out = {} as Record<Gate, Rate>;
  for (const gate of GATES) {
    const of = (name: EventName) => new Set(events.filter((e) => e.name === name && e.props?.gate === gate).flatMap((e) => key(e) ?? []));
    const shown = of("gate_shown");
    const done = [...of("gate_converted")].filter((k) => shown.has(k));
    out[gate] = rate(done.length, shown.size);
  }
  return out;
}
