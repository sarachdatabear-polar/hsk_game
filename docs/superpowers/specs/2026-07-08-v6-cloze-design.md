# v6 Phase 3 — Cloze Sentences, HSK 1–2 (design)

**Date:** 2026-07-08 · **Status:** approved (brainstorm 2026-07-08)
**Context:** PRD-v5 §8 item 1 — the last parked question type with the
strongest learning-science case ("cloze sentences"; listening-first rounds
remain parked). Extends the v6 ladder shipped in phases 1–2
(`2026-07-07-v6-question-types.md`, `2026-07-08-v6-typed-pinyin-design.md`).
The blocker phase 2 deferred — the game has **no sentence data** — is solved
here with a build-time pipeline; nothing fetches at runtime.

## Decisions (from brainstorm)

| Question | Decision |
|---|---|
| Sentence source | **Hybrid**: Tatoeba (CC-BY) where a clean short match exists; AI-generated (Claude, in-session — same precedent as `thai-supplement.csv`) for gap words and for all Thai translations |
| Coverage | **HSK 1–2, all ~680 words** (partial coverage is fine — words without a sentence keep today's behavior). Extend by level in later rounds. |
| Ladder slot | **New rung 7–8**, typed moves to **9+**. Full ladder: 0 meaning → 1–2 listen → 3–4 reverse → 5–6 tone → 7–8 cloze → 9+ typed. Recognition-in-context before full recall. No-sentence words skip cloze: typed at 7+ as today. |
| Interaction | Sentence with the target blanked (`我去___买苹果`) as a full-width prompt row; translation underneath per meaning-language setting; **tap 1 of 4 hanzi options** (hanzi label + pinyin sub, same visual as reverse) |
| Distractors | **Vetted at build time**: 3 per sentence baked into the data as hanzi refs; each verified NOT to fit the blank. Runtime never invents cloze distractors. |
| Pacing | Walker at **0.6×** (`CLOZE_WALK_FACTOR`) — reading time, but tap-answer, so gentler than typed's 0.4× |
| Scoring | Same coins/combo as every other format (per-format bonus stays YAGNI) |

## 1. Data pipeline (build-time only)

### 1a. Curated CSV — the reviewable source of truth

`data/cloze-sentences.csv`, committed. Columns:

```
hanzi, sentence, en, th, d1, d2, d3, source
苹果,   我想吃苹果。, I want to eat an apple., ฉันอยากกินแอปเปิ้ล, 商店, 学生, 猫, ai
```

- `sentence` contains the target **exactly once**, 4–14 hanzi, every other
  content word at-or-below the target's HSK level.
- `d1–d3` are hanzi refs into the existing word data, each **at-or-below the
  target word's HSK level** (so a level-1-only pool can always resolve them),
  each vetted to NOT fit the blank grammatically/semantically.
- `source` ∈ `tatoeba` | `ai` — drives the attribution note (§1d).

Populated by a two-stage intake (run once per coverage round, artifacts
committed so the build is reproducible without network):

1. **Mine** (`scripts/cloze/mine_tatoeba.py`): download the Tatoeba
   zh-CMN↔eng pairs (cached under `scripts/cloze/.cache/`, gitignored),
   keep sentences matching the constraints above, emit candidate rows.
2. **Fill & vet** (Claude, in-session): generate sentences for words with no
   clean Tatoeba hit; translate everything to Thai; propose + vet 3
   distractors per row. Human (owner) spot-review of the CSV before merge.

### 1b. Build script

`build_cloze_data.py` (root, sibling of `build_game_data.py`; same
conventions — stdlib only, safe to re-run):

- Reads `data/cloze-sentences.csv` + `data/words.json` (for validation).
- Writes `data/cloze.js` (`window.HSK_CLOZE = {...}`, file://-loadable) and
  `data/cloze.json` (same payload, pure JSON, used by tests/validation).
- Payload keyed by hanzi, minified fields:
  ```js
  { "苹果": { "s": "我想吃苹果。", "en": "I want to eat an apple.",
              "th": "ฉันอยากกินแอปเปิ้ล", "d": ["商店","学生","猫"] } }
  ```
  The full sentence ships (not pre-blanked); blanking is runtime string work
  (§2) so QA reads natural sentences.

### 1c. Validation gate

`test/cloze-data.test.js` (vitest, reads `data/cloze.json` + `data/words.json`
like the existing asset tests):

- every key is an HSK 1–2 word; sentence contains it **exactly once**
- 4–14 hanzi; `en` and `th` non-empty
- `d` has 3 distinct refs, each a word at-or-below the key's HSK level,
  none equal to the key, none appearing in the sentence text
- payload parses and `data/cloze.js` is byte-consistent with the JSON twin
  (same pattern as the dist-bundle drift guard)

### 1d. Licensing

Tatoeba sentences are CC-BY 2.0 FR. One attribution line in the How-to-play
screen (`howto.*` i18n) + a note in `README.md`: "Some example sentences from
Tatoeba (tatoeba.org), CC-BY 2.0 FR." AI rows need no attribution.

## 2. Pure module (`src/cloze.js`)

No DOM, unit-tested, mirrors `pinyin.js`'s role for typed:

- `clozeFor(word, clozeData)` → `{ text, en, th, distractors }` or `null`
  when the word has no entry. `text` is the sentence with the single
  occurrence replaced by `"___"` (replace-first is safe — the pipeline
  guarantees exactly-one).
- `clozeOptions(word, entry, rand)` → 4 shuffled
  `{ label: hanzi, sub: pinyin, correct }` options: the target + its 3 baked
  distractors. Pinyin subs come from a hanzi→record lookup the caller
  supplies, built from the **full** word data (`HSK_DATA.levels`), not the
  scoped pool — a top-N scope may exclude a distractor. (Pure — the caller
  supplies the lookup, like `buildOptions` gets `deck`.)

## 3. Ladder & registry (`src/formats.js`)

- `formatFor(word, rec, caps)` gains a `cloze` gate:
  `r >= 9 → typed`, `7–8 → cloze` **if** `caps.cloze(word)` says a sentence
  exists, else `typed` (no-sentence words keep today's 7+ typed behavior).
  `caps` already carries environment facts (`audio`); cloze data presence is
  the same kind of fact — main.js passes `w => w.h in HSK_CLOZE`.
- Registry entry:
  ```js
  cloze: {
    plaque: { mask: true },     // ？？ — the walker must not show the answer
    audio: "never",             // speaking the word gives it away
    intro: "battle.introCloze",
    buildOptions: /* delegates to cloze.js clozeOptions */,
    prompt: "cloze",            // main.js renders the sentence prompt row
  }
  ```
- Existing fallbacks untouched (listen→meaning without audio, tone→meaning
  when no tone slots).

## 4. Battle UI (`src/main.js`)

- `renderQuestion` renders a full-width prompt row (reuses `.boss-prompt`
  styling) above the 4 option buttons: line 1 the blanked sentence, line 2
  the translation per `scope.lang` (both for "both", with the existing
  `meaning()` helper semantics).
- `CLOZE_WALK_FACTOR = 0.6` applied in the walk loop exactly like
  `TYPED_WALK_FACTOR` (same expression, per-format factor).
- Soft-intro: `battle.introCloze` EN/TH through the existing once-ever
  `formatIntros` flow (free first attempt included).
- `data/cloze.js` loads via a `<script>` tag after `words.js` in
  `index.html`; `sw.js` precache list gains the file (SHELL bump at release
  cut as usual). If the script is missing, `window.HSK_CLOZE` is undefined →
  `caps.cloze` returns false for every word → the format never triggers
  (registry-guard pattern from v7).

## 5. i18n

New keys, both locales: `battle.introCloze` ("New: fill the blank! Pick the
word that completes the sentence." / TH equivalent), `howto.attribution`
(CC-BY line). The static usage-guard test picks these up automatically.

## 6. Tests

- `test/cloze.test.js` — blanking, options assembly, null for missing words,
  distractor pass-through (no runtime invention)
- `test/cloze-data.test.js` — the §1c data gate
- `test/formats.test.js` — ladder: 7–8 cloze with sentence, typed without,
  9+ typed always; registry shape (mask plaque, audio never, intro key)
- i18n usage guard — automatic
- responsive sweep — battle screen already gated; the prompt row reuses
  boss-prompt styling which the sweep covers

## 7. Sequencing — two PRs

1. **PR 1 (pipeline + data, no gameplay change):** mining script,
   curated CSV (mined + generated + vetted), `build_cloze_data.py`,
   `data/cloze.js|.json`, validation test, README/howto attribution.
2. **PR 2 (gameplay):** `src/cloze.js`, formats registry + ladder,
   main.js prompt row + walk factor + script tag, i18n keys, tests,
   dist rebuild.

Size: ~680 rows ≈ 55–110 KB raw (~half gzipped) — within existing budgets
(single backdrops are larger).

## Deferred (explicitly out of scope)

- HSK 3+ coverage (repeat the intake per level in later rounds)
- Typed-cloze (type the missing word) — possible rung 10+ someday
- Listening-first rounds (PRD-v5 §8, still parked)
- Per-format scoring bonus (still YAGNI, unchanged from phase 2)
