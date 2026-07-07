# Task 6 Report: Service Worker Precache + SHELL Bump (v6 Feature)

## Status
DONE

## Changes Made

### 1. Added src modules to PRECACHE array (sw.js:9-10)
Added two source module entries to the service worker’s precache list:
```javascript
"src/formats.js",
"src/pinyin.js",
```

**Placement:** After initial root-level files (index.html, dist/app.js, data/words.js, audio/index.json) and before PWA files. This grouping reflects that src modules are application code that must be available, grouped with other required app assets before the tolerant art-asset section.

### 2. Bumped SHELL cache version (sw.js:5)
Updated cache version identifier:
- **From:** `const SHELL = "nbhsk-shell-v28";`
- **To:** `const SHELL = "nbhsk-shell-v29";`

This invalidates the old shell cache on first load, forcing browsers to re-download all precached assets.

## Test Results

**Full suite:** `npm test` — all PASS
- **Test Files:** 35 passed
- **Tests:** 556 passed
- **Duration:** 1.29s
- **Critical test:** `test/sw-precache.test.js` (78 tests) — **PASSED** ✓

The sw-precache test cross-checks the PRECACHE array against files on disk and confirms:
- Both src/formats.js and src/pinyin.js are present on disk
- Both are correctly listed in sw.js precache array
- No extraneous or missing entries detected

## Commit

```
b845895 v6: precache formats/pinyin modules, SHELL v29
```

Commit message matches brief specification exactly.

## Concerns

None. Changes are minimal, isolated, and fully verified by test suite.

## Deferred

**Step 4 (End-to-end play test):** Manual verification that a full game round covers a fresh word, boss (both stages), three seeded rungs, and scoring/combo/lives behave correctly — deferred to controller after final code review.

## Summary

Task 6 complete. Service worker now precaches the two v6 format/pinyin modules, and shell cache version incremented. All 556 tests pass, including the 78 precache-validation tests. Ready for final review and manual e2e testing.

## Final-review fix wave

Fixes applied against final-review findings on branch `feat/v6-question-types`.

**Fix 1 — Gate the replay-audio path for answer-leaking formats (Critical)**
- `src/main.js` ~604-620: added a shared gate `canReplayAudio(z)` (new helper, right above `replayCurrentWord`) that returns `false` when the word is live (`z.state === "walk" && !z.revealed`) and its format's `FORMATS[...].audio === "never"`. `replayCurrentWord()` now returns early via this gate before calling `speak()`. The plaque-click and canvas-keydown call sites were unchanged (they already funnel through `replayCurrentWord`), so the fix covers both.
- `src/main.js` ~1279-1406 (`drawWordPlate`): the unconditional `drawSpeakerIcon(...)` call is now wrapped in `if(canReplayAudio(z) && !vis.icon){ ... }` — skips the icon when replay is forbidden (tone/reverse live) and also when the plaque is already showing the big 🔊 as the hanzi itself (listen format live, `vis.icon`), fixing the double-speaker-glyph cosmetic dupe.
- `src/i18n.js:154` (en) and `:311` (th) — `battle.canvasLabel` softened: en now ends "...replay the word's audio (when available)."; th appended "(เมื่อเปิดให้ฟัง)". Rest of each string unchanged.

**Fix 2 — Remove src/ precache entries (Important)**
- `sw.js` ~8-10: deleted `"src/formats.js"` and `"src/pinyin.js"` from `PRECACHE`; `SHELL = "nbhsk-shell-v29"` left untouched.
- `docs/superpowers/plans/2026-07-07-v6-question-types.md`: Tech Stack line now reads "...no build step (src/ is bundled to dist/app.js via `npm run build`; the service worker precaches the bundle, never src/)."; Task 6 Step 1 heading now carries the trailing note "[SUPERSEDED at final review: entries removed — deploys don't ship src/; only the SHELL bump stands]" (the old step body/code sample left as historical record).

**Fix 3 — Block input while walker is frozen (triage)**
- `src/main.js` (`answer(btn, o)` guard): changed to `if(!z || z.state!=="walk" || z.frozen || B.locked) return;` — closes keyboard/tab activation of enabled option buttons behind the soft-intro overlay. No behavior change to the boss stage-transition freeze path (already covered by `B.locked`).

**Fix 4 — Persist intro flag on dismissal, not on spawn (minor)**
- `src/main.js` `spawnZombie()`: removed `formatIntros[z.format] = 1; store.set("formatIntros", formatIntros);` from the intro-trigger block (now only sets `z.frozen = true; z.introFree = true;` and calls `showFormatIntro(introKey)`).
- `src/main.js` `showFormatIntro()`'s `#fi-ok` onclick: now persists `formatIntros[z.format] = 1; store.set(...)` there instead, reading the format off `B.zombie` (`z`) at dismissal time. Quitting mid-overlay (OK never clicked) no longer burns the once-ever intro or the free attempt.

**Fix 5 — Rebuild bundle**
- Ran `npm run build` (esbuild → `dist/app.js`, 171.9kb) after all source edits above; verified via grep that `canReplayAudio`, the `z.frozen` guard, and the intro-flag-on-dismiss logic are present in the rebuilt bundle.

**Test run**
- `npm test` → 35 files, 554 tests, all passed (including `test/sw-precache.test.js`, green after the src/ entries were dropped — no changes needed to the test).

**Commit**
- One commit covering `src/main.js src/i18n.js sw.js dist/app.js docs/superpowers/plans/2026-07-07-v6-question-types.md`, message: `v6: final-review fixes — gate replay audio, drop src precache, freeze guard, intro flag on dismiss`.

