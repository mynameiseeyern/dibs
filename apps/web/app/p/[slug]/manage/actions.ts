"use server";

import { FORMER_MEMBER, MAX_SPOTS, MIN_SPOTS } from "@dibs/shared/plans";
import { fillFromWaitlist } from "@/lib/plan-ops";
import { MULTI_VOTES, maxVotes } from "@dibs/shared/votes";
import { memberRejoinUrl } from "@/lib/rejoin";
import { mergeBlock, planMerge } from "@dibs/shared/merge";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DibbyVolume, Vibe } from "@dibs/shared/types";
import { store } from "@/lib/store";
import { formatWhen, localToIso } from "@/lib/time";
import { loadPlan } from "@/lib/viewer";
import { getPlace } from "@/lib/places";
import { PLAN_EXTRAS, cleanCategory, cleanCustomPlace, cleanDescription, countIn, extraOn, isPlanExtra, rememberCategory, withExtra, type CustomPlace } from "@dibs/shared/plans";

export type FormState = { error?: string } | undefined;
const clean = (v: FormDataEntryValue | null, max = 80) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

type View = NonNullable<Awaited<ReturnType<typeof loadPlan>>>;
type Result = { error?: string };

/** Hosts only, and only while the plan is still on. */
async function editable(slug: string): Promise<View | Result> {
  const view = await loadPlan(slug);
  if (!view?.isHost) return { error: "Only hosts can change the plan." };
  if (view.plan.status === "cancelled" || view.plan.status === "wrapped") return { error: "This plan's finished, so it can't be changed." };
  return view;
}
const isView = (v: View | Result): v is View => "plan" in v;

/**
 * A change guests care about (name, time, area, when voting closes). Bumps the plan's version,
 * so the next WhatsApp share gets a fresh preview card, leaves an "Updated" note on the page and
 * says so in the chat.
 */
async function announce(slug: string, view: View, patch: Parameters<typeof store.updatePlan>[1], note: string) {
  // Nobody else on it yet (the organiser fixing a typo straight after making it): just save it.
  // No "Updated" note or chat message to a group that hasn't seen the plan.
  if ((await store.listMembers(view.plan.id)).length <= 1) {
    await store.updatePlan(view.plan.id, patch);
    revalidatePath(`/p/${slug}`);
    revalidatePath(`/p/${slug}/manage`);
    return;
  }
  await store.updatePlan(view.plan.id, { ...patch, version: view.plan.version + 1, updated_note: note });
  await store.addMessage({ planId: view.plan.id, memberId: null, kind: "system", body: `${view.me!.display_name.split(" ")[0]} updated the plan: ${note}` });
  revalidatePath(`/p/${slug}`);
  revalidatePath(`/p/${slug}/manage`);
}

export async function setTitle(slug: string, raw: string): Promise<Result> {
  const view = await editable(slug);
  if (!isView(view)) return view;
  const title = clean(raw);
  if (!title) return { error: "Give it a name, like \u201cFriday dinner\u201d." };
  if (title === view.plan.title) return {};
  await announce(slug, view, { title }, `Now called ${title}.`);
  return {};
}

/** The plan's label. Quiet: nobody needs pinging about it. A made-up one is kept for an account. */
export async function setCategory(slug: string, raw: string): Promise<Result> {
  const view = await editable(slug);
  if (!isView(view)) return view;
  const category = cleanCategory(raw);
  if (category === view.plan.category) return {};
  await store.updatePlan(view.plan.id, { category });
  if (category && view.organiser) {
    const profile = await store.getProfile(view.organiser.id);
    const saved = profile?.plan_categories ?? [];
    const next = rememberCategory(saved, category);
    if (profile && next.join("\n") !== saved.join("\n")) await store.setSavedCategories(view.organiser.id, next);
  }
  revalidatePath(`/p/${slug}`);
  revalidatePath(`/p/${slug}/manage`);
  return {};
}

/** The details. Guests might act on them (bring a jacket), so it's announced like a name change. */
export async function setDescription(slug: string, raw: string): Promise<Result> {
  const view = await editable(slug);
  if (!isView(view)) return view;
  const description = cleanDescription(raw);
  if (description === view.plan.description) return {};
  await announce(slug, view, { description }, description ? "Updated the details." : "Took the details off.");
  return {};
}

/** Empty clears the time: "to be decided". */
export async function setWhen(slug: string, local: string): Promise<Result> {
  const view = await editable(slug);
  if (!isView(view)) return view;
  const raw = clean(local, 16);
  const startsAt = raw ? localToIso(raw) : null;
  if (raw && !startsAt) return { error: "That date and time doesn't look right." };
  const same = startsAt === view.plan.starts_at || (startsAt && view.plan.starts_at && Date.parse(startsAt) === Date.parse(view.plan.starts_at));
  if (same) return {};
  await announce(slug, view, { starts_at: startsAt }, startsAt ? `Moved to ${formatWhen(startsAt)}.` : "Time to be decided.");
  return {};
}

/** While it's a vote, the rough area Dibby and the map search around. The venue itself is picked on the map. */
export async function setArea(slug: string, raw: string): Promise<Result> {
  const view = await editable(slug);
  if (!isView(view)) return view;
  if (view.plan.status !== "voting") return {};
  const area = clean(raw) || null;
  if (area === view.plan.area) return {};
  await announce(slug, view, { area }, area ? `Now around ${area}.` : "Area to be decided.");
  return {};
}

/**
 * Switch an extra on or off. Works after wrap-up too (bills and the recap live there), just not
 * on a cancelled plan. Off hides it and stops new entries; whatever's there stays, so switching
 * back on brings it all back.
 */
export async function setExtra(slug: string, extra: string, on: boolean): Promise<Result> {
  const view = await loadPlan(slug);
  if (!view?.isHost) return { error: "Only hosts can change the plan." };
  if (view.plan.status === "cancelled") return { error: "This plan's off, so it can't be changed." };
  if (!isPlanExtra(extra)) return { error: "That's not something you can switch." };
  if (extraOn(view.plan, extra) === on) return {};
  await store.updatePlan(view.plan.id, { extras_off: withExtra(view.plan.extras_off, extra, on) });
  const label = PLAN_EXTRAS.find((e) => e.id === extra)!.label.toLowerCase();
  await store.addMessage({ planId: view.plan.id, memberId: null, kind: "system", body: `${view.me!.display_name.split(" ")[0]} turned ${on ? "on" : "off"} ${label}.` });
  revalidatePath(`/p/${slug}`);
  revalidatePath(`/p/${slug}/manage`);
  return {};
}

/** When the vote closes. In the future, and before the plan starts. */
export async function setVoteDeadline(slug: string, local: string): Promise<Result> {
  const view = await editable(slug);
  if (!isView(view)) return view;
  if (view.plan.status !== "voting") return { error: "The vote's already closed." };
  const at = localToIso(clean(local, 16));
  if (!at) return { error: "That date and time doesn't look right." };
  if (Date.parse(at) <= Date.now() + 5 * 60 * 1000) return { error: "Pick a time at least a few minutes from now. Or lock it in from the vote." };
  if (view.plan.starts_at && Date.parse(at) >= Date.parse(view.plan.starts_at)) return { error: "Voting has to close before the plan starts." };
  if (view.plan.vote_deadline && Date.parse(at) === Date.parse(view.plan.vote_deadline)) return {};
  await announce(slug, view, { vote_deadline: at }, `Voting now closes ${formatWhen(at)}.`);
  return {};
}

/**
 * Open (null, the default: no limit, no waitlist) or closed at a number of spots. Never fewer than
 * are already going; closing doesn't bump anyone. Raising the limit or opening up lets the waitlist in.
 */
export async function setCapacity(slug: string, n: number | null): Promise<Result> {
  const view = await editable(slug);
  if (!isView(view)) return view;
  if (n !== null) {
    if (!Number.isInteger(n) || n < MIN_SPOTS || n > MAX_SPOTS) return { error: `Spots can be anywhere from ${MIN_SPOTS} to ${MAX_SPOTS}.` };
    const going = countIn(view.members);
    if (n < going) return { error: `${going} are already going, plus-ones included, so it can't be fewer than that.` };
  }
  if (n === view.plan.capacity) return {};
  const plan = await store.updatePlan(view.plan.id, { capacity: n });
  await fillFromWaitlist(plan);
  revalidatePath(`/p/${slug}`);
  revalidatePath(`/p/${slug}/manage`);
  return {};
}

export async function setPlusOnes(slug: string, on: boolean): Promise<Result> {
  const view = await editable(slug);
  if (!isView(view)) return view;
  if (on === view.plan.plus_ones) return {};
  await announce(slug, view, { plus_ones: on }, on ? "Plus-ones welcome." : "No new plus-ones. Anyone already bringing someone still can.");
  return {};
}

/**
 * Up to three picks each (on, the default for new plans) or one each (off). Only while it's a
 * vote. Going back to one, anyone who picked more keeps their latest pick.
 */
export async function setMultiVote(slug: string, on: boolean): Promise<Result> {
  const view = await editable(slug);
  if (!isView(view)) return view;
  if (view.plan.status !== "voting") return { error: "The vote's already closed." };
  const max = on ? MULTI_VOTES : 1;
  if (max === maxVotes(view.plan)) return {};
  if (!on) await store.trimVotes(view.plan.id, 1);
  await store.updatePlan(view.plan.id, { max_votes: max });
  // Like switching an extra: a line in the chat, no fresh WhatsApp card.
  if ((await store.listMembers(view.plan.id)).length > 1) {
    const note = on ? `everyone can pick up to ${MULTI_VOTES} places` : "it's one pick each now. Anyone who picked more keeps their latest";
    await store.addMessage({ planId: view.plan.id, memberId: null, kind: "system", body: `${view.me!.display_name.split(" ")[0]} changed the vote: ${note}.` });
  }
  revalidatePath(`/p/${slug}`);
  revalidatePath(`/p/${slug}/chat`);
  revalidatePath(`/p/${slug}/manage`);
  return {};
}

const firstName = (view: NonNullable<Awaited<ReturnType<typeof loadPlan>>>) => view.me!.display_name.split(" ")[0];

/**
 * The organiser already has a place, or changes it: a real business from the map (by place ID),
 * or a place they type in. Locks the plan to it (ending any vote; the options stay on the page
 * as "The vote").
 */
export async function setPlace(slug: string, pick: string | CustomPlace): Promise<{ error?: string }> {
  const view = await loadPlan(slug);
  if (!view?.isHost) return { error: "Only hosts can change the plan." };
  const { plan } = view;
  if (plan.status !== "voting" && plan.status !== "locked") return { error: "This plan's finished, so it can't be changed." };
  let venue: { name: string; placeId: string | null; address: string | null };
  if (typeof pick === "string") {
    const place = await getPlace(pick);
    if (!place) return { error: "Couldn't find that place. Pick one from the map." };
    venue = { name: place.name, placeId: place.placeId, address: null };
  } else {
    const custom = cleanCustomPlace(pick.name, pick.address);
    if (!custom) return { error: "Give the place a name." };
    venue = { name: custom.name, placeId: null, address: custom.address };
  }
  const same = plan.status === "locked" && plan.venue_name === venue.name && plan.venue_place_id === venue.placeId && (plan.venue_address ?? null) === venue.address;
  if (same) return {};
  const note = plan.status === "voting" ? `No vote needed: it's ${venue.name}.` : `Now at ${venue.name}.`;
  await store.updatePlan(plan.id, {
    status: "locked",
    venue_name: venue.name,
    venue_place_id: venue.placeId,
    venue_address: venue.address,
    vote_deadline: null,
    version: plan.version + 1,
    updated_note: note,
  });
  await store.addMessage({ planId: plan.id, memberId: null, kind: "system", body: `${firstName(view)} picked the place: ${venue.name}.` });
  revalidatePath(`/p/${slug}`);
  revalidatePath(`/p/${slug}/manage`);
  return {};
}

/**
 * Back to a vote: the plan reopens for 24 hours and the current place goes on the list,
 * so it's still in the running. Not once bills have started.
 */
export async function openVote(slug: string): Promise<{ error?: string }> {
  const view = await loadPlan(slug);
  if (!view?.isHost) return { error: "Only hosts can change the plan." };
  const { plan } = view;
  if (plan.status !== "locked") return {};
  if ((await store.listBills(plan.id)).length > 0) return { error: "Bills have started, so the place is staying put." };
  const options = await store.listOptions(plan.id);
  if (plan.venue_name && !options.some((o) => (plan.venue_place_id && o.place_id === plan.venue_place_id) || o.label === plan.venue_name)) {
    const place = plan.venue_place_id ? await getPlace(plan.venue_place_id) : null;
    await store.addOption({ planId: plan.id, label: plan.venue_name, placeId: plan.venue_place_id, note: place?.address ?? plan.venue_address ?? null, addedBy: view.me!.id });
  }
  await store.updatePlan(plan.id, {
    status: "voting",
    venue_name: null,
    venue_place_id: null,
    venue_address: null,
    vote_deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    version: plan.version + 1,
    updated_note: "Back to a vote. Pick your favourite.",
  });
  await store.addMessage({ planId: plan.id, memberId: null, kind: "system", body: `${firstName(view)} put the place to a vote.` });
  revalidatePath(`/p/${slug}`);
  revalidatePath(`/p/${slug}/manage`);
  return {};
}

/** Calling it off keeps the page up (it says "Called off") so nobody's left wondering. */
export async function cancelPlan(slug: string): Promise<void> {
  const view = await loadPlan(slug);
  if (!view?.isHost || view.plan.status === "cancelled" || view.plan.status === "wrapped") return;
  const who = view.me!.display_name.split(" ")[0];
  await store.updatePlan(view.plan.id, { status: "cancelled", version: view.plan.version + 1, updated_note: `${who} called this one off.` });
  await store.addMessage({ planId: view.plan.id, memberId: null, kind: "system", body: `${who} called this one off.` });
  revalidatePath(`/p/${slug}`);
  redirect(`/p/${slug}`);
}

/** The organiser (or a co-host) sets how chatty Dibby's automatic messages are on this plan. */
export async function setDibbyVolume(slug: string, volume: DibbyVolume): Promise<void> {
  const view = await loadPlan(slug);
  if (!view?.isHost || !["quiet", "normal", "loud"].includes(volume)) return;
  await store.updatePlan(view.plan.id, { dibby_volume: volume });
  revalidatePath(`/p/${slug}`);
  revalidatePath(`/p/${slug}/manage`);
}

/** Hosts switch the plan's vibe. Dibby's templated messages re-render in the new one. */
export async function setVibe(slug: string, vibe: Vibe): Promise<void> {
  const view = await loadPlan(slug);
  if (!view?.isHost || !["chill", "extra", "straight"].includes(vibe)) return;
  await store.updatePlan(view.plan.id, { vibe });
  revalidatePath(`/p/${slug}`);
  revalidatePath(`/p/${slug}/manage`);
}

/**
 * The organiser shares or hands over the running of the plan, from the who's going list.
 * Co-host: runs it alongside you. Hand over: they become the organiser and you stay on as a
 * co-host. Only people going who have the app (a plan's organiser needs an account).
 */
/**
 * A rejoin link for one person on this plan (lib/rejoin.ts), for a host to send them when their
 * browser forgot them. Only for people without an account: they sign in instead.
 */
export async function hostRejoinLink(slug: string, memberId: string): Promise<{ url?: string; error?: string }> {
  const view = await loadPlan(slug);
  if (!view?.isHost) return { error: "Only the hosts can do that." };
  const them = view.members.find((m) => m.id === memberId);
  if (!them || them.id === view.me?.id) return { error: "Couldn't find them on the plan." };
  if (them.user_id) return { error: `${them.display_name.split(" ")[0]} has an account, so they can just sign in.` };
  return { url: memberRejoinUrl(them) };
}

export async function setHost(slug: string, memberId: string, to: "cohost" | "guest" | "organiser"): Promise<Result & { name?: string }> {
  const view = await loadPlan(slug);
  if (!view?.me || view.me.role !== "organiser") return { error: "Only the organiser can do that." };
  const { plan, me } = view;
  if (plan.status === "cancelled" || plan.status === "wrapped") return { error: "This plan's finished, so it can't be changed." };
  const them = view.members.find((m) => m.id === memberId);
  if (!them || them.id === me.id) return { error: "Couldn't find them on the plan." };
  const first = them.display_name.split(" ")[0];
  if (to !== "guest" && (them.rsvp !== "in" || them.waitlisted)) return { error: `${first} needs to be going first.` };
  if (to !== "guest" && !them.user_id) return { error: `${first} needs the app to help run a plan.` };
  const mine = me.display_name.split(" ")[0];

  if (to === "organiser") {
    await store.updateMember(them.id, { role: "organiser" });
    await store.updateMember(me.id, { role: "cohost" });
    await store.updatePlan(plan.id, { organiser_id: them.user_id });
    await store.addMessage({ planId: plan.id, memberId: null, kind: "system", body: `${mine} handed the plan over to ${first}. ${first}'s running it now, with ${mine} as co-host.` });
  } else if (to === "cohost") {
    if (them.role !== "guest") return { name: first };
    await store.updateMember(them.id, { role: "cohost" });
    await store.addMessage({ planId: plan.id, memberId: null, kind: "system", body: `${mine} made ${first} a co-host.` });
  } else {
    if (them.role !== "cohost") return { name: first };
    await store.updateMember(them.id, { role: "guest" });
  }
  revalidatePath(`/p/${slug}`);
  revalidatePath(`/p/${slug}/manage`);
  return { name: first };
}

const MERGE_BLOCKED: Record<NonNullable<ReturnType<typeof mergeBlock>>, (first: string) => string> = {
  same: () => "Pick someone else to merge with.",
  account: (f) => `${f} has an account, so that spot can't be merged away. Merge the other one into it instead.`,
  organiser: () => "The organiser's spot can't be merged away.",
  bill: (f) => `${f} is on a bill on that spot, so it can't be merged without changing the split.`,
  former: () => "That spot isn't anyone any more.",
};

/**
 * The same person on the plan twice (a guest who opened the link in Messenger and then Safari):
 * a host folds the extra spot (`fromId`, a guest) into the one to keep (`intoId`). Their furthest-in
 * answer, votes, times, chat and the rest move across, the extra spot goes, and the chat says so.
 */
export async function mergeMembers(slug: string, fromId: string, intoId: string): Promise<Result & { name?: string }> {
  const view = await editable(slug);
  if (!isView(view)) return view;
  const { plan, members } = view;
  const from = members.find((m) => m.id === fromId);
  const into = members.find((m) => m.id === intoId);
  if (!from || !into) return { error: "Couldn't find them on the plan." };
  const first = into.display_name.split(" ")[0];

  const [votes, times, recap, bills, shares] = await Promise.all([
    store.listVotes(plan.id),
    store.listTimeVotes(plan.id),
    store.listRecap(plan.id),
    store.listBills(plan.id),
    store.listShares(plan.id),
  ]);
  const fromOnBill = bills.some((b) => b.payer_member_id === from.id) || shares.some((s) => s.member_id === from.id);
  const blocked = mergeBlock({ from, into, fromOnBill }, FORMER_MEMBER);
  if (blocked) return { error: MERGE_BLOCKED[blocked](from.display_name.split(" ")[0]) };

  const picks = (id: string) => votes.filter((v) => v.member_id === id).map((v) => v.option_id);
  const ticks = (id: string) => times.filter((t) => t.member_id === id).map((t) => t.time_id);
  const answered = (id: string) => recap.some((a) => a.member_id === id);
  const merge = planMerge({
    from,
    into,
    maxVotes: maxVotes(plan),
    fromVotes: picks(from.id),
    intoVotes: picks(into.id),
    fromTimes: ticks(from.id),
    intoTimes: ticks(into.id),
    fromRecap: answered(from.id),
    intoRecap: answered(into.id),
    fromOnBill,
  });
  await store.mergeMember(plan.id, from.id, into.id, merge);
  await store.addMessage({ planId: plan.id, memberId: null, kind: "system", body: `${view.me!.display_name.split(" ")[0]} merged ${first}'s two spots into one.` });
  // Two going spots became one: someone on the waitlist may move up.
  await fillFromWaitlist(plan);
  revalidatePath(`/p/${slug}`);
  revalidatePath(`/p/${slug}/manage`);
  return { name: first };
}
