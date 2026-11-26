import { countIn } from "./plans";
import type { MonogramColour, Plan, PlanMember, PlanStatus } from "./types";

/**
 * What the native app gets for a plan link (`GET /api/v1/plans/:slug`). The web and the app both
 * read this shape, so a change here is a change to both: add fields, don't rename or remove them,
 * because older app versions stay on people's phones for weeks.
 *
 * Only what the plan page already shows anyone with the link (the same facts as the link
 * preview): never an address, a balance, who owes what, or who's going by name.
 */
export interface PlanSummary {
  slug: string;
  title: string;
  status: PlanStatus;
  /** ISO start time, or null when the day is still being worked out. */
  starts_at: string | null;
  /** "Fri 7pm", Sydney time, formatted on the server so the app needn't know the time zone. */
  when: string | null;
  /** The set place's name, or null while it's up for a vote. */
  place: string | null;
  area: string | null;
  category: string | null;
  description: string | null;
  /** Going, counting plus-ones, not counting the waitlist. */
  going: number;
  /** Spots, or null for an open plan. */
  capacity: number | null;
  /** The place is still up for a vote. */
  voting: boolean;
}

export const API_VERSION = 1;

export function toPlanSummary(plan: Plan, members: readonly PlanMember[], when: string | null): PlanSummary {
  const voting = plan.status === "voting" && !plan.venue_name;
  return {
    slug: plan.slug,
    title: plan.title,
    status: plan.status,
    starts_at: plan.starts_at,
    when,
    place: voting ? null : plan.venue_name,
    area: plan.area,
    category: plan.category,
    description: plan.description,
    going: countIn(members),
    capacity: plan.capacity,
    voting,
  };
}

/**
 * Sign-in on the phone. The app never holds a Supabase key: it asks the web app to email a
 * code (`POST /api/v1/auth/code`), swaps the code for a session (`POST /api/v1/auth/verify`)
 * and keeps it fresh (`POST /api/v1/auth/refresh`). Every other call sends
 * `Authorization: Bearer <access_token>`.
 */
export interface AuthSession {
  access_token: string;
  refresh_token: string;
  /** Unix seconds. Refresh a minute or so before. */
  expires_at: number;
}

/** `GET /api/v1/me`. `name` is null until they've told us it (a new account). */
export interface Me {
  id: string;
  email: string | null;
  name: { first: string; last: string } | null;
}

/** `GET /api/v1/me/account`: what the web's /account shows, for whoever's on this phone. */
export interface AccountInfo {
  /** account: signed in. guest: made or joined plans without one. none: neither yet. */
  kind: "account" | "guest" | "none";
  /** "Ee Ng", or null before the name step / for nobody. */
  name: string | null;
  email: string | null;
  /** Lifetime card roulette record, across every plan; null if they've never been in a spin. */
  record: { played: number; lost: number; paid: string } | null;
  /** Accounts only: beta update emails on or off. Change with `PUT { beta_updates }`. */
  beta_updates: boolean | null;
  /** Accounts only: the private calendar subscription link. Reset with `POST /api/v1/me/calendar`. */
  calendar_url: string | null;
}

/** A row on the phone's home screen (`GET /api/v1/me/plans`): your plans, with your answer. */
export interface MyPlan extends PlanSummary {
  /** Your answer on this plan. */
  rsvp: PlanMember["rsvp"];
  waitlisted: boolean;
  host: boolean;
  /** "Hosting", "Co-hosting" or "Going": the web's row label. */
  role_label?: string;
  /** The web's status chip text, e.g. "Voting · closes Thu 6:15am". */
  status_label?: string;
  /** Faces for the row (people in, not the waitlist), first five or so. */
  faces?: { name: string; colour: PlanMember["colour"] }[];
  /** The one thing to do next ("Wrap it up: who came?", "You owe $12."), or null. */
  nudge?: string | null;
  /** The plan's crew, when you may see which (ARV-97): for the label and the crew filter. */
  crew?: { id: string; name: string; emoji: string } | null;
}

export function toMyPlan(plan: Plan, members: readonly PlanMember[], me: PlanMember, when: string | null): MyPlan {
  return {
    ...toPlanSummary(plan, members, when),
    rsvp: me.rsvp,
    waitlisted: me.waitlisted,
    host: me.role === "organiser" || me.role === "cohost",
  };
}

/** Error body every /api/v1 route sends: `{ error }`, copy that's fine to show as is. */
export interface ApiError {
  error: string;
}

/** `GET /api/v1/me/plans`. `claimed`: how many guest plans just moved onto the account (signed in only). */
export interface MyPlans {
  upcoming: MyPlan[];
  past: MyPlan[];
  /** Past plans with money still out or waiting to be wrapped up: the web's "To sort out". */
  sort_out?: MyPlan[];
  claimed?: number;
}

/** `POST /api/v1/plans`. One question a screen in the app, all sent together at the end. */
export interface NewPlanRequest {
  title: string;
  /** Make it for a crew you're in (ARV-93). Accounts only. */
  crew_id?: string | null;
  /** Crew plans: "crew" (the default) for the crew alone, "link" for anyone with the link. */
  visibility?: "crew" | "link";
  category?: string | null;
  /** "2026-11-14" and "19:00", Sydney wall clock. */
  date?: string | null;
  time?: string | null;
  where: "vote" | "place" | "dibby";
  /** Typed in (name, optional address), or picked from the map (place_id, which the server checks). */
  place?: { name: string; address?: string | null; place_id?: string | null } | null;
  ask?: string;
  spend?: 1 | 2 | 3 | null;
  /** Required for `where: "dibby"`: they said yes to sending this to the AI provider. */
  ai_consent?: boolean;
  /** "Roughly where? (optional)" when the crew votes: "Surry Hills". */
  area?: string | null;
  /** Only for someone with no account and no guest pass yet. */
  first?: string;
  last?: string;
}

/** `guest_token`: a new guest pass, sent back as `X-Dibby-Guest` from then on. */
export interface NewPlanResponse {
  slug: string;
  guest_token?: string;
}

/**
 * `GET /api/v1/plans/:slug/view`: the plan as the person asking sees it (sign-in or guest pass).
 * Follows the web's rules: can't-go sees no votes, chat or who's in; maybes, the waitlist and
 * people who haven't replied read along; a typed-in place's address is for people in the plan.
 */
export interface PlanDetail {
  plan: PlanSummary;
  /** The plan's crew, if it has one and you may see which (ARV-93). */
  crew?: { id: string; name: string; emoji: string; /** You're in it, so it can open the crew. */ member?: boolean } | null;
  /** Crew plans only: "crew" for the crew alone, "link" for anyone with the link. Null for other plans. */
  visibility?: "crew" | "link" | null;
  /** Hosts, on a plan with no crew: the same people as your other plans, so "Turn this into a crew?" (ARV-96). */
  crew_suggestion?: { key: string; people: { user_id: string; name: string }[] } | null;
  /** The organiser's first name, for "Hosted by Ee". */
  host_name?: string | null;
  /** Google Maps directions to the set place (a typed-in address only for people in the plan). */
  directions?: string | null;
  /** A typed-in place's address (people in the plan only), shown under its name. */
  address?: string | null;
  /** An .ics for the plan (people in the plan, locked in with a time): opening it adds it to the calendar. */
  calendar?: string | null;
  /** New chat messages since this person last opened the chat. */
  unread?: number;
  /** Null: not in the plan yet (show join). */
  me: {
    name: string;
    rsvp: PlanMember["rsvp"];
    waitlisted: boolean;
    host: boolean;
    /** full: vote and chat. read: see it, can't act (`note` says why). hidden: said can't go. */
    access: "full" | "read" | "hidden";
    note: string | null;
    /** Chat needs an account (guests read along). */
    canPost: boolean;
  } | null;
  /** Who's going, for people in the plan who can see it. */
  going: {
    /** Their spot on the plan, for Report or block (long-press). Missing from older servers. */
    id?: string;
    name: string;
    host: boolean;
    waitlisted: boolean;
    colour: MonogramColour;
  }[] | null;
  vote: {
    open: boolean;
    maxPicks: number;
    options: {
      id: string;
      label: string;
      note: string | null;
      votes: number;
      mine: boolean;
      /** Google's ID for a business picked on the map; null for one typed in. Load its card from `GET /api/v1/places/:id`. */
      place_id?: string | null;
    }[];
    /** How many have voted, out of how many can ("2 of 4 voted"). */
    voters?: number;
    members?: number;
    /** "Thu 7pm", when the vote closes on its own; null when there's no deadline. */
    closes?: string | null;
  } | null;
  chat: {
    messages: {
      id: string;
      kind: "text" | "dibby" | "system";
      body: string;
      author: string | null;
      colour: MonogramColour | null;
      mine: boolean;
      at: string;
      /** Reactions on it, in the web's order (👍 ❤️ 😂 🎉), only the ones someone's used. */
      reactions?: { emoji: string; count: number; mine: boolean }[];
      /** Dibby set up another plan from this chat: its slug, for an Open button. `body` leaves the link line out. */
      plan_link?: string | null;
      /**
       * A new plan Dibby drafted, waiting on this person (they asked). Nothing's made or anyone
       * invited until they answer: `POST /api/v1/plans/:slug/dibby/:messageId { action: "make" | "skip" }`.
       */
      confirm?: { title: string; facts: string } | null;
      /** How many of Dibby's places on the vote this person can take back off (`action: "undo"`). 0 when they can't. */
      undo?: number;
    }[];
    /** The line pinned at the top: "Housewarming · Sat, 28 Nov · 11:00 am · Unit 23 · 7 going". */
    summary?: string;
    /** This person muted Dibby's nudges in this chat (the bell). Null once the plan's wrapped (no bell). */
    muted?: boolean | null;
    /** The reactions anyone can add, when this person can react (an account, not read only). */
    react?: string[];
  } | null;
}

/** `GET /api/v1/places/:id`: a business's card, the app's version of the web's PlaceCard. */
export interface PlaceInfo {
  place_id: string;
  name: string;
  address: string | null;
  /** "Thai restaurant". */
  kind: string | null;
  rating: number | null;
  ratings: number | null;
  /** 1 to 4 ($ to $$$$), when Google knows it. */
  price: number | null;
  open_now: boolean | null;
  /** A short-lived photo URL from Google (no key in it), and who took it: show "Photo: <name>". */
  photo: { uri: string; by: string | null } | null;
  maps_url: string;
  /** With `?full=1` (the place sheet, like the web's Google panel): up to 10 photos, each with who took it. */
  photos?: { uri: string; by: string | null }[];
  /** "Monday: 11:30 am – 9:00 pm", a line a day. */
  hours?: string[] | null;
  website?: string | null;
  phone?: string | null;
  /** Google's one-line summary of the place. */
  summary?: string | null;
  reviews?: { author: string; rating: number | null; text: string; when: string | null }[];
}

/** `GET /api/v1/places?q=` (with `lat`/`lng` or `area`): businesses to pick from, like the web's map picker. */
export interface PlaceHit {
  place_id: string;
  name: string;
  address: string | null;
  kind: string | null;
  rating: number | null;
}

/** `POST /api/v1/plans/:slug/join` → maybe a new guest pass, like making a plan. */
export interface JoinResponse {
  guest_token?: string;
}

/**
 * `GET /api/v1/plans/:slug/edit`: everything the app's Edit plan screen shows, hosts only. The
 * same values the web's /p/:slug/manage gets.
 */
/** `POST /api/v1/plans/:slug/dibby/:messageId`: answer Dibby's confirm card, or undo its places. */
export interface DibbyActionRequest {
  action: "make" | "skip" | "undo";
}

export interface PlanEditState {
  status: "voting" | "locked" | "wrapped" | "cancelled";
  title: string;
  category: string | null;
  description: string | null;
  /** Category suggestions: the organiser's own, then the defaults. */
  categories: string[];
  /** Extras switched off on this plan (chat, photos, bills, recap). */
  extras_off: string[];
  starts_at: string | null;
  /** "Fri 22 Nov, 7pm", or null while it's to be decided. */
  when_label: string | null;
  vote_deadline: string | null;
  deadline_label: string | null;
  venue: string | null;
  area: string | null;
  option_count: number;
  /** Null: open, no limit. */
  capacity: number | null;
  going: number;
  plus_ones: boolean;
  multi_vote: boolean;
  vibe: "chill" | "extra" | "straight";
  volume: "quiet" | "normal" | "loud";
  /** Locked but not started: it can be wrapped up early, on the web for now. */
  wrap_early: boolean;
}

/**
 * `POST /api/v1/plans/:slug/edit`: one change at a time, through the same rules as the web's Edit.
 * `when` and `vote_deadline` are Sydney wall clock, "YYYY-MM-DDTHH:mm" ("" clears `when`).
 */
export type PlanEditRequest =
  | { field: "title" | "category" | "description" | "area"; value: string }
  | { field: "when" | "vote_deadline"; value: string }
  | { field: "capacity"; value: number | null }
  | { field: "plus_ones" | "multi_vote"; value: boolean }
  | { field: "extra"; value: { extra: string; on: boolean } }
  | { field: "place"; value: { place_id: string } | { name: string; address?: string } }
  | { field: "open_vote" | "cancel" }
  | { field: "vibe"; value: "chill" | "extra" | "straight" }
  | { field: "volume"; value: "quiet" | "normal" | "loud" };

/** Hosts' answer to an edit: the plan as the app shows it, and the edit screen's fresh values. */
export interface PlanEditResult {
  detail: PlanDetail;
  state: PlanEditState | null;
}
