"use strict";
// Pure 9-slice geometry: split a source image (sw×sh, uniform inset si) and a
// dest rect (dx,dy,dw,dh, uniform inset di) into 9 aligned draw rects so
// corners keep their aspect while edges/center stretch. Kept DOM-free so the
// math is unit-testable; main.js feeds the rects to ctx.drawImage.
export function nineSliceRects(sw, sh, si, dx, dy, dw, dh, di) {
  const d = Math.min(di, dw / 2, dh / 2); // clamp: no negative middle bands
  const sxs = [0, si, sw - si];
  const sws = [si, sw - 2 * si, si];
  const dxs = [dx, dx + d, dx + dw - d];
  const dws = [d, dw - 2 * d, d];
  const sys = [0, si, sh - si];
  const shs = [si, sh - 2 * si, si];
  const dys = [dy, dy + d, dy + dh - d];
  const dhs = [d, dh - 2 * d, d];
  const rects = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      rects.push({
        sx: sxs[col], sy: sys[row], sw: sws[col], sh: shs[row],
        dx: dxs[col], dy: dys[row], dw: dws[col], dh: dhs[row],
      });
    }
  }
  return rects;
}
