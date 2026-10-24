import { forecastFor } from "@/lib/weather";
import type { Plan } from "@/lib/store";

/** One line in the plan facts: the estimated weather where and when it's on. Streams in. */
export async function Weather({ plan, short = false }: { plan: Plan; short?: boolean }) {
  const f = await forecastFor(plan);
  if (!f) return null;
  // Short: tucked onto the place line, "· light rain, 21°". Nothing until there's a forecast.
  if (short) {
    if (f.kind === "too-far") return null;
    const temp = f.kind === "hour" ? `${f.tempC}°` : `${f.lowC}–${f.highC}°`;
    return (
      <span className="plan-weather">
        {" "}· <i className={`${f.icon} db-icon`} aria-hidden="true" /> {f.label.charAt(0).toLowerCase() + f.label.slice(1)}, {temp}
        <span className="sr-only"> (forecast, may change)</span>
      </span>
    );
  }
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
