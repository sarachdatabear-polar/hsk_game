import { describe, it, expect } from "vitest";
import { uiScale, layout } from "../src/layout.js";

describe("uiScale", () => {
  it("reference size (380x480) gives S=1", () => {
    expect(uiScale(380, 480)).toBe(1);
  });
  it("clamps tiny canvases to the 0.7 floor", () => {
    expect(uiScale(100, 100)).toBe(0.7);
  });
  it("clamps huge canvases to the 1.8 ceiling", () => {
    expect(uiScale(2000, 2000)).toBe(1.8);
  });
  it("scales proportionally within the clamp range", () => {
    expect(uiScale(570, 720)).toBe(1.5);   // 1.5x reference, still inside [0.7, 1.8]
  });
  it("uses the smaller of the two ratios (narrow-but-tall canvas)", () => {
    expect(uiScale(380, 960)).toBe(1);     // width ratio (1) is the binding constraint
    expect(uiScale(760, 480)).toBe(1);     // height ratio (1) is the binding constraint
  });
});

describe("layout", () => {
  it("exposes S matching uiScale", () => {
    expect(layout(380, 480).S).toBe(uiScale(380, 480));
    expect(layout(570, 720).S).toBe(uiScale(570, 720));
  });
  it("derived fields scale linearly with S at the reference size", () => {
    const L = layout(380, 480);
    expect(L.ground).toBe(30);
    expect(L.mascotX).toBe(52);
    expect(L.catHalf).toBe(34);
    expect(L.hanziPx).toBe(60);   // M6: bumped from 44 so Hanzi clears 56 CSS px at 390-wide (PRD §10)
    expect(L.pinyinPx).toBe(18);
    expect(L.floaterPx).toBe(20);
    expect(L.mascotPx).toBe(48);
    expect(L.coinPx).toBe(20);
  });
  it("fields scale proportionally to S away from the reference size", () => {
    const base = layout(380, 480);
    const bigger = layout(570, 720);   // S=1.5, within the clamp range
    expect(bigger.ground).toBeCloseTo(base.ground * 1.5);
    expect(bigger.mascotX).toBeCloseTo(base.mascotX * 1.5);
    expect(bigger.catHalf).toBeCloseTo(base.catHalf * 1.5);
    expect(bigger.hanziPx).toBeCloseTo(base.hanziPx * 1.5);
  });
});
