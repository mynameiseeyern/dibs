import "server-only";
import { toPlanSummary, type PlanDetail } from "@dibs/shared/api";
import { countIn, extraOn, planAccess, READ_ONLY_NOTE, unreadCount } from "@dibs/shared/plans";
import { picksAllowed } from "@dibs/shared/votes";
import { apiGuest, apiOrganiser } from "./api-auth";
import { asViewer } from "./api-viewer";
import { store } from "./store";
import { REACTIONS } from "./store/types";
import { canAddToCalendar } from "./calendar";
import { mapsLink } from "./places";
import { siteUrl } from "./site";
import { formatShort, formatWhen } from "./time";
import { loadPlan } from "./viewer";
import { crewGate, crewSuggestionFor } from "./crew-plans";

/** Runs `fn` as the app's person (sign-in, guest pass, or nobody yet), so plan actions see them. */
export async function forApp<T>(req: Request, fn: () => Promise<T>): Promise<T> {
  const [organiser, guest] = await Promise.all([apiOrganiser(req), apiGuest(req)]);
  return asViewer({ organiser, guest }, fn);
}

/** The plan as the app's person sees it. Same rules as the web's plan page (app/p/[slug]/page.tsx). */
export async function planDetail(slug: string): Promise<PlanDetail | null> {
  const view = await loadPlan(slug);
  if (!view) return null;
  const { plan, members, me } = view;
  const access = me ? planAccess(me) : null;
  // Like the web's plan page: anyone with the link sees who's going and the vote (read only);
  // someone who said they can't go doesn't. The chat is only for people in the plan.
  const sees = !me || Boolean(access && access.level !== "hidden");
  const inChat = Boolean(me && access && access.level !== "hidden");

  const [options, votes, messages, reactions] = await Promise.all([
    store.listOptions(plan.id),
    store.listVotes(plan.id),
    sees && extraOn(plan, "chat") ? store.listMessages(plan.id, 50) : Promise.resolve([]),
    inChat && extraOn(plan, "chat") ? store.listReactions(plan.id) : Promise.resolve([]),
  ]);
  // Same rule as the web thread: an account that isn't read only can react.
  const canReact = Boolean(me?.user_id && access?.level === "full");
  const byId = new Map(members.map((m) => [m.id, m]));
  const host = members.find((m) => m.role === "organiser");
  // The web's Directions button: a place from the map, or a typed-in address for people in the plan.
  const directions = plan.venue_place_id && plan.venue_name ? mapsLink(plan.venue_place_id, plan.venue_name) : me && plan.venue_address ? mapsLink(null, plan.venue_address) : null;

  const gate = await crewGate(plan, { userId: view.organiser?.id ?? null, onPlan: Boolean(me) });
  return {
    plan: toPlanSummary(plan, members, formatShort(plan.starts_at)),
    crew: gate.crew ? { ...gate.crew, member: gate.crewRole !== null } : null,
    visibility: gate.crewId ? gate.visibility : null,
    crew_suggestion: await crewSuggestionFor(plan, members, view.organiser?.id ?? null, view.isHost).catch(() => null),
    host_name: host ? host.display_name.split(" ")[0] : null,
    directions,
    // A typed-in place's address, under its name: only for people in the plan.
    address: me && plan.venue_name && !plan.venue_place_id ? (plan.venue_address ?? null) : null,
    // The web's Add to calendar: people in the plan, once it's locked in with a time.
    calendar: me && plan.status === "locked" && canAddToCalendar(plan) ? `${siteUrl()}/p/${plan.slug}/calendar` : null,
    // New chat messages since they last opened it, for the Chat button's badge.
    unread: inChat && extraOn(plan, "chat") ? unreadCount(me!.dibby_muted ? messages.filter((m) => !m.auto) : messages, me!) : 0,
    me:
      me && access
        ? {
            name: me.display_name,
            rsvp: me.rsvp,
            waitlisted: me.waitlisted,
            host: view.isHost,
            access: access.level,
            note: access.level === "read" ? READ_ONLY_NOTE[access.why] : access.level === "hidden" ? "You said you can't go. Tap I'm in to take part." : null,
            canPost: Boolean(me.user_id) && extraOn(plan, "chat"),
          }
        : null,
    going: sees
      ? members
          .filter((m) => m.rsvp === "in" || m.role === "organiser" || m.role === "cohost")
          .map((m) => ({ name: m.display_name, host: m.role === "organiser" || m.role === "cohost", waitlisted: m.waitlisted, colour: m.colour }))
      : null,
    vote:
      sees && options.length
        ? {
            open: plan.status === "voting",
            maxPicks: picksAllowed(plan, options.length),
            options: options.map((o) => ({
              id: o.id,
              label: o.label,
              // A typed-in place's address is only for people in the plan (the web's voteRows).
              note: o.place_id || me ? o.note : null,
              votes: votes.filter((v) => v.option_id === o.id).length,
              mine: Boolean(me && votes.some((v) => v.option_id === o.id && v.member_id === me.id)),
              place_id: o.place_id && !o.place_id.startsWith("demo:") ? o.place_id : null,
            })),
            voters: new Set(votes.map((v) => v.member_id)).size,
            members: members.length,
            closes: plan.status === "voting" ? formatShort(plan.vote_deadline) : null,
          }
        : null,
    chat:
      inChat && extraOn(plan, "chat")
        ? {
            // Oldest first, like both stores give them.
            messages: messages
              .filter((m) => !(me!.dibby_muted && m.auto))
              .map((m) => ({
                id: m.id,
                kind: m.kind,
                body: m.body,
                author: m.kind === "dibby" ? "Dibby" : m.member_id ? (byId.get(m.member_id)?.display_name ?? "Former member") : null,
                colour: m.member_id ? (byId.get(m.member_id)?.colour ?? null) : null,
                mine: m.member_id === me!.id,
                at: m.created_at,
                reactions: REACTIONS.map((e) => {
                  const here = reactions.filter((r) => r.message_id === m.id && r.emoji === e);
                  return { emoji: e as string, count: here.length, mine: here.some((r) => r.member_id === me!.id) };
                }).filter((r) => r.count > 0),
              })),
            // The web's pinned line (chat/page.tsx).
            summary: [plan.title, formatWhen(plan.starts_at), plan.venue_name ?? plan.area, `${countIn(members)} going`].filter(Boolean).join(" · "),
            muted: plan.status === "wrapped" ? null : Boolean(me!.dibby_muted),
            react: canReact ? [...REACTIONS] : [],
          }
        : null,
  };
}
