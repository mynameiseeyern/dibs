import { describe, expect, it } from "vitest";
import { feedStatus } from "./calendar";

const now = Date.parse("2026-11-02T04:00:00Z");
const soon = "2026-11-06T08:00:00Z";
const plan = { status: "locked", starts_at: soon };
const going = { rsvp: "in", role: "guest", waitlisted: false };

describe("calendar subscription", () => {
  it("has plans you're going to once they're locked in with a time", () => {
    expect(feedStatus(plan, going, now)).toBe("confirmed");
    expect(feedStatus({ ...plan, status: "wrapped" }, going, now)).toBe("confirmed");
  });
  it("leaves out votes, plans with no time and called-off plans", () => {
    expect(feedStatus({ ...plan, status: "voting" }, going, now)).toBeNull();
    expect(feedStatus({ ...plan, starts_at: null }, going, now)).toBeNull();
    expect(feedStatus({ ...plan, status: "cancelled" }, going, now)).toBeNull();
  });
  it("marks maybe as tentative and leaves out can't go, not replied and the waitlist", () => {
    expect(feedStatus(plan, { ...going, rsvp: "maybe" }, now)).toBe("tentative");
    expect(feedStatus(plan, { ...going, rsvp: "out" }, now)).toBeNull();
    expect(feedStatus(plan, { ...going, rsvp: null }, now)).toBeNull();
    expect(feedStatus(plan, { ...going, waitlisted: true }, now)).toBeNull();
  });
  it("always has plans you're hosting", () => {
    expect(feedStatus(plan, { rsvp: null, role: "organiser", waitlisted: false }, now)).toBe("confirmed");
    expect(feedStatus(plan, { rsvp: null, role: "cohost", waitlisted: false }, now)).toBe("confirmed");
  });
  it("drops plans from more than 60 days ago", () => {
    expect(feedStatus({ ...plan, starts_at: "2026-08-01T08:00:00Z" }, going, now)).toBeNull();
    expect(feedStatus({ ...plan, starts_at: "2026-10-01T08:00:00Z" }, going, now)).toBe("confirmed");
  });
});
