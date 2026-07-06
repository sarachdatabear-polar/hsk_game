"use strict";
// Pure battle-HUD formatting helpers (M4 — visual PRD §6.2 item 1). No DOM;
// main.js wraps the result with the localized word "Round" via t("battle.round").

// "round" mode: current word number over the session length, e.g. "1/20" on
// the very first word — B.spawned is still 0 right after startBattle() and
// only becomes 1 once spawnZombie() runs, so we clamp to [1, total] rather
// than showing "0/20". Also clamps the top end so a stray overshoot never
// reads past the session length (e.g. "20/20", never "21/20").
// "endless" mode: words seen so far + an infinity marker, e.g. "7 · ∞"
// (total is ignored — endless has no session length).
export function roundLabel(mode, spawned, total) {
  if (mode === "endless") {
    return `${Math.max(0, spawned)} · ∞`;
  }
  const current = Math.min(Math.max(1, spawned), total);
  return `${current}/${total}`;
}
