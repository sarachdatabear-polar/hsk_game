// Analysis/design validation ONLY — not a real feature, not a migration.
// Proves that adding an optional `h3` (HSK-3.0 level) facet to word records
// does not change the output of any persisted-key-producing pure function.
// Uses a hand-written SYNTHETIC fixture; touches no production module, no
// real data, no migrations.
import { describe, it, expect } from "vitest";
import { buildPool, scopeKey } from "../src/pool.js";
import { stickerDefs } from "../src/stickers.js";
import { recordAnswer, isMastered } from "../src/mastery.js";
import { cardSessionKey } from "../src/flashcards.js";

// --- synthetic fixture: a few words per level, minimal but realistic shape ---
function makeLevels() {
  return {
    "1": [
      { h: "妈妈", p: "mā ma", e: "mother", t: "แม่", lv: 1, f: 50, ta: 5, tt: 5, c: 1, n: 1 },
      { h: "水",   p: "shuǐ",  e: "water",  t: "น้ำ", lv: 1, f: 30, ta: 4, tt: 5, c: 1, n: 1 },
      { h: "猫",   p: "māo",   e: "cat",    t: "",    lv: 1, f: 2,  ta: 1, tt: 5, c: 0, n: 1 },
    ],
    "2": [
      { h: "妈妈", p: "mā ma", e: "mother", t: "แม่",   lv: 2, f: 40, ta: 6, tt: 6, c: 1, n: 0 },
      { h: "高兴", p: "gāo xìng", e: "happy", t: "ดีใจ", lv: 2, f: 25, ta: 6, tt: 6, c: 1, n: 1 },
      { h: "跑",   p: "pǎo",   e: "to run", t: "วิ่ง",  lv: 2, f: 1,  ta: 1, tt: 6, c: 0, n: 1 },
    ],
    "3": [
      { h: "老师", p: "lǎo shī", e: "teacher", t: "ครู", lv: 3, f: 15, ta: 3, tt: 4, c: 1, n: 1 },
      { h: "书",   p: "shū",     e: "book",    t: "หนังสือ", lv: 3, f: 5, ta: 2, tt: 4, c: 0, n: 1 },
    ],
  };
}

// A synthetic HSK-3.0 level facet — arbitrary values, chosen only to be
// "present and different from lv" so we'd notice if anything read them.
const H3_BY_HANZI = { "妈妈": 1, "水": 1, "猫": 2, "高兴": 2, "跑": 3, "老师": 4, "书": 3 };

function withH3(levels) {
  const out = {};
  for (const lv of Object.keys(levels)) {
    out[lv] = levels[lv].map(w => ({ ...w, h3: H3_BY_HANZI[w.h] }));
  }
  return out;
}

const LEVELS_BEFORE = makeLevels();
const LEVELS_AFTER = withH3(makeLevels());

describe("h3 facet invariant: scopeKey", () => {
  // scopeKey reads only scope.{levels,core,newOnly,topN} — never word records —
  // so h3 cannot affect it. Assert the concrete key strings so this also guards
  // the key FORMAT that saved-session and sticker keys are built on (a format
  // change would silently orphan them).
  const cases = [
    { name: "single-level", scope: { levels: [2], core: false, newOnly: false, topN: 0 }, key: "HSK2" },
    { name: "contiguous-run", scope: { levels: [1, 2, 3], core: false, newOnly: false, topN: 300 }, key: "HSK1+2+3·top300" },
    { name: "disjoint + core + newOnly", scope: { levels: [1, 3], core: true, newOnly: true, topN: 500 }, key: "HSK1+3·HY·NEW·top500" },
  ];
  for (const { name, scope, key } of cases) {
    it(`${name}: scopeKey is the expected string and word-record-independent`, () => {
      expect(scopeKey(scope)).toBe(key);
    });
  }
});

describe("h3 facet invariant: saved-session key (cardSessionKey)", () => {
  // cardSessionKey(scopeKey, length) — src/flashcards.js:12. Depends only on
  // the scope key string and session length, never on word-record shape.
  const scope = { levels: [1, 2], core: false, newOnly: false, topN: 100 };
  const len = 20;

  it("is the expected concrete string even when the pool is built from h3-carrying records", () => {
    const poolBefore = buildPool(LEVELS_BEFORE, scope);
    const poolAfter = buildPool(LEVELS_AFTER, scope);
    // meaningful comparison: h3 is genuinely absent before, present after.
    expect(poolBefore.some(w => "h3" in w)).toBe(false);
    expect(poolAfter.every(w => "h3" in w)).toBe(true);
    // the saved-session key is the concrete expected value regardless.
    expect(cardSessionKey(scopeKey(scope), len)).toBe("HSK1+2·top100·cards20");
  });
});

describe("h3 facet invariant: stickerDefs ids", () => {
  it("every def.id is unchanged — stickerDefs is driven by levelCounts, not word records", () => {
    // stickerDefs never sees word records at all (it takes levelCounts), but
    // levelCounts itself is derived from level word-arrays elsewhere in the
    // app (scopeFacts). Confirm counts computed from BEFORE/AFTER fixtures
    // agree, then confirm the resulting def ids are identical.
    const countsBefore = { 1: LEVELS_BEFORE["1"].length, 2: LEVELS_BEFORE["2"].length, 3: LEVELS_BEFORE["3"].length };
    const countsAfter = { 1: LEVELS_AFTER["1"].length, 2: LEVELS_AFTER["2"].length, 3: LEVELS_AFTER["3"].length };
    expect(countsAfter).toEqual(countsBefore);

    const defsBefore = stickerDefs(countsBefore);
    const defsAfter = stickerDefs(countsAfter);
    expect(defsAfter.map(d => d.id)).toEqual(defsBefore.map(d => d.id));

    // Cover all three kinds explicitly, per the task.
    const scopeIds = defsBefore.filter(d => d.kind === "scope").map(d => d.id);
    const msIds = defsBefore.filter(d => d.kind === "milestone").map(d => d.id);
    const evIds = defsBefore.filter(d => d.kind === "event").map(d => d.id);
    expect(msIds.length).toBeGreaterThan(0);
    expect(evIds.length).toBeGreaterThan(0);
    // scopeIds may be empty for tiny fixtures (levels smaller than TOP_NS) —
    // assert the id *shape* is right whenever any exist, rather than assuming
    // a nonzero count from a synthetic 2-3 word level.
    for (const id of scopeIds) expect(id).toMatch(/^scope:HSK\d+·top\d+$/);
    for (const id of msIds) expect(id).toMatch(/^ms:HSK\d+:\d+$/);
    for (const id of evIds) expect(id).toMatch(/^ev:.+$/);
  });
});

describe("h3 facet invariant: mastery (recordAnswer / isMastered)", () => {
  it("outcomes keyed on w.h are identical with or without h3 on the word record", () => {
    const wordBefore = LEVELS_BEFORE["1"].find(w => w.h === "妈妈");
    const wordAfter = LEVELS_AFTER["1"].find(w => w.h === "妈妈");
    expect("h3" in wordBefore).toBe(false);
    expect("h3" in wordAfter).toBe(true);

    const storeBefore = {};
    const storeAfter = {};
    for (const correct of [true, true, false, true, true, true]) {
      recordAnswer(storeBefore, wordBefore.h, correct, 1000);
      recordAnswer(storeAfter, wordAfter.h, correct, 1000);
    }
    expect(storeAfter).toEqual(storeBefore);
    expect(isMastered(storeAfter, wordAfter.h)).toBe(isMastered(storeBefore, wordBefore.h));
    expect(isMastered(storeAfter, wordAfter.h)).toBe(true);
  });
});

describe("h3 facet invariant: buildPool word selection", () => {
  const scopes = [
    { name: "single level", scope: { levels: [2], core: false, newOnly: false, topN: 0 } },
    { name: "multi-level merge", scope: { levels: [1, 2], core: false, newOnly: false, topN: 0 } },
    { name: "core filter", scope: { levels: [1, 2], core: true, newOnly: false, topN: 0 } },
    { name: "newOnly filter", scope: { levels: [2], core: false, newOnly: true, topN: 0 } },
    { name: "topN cap", scope: { levels: [1, 2, 3], core: false, newOnly: false, topN: 3 } },
  ];
  for (const { name, scope } of scopes) {
    it(`${name}: same hanzi set selected — buildPool reads lv, not h3`, () => {
      const before = buildPool(LEVELS_BEFORE, scope).map(w => w.h);
      const after = buildPool(LEVELS_AFTER, scope).map(w => w.h);
      expect(after).toEqual(before);
    });
  }
});
