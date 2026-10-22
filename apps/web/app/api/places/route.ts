import { NextResponse, type NextRequest } from "next/server";
import { currentOrganiser } from "@/lib/auth";
import { currentGuest } from "@/lib/guest";
import { searchPlaces } from "@/lib/places";

export const dynamic = "force-dynamic";

/**
 * Search for the map picker. Only for someone signed in or with a guest session on this
 * browser, so it isn't an open proxy to the Places API.
 */
export async function GET(req: NextRequest) {
  const [organiser, guest] = await Promise.all([currentOrganiser(), currentGuest()]);
  if (!organiser && !guest) return NextResponse.json({ error: "Join the plan first." }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  const near = sp.has("lat") && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
  const places = await searchPlaces(sp.get("q") ?? "", near, sp.get("area")?.slice(0, 80) ?? null);
  if (!places) return NextResponse.json({ error: "Place search isn't set up yet." }, { status: 503 });
  return NextResponse.json({ places }, { headers: { "Cache-Control": "private, max-age=60" } });
}
