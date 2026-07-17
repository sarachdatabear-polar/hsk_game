export const DAY = 86400000;

// Due interval grows with mastery streak: 1d/3d/7d/14d for streak 3/4/5/6+.
function dueInterval(streak) {
  if (streak >= 6) return 14 * DAY;
  if (streak === 5) return 7 * DAY;
  if (streak === 4) return 3 * DAY;
  return DAY; // streak 3 (the mastery floor)
}

const seenOf = rec => (rec && rec.s) || 0;
const streakOf = rec => (rec && rec.r) || 0;
const isWeak = rec => !!rec && streakOf(rec) <= 1 && seenOf(rec) >= 2;
const isMasteredRec = rec => streakOf(rec) >= 3;
// Missing `ls` (pre-M2 records) counts as due once mastered.
// Exported for analytics' delayed_recall wiring (main.js snapshots this at
// spawn time, before the answer mutates `ls`); dueWords/smartDeck below use
// it the same way they always have.
export const isDue = (rec, now) => isMasteredRec(rec)
  && (rec.ls == null || (now - rec.ls) >= dueInterval(rec.r));

export function wordWeight(rec, now = Date.now()) {
  if (!rec) return 1;                              // unseen baseline
  if (isWeak(rec)) return 3;                        // weak: missed recently, needs drilling
  if (isMasteredRec(rec)) return isDue(rec, now) ? 2 : 0.3;  // due vs freshly-mastered
  return 1;                                         // e.g. streak 2, or streak<=1 with 1 attempt
}

export function weakWords(store, pool) {
  return pool.filter(w => isWeak(store[w.h])).sort((a, b) => {
    const ra = store[a.h], rb = store[b.h];
    const ratioA = ra.s ? ra.k / ra.s : 0, ratioB = rb.s ? rb.k / rb.s : 0;
    return ratioA !== ratioB ? ratioA - ratioB : rb.s - ra.s;
  });
}

export function dueWords(store, pool, now = Date.now()) {
  return pool.filter(w => isDue(store[w.h], now));
}

export function smartDeck(store, pool, now = Date.now()) {
  const weak = weakWords(store, pool);
  const seen = new Set(weak.map(w => w.h));
  const deck = weak.slice();
  for (const w of dueWords(store, pool, now)) {
    if (!seen.has(w.h)) { seen.add(w.h); deck.push(w); }
  }
  return deck;
}
