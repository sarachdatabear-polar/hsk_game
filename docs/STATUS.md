# Lucky Cat HSK — Status

**Last updated:** 2026-07-08
**TL;DR:** v7 "Shop Seasons" just merged to `development`; the live site is many releases behind — the next big move is a `development → main` release, then the responsive round and the v7 art batch.

## Where the game is

| Tier | State |
|---|---|
| **Live on `main` / GitHub Pages** | Old build (pre-Visual-Slice): v2–v4 gameplay, legacy dark-red/gold theme, education-first redesign reverted. Users have NOT seen v5/v6/v7 yet. |
| **Merged to `development`, unreleased** | Everything since: pinyin toggle + word audio, i18n TH/EN, session-length picker, extracted SVG pack, cleaned word data, Visual Slice v1 (warm-daylight Home + Battle), v5 phases 1–5 (full theme, asset pipeline, juice + first-run, kind streak + stickers, journey map), v6 phase 1 (listen/reverse/tone question formats), v7 Shop Seasons (+ art round: 6 generated assets installed, raccoon PNG sheets live). 588 tests green. |
| **On feature branches** | None — all work is merged. |

## Done

- **v2 "Make It Stick"** — wallet/shop, smart review, bosses, streak (2026-07-04) → [archive](archive/prd/PRD-v2-upgrade.md)
- **v3 "Lucky Cat Grows"** — XP/levels/milestones (2026-07-04, log in [V2-EXECUTION-PLAN](planning/V2-EXECUTION-PLAN.md))
- **v4 "Lucky Cat Street"** — home street, deco/effect/sound shop (2026-07-04, PR #7) → [archive](archive/prd/PRD-v4-street.md)
- **Web ship + session picker + i18n TH/EN + SVG pack v2 + data sync** (2026-07-03→07, PRs #2–#14)
- **Visual Slice v1** — PRD-exact Home + Battle rebuild + fix round (2026-07-06, PRs #15–#16) → [archive](archive/prd/PRD-visual-slice-v1.md)
- **v5 "Reference Visual Overhaul + Kind Retention"** — phases 1–5 (2026-07-07, PRs #18–#22) → [PRD lives on](prd/PRD-v5-visual-retention.md) (§8 = v-next roadmap)
- **v6 Phase 1** — question formats: listen / reverse / tone mastery ladder (2026-07-07, PR #23)
- **v7 "Shop Seasons"** — themed catalog, daily stock, season corner, deco tiers + art round (2026-07-08, PR #26) → [archive](archive/prd/PRD-v7-shop-seasons.md)

## In progress

- Nothing on branches. Open v7 tails (owner + next art session): generate the **17 v7 item art files** (6 skin sheet pairs + 5 backdrops — prompts ready in [GENERATION-PROMPTS-P0-copypaste.md](art/GENERATION-PROMPTS-P0-copypaste.md) "v7 Shop Seasons batch", drop into `art-drop/` → `python scripts/intake_art.py`); native Thai review of UI strings ([i18n-translation-review.md](i18n/i18n-translation-review.md)).

## Planned

1. **Release `development` → `main`** — ships v5+v6+v7 to real users; the single biggest pending item. (Deploy runs on push to `main`; SHELL already bumped to v30.)
2. **Responsive all-devices round** — CSS-only fixes for short viewports + landscape phones, plan ready: [2026-07-07-responsive-all-devices.md](superpowers/plans/2026-07-07-responsive-all-devices.md)
3. **v7 art follow-ups** (filed in the [v7 plan](superpowers/plans/2026-07-07-v7-shop-seasons.md)): deco prompts + decor manifest rows, per-backdrop procedural scenes, small cleanups (doBuy renderStreet, empty-shelf state, registry-test hardening, art-drop raw pruning policy)
4. **Street-screen restyle round** — legacy dark canvas + layout crowding with many/tiered decos
5. **i18n pass 2** — howto body, streak pill, flashcard hints, street caption, HUD titles, item names
6. **v6 phase 2+** — deeper question types per [PRD-v5 §8](prd/PRD-v5-visual-retention.md) (typed-pinyin recall, cloze, tone minigame)
7. **Roadmaps not started:** [monetization & production](prd/PRD-monetization-and-production.md) (Supabase accounts, store launch); HSK 3.0 content refresh; social layer; notifications/widget; Android release refresh ([ANDROID_BUILD.md](build/ANDROID_BUILD.md))

## Doc map

- Live docs index: [README.md](README.md)
- Finished/superseded docs: [archive/README.md](archive/README.md)
