import { describe, expect, it } from "vitest";
import { wrapState } from "./plans";

const now = Date.parse("2026-10-25T05:00:00Z");

describe("wrapState", () => {
  it("locked and started: ready", () => expect(wrapState({ status: "locked", starts_at: "2026-10-25T04:00:00Z" }, now)).toBe("ready"));
  it("locked with no time: ready, or it could never be wrapped", () => expect(wrapState({ status: "locked", starts_at: null }, now)).toBe("ready"));
  it("locked, not started: early", () => expect(wrapState({ status: "locked", starts_at: "2026-11-07T08:00:00Z" }, now)).toBe("early"));
  it("still voting: no", () => expect(wrapState({ status: "voting", starts_at: null }, now)).toBe("no"));
  it("already wrapped: no", () => expect(wrapState({ status: "wrapped", starts_at: null }, now)).toBe("no"));
});
