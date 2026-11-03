import { describe, expect, it } from "vitest";
import { recapNoun, theRecapNoun, TIME_PRESETS } from "./daypart";

// Sydney is UTC+11 in November.
const at = (local: string) => new Date(`${local}:00+11:00`).toISOString();

describe("recapNoun", () => {
  it("calls an early start the morning", () => {
    expect(recapNoun(at("2026-11-07T06:00"))).toBe("morning");
    expect(recapNoun(at("2026-11-07T11:59"))).toBe("morning");
  });
  it("calls noon to 6pm the arvo", () => {
    expect(recapNoun(at("2026-11-07T12:00"))).toBe("arvo");
    expect(recapNoun(at("2026-11-07T17:30"))).toBe("arvo");
  });
  it("calls 6pm on, and the small hours, the night", () => {
    expect(recapNoun(at("2026-11-07T18:00"))).toBe("night");
    expect(recapNoun(at("2026-11-07T22:00"))).toBe("night");
    expect(recapNoun(at("2026-11-08T02:00"))).toBe("night");
  });
  it("falls back to hang with no time", () => {
    expect(recapNoun(null)).toBe("hang");
    expect(recapNoun("nope")).toBe("hang");
    expect(recapNoun(at("2026-11-07T00:00"))).toBe("hang");
  });
  it("reads as running copy", () => {
    expect(theRecapNoun(at("2026-11-07T15:00"))).toBe("the arvo");
  });
});

describe("TIME_PRESETS", () => {
  it("has no meal names and runs earliest first", () => {
    const labels = TIME_PRESETS.map((t) => t.label.toLowerCase());
    for (const meal of ["brunch", "lunch", "dinner", "drinks"]) expect(labels).not.toContain(meal);
    const times = TIME_PRESETS.map((t) => t.at);
    expect([...times].sort()).toEqual(times);
  });
});
