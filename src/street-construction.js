"use strict";
// Pure landmark construction-stage model. Reads the stored stage for a landmark.

export function landmarkStage(builtStages, id) {
  const raw = builtStages && typeof builtStages === "object" ? builtStages[id] : 0;
  return Math.min(3, Math.max(0, Math.round(Number(raw) || 0)));
}

export function constructionSprite(id, stage) {
  if (stage <= 0) return null;
  if (stage >= 3) return `landmark-${id}`;
  return `landmark-${id}-stage${stage}`;
}
