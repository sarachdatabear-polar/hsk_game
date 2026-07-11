import { describe, it, expect } from "vitest";
import { drawSpriteFrame, CONTENT_H } from "../src/sprite-draw.js";

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
    // "cat-walk" metrics: { l: 0, t: 62, r: 256, b: 200 } (sh = 138)
    drawSpriteFrame(ctx, img, frame, x, groundY, "cat-walk", 64);

    expect(ctx.calls.length).toBe(1);
    const [drawnImg, sx, sy, sw, sh, dx, dy, dw, dh] = ctx.calls[0];
    expect(drawnImg).toBe(img);
    expect(sx).toBe(frame * 256 + 0);
    expect(sy).toBe(62);
    expect(sw).toBe(256);
    expect(sh).toBe(138);

    const k = CONTENT_H / 138;
    const expectedDw = 256 * k;
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
