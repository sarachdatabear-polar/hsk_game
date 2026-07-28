"use strict";
// Review Challenges — pure module, no DOM/canvas. Every 10th planned encounter
// is a single-stage checkpoint: meaning recognition at 5x points, with a
// slower walk. main.js owns the DOM/canvas wiring; this module holds the
// public rules while legacy boss-named exports remain as compatibility
// aliases during migration.

export const REVIEW_CHALLENGE_EVERY = 10;
export const REVIEW_CHALLENGE_STAGES = ["meaning"];
export const reviewChallengeSpeedFactor = 0.85;

export function isReviewChallenge(plannedIndex) {
  return plannedIndex > 0 && plannedIndex % REVIEW_CHALLENGE_EVERY === 0;
}

export function reviewChallengePoints(basePoints) {
  return basePoints * 5;
}

export function nextReviewChallengeStage() {
  return "complete";
}

export const BOSS_EVERY = REVIEW_CHALLENGE_EVERY;
export const BOSS_STAGES = REVIEW_CHALLENGE_STAGES;
export const bossSpeedFactor = reviewChallengeSpeedFactor;
export const isBossSpawn = isReviewChallenge;
export const bossPoints = reviewChallengePoints;
export function nextBossStage(stage) {
  if (stage === "meaning") return nextReviewChallengeStage();
  return "dead";
}
