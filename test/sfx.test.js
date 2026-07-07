import { describe, it, expect } from "vitest";
import { PACKS } from "../src/sfx.js";

const EVENT_ARRAYS = ["kill", "wrong", "bite"];

function checkSpec(spec) {
  expect(Number.isFinite(spec.f)).toBe(true);
  expect(spec.f).toBeGreaterThan(0);
  expect(Number.isFinite(spec.d)).toBe(true);
  expect(spec.d).toBeGreaterThan(0);
  expect(spec.v).toBeGreaterThan(0);
  expect(spec.v).toBeLessThanOrEqual(0.5);
  expect(typeof spec.w).toBe("string");
}

describe("sfx PACKS", () => {
  it("has default, bells, arcade, and lion-drum packs", () => {
    expect(Object.keys(PACKS).sort()).toEqual(["arcade", "bells", "default", "lion-drum"]);
  });

  it("every pack defines kill/wrong/bite/combo", () => {
    for (const name of Object.keys(PACKS)) {
      const pack = PACKS[name];
      for (const ev of EVENT_ARRAYS) {
        expect(Array.isArray(pack[ev])).toBe(true);
        expect(pack[ev].length).toBeGreaterThan(0);
      }
      expect(pack.combo).toBeTruthy();
      expect(Array.isArray(pack.combo.tones)).toBe(true);
      expect(pack.combo.tones.length).toBeGreaterThan(0);
    }
  });

  it("kill/wrong/bite specs have positive finite freq/dur and vol in (0, 0.5]", () => {
    for (const name of Object.keys(PACKS)) {
      const pack = PACKS[name];
      for (const ev of EVENT_ARRAYS) {
        for (const spec of pack[ev]) checkSpec(spec);
      }
    }
  });

  it("combo tones have positive finite dur and vol in (0, 0.5], and yield positive freqs for n=0..8", () => {
    for (const name of Object.keys(PACKS)) {
      const combo = PACKS[name].combo;
      for (const t of combo.tones) {
        expect(Number.isFinite(t.d)).toBe(true);
        expect(t.d).toBeGreaterThan(0);
        expect(t.v).toBeGreaterThan(0);
        expect(t.v).toBeLessThanOrEqual(0.5);
        expect(typeof t.w).toBe("string");
      }
      for (let n = 0; n <= 8; n++) {
        const base = 700 + Math.min(n, 8) * 60 + combo.boff;
        expect(base).toBeGreaterThan(0);
        expect(base * combo.mult).toBeGreaterThan(0);
      }
    }
  });

  it("default pack's kill/wrong/bite specs match today's exact values", () => {
    expect(PACKS.default.kill).toEqual([
      { f: 660, d: .09, w: "square", v: .15, at: 0 },
      { f: 880, d: .12, w: "square", v: .15, at: .07 },
    ]);
    expect(PACKS.default.wrong).toEqual([
      { f: 160, d: .25, w: "sawtooth", v: .18, at: 0 },
    ]);
    expect(PACKS.default.bite).toEqual([
      { f: 220, d: .12, w: "sawtooth", v: .2, at: 0 },
      { f: 110, d: .3, w: "sawtooth", v: .2, at: .1 },
    ]);
  });

  it("lion-drum pack has the full spec shape", () => {
    const p = PACKS["lion-drum"];
    expect(p).toBeTruthy();
    for (const k of ["kill", "wrong", "bite"]) {
      expect(Array.isArray(p[k])).toBe(true);
      for (const s of p[k]) {
        expect(typeof s.f).toBe("number");
        expect(typeof s.d).toBe("number");
        expect(typeof s.w).toBe("string");
        expect(typeof s.v).toBe("number");
      }
    }
    expect(Array.isArray(p.combo.tones)).toBe(true);
    expect(typeof p.combo.boff).toBe("number");
    expect(typeof p.combo.mult).toBe("number");
  });
});
