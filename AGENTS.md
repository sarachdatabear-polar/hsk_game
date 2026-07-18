# AGENTS.md

Canonical agent guidance for the **Lucky Cat HSK** game repo. Works for both Codex
(reads this file) and Claude Code (via `CLAUDE.md`, which imports this file). Keep all
project guidance here so the two stay in sync.

## What this repo is

**"Lucky Cat HSK"** — a Chinese-vocabulary arcade game shipped as a browser PWA and an
Android app. Vanilla JS, no framework. ES modules in `src/` are bundled to `dist/app.js`
by esbuild. `index.html` holds all markup + CSS inline; game data lives on
`window.HSK_DATA` (from `data/words.js`). Ships as a PWA (service worker `sw.js`) and
wraps into Android via Capacitor.

This is a **separate git repo** (`hsk_game`), nested inside the larger `lucky_cat_hsk`
repo on the home base but tracked independently. `origin/development` is the source of
truth; `main` lags and is what deploys via GitHub Pages.

### Cross-repo data dependency

`build_game_data.py` reads the curated CSVs from the **parent** repo at
`../product/by-level/HSK<n>_words-to-remember_bilingual.csv` and `../product/thai-supplement.csv`.
Those live in the `lucky_cat_hsk` repo, **not here**. Cloning `hsk_game` standalone gives
you a runnable/buildable game (bundled `data/` is committed), but you cannot **rebuild**
the vocabulary without the sibling `product/` directory.

## Commands

```sh
npm ci            # install
npm test          # vitest, ~2,000 tests
npm run build     # esbuild src/main.js → dist/app.js (IIFE bundle)
npm run serve     # python http.server at :8000
npm run cap:sync  # build + stage www/ + npx cap sync android
npm run apk:release  # signed release APK (scripts/build_apk.ps1) — Windows desktop only, keystore-bound
```

## `src/` modules (~65 files)

- `main.js` (~4,200 LOC) — DOM/canvas wiring: screens, scope selector, flashcards, battle
  loop, shop/street/progress rendering, pause/resume. Everything else is a small pure helper.
- Game rules: `pool.js` (buildPool/coverage/scope keys/`meaning()`/`normalizeLen`),
  `distractors.js` (3 wrong answers near the target, same-meaning excluded by content-token
  overlap), `scoring.js`, `mastery.js` (streak ≥ 3 = mastered), `srs.js` (word weights,
  weak/due words, smart deck), `boss.js`, `hud.js`, `nav.js`.
- Meta-game: `daily.js`, `quests.js` (3 date-hashed daily quests), `growth.js` (XP curve +
  milestones), `shop.js` (catalog/wallet), `street.js`.
- Rendering/platform: `cat.js`, `raccoon.js`, `sprites.js`, `assets.js`, `nineslice.js`,
  `fx.js`, `layout.js`, `fonts.js`, `icons.js`, `i18n.js`, `sfx.js`, `audio.js`
  (bundled mp3 → Web Speech fallback), `native.js` (Capacitor bridges).
- Monetization: `src/monetization/` (`purchases.js`, `purchase-poll.js`; server side in
  `supabase/functions/rc-webhook/`). Ships **dark** until a real provider is wired.

Tests in `test/*.test.js` (~2,000) cover every pure module plus asset/precache validation;
`main.js` wiring is untested by design.

## Data build scripts

- `build_game_data.py` — reads `../product/by-level/HSK<n>_words-to-remember_bilingual.csv`
  → writes `data/words.js`, `data/words.json`, `data/manifest.json`. Per-word record is
  minified: `h` hanzi, `p` pinyin, `e` english, `t` thai, `lv` level, `f` frequency,
  `ta`/`tt` tests-appeared/total, `c` tier (1=core), `n` (1=introduced at this level).
- `build_audio.py` — per-word MP3s via edge-tts (`zh-CN-XiaoxiaoNeural`) for the top 2,000
  words by frequency → `audio/*.mp3` + `audio/index.json`. Re-runnable (skips existing);
  re-run after `build_game_data.py` when vocabulary refreshes.

## Deploy

Push to `main` runs `.github/workflows/deploy-pages.yml`: `npm ci` → `npm test` →
`npm run build` → `node scripts/stage-www.js` (stages `www/`) → GitHub Pages.

**PWA cache busting:** when shipping user-facing changes, bump the `SHELL` cache version
constant in `sw.js` (e.g. `nbhsk-shell-v66` → `-v67`) so installed PWAs fetch the updated
shell.

Android build details: `docs/build/ANDROID_BUILD.md`.

## Conventions & gotchas

- **file:// constraint:** the game must run when opened directly (no server). `fetch` for
  `audio/index.json` fails silently on `file://` and falls back to TTS-only — keep that
  pattern for any bundled data.
- After changing `src/`, run `npm run build` — the served/deployed app uses `dist/app.js`,
  not the raw modules.
- Keep game logic in small pure modules with unit tests; `main.js` wires them to the DOM/canvas.
- `localStorage` keys are namespaced `nbhsk.*`.
- Never mask the test exit code (don't pipe `npm test` to `tail`/`grep`) when gating a
  commit — catalog tests hardcode prices and must actually fail loudly.
- **Persistence goes through `src/storage.js`** (`createStore`) — never call
  `localStorage` directly from feature code. New `nbhsk.*` keys: decide sync vs
  local-only explicitly (sync = add to `SYNC_KEYS` in `merge.js`).
- **Changing a stored shape requires a migration:** bump `CURRENT_SCHEMA_VERSION`
  in `src/migrations.js` and append a `{ to, up(storage) }` ladder entry. Never
  change a stored shape without one — old installs will silently lose that data.
- **`main.js` is frozen at its current scope.** Each NEW screen/feature gets its
  own wiring module (e.g. `src/ui/<feature>-screen.js`) that `main.js` only
  mounts; don't grow `main.js` with new feature wiring. When touching an existing
  feature's wiring, extracting it is welcome but not required.
- **Lint before pushing:** `npm run lint` (ESLint flat config, `eslint.config.mjs`).
  CI runs lint + test + build on every PR and push to `development`.
- **Crash log:** uncaught errors land in the local-only `nbhsk.errlog` ring buffer
  (30 entries). To inspect on a device: `JSON.parse(localStorage["nbhsk.errlog"])`.

## Handoff between sessions / machines

The persistent handoff doc, `HANDOFF.md`, lives in the **parent** `lucky_cat_hsk` repo
root (`../HANDOFF.md`), not here — read it there when picking up work. The `/handoff` skill
writes an ephemeral doc to the OS temp dir (not committed). When you stop or switch
machines, update `../HANDOFF.md` (current task, last decision, next step, active branch)
and commit it in the `lucky_cat_hsk` repo.

## Model workflow (per owner preference)

Use **Fable** (`claude-fable-5`) as the lead for planning and bug-fixing; dispatch worker
subagents on a cheaper model (Haiku/Sonnet).
