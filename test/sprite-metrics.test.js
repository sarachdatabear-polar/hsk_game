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
    expect(SPRITE_METRICS["cat-walk"]).toEqual({ l: 0, t: 62, r: 256, b: 200 });
    expect(SPRITE_METRICS["cat-happy"]).toEqual({ l: 7, t: 44, r: 235, b: 218 });
    expect(SPRITE_METRICS["raccoon-walk"]).toEqual({ l: 31, t: 12, r: 225, b: 244 });
    expect(SPRITE_METRICS["raccoon-happy"]).toEqual({ l: 8, t: 12, r: 248, b: 244 });
    expect(SPRITE_METRICS["cat-ninja-walk"]).toEqual({ l: 8, t: 57, r: 248, b: 244 });
  });
});
