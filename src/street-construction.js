"use strict";
// Pure landmark construction-stage model. A landmark's visible stage is a
// function of the player's level between the previous milestone and its own
// unlock level — nothing here reads storage. Reuses projectStage's 0/1/2/3
// bucket so construction shares the same thresholds as coin projects.
import { BUILDINGS } from "./street.js";
import { projectStage } from "./street-project.js";

function span(id) {
  const idx = BUILDINGS.findIndex(b => b.id === id);
  if (idx < 0) return null;
  const thisUnlock = BUILDINGS[idx].lv;
  const prevUnlock = idx > 0 ? BUILDINGS[idx - 1].lv : 0;
  return { thisUnlock, prevUnlock };
}

export function landmarkStage(level, id) {
  const s = span(id);
  if (!s) return 0;
  const lv = Number(level) || 0;
  if (lv >= s.thisUnlock) return 3;
  return projectStage(lv - s.prevUnlock, s.thisUnlock - s.prevUnlock);
}

export function constructionSprite(id, stage) {
  if (stage <= 0) return null;
  if (stage >= 3) return `landmark-${id}`;
  return `landmark-${id}-stage${stage}`;
}
