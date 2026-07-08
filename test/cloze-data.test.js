import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Structural gate for the cloze payload (deep content-quality checks —
// vocab levels, segmentation — live in build_cloze_data.py, which refuses
// to emit bad rows; this guards what the game actually loads).
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const jsonPath = join(ROOT, "data", "cloze.json");
const jsPath = join(ROOT, "data", "cloze.js");
const words = JSON.parse(readFileSync(join(ROOT, "data", "words.json"), "utf8"));
const levelOf = {};
for (const [lv, arr] of Object.entries(words.levels))
  for (const w of arr) levelOf[w.h] = Math.min(levelOf[w.h] ?? 99, +lv);

describe("data/cloze.json", () => {
  it("exists alongside data/cloze.js", () => {
    expect(existsSync(jsonPath)).toBe(true);
    expect(existsSync(jsPath)).toBe(true);
  });
  const cloze = JSON.parse(readFileSync(jsonPath, "utf8"));
  it("data/cloze.js is the same payload behind window.HSK_CLOZE", () => {
    const js = readFileSync(jsPath, "utf8");
    const m = js.match(/window\.HSK_CLOZE\s*=\s*(\{[\s\S]*\});/);
    expect(m, "cloze.js must assign window.HSK_CLOZE").toBeTruthy();
    expect(JSON.parse(m[1])).toEqual(cloze);
  });
  for (const [h, e] of Object.entries(cloze)) {
    it(`${h}: valid row`, () => {
      expect(levelOf[h], `${h} not HSK1-2`).toBeLessThanOrEqual(2);
      expect(e.s.split(h).length - 1, "target exactly once").toBe(1);
      expect(e.en.length).toBeGreaterThan(0);
      expect(e.th.length).toBeGreaterThan(0);
      expect(new Set(e.d).size).toBe(3);
      for (const d of e.d) {
        expect(levelOf[d], `distractor ${d} must be HSK vocab`).toBeDefined();
        expect(levelOf[d], `distractor ${d} above target level`).toBeLessThanOrEqual(levelOf[h]);
        expect(d).not.toBe(h);
        expect(e.s.includes(d), `distractor ${d} appears in sentence`).toBe(false);
      }
    });
  }
});
