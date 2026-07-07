import { describe, it, expect } from "vitest";
import { BUILDINGS, DECO_IDS, streetPieces, streetProgress, streetMetrics } from "../src/street.js";
import { MILESTONES } from "../src/growth.js";

describe("street", () => {
  it("BUILDINGS mirrors growth MILESTONES levels", () => {
    expect(BUILDINGS.map(b => b.lv)).toEqual(MILESTONES.map(m => m.lv));
    expect(BUILDINGS.map(b => b.lv)).toEqual([5, 10, 20, 30, 50]);
  });

  it("streetPieces(1, []) is empty — nothing unlocked, nothing owned", () => {
    expect(streetPieces(1, [])).toEqual([]);
  });

  it("streetPieces(10, []) has exactly 2 buildings in ascending slot order", () => {
    const pieces = streetPieces(10, []);
    expect(pieces.length).toBe(2);
    expect(pieces.every(p => p.kind === "building")).toBe(true);
    expect(pieces.map(p => p.id)).toEqual(["lantern-post", "coin-bank"]);
    expect(pieces[0].slot).toBeLessThan(pieces[1].slot);
  });

  it("decos appear only when owned, in DECO_IDS order", () => {
    const owned = ["golden-arch", "red-lantern"]; // out-of-order ownership
    const pieces = streetPieces(1, owned).filter(p => p.kind === "deco");
    expect(pieces.map(p => p.id)).toEqual(["red-lantern", "golden-arch"]);
  });

  it("unknown owned ids are ignored", () => {
    const pieces = streetPieces(1, ["midnight", "bells", "red-lantern"]);
    expect(pieces.map(p => p.id)).toEqual(["red-lantern"]);
  });

  it("is deterministic — two calls with the same inputs deep-equal", () => {
    const a = streetPieces(30, ["red-lantern", "tea-sign"]);
    const b = streetPieces(30, ["red-lantern", "tea-sign"]);
    expect(a).toEqual(b);
  });

  it("all slots are within [0,1] and unique per call", () => {
    const pieces = streetPieces(50, DECO_IDS.slice());
    for (const p of pieces) {
      expect(p.slot).toBeGreaterThanOrEqual(0);
      expect(p.slot).toBeLessThanOrEqual(1);
    }
    const slots = pieces.map(p => p.slot);
    expect(new Set(slots).size).toBe(slots.length);
  });

  it("at max level with everything owned, all 5 buildings + 15 decos appear", () => {
    const pieces = streetPieces(50, DECO_IDS.slice());
    expect(pieces.length).toBe(20);
    expect(pieces.filter(p => p.kind === "building").length).toBe(5);
    expect(pieces.filter(p => p.kind === "deco").length).toBe(15);
  });

  it("streetProgress counts unlocked buildings and finds the next one", () => {
    expect(streetProgress(1)).toEqual({ unlocked: 0, total: 5, next: { lv: 5, name: "Lantern Post" } });
    expect(streetProgress(4)).toEqual({ unlocked: 0, total: 5, next: { lv: 5, name: "Lantern Post" } });
    expect(streetProgress(5)).toEqual({ unlocked: 1, total: 5, next: { lv: 10, name: "Coin Bank" } });
    expect(streetProgress(49)).toEqual({ unlocked: 4, total: 5, next: { lv: 50, name: "Emperor's Gate" } });
    expect(streetProgress(50)).toEqual({ unlocked: 5, total: 5, next: null });
  });

  it("DECO_IDS covers every catalog deco exactly (v7 cross-module guard)", async () => {
    const { CATALOG } = await import("../src/shop.js");
    const catalogDecos = CATALOG.filter(i => i.type === "deco").map(i => i.id);
    expect([...DECO_IDS].sort()).toEqual([...catalogDecos].sort());
    expect(DECO_IDS.length).toBe(15);
  });

  it("all 15 deco slots are unique and inside (0,1)", () => {
    const pieces = streetPieces(1, [...DECO_IDS]);
    expect(pieces.length).toBe(15);
    const slots = pieces.map(p => p.slot);
    expect(new Set(slots).size).toBe(15);
    for (const s of slots) { expect(s).toBeGreaterThan(0); expect(s).toBeLessThan(1); }
  });

  it("deco pieces carry their tier; default 1; buildings carry none", () => {
    const pieces = streetPieces(10, ["red-lantern", "koi-pond"], { "koi-pond": 3 });
    const lantern = pieces.find(p => p.id === "red-lantern");
    const koi = pieces.find(p => p.id === "koi-pond");
    const building = pieces.find(p => p.kind === "building");
    expect(lantern.tier).toBe(1);
    expect(koi.tier).toBe(3);
    expect(building.tier).toBeUndefined();
  });

  it("two-argument call still works (tiers defaults to {})", () => {
    const pieces = streetPieces(1, ["red-lantern"]);
    expect(pieces[0].tier).toBe(1);
  });
});

describe("streetMetrics", () => {
  it("returns object with unit, backY, frontY, backScale", () => {
    const m = streetMetrics(300, 400);
    expect(m).toHaveProperty("unit");
    expect(m).toHaveProperty("backY");
    expect(m).toHaveProperty("frontY");
    expect(m).toHaveProperty("backScale");
  });

  it("unit is the minimum of h*0.30 and w*0.062", () => {
    // h-bound case: tall canvas (300w, 400h)
    // unit = Math.min(400 * 0.30, 300 * 0.062) = Math.min(120, 18.6) = 18.6
    const tall = streetMetrics(300, 400);
    expect(tall.unit).toBeCloseTo(Math.min(120, 18.6), 5);

    // w-bound case: wide canvas (1000w, 200h)
    // unit = Math.min(200 * 0.30, 1000 * 0.062) = Math.min(60, 62) = 60
    const wide = streetMetrics(1000, 200);
    expect(wide.unit).toBeCloseTo(Math.min(60, 62), 5);
  });

  it("backY and frontY are constant fractions", () => {
    const m1 = streetMetrics(100, 200);
    const m2 = streetMetrics(500, 800);
    expect(m1.backY).toBe(0.86);
    expect(m1.frontY).toBe(1.0);
    expect(m2.backY).toBe(0.86);
    expect(m2.frontY).toBe(1.0);
  });

  it("backY is less than frontY", () => {
    const m = streetMetrics(400, 300);
    expect(m.backY).toBeLessThan(m.frontY);
  });

  it("backScale is constant and less than 1", () => {
    const m1 = streetMetrics(100, 200);
    const m2 = streetMetrics(800, 600);
    expect(m1.backScale).toBe(0.78);
    expect(m2.backScale).toBe(0.78);
    expect(m1.backScale).toBeLessThan(1);
  });

  it("all outputs are finite and positive for w,h ∈ [1, 2000]", () => {
    for (let w = 1; w <= 2000; w += 100) {
      for (let h = 1; h <= 2000; h += 100) {
        const m = streetMetrics(w, h);
        expect(Number.isFinite(m.unit)).toBe(true);
        expect(m.unit).toBeGreaterThan(0);
        expect(Number.isFinite(m.backY)).toBe(true);
        expect(m.backY).toBeGreaterThan(0);
        expect(Number.isFinite(m.frontY)).toBe(true);
        expect(m.frontY).toBeGreaterThan(0);
        expect(Number.isFinite(m.backScale)).toBe(true);
        expect(m.backScale).toBeGreaterThan(0);
      }
    }
  });

  it("two calls with same inputs deep-equal", () => {
    const a = streetMetrics(300, 400);
    const b = streetMetrics(300, 400);
    expect(a).toEqual(b);
  });
});
