import { describe, expect, it } from "vitest";
import { canDeletePlan } from "./plans";

describe("canDeletePlan", () => {
  const org = { id: "a", role: "organiser" as const };
  it("lets the organiser delete a plan that's theirs alone", () => {
    expect(canDeletePlan(org, [{ id: "a" }], 0)).toBe(true);
  });
  it("not once anyone else is on it", () => {
    expect(canDeletePlan(org, [{ id: "a" }, { id: "b" }], 0)).toBe(false);
  });
  it("not with a bill on it", () => {
    expect(canDeletePlan(org, [{ id: "a" }], 1)).toBe(false);
  });
  it("not for a co-host, a guest or nobody", () => {
    expect(canDeletePlan({ id: "a", role: "cohost" }, [{ id: "a" }], 0)).toBe(false);
    expect(canDeletePlan({ id: "a", role: "guest" }, [{ id: "a" }], 0)).toBe(false);
    expect(canDeletePlan(null, [], 0)).toBe(false);
  });
});
