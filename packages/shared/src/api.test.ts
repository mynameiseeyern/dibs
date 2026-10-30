import { describe, expect, it } from "vitest";
import { toPlanSummary } from "./api";
import type { Plan, PlanMember } from "./types";

const plan = {
  slug: "k7m2qx9a",
  title: "Friday dumplings",
  status: "locked",
  starts_at: "2026-11-06T08:00:00.000Z",
  venue_name: "Din Tai Fung",
  venue_address: "12 Secret St",
  area: "Chatswood",
  category: "Food",
  description: null,
  capacity: null,
} as unknown as Plan;

const m = (rsvp: PlanMember["rsvp"], extra: Partial<PlanMember> = {}) => ({ rsvp, plus_one: false, waitlisted: false, ...extra }) as PlanMember;

describe("toPlanSummary", () => {
  it("counts who's going, plus-ones in, waitlist out", () => {
    const s = toPlanSummary(plan, [m("in"), m("in", { plus_one: true }), m("in", { waitlisted: true }), m("maybe")], "Fri 7pm");
    expect(s.going).toBe(3);
  });

  it("never carries the address", () => {
    expect(JSON.stringify(toPlanSummary(plan, [], null))).not.toContain("Secret");
  });

  it("hides the place while it's up for a vote", () => {
    const s = toPlanSummary({ ...plan, status: "voting", venue_name: null } as Plan, [], null);
    expect(s).toMatchObject({ voting: true, place: null });
  });
});
