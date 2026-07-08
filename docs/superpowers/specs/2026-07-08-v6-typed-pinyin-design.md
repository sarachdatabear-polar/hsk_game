# v6 Phase 2 — Typed-Pinyin Recall (design)

**Date:** 2026-07-08 · **Status:** approved (brainstorm 2026-07-08)
**Context:** PRD-v5 §8 item 1 — "typed-pinyin/tone recall", the generation-effect
(d≈0.40) upgrade over multiple choice. Extends the v6 phase-1 mastery ladder
(`docs/superpowers/plans/2026-07-07-v6-question-types.md`).

## Decisions (from brainstorm)

| Question | Decision |
|---|---|
| Phase-2 goal | Deepen the per-word ladder (not cloze, not a separate tone minigame) |
| Input method | **Letters + tone taps**: native keyboard for plain letters, then a row of tone buttons (1–4) per syllable. No IME, no tone-number convention to teach. |
| Pacing | Walker moves at **0.4×** for the whole typed question (`TYPED_WALK_FACTOR`, tunable) |
| Ladder placement | **Typed at streak 7+; tone-MC becomes 5–6.** Full ladder: 0 meaning → 1–2 listen → 3–4 reverse → 5–6 tone → 7+ typed. Recognition before production. |
| Scoring | Same coins/combo as other formats (bonus tunable later; YAGNI now) |
| Cloze / tone minigame | Stay parked in §8; each would get its own spec |

## 1. Ladder & format registry (`src/formats.js`)

- `formatFor`: `r >= 7 → "typed"`, `5–6 → "tone"`, `3–4 → "reverse"`,
  `1–2 → "listen"`, else `"meaning"`. Existing caps/fallbacks unchanged
  (`listen` still degrades to `meaning` without audio; `tone` still degrades
  to `meaning` when `toneSlots(word.p)` is empty).
- New registry entry:
  ```js
  typed: {
    plaque: { hz: true },       // hanzi only; py would be the answer
    audio: "never",             // hearing the word would give it away
    intro: "battle.introTyped", // reuses v6 soft-intro + free-first-attempt
    input: true,                // main.js renders the input UI, not option buttons
  }
  ```
  `input: true` is the one registry-shape addition; tap formats keep
  `buildOptions` and don't change.
- A word with no tone slots (吗/呢-style all-neutral) still gets `typed` —
  its tone rows just don't render and grading skips tones. No fallback needed.
- Miss handling untouched: a wrong grade resets the streak (mastery.js), so
  the word self-heals down to friendlier formats.

## 2. Pure grading (`src/pinyin.js`)

Three pure additions (unit-tested, no DOM):

- `syllables(p)` — split a pinyin string into syllables: `"nǐ hǎo"` →
  `["nǐ", "hǎo"]`. Splits on spaces and apostrophes (`xī'ān` → 2).
- `letters(p)` — tone marks and separators stripped, lowercased:
  `"nǐ hǎo"` → `"nihao"`. `ü` normalizes so the player may type `v` **or** `u`
  (`nǚ` accepts `nv` and `nu`).
- `gradeTyped(targetPinyin, typedLetters, toneChoices)` →
  `{ ok, lettersOk, tonesOk }`. Letters compare case/space/apostrophe-
  insensitively against `letters(target)`. Tones compare per non-neutral
  syllable against the target's tone numbers; neutral syllables are skipped.
  `ok = lettersOk && tonesOk`. No partial credit for mastery — the split
  result only feeds feedback copy.

## 3. Battle UI (`src/main.js` + `index.html`)

For a question whose format has `input: true`:

- Plaque: hanzi as usual (per `plaque: {hz:true}`).
- Below it: one text field (`autocapitalize="off" autocorrect="off"
  spellcheck="false" inputmode="text"`), then one tone row per target
  syllable — four tap-chips ○1 ○2 ○3 ○4, single-select — for non-neutral
  syllables only. Showing the syllable count is an accepted scaffold.
- ATTACK button enables when the letters field is non-empty and every
  rendered tone row has a selection. Grading calls `gradeTyped`; correct →
  normal kill flow, wrong → normal miss flow **plus** a kind diff line
  (letters right / tones off, or vice versa).
- Walker speed multiplied by `TYPED_WALK_FACTOR = 0.4` while a typed
  question is active (not focus-dependent — the whole question).
- Soft-intro and the free first attempt come for free from
  `FORMATS.typed.intro` via the existing v6 mechanism.

## 4. Scoring & kindness

Identical coins/combo to other formats. The kind-diff feedback names what was
off without granting credit. No changes to boss logic, quests, or wallet.

## 5. i18n & tests

- New keys (EN + TH, auto-guarded by `test/i18n-usage.test.js`):
  `battle.introTyped`, `battle.typedPlaceholder`,
  `battle.typedLettersOk` ("Letters right — check the tones!"),
  `battle.typedTonesOk` ("Tones right — check the spelling!").
- `test/formats.test.js`: ladder mapping incl. 7+, tone band shift to 5–6,
  degradation cases unchanged, `typed` registry shape (`input`, no
  `buildOptions`, audio `never`).
- `test/pinyin.test.js`: `syllables` / `letters` / `gradeTyped` — multi-
  syllable, ü (`v` and `u` accepted), neutral tones, apostrophes, wrong
  letters vs wrong tones vs both.
- UI wiring stays thin and is not unit-tested, per the codebase's
  pure-module convention; verify by driving a battle to a streak-7 word.

## Out of scope

Cloze sentences (needs a sentence-content pipeline), the tone-discrimination
minigame, per-format scoring bonuses, and any change to the four existing
formats beyond the tone band's streak range.
