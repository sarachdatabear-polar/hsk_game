import { describe, it, expect } from "vitest";
import { GOAL, defaultDaily, noteActivity, streakInfo, isYesterday } from "../src/daily.js";

describe("daily: defaults", () => {
  it("GOAL is 20", () => {
    expect(GOAL).toBe(20);
  });
  it("defaultDaily shape", () => {
    expect(defaultDaily()).toEqual({ last: "", streak: 0, today: { date: "", resolved: 0 } });
  });
});

describe("daily: isYesterday", () => {
  it("plain same-month case", () => {
    expect(isYesterday("2026-07-03", "2026-07-04")).toBe(true);
    expect(isYesterday("2026-07-02", "2026-07-04")).toBe(false);
  });
  it("month boundary", () => {
    expect(isYesterday("2026-02-28", "2026-03-01")).toBe(true);
  });
  it("year boundary", () => {
    expect(isYesterday("2025-12-31", "2026-01-01")).toBe(true);
  });
  it("empty/missing values are never yesterday", () => {
    expect(isYesterday("", "2026-07-04")).toBe(false);
    expect(isYesterday("2026-07-03", "")).toBe(false);
  });
});

describe("daily: noteActivity", () => {
  it("accumulates within a day without crossing the goal", () => {
    let d = defaultDaily();
    d = noteActivity(d, "2026-07-04", 5);
    d = noteActivity(d, "2026-07-04", 8);
    expect(d.today).toEqual({ date: "2026-07-04", resolved: 13 });
    expect(d.streak).toBe(0);
    expect(d.last).toBe("");
  });

  it("crossing the goal for the first time starts streak at 1 (no prior chain)", () => {
    let d = defaultDaily();
    d = noteActivity(d, "2026-07-04", 25);
    expect(d.today).toEqual({ date: "2026-07-04", resolved: 25 });
    expect(d.streak).toBe(1);
    expect(d.last).toBe("2026-07-04");
  });

  it("consecutive-day goal completion increments the streak", () => {
    let d = defaultDaily();
    d = noteActivity(d, "2026-07-04", GOAL);
    expect(d.streak).toBe(1);
    d = noteActivity(d, "2026-07-05", GOAL);
    expect(d.streak).toBe(2);
    expect(d.last).toBe("2026-07-05");
    d = noteActivity(d, "2026-07-06", GOAL);
    expect(d.streak).toBe(3);
  });

  it("a missed day resets the streak to 1 on the next goal completion", () => {
    let d = defaultDaily();
    d = noteActivity(d, "2026-07-04", GOAL);
    d = noteActivity(d, "2026-07-05", GOAL);
    expect(d.streak).toBe(2);
    // gap: no activity on 07-06; next goal-meeting day is 07-07
    d = noteActivity(d, "2026-07-07", GOAL);
    expect(d.streak).toBe(1);
    expect(d.last).toBe("2026-07-07");
  });

  it("is idempotent for repeated same-day calls past the goal", () => {
    let d = defaultDaily();
    d = noteActivity(d, "2026-07-04", GOAL);
    expect(d.streak).toBe(1);
    d = noteActivity(d, "2026-07-04", 3);
    d = noteActivity(d, "2026-07-04", 10);
    expect(d.streak).toBe(1);
    expect(d.today.resolved).toBe(GOAL + 13);
    expect(d.last).toBe("2026-07-04");
  });

  it("crossing the goal in a single call within an already-active day still counts once", () => {
    let d = defaultDaily();
    d = noteActivity(d, "2026-07-04", GOAL - 5); // under goal
    d = noteActivity(d, "2026-07-04", 5);        // crosses now
    expect(d.streak).toBe(1);
    d = noteActivity(d, "2026-07-04", 100);      // way past goal, same day
    expect(d.streak).toBe(1);
  });

  it("does not mutate the input object", () => {
    const d0 = defaultDaily();
    const snapshot = JSON.parse(JSON.stringify(d0));
    noteActivity(d0, "2026-07-04", GOAL);
    expect(d0).toEqual(snapshot);
  });

  it("switching to a new day resets today's bucket", () => {
    let d = defaultDaily();
    d = noteActivity(d, "2026-07-04", 5);
    d = noteActivity(d, "2026-07-05", 3);
    expect(d.today).toEqual({ date: "2026-07-05", resolved: 3 });
  });
});

describe("daily: streakInfo", () => {
  it("on a brand new day, todayResolved is 0 but an active chain still reads", () => {
    let d = defaultDaily();
    d = noteActivity(d, "2026-07-04", GOAL); // streak 1, last = 07-04
    const info = streakInfo(d, "2026-07-05"); // new day, goal not yet met today
    expect(info.todayResolved).toBe(0);
    expect(info.streak).toBe(1);
    expect(info.goalMet).toBe(false);
    expect(info.goal).toBe(GOAL);
  });

  it("shows goalMet true and today's count on the day the goal was hit", () => {
    let d = defaultDaily();
    d = noteActivity(d, "2026-07-04", 12);
    const info = streakInfo(d, "2026-07-04");
    expect(info.todayResolved).toBe(12);
    expect(info.goalMet).toBe(false);
    d = noteActivity(d, "2026-07-04", 8);
    const info2 = streakInfo(d, "2026-07-04");
    expect(info2.todayResolved).toBe(20);
    expect(info2.goalMet).toBe(true);
  });

  it("a broken chain (gap of 2+ days) displays streak 0", () => {
    let d = defaultDaily();
    d = noteActivity(d, "2026-07-04", GOAL); // streak 1
    const info = streakInfo(d, "2026-07-10"); // long gap
    expect(info.streak).toBe(0);
  });

  it("month/year boundary: chain intact across 02-28 -> 03-01", () => {
    let d = defaultDaily();
    d = noteActivity(d, "2026-02-28", GOAL);
    const info = streakInfo(d, "2026-03-01");
    expect(info.streak).toBe(1);
  });

  it("month/year boundary: chain intact across 12-31 -> 01-01", () => {
    let d = defaultDaily();
    d = noteActivity(d, "2025-12-31", GOAL);
    const info = streakInfo(d, "2026-01-01");
    expect(info.streak).toBe(1);
  });
});
