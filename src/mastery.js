export function recordAnswer(store, hanzi, correct) {
  const w = store[hanzi] || (store[hanzi] = { s: 0, k: 0, r: 0 });
  w.s++;
  if (correct) { w.k++; w.r++; } else { w.r = 0; }
}

export const wordStreak = (store, hanzi) => (store[hanzi] ? store[hanzi].r : 0);
export const isMastered = (store, hanzi) => wordStreak(store, hanzi) >= 3;

export function levelMastery(store, levelWords) {
  let seen = 0, mastered = 0;
  for (const w of levelWords) {
    if (store[w.h]) seen++;
    if (isMastered(store, w.h)) mastered++;
  }
  return { seen, mastered, pct: levelWords.length ? Math.round(100 * mastered / levelWords.length) : 0 };
}
