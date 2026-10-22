"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DibbyVolume } from "@dibs/shared/types";
import { store } from "@/lib/store";
import { formatWhen, localToIso } from "@/lib/time";
import { loadPlan } from "@/lib/viewer";

export type FormState = { error?: string } | undefined;
const clean = (v: FormDataEntryValue | null, max = 80) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * Hosts change the name, time or place. Each change bumps the plan's version, so the
 * next WhatsApp share gets a fresh preview card, and leaves an "Updated" note on the page.
 */
export async function updateDetails(slug: string, _prev: FormState, form: FormData): Promise<FormState> {
  const view = await loadPlan(slug);
  if (!view?.isHost) return { error: "Only hosts can change the plan." };
  const { plan } = view;
  if (plan.status === "cancelled" || plan.status === "wrapped") return { error: "This plan's finished, so it can't be changed." };

  const title = clean(form.get("title")) || plan.title;
  const whenRaw = clean(form.get("starts_at"), 16);
  const startsAt = whenRaw ? localToIso(whenRaw) : null;
  if (whenRaw && !startsAt) return { error: "That date and time doesn't look right." };
  const place = clean(form.get("place")) || null;

  const changes: string[] = [];
  const patch: Parameters<typeof store.updatePlan>[1] = {};
  if (title !== plan.title) {
    patch.title = title;
    changes.push(`now called ${title}`);
  }
  if ((startsAt ?? null) !== (plan.starts_at ?? null) && !(startsAt && plan.starts_at && Date.parse(startsAt) === Date.parse(plan.starts_at))) {
    patch.starts_at = startsAt;
    changes.push(startsAt ? `moved to ${formatWhen(startsAt)}` : "time to be decided");
  }
  // Once locked, the place is the venue; before that it's the area for the vote.
  if (plan.status === "locked") {
    if (place !== plan.venue_name) {
      patch.venue_name = place;
      patch.venue_place_id = null;
      changes.push(place ? `now at ${place}` : "place to be decided");
    }
  } else if (place !== plan.area) {
    patch.area = place;
    changes.push(place ? `now around ${place}` : "area to be decided");
  }

  if (changes.length === 0) redirect(`/p/${slug}`);
  const note = changes.join(", ").replace(/^./, (c) => c.toUpperCase()) + ".";
  await store.updatePlan(plan.id, { ...patch, version: plan.version + 1, updated_note: note });
  await store.addMessage({ planId: plan.id, memberId: null, kind: "system", body: `${view.me!.display_name.split(" ")[0]} updated the plan: ${note}` });
  revalidatePath(`/p/${slug}`);
  redirect(`/p/${slug}?updated=1`);
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
