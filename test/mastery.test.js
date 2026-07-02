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
});
