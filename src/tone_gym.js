// v6 phase 3: tone-discrimination minigame (pure, no DOM). Mirrors cloze.js's
// role for the tone format — the screen wires these helpers to the DOM. A
// word is tone-trainable when its pinyin is a SINGLE syllable with a
// non-neutral tone AND it has a bundled MP3 (browser TTS can't be trusted to
// render tones — see the design spec's "reliable tone only" decision).
import { syllables, syllableTones } from "./pinyin.js";

// -> boolean
export function toneEligible(word, hasAudio) {
  return syllables(word.p).length === 1
    && syllableTones(word.p)[0] > 0
    && hasAudio(word.h);
}

// Filter a (scoped) pool to the tone-trainable subset.
export function tonePool(pool, hasAudio) {
  return (pool || []).filter(w => toneEligible(w, hasAudio));
}

// Build one question: a random eligible word + its correct tone (1..4). The
// 4 options are always [1,2,3,4] — no distractor logic needed. Null when the
// pool is empty. Pure: caller supplies `hasAudio` and `rand` (0..1).
export function toneQuestion(pool, hasAudio, rand) {
  const eligible = tonePool(pool, hasAudio);
  if (!eligible.length) return null;
  const word = eligible[Math.floor(rand() * eligible.length)];
  return { word, tone: syllableTones(word.p)[0] };
}

// Grade: did the tapped tone number match the question's correct tone?
export function gradeTone(question, picked) {
  return !!question && question.tone === picked;
}
