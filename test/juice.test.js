import { describe, it, expect } from "vitest";
import { comboGlowTier, plaqueBounce, countUpValue } from "../src/juice.js";

describe("comboGlowTier", () => {
  it("maps combo to escalation tiers at 5/10/15 (PRD A3)", () => {
    expect(comboGlowTier(0)).toBe(0);
    expect(comboGlowTier(4)).toBe(0);
    expect(comboGlowTier(5)).toBe(1);
    expect(comboGlowTier(9)).toBe(1);
    expect(comboGlowTier(10)).toBe(2);
    expect(comboGlowTier(14)).toBe(2);
    expect(comboGlowTier(15)).toBe(3);
    expect(comboGlowTier(99)).toBe(3);
  });
});

describe("plaqueBounce", () => {
  it("is 0 before the hit and after the bounce window", () => {
    expect(plaqueBounce(-1)).toBe(0);
    expect(plaqueBounce(450)).toBe(0);
    expect(plaqueBounce(10000)).toBe(0);
    expect(plaqueBounce(Infinity)).toBe(0);
  });
  it("moves within the window and damps toward the end", () => {
    const early = Math.abs(plaqueBounce(60));
    const late = Math.abs(plaqueBounce(430));
    expect(early).toBeGreaterThan(0);
    expect(late).toBeLessThan(early);
  });
  it("never exceeds the 10px amplitude", () => {
    for (let ms = 0; ms < 450; ms += 15) {
      expect(Math.abs(plaqueBounce(ms))).toBeLessThanOrEqual(10);
    }
  });
});

describe("countUpValue", () => {
  it("hits exact endpoints", () => {
    expect(countUpValue(0, 480, 0)).toBe(0);
    expect(countUpValue(0, 480, 1)).toBe(480);
    expect(countUpValue(100, 100, 0.5)).toBe(100);
  });
  it("is monotonic and eases out (fast start)", () => {
    let prev = -1;
    for (let f = 0; f <= 1.0001; f += 0.05) {
      const v = countUpValue(0, 1000, Math.min(1, f));
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    expect(countUpValue(0, 1000, 0.5)).toBeGreaterThan(500); // ease-out: past halfway early
  });
  it("clamps frac outside [0,1]", () => {
    expect(countUpValue(0, 50, -0.2)).toBe(0);
    expect(countUpValue(0, 50, 1.7)).toBe(50);
  });
});
