import { describe, it, expect } from "vitest";
import { SPRITE_METRICS } from "../src/sprite-metrics.js";
import { SPRITE_NAMES } from "../src/sprites.js";

// sheets that get measured by scripts/gen_sprite_metrics.py: cat*-walk,
// cat*-happy, raccoon-walk, raccoon-happy (excludes still portraits like
// cat-guide/cat-portrait, which aren't frame sheets and aren't in
// SPRITE_NAMES's walk/happy naming anyway).
const SHEET_RE = /^(cat.*-(walk|happy)|raccoon-(walk|happy))$/;

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
    // cat-walk/cat-happy remeasured after the v2 upright side-profile art
    // (regenerated to match the raccoon; repacked via scripts/repack_cat_sheets.py).
    // cat-walk re-measured 2026-07-14 after the clean-matte walk regen (audit #7);
    // its bbox now matches cat-happy's (100×124 ≈ 99×127) — the upright walk frames
    // like the sitting pose, so size parity is natural, not just code-anchored.
    expect(SPRITE_METRICS["cat-walk"]).toEqual({ l: 78, t: 65, r: 178, b: 189 });
    expect(SPRITE_METRICS["cat-happy"]).toEqual({ l: 78, t: 62, r: 177, b: 189 });
    expect(SPRITE_METRICS["raccoon-walk"]).toEqual({ l: 31, t: 12, r: 225, b: 244 });
    expect(SPRITE_METRICS["raccoon-happy"]).toEqual({ l: 8, t: 12, r: 248, b: 244 });
    expect(SPRITE_METRICS["cat-ninja-walk"]).toEqual({ l: 8, t: 57, r: 248, b: 244 });
  });
});
