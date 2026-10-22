import { describe, expect, it } from "vitest";
import { planAccess } from "./plans";

const guest = { role: "guest" as const, waitlisted: false };

describe("planAccess", () => {
  it("going: takes part", () => expect(planAccess({ ...guest, rsvp: "in" })).toEqual({ level: "full" }));
  it("maybe: reads along", () => expect(planAccess({ ...guest, rsvp: "maybe" })).toEqual({ level: "read", why: "maybe" }));
  it("not replied: reads along", () => expect(planAccess({ ...guest, rsvp: null })).toEqual({ level: "read", why: "unreplied" }));
  it("can't go: hidden", () => expect(planAccess({ ...guest, rsvp: "out" })).toEqual({ level: "hidden" }));
  it("going but waitlisted: reads along", () => expect(planAccess({ ...guest, rsvp: "in", waitlisted: true })).toEqual({ level: "read", why: "waitlist" }));
  it("hosts always take part", () => {
    expect(planAccess({ role: "organiser", rsvp: "out", waitlisted: false })).toEqual({ level: "full" });
    expect(planAccess({ role: "cohost", rsvp: "maybe", waitlisted: false })).toEqual({ level: "full" });
  });
});
