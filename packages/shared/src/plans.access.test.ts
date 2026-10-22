import { describe, expect, it } from "vitest";
import { cleanCustomPlace, looksLikeAddress, planAccess } from "./plans";

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

describe("custom places", () => {
  it("needs a title; the address is optional", () => {
    expect(cleanCustomPlace("  ", "1 Smith St")).toBeNull();
    expect(cleanCustomPlace("Ee's  place", "")).toEqual({ name: "Ee's place", address: null });
    expect(cleanCustomPlace("Ee's place", " 12 Smith St, Newtown ")).toEqual({ name: "Ee's place", address: "12 Smith St, Newtown" });
  });
  it("spots a street address in a title", () => {
    expect(looksLikeAddress("12 Smith St")).toBe(true);
    expect(looksLikeAddress("Unit 4/27 King Street Newtown")).toBe(true);
    expect(looksLikeAddress("Ee's place")).toBe(false);
    expect(looksLikeAddress("Centennial Park, the big fig")).toBe(false);
  });
});
