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

// Round progress bar fraction (battle-interface round, T3 — HUD simplification).
// resolved/total clamped to [0, 1]; total<=0 (or Infinity, endless mode's
// wordsTotal) reads 0 rather than NaN/Infinity so the bar fill never breaks.
export function roundProgress(resolved, total) {
  if (!total || total <= 0) return 0;
  return Math.max(0, Math.min(1, resolved / total));
}

// Combo strip (M6 — visual PRD §6.2 item 5). Both helpers are pure formatting
// over B.combo; main.js decides when to hide the strip entirely (combo < 2).

// The "xN" multiplier badge — same meaning as the old #hud-combo pill it
// replaces: the raw combo count, shown once a streak actually exists (>=2),
// blank below that (caller hides the strip in that case).
export function comboMultiplier(combo) {
  return combo >= 2 ? `x${combo}` : "";
}

// Number of lit fire glyphs in the combo strip's center row, capped at 6 so
// a long streak doesn't need an ever-growing row of icons.
export function comboFires(combo) {
  return Math.max(0, Math.min(6, combo));
}
