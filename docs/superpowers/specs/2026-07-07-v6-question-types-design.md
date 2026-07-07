# v6 — Question types (design)

**Date:** 2026-07-07 · **Status:** approved by owner (brainstorm session)
**Source:** PRD v5 §8.1 — "new question types" is the top v-next candidate
(generation effect d≈0.40; MC-only is competitors' top documented weakness).

## Goal

Break the multiple-choice-only ceiling of the battle by adding three tap-based
question formats, chosen **per word inside the normal battle** by the word's
own mastery, introduced kindly. No new modes, no new menus, no economy changes.

## Product decisions (owner-approved)

1. **Placement:** inside the battle, per-word. One battle mode; each walking
   word's format follows its SRS/mastery stage.
2. **Formats in v6:** listening-first, reverse recall, tone recall (tap-based).
   Typed pinyin and cloze/sentences are explicitly deferred (typed input
   fights the walk timer + mobile keyboard; cloze needs a sentence-content
   pipeline that does not exist).
3. **Format picker:** plain mastery ladder, no randomness.
4. **Introduction:** soft-intro moments — first appearance of each format
   freezes the walker, one cat-guide line explains it, and the first-ever
   attempt of each format can never cost a life.

## The mastery ladder

Driven by the word's answer streak `store[hanzi].r` (mastery.js), which
resets to 0 on any miss — so failures self-heal back down the ladder.

| Streak | Format | Rationale |
|---|---|---|
| unseen / 0 | `meaning` — today's meaning-MC | recognition first |
| 1–2 | `listen` — listening-first | ear before eye while learning |
| 3–4 | `reverse` — meaning → pick hanzi | true recall at mastery threshold |
| 5+ | `tone` — pick correctly-toned pinyin | precision for strong words |

**Bosses are unchanged**: their existing two-stage ritual (meaning → reverse)
keeps its own path and never consults the ladder. The A4 first-run intro
battle pins every word to `meaning`.

## Per-format behavior

The load-bearing rule is what the walking plaque may reveal:

| Format | Plaque shows | Auto-audio | Buttons |
|---|---|---|---|
| meaning | hanzi + pinyin | per autoSpeak setting | 4 meanings (today's) |
| listen | 🔊 icon only | **always** plays; replay button above grid | 4 meanings |
| reverse | the meaning | **never** (audio says the answer) | 4 × hanzi + pinyin |
| tone | hanzi only | **never** (audio sings the answer) | 4 × same pinyin, different tone marks |

- After any resolution, the plaque reveals full hanzi + pinyin + meaning as
  today (`z.revealed` behavior unchanged).
- **Audio downgrade rule:** if a word has no bundled MP3 and `chooseTts()`
  returns `"none"`, `listen` silently downgrades to `meaning`. An audio
  question must never be unanswerable.
- **Tone options:** the target's pinyin re-marked with wrong-but-plausible
  tone patterns, e.g. 你好 → `nǐ hǎo` / `ní hào` / `nī hāo` / `nì hǎo`.
  Single syllables draw from 5 tones (incl. neutral) so 4 distinct options
  always exist. Distractor patterns must differ from the target and from
  each other.
- **Scoring, lives, combo, one-attempt rule: identical across formats.**
  Harder formats are the learning upgrade, not an economy change ("no fake
  difficulty" promise from v5 holds).

## Soft-intro moments

- Persisted per-format flag (e.g. `introSeen.listen`) in the existing save
  blob.
- First time a format would appear: freeze the walker (`z.frozen`, the boss
  transition mechanism), show a one-line cat-guide bubble
  ("Listen first — tap what you hear!"); on dismiss the walker resets to its
  spawn position so the intro never eats thinking time.
- First-ever attempt per format: a wrong answer reveals the correct one and
  routes the word to the miss deck **without costing a life**.
- All strings via i18n.js, EN + TH.

## Architecture

### New: `src/formats.js` (pure, no DOM)

- `formatFor(rec, capabilities) -> "meaning"|"listen"|"reverse"|"tone"` — the
  ladder; `capabilities.audio === false` downgrades `listen` to `meaning`.
- `FORMATS` registry, per format: plaque flags `{hz, py, icon, meaning}`,
  audio policy, intro string id, and `buildOptions(word, deck, rand)`
  returning plain data `[{label, sub, correct}]` (uses `pickDistractors` for
  meaning/listen/reverse; `toneVariants` for tone).

### New: `src/pinyin.js` (self-contained text utility)

- `syllableTones("nǐ hǎo") -> [3, 3]` (0 = neutral)
- `applyTones("ni hao", [2, 4]) -> "ní hào"` — correct vowel gets the mark
  (a > e > o > i/u/ü; iu/ui mark the second vowel), ü preserved
- `toneVariants(pinyin, rand) -> [3 wrong re-tonings]` — distinct from target
  and from each other; erhua 儿 syllable carries no tone slot

### Changed: `src/main.js` (kept thin)

- `renderOptions` + `renderBossHanzi` merge into `renderQuestion(word, format)`
  consuming `FORMATS[format].buildOptions(...)`; boss stages call it with
  pinned formats (`"meaning"`, `"reverse"`).
- `spawnWord` calls `formatFor` once, stores `z.format`; `drawWordPlate`
  reads plaque flags from the format instead of always drawing hanzi+pinyin.
- Listening replay button lives above the `#opts` grid.
- Soft-intro check in `spawnWord`; free-first-miss check in `answer()`.

## Error handling

- No MP3 + no TTS → downgrade to `meaning` (never a dead question).
- Deck < 8 words → `pickDistractors` already falls back to the full pool;
  tone variants never depend on the deck at all.
- Malformed/empty pinyin (defensive): word falls back to `meaning`.
- Save blobs from v5 (no `introSeen`): treated as all-unseen — intros fire
  once each, harmless for existing players.

## Testing

- `pinyin.test.js` — tone parse/re-mark table: multi-syllable, neutral tone,
  ü, erhua, iu/ui placement, roundtrip `applyTones(strip(p), syllableTones(p))
  === p`.
- `formats.test.js` — ladder mapping for every rec shape (unseen, streak 0
  after miss, 1–2, 3–4, 5+); audio-capability downgrade; option building per
  format (always 4, correct present exactly once, no duplicate labels, tone
  variants ≠ target and pairwise distinct); soft-intro gating (fires once,
  persists).
- Existing `boss.test.js` + battle-adjacent suites guard the
  `renderQuestion` refactor; no changes expected in scoring/quests/srs tests.

## Out of scope (v6.5+ shelf)

Typed pinyin, cloze/sentence content pipeline, tone-discrimination minigame,
scoring/economy changes, HSK 3.0 wordlists, radicals/example sentences.
