"use strict";
// Pure route/pose model for the animated cat who lives on Lucky Cat Street.
// Rendering and requestAnimationFrame ownership stay in main.js.

export const STREET_RESIDENT_CYCLE_MS = 18000;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number(n) || 0));

function normalizedTarget(target, fallbackActivity) {
  if (!target || !Number.isFinite(Number(target.x))) return null;
  const rawX = clamp(target.x, .04, .96);
  // Stand beside the object rather than directly over its visual center.
  const x = Number(clamp(rawX + (rawX > .72 ? -.1 : .1), .09, .91).toFixed(4));
  return { x, activity: target.activity || fallbackActivity };
}

export function streetResidentRoute({ project = null, decorations = [] } = {}) {
  const home = { x: .09, activity: "wave" };
  const projectTarget = normalizedTarget(project, "build");
  const decoTargets = (decorations || [])
    .map(target => normalizedTarget(target, target?.activity || "admire"))
    .filter(Boolean);
  const primary = projectTarget || decoTargets[0] || { x: .36, activity: "wave" };
  const secondary = decoTargets.find(target => Math.abs(target.x - primary.x) >= .16)
    || { x: primary.x < .55 ? .72 : .32, activity: "rest" };
  return { home, primary, secondary };
}

const walk = (from, to, elapsed, duration) => {
  const ratio = clamp(elapsed / duration, 0, 1);
  return {
    x: Number((from.x + (to.x - from.x) * ratio).toFixed(4)),
    state: "walk",
    activity: "",
    facing: to.x >= from.x ? 1 : -1,
  };
};

const pause = target => ({
  x: target.x,
  state: "happy",
  activity: target.activity,
  facing: target.x > .72 ? -1 : 1,
});

export function streetResidentPose(nowMs, route = streetResidentRoute(), reducedMotion = false) {
  const safeRoute = route || streetResidentRoute();
  if (reducedMotion) return pause(safeRoute.home);
  const cycle = ((Number(nowMs) || 0) % STREET_RESIDENT_CYCLE_MS + STREET_RESIDENT_CYCLE_MS)
    % STREET_RESIDENT_CYCLE_MS;
  if (cycle < 4500) return walk(safeRoute.home, safeRoute.primary, cycle, 4500);
  if (cycle < 7500) return pause(safeRoute.primary);
  if (cycle < 11500) return walk(safeRoute.primary, safeRoute.secondary, cycle - 7500, 4000);
  if (cycle < 14500) return pause(safeRoute.secondary);
  return walk(safeRoute.secondary, safeRoute.home, cycle - 14500, 3500);
}
