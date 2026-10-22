import { NextResponse } from "next/server";

export const revalidate = 300; // At most one Google call every 5 minutes.

/** Is the Google Weather API reachable with our key? Reports Google's answer, never the key. */
export async function GET() {
  const key = process.env.GOOGLE_WEATHER_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  const which = process.env.GOOGLE_WEATHER_API_KEY ? "GOOGLE_WEATHER_API_KEY" : process.env.GOOGLE_PLACES_API_KEY ? "GOOGLE_PLACES_API_KEY" : null;
  if (!key) return NextResponse.json({ ok: false, key: null, problem: "No Google key set in this environment." });
  const q = new URLSearchParams({ key, "location.latitude": "-33.8688", "location.longitude": "151.2093", hours: "1", pageSize: "1" });
  try {
    const res = await fetch(`https://weather.googleapis.com/v1/forecast/hours:lookup?${q}`, { signal: AbortSignal.timeout(5000) });
    const body = (await res.json().catch(() => ({}))) as {
      error?: { status?: string; message?: string; details?: { reason?: string }[] };
      forecastHours?: { weatherCondition?: { description?: { text?: string } }; temperature?: { degrees?: number } }[];
    };
    if (res.ok) {
      const h = body.forecastHours?.[0];
      return NextResponse.json({ ok: true, key: which, sydneyNow: `${h?.weatherCondition?.description?.text ?? "?"}, ${h?.temperature?.degrees ?? "?"}°` });
    }
    return NextResponse.json({
      ok: false,
      key: which,
      httpStatus: res.status,
      googleStatus: body.error?.status ?? null,
      reason: body.error?.details?.find((d) => d.reason)?.reason ?? null,
      message: body.error?.message?.replace(key, "[key]") ?? null,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, key: which, problem: e instanceof Error ? e.message : "Request failed" });
  }
}
