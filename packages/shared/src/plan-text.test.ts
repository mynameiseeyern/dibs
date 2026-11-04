import { describe, expect, it } from "vitest";
import { readPlanText, saysLater } from "./plan-text";

// Thu 5 Nov 2026, 10:30am in Sydney (AEDT, UTC+11).
const now = new Date("2026-11-04T23:30:00Z");
const read = (s: string) => readPlanText(s, now);

describe("readPlanText", () => {
  it("reads a day, a part of the day and an area", () => {
    expect(read("dumplings fri arvo near Newtown")).toEqual({ title: "Dumplings", category: "Food", date: "2026-11-06", time: "15:00", area: "Newtown" });
  });
  it("keeps the rest as the name", () => {
    expect(read("dumplings fri with the crew near newtown").title).toBe("Dumplings with the crew");
  });
  it("drops openers", () => {
    expect(read("let's get drinks sat").title).toBe("Get drinks");
  });
  it("reads clock times", () => {
    expect(read("dinner tomorrow 7:30pm").time).toBe("19:30");
    expect(read("dinner tomorrow at 7pm")).toMatchObject({ title: "Dinner", date: "2026-11-06", time: "19:00" });
    expect(read("brekkie 12am").time).toBe("00:00");
  });
  it("today is a day without a time; tonight is today at night", () => {
    expect(read("movie today")).toMatchObject({ date: "2026-11-05", time: null });
    expect(read("movie tonight")).toMatchObject({ date: "2026-11-05", time: "20:00" });
  });
  it("a weekday that's today means today, next means a week on", () => {
    expect(read("trivia thursday").date).toBe("2026-11-05");
    expect(read("trivia next thursday").date).toBe("2026-11-12");
  });
  it("the weekend is Saturday", () => {
    expect(read("beach this weekend").date).toBe("2026-11-07");
  });
  it("reads dates, day first", () => {
    expect(read("birthday 24 nov").date).toBe("2026-11-24");
    expect(read("birthday nov 24th").date).toBe("2026-11-24");
    expect(read("birthday 3/1").date).toBe("2027-01-03");
    expect(read("birthday 31/2").date).toBeNull();
  });
  it("never makes up a day or a time", () => {
    expect(read("bowling")).toEqual({ title: "Bowling", category: "Games", date: null, time: null, area: null });
  });
  it("only takes a capitalised area after in", () => {
    expect(read("picnic in the park").area).toBeNull();
    expect(read("picnic in Centennial Park").area).toBe("Centennial Park");
  });
  it("leaves the name empty when there's nothing else", () => {
    expect(read("saturday 7pm").title).toBeNull();
  });
});

describe("saysLater", () => {
  it("hears not sure", () => {
    expect(saysLater("not sure yet")).toBe(true);
    expect(saysLater("saturday")).toBe(false);
  });
});
