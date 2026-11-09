import "server-only";
import { canAddPhotos, canSeePhotos, MAX_PHOTOS, photosRevealed } from "@dibs/shared/photos";
import type { Plan, PlanMember } from "@dibs/shared/types";
import { personKey } from "@dibs/shared/moderation";
import { screenFor } from "@/lib/moderation";
import { store } from "@/lib/store";
import { formatStamp } from "@/lib/time";
import type { RollPhoto } from "@/app/p/[slug]/PhotoRoll";

/** Everything the camera card and photo roll need, for one viewer. Null when they can't see it. */
export async function loadRoll(plan: Plan, members: PlanMember[], me: PlanMember | null) {
  if (!me || !canSeePhotos(plan, me)) return null;
  const all = await store.listPhotos(plan.id);
  const screen = await screenFor(personKey(me));
  const byId = new Map(members.map((m) => [m.id, m]));
  const photos: RollPhoto[] = all.flatMap((p) => {
    const who = byId.get(p.member_id);
    if (!who) return [];
    // Blocked people and photos you've reported drop out of your roll.
    if (screen.reported.has(p.id) || screen.blocked.has(personKey(who) ?? "")) return [];
    return [{ id: p.id, name: p.member_id === me.id ? "You" : who.display_name.split(" ")[0] ?? who.display_name, colour: who.colour, mine: p.member_id === me.id, stamp: formatStamp(p.created_at), width: p.width, height: p.height, glow: p.glow }];
  });
  return {
    photos,
    taken: all.filter((p) => p.member_id === me.id).length,
    max: MAX_PHOTOS,
    canAdd: canAddPhotos(plan, me, new Date()),
    revealed: photosRevealed(plan),
  };
}
