import type { NextRequest } from "next/server";
import type { PlaceInfo } from "@dibs/shared/api";
import { apiError, apiGuest, apiJson, apiOrganiser } from "@/lib/api-auth";
import { placeCard } from "@/lib/places";
import { checkPlacesPass } from "@/lib/places-pass";

export const dynamic = "force-dynamic";

/**
 * `GET /api/v1/places/:id`: one business's card for the app (photo, stars, price, open now), its
 * version of the web's Places UI Kit card. Each call is billed by Google, so the app loads cards
 * as they scroll into view and keeps them for the session. → `PlaceInfo`.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [organiser, guest] = await Promise.all([apiOrganiser(req), apiGuest(req)]);
  if (!organiser && !guest && !checkPlacesPass(req.nextUrl.searchParams.get("pass"))) return apiError("Make or join a plan first.", 401);
  // ?full=1: the place sheet, everything the web's Google panel shows. Only when it's opened.
  const full = req.nextUrl.searchParams.get("full") === "1";
  const card = await placeCard(id, { full });
  if (!card) return apiError("Couldn't load that place.", 404);
  const info: PlaceInfo = {
    place_id: card.placeId,
    name: card.name,
    address: card.address,
    kind: card.kind,
    rating: card.rating,
    ratings: card.ratings,
    price: card.price,
    open_now: card.openNow,
    photo: card.photo,
    maps_url: card.mapsUrl,
    ...(card.full ?? {}),
  };
  return apiJson(info, 200);
}
