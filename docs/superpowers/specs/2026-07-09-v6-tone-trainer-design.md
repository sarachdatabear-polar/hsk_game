# v6 phase 3 — Tone Trainer minigame (design)

**Date:** 2026-07-09 · **Status:** approved (decisions with Jordan 2026-07-09)
**Context:** PRD-v5 §8 ("tone perception is untrained as a skill") + the
`2026-07-07-v6-question-types-design.md` shelf item "tone-discrimination
minigame". Closes out v6 phase 3 after cloze (PRs #41/#42). Trains tone
*perception* (aural) — distinct from the existing visual `tone` ladder rung
(pick the correctly-toned pinyin from hanzi).

## Decisions (from brainstorm 2026-07-09)

| Question | Decision |
|---|---|
| Placement | **Standalone minigame** — its own screen `#s-tones`, reached from a Home secondary button. NOT a battle ladder rung (the 0→9+ ladder is full; audio-gating a rung overlaps `listen`/`tone` and risks re-numbering regressions). |
| Content | **Follow the player's selected HSK scope** — single-syllable, non-neutral-tone words within scope **that have an MP3** (527 such words across HSK1–6, ~200 in HSK1–2; all four tones well-covered: 109/121/107/190 with audio). |
| Rewards | **Light** — a completed round grants coins + XP and counts toward daily activity, but does **NOT** touch word mastery/SRS (tone ≠ meaning recall). No new quest types. |
| Audio | Reuse existing per-word MP3s via `audio.js` `speak()`. The word's known tone comes from `pinyin.js` `syllableTones()`. No new audio pipeline. |
| Reliable tone only | Eligibility keys on **bundled-MP3 presence**, not `audioAvailable()` — browser TTS can't be trusted to render tones, and only the edge-tts MP3s guarantee accuracy. Add a small `hasMp3(hanzi)` export to `audio.js` (`mp3Set.has(hanzi)`); the 527-word count was measured on MP3 presence. |
| No-audio env | Home entry is disabled (with a hint) when the scoped tone pool is empty — i.e. no MP3-backed eligible words. On `file://` the `audio/index.json` fetch fails (documented CLAUDE.md limitation) → empty `mp3Set` → Tone Trainer hidden there. Acceptable: TTS-only tone training would be misleading, so we'd rather hide than mislead. |

## 1. Pure module — `src/tone_gym.js` (no DOM, unit-tested)

Mirrors `pool.js`/`cloze.js`: pure helpers the screen wires to the DOM.

```
// A word is tone-trainable when its pinyin is a SINGLE syllable with a
// non-neutral tone AND it has an MP3 (caller supplies `hasAudio`).
export function toneEligible(word, hasAudio)   // -> boolean

// Filter a pool (scoped word list) to the trainable subset.
export function tonePool(pool, hasAudio)       // -> word[]

// Build one question: pick a word from the eligible pool, its correct tone
// (1..4 from syllableTones), and the 4 tone options are simply [1,2,3,4]
// (fixed — every question shows all four; the "distractors" are the other
// three tones). Returns null if the pool is empty.
export function toneQuestion(pool, hasAudio, rand)
//   -> { word, tone } | null      (tone = correct 1..4)

// Grade: did the tapped tone number match?
export function gradeTone(question, picked)    // -> boolean
```

- `toneEligible`: `syllables(word.p).length === 1 && syllableTones(word.p)[0] > 0 && hasAudio(word.h)`,
  where the caller passes `hasAudio = hasMp3` (bundled-MP3 only — see the
  "reliable tone" decision). Reuse `syllables`/`syllableTones` from `pinyin.js`.
- No new distractor logic — the 4 options are the tones 1–4, always.
- Pure: caller supplies `hasAudio` (from `audio.js audioAvailable`) and `rand`.

## 2. Screen — `#s-tones` (index.html)

A `<div class="screen" id="s-tones">` styled like the other festive screens:

- Back button (`data-go="home"`).
- Title + round progress ("3 / 10").
- A big **replay** button (`🔊`) — plays the current word's MP3 (never locked).
- **4 tone buttons** labelled `1 2 3 4` with the tone contour as a hint
  (e.g. `1 ˉ`, `2 ´`, `3 ˇ`, `4 ˋ`) — reuse the `.chip`/tone-chip visual
  language from the typed input for consistency + a11y (`aria-label` names
  the tone).
- After a tap: reveal the hanzi + pinyin so the ear links to the word, brief
  correct/wrong feedback, then auto-advance to the next question.
- End of round (default **10** questions): a small results line (score / best
  streak) + "Play again" + rewards granted, then back to Home.

CSS reuses existing tokens (`.screen`, `.chip`, `.boss-prompt` styling for the
reveal row). No new art assets.

## 3. Wiring — `src/main.js`

- **Home entry:** a `.sec-btn data-go="tones"` in the Home secondary row
  (next to Flashcards/Shop). Disabled (with `home.tonesDisabledHint`) when
  `!audioAvailableAny()` — a tiny helper: any MP3 in the index OR a TTS voice.
- **Route:** in the `[data-go]` handler, `else if(tab==="tones"){ startToneRound(); show("tones"); }`.
- **Round state** (module-local, like `B` for battle): current question, index,
  score, streak, `len` (10). `startToneRound()` builds the eligible pool from
  the current `pool` (scoped) via `tonePool`, seeds question 1.
- **Answer flow:** tap tone → `gradeTone` → feedback + reveal → advance; on the
  last one, `endToneRound()` credits rewards.
- **Rewards (light):** on round end, coins + XP proportional to correct count
  (reuse `shop.js` wallet add + `growth.js addXp`), and `daily.js noteActivity`
  so it feeds the streak. **Do not** call `recordAnswer`/mastery. Keep the
  numbers modest (e.g. `+1 coin` per correct, `+ correctCount` XP) — YAGNI, no
  new economy tuning.
- **Audio:** `speak(word.h)` on question show (autoplay) and on replay tap.
  Respects the same audio path as battle `listen`.

## 4. i18n (both locales)

New keys under `tones.*` and `home.*`: `home.tones` ("Tone Trainer"),
`home.tonesDisabledHint` ("Needs sound"), `tones.title`, `tones.instruction`
("Which tone did you hear?"), `tones.replay`, `tones.tone1..4` (contour
hints/labels), `tones.roundDone`, `tones.score`, `tones.again`, plus reward
copy. The static i18n usage-guard picks these up automatically.

## 5. Tests

- `test/tone_gym.test.js` — `toneEligible` (single-syllable+toned+audio gates;
  rejects multi-syllable, neutral, no-audio), `tonePool` filtering,
  `toneQuestion` (correct tone matches `syllableTones`, options are 1–4, null on
  empty pool), `gradeTone`.
- Existing suites unchanged (pure module + a new isolated screen; no battle
  ladder or formats.js changes).
- i18n usage-guard — automatic.
- Responsive: the new screen must ride the sweep at the release cut (like every
  screen); 4 big tone buttons + replay is a simple grid, low risk.

## 6. Sequencing — single PR

One PR (`feat/v6-tone-trainer`): pure module + tests, `#s-tones` screen,
main.js round loop + Home entry + light rewards, i18n, dist rebuild. No data
pipeline, no new assets, no SHELL-affecting precache additions (index.html +
app.js already precached; SHELL bump at the release cut as usual for the
user-facing change).

## Deferred (out of scope)

- Minimal-pair discrimination (hear two, pick which differs), tone-pair drills.
- Neutral tone as a 5th option (kept to 1–4 for a clean 4-button grid).
- A battle ladder rung (revisit only if the standalone mode proves popular).
- HSK 3.0 wordlists, per-format economy tuning.
