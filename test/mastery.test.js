import { describe, it, expect } from "vitest";
import { recordAnswer, wordStreak, isMastered, levelMastery, pickKeepsakeWord } from "../src/mastery.js";

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

describe("pickKeepsakeWord", () => {
  it("picks the most-recently-mastered word among several", () => {
    const s = {
      "水": { s: 3, k: 3, r: 3, ls: 100 },
      "火": { s: 3, k: 3, r: 3, ls: 300 },
      "土": { s: 3, k: 3, r: 3, ls: 200 },
    };
    expect(pickKeepsakeWord(s)).toBe("火");
  });
  it("ignores non-mastered words (r < 3)", () => {
    const s = {
      "水": { s: 3, k: 3, r: 3, ls: 100 },
      "火": { s: 2, k: 2, r: 2, ls: 999 },
    };
    expect(pickKeepsakeWord(s)).toBe("水");
  });
  it("breaks ties on ls deterministically by hanzi", () => {
    const s = {
      "水": { s: 3, k: 3, r: 3, ls: 500 },
      "火": { s: 3, k: 3, r: 3, ls: 500 },
    };
    // "水" (U+6C34) sorts before "火" (U+706B) via localeCompare
    expect(pickKeepsakeWord(s)).toBe("水");
  });
  it("returns \"\" for an empty store", () => {
    expect(pickKeepsakeWord({})).toBe("");
  });
  it("returns \"\" for an undefined store", () => {
    expect(pickKeepsakeWord(undefined)).toBe("");
  });
  it("returns \"\" when no word is mastered", () => {
    const s = { "水": { s: 1, k: 1, r: 1, ls: 100 } };
    expect(pickKeepsakeWord(s)).toBe("");
  });
  it("does not mutate the store", () => {
    const s = { "水": { s: 3, k: 3, r: 3, ls: 100 } };
    const before = JSON.stringify(s);
    pickKeepsakeWord(s);
    expect(JSON.stringify(s)).toBe(before);
  });

  // A word already displayed on an earlier keepsake is skipped, so no two
  // keepsakes ever remember the same word.
  it("skips excluded words and falls to the next most recent", () => {
    const s = {
      "水": { s: 3, k: 3, r: 3, ls: 100 },
      "火": { s: 3, k: 3, r: 3, ls: 300 },
      "土": { s: 3, k: 3, r: 3, ls: 200 },
    };
    expect(pickKeepsakeWord(s, ["火"])).toBe("土");
    expect(pickKeepsakeWord(s, ["火", "土"])).toBe("水");
  });
  it("returns \"\" when every mastered word is excluded", () => {
    const s = { "水": { s: 3, k: 3, r: 3, ls: 100 } };
    expect(pickKeepsakeWord(s, ["水"])).toBe("");
  });
  it("accepts a Set as the exclude list", () => {
    const s = {
      "水": { s: 3, k: 3, r: 3, ls: 100 },
      "火": { s: 3, k: 3, r: 3, ls: 300 },
    };
    expect(pickKeepsakeWord(s, new Set(["火"]))).toBe("水");
  });
  it("ignores a null/undefined exclude list", () => {
    const s = { "水": { s: 3, k: 3, r: 3, ls: 100 } };
    expect(pickKeepsakeWord(s, null)).toBe("水");
    expect(pickKeepsakeWord(s, undefined)).toBe("水");
  });
});
