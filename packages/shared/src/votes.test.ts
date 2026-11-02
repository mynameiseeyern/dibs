import { describe, expect, it } from "vitest";
import { MULTI_VOTES, maxVotes, overLimit, picksAllowed, voteStep } from "./votes";

describe("picks per person", () => {
  it("is one for plans from before multiple picks", () => {
    expect(maxVotes({})).toBe(1);
    expect(maxVotes({ max_votes: null })).toBe(1);
  });
  it("stays between one and three", () => {
    expect(maxVotes({ max_votes: 3 })).toBe(3);
    expect(maxVotes({ max_votes: 9 })).toBe(MULTI_VOTES);
    expect(maxVotes({ max_votes: 0 })).toBe(1);
  });
});

describe("a tap on an option", () => {
  it("moves your one pick, and does nothing on the one you've got", () => {
    expect(voteStep(["a"], "b", 1)).toEqual({ kind: "move" });
    expect(voteStep([], "a", 1)).toEqual({ kind: "move" });
    expect(voteStep(["a"], "a", 1)).toEqual({ kind: "none" });
  });
  it("adds or unticks with up to three", () => {
    expect(voteStep([], "a", 3)).toEqual({ kind: "add" });
    expect(voteStep(["a", "b"], "c", 3)).toEqual({ kind: "add" });
    expect(voteStep(["a", "b"], "a", 3)).toEqual({ kind: "remove" });
  });
  it("stops at three until you untick one", () => {
    expect(voteStep(["a", "b", "c"], "d", 3)).toEqual({ kind: "full", max: 3 });
    expect(voteStep(["a", "b", "c"], "b", 3)).toEqual({ kind: "remove" });
  });
});

describe("picks you can use", () => {
  it("is always one fewer than there are places, and never more than three", () => {
    const multi = { max_votes: 3 };
    expect(picksAllowed(multi, 0)).toBe(1);
    expect(picksAllowed(multi, 2)).toBe(1);
    expect(picksAllowed(multi, 3)).toBe(2);
    expect(picksAllowed(multi, 4)).toBe(3);
    expect(picksAllowed(multi, 8)).toBe(3);
  });
  it("stays at one when the organiser switched it off", () => {
    expect(picksAllowed({ max_votes: 1 }, 8)).toBe(1);
  });
  it("lets someone over the cap untick, but not add", () => {
    // Had two picks of three places; one came off, so it's one pick now.
    expect(voteStep(["a", "b"], "a", 1)).toEqual({ kind: "remove" });
    expect(voteStep(["a", "b"], "c", 2)).toEqual({ kind: "full", max: 2 });
  });
});

describe("going back to one pick", () => {
  it("keeps each person's latest and takes back the rest", () => {
    const votes = [
      { option_id: "a", member_id: "sam" },
      { option_id: "b", member_id: "jo" },
      { option_id: "c", member_id: "sam" },
      { option_id: "d", member_id: "sam" },
    ];
    expect(overLimit(votes, 1)).toEqual([votes[0], votes[2]]);
    expect(overLimit(votes, 3)).toEqual([]);
  });
});
