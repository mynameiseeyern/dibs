import { describe, expect, it } from "vitest";
import { rankTimes } from "./when";

const t = (id: string, starts_at: string) => ({ id, starts_at });
const times = [t("sat", "2026-10-31T09:00:00Z"), t("fri", "2026-10-30T08:00:00Z"), t("sun", "2026-11-01T03:00:00Z")];

describe("rankTimes", () => {
  it("puts times in order and has no best until someone says", () => {
    const r = rankTimes(times, [], new Set(["a"]));
    expect(r.rows.map((x) => x.time.id)).toEqual(["fri", "sat", "sun"]);
    expect(r.bestId).toBeNull();
  });

  it("picks the time most people are free", () => {
    const votes = [
      { time_id: "fri", member_id: "a" },
      { time_id: "sat", member_id: "a" },
      { time_id: "sat", member_id: "b" },
    ];
    expect(rankTimes(times, votes, new Set(["a", "b"])).bestId).toBe("sat");
  });

  it("breaks a tie with the earliest time", () => {
    const votes = [
      { time_id: "sun", member_id: "a" },
      { time_id: "fri", member_id: "b" },
    ];
    expect(rankTimes(times, votes, new Set(["a", "b"])).bestId).toBe("fri");
  });

  it("only counts people who can take part", () => {
    const votes = [
      { time_id: "fri", member_id: "a" },
      { time_id: "sat", member_id: "stepped-down" },
      { time_id: "sat", member_id: "maybe" },
    ];
    const r = rankTimes(times, votes, new Set(["a"]));
    expect(r.bestId).toBe("fri");
    expect(r.rows.find((x) => x.time.id === "sat")?.free).toEqual([]);
  });
});
