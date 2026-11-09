import { describe, expect, it } from "vitest";
import { canDeleteMessage, canEject, isFiltered, isReportReason, personKey } from "./moderation";

describe("isFiltered", () => {
  it("stops slurs, including dodged spellings", () => {
    for (const t of ["you tranny", "TRANNY", "what a faggot", "fag", "r4pe"]) expect(isFiltered(t), t).toBe(true);
  });
  it("leaves ordinary swearing alone", () => {
    for (const t of ["this is fucking great", "shit pub", "what a bastard"]) expect(isFiltered(t)).toBe(false);
  });
  it("doesn't trip on everyday words and names", () => {
    for (const t of ["grape soda", "negronis at Maybe Sammy", "above the bar", "Fagan", "draper st", "therapist", "abode", "Scunthorpe"]) {
      expect(isFiltered(t), t).toBe(false);
    }
  });
  it("skips blanks", () => expect(isFiltered(null, undefined, "")).toBe(false));
});

describe("who can do what", () => {
  const msg = { kind: "text", member_id: "a" };
  it("deletes your own message, or any as host", () => {
    expect(canDeleteMessage(msg, { id: "a" }, false)).toBe(true);
    expect(canDeleteMessage(msg, { id: "b" }, false)).toBe(false);
    expect(canDeleteMessage(msg, { id: "b" }, true)).toBe(true);
  });
  it("never deletes Dibby's or system lines", () => expect(canDeleteMessage({ kind: "dibby", member_id: null }, { id: "b" }, true)).toBe(false));
  it("ejects guests but not the organiser or yourself", () => {
    expect(canEject({ id: "x", role: "guest" }, { id: "h" }, true)).toBe(true);
    expect(canEject({ id: "x", role: "organiser" }, { id: "h" }, true)).toBe(false);
    expect(canEject({ id: "h", role: "cohost" }, { id: "h" }, true)).toBe(false);
    expect(canEject({ id: "x", role: "guest" }, { id: "h" }, false)).toBe(false);
  });
  it("keys people by account, then guest", () => {
    expect(personKey({ user_id: "1", guest_id: "2" })).toBe("u:1");
    expect(personKey({ guest_id: "2" })).toBe("g:2");
    expect(personKey({})).toBeNull();
  });
  it("knows its reasons", () => {
    expect(isReportReason("spam")).toBe(true);
    expect(isReportReason("nope")).toBe(false);
  });
});
