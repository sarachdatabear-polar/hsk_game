import { describe, it, expect } from "vitest";
import { nineSliceRects } from "../src/nineslice.js";

describe("nineSliceRects", () => {
  // 560×320 source with 48px inset drawn to 300×90 dest with 24px inset
  const rects = nineSliceRects(560, 320, 48, 10, 20, 300, 90, 24);

  it("produces 9 rects covering the dest area exactly", () => {
    expect(rects).toHaveLength(9);
    const xs = [...new Set(rects.map(r => r.dx))].sort((a, b) => a - b);
    const ys = [...new Set(rects.map(r => r.dy))].sort((a, b) => a - b);
    expect(xs).toEqual([10, 34, 286]);        // 10, 10+24, 10+300-24
    expect(ys).toEqual([20, 44, 86]);         // 20, 20+24, 20+90-24
    const total = rects.reduce((s, r) => s + r.dw * r.dh, 0);
    expect(total).toBe(300 * 90);
  });

  it("keeps corner source rects unscaled in shape (si × si)", () => {
    const corner = rects.find(r => r.dx === 10 && r.dy === 20);
    expect(corner).toMatchObject({ sx: 0, sy: 0, sw: 48, sh: 48, dw: 24, dh: 24 });
  });

  it("stretches only the middle band", () => {
    const center = rects.find(r => r.dx === 34 && r.dy === 44);
    expect(center).toMatchObject({ sx: 48, sy: 48, sw: 560 - 96, sh: 320 - 96, dw: 300 - 48, dh: 90 - 48 });
  });

  it("clamps the dest inset when the dest is smaller than two insets", () => {
    const tiny = nineSliceRects(560, 320, 48, 0, 0, 40, 30, 24);
    const total = tiny.reduce((s, r) => s + r.dw * r.dh, 0);
    expect(total).toBe(40 * 30); // no negative middle bands
  });
});
