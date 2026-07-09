function shuffle(a, rand) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Grammatical/label words that don't carry the word's actual meaning — excluding these
// keeps "to go" vs "to go to" excluding each other (shared "go"), while "surname Li" vs
// "surname Wang" are still treated as different (only "surname" would otherwise match).
const STOPWORDS = new Set([
  "to", "a", "an", "the", "of", "in", "on", "at", "for", "and", "or", "sth", "sb",
  "one's", "etc", "be", "is", "it", "with", "up", "out", "surname", "variant",
  "used", "form", "particle", "classifier", "prefix", "suffix", "abbr", "lit", "fig"
]);

// First sense only: multi-sense glosses like "one; single" are separated by ";".
const firstSense = s => (s || "").split(";")[0];

// Content tokens of the first sense: strip parentheticals, lowercase, split on
// non-letter/apostrophe runs, drop stopwords.
const contentTokens = s =>
  firstSense(s)
    .replace(/\([^)]*\)/g, "")
    .toLowerCase()
    .split(/[^a-z']+/)
    .filter(Boolean)
    .filter(t => !STOPWORDS.has(t));

function sameMeaning(a, b) {
  const ta = contentTokens(a);
  const tb = contentTokens(b);
  if (ta.length === 0 && tb.length === 0) {
    return firstSense(a).trim().toLowerCase() === firstSense(b).trim().toLowerCase();
  }
  return ta.some(t => tb.includes(t));
}

// fullPool widens the search when pool itself is a small custom deck (e.g. a
// "Fight weak words" review of near-synonyms): a meaning-homogeneous deck can
// have <3 non-conflicting candidates even pool-wide, so fullPool (the scoped
// level pool by default) is the last fallback rather than re-filtering pool again.
export function pickDistractors(pool, target, rand = Math.random, fullPool = pool) {
  const i = pool.findIndex(w => w.h === target.h);
  const ok = w => w.h !== target.h && !sameMeaning(w.e, target.e) && !(target.t && w.t === target.t);
  let cands = pool.slice(Math.max(0, i - 40), i + 41).filter(ok);
  if (cands.length < 3) cands = pool.filter(ok);
  if (cands.length < 3) cands = fullPool.filter(ok);
  return shuffle([...cands], rand).slice(0, 3);
}
