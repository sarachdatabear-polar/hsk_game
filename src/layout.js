"use strict";

/* Battle-canvas UI scale. The canvas now fills whatever space the flex layout
   gives it (no forced aspect-ratio), so every drawing constant that used to be
   a fixed px value is derived from the measured canvas size instead. Reference
   size ~380x480 (today's typical canvas) keeps current phones looking
   unchanged; clamped so tiny/huge canvases don't shrink/blow up the HUD text
   past readable limits. */
export function uiScale(w, h) {
  const s = Math.min(h / 480, w / 380);
  return Math.max(0.7, Math.min(1.8, s));
}

/* Derived battle-layout constants, all proportional to uiScale(w,h).
   ground/mascotX/catHalf drive positioning (bite threshold, kitten trail
   offset); the *Px fields are font/sprite sizes for the draw loop. */
export function layout(w, h) {
  const S = uiScale(w, h);
  return {
    S,
    ground: 30 * S,
    mascotX: 52 * S,
    catHalf: 34 * S,
    hanziPx: 44 * S,
    pinyinPx: 18 * S,
    floaterPx: 20 * S,
    mascotPx: 48 * S,
    coinPx: 20 * S
  };
}
