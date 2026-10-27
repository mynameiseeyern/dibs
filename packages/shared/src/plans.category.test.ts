import { describe, expect, it } from "vitest";
import { cleanCategory, cleanDescription, rememberCategory, SAVED_CATEGORIES_MAX } from "./plans";

describe("cleanCategory", () => {
  it("drops blanks", () => {
    expect(cleanCategory("   ")).toBeNull();
    expect(cleanCategory(null)).toBeNull();
  });
  it("matches presets regardless of case", () => expect(cleanCategory(" food ")).toBe("Food"));
  it("keeps a made-up label, tidied", () => expect(cleanCategory("Book   club")).toBe("Book club"));
  it("caps the length", () => expect(cleanCategory("x".repeat(50))).toHaveLength(30));
});

describe("cleanDescription", () => {
  it("keeps paragraphs, squashes extra blank lines", () => expect(cleanDescription(" Bring a jacket \r\n\r\n\r\n\nBYO  snacks ")).toBe("Bring a jacket\n\nBYO snacks"));
  it("drops blanks", () => expect(cleanDescription(" \n ")).toBeNull());
});

describe("rememberCategory", () => {
  it("puts the newest first without duplicates", () => expect(rememberCategory(["Book club", "Trivia"], "trivia")).toEqual(["trivia", "Book club"]));
  it("never saves a preset", () => expect(rememberCategory(["Trivia"], "Food")).toEqual(["Trivia"]));
  it("keeps at most the cap", () => {
    const many = Array.from({ length: SAVED_CATEGORIES_MAX }, (_, i) => `c${i}`);
    const next = rememberCategory(many, "new");
    expect(next).toHaveLength(SAVED_CATEGORIES_MAX);
    expect(next[0]).toBe("new");
  });
});
