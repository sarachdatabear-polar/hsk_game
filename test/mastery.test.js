import { describe, it, expect } from "vitest";
import { recordAnswer, wordStreak, isMastered, levelMastery } from "../src/mastery.js";

describe("mastery", () => {
  it("three correct in a row masters a word", () => {
    const s = {};
    recordAnswer(s, "水", true);
    recordAnswer(s, "水", true);
    expect(isMastered(s, "水")).toBe(false);
    recordAnswer(s, "水", true);
    expect(isMastered(s, "水")).toBe(true);
    expect(wordStreak(s, "水")).toBe(3);
  });
  it("a wrong answer resets the streak but not seen/correct counts", () => {
    const s = {};
    recordAnswer(s, "水", true);
    recordAnswer(s, "水", true);
    recordAnswer(s, "水", false);
    expect(wordStreak(s, "水")).toBe(0);
    expect(s["水"].s).toBe(3);
    expect(s["水"].k).toBe(2);
  });
  it("levelMastery aggregates over a word list", () => {
    const s = {};
    for (let i = 0; i < 3; i++) recordAnswer(s, "水", true);
    recordAnswer(s, "火", true);
    const words = [{ h: "水" }, { h: "火" }, { h: "土" }];
    expect(levelMastery(s, words)).toEqual({ seen: 2, mastered: 1, pct: 33 });
  });
  it("levelMastery returns pct=0 for empty word list", () => {
    expect(levelMastery({}, [])).toEqual({ seen: 0, mastered: 0, pct: 0 });
  });
  it("recordAnswer stamps ls (last-seen) using the provided now", () => {
    const s = {};
    recordAnswer(s, "水", true, 12345);
    expect(s["水"].ls).toBe(12345);
    recordAnswer(s, "水", true, 67890);
    expect(s["水"].ls).toBe(67890);
  });
  it("recordAnswer defaults ls to Date.now() when now is omitted", () => {
    const s = {};
    const before = Date.now();
    recordAnswer(s, "水", true);
    const after = Date.now();
    expect(s["水"].ls).toBeGreaterThanOrEqual(before);
    expect(s["水"].ls).toBeLessThanOrEqual(after);
  });
  it("old v1 records without ls keep working with existing helpers", () => {
    const s = { "水": { s: 3, k: 3, r: 3 } };  // pre-M2 shape, no ls
    expect(wordStreak(s, "水")).toBe(3);
    expect(isMastered(s, "水")).toBe(true);
    expect(levelMastery(s, [{ h: "水" }])).toEqual({ seen: 1, mastered: 1, pct: 100 });
    // recording a new answer on top of an old record adds ls without breaking counts
    recordAnswer(s, "水", true, 999);
    expect(s["水"]).toEqual({ s: 4, k: 4, r: 4, ls: 999 });
  });
});
