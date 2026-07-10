import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// data/words.json: { manifest: {...}, levels: { "1": [ { h, p, e, t, lv, f, ... }, ... ], ... } }
const DATA = JSON.parse(readFileSync(new URL("../data/words.json", import.meta.url), "utf8"));

describe("gloss quality (audit F7)", () => {
  it("glosses contain no mechanical '+' joins at any level", () => {
    // HSK1-3 cleared in audit-v50; HSK4-6 deep tail cleared in the 2026-07-10
    // gloss round (3,115 rows) — the whole corpus is '+'-free from here on.
    for (const lv of Object.keys(DATA.levels)) {
      const bad = DATA.levels[lv].filter(w => / \+ |\+ | \+/.test(w.e));
      expect(bad.map(w => `${lv}:${w.h}:${w.e}`)).toEqual([]);
    }
  });

  it("thai glosses contain no mechanical '+' joins at any level", () => {
    // The thai column is user-facing too — 18 joined rows were fixed in the
    // 2026-07-10 gloss round (e.g. 城中 'เมืองกำแพง + จีน' → 'ในเมือง').
    for (const lv of Object.keys(DATA.levels)) {
      const bad = DATA.levels[lv].filter(w => / \+ |\+ | \+/.test(w.t));
      expect(bad.map(w => `${lv}:${w.h}:${w.t}`)).toEqual([]);
    }
  });

  it("no hanzi mixes '+' and non-'+' glosses across levels", () => {
    // A word's gloss should read the same everywhere it recurs — if one level's
    // '+' join was rewritten (audit-v50 gloss fixes), every level sharing that
    // exact (hanzi, english) pair must have been rewritten too. This pins the
    // cross-level propagation fix (Task 6 fix wave) against regressions.
    const PLUS = / \+ |\+ | \+/;
    const byHanzi = new Map();
    for (const lv of Object.keys(DATA.levels)) {
      for (const w of DATA.levels[lv]) {
        if (!byHanzi.has(w.h)) byHanzi.set(w.h, []);
        byHanzi.get(w.h).push({ lv, e: w.e });
      }
    }

    const offenders = [];
    for (const [hanzi, entries] of byHanzi) {
      const hasPlus = entries.some(en => PLUS.test(en.e));
      const hasNonPlus = entries.some(en => !PLUS.test(en.e));
      if (hasPlus && hasNonPlus) {
        offenders.push(`${hanzi}: ${entries.map(en => `${en.lv}="${en.e}"`).join(", ")}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
