import { describe, it, expect } from "vitest";
import { roundLabel } from "../src/hud.js";

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
