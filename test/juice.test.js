import { describe, it, expect } from "vitest";
import { comboGlowTier, plaqueBounce, countUpValue, lungeOffset, bumpOffset, hurtSquash } from "../src/juice.js";

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

describe("lungeOffset", () => {
  it("is neutral before the trigger, after the window, and at t=Infinity (REDUCED_MOTION feed)", () => {
    expect(lungeOffset(-1)).toEqual({ dx: 0, sx: 1, sy: 1 });
    expect(lungeOffset(320)).toEqual({ dx: 0, sx: 1, sy: 1 });
    expect(lungeOffset(Infinity)).toEqual({ dx: 0, sx: 1, sy: 1 });
  });
  it("is coiled (sx 1.1/sy 0.9) right at launch and relaxes toward neutral", () => {
    const launch = lungeOffset(0);
    expect(launch.sx).toBeCloseTo(1.1, 5);
    expect(launch.sy).toBeCloseTo(0.9, 5);
    const late = lungeOffset(300);
    expect(late.sx).toBeLessThan(launch.sx);
    expect(late.sx).toBeGreaterThan(1);
    expect(late.sy).toBeGreaterThan(launch.sy);
    expect(late.sy).toBeLessThan(1);
  });
  it("dx peaks forward (~+14) around t=120 then eases back to 0 by 320", () => {
    expect(lungeOffset(0).dx).toBe(0);
    const peak = lungeOffset(120);
    expect(peak.dx).toBeCloseTo(14, 0);
    const late = lungeOffset(300);
    expect(late.dx).toBeGreaterThan(0);
    expect(late.dx).toBeLessThan(peak.dx);
  });
  it("dx never goes negative or past the documented peak (forward-only lunge)", () => {
    for (let t = 0; t < 320; t += 10) {
      const { dx } = lungeOffset(t);
      expect(dx).toBeGreaterThanOrEqual(0);
      expect(dx).toBeLessThanOrEqual(14 + 1e-9);
    }
  });
});

describe("bumpOffset", () => {
  it("is neutral before the trigger, after the window, and at t=Infinity", () => {
    expect(bumpOffset(-1, 50)).toEqual({ dx: 0 });
    expect(bumpOffset(420, 50)).toEqual({ dx: 0 });
    expect(bumpOffset(Infinity, 50)).toEqual({ dx: 0 });
  });
  it("eases in toward -dist, reaching it by 160ms", () => {
    expect(bumpOffset(0, 50).dx).toBeCloseTo(0, 9);
    expect(bumpOffset(80, 50).dx).toBeLessThan(0);
    expect(bumpOffset(80, 50).dx).toBeGreaterThan(-50);
    expect(bumpOffset(160, 50).dx).toBeCloseTo(-50, 5);
  });
  it("holds at -dist through the 60ms hold window (160-220)", () => {
    expect(bumpOffset(180, 50).dx).toBeCloseTo(-50, 5);
    expect(bumpOffset(220, 50).dx).toBeCloseTo(-50, 5);
  });
  it("eases back to 0 by 420ms", () => {
    const mid = bumpOffset(320, 50).dx;
    expect(mid).toBeLessThan(0);
    expect(mid).toBeGreaterThan(-50);
    expect(bumpOffset(419.9, 50).dx).toBeCloseTo(0, 0);
  });
  it("scales with dist and always stays within [-dist, 0]", () => {
    for (let t = 0; t < 420; t += 15) {
      const dx = bumpOffset(t, 80).dx;
      expect(dx).toBeLessThanOrEqual(0);
      expect(dx).toBeGreaterThanOrEqual(-80);
    }
  });
});

describe("hurtSquash", () => {
  it("is neutral before the trigger, after settling, and at t=Infinity", () => {
    expect(hurtSquash(-1)).toEqual({ sx: 1, sy: 1 });
    expect(hurtSquash(260)).toEqual({ sx: 1, sy: 1 });
    expect(hurtSquash(Infinity)).toEqual({ sx: 1, sy: 1 });
  });
  it("peaks (sx 1.15/sy 0.85) around t=40, the bonk's contact instant", () => {
    const peak = hurtSquash(40);
    expect(peak.sx).toBeCloseTo(1.15, 5);
    expect(peak.sy).toBeCloseTo(0.85, 5);
  });
  it("settles with one small rebound (a sign flip in the squash shape) before 260", () => {
    let prevShape = null;
    let sawRebound = false;
    for (let t = 41; t < 260; t += 5) {
      const shape = hurtSquash(t).sx - 1;
      if (prevShape !== null && Math.sign(shape) !== 0 && Math.sign(prevShape) !== 0 && Math.sign(shape) !== Math.sign(prevShape)) {
        sawRebound = true;
      }
      if (Math.sign(shape) !== 0) prevShape = shape;
    }
    expect(sawRebound).toBe(true);
  });
  it("never exceeds the documented amplitude", () => {
    for (let t = 0; t < 260; t += 5) {
      const s = hurtSquash(t);
      expect(s.sx).toBeLessThanOrEqual(1.15 + 1e-9);
      expect(s.sy).toBeGreaterThanOrEqual(0.85 - 1e-9);
    }
  });
});
