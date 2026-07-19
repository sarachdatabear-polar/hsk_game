# Thai example-sentence review queue (#127)

**Status: DRAFT — machine-translated, NOT live.** These Thai strings have not
been reviewed by a native speaker and are **not** wired into the game build.

## What this is

`data/examples-thai-review.csv` holds machine-drafted Thai translations for all
**923 HSK3 flashcard example sentences** (`hanzi,sentence,en,th`). It exists so a
native Thai reviewer edits drafts instead of translating 923 sentences from
scratch.

It is deliberately a **separate file** from `data/examples.csv` (the live source
`build_examples_data.py` reads). Nothing in the game reads this queue. Thai users
currently see the English example as a fallback (`src/examples.js: exampleFor`
returns `en` when `th` is absent) — that stays true until reviewed Thai is
promoted.

## How to promote reviewed rows to live

1. Native reviewer edits the `th` column in `data/examples-thai-review.csv`
   (fix any awkward drafts; the `hanzi`/`sentence`/`en` columns must stay
   byte-identical to `data/examples.csv`).
2. Add a `th` column to `data/examples.csv` and copy the **approved** `th`
   values across (only the rows signed off — partial promotion is fine; absent
   `th` just keeps the English fallback for those words).
3. Run `python3 build_examples_data.py` — the build now emits `th` when present
   (dormant plumbing landed 2026-07-19), so approved Thai flows into
   `data/examples.{js,json}`.
4. Bump the PWA SHELL in `sw.js` (user-facing data change) and ship as a normal
   release cut.

## Provenance

Drafted 2026-07-19 by a Sonnet worker translating the Chinese sentence (English
used as a meaning cross-check, not a literal source). Integrity-verified: 923
rows, `hanzi`/`sentence`/`en` byte-identical to the example source, every row has
non-empty Thai script, input order preserved. Quality is machine-baseline —
**native review is the gate before any of this goes live.**
