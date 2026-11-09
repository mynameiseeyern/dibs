import { isAdmin } from "@/lib/admin-access";
import { store } from "@/lib/store";

/** A reported photo, for the queue only. Plan members get theirs through /p/<slug>/photos. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const none = () => new Response("Not found", { status: 404 });
  if (!(await isAdmin())) return none();
  const r = await store.getReport((await params).id);
  if (r?.kind !== "photo" || !r.plan_id || !r.target_id) return none();
  const photo = (await store.listPhotos(r.plan_id)).find((p) => p.id === r.target_id);
  const bytes = photo ? await store.photoBytes(photo) : null;
  if (!bytes) return none();
  return new Response(Buffer.from(bytes), { headers: { "content-type": "image/jpeg", "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}
