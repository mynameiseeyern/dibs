"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasRoom } from "@dibs/shared/plans";
import type { PlanMember, Rsvp } from "@dibs/shared/types";
import { BRB, mentionsDibby, replyInThread, type PlanDraft } from "@/lib/dibby";
import { clearGuestSession, createGuestSession } from "@/lib/guest";
import { store } from "@/lib/store";
import { closeVote } from "@/lib/plan-ops";
import { nudgeOnBail } from "@/lib/nudges";
import { loadPlan } from "@/lib/viewer";
import { localToIso } from "@/lib/time";
import { DIBBY_HEADS_UP, planLinkLine } from "@/lib/thread-links";

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

// ---------- Thread ----------

export async function postMessage(slug: string, _prev: FormState, form: FormData): Promise<FormState> {
  const view = await loadPlan(slug);
  if (!view?.me) return { error: "Join the plan to chat." };
  // Guests read the thread; signed-in members post (ARV-46).
  if (!view.me.user_id) return { error: "Get the app to chat in the thread." };
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
  const unchecked = draft.checked ? "" : " (I couldn't check these on Maps, so give them a once-over.)";
  await store.addMessage({ planId: plan.id, memberId: null, kind: "dibby", body: `${draft.reply}${unchecked} Vote's open for 24 hours.` });
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

// ---------- Voting ----------

export async function vote(slug: string, optionId: string): Promise<void> {
  const view = await loadPlan(slug);
  if (!view?.me || view.plan.status !== "voting") return;
  const options = await store.listOptions(view.plan.id);
  if (!options.some((o) => o.id === optionId)) return;
  await store.castVote(view.plan.id, optionId, view.me.id);
  revalidatePath(`/p/${slug}`);
}

export async function addOption(slug: string, _prev: FormState, form: FormData): Promise<FormState> {
  const view = await loadPlan(slug);
  if (!view?.me || view.plan.status !== "voting") return { error: "Voting's closed." };
  const label = String(form.get("label") ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (!label) return { error: "Type a place or idea." };
  const options = await store.listOptions(view.plan.id);
  if (options.length >= 8) return { error: "That's plenty of options. Time to vote." };
  if (options.some((o) => o.label.toLowerCase() === label.toLowerCase())) return { error: "That one's already on the list." };
  await store.addOption({ planId: view.plan.id, label, addedBy: view.me.id });
  revalidatePath(`/p/${slug}`);
  return undefined;
}

/** Host locks the plan to the winning option. A tie is settled by a seeded spin. */
export async function lockPlan(slug: string): Promise<void> {
  const view = await loadPlan(slug);
  if (!view?.isHost) return;
  await closeVote(view.plan, "host");
  revalidatePath(`/p/${slug}`);
}
