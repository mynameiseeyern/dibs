import { describe, expect, it } from "vitest";
import { computeMetrics, type LoggedEvent } from "./metrics";

const ev = (name: LoggedEvent["name"], at: string, rest: Partial<LoggedEvent> = {}): LoggedEvent => ({ name, at, ...rest });

describe("computeMetrics", () => {
  it("is empty, not zero, with no events", () => {
    const m = computeMetrics([]);
    expect(m.plansLocked.rate).toBeNull();
    expect(m.billsSettled.rate).toBeNull();
    expect(m.repeatPlans.perOrganiserMonth).toBeNull();
    expect(m.webToApp.rate).toBeNull();
  });

  it("counts each locked plan once, even if it was re-locked to a new place", () => {
    const m = computeMetrics([
      ev("plan_created", "2026-10-01T00:00:00Z", { planId: "a", userId: "u" }),
      ev("plan_created", "2026-10-02T00:00:00Z", { planId: "b", userId: "u" }),
      ev("plan_locked", "2026-10-03T00:00:00Z", { planId: "a" }),
      ev("plan_locked", "2026-10-04T00:00:00Z", { planId: "a" }),
      ev("plan_locked", "2026-10-04T00:00:00Z", { planId: "unknown" }),
    ]);
    expect(m.plansLocked).toEqual({ num: 1, den: 2, rate: 0.5 });
  });

  it("only counts shares paid within 7 days, against the latest owed count", () => {
    const m = computeMetrics([
      ev("bill_created", "2026-10-01T00:00:00Z", { billId: "x", props: { owed: 0 } }),
      // Card roulette sets the shares after the spin.
      ev("bill_shares_set", "2026-10-01T01:00:00Z", { billId: "x", props: { owed: 3 } }),
      ev("share_settled", "2026-10-02T00:00:00Z", { billId: "x" }),
      ev("share_settled", "2026-10-07T23:00:00Z", { billId: "x" }),
      ev("share_settled", "2026-10-12T00:00:00Z", { billId: "x" }),
    ]);
    expect(m.billsSettled).toEqual({ num: 2, den: 3, rate: 2 / 3 });
  });

  it("averages plans per organiser per month and spots repeats", () => {
    const m = computeMetrics([
      ev("plan_created", "2026-10-01T00:00:00Z", { planId: "a", userId: "u1" }),
      ev("plan_created", "2026-10-20T00:00:00Z", { planId: "b", userId: "u1" }),
      ev("plan_created", "2026-11-01T00:00:00Z", { planId: "c", userId: "u1" }),
      ev("plan_created", "2026-10-05T00:00:00Z", { planId: "d", userId: "u2" }),
    ]);
    expect(m.repeatPlans.perOrganiserMonth).toBeCloseTo(4 / 3);
    expect(m.repeatPlans.repeatShare).toEqual({ num: 1, den: 3, rate: 1 / 3 });
  });

  it("counts distinct guests for web to app, ignoring account holders", () => {
    const m = computeMetrics([
      ev("member_joined", "2026-10-01T00:00:00Z", { planId: "a", guestId: "g1" }),
      ev("member_joined", "2026-10-01T00:00:00Z", { planId: "b", guestId: "g1" }),
      ev("member_joined", "2026-10-01T00:00:00Z", { planId: "a", guestId: "g2" }),
      ev("member_joined", "2026-10-01T00:00:00Z", { planId: "a", userId: "u" }),
      ev("app_interest", "2026-10-02T00:00:00Z", { planId: "a", guestId: "g1" }),
      ev("app_interest", "2026-10-03T00:00:00Z", { planId: "b", guestId: "g1" }),
    ]);
    expect(m.webToApp).toEqual({ num: 1, den: 2, rate: 0.5 });
  });
});
