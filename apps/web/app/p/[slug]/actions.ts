"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasRoom, planAccess, READ_ONLY_NOTE } from "@dibs/shared/plans";
import type { PlanMember, Rsvp } from "@dibs/shared/types";
import { BRB, mentionsDibby, replyInThread, type PlanDraft } from "@/lib/dibby";
import { clearGuestSession, createGuestSession } from "@/lib/guest";
import { store } from "@/lib/store";
import { REACTIONS, type Reaction } from "@/lib/store/types";
import { closeVote } from "@/lib/plan-ops";
import { nudgeOnBail } from "@/lib/nudges";
import { loadPlan } from "@/lib/viewer";
import { localToIso } from "@/lib/time";
import { DIBBY_HEADS_UP, planLinkLine } from "@/lib/thread-links";
import { getPlace } from "@/lib/places";

export type FormState = { error?: string } | undefined;

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
      revalidatePath(`/p/${slug}`);
      return undefined;
    }
  }

  const first = clean(form.get("first_name"));
  const last = clean(form.get("last_name"));
  if (!first || !last) return { error: "Pop in your first and last name so the crew knows who you are." };

  // Signed in but never set up to organise (a guest who added their email): join as the account.
  if (view.organiser) {
    await store.addMember({ planId: view.plan.id, userId: view.organiser.id, name: `${first} ${last}`, role: "guest" });
    revalidatePath(`/p/${slug}`);
    return undefined;
  }

  const guest = view.guest ?? (await createGuestSession(first, last));
  await store.addMember({ planId: view.plan.id, guestId: guest.id, name: `${first} ${last}`, role: "guest" });
  revalidatePath(`/p/${slug}`);
  return undefined;
}

export async function setRsvp(slug: string, rsvp: Rsvp, form: FormData): Promise<void> {
  const view = await loadPlan(slug);
  if (!view?.me || view.plan.status === "cancelled" || view.plan.status === "wrapped") return;
  const plusOne = view.plan.plus_ones && form.get("plus_one") === "on";

  let waitlisted = false;
  if (rsvp === "in") {
    const others = view.members.filter((m) => m.id !== view.me!.id);
    // Already holding a spot? Keep it. Otherwise check there's room.
    const holding = view.me.rsvp === "in" && !view.me.waitlisted;
    waitlisted = !holding && !hasRoom(others, view.plan.capacity, plusOne);
  }
  await store.updateMember(view.me.id, { rsvp, plus_one: rsvp === "in" ? plusOne : false, waitlisted });
  // Only people going vote. Stepping back to maybe or can't go, before the plan starts,
  // takes their vote back so it doesn't decide a night they might not come to.
  const started = Boolean(view.plan.starts_at && Date.parse(view.plan.starts_at) <= Date.now());
  if (rsvp !== "in" && view.plan.status === "voting" && !started) await store.removeVote(view.plan.id, view.me.id);
  // Was in, now can't go: Dibby gives the crew a heads-up (respects mute volume and the cap).
  if (rsvp === "out" && view.me.rsvp === "in" && !view.me.waitlisted) await nudgeOnBail(view.plan, view.me);
  revalidatePath(`/p/${slug}`);
}

/** Guest privacy: drop them from this plan and forget their name and device. */
export async function removeMe(slug: string): Promise<void> {
  const view = await loadPlan(slug);
  if (view?.guest && view.me?.guest_id === view.guest.id) {
    await store.removeGuest(view.guest.id);
    await clearGuestSession();
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
    await runDibby(view.plan.id, slug, body, view.me);
  }
  revalidatePath(`/p/${slug}`);
  return undefined;
}

async function runDibby(planId: string, slug: string, ask: string, asker: PlanMember) {
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
      },
      ask
    );
    const existing = new Set(options.map((o) => o.label.toLowerCase()));
    for (const v of out.addOptions) {
      if (!existing.has(v.name.toLowerCase())) await store.addOption({ planId, label: v.name, placeId: v.placeId, note: v.address });
    }
    let body = out.reply;
    if (out.newPlan && asker.user_id) {
      const created = await createFromThread(out.newPlan, asker, view.members, ask);
      body = `${out.reply}\n${planLinkLine(created.slug)}`;
    }
    await store.addMessage({ planId, memberId: null, kind: "dibby", body });
  } catch (e) {
    console.error("[dibby]", e);
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
  await store.addMessage({ planId: plan.id, memberId: null, kind: "dibby", body: `${draft.reply} ${tail}` });
  revalidatePath(`/p/${plan.slug}`);
  return plan;
}

/** Hide or show Dibby's automatic nudges for yourself. Replies to tags always show. */
export async function toggleDibbyMute(slug: string): Promise<void> {
  const view = await loadPlan(slug);
  if (!view?.me) return;
  await store.updateMember(view.me.id, { dibby_muted: !view.me.dibby_muted });
  revalidatePath(`/p/${slug}`);
}

/** React to a message in the thread. Signed-in members only, like posting. */
export async function toggleReaction(slug: string, messageId: string, emoji: string): Promise<void> {
  const view = await loadPlan(slug);
  if (!view?.me?.user_id || !(REACTIONS as readonly string[]).includes(emoji) || blocked(view)) return;
  const messages = await store.listMessages(view.plan.id, 200);
  if (!messages.some((m) => m.id === messageId)) return;
  await store.toggleReaction({ planId: view.plan.id, message_id: messageId, member_id: view.me.id, emoji: emoji as Reaction["emoji"] });
  revalidatePath(`/p/${slug}`);
}

// ---------- Voting ----------

export async function vote(slug: string, optionId: string): Promise<void> {
  const view = await loadPlan(slug);
  if (!view?.me || view.plan.status !== "voting" || blocked(view)) return;
  const options = await store.listOptions(view.plan.id);
  if (!options.some((o) => o.id === optionId)) return;
  await store.castVote(view.plan.id, optionId, view.me.id);
  revalidatePath(`/p/${slug}`);
}

/** Anyone on the plan adds a place to the vote. It has to be a real, open business from the map picker. */
export async function addOption(slug: string, _prev: FormState, form: FormData): Promise<FormState> {
  const view = await loadPlan(slug);
  if (!view?.me || view.plan.status !== "voting") return { error: "Voting's closed." };
  const no = blocked(view);
  if (no) return { error: no };
  const options = await store.listOptions(view.plan.id);
  if (options.length >= 8) return { error: "That's plenty of options. Time to vote." };
  const place = await getPlace(String(form.get("place_id") ?? ""));
  if (!place) return { error: "Couldn't find that place. Pick one from the map." };
  if (options.some((o) => o.place_id === place.placeId || o.label.toLowerCase() === place.name.toLowerCase())) return { error: "That one's already on the list." };
  await store.addOption({ planId: view.plan.id, label: place.name, placeId: place.placeId, note: place.address, addedBy: view.me.id });
  revalidatePath(`/p/${slug}`);
  return undefined;
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
  revalidatePath(`/p/${slug}`);
  return { label: option.label };
}

/** Host locks the plan to the winning option. A tie is settled by a seeded spin. */
export async function lockPlan(slug: string): Promise<void> {
  const view = await loadPlan(slug);
  if (!view?.isHost) return;
  await closeVote(view.plan, "host");
  revalidatePath(`/p/${slug}`);
}
