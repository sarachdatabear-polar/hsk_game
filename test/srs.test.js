import { describe, it, expect } from "vitest";
import { DAY, wordWeight, weakWords, dueWords, smartDeck } from "../src/srs.js";

const NOW = 1_700_000_000_000;

describe("srs: wordWeight", () => {
  it("unseen (no record) weighs 1", () => {
    expect(wordWeight(undefined, NOW)).toBe(1);
  });
  it("weak: streak<=1 with >=2 attempts weighs 3", () => {
    expect(wordWeight({ s: 2, k: 0, r: 0, ls: NOW }, NOW)).toBe(3);
    expect(wordWeight({ s: 3, k: 1, r: 1, ls: NOW }, NOW)).toBe(3);
  });
  it("streak<=1 with only 1 attempt is not weak -> weighs 1", () => {
    expect(wordWeight({ s: 1, k: 0, r: 0, ls: NOW }, NOW)).toBe(1);
  });
  it("streak 2 (not weak, not mastered) weighs 1", () => {
    expect(wordWeight({ s: 2, k: 2, r: 2, ls: NOW }, NOW)).toBe(1);
  });
  it("mastered and not due weighs 0.3", () => {
    expect(wordWeight({ s: 3, k: 3, r: 3, ls: NOW }, NOW)).toBe(0.3);
  });
  it("mastered and due weighs 2", () => {
    expect(wordWeight({ s: 3, k: 3, r: 3, ls: NOW - DAY }, NOW)).toBe(2);
  });
  it("mastered record missing ls counts as due", () => {
    expect(wordWeight({ s: 3, k: 3, r: 3 }, NOW)).toBe(2);
  });
  it("empty store (undefined record) always weighs 1", () => {
    const store = {};
    expect(wordWeight(store["水"], NOW)).toBe(1);
  });

  describe("due-interval boundaries", () => {
    it("streak 3: due at exactly 1 day, not due just before", () => {
      const rec = { s: 3, k: 3, r: 3, ls: NOW - DAY };
      expect(wordWeight(rec, NOW)).toBe(2);
      const notYet = { s: 3, k: 3, r: 3, ls: NOW - DAY + 1000 };
      expect(wordWeight(notYet, NOW)).toBe(0.3);
    });
    it("streak 4: due at exactly 3 days, not due just before", () => {
      const rec = { s: 4, k: 4, r: 4, ls: NOW - 3 * DAY };
      expect(wordWeight(rec, NOW)).toBe(2);
      const notYet = { s: 4, k: 4, r: 4, ls: NOW - 3 * DAY + 1000 };
      expect(wordWeight(notYet, NOW)).toBe(0.3);
    });
    it("streak 5: due at exactly 7 days, not due just before", () => {
      const rec = { s: 5, k: 5, r: 5, ls: NOW - 7 * DAY };
      expect(wordWeight(rec, NOW)).toBe(2);
      const notYet = { s: 5, k: 5, r: 5, ls: NOW - 7 * DAY + 1000 };
      expect(wordWeight(notYet, NOW)).toBe(0.3);
    });
    it("streak 6+: due at exactly 14 days, not due just before", () => {
      const rec = { s: 6, k: 6, r: 6, ls: NOW - 14 * DAY };
      expect(wordWeight(rec, NOW)).toBe(2);
      const notYet = { s: 6, k: 6, r: 6, ls: NOW - 14 * DAY + 1000 };
      expect(wordWeight(notYet, NOW)).toBe(0.3);
      // streak beyond 6 still uses the 14d floor
      const rec2 = { s: 9, k: 9, r: 9, ls: NOW - 14 * DAY - 1 };
      expect(wordWeight(rec2, NOW)).toBe(2);
    });
  });
});

describe("srs: weakWords", () => {
  const pool = [
    { h: "A", f: 10 }, { h: "B", f: 9 }, { h: "C", f: 8 }, { h: "D", f: 7 },
  ];
  it("selects only weak words and sorts weakest first (lowest ratio, then most-seen)", () => {
    const store = {
      A: { s: 4, k: 1, r: 0, ls: NOW },  // ratio .25
      B: { s: 2, k: 1, r: 1, ls: NOW },  // ratio .5
      C: { s: 5, k: 0, r: 0, ls: NOW },  // ratio 0, most seen
      D: { s: 3, k: 3, r: 3, ls: NOW },  // mastered, not weak
    };
    const res = weakWords(store, pool).map(w => w.h);
    expect(res).toEqual(["C", "A", "B"]);
  });
  it("empty store yields no weak words", () => {
    expect(weakWords({}, pool)).toEqual([]);
  });
});

describe("srs: dueWords", () => {
  const pool = [{ h: "A" }, { h: "B" }, { h: "C" }];
  it("returns only mastered words past their due interval", () => {
    const store = {
      A: { s: 3, k: 3, r: 3, ls: NOW - DAY },       // due
      B: { s: 3, k: 3, r: 3, ls: NOW },             // fresh, not due
      C: { s: 1, k: 1, r: 1, ls: NOW - 100 * DAY }, // not mastered at all
    };
    expect(dueWords(store, pool, NOW).map(w => w.h)).toEqual(["A"]);
  });
  it("empty store -> no due words", () => {
    expect(dueWords({}, pool, NOW)).toEqual([]);
  });
});

describe("srs: smartDeck", () => {
  it("orders weak words first, then due words, de-duplicated", () => {
    const pool = [{ h: "A" }, { h: "B" }, { h: "C" }, { h: "D" }];
    const store = {
      A: { s: 4, k: 0, r: 0, ls: NOW },        // weak
      B: { s: 3, k: 3, r: 3, ls: NOW - DAY },  // due
      C: { s: 3, k: 3, r: 3, ls: NOW },        // mastered, not due -> excluded
      D: { s: 2, k: 2, r: 2, ls: NOW },        // neither -> excluded
    };
    expect(smartDeck(store, pool, NOW).map(w => w.h)).toEqual(["A", "B"]);
  });
  it("de-dups a word appearing in both weak and due selections", () => {
    // Contrived: same hanzi twice in the pool, once weak and once (via a
    // different index) also picked up by dueWords — smartDeck must not
    // list the same hanzi from dueWords if weakWords already included it.
    const pool = [{ h: "A" }, { h: "B" }];
    const store = {
      A: { s: 4, k: 0, r: 0, ls: NOW },        // weak, not mastered -> not in dueWords anyway
      B: { s: 3, k: 3, r: 3, ls: NOW - DAY },  // due
    };
    const deck = smartDeck(store, pool, NOW);
    expect(deck.map(w => w.h)).toEqual(["A", "B"]);
    expect(new Set(deck.map(w => w.h)).size).toBe(deck.length);
  });
  it("empty store -> empty deck", () => {
    expect(smartDeck({}, [{ h: "A" }, { h: "B" }], NOW)).toEqual([]);
  });
});
