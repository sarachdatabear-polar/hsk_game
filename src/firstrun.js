"use strict";
// First-run decisions (PRD v5 A4). Pure: main.js owns localStorage
// (nbhsk.introDone) and passes state in.

// The intro runs only for a genuinely fresh profile: never completed AND no
// mastery recorded. Existing players (pre-feature saves have no introDone
// key but do have mastery) must never see it retroactively.
export function isFirstRun(introDone, masteryStore) {
  return !introDone && Object.keys(masteryStore || {}).length === 0;
}

// The guaranteed-win warm-up deck: the n highest-frequency words of the
// chosen scope (most frequent first). Copies — never mutates the pool.
export function introDeck(pool, n = 6) {
  return [...pool].sort((a, b) => (b.f || 0) - (a.f || 0)).slice(0, n);
}
