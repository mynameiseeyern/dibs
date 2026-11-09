"use server";

import { revalidatePath } from "next/cache";
import { canDeleteMessage, canEject, isReportKind, isReportReason, personKey, type ReportKind } from "@dibs/shared/moderation";
import { fileReport } from "@/lib/moderation";
import { store } from "@/lib/store";
import { loadPlan } from "@/lib/viewer";

type Result = { error?: string };
const TRY_AGAIN = "Couldn't do that just then. Try again, or email hello@dibby.social.";

function revalidate(slug: string) {
  revalidatePath(`/p/${slug}`);
  revalidatePath(`/p/${slug}/chat`);
  revalidatePath(`/p/${slug}/recap`);
}

/** The person looking: their spot on the plan, or the account or guest pass on this browser. */
function viewerOf(view: NonNullable<Awaited<ReturnType<typeof loadPlan>>>): string | null {
  if (view.me) return personKey(view.me);
  if (view.organiser) return `u:${view.organiser.id}`;
  return view.guest ? `g:${view.guest.id}` : null;
}

/** What's being reported, as it reads right now, and whose it is. Null if it isn't on this plan. */
async function describe(view: NonNullable<Awaited<ReturnType<typeof loadPlan>>>, kind: ReportKind, targetId: string) {
  const memberPerson = (id: string | null) => {
    const m = view.members.find((x) => x.id === id);
    return m ? personKey(m) : null;
  };
  if (kind === "plan") {
    const host = view.members.find((m) => m.role === "organiser");
    return { snapshot: [view.plan.title, view.plan.description].filter(Boolean).join(": "), person: host ? personKey(host) : null };
  }
  if (kind === "member") {
    const m = view.members.find((x) => x.id === targetId);
    return m ? { snapshot: m.display_name, person: personKey(m) } : null;
  }
  if (kind === "photo") {
    const p = (await store.listPhotos(view.plan.id)).find((x) => x.id === targetId);
    return p ? { snapshot: "A photo", person: memberPerson(p.member_id) } : null;
  }
  const msg = (await store.listMessages(view.plan.id, 500)).find((x) => x.id === targetId);
  return msg ? { snapshot: msg.body, person: memberPerson(msg.member_id) } : null;
}

/** Anyone holding the plan can report it or anything on it. It's hidden for them straight away. */
export async function reportThing(slug: string, kind: string, targetId: string, reason: string, note: string): Promise<Result> {
  const view = await loadPlan(slug);
  if (!view) return { error: "This plan doesn't exist any more." };
  if (!isReportKind(kind) || !isReportReason(reason)) return { error: TRY_AGAIN };
  const about = await describe(view, kind, targetId);
  if (!about) return { error: "That's already gone." };
  try {
    await fileReport({
      kind,
      planId: view.plan.id,
      targetId,
      targetPerson: about.person,
      reporter: viewerOf(view),
      reason,
      note: note.trim().slice(0, 500) || null,
      snapshot: about.snapshot.slice(0, 2000),
    });
  } catch (e) {
    console.error("[report]", e);
    return { error: TRY_AGAIN };
  }
  revalidate(slug);
  return {};
}

/** You stop seeing them, on every plan. Tells us too, so a pattern shows up in the queue. */
export async function blockMember(slug: string, memberId: string): Promise<Result> {
  const view = await loadPlan(slug);
  const me = view ? viewerOf(view) : null;
  if (!view || !me) return { error: "Join the plan first." };
  const them = view.members.find((m) => m.id === memberId);
  const person = them ? personKey(them) : null;
  if (!them || !person) return { error: "They've already left." };
  if (person === me) return { error: "That's you." };
  try {
    await store.addBlock(me, person, them.display_name);
    await fileReport({ kind: "member", planId: view.plan.id, targetId: null, targetPerson: person, reporter: me, reason: "other", note: "Blocked by someone on the plan", snapshot: them.display_name });
  } catch (e) {
    console.error("[block]", e);
    return { error: TRY_AGAIN };
  }
  revalidate(slug);
  return {};
}

export async function unblockPerson(person: string): Promise<Result> {
  const { whoIsHere } = await import("@/lib/viewer");
  const here = await whoIsHere();
  const me = here.organiser ? `u:${here.organiser.id}` : here.guest ? `g:${here.guest.id}` : null;
  if (!me) return { error: "Sign in first." };
  await store.removeBlock(me, person);
  revalidatePath("/account");
  return {};
}

/** Your own message, or anyone's if you're running the plan. */
export async function deleteMessage(slug: string, messageId: string): Promise<Result> {
  const view = await loadPlan(slug);
  if (!view?.me) return { error: "Join the plan first." };
  const msg = (await store.listMessages(view.plan.id, 500)).find((m) => m.id === messageId);
  if (!msg) return {};
  if (!canDeleteMessage(msg, view.me, view.isHost)) return { error: "That's not yours to delete." };
  await store.deleteMessage(view.plan.id, messageId);
  revalidate(slug);
  return {};
}

/** Hosts can take down a photo that shouldn't be on the roll. */
export async function hostRemovePhoto(slug: string, photoId: string): Promise<Result> {
  const view = await loadPlan(slug);
  if (!view?.isHost) return { error: "Only hosts can do that." };
  await store.removePhoto(view.plan.id, photoId);
  revalidate(slug);
  return {};
}

/** Off the plan, messages and photos gone, and they can't join it again. */
export async function removeFromPlan(slug: string, memberId: string): Promise<Result> {
  const view = await loadPlan(slug);
  if (!view?.me) return { error: "Join the plan first." };
  const them = view.members.find((m) => m.id === memberId);
  if (!them) return {};
  if (!canEject(them, view.me, view.isHost)) return { error: "Only hosts can do that." };
  const person = personKey(them);
  try {
    if (person) await store.addBan(person, view.plan.id);
    await store.deleteMessagesBy(them.id);
    await store.ejectMember(them.id);
  } catch (e) {
    console.error("[remove from plan]", e);
    return { error: TRY_AGAIN };
  }
  revalidate(slug);
  return {};
}
