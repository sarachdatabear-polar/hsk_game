// v6 question formats: the mastery ladder picks a format per word, and the
// FORMATS registry describes each format as data — what the walking plaque
// may reveal, the audio policy, the soft-intro string, and how to build the
// 4 option buttons. main.js renders; nothing here touches the DOM.
import { pickDistractors } from "./distractors.js";
import { meaning } from "./pool.js";
import { toneSlots, toneVariants } from "./pinyin.js";

function shuffle(a, rand) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Ladder: streak 0/unseen -> meaning, 1-2 -> listen, 3-4 -> reverse, 5+ -> tone.
// A miss resets the streak (mastery.js), so failures self-heal down the ladder.
export function formatFor(word, rec, caps = { audio: true }) {
  const r = (rec && rec.r) || 0;
  let f = r >= 5 ? "tone" : r >= 3 ? "reverse" : r >= 1 ? "listen" : "meaning";
  if (f === "listen" && !caps.audio) f = "meaning";      // no MP3 + no TTS
  if (f === "tone" && toneSlots(word.p).length === 0) f = "meaning"; // 吗/呢-style
  return f;
}

function meaningOptions(word, deck, lang, rand) {
  return shuffle([word, ...pickDistractors(deck, word, rand)], rand).map(o => {
    const m = meaning(o, lang);
    return { label: m.main, sub: m.sub, correct: o.h === word.h };
  });
}

export const FORMATS = {
  meaning: {
    plaque: { hz: true, py: true },
    audio: "setting",
    intro: null,               // today's format needs no introduction
    buildOptions: meaningOptions,
  },
  listen: {
    plaque: { icon: true },    // 🔊 only — the ear does the work
    audio: "always",
    intro: "battle.introListen",
    buildOptions: meaningOptions,
  },
  reverse: {
    plaque: { mask: true },    // ？？ like today's boss stage 2
    audio: "never",            // audio would say the answer
    intro: "battle.introReverse",
    buildOptions(word, deck, lang, rand) {
      return shuffle([word, ...pickDistractors(deck, word, rand)], rand)
        .map(o => ({ label: o.h, sub: o.p, correct: o.h === word.h }));
    },
  },
  tone: {
    plaque: { hz: true },      // hanzi only; pinyin would give the tones away
    audio: "never",
    intro: "battle.introTone",
    buildOptions(word, deck, lang, rand) {
      const wrong = toneVariants(word.p, rand) || [];
      return shuffle(
        [{ label: word.p, sub: "", correct: true },
         ...wrong.map(p => ({ label: p, sub: "", correct: false }))], rand);
    },
  },
};
