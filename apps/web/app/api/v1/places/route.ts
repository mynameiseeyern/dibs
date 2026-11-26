import type { NextRequest } from "next/server";
import type { PlaceHit } from "@dibs/shared/api";
import { apiError, apiGuest, apiJson, apiOrganiser } from "@/lib/api-auth";
import { searchPlaces } from "@/lib/places";
import { checkPlacesPass } from "@/lib/places-pass";

export const dynamic = "force-dynamic";

/**
 * `GET /api/v1/places?q=thai` (plus `lat`/`lng` or `area`): businesses for the app's place picker,
 * the same search as the web's map picker (`/api/places`). Signed in, holding a guest pass, or
 * with a pass from `GET /api/v1/places/pass` (someone making their first plan), so it isn't an
 * open proxy to the Places API. → `{ places: PlaceHit[] }`.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const [organiser, guest] = await Promise.all([apiOrganiser(req), apiGuest(req)]);
  if (!organiser && !guest && !checkPlacesPass(sp.get("pass"))) return apiError("Make or join a plan first.", 401);
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  const near = sp.has("lat") && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
  const found = await searchPlaces(sp.get("q") ?? "", near, sp.get("area")?.slice(0, 80) ?? null);
  if (!found) return apiError("Place search isn't working just now. Type it in instead.", 503);
  const places: PlaceHit[] = found.map((p) => ({ place_id: p.placeId, name: p.name, address: p.address, kind: p.kind, rating: p.rating }));
  return apiJson({ places });
}
