import "server-only";

export interface Venue {
  placeId: string | null;
  name: string;
  address: string | null;
  rating: number | null;
  priceLevel: string | null;
}

/**
 * Google Places (New) text search. Field mask keeps it to the cheap fields, and we only
 * store the place ID and name. Returns null when there's no key or the call fails.
 */
export async function searchVenues(query: string, area: string | null, max = 3): Promise<Venue[] | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.shortFormattedAddress,places.rating,places.priceLevel",
      },
      body: JSON.stringify({ textQuery: area ? `${query} in ${area}` : query, regionCode: "AU", pageSize: max }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      places?: { id: string; displayName?: { text: string }; shortFormattedAddress?: string; rating?: number; priceLevel?: string }[];
    };
    return (data.places ?? []).slice(0, max).map((p) => ({
      placeId: p.id,
      name: p.displayName?.text ?? "Somewhere",
      address: p.shortFormattedAddress ?? null,
      rating: p.rating ?? null,
      priceLevel: p.priceLevel ?? null,
    }));
  } catch {
    return null;
  }
}

export const mapsLink = (placeId: string | null, name: string) =>
  placeId
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${placeId}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
