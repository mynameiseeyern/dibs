import { forecastFor } from "@/lib/weather";
import type { Plan } from "@/lib/store";

/** One line in the plan facts: the estimated weather where and when it's on. Streams in. */
export async function Weather({ plan }: { plan: Plan }) {
  const f = await forecastFor(plan);
  if (!f) return null;
  if (f.kind === "too-far") {
    return (
      <li className="muted">
        <i className="ri-sun-cloudy-line db-icon" aria-hidden="true" /> Forecast shows up about 10 days out
      </li>
    );
  }
  const wet = /rain|drizzle|shower|storm/i.test(f.label);
  const rain = f.rainChance !== null && f.rainChance >= 10 ? ` · ${f.rainChance}% chance${wet ? "" : " of rain"}` : "";
  return (
    <li>
      <i className={`${f.icon} db-icon`} aria-hidden="true" /> {f.label}, {f.kind === "hour" ? `around ${f.tempC}°` : `${f.lowC}–${f.highC}°`}
      {rain}
      <span className="sr-only"> (forecast, may change)</span>
    </li>
  );
}
