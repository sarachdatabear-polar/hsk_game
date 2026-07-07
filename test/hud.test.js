import { describe, it, expect } from "vitest";
import { roundLabel, comboMultiplier, comboFires } from "../src/hud.js";

describe("roundLabel", () => {
  it("reads 1/20 on the first word (spawned=0, before the first spawn)", () => {
    expect(roundLabel("round", 0, 20)).toBe("1/20");
  });
  it("reads 1/20 right after the first word spawns (spawned=1)", () => {
    expect(roundLabel("round", 1, 20)).toBe("1/20");
  });
  it("tracks the current word number mid-session", () => {
    expect(roundLabel("round", 5, 20)).toBe("5/20");
  });
  it("reads the total on the last word", () => {
    expect(roundLabel("round", 20, 20)).toBe("20/20");
  });
  it("never exceeds the total even on overshoot", () => {
    expect(roundLabel("round", 25, 20)).toBe("20/20");
  });
  it("works for a 1-word session", () => {
    expect(roundLabel("round", 0, 1)).toBe("1/1");
    expect(roundLabel("round", 1, 1)).toBe("1/1");
  });
  it("endless mode shows the spawned count + an infinity marker", () => {
    expect(roundLabel("endless", 0, Infinity)).toBe("0 · ∞");
    expect(roundLabel("endless", 7, Infinity)).toBe("7 · ∞");
  });
  it("endless mode never goes negative", () => {
    expect(roundLabel("endless", -1, Infinity)).toBe("0 · ∞");
  });
});

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
