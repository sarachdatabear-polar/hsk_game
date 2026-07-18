# Example sentences — HSK3 coverage round (2026-07-18)

Follow-up to the v78 example-sentences MVP (`2026-07-17-example-sentences-design.md`),
which put an "In a sentence" row on the flashcard back reusing the ~495 bundled cloze
sentences. This round **broadens coverage**. Analysis + build; ships to `development`.

## Scope decision

The existing 495 example words are **exactly the distinct HSK1 (205) + HSK2 (290) set**
— both 100% covered. HSK3 has **934 distinct words with no sentence**. This round
generates those 934, giving **complete HSK1–3 (beginner-core) coverage**. HSK4–6
(12,588 words) are deferred to later rounds.

## Method: AI-generate + verify, offline

- **EN-only this round.** Thai is a P0 review-gated copy category on this project (native
  sign-off queue). Generating 934 unreviewed AI Thai strings would violate that. So we
  emit `{s, en}` only; `src/examples.js: exampleFor` already falls back to the English
  translation when `th` is absent, so Thai users see the English sentence. A Thai pass
  routes through the existing i18n review pipeline separately, later.
- **Generation is a one-off, offline step**, not a runtime call (respects the `file://`
  constraint and costs nothing at play time). Worker subagents (Sonnet) generate; a
  verify pass checks; the durable artifact is a committed CSV. `npm run build`/CI never
  invoke AI.
- **Quality gates, cheapest-first:**
  1. *Mechanical* (scratchpad `gate.mjs` + baked into `build_examples_data.py`): target
     hanzi is a literal substring of `s`; body length 5–16 chars; terminal `。？！`; `en`
     non-empty; no overlap with cloze words; no duplicates.
  2. *LLM verify* (separate subagents): naturalness, grammatical correctness, and
     **sense-match** to the word's English gloss (multi-sense words are the real failure
     mode — a substring check can't catch a wrong-sense sentence).
  3. Words failing verify are regenerated once; anything failing twice is **deferred and
     reported**, never shipped marginal.
- Calibrated to the length/tone of the live cloze sentences (short, everyday).

## Architecture (minimal, additive)

- New data: `data/examples.csv` (hanzi, sentence, en) → `build_examples_data.py` →
  `data/examples.js` (`window.HSK_EXAMPLES = {h: {s, en}}`) + `data/examples.json`.
  Deterministic, validation-gated, mirrors `build_cloze_data.py`.
- `index.html`: add `<script src="data/examples.js"></script>` after `cloze.js`.
- `sw.js` PRECACHE: add `"data/examples.js"` (mirrors `data/cloze.js`). Stays within the
  ≤70-entry / ≤10 MB shell budget (`test/sw-precache.test.js`).
- `src/main.js`: keep `CLOZE = window.HSK_CLOZE` for the **cloze game** (needs its
  distractors). Add `EXAMPLES = {...CLOZE, ...window.HSK_EXAMPLES}` and pass it to
  `exampleFor` at the flashcard-back call site (was `CLOZE`). The cloze *game* is
  untouched; only the example surface widens.
- `src/examples.js` is unchanged (already a pure `(word, dataMap, locale)` function).

## Non-goals (unchanged from MVP)

Thai for these 934 (separate review pass), HSK4–6 coverage, a word-detail panel,
sentences on the battle prompt / Results, bundled sentence audio.

## Release note

Adds user-facing content + a new bundled data file → the eventual `development→main`
release needs a `SHELL` bump (v81→v82). **This round does not bump** — it lands on
`development`; the bump happens at release time (owner gate), consistent with the repo's
release process. `test/sw-precache.test.js` stays pinned to v81 until then.

## Delegation

Lead: scope, design, prompt calibration, pilot review, integration, PR. Workers (Sonnet):
batch generation (10× ~94 words) + LLM verify. Pilot one batch and read it in full before
fanning out the remaining ~840.

## Outcome (2026-07-18)

Generated 934, mechanically gated 934/934 clean, LLM-verified (6 reviewers). **17 deferred
(1.8%)**, **917 shipped**. Live flashcard smoke (Playwright chromium, HSK3-new scope):
17 HSK3 cards rendered our generated sentences, 0 untraceable, 0 console errors.

### Deferred (17) — not shipped this round

- **Mis-segmented catalog fragments (7)** — not real standalone words, can't take a natural
  example: `时会` (of 有时会), `再借不难`, `让你在`, `路上车`, `雨来`, `越忙` (of 越来越忙),
  `好地解决`. These are frequency-extraction artifacts in the HSK3 word list.
- **Gloss/example sense divergence (7)** — `把`, `比较`, `一边`, `总`, `慢走`, `穿着`, `再有`.
  The generated sentence uses the word's common sense, but it differs from the catalog gloss
  shown on the same card, which would read as a contradiction. Deferred rather than show a
  mismatched card.
- **Genuine catalog gloss errors (3)** — worth an owner data-fix, independent of this round:
  `故事` glossed "old practice" (should be **"story"**), `接下来` glossed "to accept; to take"
  (should be **"next"**), `不想` glossed "unexpectedly" (common sense is **"don't want to"**).

The 7 fragment "words" and 3 gloss errors are catalog-quality issues in `product/by-level`
(HSK3), surfaced by this round but out of its scope to fix.
