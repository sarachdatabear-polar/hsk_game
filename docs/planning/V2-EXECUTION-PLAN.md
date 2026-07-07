# V2/V3/V4 Execution Plan — living checklist

## v7 "Shop Seasons" (2026-07-07)

Spec: [PRD-v7-shop-seasons.md](../archive/prd/PRD-v7-shop-seasons.md). Branch
`feat/v7-shop-seasons` off `development`.

- [x] **Task 1 — Catalog expansion**: data + shape tests for the expanded item catalog.
- [x] **Task 2 — Availability engine**: rotation + season windows (Today's Stock is a pure function of the date string; stable for the same date, changes at midnight).
- [x] **Task 3 — Tiers + extended `buy()`**: tiered item support in `shop.js`.
- [x] **Task 4 — `street.js` new decos + tier passthrough**.
- [x] **Task 5 — fx + sfx packs**: Star Shower effect, Lion Dance Drum sound pack.
- [x] **Task 6 — Sprite registry, skin palettes, generation prompts**: art pipeline scaffolding for the new item art.
- [x] **Task 7 — Shop UI**: Today's Stock, Season Corner, upgrade rows, i18n wiring; controller browser smoke 10/10 incl. Thai relabel + tier flow.
- [x] **Task 8 — Street rendering**: tier embellishments + 10 new deco shapes; tier-2 glow pixel-verified.
- [x] **Art round (controller, riding this branch)**: in-repo tracked `art-drop/` intake folder (`intake_art.py` prefers it, decor cutout path added); 6 QA-passed generated assets installed (bg-battle/market/temple/bamboo backdrops + coin + lantern); raccoon PNG sprite-sheet wiring (raccoon-walk/happy integrated, precached, vector fallback kept).
- [x] **Task 9 — Ship prep**: full regression (588 tests, up from 553 at branch start), `sw.js` SHELL bumped v29 → v30, `dist/app.js` rebuilt, this status entry.

**Known deferrals:**
- 17 v7 item art files pending generation/intake (cat-panda/ninja/astronaut/beach/mooncake/dragon sheets ×2 each + 5 backdrops) — vector/procedural fallbacks are live; expect 404 noise in console until they land.
- Tier-specific deco art variants deferred to intake — procedural glow/flank fallbacks live.
- Item names remain English pending i18n pass 2.
- Street-screen layout crowding (tier-3 flanking overlaps on packed streets) deferred to the already-filed street-restyle round.

## Code-review fix round (2026-07-07)

Full-codebase review (Fable lead + 2 review subagents), then fixes on `feat/prd-visual-slice-v1`. All confirmed findings fixed; 350 tests green, build clean, DOM-id check passed.

- [x] **Distractors**: first-token meaning check broke with CC-CEDICT glosses (6,293/22,027 start "to " → the only "to …" option was always the answer). Now content-token overlap on the first sense with a stopword list (`src/distractors.js`, +4 tests).
- [x] **Bite race**: correct answer now freezes the walker (`z.frozen`) so a last-instant correct tap can't be recorded as a miss while the coin is in flight.
- [x] **Raccoon defeat animation**: never played (raw rAF timestamp passed where time-since-defeat was expected) — `z.happyAt` per-defeat clock, shifted on pause-resume.
- [x] **Custom decks** (fight-misses/needs-work): no longer set scope high scores or earn the perfect bonus/quest (`B.customDeck`).
- [x] **Quit banking** (user-approved): quitting banks coins + daily-goal credit; still no best score/perfect/results screen.
- [x] **sw.js precache**: fixed `ui-card-soft.png`→`.svg` typo; added the 3 LC fonts, `bg-progress`/`bg-collection`, `cat-guide/celebrate/thinking`, `ui-tab.svg`; removed 7 dead entries; navigation fallback to cached `index.html` when offline (SHELL bump deferred to the development → main release, per branching model). New `test/sw-precache.test.js` diffs PRECACHE against disk + index.html/sprites/asset-manifest so this can't drift again.
- [x] **cat.js**: removed unreachable `"wrong"` state (moved to raccoon in M5) and its latent double-scaled lineWidth.
- [x] **build_audio.py**: source = `data/words.json` top-2000 by frequency **plus all HSK1–2** (exam-text frequency underranks basics — 七 was rank ~4,600), replacing the stale `hsk_top2000_bilingual.csv`; index.json rebuilt from disk. Generated 297 missing MP3s → 2,297 total; HSK1–2 coverage now 100%.
- [x] **build_game_data.py**: OVERRIDES now only fill broken values (廖/萄/蔡 keep corrected upstream glosses); ragged-row guard with file+line error; dead `manifest.tests_total` removed. Data regenerated.
- [x] **build_fonts.py**: skip guard is now charset-hash-aware (sidecar `assets/fonts/subset-manifest.json`) so vocabulary refreshes can't ship stale subsets.
- [ ] Ship: rides this branch's PR to `development`; SHELL bump (v23→v24) happens at the development → main release.
- [ ] User playtest (see USER-CHECKLIST §6).

Known deferrals: `pool.js` merges polyphones by hanzi (no dup rows exist today); AUDIO runtime cache has no eviction (bounded ~2,300 files); `thai-supplement.csv` fallback currently unexercised (kept as safety net).

## Visual Slice v1 — PRD-exact Home + Battle rebuild (2026-07-06)

Spec: [PRD-visual-slice-v1.md](../archive/prd/PRD-visual-slice-v1.md) (shipped, archived; built against the
visual-exact PRD [Lucky_Cat_HSK_PRD_Visual_Spec_v1.0.md](../art/Lucky_Cat_HSK_PRD_Visual_Spec_v1.0.md)).
Branch `feat/prd-visual-slice-v1` → PR to `development`.

- [x] **M1 — Tokens + fonts**: 12 `--lc-*` palette tokens; `scripts/build_fonts.py`
  subsets/bundles LC Hanzi (Noto Serif SC ⊆ words.json, 539 KB) + LC Thai + LC
  Latin (Fredoka); canvas battle text via `src/fonts.js`. +5 tests (236).
- [x] **M2 — Bottom nav**: 5-tab deep-teal nav (Home/Street/Progress/Quests/More);
  street canvas + quest panel promoted to own screens; UI-language chips → More;
  pure `src/nav.js`. +8 tests (244).
- [x] **M3 — Home rebuild**: status strip (avatar/Lv/XP + coins + gear), LUCKY CAT
  · HSK brand title, cat-study hero on bg-home, streak plaque w/ daily-goal bar,
  instant START + scope chip (`scopeSummary` in pool.js), secondary row. +5 (249).
- [x] **M4 — Battle HUD + pause**: hearts · Round X/Y capsule · score · pause;
  overlay hosts sfx/word-audio/pinyin toggles + Resume/Quit; pause freezes rAF
  and shifts all absolute deadlines on resume; auto-pause on tab hide.
  `src/hud.js` roundLabel. +8 (257).
- [x] **M5 — Role swap**: player cat (skin/accessories/kitten) stationary left;
  enemy = code-drawn cute raccoon ninja (`src/raccoon.js`) with cosmetic HP bar
  (50% after boss stage 1, drains on defeat); zombie.js deleted. +6 (263).
- [x] **M6 — Plaque + grid + combo**: pinyin above hanzi, reserved translation
  line revealed on resolve, plaque speaker tap/keyboard replay, hanziPx 44→60
  (≥56px floor), strict 2×2 sand tactile grid with ✓/✕ reveal affixes, combo
  strip (COMBO n/fires/xN), CRITICAL! burst at combo-10s, reduced-motion,
  boss stage timer folded into pause deadlines. Boss prompt localized (lead
  fix). +5 (268).
- [x] Regression: 268 tests green, build clean (138 kb), DOM-id check passed,
  headless visual pass at 390×844 + 360×640 (home/battle/reveal/pause/street/
  more; zero console errors).
- [x] Art prompt pack for replacement backgrounds + optional raccoon sheets:
  [GENERATION-PROMPTS-visual-slice.md](../archive/art/GENERATION-PROMPTS-visual-slice.md)
  (drop-in filenames: bg-home.png 1080×1920, bg-battle.png 1024×512).
- [ ] Ship: SHELL bump rides the release to `main`, not this dev PR (branching
  model: PR → development; deploy happens on development → main release).
- [ ] User playtest (see USER-CHECKLIST §9).

Known follow-ups: shop tab highlights Home in nav (spec'd, revisit if odd in
play); street screen inherits legacy festive styling (restyle round later);
kitten companion crowds the idle coin icon at 360px; `B.L.mascotPx` now unused.

## Pinyin toggle + one-shot audio (small round; 2026-07-06)

Spec: [PRD-pinyin-toggle-and-audio.md](../archive/prd/PRD-pinyin-toggle-and-audio.md) (shipped, archived).

- [x] Battle `#hud-pinyin` toggle (`settings.showPinyin`, default on) hides pinyin on the word plate only — flashcards unchanged. Wiring-only, 199 tests green, build clean, DOM-id check passed.
- [x] Word audio fires once on spawn — removed the answer-tap replay (`speak(z.w.h)`).
- [ ] Ship: committed on `feat/education-first-phase-a` → rides into **PR #10**; goes live when #10 merges to main. `sw.js` SHELL already at v24 (covers this change).


## V4 "Lucky Cat Street" status (deferred-items round; scope signed off 2026-07-04)

Spec: [PRD-v4-street.md](../archive/prd/PRD-v4-street.md) (shipped, archived). Hybrid street economy approved: milestone buildings free, decorations purchased.

- [x] **M1 — Effect packs** (`shop.js` effect slot + Sakura/Firecracker items, `fx.js` styled bursts w/ per-spec gravity, petal/cracker draw kinds, shop Effects section) — done 2026-07-04, +14 tests.
- [x] **M2 — Sound packs** (`shop.js` soundpack slot + Bells/Arcade items, `sfx.js` data-driven `PACKS` table — default pack byte-identical to old tones, shop Sounds section, `sfx.pack` synced at boot + renderShop) — done 2026-07-04, +8 tests.
- [x] **M3 — Lucky Cat Street** (`src/street.js`: milestone `BUILDINGS` + deco slots, deterministic `streetPieces`/`streetProgress`; 5 deco catalog items; home `#street-cv` canvas strip + caption; redraws on boot/home/level-up/purchase; worker headless-verified 360×640 fold) — done 2026-07-04, +12 tests. Fable fix: `equipItem` now hard no-op for decos (no stray `deco` field).
- [x] **M4 — Ship prep**: 169 tests green, build 70.9 kb, DOM-id check passed, SHELL bumped v8 → v9 (v8 came from the responsive-battle round, not v6 as planned above), USER-CHECKLIST §7 added. Playtest fix rode along: Smart Review shows "n/8" below the 8-word minimum.
- [x] **Shipped**: user approved after playtest → commit `fbfd792`, PR #7 merged (`dd32f4e`), Pages deploy green — 2026-07-04.
- [ ] v5 candidates: interactive street / achievement scenes (still deferred), real art per ART-BRIEF.

## V3 "Lucky Cat Grows" status (reviewer-feedback round; plan approved 2026-07-04)

- [x] **Step 0 — v2 shipped**: commit `6a3af16` pushed to main, Pages deploy green, live site confirmed serving v2.
- [x] **A1 — Daily Quests** (`src/quests.js`, 14 tests): 3 deterministic quests/day from a 6-quest pool, auto-credited coin rewards (100–250🪙), home quest panel, results toasts. Store `nbhsk.quests`.
- [x] **A2 — Juice pack** (`src/fx.js`, 13 tests): coin-sprite kill bursts, floating ×N combo text, firework ring at every 10th combo, mascot hop on kill, "🌟 Perfect!" +25% bonus (cap 500) for miss-free rounds.
- [x] **B — Cat growth** (`src/growth.js`, 10 tests): XP (+1 correct, +5 boss, +1 flashcard-known; store `nbhsk.xp`), quadratic level curve, milestones Lv5 scarf / Lv10 coin / Lv20 outfit / Lv30 kitten follower / Lv50 emperor drawn as canvas overlays on any skin; `#home-level` pill, growth card on Progress, level-up toast on results, `window.__grantXp` under `#debug`.
- [x] **Ship prep**: SHELL bumped v5 → v6, 135 tests green, build 57.6 kb, DOM-id check passed.
- [x] User playtest approved → v3 committed & pushed (`fe9435a`, PR #5), Pages deploy green — 2026-07-04. Follow-up PR #6 (responsive battle canvas, centered prompt, screen-scaled cat) also live.
- [ ] Deferred to v4: **Lucky Cat Street** (home-screen street meta that grows with milestones; unlocks future achievement scenes — hybrid economy decision), more shop item types (sounds/effects/decorations).

---

*Cross-session continuation doc for the v2 "Make It Stick" upgrade. Spec: [PRD-v2-upgrade.md](../archive/prd/PRD-v2-upgrade.md) (shipped, archived). Art spec (v2 dark-red/gold direction, superseded by the warm-daylight look): [ART-BRIEF.md](../archive/art/ART-BRIEF.md) (archived).*

**Workflow:** Fable leads (plan/review), Sonnet worker subagents implement one milestone at a time, sequentially (milestones all touch `main.js`/`index.html` — do NOT parallelize). After each milestone: `npm test` green + `npm run build` clean before starting the next.

## Status

- [x] Research + PRD written & signed off (all four features approved) — 2026-07-04
- [x] Baseline `npm test` green — 2026-07-04
- [x] **M1 — Wallet + Lucky Shop** — done 2026-07-04 (`src/shop.js`, 14 tests; banking in `endBattle`; `#s-shop` screen; skin palettes in `cat.js`; canvas backdrops)
- [x] **M2 — Smart selection + Smart Review** — done 2026-07-04 (`src/srs.js`, 19 tests; `ls` in mastery records; `pickWord` weighting; `#go-smart` home button)
- [x] **M3 — Boss waves** — done 2026-07-04 (`src/boss.js`, 8 tests; every-10th-spawn boss, 1.5× + gold aura, two-stage kill, 5× points; banner shows "？？" during the reverse question so the answer isn't given away)
- [x] **M4 — Daily streak + Progress v2** — done 2026-07-04 (`src/daily.js`, 19 tests; `#home-streak` chip, 20/day goal; mastery bars + "Needs work" list with Review/Fight)
- [x] **M5 — Ship prep** — done 2026-07-04: `sw.js` SHELL bumped v4 → v5; full regression green (98 tests, build 45 kb); DOM-id wiring check passed. **NOT yet committed/pushed** — user decides when to commit in `game/` repo and push to deploy (GitHub Pages runs on push to main).
- [ ] Manual device smoke (user): buy/equip a skin, hit a boss on spawn 10, check streak chip next day, file:// open.
- [ ] Optional later: real art per [ART-BRIEF.md](../archive/art/ART-BRIEF.md) (superseded; done differently via the v5 warm-daylight pipeline) → drop PNGs in `assets/`, register in `sprites.js`. `npm run cap:sync` + `apk:release` for the Android build once web version is confirmed.

## Key invariants (check on every milestone review)

1. file:// still works — no new fetch of bundled data.
2. v1 localStorage (`nbhsk.scope/settings/sfx/mastery/best`) loads unchanged.
3. New keys namespaced `nbhsk.*` (`wallet`, `shop`, `daily`; mastery gains optional `ls` field).
4. Pure logic in small modules with vitest tests; `main.js` only wires DOM/canvas.
5. No new npm dependencies. Playable at 360×640 portrait.

## Session log

- **2026-07-04 (session 1, post-playtest fix):** user reported "not a cat" — equipping a shop skin switched rendering from the cat PNG sprite to the crude vector fallback (M1's known tradeoff). Fixed: skins now tint the real sprite via `ctx.filter` (per-skin `filter` strings in `SKIN_PALETTES`); vector cat remains only as pre-load/missing-PNG fallback. 98 tests green, rebuilt.

- **2026-07-04 (session 1):** research, PRD, sign-off, art brief, this plan. All milestones M1–M5 implemented and verified (98 tests, build clean). Working tree in `game/` holds the uncommitted v2 changes — next session: commit/push on user request, then device smoke test. Known follow-ups: `weakWords` "Needs work" rows show fixed `en · thai` format (not scope-lang aware); boss reverse-question audio speaks the word at stage-1 kill (acceptable — recall aid); art remains programmatic until ART-BRIEF assets exist.
