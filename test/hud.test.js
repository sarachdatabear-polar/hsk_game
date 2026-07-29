import { describe, it, expect } from "vitest";
import { comboMultiplier, comboFires, roundProgress } from "../src/hud.js";

describe("comboMultiplier", () => {
  it("blank below a 2-combo", () => {
    expect(comboMultiplier(0)).toBe("");
    expect(comboMultiplier(1)).toBe("");
  });
  it("reads xN at 2+ (same number the old #hud-combo pill showed)", () => {
    expect(comboMultiplier(2)).toBe("x2");
    expect(comboMultiplier(9)).toBe("x9");
    expect(comboMultiplier(23)).toBe("x23");
  });
});

describe("roundProgress", () => {
  it("0 resolved of the total reads 0", () => {
    expect(roundProgress(0, 20)).toBe(0);
  });
  it("mid-session reads the fraction", () => {
    expect(roundProgress(5, 20)).toBe(0.25);
  });
  it("fully resolved reads 1", () => {
    expect(roundProgress(20, 20)).toBe(1);
  });
  it("clamps overshoot at 1", () => {
    expect(roundProgress(25, 20)).toBe(1);
  });
  it("a total of 0 reads 0 (no division by zero)", () => {
    expect(roundProgress(0, 0)).toBe(0);
  });
  it("an infinite total (endless mode) reads 0", () => {
    expect(roundProgress(7, Infinity)).toBe(0);
  });
  it("never goes negative", () => {
    expect(roundProgress(-3, 20)).toBe(0);
  });
});

describe("comboFires", () => {
  it("lits one glyph per combo point", () => {
    expect(comboFires(0)).toBe(0);
    expect(comboFires(1)).toBe(1);
    expect(comboFires(4)).toBe(4);
  });
  it("caps at 6 glyphs for long streaks", () => {
    expect(comboFires(6)).toBe(6);
    expect(comboFires(7)).toBe(6);
    expect(comboFires(23)).toBe(6);
  });
  it("never goes negative", () => {
    expect(comboFires(-3)).toBe(0);
  });
});
