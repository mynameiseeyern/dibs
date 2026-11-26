/**
 * Crews (ARV-88, ARV-89): a group of friends who keep making plans together. Accounts only.
 *
 * The server reads the database with the service key, so these rules are the real gate. Check
 * them in every route and server action that touches a crew or a crew plan, like planAccess.
 */

export type CrewRole = "owner" | "admin" | "member";
/** "crew": only the crew (and, once a crew is deleted, the people already on it). "link": anyone with the link, as every plan is today. */
export type PlanVisibility = "crew" | "link";

export const CREW_LIMITS = {
  name: 40,
  /** Pending join requests one person can have open, across every crew. */
  pendingPerPerson: 5,
  /** Pending join requests one crew can have waiting at once. */
  pendingPerCrew: 20,
  /** How long a declined person waits before asking the same crew again. */
  askAgainAfterDays: 7,
} as const;

// ---------- What each role can do ----------

export interface CrewPermissions {
  makePlan: boolean;
  makeInvite: boolean;
  /** Approve or decline join requests, reset or revoke anyone's invites. */
  manageRequests: boolean;
  /** Make or remove admins, hand over, rename, delete. */
  manageCrew: boolean;
}

export function crewPermissions(role: CrewRole | null): CrewPermissions {
  if (!role) return { makePlan: false, makeInvite: false, manageRequests: false, manageCrew: false };
  return {
    makePlan: true,
    makeInvite: true,
    manageRequests: role === "owner" || role === "admin",
    manageCrew: role === "owner",
  };
}

/** The owner can remove anyone but themselves; admins can remove members, not other admins. */
export function canRemoveFromCrew(actor: CrewRole | null, target: CrewRole): boolean {
  if (actor === "owner") return target !== "owner";
  if (actor === "admin") return target === "member";
  return false;
}

/** The owner hands over first, unless they're the last one left (then leaving deletes the crew). */
export function leaveCrew(role: CrewRole, othersInCrew: number): { ok: true; deletesCrew: boolean } | { ok: false; why: "hand_over_first" } {
  if (role !== "owner") return { ok: true, deletesCrew: false };
  if (othersInCrew > 0) return { ok: false, why: "hand_over_first" };
  return { ok: true, deletesCrew: true };
}

// ---------- Crew plans ----------

export interface CrewPlanViewer {
  /** The viewer's role in the plan's crew, or null if they're not in it (or signed out). */
  crewRole: CrewRole | null;
  /** Whether they already have a spot on the plan. */
  onPlan: boolean;
}

/**
 * Can this person see the plan at all? "blocked" shows the blocked page, the same page as for a
 * plan that doesn't exist, so it can't be used to check which links are real.
 */
export function crewPlanAccess(
  plan: { crewId: string | null; visibility: PlanVisibility },
  viewer: CrewPlanViewer,
): "see" | "blocked" {
  if (plan.visibility === "link") return "see";
  // Crew deleted: its crew-only plans stay with the people already on them.
  if (!plan.crewId) return viewer.onPlan ? "see" : "blocked";
  // In the crew. Being on the plan isn't enough: someone removed from the crew loses it straight away.
  return viewer.crewRole ? "see" : "blocked";
}

/** The crew's name and emoji follow the plan's visibility: shown on link plans, only to the crew on crew-only ones. */
export function showCrewOnPlan(plan: { crewId: string | null; visibility: PlanVisibility }, viewer: Pick<CrewPlanViewer, "crewRole">): boolean {
  if (!plan.crewId) return false;
  return plan.visibility === "link" || viewer.crewRole !== null;
}

/** Link previews (WhatsApp, iMessage, Messenger) are generic for crew-only plans: no title, place, time, crew or photo. */
export function genericPreview(plan: { visibility: PlanVisibility }): boolean {
  return plan.visibility === "crew";
}

// ---------- Invite links (Discord-style) ----------

export const INVITE_EXPIRY = ["30m", "1h", "6h", "12h", "1d", "7d", "never"] as const;
export type InviteExpiry = (typeof INVITE_EXPIRY)[number];
export const DEFAULT_INVITE_EXPIRY: InviteExpiry = "7d";

/** Null = no limit. */
export const INVITE_MAX_USES = [1, 5, 10, 25, null] as const;
export type InviteMaxUses = (typeof INVITE_MAX_USES)[number];

const EXPIRY_MS: Record<Exclude<InviteExpiry, "never">, number> = {
  "30m": 30 * 60_000,
  "1h": 60 * 60_000,
  "6h": 6 * 60 * 60_000,
  "12h": 12 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
  "7d": 7 * 24 * 60 * 60_000,
};

/** When an invite made now runs out. Null = never. */
export function inviteExpiresAt(choice: InviteExpiry, now: Date): Date | null {
  return choice === "never" ? null : new Date(now.getTime() + EXPIRY_MS[choice]);
}

export interface CrewInvite {
  expiresAt: Date | null;
  maxUses: number | null;
  uses: number;
  revokedAt: Date | null;
}

/** Anything but "ok" opens the "This invite's expired" page, which shows nothing about the crew. */
export function inviteStatus(invite: CrewInvite, now: Date): "ok" | "revoked" | "expired" | "used_up" {
  if (invite.revokedAt) return "revoked";
  if (invite.expiresAt && invite.expiresAt.getTime() <= now.getTime()) return "expired";
  if (invite.maxUses !== null && invite.uses >= invite.maxUses) return "used_up";
  return "ok";
}

/** Members see and revoke their own invites; the owner and admins see and revoke all of them. */
export function canRevokeInvite(actor: { userId: string; role: CrewRole | null }, invite: { createdBy: string | null }): boolean {
  if (!actor.role) return false;
  return crewPermissions(actor.role).manageRequests || invite.createdBy === actor.userId;
}

// ---------- Asking to join ----------

export interface JoinAsk {
  alreadyMember: boolean;
  /** Pending requests this person has open, across every crew. */
  pendingForPerson: number;
  /** Pending requests this crew has waiting. */
  pendingForCrew: number;
  /** Their last declined request to this crew, if any. */
  lastDeclinedAt: Date | null;
  /** When they were removed from this crew, if they were. */
  removedAt: Date | null;
  /** The invite they came through: who made it (their role then) and when. */
  invite: { createdByRole: CrewRole; createdAt: Date };
}

export type JoinAskResult =
  | { ok: true }
  | { ok: false; why: "already_member" | "too_many_pending" | "crew_queue_full" | "declined_recently" | "removed" };

export function canAskToJoin(ask: JoinAsk, now: Date): JoinAskResult {
  if (ask.alreadyMember) return { ok: false, why: "already_member" };
  // Removed: only a fresh invite from the owner or an admin, made after the removal.
  if (ask.removedAt) {
    const fromLead = ask.invite.createdByRole === "owner" || ask.invite.createdByRole === "admin";
    if (!fromLead || ask.invite.createdAt.getTime() <= ask.removedAt.getTime()) return { ok: false, why: "removed" };
  }
  if (ask.lastDeclinedAt) {
    const waitMs = CREW_LIMITS.askAgainAfterDays * 24 * 60 * 60_000;
    if (now.getTime() - ask.lastDeclinedAt.getTime() < waitMs) return { ok: false, why: "declined_recently" };
  }
  if (ask.pendingForPerson >= CREW_LIMITS.pendingPerPerson) return { ok: false, why: "too_many_pending" };
  if (ask.pendingForCrew >= CREW_LIMITS.pendingPerCrew) return { ok: false, why: "crew_queue_full" };
  return { ok: true };
}

/** What the person sees when they can't ask. Never says they were removed or declined. */
export const JOIN_ASK_NOTE: Record<Exclude<JoinAskResult, { ok: true }>["why"], string> = {
  already_member: "You're already in this crew.",
  too_many_pending: "You've got a few requests waiting already. Try again once one's sorted.",
  crew_queue_full: "Heaps of people are waiting to get in. Try again soon.",
  declined_recently: "You can't ask to join this crew right now.",
  removed: "You can't ask to join this crew right now.",
};

// ---------- Name and emoji ----------

const segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;

/** Tidies a crew's name and checks the emoji is exactly one emoji. Null if either is no good. */
export function cleanCrew(name: unknown, emoji: unknown): { name: string; emoji: string } | null {
  const n = String(name ?? "").replace(/\s+/g, " ").trim().slice(0, CREW_LIMITS.name);
  const e = String(emoji ?? "").trim();
  if (!n || !isSingleEmoji(e)) return null;
  return { name: n, emoji: e };
}

export function isSingleEmoji(s: string): boolean {
  if (!s || s.length > 16) return false;
  const graphemes = segmenter ? [...segmenter.segment(s)].length : 1;
  return graphemes === 1 && /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(s);
}

// ---------- API shapes (/api/v1/crews) ----------
// The web and the app both read these. Add fields, never rename or remove: old app versions stay installed.

/** A crew in your list. */
export interface CrewSummary {
  id: string;
  name: string;
  emoji: string;
  /** Your role in it. */
  role: CrewRole;
  members: number;
}

/** A shareable invite link. The token is only in the URL: the server keeps its hash. */
export interface CrewInviteLink {
  url: string;
  /** ISO, or null for never. */
  expires_at: string | null;
  /** Null for no limit. */
  max_uses: number | null;
}

/** `GET /api/v1/crews` */
export interface MyCrews {
  crews: CrewSummary[];
}

/** `POST /api/v1/crews { name, emoji }`: the new crew, with a 7-day invite link ready to share. */
export interface NewCrewResponse {
  crew: CrewSummary;
  invite: CrewInviteLink;
}

/** A few to pick from when naming a crew. Any single emoji works. */
export const CREW_EMOJI = ["🥟", "🍜", "🍕", "🌮", "☕", "🍻", "🏀", "⚽", "🎮", "🎤", "🏖️", "🔥", "✨", "🫶", "👯", "🐸"] as const;

/**
 * `GET /api/v1/crews/invite/:token`: what an invite link shows (ARV-89). Anything but a working
 * link is "expired", with nothing about the crew. The rest is the bare minimum: name, emoji,
 * how many, who invited you. Never member names or plans.
 */
export interface CrewInvitePreview {
  status: "ok" | "expired";
  crew?: { name: string; emoji: string; members: number };
  /** First name of whoever made the link. */
  invited_by?: string | null;
  /** Where the person on this phone stands. */
  you?: "signed_out" | "member" | "pending" | "can_ask" | "cant_ask";
  /** Set when `you` is "member", so the app can open the crew. */
  crew_id?: string;
  /** Why they can't ask, from JOIN_ASK_NOTE. */
  note?: string;
  /** A personal invite for you (ARV-96): the owner picked you, so asking lets you straight in. */
  personal?: boolean;
}

export interface CrewMemberRow {
  user_id: string;
  name: string;
  role: CrewRole;
  you: boolean;
}

export interface CrewRequestRow {
  id: string;
  name: string;
  asked_at: string;
}

export interface CrewInviteRow {
  id: string;
  /** Who made it, or null if their account's gone. */
  made_by: string | null;
  mine: boolean;
  uses: number;
  max_uses: number | null;
  expires_at: string | null;
}

/** `GET /api/v1/crews/:id`: the crew, as a member sees it. Requests and everyone's invites only for the owner and admins. */
export interface CrewDetail {
  crew: CrewSummary;
  members: CrewMemberRow[];
  /** Pending asks. Empty unless you can manage requests. */
  requests: CrewRequestRow[];
  /** Working links: yours, or everyone's if you manage requests. */
  invites: CrewInviteRow[];
  can: CrewPermissions;
  /** The crew's plans (ARV-92). Missing on servers from before it. */
  plans?: CrewPlanSections;
  /** You've muted this crew's notifications (ARV-94). */
  muted?: boolean;
}

/** `POST /api/v1/crews/:id/leave` and `DELETE /api/v1/crews/:id`: where you are afterwards. */
export interface CrewGone {
  /** The crew was deleted (the owner deleted it, or the last person left). */
  deleted: boolean;
}

/** Labels for picking a link's expiry and uses. */
export const INVITE_EXPIRY_LABEL: Record<InviteExpiry, string> = {
  "30m": "30 minutes",
  "1h": "1 hour",
  "6h": "6 hours",
  "12h": "12 hours",
  "1d": "1 day",
  "7d": "7 days",
  never: "Never",
};

// ---------- The crew's plans (ARV-92) ----------

/** A plan in the crew's list, as one member sees it. */
export interface CrewPlanRow {
  slug: string;
  title: string;
  status: "voting" | "locked" | "wrapped" | "cancelled";
  /** ISO start, or null while the day's still being worked out. */
  starts_at: string | null;
  /** "Fri 7pm", Sydney time, from the server. */
  when: string | null;
  place: string | null;
  area: string | null;
  going: number;
  /** What's still up for a vote. */
  deciding: ("when" | "where")[];
  /** You've voted on what's being decided. */
  voted: boolean;
  /** Your answer, or null if you're not on it yet. */
  rsvp: "in" | "maybe" | "out" | null;
  host: boolean;
  visibility: PlanVisibility;
  created_at: string;
}

export interface CrewPlanSections {
  still_deciding: CrewPlanRow[];
  coming_up: CrewPlanRow[];
  past: CrewPlanRow[];
}

/** A plan stays in Coming up until six hours after it starts, like the home screen. */
const STILL_ON_MS = 6 * 3600 * 1000;

/**
 * Still deciding (a vote's running and there's no day yet), Coming up (soonest first; a set plan
 * with no day goes last), Past (newest first). Called off and wrapped plans are past.
 */
export function crewPlanSections(rows: readonly CrewPlanRow[], now: number): CrewPlanSections {
  const live = (r: CrewPlanRow) => r.status === "voting" || r.status === "locked";
  const t = (r: CrewPlanRow) => (r.starts_at ? Date.parse(r.starts_at) : null);
  const still_deciding = rows.filter((r) => r.status === "voting" && !r.starts_at).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const coming_up = rows
    .filter((r) => live(r) && !still_deciding.includes(r) && (t(r) === null || t(r)! > now - STILL_ON_MS))
    .sort((a, b) => (t(a) ?? Infinity) - (t(b) ?? Infinity));
  const past = rows
    .filter((r) => !still_deciding.includes(r) && !coming_up.includes(r))
    .sort((a, b) => (t(b) ?? Date.parse(b.created_at)) - (t(a) ?? Date.parse(a.created_at)));
  return { still_deciding, coming_up, past };
}

// ---------- "Turn this into a crew?" (ARV-96) ----------

/** People on this plan who've been on another of your plans too. Shown to the host. */
export interface CrewSuggestion {
  /** Stays the same for the same people, so "Not now" hides it for this group only. */
  key: string;
  people: { user_id: string; name: string }[];
}

/** The fewest repeat people worth suggesting a crew for. */
export const CREW_SUGGEST_MIN = 2;

/**
 * Who to suggest: people with accounts on this plan (not you, not "can't go") who were also on at
 * least one of your other plans. Null if that's fewer than CREW_SUGGEST_MIN, or if they're already
 * all in one crew with you.
 */
export function suggestCrew(
  thisPlan: { user_id: string | null; name: string; rsvp: string | null }[],
  otherPlans: (string | null)[][],
  myCrews: string[][],
  me: string
): CrewSuggestion | null {
  const seen = new Set(otherPlans.flat().filter((x): x is string => Boolean(x)));
  const people = new Map<string, string>();
  for (const m of thisPlan) if (m.user_id && m.user_id !== me && m.rsvp !== "out" && seen.has(m.user_id)) people.set(m.user_id, m.name);
  if (people.size < CREW_SUGGEST_MIN) return null;
  const ids = [...people.keys()].sort();
  if (myCrews.some((crew) => ids.every((id) => crew.includes(id)))) return null;
  return { key: ids.join(","), people: ids.map((user_id) => ({ user_id, name: people.get(user_id)! })) };
}
