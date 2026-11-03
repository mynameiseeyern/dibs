import { describe, expect, it } from "vitest";
import { firstName, monogram } from "./plans";

describe("monogram", () => {
  it("takes first and last initials", () => {
    expect(monogram("Sam Lee")).toBe("SL");
    expect(monogram("Dewey")).toBe("D");
  });

  it("skips brackets and emoji", () => {
    expect(monogram("(Robert) Yung Chi Tsim")).toBe("RT");
    expect(monogram("🍕 Ana")).toBe("A");
  });

  it("never comes back empty", () => {
    expect(monogram("🍕")).toBe("?");
  });
});

describe("firstName", () => {
  it("is the first word, without brackets", () => {
    expect(firstName("Sergei Ivanoff")).toBe("Sergei");
    expect(firstName("(Robert) Yung Chi Tsim")).toBe("Robert");
  });

  it("falls back to the name as typed", () => {
    expect(firstName("🍕")).toBe("🍕");
  });
});
