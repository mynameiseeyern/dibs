"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DibbyVolume, Vibe } from "@dibs/shared/types";
import { store } from "@/lib/store";
import { formatWhen, localToIso } from "@/lib/time";
import { loadPlan } from "@/lib/viewer";
import { getPlace } from "@/lib/places";
import { countIn } from "@dibs/shared/plans";

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

/** How many spots (2 to 20). Never fewer than are already going; lowering it doesn't bump anyone. */
export async function setCapacity(slug: string, n: number): Promise<Result> {
  const view = await editable(slug);
  if (!isView(view)) return view;
  if (!Number.isInteger(n) || n < 2 || n > 20) return { error: "Spots can be anywhere from 2 to 20." };
  const going = countIn(view.members);
  if (n < going) return { error: `${going} are already going, so it can't be fewer than that.` };
  if (n === view.plan.capacity) return {};
  await store.updatePlan(view.plan.id, { capacity: n });
  revalidatePath(`/p/${slug}`);
  revalidatePath(`/p/${slug}/manage`);
  return {};
}

export async function setPlusOnes(slug: string, on: boolean): Promise<Result> {
  const view = await editable(slug);
  if (!isView(view)) return view;
  if (on === view.plan.plus_ones) return {};
  await announce(slug, view, { plus_ones: on }, on ? "Plus-ones welcome." : "No plus-ones this time.");
  return {};
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
