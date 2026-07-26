"use strict";
// Pure model for the three named neighbours who live on the Street once their
// landmark is finished. Presence derives from level; nothing here reads storage
// or the clock. Anchors are hand-placed x-fractions beside each building: the
// live Street lays landmarks at slots [.10,.30,.50,.70,.90] (coin-bank .30,
// tailor .50, kitten-cafe .70), so each neighbour stands a uniform +.06 to the
// right of its building — just to the side, not on top of it.
export const NEIGHBOURS = [
  { id: "tiao", landmarkId: "coin-bank",  unlock: 10, anchor: 0.36 },
  { id: "pang", landmarkId: "tailor",     unlock: 20, anchor: 0.56 },
  { id: "wen",  landmarkId: "kitten-cafe", unlock: 30, anchor: 0.76 },
];

export function residentNeighbours(level) {
  const lv = Number(level) || 0;
  return NEIGHBOURS.filter(n => lv >= n.unlock).map(n => n.id);
}

export function newlyMovedIn(level, met) {
  const seen = new Set(Array.isArray(met) ? met : []);
  return residentNeighbours(level).filter(id => !seen.has(id));
}

export function newlyMovedInByBuild(builtStages, met) {
  const seen = new Set(Array.isArray(met) ? met : []);
  const bs = builtStages && typeof builtStages === "object" ? builtStages : {};
  return NEIGHBOURS
    .filter(n => (Number(bs[n.landmarkId]) || 0) >= 3 && !seen.has(n.id))
    .map(n => n.id);
}

const REST_MS = 16000;      // idle at the anchor
const WALK_MS = 4000;       // short stroll out
const RETURN_MS = 4000;     // and back
const CYCLE_MS = REST_MS + WALK_MS + RETURN_MS;
const STROLL = 0.06;        // how far (x-fraction) the neighbour wanders

function smoothstep(t) { return t * t * (3 - 2 * t); }

export function neighbourPose(nowMs, anchor, reducedMotion) {
  const a = Number(anchor) || 0;
  if (reducedMotion) return { x: a, facing: 1, sprite: "idle" };
  const now = ((Number(nowMs) || 0) % CYCLE_MS + CYCLE_MS) % CYCLE_MS;
  const walkSprite = Math.floor((Number(nowMs) || 0) / 200) % 2 === 0 ? "walk-a" : "walk-b";
  if (now < REST_MS) return { x: a, facing: 1, sprite: "idle" };
  if (now < REST_MS + WALK_MS) {
    const t = smoothstep((now - REST_MS) / WALK_MS);
    return { x: a + STROLL * t, facing: 1, sprite: walkSprite };
  }
  const t = smoothstep((now - REST_MS - WALK_MS) / RETURN_MS);
  return { x: a + STROLL * (1 - t), facing: -1, sprite: walkSprite };
}
