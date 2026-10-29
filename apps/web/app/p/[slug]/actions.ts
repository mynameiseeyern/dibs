"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { READ_ONLY_NOTE, cleanCustomPlace, cleanPlusOneName, countIn, extraOn, hasRoom, planAccess } from "@dibs/shared/plans";
import type { PlanMember, Rsvp } from "@dibs/shared/types";
import { asSearchMemo, BRB, mentionsDibby, replyInThread, suggestMore, type PlanDraft } from "@/lib/dibby";
import { clearGuestSession, createGuestSession } from "@/lib/guest";
import { store } from "@/lib/store";
import { REACTIONS, type Reaction } from "@/lib/store/types";
import { closeVote, fillFromWaitlist } from "@/lib/plan-ops";
import { nudgeOnBail } from "@/lib/nudges";
import { loadPlan } from "@/lib/viewer";
import { formatShort, formatWhen, localToIso } from "@/lib/time";
import { MAX_TIMES } from "@dibs/shared/when";
import { DIBBY_HEADS_UP, planLinkLine } from "@/lib/thread-links";
import { getPlace } from "@/lib/places";
import { readNear } from "@/lib/near";
import { withPlaces } from "@/lib/place-ids";
import { track } from "@/lib/events";
import { report } from "@/lib/report";

export type FormState = { error?: string } | undefined;

/** The plan page and its chat screen both show what changed. */
function revalidatePlan(slug: string) {
  revalidatePath(`/p/${slug}`);
  revalidatePath(`/p/${slug}/chat`);
}

const clean = (v: FormDataEntryValue | null, max = 40) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Guest (or signed-in organiser) joins a plan from its link with just their name. */
export async function joinPlan(slug: string, _prev: FormState, form: FormData): Promise<FormState> {
  const view = await loadPlan(slug);
  if (!view) return { error: "This plan doesn't exist any more." };
  if (view.me) return undefined;
  if (view.plan.status === "cancelled") return { error: "This one's been called off." };

  if (view.organiser) {
    const profile = await store.getProfile(view.organiser.id);
    if (profile) {
      await store.addMember({ planId: view.plan.id, userId: view.organiser.id, name: `${profile.first_name} ${profile.last_name}`, role: "guest" });
      await track({ name: "member_joined", planId: view.plan.id, userId: view.organiser.id });
      revalidatePlan(slug);
      return undefined;
    }
  }

  const first = clean(form.get("first_name"));
  const last = clean(form.get("last_name"));
  if (!first || !last) return { error: "Pop in your first and last name so the crew knows who you are." };

  // Signed in but never set up to organise (a guest who added their email): join as the account.
  if (view.organiser) {
    await store.addMember({ planId: view.plan.id, userId: view.organiser.id, name: `${first} ${last}`, role: "guest" });
    await track({ name: "member_joined", planId: view.plan.id, userId: view.organiser.id });
    revalidatePlan(slug);
    return undefined;
  }

  const guest = view.guest ?? (await createGuestSession(first, last));
  await store.addMember({ planId: view.plan.id, guestId: guest.id, name: `${first} ${last}`, role: "guest" });
  await track({ name: "member_joined", planId: view.plan.id, guestId: guest.id });
  revalidatePlan(slug);
  return undefined;
}

export async function setRsvp(slug: string, rsvp: Rsvp, _form?: FormData): Promise<void> {
  const view = await loadPlan(slug);
  if (!view?.me || view.plan.status === "cancelled" || view.plan.status === "wrapped") return;
  // Hosts are always going: changing that is a change to the plan (manage), not an RSVP.
  if (view.me.role === "organiser") return;
  // A +1 belongs to "I'm in": it stays while you're in (even if plus-ones were switched off
  // since), and goes when you step back. Adding one is setPlusOne.
  const plusOne = rsvp === "in" && view.me.plus_one;

  let waitlisted = false;
  if (rsvp === "in") {
    const others = view.members.filter((m) => m.id !== view.me!.id);
    // Already holding a spot? Keep it. Otherwise check there's room.
    const holding = view.me.rsvp === "in" && !view.me.waitlisted;
    waitlisted = !holding && !hasRoom(others, view.plan.capacity, plusOne);
  }
  // Gave up a spot (or a +1's)? Worked out before saving, while `me` still says what it was.
  const freedSpot = view.me.rsvp === "in" && !view.me.waitlisted && (rsvp !== "in" || (view.me.plus_one && !plusOne));
  // Keep your place in line if you were already waiting; join the back of it if you're new to it.
  const waitlistedAt = waitlisted ? (view.me.waitlisted && view.me.waitlisted_at ? view.me.waitlisted_at : new Date().toISOString()) : null;
  await store.updateMember(view.me.id, { rsvp, plus_one: plusOne, plus_one_name: plusOne ? (view.me.plus_one_name ?? null) : null, waitlisted, waitlisted_at: waitlistedAt });
  // The next person waiting gets it.
  if (freedSpot) await fillFromWaitlist(view.plan);
  // Only people going vote. Stepping back to maybe or can't go, before the plan starts,
  // takes their vote back so it doesn't decide a night they might not come to.
  const started = Boolean(view.plan.starts_at && Date.parse(view.plan.starts_at) <= Date.now());
  if (rsvp !== "in" && view.plan.status === "voting" && !started) await store.removeVote(view.plan.id, view.me.id);
  // Same for "When works?": their ticks come off too.
  if (rsvp !== "in" && !started) await store.removeTimeVotes(view.plan.id, view.me.id);
  // Was in, now can't go: Dibby gives the crew a heads-up (respects mute volume and the cap).
  if (rsvp === "out" && view.me.rsvp === "in" && !view.me.waitlisted) await nudgeOnBail(view.plan, view.me);
  revalidatePlan(slug);
}

/**
 * "Bringing someone?" under I'm in. On needs plus-ones welcome and a spot for them; off always
 * works. The name is optional: blank shows as "+ 1". Changing just the name is fine too.
 */
export async function setPlusOne(slug: string, on: boolean, rawName: string): Promise<{ error?: string }> {
  const view = await loadPlan(slug);
  if (!view?.me || view.plan.status === "cancelled" || view.plan.status === "wrapped") return { error: "This plan's finished, so it can't be changed." };
  const me = view.me;
  if (me.rsvp !== "in" || me.waitlisted) return { error: "Say you're in first, then you can bring someone." };
  const name = on ? cleanPlusOneName(rawName) : null;
  if (on && !me.plus_one) {
    if (!view.plan.plus_ones) return { error: "Plus-ones aren't on for this one." };
    if (view.plan.capacity !== null && countIn(view.members) + 1 > view.plan.capacity) return { error: "It's full, so there's no room for a +1 right now." };
  }
  if (on === me.plus_one && name === (me.plus_one_name ?? null)) return {};
  const droppedPlusOne = !on && me.plus_one;
  await store.updateMember(me.id, { plus_one: on, plus_one_name: name });
  if (droppedPlusOne) await fillFromWaitlist(view.plan);
  revalidatePlan(slug);
  return {};
}

/** A host takes someone's +1 off: a quiet fix, no chat message. */
export async function removePlusOne(slug: string, memberId: string): Promise<{ error?: string }> {
  const view = await loadPlan(slug);
  if (!view?.isHost) return { error: "Only hosts can do that." };
  const them = view.members.find((m) => m.id === memberId);
  if (!them?.plus_one) return {};
  await store.updateMember(them.id, { plus_one: false, plus_one_name: null });
  await fillFromWaitlist(view.plan);
  revalidatePlan(slug);
  return {};
}

/** Someone tapped a share button. Counted, nothing else: the share sheet itself is the phone's. */
export async function trackShare(slug: string, kind: "invite" | "im_in" | "bills"): Promise<void> {
  const view = await loadPlan(slug);
  if (!view?.me) return;
  await track({ name: "plan_shared", planId: view.plan.id, userId: view.me.user_id, guestId: view.me.guest_id, props: { kind } });
}

/** A guest tapped "Get the Dibby app" (web to app, ARV-50). There's no app yet, so it's a count. */
export async function appInterest(slug: string): Promise<void> {
  const view = await loadPlan(slug);
  if (!view?.me) return;
  await track({ name: "app_interest", planId: view.plan.id, userId: view.me.user_id, guestId: view.me.guest_id });
}

/** Guest privacy: drop them from this plan and forget their name and device. */
export async function removeMe(slug: string): Promise<void> {
  const view = await loadPlan(slug);
  if (view?.guest && view.me?.guest_id === view.guest.id) {
    await store.removeGuest(view.guest.id);
    await clearGuestSession();
    await fillFromWaitlist(view.plan);
  }
  redirect(`/p/${slug}`);
}

/**
 * Only people who are going (and hosts) vote, chat, react or add places. Maybes, people who
 * haven't replied and the waitlist read along; "can't go" don't see it. Null when allowed.
 */
function blocked(view: NonNullable<Awaited<ReturnType<typeof loadPlan>>>): string | null {
  if (!view.me) return "Join the plan first.";
  const a = planAccess(view.me);
  if (a.level === "full") return null;
  return a.level === "hidden" ? "You said you can't go. Tap I'm in to take part." : READ_ONLY_NOTE[a.why];
}

// ---------- Thread ----------

export async function postMessage(slug: string, _prev: FormState, form: FormData): Promise<FormState> {
  const view = await loadPlan(slug);
  if (!view?.me) return { error: "Join the plan to chat." };
  if (!extraOn(view.plan, "chat")) return { error: "The chat's switched off for this plan." };
  // Guests read the thread; signed-in members post (ARV-46).
  if (!view.me.user_id) return { error: "Get the app to chat in the thread." };
  const no = blocked(view);
  if (no) return { error: no };
  const body = String(form.get("body") ?? "").trim().slice(0, 2000);
  if (!body) return undefined;
  const tagged = mentionsDibby(body);
  await store.addMessage({ planId: view.plan.id, memberId: view.me.id, kind: "text", body, mentionsDibby: tagged });

  if (tagged) {
    const history = await store.listMessages(view.plan.id, 30);
    if (history.filter((m) => m.mentions_dibby).length === 1) {
      await store.addMessage({
        planId: view.plan.id,
        memberId: null,
        kind: "system",
        body: DIBBY_HEADS_UP,
      });
    }
    await runDibby(view.plan.id, slug, body, view.me, readNear(form));
  }
  revalidatePlan(slug);
  return undefined;
}

async function runDibby(planId: string, slug: string, ask: string, asker: PlanMember, near: { lat: number; lng: number } | null) {
  const view = await loadPlan(slug);
  if (!view) return;
  const [options, votes, recent] = await Promise.all([store.listOptions(planId), store.listVotes(planId), store.listMessages(planId, 20)]);
  const names = new Map(view.members.map((m) => [m.id, m.display_name]));
  try {
    const out = await replyInThread(
      {
        plan: view.plan,
        members: view.members,
        options: options.map((o) => ({ ...o, votes: votes.filter((v) => v.option_id === o.id).length })),
        recent,
        nameOf: (id) => (id ? names.get(id) ?? "Someone" : "Dibby"),
        near,
      },
      ask
    );
    const existing = new Set(options.map((o) => o.label.toLowerCase()));
    const added: (string | null)[] = [];
    for (const v of out.addOptions) {
      if (existing.has(v.name.toLowerCase())) continue;
      await store.addOption({ planId, label: v.name, placeId: v.placeId, note: v.address });
      added.push(v.placeId);
    }
    let body = out.reply;
    if (out.newPlan && asker.user_id) {
      const created = await createFromThread(out.newPlan, asker, view.members, ask);
      body = `${out.reply}\n${planLinkLine(created.slug)}`;
    }
    // Remember where Dibby looked, so "how about korean?" next time searches the same place.
    // The places it added show as tiles under its reply.
    await store.addMessage({ planId, memberId: null, kind: "dibby", body, template: withPlaces(out.searched, added) });
  } catch (e) {
    report("dibby", e);
    await store.addMessage({ planId, memberId: null, kind: "dibby", body: BRB });
  }
}

/**
 * A new plan Dibby set up from a thread: the asker organises it, everyone else from the
 * current plan is invited without an RSVP, and the vote opens on Dibby's venues.
 */
async function createFromThread(draft: PlanDraft, asker: PlanMember, crew: PlanMember[], ask: string) {
  const plan = await store.createPlan({
    organiserUserId: asker.user_id!,
    organiserName: asker.display_name,
    title: draft.title,
    area: draft.area,
    startsAt: draft.startsAtLocal ? localToIso(draft.startsAtLocal) : null,
    vibe: draft.vibe,
    plusOnes: false,
  });
  for (const m of crew) {
    if (m.id === asker.id || (!m.user_id && !m.guest_id)) continue;
    await store.addMember({ planId: plan.id, userId: m.user_id ?? undefined, guestId: m.guest_id ?? undefined, name: m.display_name, role: "guest" });
  }
  for (const v of draft.venues) {
    await store.addOption({ planId: plan.id, label: v.name, placeId: v.placeId, note: v.address });
  }
  const members = await store.listMembers(plan.id);
  const organiser = members.find((m) => m.user_id === asker.user_id) ?? null;
  await store.addMessage({ planId: plan.id, memberId: organiser?.id ?? null, kind: "text", body: ask, mentionsDibby: true });
  await store.addMessage({ planId: plan.id, memberId: null, kind: "system", body: DIBBY_HEADS_UP });
  const tail = draft.venues.length ? "Vote's open for 24 hours." : "Couldn't find spots for that on Maps, so add a few from the map and the vote opens.";
  await store.addMessage({ planId: plan.id, memberId: null, kind: "dibby", body: `${draft.reply} ${tail}`, template: withPlaces(null, draft.venues.map((v) => v.placeId)) });
  revalidatePath(`/p/${plan.slug}`);
  return plan;
}

/** Hide or show Dibby's automatic nudges for yourself. Replies to tags always show. */
export async function toggleDibbyMute(slug: string): Promise<void> {
  const view = await loadPlan(slug);
  if (!view?.me) return;
  await store.updateMember(view.me.id, { dibby_muted: !view.me.dibby_muted });
  revalidatePlan(slug);
}

/** React to a message in the thread. Signed-in members only, like posting. */
export async function toggleReaction(slug: string, messageId: string, emoji: string): Promise<void> {
  const view = await loadPlan(slug);
  if (!view?.me?.user_id || !(REACTIONS as readonly string[]).includes(emoji) || blocked(view) || !extraOn(view.plan, "chat")) return;
  const messages = await store.listMessages(view.plan.id, 200);
  if (!messages.some((m) => m.id === messageId)) return;
  await store.toggleReaction({ planId: view.plan.id, message_id: messageId, member_id: view.me.id, emoji: emoji as Reaction["emoji"] });
  revalidatePlan(slug);
}

// ---------- Voting ----------

export async function vote(slug: string, optionId: string): Promise<void> {
  const view = await loadPlan(slug);
  if (!view?.me || view.plan.status !== "voting" || blocked(view)) return;
  const options = await store.listOptions(view.plan.id);
  if (!options.some((o) => o.id === optionId)) return;
  await store.castVote(view.plan.id, optionId, view.me.id);
  revalidatePlan(slug);
}

/** Anyone on the plan adds a place to the vote: a real, open business from the map, or one they type in. */
export async function addOption(slug: string, _prev: FormState, form: FormData): Promise<FormState> {
  const view = await loadPlan(slug);
  if (!view?.me || view.plan.status !== "voting") return { error: "Voting's closed." };
  const no = blocked(view);
  if (no) return { error: no };
  const options = await store.listOptions(view.plan.id);
  if (options.length >= 8) return { error: "That's plenty of options. Time to vote." };
  // Typed in: a title and an optional address, as given. Otherwise a real business from the map.
  const custom = form.has("custom_name") ? cleanCustomPlace(form.get("custom_name"), form.get("custom_address")) : null;
  if (form.has("custom_name") && !custom) return { error: "Give the place a name." };
  const place = custom ? null : await getPlace(String(form.get("place_id") ?? ""));
  if (!custom && !place) return { error: "Couldn't find that place. Pick one from the map." };
  const label = custom?.name ?? place!.name;
  if (options.some((o) => (place && o.place_id === place.placeId) || o.label.toLowerCase() === label.toLowerCase())) return { error: "That one's already on the list." };
  await store.addOption({ planId: view.plan.id, label, placeId: place?.placeId ?? null, note: custom ? custom.address : place!.address, addedBy: view.me.id });
  revalidatePlan(slug);
  return undefined;
}

/**
 * Dibby adds up to three more real spots to an open vote. Anyone who can add a place can ask;
 * the ask and Dibby's reply go in the chat like any other @dibby message.
 */
export async function askDibbyMore(slug: string, form: FormData): Promise<{ error?: string; added?: string[] }> {
  const view = await loadPlan(slug);
  if (!view?.me) return { error: "Join the plan first." };
  if (view.plan.status !== "voting") return { error: "Voting's closed." };
  const no = blocked(view);
  if (no) return { error: no };
  if (!process.env.ANTHROPIC_API_KEY) return { error: "Dibby isn't switched on yet. Add a place from the map instead." };
  const options = await store.listOptions(view.plan.id);
  if (options.length >= 8) return { error: "That's plenty of options. Time to vote." };
  const ask = clean(form.get("ask"), 500);
  // Look where Dibby last looked on this plan (say, Hong Kong), else the plan's area.
  const recent = await store.listMessages(view.plan.id, 30);
  const memo = [...recent].reverse().map((m) => (m.kind === "dibby" ? asSearchMemo(m.template) : null)).find(Boolean) ?? null;
  const near = readNear(form);
  // A place named earlier in this plan wins; otherwise around the asker, then the plan's area.
  const area = memo?.area ?? (near ? null : view.plan.area);
  let more;
  try {
    more = await suggestMore(ask, view.plan.vibe, area, options.map((o) => ({ placeId: o.place_id, label: o.label })), near);
  } catch (e) {
    report("dibby more", e);
    return { error: "brb, Dibby's having a moment. Try again, or add a place from the map." };
  }
  const room = Math.max(0, 8 - options.length);
  const venues = more.venues.slice(0, room);
  await store.addMessage({ planId: view.plan.id, memberId: view.me.id, kind: "text", body: `@dibby ${ask || "more options?"}`, mentionsDibby: true });
  for (const v of venues) await store.addOption({ planId: view.plan.id, label: v.name, placeId: v.placeId, note: v.address });
  const names = venues.map((v) => v.name);
  const body = venues.length
    ? `${more.reply} Added ${names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`} to the vote.`
    : "Couldn't find anything new for that on Maps. Try a different ask, or add one from the map.";
  await store.addMessage({
    planId: view.plan.id,
    memberId: null,
    kind: "dibby",
    body,
    template: withPlaces({ k: "search", query: more.query, area: more.area, near: more.near }, venues.map((v) => v.placeId)),
  });
  revalidatePlan(slug);
  return { added: names };
}

/**
 * Take an option off the vote (swipe, then confirm). Hosts can take any off; everyone else
 * only the ones they added. Votes on it go too.
 */
export async function removeOption(slug: string, optionId: string): Promise<{ error?: string; label?: string }> {
  const view = await loadPlan(slug);
  if (!view?.me) return { error: "Join the plan first." };
  if (view.plan.status !== "voting") return { error: "Voting's closed." };
  const option = (await store.listOptions(view.plan.id)).find((o) => o.id === optionId);
  if (!option) return { label: undefined };
  if (!view.isHost && option.added_by !== view.me.id) return { error: "You can only take off places you added." };
  const no = blocked(view);
  if (no) return { error: no };
  await store.removeOption(view.plan.id, option.id);
  await store.addMessage({ planId: view.plan.id, memberId: null, kind: "system", body: `${view.me!.display_name.split(" ")[0]} took ${option.label} off the vote.` });
  revalidatePlan(slug);
  return { label: option.label };
}

/** Host locks the plan to the winning option. A tie is settled by a seeded spin. */
export async function lockPlan(slug: string): Promise<void> {
  const view = await loadPlan(slug);
  if (!view?.isHost) return;
  await closeVote(view.plan, "host");
  revalidatePlan(slug);
}

/* ---------- When works? (ARV-21) ---------- */

type Result = { error?: string };
const pollOpen = (status: string) => status === "voting" || status === "locked";

/** Tick or untick that you're free at one of the times. Going (and hosts) only, like the vote. */
export async function markFree(slug: string, timeId: string): Promise<Result> {
  const view = await loadPlan(slug);
  if (!view?.me || !pollOpen(view.plan.status)) return { error: "This plan's not taking answers any more." };
  const no = blocked(view);
  if (no) return { error: no };
  await store.toggleTimeVote(view.plan.id, timeId, view.me.id);
  revalidatePlan(slug);
  return {};
}

/** The host puts a time to the crew (up to four, in the future). */
export async function addTime(slug: string, local: string): Promise<Result> {
  const view = await loadPlan(slug);
  if (!view?.isHost || !pollOpen(view.plan.status)) return { error: "Only hosts can add times." };
  const startsAt = localToIso(String(local ?? "").trim().slice(0, 16));
  if (!startsAt) return { error: "Pick a day and a time." };
  if (Date.parse(startsAt) <= Date.now()) return { error: "That time's already been. Pick one coming up." };
  const times = await store.listTimes(view.plan.id);
  if (times.some((t) => Date.parse(t.starts_at) === Date.parse(startsAt))) return { error: "That time's already up." };
  if (times.length >= MAX_TIMES) return { error: `${MAX_TIMES} is plenty. Take one off to add another.` };
  await store.addTime(view.plan.id, startsAt);
  // One heads-up in the chat when the question first goes out.
  if (times.length === 0) {
    await store.addMessage({ planId: view.plan.id, memberId: null, kind: "system", body: `${view.me!.display_name.split(" ")[0]} wants to know when works. Tick the times you're free.` });
  }
  revalidatePlan(slug);
  return {};
}

export async function removeTime(slug: string, timeId: string): Promise<Result> {
  const view = await loadPlan(slug);
  if (!view?.isHost || !pollOpen(view.plan.status)) return { error: "Only hosts can take times off." };
  await store.removeTime(view.plan.id, timeId);
  revalidatePlan(slug);
  return {};
}

/** The host goes with a time: it becomes the plan's start, and the question's done. */
export async function goWithTime(slug: string, timeId: string): Promise<Result & { label?: string }> {
  const view = await loadPlan(slug);
  if (!view?.isHost || !pollOpen(view.plan.status)) return { error: "Only hosts can set the time." };
  const time = (await store.listTimes(view.plan.id)).find((t) => t.id === timeId);
  if (!time) return { error: "That time's gone. Pick another." };
  const label = formatWhen(time.starts_at) ?? "";
  await store.updatePlan(view.plan.id, { starts_at: time.starts_at, version: view.plan.version + 1, updated_note: `It's ${label}.` });
  await store.clearTimes(view.plan.id);
  await store.addMessage({ planId: view.plan.id, memberId: null, kind: "system", body: `${view.me!.display_name.split(" ")[0]} set the time: ${formatShort(time.starts_at)}.` });
  revalidatePlan(slug);
  revalidatePath(`/p/${slug}/manage`);
  return { label };
}

/**
 * They've seen the chat up to now: clears their new-messages badge. Called from the chat screen when
 * it opens and when new messages arrive while it's open. Quiet if it can't save (the badge just stays).
 */
export async function markChatSeen(slug: string): Promise<void> {
  const view = await loadPlan(slug);
  if (!view?.me) return;
  try {
    await store.updateMember(view.me.id, { chat_seen_at: new Date().toISOString() });
  } catch (e) {
    console.warn("[chat seen]", e);
  }
}

/** Take back one of your own photos (once they've developed, so you can see what you're deleting). */
export async function removeMyPhoto(slug: string, photoId: string): Promise<{ error?: string }> {
  const view = await loadPlan(slug);
  if (!view?.me) return { error: "Join the plan first." };
  const photo = (await store.listPhotos(view.plan.id)).find((p) => p.id === photoId);
  if (!photo || photo.member_id !== view.me.id) return { error: "That's not your photo." };
  await store.removePhoto(view.plan.id, photoId);
  revalidatePlan(slug);
  revalidatePath(`/p/${slug}/recap`);
  return {};
}
