import { describe, it, expect } from "vitest";
import { roundLabel, comboMultiplier, comboFires, roundProgress, drawHearts } from "../src/hud.js";

// Fake ctx recording just enough to assert drawHearts' per-pip fill/stroke/
// position — same "record the calls" pattern as test/sprite-draw.test.js.
function fakeCtx() {
  const calls = [];
  return {
    calls,
    fillStyle: "", strokeStyle: "", lineWidth: 0,
    save(){}, restore(){}, beginPath(){}, closePath(){},
    moveTo(x, y){ calls.push({ op: "moveTo", x, y }); },
    lineTo(){}, bezierCurveTo(){}, quadraticCurveTo(){}, arc(){},
    fill(){ calls.push({ op: "fill", fillStyle: this.fillStyle }); },
    stroke(){ calls.push({ op: "stroke", strokeStyle: this.strokeStyle }); },
  };
}

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

describe("drawHearts", () => {
  it("draws maxLives pips, coral for remaining lives, gray for lost ones", () => {
    const ctx = fakeCtx();
    drawHearts(ctx, 100, 50, 2, 3, 1);
    const fills = ctx.calls.filter(c => c.op === "fill").map(c => c.fillStyle);
    expect(fills).toEqual(["#E69777", "#E69777", "#B2AEA9"]);
  });

  it("0 lives reads every pip gray", () => {
    const ctx = fakeCtx();
    drawHearts(ctx, 100, 50, 0, 3, 1);
    const fills = ctx.calls.filter(c => c.op === "fill").map(c => c.fillStyle);
    expect(fills).toEqual(["#B2AEA9", "#B2AEA9", "#B2AEA9"]);
  });

  it("full lives reads every pip coral", () => {
    const ctx = fakeCtx();
    drawHearts(ctx, 100, 50, 3, 3, 1);
    const fills = ctx.calls.filter(c => c.op === "fill").map(c => c.fillStyle);
    expect(fills).toEqual(["#E69777", "#E69777", "#E69777"]);
  });

  it("ink-outlines every pip, one stroke each", () => {
    const ctx = fakeCtx();
    drawHearts(ctx, 100, 50, 2, 3, 1);
    const strokes = ctx.calls.filter(c => c.op === "stroke");
    expect(strokes.length).toBe(3);
    expect(strokes.every(s => s.strokeStyle === "#2E2A24")).toBe(true);
  });

  it("lays pips out left-to-right, centered on x (monotonic, symmetric positions)", () => {
    const ctx = fakeCtx();
    drawHearts(ctx, 100, 50, 3, 3, 1);
    const xs = ctx.calls.filter(c => c.op === "moveTo").map(c => c.x);
    expect(xs.length).toBe(3);
    expect(xs[0]).toBeLessThan(xs[1]);
    expect(xs[1]).toBeLessThan(xs[2]);
    // symmetric around the given center x=100
    expect(xs[0] + xs[2]).toBeCloseTo(200, 5);
    expect(xs[1]).toBeCloseTo(100, 5);
  });

  it("scales pip size/gap with S", () => {
    const ctx1 = fakeCtx();
    drawHearts(ctx1, 100, 50, 3, 3, 1);
    const xs1 = ctx1.calls.filter(c => c.op === "moveTo").map(c => c.x);
    const ctx2 = fakeCtx();
    drawHearts(ctx2, 100, 50, 3, 3, 2);
    const xs2 = ctx2.calls.filter(c => c.op === "moveTo").map(c => c.x);
    // doubling S doubles the spread between the outer pips
    expect(xs2[2] - xs2[0]).toBeCloseTo((xs1[2] - xs1[0]) * 2, 5);
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
