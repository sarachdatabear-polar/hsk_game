import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Structural gate for the flashcard example-sentence payload (data/examples.*).
// Deep content checks (length, terminal punctuation, target-hanzi presence,
// no cloze overlap) live in build_examples_data.py, which refuses to emit bad
// rows; this guards what the game actually loads. EN-only by design this round
// (Thai goes through native review later), so no `th` field is expected.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const jsonPath = join(ROOT, "data", "examples.json");
const jsPath = join(ROOT, "data", "examples.js");
const words = JSON.parse(readFileSync(join(ROOT, "data", "words.json"), "utf8"));
const levelOf = {};
for (const [lv, arr] of Object.entries(words.levels))
  for (const w of arr) levelOf[w.h] = Math.min(levelOf[w.h] ?? 99, +lv);
const cloze = JSON.parse(readFileSync(join(ROOT, "data", "cloze.json"), "utf8"));

describe("data/examples.json", () => {
  it("exists alongside data/examples.js", () => {
    expect(existsSync(jsonPath)).toBe(true);
    expect(existsSync(jsPath)).toBe(true);
  });

  const examples = JSON.parse(readFileSync(jsonPath, "utf8"));

  it("data/examples.js is the same payload behind window.HSK_EXAMPLES", () => {
    const js = readFileSync(jsPath, "utf8");
    const m = js.match(/window\.HSK_EXAMPLES\s*=\s*(\{[\s\S]*\});/);
    expect(m, "examples.js must assign window.HSK_EXAMPLES").toBeTruthy();
    expect(JSON.parse(m[1])).toEqual(examples);
  });

  it("covers the HSK3 + HSK4 + HSK5 rounds (non-trivial, no cloze overlap)", () => {
    const keys = Object.keys(examples);
    expect(keys.length).toBeGreaterThan(2900);
    // These are the words WITHOUT a cloze sentence — the two sets are disjoint.
    for (const h of keys) expect(h in cloze, `${h} overlaps cloze`).toBe(false);
  });

  for (const [h, e] of Object.entries(examples)) {
    it(`${h}: valid example row`, () => {
      expect([3, 4, 5].includes(levelOf[h]), `${h} should be an HSK3/4/5 word`).toBe(true);
      expect(e.s.includes(h), `${h} present in sentence`).toBe(true);
      expect(["。", "？", "！"].includes(e.s.slice(-1)), "terminal punctuation").toBe(true);
      const body = e.s.slice(0, -1);
      expect(body.length).toBeGreaterThanOrEqual(5);
      expect(body.length).toBeLessThanOrEqual(16);
      expect(e.en.length).toBeGreaterThan(0);
      expect("th" in e, "EN-only round: no th field").toBe(false);
      expect("d" in e, "not a cloze row: no distractors").toBe(false);
    });
  }
});
