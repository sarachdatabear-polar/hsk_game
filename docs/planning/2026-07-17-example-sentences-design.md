# Example sentences on the flashcard back — design (2026-07-17)

**Status:** approved (Jordan, 2026-07-17). MVP scope.

## Goal

Add "learning depth" by showing each word used in a real sentence during study —
the roadmap's "more learning depth" lane, built as a small, zero-data-risk MVP.

## Scope (MVP — deliberately small)

- **Surface:** the **flashcard back** (the flipped/meaning side) only.
- **Data:** reuse the **existing ~495 cloze sentences**, already bundled and loaded.
  No new data build, no bundle growth, no generation/verification round.
- **Coverage:** only words that already have a cloze entry show a sentence. Words
  without one show nothing extra (no empty state). Broad coverage is a **future
  follow-up**, not this change.

## Behavior

When a learner flips a flashcard to the meaning side, for any word with an example
sentence, a row appears **below** the English/Thai meaning:

- the **Chinese sentence**,
- its **translation in the current UI language** (Thai for TH users, else English;
  falls back to English if a Thai translation is missing),
- a **🔊 button** that reads the sentence aloud.

The flashcard **front is unchanged**. A small label ("In a sentence" / Thai) heads
the row.

## Data source

Already present — no build changes:

- `data/cloze.js` sets `window.HSK_CLOZE`, keyed by hanzi →
  `{ s: <sentence>, en, th, d: [distractors] }` (generated from
  `data/cloze-sentences.csv`).
- `src/main.js:62` already loads it: `const CLOZE = window.HSK_CLOZE || {}`.

The flashcard reads the same `CLOZE` object the Cloze game mode uses. The `d`
(distractors) field is ignored here — this surface only needs `s` + a translation.

## Code shape

- **New pure module `src/examples.js`:**
  `exampleFor(word, clozeData, locale)` → `{ cn, tr }` or `null`.
  - `null` when the word has no cloze entry.
  - `cn` = `entry.s`; `tr` = `entry.th` when `locale === "th"` and non-empty, else
    `entry.en`.
  - Pure: no DOM, no globals — caller passes `clozeData` and `locale`. Mirrors how
    `src/cloze.js` is structured (data in, plain result out).
- **`renderCard()` back branch (`src/main.js:1269`):** if `exampleFor(w, CLOZE,
  getLocale())` is non-null, append the sentence row to the card markup
  (`getLocale()` from `i18n.js` is already imported in `main.js:30`; returns
  `"en"`/`"th"`). Its 🔊
  button calls the existing `speak(cn)` with `stopPropagation()` so tapping it does
  **not** flip the card — mirroring the existing `#fc-spk` handler
  (`src/main.js:1279`). No change to `#fc-know`/`#fc-again` gating.
- **CSS:** a `.fc-example` block added to `index.html`'s inline styles — muted,
  smaller than the meaning line, clearly separated (top divider/spacing).
- **i18n:** one label key (`fc.inSentence` or similar), EN + TH, added to
  `src/i18n.js`.

## Audio

Reuses the existing `speak()` (Web Speech TTS). Example sentences are not in the
bundled top-2,000 mp3 set, so they use the TTS path `speak()` already falls back
to. No new audio assets, no `build_audio.py` change.

## Testing

- **Unit (`test/examples.test.js`):** `exampleFor` returns `cn` + correct-locale
  `tr` when a sentence exists; `null` when it doesn't; English fallback when
  `locale==="th"` but the Thai translation is empty/missing.
- **Full suite** stays green (`npm test`, true exit 0).
- **Manual flashcard smoke:** flip a word that has a sentence → row + working
  speaker; flip a word without one → no row, card behaves as today.

## Release

Rebuild `dist/app.js`, bump `SHELL` v77 → v78, release `development → main` per the
ritual (this is a user-facing change, so the SHELL bump is required).

## Explicitly out of scope (future follow-ups)

- Broad sentence coverage (a bounded AI generation + verify round, or a real-corpus
  ingest like Tatoeba).
- A standalone word-detail / dictionary panel.
- Sentences on the battle prompt or the Results recap.
- Bundled sentence audio.
