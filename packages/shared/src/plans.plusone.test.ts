import { describe, expect, it } from "vitest";
import { cleanPlusOneName, withPlusOne } from "./plans";

describe("plus-ones", () => {
  it("names the pair, or says + 1", () => {
    expect(withPlusOne("Ee", { plus_one: true, plus_one_name: "Sam" })).toBe("Ee & Sam");
    expect(withPlusOne("Ee", { plus_one: true, plus_one_name: null })).toBe("Ee + 1");
    expect(withPlusOne("Ee", { plus_one: false, plus_one_name: "Sam" })).toBe("Ee");
  });
  it("tidies the name and treats blank as none", () => {
    expect(cleanPlusOneName("  Sam   Lee ")).toBe("Sam Lee");
    expect(cleanPlusOneName("   ")).toBeNull();
    expect(cleanPlusOneName("x".repeat(60))).toHaveLength(40);
  });
});
