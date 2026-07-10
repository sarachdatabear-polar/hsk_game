import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// data/words.json: { manifest: {...}, levels: { "1": [ { h, p, e, t, lv, f, ... }, ... ], ... } }
const DATA = JSON.parse(readFileSync(new URL("../data/words.json", import.meta.url), "utf8"));

describe("gloss quality (audit F7)", () => {
  it("HSK1-3 glosses contain no mechanical '+' joins", () => {
    for (const lv of ["1", "2", "3"]) {
      const bad = DATA.levels[lv].filter(w => / \+ |\+ | \+/.test(w.e));
      expect(bad.map(w => `${lv}:${w.h}:${w.e}`)).toEqual([]);
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
