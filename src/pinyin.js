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
