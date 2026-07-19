// Pure view-model builder for the word-detail panel. No DOM, no globals — the
// tested seam. Mirrors src/examples.js. Caller resolves display labels (tier,
// exam line) through i18n so this module stays locale-agnostic.
import { exampleFor } from "../examples.js";

// word: minified record { h,p,e,t,lv,f,ta,tt,c,n }
// examples: merged EXAMPLES map (cloze + HSK_EXAMPLES), keyed by hanzi
// locale: "en" | "th"
export function buildWordDetail(word, examples, locale) {
  return {
    hanzi: word.h,
    pinyin: word.p,
    english: word.e,
    thai: word.t || word.e,                 // fall back to English gloss when Thai empty
    level: word.lv,
    tier: word.c === 1 ? "core" : "extended",
    examLine: { n: word.ta, total: word.tt },
    example: exampleFor(word, examples, locale),   // { cn, tr } or null
  };
}
