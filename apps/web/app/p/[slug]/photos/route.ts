import { revalidatePath } from "next/cache";
import { extraOn } from "@dibs/shared/plans";
import { canAddPhotos, cleanGlow, MAX_PHOTOS } from "@dibs/shared/photos";
import { store } from "@/lib/store";
import { loadPlan } from "@/lib/viewer";
import { report } from "@/lib/report";
import { personKey } from "@dibs/shared/moderation";
import { BANNED_NOTE, isBanned } from "@/lib/moderation";

/** Phones shrink and re-encode before sending, so a real shot is well under this. */
const MAX_BYTES = 4 * 1024 * 1024;
const err = (status: number, error: string) => Response.json({ error }, { status });

/**
 * Take a photo with the Dibby camera: a JPEG the phone has already shrunk and re-encoded (which also
 * drops the GPS and other details in the original). Three each, people who were there.
 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const view = await loadPlan(slug);
  if (!view?.me) return err(403, "Join the plan first.");
  const { plan, me } = view;
  if (await isBanned(personKey(me), plan.id)) return err(403, BANNED_NOTE);
  if (!extraOn(plan, "photos")) return err(403, "Pics are switched off for this plan.");
  if (!canAddPhotos(plan, me, new Date())) return err(403, plan.status === "wrapped" ? "Photos are for people who came." : "The camera opens when the plan starts.");
  const mine = (await store.listPhotos(plan.id)).filter((p) => p.member_id === me.id);
  if (mine.length >= MAX_PHOTOS) return err(409, `That's your ${MAX_PHOTOS} shots.`);

  const form = await req.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof Blob) || file.size === 0) return err(400, "No photo came through. Try again.");
  if (file.size > MAX_BYTES) return err(413, "That photo's too big. Try again.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  // JPEG only: starts FF D8 FF. The phone always sends one; anything else is refused.
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return err(415, "That doesn't look like a photo.");
  const num = (k: string) => {
    const n = Number(form?.get(k));
    return Number.isFinite(n) && n > 0 && n < 10000 ? Math.round(n) : null;
  };

  try {
    await store.addPhoto({ planId: plan.id, memberId: me.id, bytes, width: num("width"), height: num("height"), glow: cleanGlow(form?.get("glow")) });
  } catch (e) {
    report("photo upload", e);
    return err(500, "Couldn't save that one. Try again.");
  }
  revalidatePath(`/p/${slug}`);
  revalidatePath(`/p/${slug}/recap`);
  return Response.json({ left: MAX_PHOTOS - mine.length - 1 });
}
