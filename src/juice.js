"use strict";
// Pure game-feel math (PRD v5 A3). No DOM/canvas — main.js turns these into
// CSS classes and canvas offsets. Kept separate so thresholds and curves are
// unit-testable, like fx.js/hud.js.

// Combo-strip escalation tiers (PRD A3: escalating warm glow at 5/10/15).
export function comboGlowTier(combo) {
  if (combo >= 15) return 3;
  if (combo >= 10) return 2;
  if (combo >= 5) return 1;
  return 0;
}

// Word-plaque bounce on a correct answer: damped sine, 10px amplitude,
// 450ms window, 0 outside it. main.js feeds (now - B.plaqueHitAt).
const BOUNCE_MS = 450;
const BOUNCE_AMP = 10;
export function plaqueBounce(ms) {
  if (!(ms >= 0) || ms >= BOUNCE_MS) return 0;
  const f = ms / BOUNCE_MS;
  return BOUNCE_AMP * Math.sin(f * Math.PI * 3) * (1 - f);
}

// Results score count-up easing (ease-out cubic), exact endpoints, clamped.
export function countUpValue(from, to, frac) {
  const f = Math.min(1, Math.max(0, frac));
  const eased = 1 - Math.pow(1 - f, 3);
  return Math.round(from + (to - from) * eased);
}
