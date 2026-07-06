import { describe, it, expect } from "vitest";
import { raccoonBob } from "../src/raccoon.js";

describe("raccoonBob", () => {
  it("walk cycle is periodic (period 220*2π ms)", () => {
    const period = 220 * Math.PI * 2;
    const a = raccoonBob(137, "walk");
    const b = raccoonBob(137 + period, "walk");
    expect(b.bob).toBeCloseTo(a.bob, 3);
    expect(b.legSwing).toBeCloseTo(a.legSwing, 3);
  });

  it("walk amplitude matches the cat's walk cadence (bob 2.5, legSwing 6)", () => {
    const { bob, legSwing } = raccoonBob(220 * (Math.PI / 2), "walk");
    expect(bob).toBeCloseTo(2.5, 5);
    expect(legSwing).toBeCloseTo(6, 5);
  });

  it("unknown/legacy state falls back to walk cadence", () => {
    const known = raccoonBob(300, "walk");
    const fallback = raccoonBob(300, "dash");
    expect(fallback).toEqual(known);
  });

  it("wrong (retreat) hops periodically with its own faster cadence", () => {
    const period = 150 * Math.PI * 2;
    const a = raccoonBob(50, "wrong");
    const b = raccoonBob(50 + period, "wrong");
    expect(b.bob).toBeCloseTo(a.bob, 3);
    expect(b.legSwing).toBeCloseTo(a.legSwing, 3);
  });

  it("wrong hop is a one-directional bounce (never dips below the hop peak)", () => {
    const peak = raccoonBob(150 * (Math.PI / 2), "wrong");
    expect(peak.bob).toBeCloseTo(-4.5, 5);
    expect(peak.legSwing).toBeCloseTo(4, 5);
    for (let t = 0; t < 2000; t += 37) {
      expect(raccoonBob(t, "wrong").bob).toBeLessThanOrEqual(0);
      expect(raccoonBob(t, "wrong").bob).toBeGreaterThanOrEqual(-4.5 - 1e-9);
    }
  });

  it("happy (defeat) settles into a bow instead of oscillating forever", () => {
    const early = raccoonBob(0, "happy");
    const mid = raccoonBob(300, "happy");
    const late = raccoonBob(5000, "happy");
    expect(early.bob).toBe(0);
    expect(late.bob).toBeGreaterThan(mid.bob);
    expect(late.bob).toBeCloseTo(8, 1);   // fully settled bow depth
    expect(early.legSwing).toBe(0);
    expect(mid.legSwing).toBe(0);
    expect(late.legSwing).toBe(0);
  });
});
