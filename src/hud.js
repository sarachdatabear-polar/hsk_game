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

// Hero hearts, in-scene above the cat (battle-interface round T5 — replaces
// the HUD's hud-lives pips removed in T3). Canvas-drawing but pure-ish: no
// state read/written, everything comes in as args, so a fake ctx can record
// the calls in tests (same pattern as test/sprite-draw.test.js).
// ctx: real or fake CanvasRenderingContext2D. x: horizontal center of the
// whole pip row (CSS px). topY: row's vertical center. lives/maxLives: pip
// counts. S: battle UI scale (B.S at the call site). Filled coral pips for
// remaining lives, soft-gray for lost ones, ink outline on every pip — the
// color swap is never the only signal (paired with the HUD's round/HP text).
// Heart silhouette: a bezier "two lobes + a point" path (smoother than a
// literal arcs+triangle construction at these small pip sizes) — moveTo
// starts at the bottom tip, which doubles as this module's test seam for
// each pip's x position.
export function drawHearts(ctx, x, topY, lives, maxLives, S) {
  const size = 10 * S;
  const gap = 4 * S;
  const step = size + gap;
  const totalW = maxLives * size + Math.max(0, maxLives - 1) * gap;
  const startX = x - totalW / 2 + size / 2;
  for (let i = 0; i < maxLives; i++) {
    drawHeartPip(ctx, startX + i * step, topY, size, i < lives);
  }
}

function drawHeartPip(ctx, cx, cy, size, filled) {
  const tipY = cy + size * 0.42;
  const topY = cy - size * 0.32;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, tipY);
  ctx.bezierCurveTo(cx - size * 0.55, cy + size * 0.05, cx - size * 0.5, topY, cx, cy - size * 0.06);
  ctx.bezierCurveTo(cx + size * 0.5, topY, cx + size * 0.55, cy + size * 0.05, cx, tipY);
  ctx.closePath();
  ctx.fillStyle = filled ? "#E69777" : "#B2AEA9";
  ctx.fill();
  ctx.lineWidth = Math.max(1, size * 0.1);
  ctx.strokeStyle = "#2E2A24";
  ctx.stroke();
  ctx.restore();
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
