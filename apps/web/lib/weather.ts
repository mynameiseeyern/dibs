import "server-only";

/**
 * Estimated weather for a plan: where it is (the locked venue, else the area) and when
 * it starts. Open-Meteo, no key. Forecasts reach about 16 days out; beyond that, or in
 * the past, there's nothing to say. Any failure returns null so the plan page never breaks.
 */

export type Forecast =
  | { kind: "forecast"; label: string; icon: string; tempC: number; rainChance: number | null }
  | { kind: "too-far"; daysOut: number };

const OPEN_METEO = process.env.WEATHER_BASE_URL ?? "https://api.open-meteo.com";
const GEOCODE = process.env.GEOCODE_BASE_URL ?? "https://geocoding-api.open-meteo.com";
const FORECAST_DAYS = 16;

type Point = { lat: number; lng: number };
// Places don't move. Kept per server instance so we don't pay for the same lookup twice.
const points = new Map<string, Point | null>();

async function placeLocation(placeId: string): Promise<Point | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "location" },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) return null;
  const d = (await res.json()) as { location?: { latitude: number; longitude: number } };
  return d.location ? { lat: d.location.latitude, lng: d.location.longitude } : null;
}

async function textLocation(query: string): Promise<Point | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (key) {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.location" },
      body: JSON.stringify({ textQuery: query, regionCode: "AU", pageSize: 1 }),
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const d = (await res.json()) as { places?: { location?: { latitude: number; longitude: number } }[] };
      const loc = d.places?.[0]?.location;
      if (loc) return { lat: loc.latitude, lng: loc.longitude };
    }
  }
  // No Google key (local demo) or no match: Open-Meteo's place-name lookup, Australia first.
  const res = await fetch(`${GEOCODE}/v1/search?name=${encodeURIComponent(query)}&count=1&countryCode=AU&format=json`, {
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) return null;
  const d = (await res.json()) as { results?: { latitude: number; longitude: number }[] };
  const r = d.results?.[0];
  return r ? { lat: r.latitude, lng: r.longitude } : null;
}

async function locate(placeId: string | null, name: string): Promise<Point | null> {
  const cacheKey = placeId ?? `q:${name.toLowerCase()}`;
  if (points.has(cacheKey)) return points.get(cacheKey)!;
  const p = (placeId ? await placeLocation(placeId) : null) ?? (await textLocation(name));
  points.set(cacheKey, p);
  return p;
}

/** WMO weather codes -> a few words and a Remix icon. */
function describe(code: number, night: boolean): { label: string; icon: string } {
  if (code === 0) return night ? { label: "Clear", icon: "ri-moon-clear-line" } : { label: "Sunny", icon: "ri-sun-line" };
  if (code <= 2) return { label: "Partly cloudy", icon: night ? "ri-moon-cloudy-line" : "ri-sun-cloudy-line" };
  if (code === 3) return { label: "Cloudy", icon: "ri-cloudy-line" };
  if (code === 45 || code === 48) return { label: "Foggy", icon: "ri-mist-line" };
  if (code >= 51 && code <= 57) return { label: "Drizzle", icon: "ri-drizzle-line" };
  if (code >= 61 && code <= 67) return { label: "Rain", icon: "ri-rainy-line" };
  if (code >= 71 && code <= 77) return { label: "Snow", icon: "ri-snowy-line" };
  if (code >= 80 && code <= 82) return { label: "Showers", icon: "ri-showers-line" };
  if (code === 85 || code === 86) return { label: "Snow showers", icon: "ri-snowy-line" };
  if (code >= 95) return { label: "Storms", icon: "ri-thunderstorms-line" };
  return { label: "Mixed", icon: "ri-sun-cloudy-line" };
}

export async function forecastFor(plan: {
  starts_at: string | null;
  venue_place_id: string | null;
  venue_name: string | null;
  area: string | null;
}): Promise<Forecast | null> {
  const where = plan.venue_name ?? plan.area;
  if (!plan.starts_at || !where) return null;
  const start = Date.parse(plan.starts_at);
  const now = Date.now();
  if (start < now - 3 * 3600 * 1000) return null; // Already happened.
  const daysOut = Math.floor((start - now) / 86400000);
  if (daysOut >= FORECAST_DAYS) return { kind: "too-far", daysOut };

  try {
    // A venue name alone can be ambiguous ("The Royal"), so search it with the area.
    const point = await locate(plan.venue_place_id, plan.venue_name && plan.area ? `${plan.venue_name}, ${plan.area}` : where);
    if (!point) return null;
    const q = new URLSearchParams({
      latitude: point.lat.toFixed(3),
      longitude: point.lng.toFixed(3),
      hourly: "temperature_2m,precipitation_probability,weather_code,is_day",
      timezone: "UTC",
      forecast_days: String(FORECAST_DAYS),
    });
    const res = await fetch(`${OPEN_METEO}/v1/forecast?${q}`, { signal: AbortSignal.timeout(4000), next: { revalidate: 1800 } });
    if (!res.ok) return null;
    const d = (await res.json()) as {
      hourly?: { time: string[]; temperature_2m: number[]; precipitation_probability: (number | null)[]; weather_code: number[]; is_day: number[] };
    };
    const h = d.hourly;
    if (!h?.time.length) return null;
    // The hour closest to the start time.
    let best = 0;
    for (let i = 1; i < h.time.length; i++) {
      if (Math.abs(Date.parse(`${h.time[i]}Z`) - start) < Math.abs(Date.parse(`${h.time[best]}Z`) - start)) best = i;
    }
    const { label, icon } = describe(h.weather_code[best], h.is_day[best] === 0);
    return { kind: "forecast", label, icon, tempC: Math.round(h.temperature_2m[best]), rainChance: h.precipitation_probability[best] ?? null };
  } catch (e) {
    console.error("[weather]", e instanceof Error ? e.message : e);
    return null;
  }
}
