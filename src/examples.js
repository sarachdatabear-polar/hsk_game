// Example sentences on the flashcard back (design 2026-07-17). Reuses the
// existing cloze-sentence data (window.HSK_CLOZE) — no new data build. Mirrors
// cloze.js's role: pure, no DOM, no globals; caller supplies clozeData + locale.

// Returns { cn, tr } for a word with a cloze entry, or null when it has none.
// tr is the Thai translation when locale is "th" and Thai is present
// (non-empty), else the English translation.
export function exampleFor(word, clozeData, locale) {
  const entry = clozeData && clozeData[word.h];
  if (!entry) return null;
  const tr = locale === "th" && entry.th ? entry.th : entry.en;
  return { cn: entry.s, tr };
}
