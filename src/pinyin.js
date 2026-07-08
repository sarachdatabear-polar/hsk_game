// Tone-mark utilities for the v6 tone-recall format. We never segment pinyin
// into syllables: a "tone slot" is a marked vowel character in the string, so
// neutral syllables simply have no slot and mark placement (iu/ui, ü, erhua)
// is inherited from the data instead of recomputed.
const MARKED = {
  a: ["ā", "á", "ǎ", "à"], e: ["ē", "é", "ě", "è"], i: ["ī", "í", "ǐ", "ì"],
  o: ["ō", "ó", "ǒ", "ò"], u: ["ū", "ú", "ǔ", "ù"], "ü": ["ǖ", "ǘ", "ǚ", "ǜ"],
};
const TONE_OF = {};
for (const [vowel, arr] of Object.entries(MARKED)) {
  arr.forEach((ch, k) => { TONE_OF[ch] = { vowel, tone: k + 1 }; });
}

export function toneSlots(p) {
  const slots = [];
  [...(p || "")].forEach((ch, i) => {
    if (TONE_OF[ch]) slots.push({ i, vowel: TONE_OF[ch].vowel, tone: TONE_OF[ch].tone });
  });
  return slots;
}

export function retone(p, tones) {
  const chars = [...p];
  toneSlots(p).forEach((s, k) => { chars[s.i] = MARKED[s.vowel][tones[k] - 1]; });
  return chars.join("");
}

// ---- v6 phase 2: typed-pinyin recall (pure grading, no DOM) ----
// Word data pinyin is space-separated per syllable with tone marks
// ("nǐ hǎo", "shén me"); a syllable has at most one marked vowel.

export function syllables(p) {
  return (p || "").split(/[\s']+/).filter(Boolean);
}

// Tone number per syllable, 0 for neutral (no marked vowel).
export function syllableTones(p) {
  return syllables(p).map(s => {
    const slots = toneSlots(s);
    return slots.length ? slots[0].tone : 0;
  });
}

// Tone-stripped lowercase letters with separators removed; ü maps to `uu`
// so the player may type either "v" or "u" for it — or pass uu = "ü" to keep
// it verbatim for display labels (the tone-row label must read "nü", not "nv").
export function letters(p, uu = "v") {
  return [...(p || "").toLowerCase()]
    .map(ch => (TONE_OF[ch] ? TONE_OF[ch].vowel : ch))
    .join("")
    .replace(/ü/g, uu)
    .replace(/[^a-zü]/g, "");
}

// Grade a typed answer. toneChoices is aligned to the NON-neutral syllables
// in order (neutral syllables render no tone row). No partial credit: the
// lettersOk/tonesOk split only feeds kind feedback copy.
export function gradeTyped(p, typedLetters, toneChoices) {
  const norm = (typedLetters || "").toLowerCase().replace(/ü/g, "v").replace(/[^a-z]/g, "");
  const lettersOk = norm === letters(p, "v") || norm === letters(p, "u");
  const want = syllableTones(p).filter(t => t > 0);
  const got = toneChoices || [];
  const tonesOk = want.length === got.length && want.every((t, i) => t === got[i]);
  return { ok: lettersOk && tonesOk, lettersOk, tonesOk };
}

function shuffle(a, rand) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 3 wrong-but-plausible re-tonings: every single-slot tone change (the classic
// confusions), deduped, shuffled. null when the word has no tone marks at all
// (all-neutral particles like 吗/呢) — the caller must fall back to another format.
export function toneVariants(p, rand = Math.random) {
  const slots = toneSlots(p);
  if (!slots.length) return null;
  const orig = slots.map(s => s.tone);
  const cands = new Set();
  slots.forEach((s, k) => {
    for (let t = 1; t <= 4; t++) {
      if (t !== s.tone) {
        const tones = orig.slice();
        tones[k] = t;
        cands.add(retone(p, tones));
      }
    }
  });
  return shuffle([...cands], rand).slice(0, 3);
}
