import { describe, expect, it } from "vitest";
import { isWholeDay, startOnDay } from "./when";

describe("Which day works?", () => {
  it("knows a day from a day and a time", () => {
    expect(isWholeDay("2026-11-07T00:00")).toBe(true);
    expect(isWholeDay("2026-11-07T19:00")).toBe(false);
  });
  it("uses the time the host picked", () => {
    expect(startOnDay("2026-11-07T00:00", "18:30", "19:00")).toBe("2026-11-07T18:30");
  });
  it("falls back to the plan's own time", () => {
    expect(startOnDay("2026-11-07T00:00", null, "19:00")).toBe("2026-11-07T19:00");
  });
  it("never makes up a time", () => {
    expect(startOnDay("2026-11-07T00:00", null, null)).toBeNull();
    expect(startOnDay("2026-11-07T00:00", "7pm", null)).toBeNull();
  });
  it("keeps the time on an older poll that had one", () => {
    expect(startOnDay("2026-11-07T19:00", "12:00", "18:00")).toBe("2026-11-07T19:00");
  });
});
