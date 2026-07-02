import { describe, it, expect } from "vitest";
import { buildPool, coveragePct, scopeKey, meaning } from "../src/pool.js";
import { LEVELS, MANIFEST } from "./fixtures.js";

const base = { levels: [1, 2], core: false, newOnly: false, topN: 0 };

describe("buildPool", () => {
  it("merges duplicates by hanzi, keeping lowest level and highest freq", () => {
    const pool = buildPool(LEVELS, base);
    const mama = pool.find(w => w.h === "妈妈");
    expect(pool.filter(w => w.h === "妈妈")).toHaveLength(1);
    expect(mama.lv).toBe(1);        // lowest first-seen level
    expect(mama.f).toBe(50);        // highest single-level freq
    expect(mama.fs).toBe(90);       // 50 + 40 summed for coverage math
  });
  it("sorts by frequency descending and applies topN", () => {
    const pool = buildPool(LEVELS, { ...base, topN: 2 });
    expect(pool.map(w => w.h)).toEqual(["妈妈", "水"]);
  });
  it("core filter keeps only c===1", () => {
    const pool = buildPool(LEVELS, { ...base, core: true });
    expect(pool.every(w => w.c === 1)).toBe(true);
    expect(pool.map(w => w.h)).toContain("高兴");
  });
  it("newOnly keeps words whose lowest-level record is new", () => {
    const pool = buildPool(LEVELS, { levels: [2], core: false, newOnly: true, topN: 0 });
    expect(pool.map(w => w.h)).toEqual(["高兴", "跑"]); // 妈妈 is recycled at lv2
  });
});

describe("coveragePct", () => {
  it("is fs-sum over manifest freq_total, capped at 99", () => {
    const pool = buildPool(LEVELS, base);
    // fs total = 90+30+2+25+1 = 148; denom = 82+66 = 148 -> 100 -> capped 99
    expect(coveragePct(pool, MANIFEST, [1, 2])).toBe(99);
  });
});

describe("scopeKey", () => {
  it("encodes levels and filters", () => {
    expect(scopeKey({ levels: [1, 2, 3], core: true, newOnly: false, topN: 300 }))
      .toBe("HSK1+2+3·HY·top300");
  });
});

describe("meaning", () => {
  const th = { e: "cat", t: "แมว" };
  const noTh = { e: "cat", t: "" };
  it("thai mode falls back to english with * marker", () => {
    expect(meaning(th, "th")).toEqual({ main: "แมว", sub: "" });
    expect(meaning(noTh, "th")).toEqual({ main: "cat *", sub: "" });
  });
  it("both mode puts english main, thai sub", () => {
    expect(meaning(th, "both")).toEqual({ main: "cat", sub: "แมว" });
  });
  it("english mode returns english with no sub", () => {
    expect(meaning(th, "en")).toEqual({ main: "cat", sub: "" });
  });
});

describe("buildPool merge fills empty fields from a later level", () => {
  // Same hanzi at two levels: lv1 has empty Thai, lv2 supplies it. The merged
  // record must keep lv1 as first-seen level but adopt lv2's non-empty Thai.
  const LV = {
    "1": [{ h: "书", p: "shū", e: "book", t: "",     lv: 1, f: 20, ta: 2, tt: 5, c: 1, n: 1 }],
    "2": [{ h: "书", p: "shū", e: "",     t: "หนังสือ", lv: 2, f: 10, ta: 1, tt: 6, c: 0, n: 0 }]
  };
  it("prefers the non-empty thai while keeping lowest level and highest freq", () => {
    const [w] = buildPool(LV, { levels: [1, 2], core: false, newOnly: false, topN: 0 });
    expect(w.t).toBe("หนังสือ");   // filled from lv2
    expect(w.e).toBe("book");      // lv1's english kept (lv2's was empty)
    expect(w.lv).toBe(1);          // lowest first-seen level
    expect(w.f).toBe(20);          // highest single-level freq
    expect(w.fs).toBe(30);         // summed
  });
});
