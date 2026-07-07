# PRD — NorthBear HSK Zombie v2 "Make It Stick"

*Product Requirements Document for the major upgrade of the existing Lucky Cat / NorthBear HSK Zombie game. Builds on the shipped v1 codebase (`game/`); no rewrite, no new framework.*

---

## 1. Problem statement (from codebase research, 2026-07-04)

v1 proves the loop — scope selection, flashcards, and the lucky-cat battle all work, ship as a PWA + Android app, and have unit-tested pure modules. What it lacks is **a reason to come back tomorrow** and **a reason for the game to feel smarter the longer you play**:

1. **Coins are fake.** Battle score is themed as coins (coin projectile, coin SFX, "20 coins earned") but nothing is ever banked or spent. The core fantasy — lucky cat brings wealth — has no payoff.
2. **The game never adapts.** `mastery.js` tracks per-word streaks, but `pickWord()` is pure frequency weighting. A word you've mastered 10× is as likely to appear as the word you've missed 5×. The learning value plateaus fast.
3. **One mechanic.** Every battle word is identical: one cat, four meanings, one tap. No pacing variation, no peaks, nothing to anticipate.
4. **No daily hook.** No streak, no daily goal, nothing on the home screen that changes day to day.
5. **Progress screen is inert.** Six rows of "HSK3 — 12% mastered". It doesn't tell the learner *which* words are weak or what to do next.

## 2. Core pillars

- **P1 — Coins matter**: earn a persistent wallet from battles; spend it in a shop on visual unlocks.
- **P2 — The game learns you**: word selection favors weak/due words; a dedicated Smart Review mode drills exactly what needs work.
- **P3 — Battle peaks**: boss waves break the monotony and reward deeper knowledge (reverse-direction questions).
- **P4 — Come back tomorrow**: daily streak + daily goal on the home screen; a Progress screen that names your weak words.

## 3. Non-goals (v2 explicitly excludes)

- No backend / online leaderboard / accounts (Phase-3 item, still deferred).
- No engine change, no framework, no build-tool change (stays vanilla JS + esbuild + vitest).
- No new word data or audio generation (data pipeline untouched).
- No monetization.
- No visual overhaul of existing screens beyond what the features below require.

## 4. Features

### F1 — Coin wallet & Lucky Shop (P1)

- **Wallet**: at battle end, `score` converts to banked coins (1:1) in `localStorage` key `nbhsk.wallet`. Results screen shows "+N 🪙 banked · total M". Home screen shows wallet total.
- **Shop screen** (new, reachable from home): a grid of unlockables with coin prices. All unlocks are **palette/cosmetic swaps rendered by existing canvas code** — no new art assets:
  - **Cat skins** (recolors of the walking cat drawn by `cat.js`): e.g. Midnight (black/grey), Sakura (pink/white), Jade (green/gold), Gold (all-gold). Prices ~500–5,000 coins.
  - **Battle backdrops** (canvas-drawn gradient/scene behind the ground line): e.g. Night Market, Temple Dawn, Bamboo. Prices ~1,000–3,000.
- **Equip model**: owned items are toggled; one active skin + one active backdrop, stored in `nbhsk.shop` (`{owned:[], skin:"", backdrop:""}`).
- **Pure module**: `src/shop.js` — catalog (id, name, price, type), `canAfford`, `buy` (mutates wallet+owned, returns ok/insufficient), `equipped`. Unit tested.
- Spending never goes negative; buying an owned item is a no-op.

### F2 — Smart word selection + Smart Review (P2)

- **Extend the mastery store** (`nbhsk.mastery`, per-word record `{s,k,r}`) with `ls` (last-seen timestamp, ms). Backward compatible: missing `ls` = never seen recently.
- **New pure module `src/srs.js`**:
  - `wordWeight(rec, now)` → a multiplier for battle word-picking: unseen words ×1 (baseline), weak words (streak 0–1 with ≥2 attempts) ×3, due words (mastered but `ls` older than an interval that grows with streak: 1d/3d/7d/14d) ×2, freshly-mastered & not due ×0.3.
  - `dueWords(store, pool, now)` and `weakWords(store, pool)` selectors.
- **Battle integration**: `pickWord()` multiplies its existing `√f` frequency weight by `wordWeight`. Frequency still matters; mastery modulates it.
- **Smart Review entry** on home (enabled when ≥8 weak+due words in current scope): starts a round battle whose deck is weak+due words only, ordered weakest-first. Reuses the existing `battleDeckOverride` mechanism.
- Unit tests: weight tiers, due intervals, empty-store behavior, deck building.

### F3 — Boss waves (P3)

- In **round mode**, every 10th spawn (10, 20, …) is a **boss cat**: drawn larger (scale ~1.5×) with a gold aura, worth 5× kill points, and moving ~15% slower (it's bigger — telegraphed, fair).
- **Two-stage kill**: stage 1 is the normal meaning question. On correct, the same word immediately re-asks in **reverse direction** — show the meaning, pick the correct **hanzi** from 4 options (same distractor logic, options rendered as hanzi+pinyin). Correct on both = kill + bonus; wrong at either stage = normal miss (lose a heart, cat wanders off, word goes to misses).
- Boss spawn announces with the existing combo SFX; kill uses a bigger particle burst.
- **Pure module `src/boss.js`**: `isBossSpawn(spawnIndex, mode)`, `bossPoints(basePoints)`, stage-machine helper. Unit tested. Endless mode: bosses every 10th spawn as well.

### F4 — Daily streak, daily goal, Progress v2 (P4)

- **New pure module `src/daily.js`** (store `nbhsk.daily` = `{last:"YYYY-MM-DD", streak:N, today:{date, resolved}}`):
  - `noteActivity(store, dateStr, resolvedCount)` — updates today's resolved count; increments streak when today's goal (20 words resolved) is first hit; consecutive-day logic (missing a day resets streak; same-day idempotent).
  - `streakInfo(store, dateStr)` → `{streak, todayResolved, goal, goalMet}`.
- **Home screen**: a banner chip — "🔥 N-day streak · 12/20 today". Battle end and flashcard completion both feed `resolved` counts.
- **Progress v2**: per-level rows get a mastery bar (CSS, no canvas); below them a **"Needs work" section** — up to 20 weakest words in the *current scope* (hanzi, pinyin, meaning, 🔊 button), with "Review these" (flashcards) and "Fight these" (battle with `battleDeckOverride`) buttons reusing existing flows.

## 5. Technical constraints (all inherited, all binding)

1. Vanilla JS ES modules in `src/`, bundled by `npm run build` (esbuild IIFE → `dist/app.js`). All markup/CSS inline in `index.html`.
2. **file:// must keep working** — no new `fetch` of bundled data; any new data is code or `window.HSK_DATA`.
3. New logic goes in **small pure modules with vitest tests**; `main.js` only wires them to DOM/canvas.
4. All new localStorage keys namespaced `nbhsk.*`; existing keys (`scope`, `settings`, `sfx`, `mastery`, `best`) stay backward compatible — a v1 player's data must survive the upgrade untouched.
5. Bump `SHELL` cache version in `sw.js` (`nbhsk-shell-v4` → `-v5`) in the final ship commit.
6. Mobile-first portrait layout; everything must remain playable at 360×640.
7. No new npm dependencies.

## 6. Milestones & execution order

| # | Milestone | Modules touched | Tests |
|---|-----------|-----------------|-------|
| M1 | Wallet + Lucky Shop | `shop.js` (new), `main.js`, `cat.js` (palette param), `index.html` | `shop.test.js` |
| M2 | Smart selection + Smart Review | `srs.js` (new), `mastery.js` (ls), `main.js` | `srs.test.js`, extend `mastery.test.js` |
| M3 | Boss waves | `boss.js` (new), `main.js`, `cat.js` (scale), `scoring.js` | `boss.test.js` |
| M4 | Daily streak + Progress v2 | `daily.js` (new), `main.js`, `index.html` | `daily.test.js` |
| M5 | Ship | `sw.js` bump, full regression (`npm test`, `npm run build`, manual serve smoke) | all green |

Each milestone lands independently: tests pass and the game is playable after every one.

## 7. Success criteria

- [ ] All existing ~30 tests still pass; ≥20 new tests cover the four new modules.
- [ ] `npm run build` succeeds; game runs from `npm run serve` **and** when `index.html` is opened via file://.
- [ ] A v1 `localStorage` snapshot (scope/mastery/best) loads without error or data loss.
- [ ] Coins bank at battle end; a skin can be bought and is visibly applied to battle cats.
- [ ] A word missed twice demonstrably appears more often than a mastered word (unit-tested weight ordering).
- [ ] Boss appears on the 10th spawn of a 20-word round, two-stage kill works, wrong answer at stage 2 costs a heart.
- [ ] Streak chip updates after a session; Progress lists weak words with working Review/Fight buttons.
- [ ] `sw.js` SHELL bumped to v5.
