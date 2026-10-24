import { describe, expect, it } from "vitest";
import { canAddPhotos, canSeePhotos, photosRevealed } from "./photos";

const going = { rsvp: "in" as const, waitlisted: false, role: "guest" as const, attended: null };
const maybe = { ...going, rsvp: "maybe" as const };
const host = { ...going, role: "organiser" as const };

describe("photosRevealed", () => {
  it("stays developing until the host wraps up, then reveals", () => {
    expect(photosRevealed({ status: "locked" })).toBe(false);
    expect(photosRevealed({ status: "wrapped" })).toBe(true);
  });
});

describe("who sees and takes photos", () => {
  const started = { status: "locked" as const, starts_at: "2026-10-24T08:00:00Z" };
  const during = new Date("2026-10-24T10:00:00Z");
  it("lets people going and hosts take photos once it starts", () => {
    expect(canAddPhotos(started, going, during)).toBe(true);
    expect(canAddPhotos(started, host, during)).toBe(true);
    expect(canAddPhotos(started, maybe, during)).toBe(false);
    expect(canAddPhotos(started, going, new Date("2026-10-24T07:00:00Z"))).toBe(false);
    expect(canAddPhotos({ status: "locked", starts_at: null }, going, during)).toBe(false);
  });
  it("is only for people who came once it's wrapped", () => {
    const wrapped = { status: "wrapped" as const, starts_at: started.starts_at };
    expect(canSeePhotos(wrapped, { ...going, attended: true })).toBe(true);
    expect(canSeePhotos(wrapped, { ...going, attended: false })).toBe(false);
    expect(canAddPhotos(wrapped, { ...going, attended: true }, during)).toBe(true);
  });
  it("is off for a called-off plan or one still voting", () => {
    expect(canSeePhotos({ status: "cancelled" }, going)).toBe(false);
    expect(canAddPhotos({ status: "voting", starts_at: started.starts_at }, going, during)).toBe(false);
  });
});
