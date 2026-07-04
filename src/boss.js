"use strict";
// Boss waves — pure module, no DOM/canvas. Every 10th spawn (1-based index:
// the 10th, 20th, ... spawn) is a boss, in both round and endless modes.
// A boss is a two-stage kill: stage "meaning" (normal question), then stage
// "hanzi" (reverse: meaning shown, pick the hanzi). main.js owns the DOM/
// canvas wiring; this module just holds the pure rules.

export const BOSS_EVERY = 10;
export const BOSS_STAGES = ["meaning", "hanzi"];
export const bossSpeedFactor = 0.85;   // boss walks 15% slower — bigger, but fair

export function isBossSpawn(spawnIndex) {
  return spawnIndex > 0 && spawnIndex % BOSS_EVERY === 0;
}

export function bossPoints(basePoints) {
  return basePoints * 5;
}

// stage machine: meaning -> hanzi -> dead (word resolves on kill or miss)
export function nextBossStage(stage) {
  if (stage === "meaning") return "hanzi";
  return "dead";
}
