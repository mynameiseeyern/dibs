"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasRoom } from "@dibs/shared/plans";
import type { Rsvp } from "@dibs/shared/types";
import { clearGuestSession, createGuestSession } from "@/lib/guest";
import { store } from "@/lib/store";
import { loadPlan } from "@/lib/viewer";

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
