import { describe, it, expect } from "vitest";
import { SPRITE_METRICS } from "../src/sprite-metrics.js";
import { SPRITE_NAMES } from "../src/sprites.js";

// sheets that get measured by scripts/gen_sprite_metrics.py: cat*-walk,
// cat*-happy, raccoon-walk, raccoon-happy, raccoon-wrong (excludes still
// portraits like cat-guide/cat-portrait, which aren't frame sheets and
// aren't in SPRITE_NAMES's walk/happy/wrong naming anyway).
const SHEET_RE = /^(cat.*-(walk|happy)|raccoon-(walk|happy|wrong))$/;

describe("SPRITE_METRICS", () => {
  it("has an entry for every character sheet referenced in sprites.js", () => {
    const characterSheets = SPRITE_NAMES.filter(n => SHEET_RE.test(n));
    expect(characterSheets.length).toBeGreaterThan(0);
    for (const name of characterSheets) {
      expect(SPRITE_METRICS, `missing metrics for "${name}"`).toHaveProperty(name);
    }
  });

  it("every entry is a well-formed box within a 256px frame", () => {
    for (const [name, m] of Object.entries(SPRITE_METRICS)) {
      expect(m.l, `${name}.l`).toBeGreaterThanOrEqual(0);
      expect(m.l, `${name}.l < r`).toBeLessThan(m.r);
      expect(m.r, `${name}.r`).toBeLessThanOrEqual(256);
      expect(m.t, `${name}.t`).toBeGreaterThanOrEqual(0);
      expect(m.t, `${name}.t < b`).toBeLessThan(m.b);
      expect(m.b, `${name}.b`).toBeLessThanOrEqual(256);
    }
  });

  // Guards against a silently wrong regeneration (e.g. a PIL/alpha-mode
  // change quietly shifting every measurement) — spot-check reference
  // values Jordan measured by hand.
  it("matches known reference measurements (regression guard)", () => {
    // cat-walk/cat-happy remeasured after the Home-mascot alignment: the
    // cream-and-orange cat, red scarf, and green book now match cat-study and
    // cat-portrait while preserving the 256px frame contract and baseline.
    expect(SPRITE_METRICS["cat-walk"]).toEqual({ l: 38, t: 12, r: 217, b: 244 });
    expect(SPRITE_METRICS["cat-happy"]).toEqual({ l: 30, t: 12, r: 226, b: 244 });
    expect(SPRITE_METRICS["raccoon-walk"]).toEqual({ l: 31, t: 12, r: 225, b: 244 });
    expect(SPRITE_METRICS["raccoon-happy"]).toEqual({ l: 8, t: 12, r: 248, b: 244 });
    // raccoon-wrong: dedicated retreat-hop sheet (2026-07-21); union bbox
    // includes frame 3's mid-air apex, so t=0 (top of the hop) while b=232
    // reflects the grounded frames' feet.
    expect(SPRITE_METRICS["raccoon-wrong"]).toEqual({ l: 34, t: 0, r: 221, b: 232 });
    expect(SPRITE_METRICS["cat-ninja-walk"]).toEqual({ l: 8, t: 57, r: 248, b: 244 });
  });
});
