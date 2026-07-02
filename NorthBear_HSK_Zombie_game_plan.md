# NorthBear HSK Zombie — Game Plan

*A frequency-ranked HSK vocabulary arcade game with scope selection (single level or aggregate range).*

---

## 1. Concept

A fast arcade game where HSK words ride in on zombies and the player kills them by
choosing the correct meaning. Inspired by **Chinese Zombie** (Wipoo Chatwaranon,
10K+ installs, aimed at Thai learners), but rebuilt on NorthBear's real-exam
frequency data — and fixing that game's single most-requested gap: **pinyin on
every word** (its top reviews, in Thai and English, all ask for pinyin and
pronunciation). It also adds the feature you asked for: the player chooses the
**scope** — one HSK level, or an aggregate range like HSK1–6 — so an HSK3 candidate
drills exactly their words.

**The pain point we fix — straight from the reference game's own reviews.** Chinese
Zombie's top reviews, in Thai and English, all ask for the same two things it lacks:
**pinyin** and **audio pronunciation** ("Good app but it's better if there is pinyin",
"อยากให้ปรับปรุงให้มีพินอินด้วย", "ควรออกเสียงคำศัพท์ด้วย"). NorthBear HSK Zombie makes
**both core, always-on features**: every word shows pinyin and can be heard out loud —
in flashcards *and* mid-battle. This is the headline reason a player switches to ours.

**Why ours wins over the reference**

- **Pinyin on every word** — always under the 汉字 (reference has none).
- **Audio on every word** — tap-to-hear pronunciation everywhere; a core feature, not an add-on.
- Thai + English meanings on every card.
- Words ranked by 65 real HSK mock exams — high-yield first, not a generic list.
- Scope selection: individual level, aggregate range, or smart filters.
- Same data already powering the NorthBear "Words to Remember" guides — one source of truth.

---

## 2. Core gameplay loop (this is your "multiple-choice" mode, dressed as the zombie battle)

1. A zombie shambles toward the base carrying a **汉字** (with pinyin under it).
2. The player is shown **4 meaning options** (Thai and/or English) and taps the right one.
3. Correct → the zombie is destroyed, score + combo multiplier rise.
4. Wrong or too slow → the zombie advances / the player loses a life.
5. Spawn rate and zombie speed ramp up; the round ends at a word count or when lives hit zero.
6. Score posts to a leaderboard (local first; online later — the reference's "who kills the most" hook).

The word that just appeared is pulled from the **selected scope pool** (Section 4),
weighted so high-frequency words appear more often.

---

## 3. Modes (the two you selected)

- **Learn — Flashcards.** Flip 汉字 ↔ pinyin / English / Thai. **Pinyin is always shown and
  the word auto-plays audio on each card, with a 🔊 replay button.** Self-paced, swipe
  known/unknown, "still learning" pile resurfaces. Warm-up before a battle, and a standalone mode.
- **Play — Zombie multiple-choice.** The core loop above. **Each zombie's word carries its
  pinyin and speaks on spawn** (toggleable), and the correct answer replays the audio so the
  sound sticks with the kill. Timed, scored, combo-based.

Both draw from the **same scope pool**, so "study these, then fight these" is seamless — and
pinyin + audio are present in both, not just the study screen.

---

## 4. The scope selector — the requested feature

A **"Choose your words"** start screen builds the word pool that feeds both modes:

- **Single level** — tap one chip: HSK1 · HSK2 · HSK3 · HSK4 · HSK5 · HSK6.
- **Aggregate range** — presets HSK1–3 · HSK1–6 · HSK4–6, or a two-handle range slider.
- **Custom** — toggle any combination of levels.
- **Smart filters** (my recommended default set, layered on top of the level choice):
  - *High-yield only* — the recurring words (Core / the ≥N-papers cut used in the PDFs).
  - *New words only* — words introduced at that level (skip the recycled lower-level ones).
  - *Top-N by frequency* — 100 / 300 / 500 / All.
  - *Meaning language* — Thai · English · Both (serves the Thai market and the global one).
- **Live readout** — "Pool: 846 words · ~94% of exam text" so the learner sees the load.

**Pool logic.** The pool = all word rows whose level is in the selection, after filters.
When the scope spans several levels, entries are **merged by 汉字 and de-duplicated**,
keeping the lowest "first-seen" level and the highest frequency — so a word recycled
across levels appears once, exactly as the study guides treat it. Last scope is
remembered (localStorage) so returning players jump straight back in.

*(Individual mock-paper selection — e.g. drill only H41327 — is deferred; it needs
per-paper word membership wired in. Noted in Section 10 as an optional later add.)*

---

## 5. Data & build pipeline

The game reads a compact JSON built from the files we already produced
(`product/by-level/HSK*_words-to-remember_bilingual.csv`). No new content work.

**Per-word record (minified):**

```json
{ "h":"帽子", "p":"mào zi", "e":"hat, cap", "t":"หมวก",
  "lv":3, "f":22, "ta":5, "tt":8, "tier":"Core", "new":true }
```

`h` hanzi · `p` pinyin · `e` English · `t` Thai · `lv` level · `f` frequency ·
`ta`/`tt` tests-appeared / total · `tier` Core/Extended · `new` introduced at this level.

**Pinyin** ships in the data already (column `p`) — nothing to add. **Audio** needs no data
for the MVP (browser TTS speaks straight from `h`); the Phase-2 recorded audio adds one
optional field, e.g. `"au":"audio/hsk3/帽子.mp3"`, generated by a one-off batch step over
the same word list.

**Build step:** a small `build_game_data.py` converts the six CSVs into
`game/words.json` (all levels) + a `manifest.json` (per-level counts, coverage).
Optionally split per level (`words_hsk3.json`) for lazy loading on mobile. Re-runs
whenever the vocabulary is refreshed — same "re-runnable" pattern as the extractor.

**Scope note on Thai:** the high-yield pool is 100% bilingual today; the low-frequency
long tail is still English-only, so if a scope reaches deep into the tail, the game
falls back to English for those few and can flag them. (Filling that tail is the open
item from the vocab work.)

---

## 6. Multiple-choice distractor generation

For each target word, the 3 wrong options are chosen to be *plausible but clearly wrong*:

- Prefer distractors from the **same scope and similar frequency band** (so a beginner
  round doesn't throw obscure meanings at them).
- **Exclude near-synonyms** (basic guard: different leading English token; not sharing the
  same Thai gloss) so there's always one unambiguous answer.
- Shuffle position; optionally show pinyin on options for an easier "recognition" difficulty.

Distractors can be precomputed at build time or drawn at runtime from the loaded pool.

---

## 7. Screens & flow

1. **Home** — Play, Learn, How-to, Leaderboard, NorthBear branding.
2. **Choose your words** (Section 4) — scope + filters + live pool readout.
3. **Warm-up (optional)** — quick flashcard pass of the pool.
4. **Battle** — the zombie loop; HUD shows score, combo, lives, words-left.
5. **Results** — score, accuracy, words missed (with meanings), "review misses in
   flashcards", share/leaderboard.
6. **Progress** — per-level mastery %, streaks, best scores (localStorage).

---

## 8. Tech stack & platform

**Recommendation: HTML5 + Phaser 3, mobile-first, shipped as a PWA, later wrapped for Android.**

- **Phaser 3** (HTML5 game engine) — sprites, animation, sound, input; the right fit for
  an arcade feel, still pure web.
- **Mobile-first portrait**, works on desktop too; installable **PWA** (offline, home-screen).
- **Ships on the web first** — embed on the NorthBear site or itch.io, one shareable link,
  demo instantly. This is the fast path to something playable.
- **Android later** — wrap the same build with **Capacitor** (or a Trusted Web Activity) to
  publish on Google Play, matching the reference app's distribution.
- **Audio — a core feature, not an add-on.** Every word is pronounceable: auto-play on
  card-flip / zombie-spawn plus a tap-to-hear 🔊 button everywhere. The MVP uses the browser
  **Web Speech API** (`speechSynthesis`, zh-CN) — free and instant. **Phase 2 upgrades to
  pre-recorded native audio** (one clip per word, generated once with a quality zh-CN TTS or a
  voice actor, then bundled/streamed) for consistent sound across every device. Pinyin + audio
  together are the headline differentiator over the reference game.
- **No backend for the MVP** — scores and progress in `localStorage`; an online leaderboard
  is a Phase 3 add.

*Ultra-light alternative for the very first demo:* a single self-contained `.html` file
(Canvas + vanilla JS, data inline) — quickest to a playable prototype, migrate to Phaser
once the loop is proven.

---

## 9. Scoring, difficulty & leaderboard

- **Score** = base per kill × combo multiplier; speed bonus for fast answers.
- **Difficulty** scales within a round (spawn rate + speed) and by level (HSK6 faster than
  HSK1). Optional **Endless** mode vs **Round** mode (e.g. 20 words).
- **Lives / base HP** — a zombie reaching the base costs a life; run ends at zero.
- **Leaderboard** — local high scores first; optional online board + friend challenge later
  (the reference's core social hook).

---

## 10. Build phases

**Phase 1 — Playable MVP (web).**
Scope selector (levels + ranges + core filters) → flashcards + zombie MC using the real
HSK1–6 data, with **pinyin on every word and tap-to-hear audio (browser TTS) built in from
day one**; local score; one clean theme. Goal: prove the loop, demo on the NorthBear site.

**Phase 2 — Game feel + PWA.**
Phaser polish (art, animation, SFX/music, combos), **pre-recorded native audio**,
progress/mastery tracking, results→review flow, installable PWA. Goal: a product people replay.

**Phase 3 — Distribution + social.**
Online leaderboard + accounts, Android build to Google Play, optional monetization
(ads or premium levels, as the reference does). Goal: a launchable app + funnel into the
NorthBear Blueprint / Thai masterclass.

---

## 11. Open decisions (your call)

- **Engine confirm** — Phaser 3 (recommended) vs a single-file Canvas MVP first.
- **Theme** — keep literal zombies (reference is rated 16+ "strong violence"), or reskin to
  an on-brand, all-ages NorthBear theme (e.g. defend the bear's honey from "vocab monsters")
  to better fit an education brand and the Thai school market.
- **Leaderboard** — online from the start, or local-only until Phase 3.
- **Audio quality path** (not *whether* — audio is core) — ship with browser TTS as the
  default, then add pre-recorded native audio in Phase 2; TTS voice vs. voice actor for the
  recordings.
- **Mock-paper scope** — add "drill one exam paper" later, yes/no.

---

*Built to reuse the existing NorthBear HSK vocabulary data — no new content required to start.*
