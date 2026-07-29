"use strict";
// Cat growth — pure module, no DOM/localStorage. Caller owns persistence (nbhsk.xp).
// XP curve: cumulative XP to REACH level n (n>=1, Lv1 = 0 XP).
// Triangular-number curve keeps early levels cheap and later ones costly:
// Lv2=25, Lv3=75, Lv5=250, Lv10=1125, Lv50=30625.

export function xpForLevel(n) {
  return 25 * (n - 1) * n / 2;
}

// Normalizes raw xp input to a finite, non-negative number. Non-finite or
// non-numeric input (NaN, undefined, "abc", ...) degrades to 0 xp (level 1)
// instead of propagating NaN through the curve math below.
function normalizeXp(xp) {
  const n = Number(xp);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

// Inverts xpForLevel: largest integer level >= 1 whose threshold is <= xp.
// Quadratic-formula estimate first, then nudged to the exact integer to
// dodge float rounding at/near exact thresholds.
export function levelForXp(xp) {
  const x = normalizeXp(xp);
  let n = Math.floor((1 + Math.sqrt(1 + 8 * x / 25)) / 2);
  if (n < 1) n = 1;
  while (xpForLevel(n + 1) <= x) n++;
  while (n > 1 && xpForLevel(n) > x) n--;
  return n;
}

// Progress within the current level: {level, into, need}.
// `into` = xp earned since hitting `level`; `need` = xp span of that level.
export function xpToNext(xp) {
  const x = normalizeXp(xp);
  const level = levelForXp(x);
  const base = xpForLevel(level);
  const need = xpForLevel(level + 1) - base;
  return { level, into: x - base, need };
}

export const MILESTONES = [
  { lv: 5,  id: "scarf",   name: "Red scarf" },
  { lv: 10, id: "coin",    name: "Gold coin charm" },
  { lv: 20, id: "outfit",  name: "Chinese outfit" },
  { lv: 30, id: "kitten",  name: "Kitten follower" },
  { lv: 50, id: "emperor", name: "Emperor crown" },
];

export function accessoriesFor(level) {
  return MILESTONES.filter(m => m.lv <= level).map(m => m.id);
}

export function nextMilestone(level) {
  return MILESTONES.find(m => m.lv > level) || null;
}
