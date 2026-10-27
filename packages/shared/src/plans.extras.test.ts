import { describe, expect, it } from "vitest";
import { extraOn, extrasOffFrom, withExtra } from "./plans";

describe("extras", () => {
  it("are all on for plans from before extras", () => {
    expect(extraOn({}, "bills")).toBe(true);
    expect(extraOn({ extras_off: null }, "recap")).toBe(true);
  });
  it("reads what's off from the form switches", () => {
    const on = new Set(["extra_chat", "extra_recap"]);
    expect(extrasOffFrom((n) => on.has(n))).toEqual(["photos", "bills"]);
  });
  it("switches one at a time, in order, ignoring junk", () => {
    expect(withExtra(["recap", "nope"], "chat", false)).toEqual(["chat", "recap"]);
    expect(withExtra(["chat", "recap"], "chat", true)).toEqual(["recap"]);
    expect(extraOn({ extras_off: ["bills"] }, "bills")).toBe(false);
  });
});
