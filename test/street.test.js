import { describe, it, expect } from "vitest";
import { BUILDINGS, DECO_IDS, streetPieces, streetProgress } from "../src/street.js";
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
