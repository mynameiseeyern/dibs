import { describe, expect, it } from "vitest";
import { resolveStart, sydneyDate } from "./when";

// Thu 22 Oct 2026, 8pm in Sydney (AEDT, UTC+11).
const now = new Date("2026-10-22T09:00:00Z");

describe("resolveStart", () => {
  it("keeps what Dibby read when nothing was tapped", () => {
    expect(resolveStart("2026-10-23T19:00", {}, now)).toBe("2026-10-23T19:00");
  });
  it("stays undecided when there's no day or time", () => {
    expect(resolveStart(null, {}, now)).toBeNull();
  });
  it("tapped day and time beat the text", () => {
    expect(resolveStart("2026-10-23T19:00", { date: "2026-10-24", time: "12:30" }, now)).toBe("2026-10-24T12:30");
  });
  it("a tapped day keeps the time from the text", () => {
    expect(resolveStart("2026-10-23T18:00", { date: "2026-10-25" }, now)).toBe("2026-10-25T18:00");
  });
  it("a tapped day with no time stays undecided rather than guessing", () => {
    expect(resolveStart(null, { date: "2026-10-25" }, now)).toBeNull();
  });
  it("a time with no day is today when it's still ahead", () => {
    expect(resolveStart(null, { time: "21:00" }, now)).toBe("2026-10-22T21:00");
  });
  it("a time with no day is tomorrow once it's gone", () => {
    expect(resolveStart(null, { time: "19:00" }, now)).toBe("2026-10-23T19:00");
  });
  it("ignores a malformed time from the text", () => {
    expect(resolveStart("friday 7pm", {}, now)).toBeNull();
  });
  it("uses the Sydney date, not UTC", () => {
    // 11:30pm UTC on the 22nd is already the 23rd in Sydney.
    expect(sydneyDate(new Date("2026-10-22T23:30:00Z"))).toBe("2026-10-23");
  });
});
