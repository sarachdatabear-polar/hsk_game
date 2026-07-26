"use strict";
// Pure model for the "build the neighbourhood" loop: studying earns bricks
// (main.js awards them at the results screen, like coins), and the player
// spends them to advance a landmark's construction stage. Nothing here reads
// storage, the DOM, or the clock — main.js/street-screen.js wire it up.
import { BUILDINGS } from "./street.js";

export const BRICK_STAGE_COST = [8, 12, 16]; // to enter stage 1, 2, 3

export function landmarkUnlockLevel(id) {
  const b = BUILDINGS.find(x => x.id === id);
  return b ? b.lv : Infinity;
}

export function landmarkBuildCost(stage) {
  const s = Number(stage) || 0;
  return s >= 0 && s < 3 ? BRICK_STAGE_COST[s] : null;
}

export function landmarkBuildable(level, id, builtStages) {
  const stage = Number((builtStages || {})[id]) || 0;
  return (Number(level) || 0) >= landmarkUnlockLevel(id) && stage < 3;
}

export function bricksForRound({ mastered = 0, completed = false } = {}) {
  const m = Math.max(0, Math.floor(Number(mastered) || 0));
  return m * 2 + (completed ? 1 : 0);
}

export function advanceLandmark(builtStages, id, bricks, level) {
  const b = Number(bricks) || 0;
  const stage = Number((builtStages || {})[id]) || 0;
  if (!landmarkBuildable(level, id, builtStages)) {
    return { ok: false, builtStages, bricks: b, reachedStage: stage };
  }
  const cost = landmarkBuildCost(stage);
  if (cost === null || b < cost) {
    return { ok: false, builtStages, bricks: b, reachedStage: stage };
  }
  const next = { ...(builtStages || {}), [id]: stage + 1 };
  return { ok: true, builtStages: next, bricks: b - cost, reachedStage: stage + 1 };
}
