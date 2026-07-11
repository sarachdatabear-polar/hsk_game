"use strict";
import { SPRITE_METRICS } from "./sprite-metrics.js";

/* Shared content-aware sprite blit for cat.js/raccoon.js. PNG sheets vary a
   lot in how much of their 256px frame the painted art actually fills (see
   scripts/gen_sprite_metrics.py) — drawing the raw frame box at a fixed size
   made the stock cat art (which floats mid-frame, short) render far smaller
   than the raccoon art (which fills the frame, bottom-anchored). Scaling by
   each sheet's measured content box instead makes every character the same
   effective size regardless of its art's fill/anchor quirks. */

// target content height (world units) every character's painted art is
// scaled/anchored to. cat.js and raccoon.js both draw against this same
// constant so the two characters read as the same size.
export const CONTENT_H = 64;

/* drawSpriteFrame — draw frame `frame` (0-indexed, 256px-wide source column)
   of `img` (a sheet named `sheetName`, sans ".png") so its measured content
   box (SPRITE_METRICS[sheetName]) is CONTENT_H world units tall, bottom-
   anchored on groundY and horizontally centered on x. Falls back to the old
   fixed-box behavior (draw the whole 256px frame into a fallbackSize x
   fallbackSize box at x-fallbackSize/2, groundY-fallbackSize) when no
   metrics entry exists — e.g. for art dropped in before a metrics regen. */
export function drawSpriteFrame(ctx, img, frame, x, groundY, sheetName, fallbackSize) {
  const m = SPRITE_METRICS[sheetName];
  if (!m) {
    ctx.drawImage(img, frame * 256, 0, 256, 256, x - fallbackSize / 2, groundY - fallbackSize, fallbackSize, fallbackSize);
    return;
  }
  const sw = m.r - m.l, sh = m.b - m.t;
  const k = CONTENT_H / sh;
  const dw = sw * k;
  ctx.drawImage(img, frame * 256 + m.l, m.t, sw, sh, x - dw / 2, groundY - CONTENT_H, dw, CONTENT_H);
}
