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

// --- Wave 2 battle juice (battle-interface round, T9) ---------------------
// Pure squash/stretch and dash curves for the correct-answer lunge (T10) and
// wrong-answer bump (T11). t = ms since the trigger (a performance.now()
// delta computed in main.js's draw()); every curve returns its neutral value
// once t is negative or past its window, so main.js can feed t=Infinity
// under REDUCED_MOTION and get a static, motion-free pose for free.

// Cat attack lunge: forward dash + a launch squash-and-stretch, applied in
// main.js as a canvas transform around the cat's ground-contact point.
// Forward dx eases up to a +14 peak by t=120, then eases back to 0 by 320.
// The squash starts at its most extreme (sx 1.1/sy 0.9 — "coiled" for the
// pounce) right at launch (t=0) and relaxes to neutral (1/1) over the same
// 320ms window.
const LUNGE_MS = 320;
const LUNGE_PEAK_MS = 120;
const LUNGE_DX = 14;
export function lungeOffset(t) {
  if (!(t >= 0) || t >= LUNGE_MS) return { dx: 0, sx: 1, sy: 1 };
  let dx;
  if (t <= LUNGE_PEAK_MS) {
    const f = t / LUNGE_PEAK_MS;
    dx = LUNGE_DX * (1 - Math.pow(1 - f, 2));   // ease-out up to the peak
  } else {
    const f = (t - LUNGE_PEAK_MS) / (LUNGE_MS - LUNGE_PEAK_MS);
    dx = LUNGE_DX * (1 - f * f);                 // ease-in back to 0
  }
  const ease = 1 - Math.pow(1 - t / LUNGE_MS, 2);
  return { dx, sx: 1.1 - 0.1 * ease, sy: 0.9 + 0.1 * ease };
}

// Raccoon dash-in on a wrong answer (or timeout): closes `dist` px toward the
// cat (negative dx — the cat sits to the raccoon's left), holds at contact,
// then eases back out. Neutral (dx 0) outside [0, 420).
const BUMP_IN_MS = 160;
const BUMP_HOLD_END_MS = 220;   // 160ms dash-in + 60ms hold
const BUMP_MS = 420;
export function bumpOffset(t, dist) {
  if (!(t >= 0) || t >= BUMP_MS) return { dx: 0 };
  if (t <= BUMP_IN_MS) {
    const f = t / BUMP_IN_MS;
    return { dx: -dist * f * f };                // ease-in toward the cat
  }
  if (t <= BUMP_HOLD_END_MS) return { dx: -dist };   // hold at contact
  const f = (t - BUMP_HOLD_END_MS) / (BUMP_MS - BUMP_HOLD_END_MS);
  return { dx: -dist * (1 - f) };                 // ease back out
}

// Cat's "hurt" squash reaction to the bump: quick squish (sx 1.15/sy 0.85)
// that peaks at t≈40 (the bonk's contact instant), then a single damped
// rebound settling back to neutral by t=260.
const HURT_MS = 260;
const HURT_PEAK_MS = 40;
export function hurtSquash(t) {
  if (!(t >= 0) || t >= HURT_MS) return { sx: 1, sy: 1 };
  let shape;
  if (t <= HURT_PEAK_MS) {
    shape = t / HURT_PEAK_MS;                     // 0 -> 1 ease-in to contact
  } else {
    const f = (t - HURT_PEAK_MS) / (HURT_MS - HURT_PEAK_MS);
    shape = Math.cos(f * Math.PI * 1.5) * (1 - f);  // damped, one small rebound
  }
  return { sx: 1 + 0.15 * shape, sy: 1 - 0.15 * shape };
}
