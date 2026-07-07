import { describe, it, expect } from "vitest";
import { GOAL, defaultDaily, noteActivity, streakInfo, isYesterday, addDays, weekStart } from "../src/daily.js";

describe("daily: defaults", () => {
  it("GOAL is 20", () => {
    expect(GOAL).toBe(20);
  });
  it("defaultDaily shape", () => {
    expect(defaultDaily()).toEqual({ last: "", streak: 0, today: { date: "", resolved: 0 }, restWeek: "", restDay: "" });
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

describe("daily: kind streak (B1 rest days)", () => {
  // helper: complete the goal on each date in order
  const run = dates => dates.reduce((d, ds) => noteActivity(d, ds, GOAL), defaultDaily());

  it("addDays / weekStart (Mon–Sun weeks)", () => {
    expect(addDays("2026-07-04", 1)).toBe("2026-07-05");
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(weekStart("2026-07-06")).toBe("2026-07-06"); // Monday maps to itself
    expect(weekStart("2026-07-07")).toBe("2026-07-06");
    expect(weekStart("2026-07-12")).toBe("2026-07-06"); // Sunday belongs to the Monday week
    expect(weekStart("2026-07-05")).toBe("2026-06-29"); // the Sunday BEFORE that Monday
  });

  it("miss-1-covered: one missed day with streak ≥3 consumes the rest day, streak survives", () => {
    let d = run(["2026-07-04", "2026-07-05", "2026-07-06"]);   // streak 3
    d = noteActivity(d, "2026-07-08", GOAL);                   // missed 07-07
    expect(d.streak).toBe(4);                                  // ...never increments FOR the rest day
    expect(d.restDay).toBe("2026-07-07");
    expect(d.restWeek).toBe("2026-07-06");
  });

  it("rest-day-never-increments: covered gap yields +1 (the active day), not +2", () => {
    let d = run(["2026-07-03", "2026-07-04", "2026-07-05", "2026-07-06"]); // streak 4
    d = noteActivity(d, "2026-07-08", GOAL);                               // miss 07-07, covered
    expect(d.streak).toBe(5);
  });

  it("miss-2-breaks: two consecutive missed days always break", () => {
    let d = run(["2026-07-04", "2026-07-05", "2026-07-06"]);   // streak 3
    d = noteActivity(d, "2026-07-09", GOAL);                   // missed 07-07 AND 07-08
    expect(d.streak).toBe(1);
  });

  it("two-misses-same-week-breaks: the weekly rest day is spent once", () => {
    let d = run(["2026-07-06", "2026-07-07", "2026-07-08"]);   // Mon–Wed, streak 3
    d = noteActivity(d, "2026-07-10", GOAL);                   // miss Thu 07-09 → covered
    expect(d.streak).toBe(4);
    d = noteActivity(d, "2026-07-12", GOAL);                   // miss Sat 07-11 → SAME Mon–Sun week
    expect(d.streak).toBe(1);                                  // rest already used → break
  });

  it("week-boundary reset: a new Mon–Sun week grants a fresh rest day", () => {
    let d = run(["2026-07-06", "2026-07-07", "2026-07-08"]);   // streak 3
    d = noteActivity(d, "2026-07-10", GOAL);                   // miss Thu 07-09 → covered (week of 07-06)
    d = noteActivity(d, "2026-07-11", GOAL);
    d = noteActivity(d, "2026-07-12", GOAL);                   // streak 6 by Sunday
    d = noteActivity(d, "2026-07-14", GOAL);                   // miss Mon 07-13 → NEW week → covered
    expect(d.streak).toBe(7);
    expect(d.restWeek).toBe("2026-07-13");
  });

  it("streak<3 uncovered: nothing to protect yet — behaves as before", () => {
    let d = run(["2026-07-04", "2026-07-05"]);                 // streak 2
    d = noteActivity(d, "2026-07-07", GOAL);                   // miss 07-06
    expect(d.streak).toBe(1);
  });

  it("migration: an old-shape save (no rest fields) works and never retro-breaks", () => {
    const old = { last: "2026-07-05", streak: 6, today: { date: "2026-07-05", resolved: 25 } };
    // yesterday-chain intact exactly as before
    expect(streakInfo(old, "2026-07-06").streak).toBe(6);
    // next-day activity continues the streak and grows the new fields
    const d = noteActivity(old, "2026-07-06", GOAL);
    expect(d.streak).toBe(7);
    expect(d.restWeek).toBe("");
    expect(d.restDay).toBe("");
    // and a 2-day gap on an old save with streak ≥3 is now coverable, not broken
    expect(streakInfo(old, "2026-07-07").streak).toBe(6);
  });

  it("streakInfo: coverable gap shows the streak as alive; restNote fires on the return day", () => {
    let d = run(["2026-07-04", "2026-07-05", "2026-07-06"]);
    // 07-08, before playing: yesterday (07-07) is coverable → chain alive
    expect(streakInfo(d, "2026-07-08").streak).toBe(3);
    expect(streakInfo(d, "2026-07-08").restNote).toBe(false);  // not consumed yet
    d = noteActivity(d, "2026-07-08", GOAL);                   // consume
    const info = streakInfo(d, "2026-07-08");
    expect(info.streak).toBe(4);
    expect(info.restNote).toBe(true);                          // "🍵 Rest day used…" day
    expect(streakInfo(d, "2026-07-09").restNote).toBe(false);  // gone the next day
  });

  it("streakInfo: uncoverable gap (rest spent this week) reads 0", () => {
    let d = run(["2026-07-06", "2026-07-07", "2026-07-08"]);
    d = noteActivity(d, "2026-07-10", GOAL);                   // rest spent on Thu 07-09
    expect(streakInfo(d, "2026-07-13").streak).toBe(0);        // missed Sat 07-12... wait gap>2 anyway
    // precise same-week double-miss read: last=07-10, check 07-12 (missed 07-11, same week, rest spent)
    expect(streakInfo(d, "2026-07-12").streak).toBe(0);
  });
});
