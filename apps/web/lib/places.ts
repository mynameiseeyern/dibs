import "server-only";

export interface Venue {
  placeId: string | null;
  name: string;
  address: string | null;
  rating: number | null;
  priceLevel: string | null;
}

/**
 * Venues for Dibby: the same search as the picker (demo places without a key, open businesses
 * only), trimmed to `max`. Null when search is unavailable.
 */
export async function searchVenues(query: string, area: string | null, max = 3, near: { lat: number; lng: number } | null = null): Promise<Venue[] | null> {
  const found = await searchPlaces(query, area ? null : near, area);
  return found ? found.slice(0, max).map((p) => ({ placeId: p.placeId, name: p.name, address: p.address, rating: p.rating, priceLevel: null })) : null;
}

/** A business picked on the map. `placeId` is Google's (or "demo:…" in local demo mode). */
export interface Place {
  placeId: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  rating: number | null;
  kind: string | null;
}

type ApiPlace = {
  id: string;
  displayName?: { text: string };
  shortFormattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  businessStatus?: string;
  primaryTypeDisplayName?: { text: string };
};

const toPlace = (p: ApiPlace): Place | null =>
  p.location
    ? {
        placeId: p.id,
        name: p.displayName?.text ?? "Somewhere",
        address: p.shortFormattedAddress ?? null,
        lat: p.location.latitude,
        lng: p.location.longitude,
        rating: p.rating ?? null,
        kind: p.primaryTypeDisplayName?.text ?? null,
      }
    : null;

const PLACE_FIELDS = "id,displayName,shortFormattedAddress,location,rating,businessStatus,primaryTypeDisplayName";

/** No key and not in production: the picker runs on a few made-up Sydney spots so local dev works. */
const demoMode = () => !process.env.GOOGLE_PLACES_API_KEY && process.env.NODE_ENV !== "production";

const DEMO_PLACES: Place[] = [
  { placeId: "demo:mamak", name: "Mamak Haymarket", address: "15 Goulburn St, Haymarket", lat: -33.8786, lng: 151.2055, rating: 4.3, kind: "Malaysian restaurant" },
  { placeId: "demo:din-tai-fung", name: "Din Tai Fung World Square", address: "644 George St, Sydney", lat: -33.8766, lng: 151.2073, rating: 4.4, kind: "Taiwanese restaurant" },
  { placeId: "demo:chat-thai", name: "Chat Thai", address: "20 Campbell St, Haymarket", lat: -33.8799, lng: 151.2048, rating: 4.2, kind: "Thai restaurant" },
  { placeId: "demo:spice-alley", name: "Spice Alley", address: "18-20 Kensington St, Chippendale", lat: -33.8851, lng: 151.1983, rating: 4.4, kind: "Food court" },
  { placeId: "demo:the-glenmore", name: "The Glenmore Hotel", address: "96 Cumberland St, The Rocks", lat: -33.8601, lng: 151.2071, rating: 4.3, kind: "Pub" },
  { placeId: "demo:strike-bowling", name: "Strike Bowling Darling Harbour", address: "22 The Promenade, Sydney", lat: -33.8664, lng: 151.2019, rating: 4.1, kind: "Bowling alley" },
  { placeId: "demo:bills-surry-hills", name: "bills Surry Hills", address: "359 Crown St, Surry Hills", lat: -33.8849, lng: 151.2135, rating: 4.2, kind: "Cafe" },
  { placeId: "demo:porteno", name: "Porteño", address: "50 Holt St, Surry Hills", lat: -33.8862, lng: 151.2093, rating: 4.5, kind: "Argentinian restaurant" },
  { placeId: "demo:golden-age", name: "Golden Age Cinema & Bar", address: "80 Commonwealth St, Surry Hills", lat: -33.8806, lng: 151.2104, rating: 4.7, kind: "Cinema" },
  { placeId: "demo:bondi-icebergs", name: "Bondi Icebergs Club", address: "1 Notts Ave, Bondi Beach", lat: -33.8949, lng: 151.2744, rating: 4.4, kind: "Bar" },
];

/**
 * Text search for the map picker. Biased to a point (the map centre) when given, otherwise
 * to an area name. Only open businesses with a location come back. Null when search isn't set up
 * or the call fails, so the picker can say so.
 */
export async function searchPlaces(query: string, near: { lat: number; lng: number } | null, area: string | null): Promise<Place[] | null> {
  const q = query.trim().slice(0, 120);
  if (!q) return [];
  if (demoMode()) {
    const words = q.toLowerCase().split(/\s+/);
    const hits = DEMO_PLACES.filter((p) => words.some((w) => `${p.name} ${p.address} ${p.kind}`.toLowerCase().includes(w)));
    return hits.length ? hits : DEMO_PLACES.slice(0, 6);
  }
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": PLACE_FIELDS.split(",").map((f) => `places.${f}`).join(",") },
      body: JSON.stringify({
        textQuery: !near && area ? `${q} in ${area}` : q,
        // Only a fully open search leans Australian; a named place or where you are decides otherwise.
        ...(near || area ? {} : { regionCode: "AU" }),
        pageSize: 8,
        ...(near ? { locationBias: { circle: { center: { latitude: near.lat, longitude: near.lng }, radius: 8000 } } } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { places?: ApiPlace[] };
    return (data.places ?? [])
      .filter((p) => !p.businessStatus || p.businessStatus === "OPERATIONAL")
      .map(toPlace)
      .filter((p): p is Place => p !== null);
  } catch {
    return null;
  }
}

/**
 * Checks a place ID from the picker is a real, open business and returns its name and address
 * from Google, so nothing typed or tampered with in the browser ends up on a plan.
 */
export async function getPlace(placeId: string): Promise<Place | null> {
  if (!/^[\w:-]{1,300}$/.test(placeId)) return null;
  if (placeId.startsWith("demo:")) return demoMode() ? (DEMO_PLACES.find((p) => p.placeId === placeId) ?? null) : null;
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?regionCode=AU`, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": PLACE_FIELDS },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const p = (await res.json()) as ApiPlace;
    if (p.businessStatus && p.businessStatus !== "OPERATIONAL") return null;
    return toPlace(p);
  } catch {
    return null;
  }
}

export const mapsLink = (placeId: string | null, name: string) =>
  placeId
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${placeId}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
