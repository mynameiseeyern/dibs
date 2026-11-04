import { describe, expect, it } from "vitest";
import { likelyDuplicates, mergeBlock, planMerge, type MergeInput } from "./merge";
import type { PlanMember } from "./types";

const FORMER = "Former member";

const member = (id: string, o: Partial<PlanMember> = {}): PlanMember => ({
  id,
  plan_id: "p",
  user_id: null,
  guest_id: `g-${id}`,
  role: "guest",
  display_name: "Sang Woo",
  colour: "violet" as PlanMember["colour"],
  rsvp: null,
  plus_one: false,
  plus_one_name: null,
  waitlisted: false,
  waitlisted_at: null,
  attended: null,
  dibby_muted: false,
  chat_seen_at: null,
  joined_at: "2026-11-01T00:00:00Z",
  ...o,
});

const input = (from: PlanMember, into: PlanMember, o: Partial<MergeInput> = {}): MergeInput => ({
  from,
  into,
  maxVotes: 3,
  fromVotes: [],
  intoVotes: [],
  fromTimes: [],
  intoTimes: [],
  fromRecap: false,
  intoRecap: false,
  fromOnBill: false,
  ...o,
});

describe("mergeBlock", () => {
  it("allows a guest into a guest or an account", () => {
    expect(mergeBlock(input(member("a"), member("b")), FORMER)).toBeNull();
    expect(mergeBlock(input(member("a"), member("b", { guest_id: null, user_id: "u" })), FORMER)).toBeNull();
  });
  it("never folds away an account, the organiser or someone on a bill", () => {
    expect(mergeBlock(input(member("a", { user_id: "u", guest_id: null }), member("b")), FORMER)).toBe("account");
    expect(mergeBlock(input(member("a", { role: "organiser" }), member("b")), FORMER)).toBe("organiser");
    expect(mergeBlock(input(member("a"), member("b"), { fromOnBill: true }), FORMER)).toBe("bill");
  });
  it("refuses the same spot, another plan or a former member", () => {
    expect(mergeBlock(input(member("a"), member("a")), FORMER)).toBe("same");
    expect(mergeBlock(input(member("a"), member("b", { plan_id: "q" })), FORMER)).toBe("same");
    expect(mergeBlock(input(member("a"), member("b", { display_name: FORMER })), FORMER)).toBe("former");
  });
});

describe("planMerge", () => {
  it("keeps the answer that's furthest in, with its +1", () => {
    const p = planMerge(input(member("a", { rsvp: "in", plus_one: true, plus_one_name: "Jin" }), member("b", { rsvp: "maybe" })));
    expect(p.intoPatch).toMatchObject({ rsvp: "in", waitlisted: false, plus_one: true, plus_one_name: "Jin" });
  });
  it("leaves the kept spot's answer when it's already further in", () => {
    const p = planMerge(input(member("a", { rsvp: "out" }), member("b", { rsvp: "in" })));
    expect(p.intoPatch.rsvp).toBeUndefined();
  });
  it("going beats waitlisted, and the queue spot comes across", () => {
    const p = planMerge(input(member("a", { rsvp: "in", waitlisted: true, waitlisted_at: "t1" }), member("b", { rsvp: "out" })));
    expect(p.intoPatch).toMatchObject({ rsvp: "in", waitlisted: true, waitlisted_at: "t1" });
    expect(planMerge(input(member("a", { rsvp: "in", waitlisted: true }), member("b", { rsvp: "in" }))).intoPatch.rsvp).toBeUndefined();
  });
  it("adds picks within the plan's limit, skipping ones already held", () => {
    const p = planMerge(input(member("a", { rsvp: "in" }), member("b", { rsvp: "in" }), { fromVotes: ["x", "y", "z"], intoVotes: ["x", "w"] }));
    expect(p.addVotes).toEqual(["y"]);
  });
  it("moves a single pick when the kept spot has none", () => {
    const p = planMerge(input(member("a", { rsvp: "in" }), member("b"), { maxVotes: 1, fromVotes: ["x"] }));
    expect(p.addVotes).toEqual(["x"]);
  });
  it("brings no votes or times when the kept spot isn't going", () => {
    const p = planMerge(input(member("a", { rsvp: "maybe" }), member("b"), { fromVotes: ["x"], fromTimes: ["t"] }));
    expect(p.addVotes).toEqual([]);
    expect(p.addTimes).toEqual([]);
  });
  it("joins the times both ticked", () => {
    const p = planMerge(input(member("a", { rsvp: "in" }), member("b", { rsvp: "in" }), { fromTimes: ["t1", "t2"], intoTimes: ["t2"] }));
    expect(p.addTimes).toEqual(["t1"]);
  });
  it("moves the recap answer only if the kept spot hasn't answered", () => {
    expect(planMerge(input(member("a"), member("b"), { fromRecap: true })).moveRecap).toBe(true);
    expect(planMerge(input(member("a"), member("b"), { fromRecap: true, intoRecap: true })).moveRecap).toBe(false);
  });
  it("keeps the latest chat read marker", () => {
    expect(planMerge(input(member("a", { chat_seen_at: "2026-11-05" }), member("b", { chat_seen_at: "2026-11-04" }))).intoPatch.chat_seen_at).toBe("2026-11-05");
    expect(planMerge(input(member("a", { chat_seen_at: "2026-11-03" }), member("b", { chat_seen_at: "2026-11-04" }))).intoPatch.chat_seen_at).toBeUndefined();
  });
});

describe("likelyDuplicates", () => {
  it("pairs guests with the same name, ignoring case and spaces", () => {
    const d = likelyDuplicates([member("a", { display_name: "Sang Woo" }), member("b", { display_name: "sangwoo", guest_id: null, user_id: "u" }), member("c", { display_name: "Ee" })], FORMER);
    expect(d.get("a")).toBe("b");
    expect(d.has("b")).toBe(false);
    expect(d.has("c")).toBe(false);
  });
});
