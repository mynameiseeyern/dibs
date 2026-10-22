import "server-only";
import { TZ } from "./time";

/**
 * Estimated weather for a plan: where it is (the locked venue, else the area) and when
 * it starts. Google Weather API: hourly for the next 24 hours, daily out to 10 days.
 * Beyond that, or in the past, there's nothing to say. Any failure returns null so the
 * plan page never breaks. Needs the Weather API enabled on the Google key.
 */

export type Forecast =
  | { kind: "hour"; label: string; icon: string; tempC: number; rainChance: number | null }
  | { kind: "day"; label: string; icon: string; lowC: number; highC: number; rainChance: number | null }
  | { kind: "too-far"; daysOut: number };

const WEATHER = process.env.WEATHER_BASE_URL ?? "https://weather.googleapis.com";
const PLACES = process.env.PLACES_BASE_URL ?? "https://places.googleapis.com";
const FORECAST_DAYS = 10;
const weatherKey = () => process.env.GOOGLE_WEATHER_API_KEY || process.env.GOOGLE_PLACES_API_KEY;

type Point = { lat: number; lng: number };
// Places don't move. Kept per server instance so we don't pay for the same lookup twice.
const points = new Map<string, Point | null>();

async function placeLocation(placeId: string): Promise<Point | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;
  const res = await fetch(`${PLACES}/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "location" },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) return null;
  const d = (await res.json()) as { location?: { latitude: number; longitude: number } };
  return d.location ? { lat: d.location.latitude, lng: d.location.longitude } : null;
}

async function textLocation(query: string): Promise<Point | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;
  {
    const res = await fetch(`${PLACES}/v1/places:searchText`, {
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
  return null;
}

async function locate(placeId: string | null, name: string): Promise<Point | null> {
  const cacheKey = placeId ?? `q:${name.toLowerCase()}`;
  if (points.has(cacheKey)) return points.get(cacheKey)!;
  const p = (placeId ? await placeLocation(placeId) : null) ?? (await textLocation(name));
  if (p) points.set(cacheKey, p); // Don't remember a miss: it may be a blip.
  return p;
}

/** Google's condition type (CLEAR, MOSTLY_CLOUDY, LIGHT_RAIN, SCATTERED_THUNDERSTORMS…) -> a Remix icon. */
function iconFor(type: string, night: boolean): string {
  const t = type.toUpperCase();
  if (t.includes("THUNDER")) return "ri-thunderstorms-line";
  if (t.includes("SNOW") || t.includes("HAIL") || t.includes("SLEET")) return "ri-snowy-line";
  if (t.includes("SHOWER")) return "ri-showers-line";
  if (t.includes("DRIZZLE") || t === "LIGHT_RAIN") return "ri-drizzle-line";
  if (t.includes("RAIN")) return "ri-rainy-line";
  if (t.includes("FOG") || t.includes("HAZE") || t.includes("MIST") || t.includes("SMOKE") || t.includes("DUST")) return "ri-mist-line";
  if (t.includes("WIND")) return "ri-windy-line";
  if (t === "CLOUDY" || t === "MOSTLY_CLOUDY") return "ri-cloudy-line";
  if (t.includes("PARTLY") || t === "MOSTLY_CLEAR") return night ? "ri-moon-cloudy-line" : "ri-sun-cloudy-line";
  if (t.includes("CLEAR")) return night ? "ri-moon-clear-line" : "ri-sun-line";
  return "ri-sun-cloudy-line";
}

type Condition = { type?: string; description?: { text?: string } };
const sentence = (c: Condition | undefined, fallback: string) => {
  const text = c?.description?.text?.trim() || fallback;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/** Plan start as the local date and hour where dibs runs (Sydney and Melbourne). */
function localParts(iso: string) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", hourCycle: "h23" }).formatToParts(new Date(iso));
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour") };
}

async function hourly(point: Point, start: number, key: string): Promise<Forecast | null> {
  const q = new URLSearchParams({ key, "location.latitude": point.lat.toFixed(4), "location.longitude": point.lng.toFixed(4), hours: "24", pageSize: "24" });
  const res = await fetch(`${WEATHER}/v1/forecast/hours:lookup?${q}`, { signal: AbortSignal.timeout(4000), next: { revalidate: 1800 } });
  if (!res.ok) throw new Error(`hours ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const d = (await res.json()) as {
    forecastHours?: { interval?: { startTime?: string }; isDaytime?: boolean; weatherCondition?: Condition; temperature?: { degrees?: number }; precipitation?: { probability?: { percent?: number } } }[];
  };
  const hours = (d.forecastHours ?? []).filter((h) => h.interval?.startTime && typeof h.temperature?.degrees === "number");
  if (!hours.length) return null;
  const gap = (h: (typeof hours)[number]) => Math.abs(Date.parse(h.interval!.startTime!) - start);
  const h = hours.reduce((best, x) => (gap(x) < gap(best) ? x : best));
  return {
    kind: "hour",
    label: sentence(h.weatherCondition, "Mixed"),
    icon: iconFor(h.weatherCondition?.type ?? "", h.isDaytime === false),
    tempC: Math.round(h.temperature!.degrees!),
    rainChance: h.precipitation?.probability?.percent ?? null,
  };
}

async function daily(point: Point, startIso: string, key: string): Promise<Forecast | null> {
  const q = new URLSearchParams({ key, "location.latitude": point.lat.toFixed(4), "location.longitude": point.lng.toFixed(4), days: String(FORECAST_DAYS), pageSize: String(FORECAST_DAYS) });
  const res = await fetch(`${WEATHER}/v1/forecast/days:lookup?${q}`, { signal: AbortSignal.timeout(4000), next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`days ${res.status} ${(await res.text().catch(() => "")).slice(0, 200)}`);
  type Part = { weatherCondition?: Condition; precipitation?: { probability?: { percent?: number } } };
  const d = (await res.json()) as {
    forecastDays?: { displayDate?: { year: number; month: number; day: number }; daytimeForecast?: Part; nighttimeForecast?: Part; maxTemperature?: { degrees?: number }; minTemperature?: { degrees?: number } }[];
  };
  const when = localParts(startIso);
  const day = d.forecastDays?.find((x) => x.displayDate?.year === when.year && x.displayDate?.month === when.month && x.displayDate?.day === when.day);
  // Google's 10 days start today, so the far edge can miss by a day: say it's coming.
  if (!day) return { kind: "too-far", daysOut: FORECAST_DAYS };
  if (typeof day.maxTemperature?.degrees !== "number" || typeof day.minTemperature?.degrees !== "number") return null;
  const night = when.hour >= 18 || when.hour < 6;
  const part = (night ? day.nighttimeForecast : day.daytimeForecast) ?? day.daytimeForecast;
  return {
    kind: "day",
    label: sentence(part?.weatherCondition, "Mixed"),
    icon: iconFor(part?.weatherCondition?.type ?? "", night),
    lowC: Math.round(day.minTemperature.degrees),
    highC: Math.round(day.maxTemperature.degrees),
    rainChance: part?.precipitation?.probability?.percent ?? null,
  };
}

export async function forecastFor(plan: {
  starts_at: string | null;
  venue_place_id: string | null;
  venue_name: string | null;
  area: string | null;
}): Promise<Forecast | null> {
  const where = plan.venue_name ?? plan.area;
  const key = weatherKey();
  if (!plan.starts_at || !where || !key) return null;
  const start = Date.parse(plan.starts_at);
  const now = Date.now();
  if (start < now - 3 * 3600 * 1000) return null; // Already happened.
  const daysOut = Math.floor((start - now) / 86400000);
  if (daysOut >= FORECAST_DAYS) return { kind: "too-far", daysOut };

  try {
    // A venue name alone can be ambiguous ("The Royal"), so search it with the area.
    const point = await locate(plan.venue_place_id, plan.venue_name && plan.area ? `${plan.venue_name}, ${plan.area}` : where);
    if (!point) return null;
    return start - now < 23 * 3600 * 1000 ? await hourly(point, start, key) : await daily(point, plan.starts_at, key);
  } catch (e) {
    console.error("[weather]", e instanceof Error ? e.message : e);
    return null;
  }
}
