import { describe, expect, it } from "vitest";
import { BillError, owedToPayer, rouletteAllowed, rouletteTally, spinRoulette, splitBill, type BillPerson } from "./index";

const crew: BillPerson[] = [{ id: "ana" }, { id: "ben" }, { id: "cam" }];
const sum = (xs: { cents: number }[]) => xs.reduce((s, x) => s + x.cents, 0);
const base = { payerId: "ana", seed: "bill-1" } as const;

describe("even split", () => {
  it("splits a divisible total evenly", () => {
    const s = splitBill({ ...base, mode: "even", totalCents: 9000 }, crew);
    expect(s.map((x) => x.cents)).toEqual([3000, 3000, 3000]);
  });

  it("always adds up to the total when it doesn't divide", () => {
    for (const total of [1, 2, 100, 10000, 18650, 99999]) {
      expect(sum(splitBill({ ...base, mode: "even", totalCents: total }, crew))).toBe(total);
    }
  });

  it("gives leftover cents to exactly one person", () => {
    const s = splitBill({ ...base, mode: "even", totalCents: 10000 }, crew);
    expect(s.filter((x) => x.cents === 3334)).toHaveLength(1);
    expect(s.filter((x) => x.cents === 3333)).toHaveLength(2);
  });

  it("picks the same person for the same seed", () => {
    const a = splitBill({ ...base, mode: "even", totalCents: 10000 }, crew);
    const b = splitBill({ ...base, mode: "even", totalCents: 10000 }, [...crew].reverse());
    const lucky = (s: typeof a) => s.find((x) => x.cents === 3334)?.personId;
    expect(lucky(a)).toBe(lucky(b));
  });

  it("doubles the share of someone who brought a plus-one", () => {
    const s = splitBill({ ...base, mode: "even", totalCents: 8000 }, [{ id: "ana" }, { id: "ben", plusOnes: 1 }, { id: "cam" }]);
    expect(s.map((x) => x.cents)).toEqual([2000, 4000, 2000]);
  });
});

describe("amount split", () => {
  it("accepts amounts that match the total", () => {
    const s = splitBill({ ...base, mode: "amount", totalCents: 5000, amounts: { ana: 1000, ben: 2500, cam: 1500 } }, crew);
    expect(s.map((x) => x.cents)).toEqual([1000, 2500, 1500]);
  });

  it("rejects amounts that don't match the total", () => {
    expect(() => splitBill({ ...base, mode: "amount", totalCents: 5000, amounts: { ana: 1000, ben: 1000 } }, crew)).toThrow(BillError);
  });
});

describe("percentage split", () => {
  it("rejects anything other than 100%", () => {
    expect(() => splitBill({ ...base, mode: "percent", totalCents: 5000, basisPoints: { ana: 5000, ben: 4000 } }, crew)).toThrow(BillError);
  });

  it("converts to cents and adds up", () => {
    const s = splitBill({ ...base, mode: "percent", totalCents: 1001, basisPoints: { ana: 3333, ben: 3333, cam: 3334 } }, crew);
    expect(sum(s)).toBe(1001);
  });
});

describe("exclude", () => {
  it("leaves the excluded person out and re-splits", () => {
    const s = splitBill({ ...base, mode: "exclude", totalCents: 6000, excludedIds: ["cam"] }, crew);
    expect(s.map((x) => x.cents)).toEqual([3000, 3000, 0]);
  });

  it("refuses to exclude everyone", () => {
    expect(() => splitBill({ ...base, mode: "exclude", totalCents: 6000, excludedIds: ["ana", "ben", "cam"] }, crew)).toThrow(BillError);
  });
});

describe("roulette", () => {
  it("makes the loser owe the whole bill", () => {
    const s = splitBill({ ...base, mode: "roulette", totalCents: 18600, rouletteLoserId: "ben" }, crew);
    expect(s.map((x) => x.cents)).toEqual([0, 18600, 0]);
    expect(owedToPayer(s, "ana")).toEqual([{ personId: "ben", cents: 18600, status: "owed" }]);
  });

  it("owes nothing when the payer loses their own spin", () => {
    const s = splitBill({ ...base, mode: "roulette", totalCents: 18600, rouletteLoserId: "ana" }, crew);
    expect(owedToPayer(s, "ana")).toEqual([]);
  });

  it("needs a spin first", () => {
    expect(() => splitBill({ ...base, mode: "roulette", totalCents: 100 }, crew)).toThrow(BillError);
  });

  it("only lands on people who opted in, the same way for the same seed", () => {
    const entrants = ["ben", "cam"];
    const pick = spinRoulette(entrants, "spin-1");
    expect(entrants).toContain(pick);
    expect(spinRoulette(["cam", "ben"], "spin-1")).toBe(pick);
    expect(() => spinRoulette(["ben"], "spin-1")).toThrow(BillError);
  });
});

describe("payer and edge cases", () => {
  it("marks the payer's own share confirmed", () => {
    const s = splitBill({ ...base, mode: "even", totalCents: 9000 }, crew);
    expect(s.find((x) => x.personId === "ana")?.status).toBe("confirmed");
    expect(s.find((x) => x.personId === "ben")?.status).toBe("owed");
  });

  it("handles a one-person bill and a $0 bill", () => {
    expect(splitBill({ ...base, mode: "even", totalCents: 4200 }, [{ id: "ana" }])[0]?.cents).toBe(4200);
    expect(sum(splitBill({ ...base, mode: "even", totalCents: 0 }, crew))).toBe(0);
  });

  it("rejects fractions of a cent and negative totals", () => {
    expect(() => splitBill({ ...base, mode: "even", totalCents: 10.5 }, crew)).toThrow(BillError);
    expect(() => splitBill({ ...base, mode: "even", totalCents: -1 }, crew)).toThrow(BillError);
  });
});

describe("roulette rules", () => {
  it("caps at $300", () => {
    expect(rouletteAllowed(300_00)).toBe(true);
    expect(rouletteAllowed(300_01)).toBe(false);
    expect(rouletteAllowed(0)).toBe(false);
  });
  it("tallies wins and losses, unluckiest first", () => {
    const t = rouletteTally([
      { roulette_entrants: ["a", "b", "c"], roulette_loser_id: "b", total_cents: 90_00 },
      { roulette_entrants: ["a", "b"], roulette_loser_id: "b", total_cents: 40_00 },
      { roulette_entrants: ["a", "c"], roulette_loser_id: "a", total_cents: 20_00 },
      { roulette_entrants: ["a", "c"], roulette_loser_id: null, total_cents: 99_00 },
    ]);
    expect(t.map((r) => [r.memberId, r.played, r.lost, r.paidCents])).toEqual([
      ["b", 2, 2, 130_00],
      ["a", 3, 1, 20_00],
      ["c", 2, 0, 0],
    ]);
  });
});
