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
});
