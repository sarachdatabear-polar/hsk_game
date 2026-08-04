export function recordAnswer(store, hanzi, correct, now = Date.now()) {
  const w = store[hanzi] || (store[hanzi] = { s: 0, k: 0, r: 0 });
  w.s++;
  if (correct) { w.k++; w.r++; } else { w.r = 0; }
  w.ls = now;
}

// THE definition of "mastered": a correct-answer streak of 3. Consumers:
// srs.js (isMasteredRec — due-interval/weight gating), formats.js (the
// ladder boundary where a word graduates from "listen" into "reverse"), and
// this file's own isMastered/pickKeepsakeWord checks below.
// Change this value here only; other modules import it.
export const MASTERY_STREAK = 3;

export const wordStreak = (store, hanzi) => (store[hanzi] ? store[hanzi].r : 0);
export const isMastered = (store, hanzi) => wordStreak(store, hanzi) >= MASTERY_STREAK;

export function masteredCount(store) {
  const s = store || {};
  let n = 0;
  for (const h in s) if (isMastered(s, h)) n++;
  return n;
}

// Read-only: picks a word to DISPLAY on a keepsake (frozen at creation, never
// re-read). Never mutates `store`. Returns "" when there's nothing mastered.
// `exclude` (array or Set of hanzi) skips words already shown on an earlier
// keepsake, so no two keepsakes remember the same word; when everything
// mastered is excluded the caller gets "" and simply omits the line.
export function pickKeepsakeWord(store, exclude) {
  if (!store) return "";
  const skip = exclude instanceof Set ? exclude : new Set(exclude || []);
  let best = null;
  let bestLs = -Infinity;
  for (const hanzi in store) {
    const w = store[hanzi];
    if (!w || w.r < MASTERY_STREAK || skip.has(hanzi)) continue;
    const ls = typeof w.ls === "number" ? w.ls : -Infinity;
    if (best === null || ls > bestLs || (ls === bestLs && hanzi.localeCompare(best) < 0)) {
      best = hanzi;
      bestLs = ls;
    }
  }
  return best || "";
}

export function levelMastery(store, levelWords) {
  let seen = 0, mastered = 0;
  for (const w of levelWords) {
    if (store[w.h]) seen++;
    if (isMastered(store, w.h)) mastered++;
  }
  return { seen, mastered, pct: levelWords.length ? Math.round(100 * mastered / levelWords.length) : 0 };
}
