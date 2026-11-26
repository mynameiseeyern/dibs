import "server-only";
import { revalidatePath } from "next/cache";
import type { PlanMember } from "@dibs/shared/types";
import { store } from "./store";
import { localToIso } from "./time";
import { getPlace } from "./places";
import { withPlaces } from "./place-ids";
import { DIBBY_HEADS_UP } from "./thread-links";
import type { PendingPlan } from "./dibby-card";

/**
 * A new plan Dibby drafted from a thread, made once the asker taps Set it up (ARV-59): the asker
 * organises it, everyone else from the current plan is invited without an RSVP, and the vote
 * opens on Dibby's venues. Venues are looked up again by place ID (we only keep the ID), and
 * one that's closed or gone since is left off.
 */
export async function makeDrafted(draft: PendingPlan, asker: PlanMember, crew: PlanMember[], ask: string) {
  type V = { name: string; placeId: string | null; address: string | null };
  const venues = (
    await Promise.all(
      draft.venues.map(async (v): Promise<V | null> => {
        if ("name" in v) return { name: v.name.slice(0, 120), placeId: null, address: null };
        const p = await getPlace(v.placeId);
        return p ? { name: p.name, placeId: p.placeId, address: p.address } : null;
      })
    )
  ).filter((v): v is V => Boolean(v));

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
  for (const v of venues) {
    await store.addOption({ planId: plan.id, label: v.name, placeId: v.placeId, note: v.address });
  }
  const members = await store.listMembers(plan.id);
  const organiser = members.find((m) => m.user_id === asker.user_id) ?? null;
  if (ask) await store.addMessage({ planId: plan.id, memberId: organiser?.id ?? null, kind: "text", body: ask, mentionsDibby: true });
  await store.addMessage({ planId: plan.id, memberId: null, kind: "system", body: DIBBY_HEADS_UP });
  const tail = venues.length ? "Vote's open for 24 hours." : "Couldn't find spots for that on Maps, so add a few from the map and the vote opens.";
  await store.addMessage({
    planId: plan.id,
    memberId: null,
    kind: "dibby",
    body: `${draft.reply} ${tail}`.trim(),
    template: withPlaces(null, venues.map((v) => v.placeId)),
  });
  revalidatePath(`/p/${plan.slug}`);
  return plan;
}
