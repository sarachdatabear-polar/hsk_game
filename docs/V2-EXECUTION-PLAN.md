# V2/V3 Execution Plan — living checklist

## V3 "Lucky Cat Grows" status (reviewer-feedback round; plan approved 2026-07-04)

- [x] **Step 0 — v2 shipped**: commit `6a3af16` pushed to main, Pages deploy green, live site confirmed serving v2.
- [x] **A1 — Daily Quests** (`src/quests.js`, 14 tests): 3 deterministic quests/day from a 6-quest pool, auto-credited coin rewards (100–250🪙), home quest panel, results toasts. Store `nbhsk.quests`.
- [x] **A2 — Juice pack** (`src/fx.js`, 13 tests): coin-sprite kill bursts, floating ×N combo text, firework ring at every 10th combo, mascot hop on kill, "🌟 Perfect!" +25% bonus (cap 500) for miss-free rounds.
- [x] **B — Cat growth** (`src/growth.js`, 10 tests): XP (+1 correct, +5 boss, +1 flashcard-known; store `nbhsk.xp`), quadratic level curve, milestones Lv5 scarf / Lv10 coin / Lv20 outfit / Lv30 kitten follower / Lv50 emperor drawn as canvas overlays on any skin; `#home-level` pill, growth card on Progress, level-up toast on results, `window.__grantXp` under `#debug`.
- [x] **Ship prep**: SHELL bumped v5 → v6, 135 tests green, build 57.6 kb, DOM-id check passed. **NOT committed/pushed — awaiting user playtest.**
- [ ] User playtest (see USER-CHECKLIST §6) → then commit & push v3.
- [ ] Deferred to v4: **Lucky Cat Street** (home-screen street meta that grows with milestones; unlocks future achievement scenes — hybrid economy decision), more shop item types (sounds/effects/decorations).

---

*Cross-session continuation doc for the v2 "Make It Stick" upgrade. Spec: [PRD-v2-upgrade.md](PRD-v2-upgrade.md). Art spec (user-facing, non-blocking): [ART-BRIEF.md](ART-BRIEF.md).*

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
- [ ] Optional later: real art per [ART-BRIEF.md](ART-BRIEF.md) → drop PNGs in `assets/`, register in `sprites.js`. `npm run cap:sync` + `apk:release` for the Android build once web version is confirmed.

## Key invariants (check on every milestone review)

1. file:// still works — no new fetch of bundled data.
2. v1 localStorage (`nbhsk.scope/settings/sfx/mastery/best`) loads unchanged.
3. New keys namespaced `nbhsk.*` (`wallet`, `shop`, `daily`; mastery gains optional `ls` field).
4. Pure logic in small modules with vitest tests; `main.js` only wires DOM/canvas.
5. No new npm dependencies. Playable at 360×640 portrait.

## Session log

- **2026-07-04 (session 1, post-playtest fix):** user reported "not a cat" — equipping a shop skin switched rendering from the cat PNG sprite to the crude vector fallback (M1's known tradeoff). Fixed: skins now tint the real sprite via `ctx.filter` (per-skin `filter` strings in `SKIN_PALETTES`); vector cat remains only as pre-load/missing-PNG fallback. 98 tests green, rebuilt.

- **2026-07-04 (session 1):** research, PRD, sign-off, art brief, this plan. All milestones M1–M5 implemented and verified (98 tests, build clean). Working tree in `game/` holds the uncommitted v2 changes — next session: commit/push on user request, then device smoke test. Known follow-ups: `weakWords` "Needs work" rows show fixed `en · thai` format (not scope-lang aware); boss reverse-question audio speaks the word at stage-1 kill (acceptable — recall aid); art remains programmatic until ART-BRIEF assets exist.
