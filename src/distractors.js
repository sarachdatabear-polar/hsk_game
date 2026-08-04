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

// Every sense of a gloss, trimmed, dropping empties ("one; single" -> ["one", "single"]).
const senses = s => (s || "").split(";").map(x => x.trim()).filter(Boolean);

// Content tokens of a SINGLE sense: strip parentheticals, lowercase, split on
// non-letter/apostrophe runs, drop stopwords.
const senseTokens = s =>
  (s || "")
    .replace(/\([^)]*\)/g, "")
    .toLowerCase()
    .split(/[^a-z']+/)
    .filter(Boolean)
    .filter(t => !STOPWORDS.has(t));

// Two senses collide when their content tokens overlap, or — degenerate case —
// when a sense is entirely stopwords (e.g. "or", "lit") and both sides' raw
// sense text matches exactly (so "or" vs "or" still collides even though "or"
// itself is filtered as a stopword).
function sensesCollide(sa, sb) {
  const ta = senseTokens(sa);
  const tb = senseTokens(sb);
  if (ta.length === 0 && tb.length === 0) return sa.toLowerCase() === sb.toLowerCase();
  return ta.some(t => tb.includes(t));
}

// Same meaning across the FULL gloss: check every sense of a against every
// sense of b (not just the two first senses), because the game DISPLAYS the
// whole multi-sense string to the player — the reverse-format prompt renders
// all of w.e, and the meaning/listen formats show full glosses as the 4
// answer options. A candidate colliding on ANY displayed sense pair is a
// player-visible ambiguity and must be excluded. This is the old first-sense
// comparison generalized to every sense pair (sense[0] vs sense[0] is one of
// the pairs checked), so it's a strict superset of the old behavior: nothing
// the old code excluded stops being excluded now, it can only exclude more.
function sameMeaning(a, b) {
  const sa = senses(a), sb = senses(b);
  for (const x of sa) {
    for (const y of sb) {
      if (sensesCollide(x, y)) return true;
    }
  }
  return false;
}

// Thai has no spaces: compare sense-level, not token-level, with synonyms
// (comma-separated within a sense) matched by exact whole-string equality —
// Thai substring matching would false-positive on prefixes like น้ำ in
// น้ำแข็ง. Real data confirms Thai glosses use the same "; "-separated
// multi-sense format as English (e.g. "คือ; ใช่"): 1,106 of 13,921 words'
// `t` fields contain ";" (2026-08-04 data-inspection). Same-meaning across
// the FULL Thai gloss: check every sense of a against every sense of b (not
// just the first), mirroring sameMeaning above, because the game displays
// the whole Thai gloss too (reverse prompt / meaning options when
// scope.lang is "th"). Real-data example this catches that first-sense-only
// missed: 是 "คือ; ใช่" vs 对 "ถูกต้อง; ใช่" collide on their shared 2nd sense
// "ใช่". Degenerates to the old single-pair comparison when both sides have
// only one sense, so single-sense Thai behavior is unchanged.
const thaiSynonyms = s => s.split(",").map(x => x.trim()).filter(Boolean);
function thaiSensesCollide(sa, sb) {
  const xa = thaiSynonyms(sa), xb = thaiSynonyms(sb);
  return xa.some(x => xb.includes(x));
}
function sameThai(a, b) {
  const sa = senses(a), sb = senses(b);
  for (const x of sa) {
    for (const y of sb) {
      if (thaiSensesCollide(x, y)) return true;
    }
  }
  return false;
}

// Two candidates collide when they'd render the same gloss to the player —
// either their full English glosses share a content token (any sense vs any
// sense), or (Thai present on both) any sense of one Thai gloss shares a
// synonym with any sense of the other.
function collide(a, b) {
  return sameMeaning(a.e, b.e) || !!(a.t && b.t && sameThai(a.t, b.t));
}

// Greedily pick up to 3 mutually non-colliding candidates from an already-
// shuffled list, skipping any candidate that collides with one already
// picked. Returns both the picks and the shuffled order so a caller that
// falls short can top back up from the same order as a last resort.
function pickMutuallyDistinct(cands, rand) {
  const shuffled = shuffle([...cands], rand);
  const picked = [];
  for (const c of shuffled) {
    if (picked.some(p => collide(p, c))) continue;
    picked.push(c);
    if (picked.length === 3) break;
  }
  return { picked, shuffled };
}

// fullPool widens the search when pool itself is a small custom deck (e.g. a
// "Fight weak words" review of near-synonyms): a meaning-homogeneous deck can
// have <3 non-conflicting candidates even pool-wide, so fullPool (the scoped
// level pool by default) is the last fallback rather than re-filtering pool again.
export function pickDistractors(pool, target, rand = Math.random, fullPool = pool) {
  const i = pool.findIndex(w => w.h === target.h);
  const ok = w => w.h !== target.h && !sameMeaning(w.e, target.e) && !(target.t && w.t && sameThai(w.t, target.t));

  let cands = pool.slice(Math.max(0, i - 40), i + 41).filter(ok);
  let { picked, shuffled } = pickMutuallyDistinct(cands, rand);
  if (picked.length < 3) {
    cands = pool.filter(ok);
    ({ picked, shuffled } = pickMutuallyDistinct(cands, rand));
  }
  if (picked.length < 3) {
    cands = fullPool.filter(ok);
    ({ picked, shuffled } = pickMutuallyDistinct(cands, rand));
  }
  if (picked.length < 3) {
    // Absolute last resort: even fullPool can't yield 3 mutually distinct
    // glosses. Top back up with colliding candidates so the function still
    // returns 3 whenever 3 candidates exist at all (prior worst-case behavior).
    for (const c of shuffled) {
      if (picked.includes(c)) continue;
      picked.push(c);
      if (picked.length === 3) break;
    }
  }
  return picked;
}
