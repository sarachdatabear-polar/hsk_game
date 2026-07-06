# V2/V3/V4 Execution Plan — living checklist

## Pinyin toggle + one-shot audio (small round; 2026-07-06)

Spec: [PRD-pinyin-toggle-and-audio.md](../prd/PRD-pinyin-toggle-and-audio.md).

- [x] Battle `#hud-pinyin` toggle (`settings.showPinyin`, default on) hides pinyin on the word plate only — flashcards unchanged. Wiring-only, 199 tests green, build clean, DOM-id check passed.
- [x] Word audio fires once on spawn — removed the answer-tap replay (`speak(z.w.h)`).
- [ ] Ship: committed on `feat/education-first-phase-a` → rides into **PR #10**; goes live when #10 merges to main. `sw.js` SHELL already at v24 (covers this change).


## V4 "Lucky Cat Street" status (deferred-items round; scope signed off 2026-07-04)

Spec: [PRD-v4-street.md](../prd/PRD-v4-street.md). Hybrid street economy approved: milestone buildings free, decorations purchased.

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

*Cross-session continuation doc for the v2 "Make It Stick" upgrade. Spec: [PRD-v2-upgrade.md](../prd/PRD-v2-upgrade.md). Art spec (user-facing, non-blocking): [ART-BRIEF.md](../art/ART-BRIEF.md).*

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
- [ ] Optional later: real art per [ART-BRIEF.md](../art/ART-BRIEF.md) → drop PNGs in `assets/`, register in `sprites.js`. `npm run cap:sync` + `apk:release` for the Android build once web version is confirmed.

## Key invariants (check on every milestone review)

1. file:// still works — no new fetch of bundled data.
2. v1 localStorage (`nbhsk.scope/settings/sfx/mastery/best`) loads unchanged.
3. New keys namespaced `nbhsk.*` (`wallet`, `shop`, `daily`; mastery gains optional `ls` field).
4. Pure logic in small modules with vitest tests; `main.js` only wires DOM/canvas.
5. No new npm dependencies. Playable at 360×640 portrait.

## Session log

- **2026-07-04 (session 1, post-playtest fix):** user reported "not a cat" — equipping a shop skin switched rendering from the cat PNG sprite to the crude vector fallback (M1's known tradeoff). Fixed: skins now tint the real sprite via `ctx.filter` (per-skin `filter` strings in `SKIN_PALETTES`); vector cat remains only as pre-load/missing-PNG fallback. 98 tests green, rebuilt.

- **2026-07-04 (session 1):** research, PRD, sign-off, art brief, this plan. All milestones M1–M5 implemented and verified (98 tests, build clean). Working tree in `game/` holds the uncommitted v2 changes — next session: commit/push on user request, then device smoke test. Known follow-ups: `weakWords` "Needs work" rows show fixed `en · thai` format (not scope-lang aware); boss reverse-question audio speaks the word at stage-1 kill (acceptable — recall aid); art remains programmatic until ART-BRIEF assets exist.
