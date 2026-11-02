import { describe, expect, it } from "vitest";
import { splitLeaders } from "./votes";

describe("splitLeaders", () => {
  it("gives every option a full card when there are three or fewer", () => {
    expect(splitLeaders([2, 1, 0])).toEqual({ big: 3, eyebrow: null, tiedAt: null });
    expect(splitLeaders([])).toEqual({ big: 0, eyebrow: null, tiedAt: null });
  });

  it("shows the first two added before anyone votes", () => {
    expect(splitLeaders([0, 0, 0, 0])).toEqual({ big: 2, eyebrow: "First up", tiedAt: null });
  });

  it("shows one big card for a clear leader", () => {
    expect(splitLeaders([3, 1, 1, 0, 0])).toEqual({ big: 1, eyebrow: "Out in front", tiedAt: null });
  });

  it("shows two for a tie, and flags any more that are tied", () => {
    expect(splitLeaders([1, 1, 0, 0, 0, 0])).toEqual({ big: 2, eyebrow: "Out in front · tied", tiedAt: 1 });
    expect(splitLeaders([2, 2, 2, 0])).toEqual({ big: 2, eyebrow: "Out in front · tied", tiedAt: 2 });
  });
});
