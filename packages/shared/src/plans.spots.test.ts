import { describe, expect, it } from "vitest";
import { hasRoom, offWaitlist } from "./plans";

const m = (id: string, o: Partial<{ rsvp: "in" | "maybe" | "out" | null; plus_one: boolean; waitlisted: boolean; waitlisted_at: string | null }> = {}) => ({
  id,
  rsvp: "in" as const,
  plus_one: false,
  waitlisted: false,
  joined_at: "2026-10-01T00:00:00Z",
  waitlisted_at: null,
  ...o,
});

describe("spots", () => {
  it("an open plan always has room", () => {
    expect(hasRoom([m("a"), m("b")], null, true)).toBe(true);
  });
  it("a closed plan counts plus-ones", () => {
    expect(hasRoom([m("a", { plus_one: true })], 3)).toBe(true);
    expect(hasRoom([m("a", { plus_one: true })], 3, true)).toBe(false);
  });
  it("takes people off the waitlist first on, first off", () => {
    const people = [
      m("a"),
      m("late", { waitlisted: true, waitlisted_at: "2026-10-03T00:00:00Z" }),
      m("early", { waitlisted: true, waitlisted_at: "2026-10-02T00:00:00Z" }),
    ];
    expect(offWaitlist(people, 2)).toEqual(["early"]);
    expect(offWaitlist(people, 3)).toEqual(["early", "late"]);
  });
  it("skips someone whose +1 won't fit, but not the single behind them", () => {
    const people = [m("a"), m("pair", { waitlisted: true, plus_one: true, waitlisted_at: "2026-10-02T00:00:00Z" }), m("solo", { waitlisted: true, waitlisted_at: "2026-10-03T00:00:00Z" })];
    expect(offWaitlist(people, 2)).toEqual(["solo"]);
  });
  it("opening the plan lets everyone in, and ignores people who stepped back", () => {
    const people = [m("a"), m("b", { waitlisted: true }), m("c", { waitlisted: true, rsvp: "maybe" })];
    expect(offWaitlist(people, null)).toEqual(["b"]);
  });
});
