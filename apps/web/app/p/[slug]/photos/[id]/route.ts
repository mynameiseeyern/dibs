import { canSeePhotos, photosRevealed } from "@dibs/shared/photos";
import { store } from "@/lib/store";
import { loadPlan } from "@/lib/viewer";

/**
 * One photo, only for people who can see the roll, and only once it's developed (at wrap-up).
 * Served by the app, never from a public URL. ?download=1 saves it.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const view = await loadPlan(slug);
  const none = () => new Response("Not found", { status: 404 });
  if (!view?.me || !canSeePhotos(view.plan, view.me) || !photosRevealed(view.plan)) return none();
  const photo = (await store.listPhotos(view.plan.id)).find((p) => p.id === id);
  if (!photo) return none();
  const bytes = await store.photoBytes(photo);
  if (!bytes) return none();
  const download = new URL(req.url).searchParams.has("download");
  const name = `${view.plan.title.replace(/[^\w -]/g, "").trim() || "dibby"} ${photo.id.slice(0, 6)}.jpg`;
  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": "image/jpeg",
      // Private to this person's browser; never a shared cache.
      "cache-control": "private, max-age=3600",
      "x-content-type-options": "nosniff",
      ...(download ? { "content-disposition": `attachment; filename="${name}"` } : {}),
    },
  });
}
