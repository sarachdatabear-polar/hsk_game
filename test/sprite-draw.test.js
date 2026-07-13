import { describe, it, expect } from "vitest";
import { drawSpriteFrame, CONTENT_H } from "../src/sprite-draw.js";
import { SPRITE_METRICS } from "../src/sprite-metrics.js";

// Fake ctx that just records drawImage calls — drawSpriteFrame's whole job
// is choosing the right source/dest rects, so that's all we need to assert.
function fakeCtx() {
  const calls = [];
  return { calls, drawImage: (...args) => calls.push(args) };
}

describe("drawSpriteFrame", () => {
  it("metrics branch: scales the measured content box to CONTENT_H, bottom-anchored on groundY, centered on x", () => {
    const ctx = fakeCtx();
    const img = { fake: "img" };
    const x = 100, groundY = 200, frame = 2;
    // Derive expectations from the real cat-walk metrics so this stays a test
    // of the scaling MATH (bottom-anchor + center + scale-to-CONTENT_H), not a
    // hardcode that breaks whenever the cat art is regenerated.
    const m = SPRITE_METRICS["cat-walk"];
    const sw0 = m.r - m.l, sh0 = m.b - m.t;
    drawSpriteFrame(ctx, img, frame, x, groundY, "cat-walk", 64);

    expect(ctx.calls.length).toBe(1);
    const [drawnImg, sx, sy, sw, sh, dx, dy, dw, dh] = ctx.calls[0];
    expect(drawnImg).toBe(img);
    expect(sx).toBe(frame * 256 + m.l);
    expect(sy).toBe(m.t);
    expect(sw).toBe(sw0);
    expect(sh).toBe(sh0);

    const k = CONTENT_H / sh0;
    const expectedDw = sw0 * k;
    expect(dh).toBe(CONTENT_H);
    expect(dw).toBeCloseTo(expectedDw, 6);
    expect(dx).toBeCloseTo(x - expectedDw / 2, 6);
    expect(dy).toBe(groundY - CONTENT_H);
  });

  it("fallback branch: unknown sheet name draws the full 256px frame into a fallbackSize box", () => {
    const ctx = fakeCtx();
    const img = { fake: "img" };
    const x = 50, groundY = 300, frame = 3, fallbackSize = 64;
    drawSpriteFrame(ctx, img, frame, x, groundY, "not-a-real-sheet", fallbackSize);

    expect(ctx.calls.length).toBe(1);
    const [drawnImg, sx, sy, sw, sh, dx, dy, dw, dh] = ctx.calls[0];
    expect(drawnImg).toBe(img);
    expect(sx).toBe(frame * 256);
    expect(sy).toBe(0);
    expect(sw).toBe(256);
    expect(sh).toBe(256);
    expect(dx).toBe(x - fallbackSize / 2);
    expect(dy).toBe(groundY - fallbackSize);
    expect(dw).toBe(fallbackSize);
    expect(dh).toBe(fallbackSize);
  });
});
