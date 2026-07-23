"use strict";
// Pure route/pose model for the animated cat who lives on Lucky Cat Street.
// Rendering and requestAnimationFrame ownership stay in main.js.

export const STREET_RESIDENT_CYCLE_MS = 32000;

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number(n) || 0));

// Street uses the Battle sprite sheets, but the resident is the focal
// character of a much shorter 2:1 diorama. Give its painted content a stable
// 67–82px height instead of inheriting Battle's smaller garnish-like scale.
export function streetResidentScale(unit) {
  return clamp((Number(unit) || 0) / 38, 1.05, 1.28);
}

function normalizedTarget(target, fallbackActivity) {
  if (!target || !Number.isFinite(Number(target.x))) return null;
  const rawX = clamp(target.x, .04, .96);
  // Stand beside the object rather than directly over its visual center.
  const x = Number(clamp(rawX + (rawX > .68 ? -.09 : .09), .1, .9).toFixed(4));
  return { x, focusX: rawX, activity: target.activity || fallbackActivity };
}

export function streetResidentRoute({ project = null, decorations = [] } = {}) {
  const home = { x: .12, focusX: .28, activity: "rest" };
  const projectTarget = normalizedTarget(project, "build");
  const decoTargets = (decorations || [])
    .map(target => normalizedTarget(target, target?.activity || "admire"))
    .filter(Boolean);
  const primary = projectTarget || decoTargets[0]
    || { x: .38, focusX: .48, activity: "admire" };
  const secondary = decoTargets.find(target => Math.abs(target.x - primary.x) >= .16)
    || (primary.x < .55
      ? { x: .72, focusX: .82, activity: "rest" }
      : { x: .32, focusX: .22, activity: "rest" });
  return { home, primary, secondary };
}

const walk = (from, to, elapsed, duration) => {
  const ratio = clamp(elapsed / duration, 0, 1);
  // Smoothstep makes the resident toddle gently out of and into each stop
  // instead of moving like a constant-speed cursor.
  const eased = ratio * ratio * (3 - 2 * ratio);
  return {
    x: Number((from.x + (to.x - from.x) * eased).toFixed(4)),
    state: "walk",
    activity: "",
    activityX: null,
    facing: to.x >= from.x ? 1 : -1,
  };
};

const pause = target => ({
  x: target.x,
  state: "happy",
  activity: target.activity,
  activityX: target.focusX,
  facing: Number(target.focusX) >= target.x ? 1 : -1,
});

export function streetResidentPose(nowMs, route = streetResidentRoute(), reducedMotion = false) {
  const safeRoute = route || streetResidentRoute();
  if (reducedMotion) return pause(safeRoute.home);
  const cycle = ((Number(nowMs) || 0) % STREET_RESIDENT_CYCLE_MS + STREET_RESIDENT_CYCLE_MS)
    % STREET_RESIDENT_CYCLE_MS;
  if (cycle < 8000) return walk(safeRoute.home, safeRoute.primary, cycle, 8000);
  if (cycle < 13000) return pause(safeRoute.primary);
  if (cycle < 20000) return walk(safeRoute.primary, safeRoute.secondary, cycle - 13000, 7000);
  if (cycle < 25000) return pause(safeRoute.secondary);
  return walk(safeRoute.secondary, safeRoute.home, cycle - 25000, 7000);
}
