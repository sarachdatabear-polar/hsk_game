// v6 phase 3: cloze-sentence recall (pure, no DOM). Mirrors pinyin.js's role
// for the typed format — the sentence data + baked distractors come from the
// build-time pipeline (window.HSK_CLOZE); this module only blanks the sentence
// and assembles the 4 option buttons. Runtime never invents cloze distractors.

// Blank the single target occurrence. The pipeline guarantees the target
// appears exactly once, so replace-first is safe. Returns null when the word
// has no cloze entry (caller keeps today's behavior for that word).
export function clozeFor(word, clozeData) {
  const entry = clozeData && clozeData[word.h];
  if (!entry) return null;
  return {
    text: entry.s.replace(word.h, "___"),
    en: entry.en,
    th: entry.th,
    distractors: entry.d,
  };
}

// 4 shuffled options: the target hanzi + its 3 baked distractors, each with a
// pinyin sub. Pinyin comes from a hanzi->record lookup the caller supplies,
// built from the FULL word data (not the scoped pool — a top-N scope may
// exclude a distractor). Pure: the caller supplies `byHanzi` and `rand`.
export function clozeOptions(word, entry, byHanzi, rand) {
  const opts = [{ label: word.h, sub: word.p, correct: true }].concat(
    (entry.distractors || entry.d || []).map(h => ({
      label: h,
      sub: (byHanzi && byHanzi[h] && byHanzi[h].p) || "",
      correct: false,
    }))
  );
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return opts;
}
