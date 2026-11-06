import { describe, expect, it } from "vitest";
import { addPlaceNote } from "./plans";

const guest = { role: "guest" as const, waitlisted: false };

describe("addPlaceNote", () => {
  it("not joined yet: asks them to say they're in", () => expect(addPlaceNote(null)).toBe("Tap I'm in to add a place."));
  it("maybe or not replied: asks them to say they're in", () => {
    expect(addPlaceNote({ ...guest, rsvp: "maybe" })).toBe("Tap I'm in to add a place.");
    expect(addPlaceNote({ ...guest, rsvp: null })).toBe("Tap I'm in to add a place.");
  });
  it("waitlisted: waits for a spot", () => expect(addPlaceNote({ ...guest, rsvp: "in", waitlisted: true })).toBe("You can add a place once a spot opens."));
  it("going, hosts and can't go: no note", () => {
    expect(addPlaceNote({ ...guest, rsvp: "in" })).toBeNull();
    expect(addPlaceNote({ role: "organiser", rsvp: "maybe", waitlisted: false })).toBeNull();
    expect(addPlaceNote({ ...guest, rsvp: "out" })).toBeNull();
  });
});
