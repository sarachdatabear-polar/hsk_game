import { describe, it, expect } from "vitest";
import { coinBurst, comboFloater, fireworkRing, feedbackEffect, perfectBonus } from "../src/fx.js";

function allFinite(specs, keys) {
  return specs.every(s => keys.every(k => Number.isFinite(s[k])));
}

describe("coinBurst", () => {
  it("normal kill: 12 specs, 5 coin + 7 dot", () => {
    const specs = coinBurst(10, 20, false);
    expect(specs.length).toBe(12);
    expect(specs.filter(s => s.kind === "coin").length).toBe(5);
    expect(specs.filter(s => s.kind === "dot").length).toBe(7);
  });
  it("boss kill: 28 specs, 12 coin + 16 dot", () => {
    const specs = coinBurst(10, 20, true);
    expect(specs.length).toBe(28);
    expect(specs.filter(s => s.kind === "coin").length).toBe(12);
    expect(specs.filter(s => s.kind === "dot").length).toBe(16);
  });
  it("carries the origin point and finite randomized velocities/life", () => {
    const specs = coinBurst(42, 7, false);
    expect(allFinite(specs, ["x", "y", "vx", "vy", "life"])).toBe(true);
    for (const s of specs) {
      expect(s.x).toBe(42); expect(s.y).toBe(7);
      expect(Math.abs(s.vx)).toBeLessThanOrEqual(240);
      expect(s.vy).toBeLessThanOrEqual(0);
      expect(s.vy).toBeGreaterThanOrEqual(-200);
      expect(s.life).toBeGreaterThanOrEqual(0.6);
      expect(s.life).toBeLessThanOrEqual(0.9);
    }
  });
  it("boss particles can fly a bit faster/higher than normal", () => {
    const specs = coinBurst(0, 0, true);
    for (const s of specs) expect(s.vy).toBeGreaterThanOrEqual(-260);
  });

  it("default path is unchanged when style is omitted or falsy", () => {
    const specs = coinBurst(10, 20, false, undefined);
    expect(specs.length).toBe(12);
    expect(specs.filter(s => s.kind === "coin").length).toBe(5);
    expect(specs.filter(s => s.kind === "dot").length).toBe(7);
    expect(specs.every(s => s.g === undefined)).toBe(true);
  });

  it("sakura-fx: same counts, all petal, slow-fall g, narrower vx", () => {
    const normal = coinBurst(10, 20, false, "sakura-fx");
    expect(normal.length).toBe(12);
    expect(normal.every(s => s.kind === "petal")).toBe(true);
    expect(normal.every(s => s.g === 120)).toBe(true);
    for (const s of normal) {
      expect(Math.abs(s.vx)).toBeLessThanOrEqual(140);
      expect(s.life).toBeGreaterThanOrEqual(0.9);
      expect(s.life).toBeLessThanOrEqual(1.3);
    }
    const boss = coinBurst(10, 20, true, "sakura-fx");
    expect(boss.length).toBe(28);
    expect(boss.every(s => s.kind === "petal")).toBe(true);
  });

  it("firecracker-fx: default count + 6, cracker/spark split, faster vx", () => {
    const normal = coinBurst(10, 20, false, "firecracker-fx");
    expect(normal.length).toBe(18);   // 12 + 6
    expect(normal.filter(s => s.kind === "cracker").length).toBe(5);
    expect(normal.filter(s => s.kind === "spark").length).toBe(13);
    for (const s of normal) expect(Math.abs(s.vx)).toBeLessThanOrEqual(480 * 1.3);

    const boss = coinBurst(10, 20, true, "firecracker-fx");
    expect(boss.length).toBe(34);   // 28 + 6
    expect(boss.filter(s => s.kind === "cracker").length).toBe(12);
    expect(boss.filter(s => s.kind === "spark").length).toBe(22);
  });
});

describe("comboFloater", () => {
  it("null below a 3-combo", () => {
    expect(comboFloater(0, 0, 0)).toBeNull();
    expect(comboFloater(0, 0, 1)).toBeNull();
    expect(comboFloater(0, 0, 2)).toBeNull();
  });
  it("formats the combo text and rises with a fixed life at combo >= 3", () => {
    const f = comboFloater(10, 20, 3);
    expect(f).toEqual({ x: 10, y: 20, text: "x3", life: 0.9, vy: -60 });
  });
  it("formats larger combos", () => {
    expect(comboFloater(0, 0, 15).text).toBe("x15");
  });
});

describe("fireworkRing", () => {
  it("16 evenly-spaced specs at a fixed speed and life", () => {
    const specs = fireworkRing(5, 6);
    expect(specs.length).toBe(16);
    expect(specs.every(s => s.kind === "spark")).toBe(true);
    expect(specs.every(s => s.life === 0.8)).toBe(true);
    for (const s of specs) {
      expect(Math.hypot(s.vx, s.vy)).toBeCloseTo(170, 5);
    }
  });
  it("angles step by 2*PI/16 starting at 0", () => {
    const specs = fireworkRing(0, 0);
    expect(specs[0].vx).toBeCloseTo(170, 5);
    expect(specs[0].vy).toBeCloseTo(0, 5);
    expect(specs[4].vx).toBeCloseTo(0, 5);
    expect(specs[4].vy).toBeCloseTo(170, 5);
    expect(specs[8].vx).toBeCloseTo(-170, 5);
    expect(specs[8].vy).toBeCloseTo(0, 5);
  });
  it("carries the origin point and finite values", () => {
    const specs = fireworkRing(9, 3);
    expect(allFinite(specs, ["x", "y", "vx", "vy", "life"])).toBe(true);
    expect(specs.every(s => s.x === 9 && s.y === 3)).toBe(true);
  });
});

describe("feedbackEffect", () => {
  it("maps kinds to fx stamps and orb bursts", () => {
    expect(feedbackEffect("correct", 10, 20)).toMatchObject({ kind: "correct", x: 10, y: 20, sprite: "fx-correct", orb: "vfx-orb-green" });
    expect(feedbackEffect("wrong", 10, 20)).toMatchObject({ kind: "wrong", sprite: "fx-wrong", orb: "vfx-orb-red" });
    expect(feedbackEffect("critical", 10, 20)).toMatchObject({ kind: "critical", sprite: "fx-critical", orb: "vfx-orb-gold" });
  });

  it("streak milestone gets a blue orb and no stamp", () => {
    expect(feedbackEffect("streak", 5, 6)).toMatchObject({ kind: "streak", x: 5, y: 6, life: 0.75, sprite: null, orb: "vfx-orb-blue" });
  });
});

describe("perfectBonus", () => {
  it("25% of score, rounded", () => {
    expect(perfectBonus(100)).toBe(25);
    expect(perfectBonus(101)).toBe(25);   // 25.25 -> 25
    expect(perfectBonus(0)).toBe(0);
  });
  it("caps at 500", () => {
    expect(perfectBonus(3000)).toBe(500);   // 750 -> capped
    expect(perfectBonus(10000)).toBe(500);
  });
  it("does not cap below the threshold", () => {
    expect(perfectBonus(1996)).toBe(499);   // 499
  });
});
