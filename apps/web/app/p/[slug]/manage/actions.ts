"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DibbyVolume, Vibe } from "@dibs/shared/types";
import { store } from "@/lib/store";
import { formatWhen, localToIso } from "@/lib/time";
import { loadPlan } from "@/lib/viewer";
import { getPlace } from "@/lib/places";

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
  // Before it's locked, this is the area for the vote. The venue itself is picked on the map (setPlace).
  if (plan.status === "voting" && place !== plan.area) {
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

const firstName = (view: NonNullable<Awaited<ReturnType<typeof loadPlan>>>) => view.me!.display_name.split(" ")[0];

/**
 * The organiser already has a place, or changes it: a real business from the map. Locks the
 * plan to it (ending any vote; the options stay on the page as "The vote").
 */
export async function setPlace(slug: string, placeId: string): Promise<{ error?: string }> {
  const view = await loadPlan(slug);
  if (!view?.isHost) return { error: "Only hosts can change the plan." };
  const { plan } = view;
  if (plan.status !== "voting" && plan.status !== "locked") return { error: "This plan's finished, so it can't be changed." };
  const place = await getPlace(placeId);
  if (!place) return { error: "Couldn't find that place. Pick one from the map." };
  if (plan.status === "locked" && plan.venue_place_id === place.placeId) return {};
  const note = plan.status === "voting" ? `No vote needed: it's ${place.name}.` : `Now at ${place.name}.`;
  await store.updatePlan(plan.id, {
    status: "locked",
    venue_name: place.name,
    venue_place_id: place.placeId,
    vote_deadline: null,
    version: plan.version + 1,
    updated_note: note,
  });
  await store.addMessage({ planId: plan.id, memberId: null, kind: "system", body: `${firstName(view)} picked the place: ${place.name}.` });
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
    await store.addOption({ planId: plan.id, label: plan.venue_name, placeId: plan.venue_place_id, note: place?.address ?? null, addedBy: view.me!.id });
  }
  await store.updatePlan(plan.id, {
    status: "voting",
    venue_name: null,
    venue_place_id: null,
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
