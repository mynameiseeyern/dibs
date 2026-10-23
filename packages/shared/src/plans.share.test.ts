import { describe, expect, it } from "vitest";
import { shareText } from "./plans";

const url = "https://dibby.social/p/abc";

describe("shareText", () => {
  it("leads with the event when the place is set", () => {
    expect(shareText({ title: "Friday dinner", when: "Fri 7pm", place: "Chat Thai", url })).toBe(`Friday dinner · Fri 7pm · Chat Thai. You in? 👉 ${url}`);
  });
  it("mentions the vote, not a place, while voting", () => {
    expect(shareText({ title: "Friday dinner", when: "Fri 7pm", place: "Surry Hills", voting: true, deadline: "Thu 6pm", url })).toBe(
      `Friday dinner · Fri 7pm. Place is up for a vote till Thu 6pm. You in? 👉 ${url}`
    );
  });
  it("skips what isn't set", () => {
    expect(shareText({ title: "Bowling", url })).toBe(`Bowling. You in? 👉 ${url}`);
  });
});
