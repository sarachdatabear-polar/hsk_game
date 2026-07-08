# Lucky Cat HSK — Status

**Last updated:** 2026-07-08
**TL;DR:** v5+v6+v7 are live (PR #28, 2026-07-08). Five more rounds — responsive, street restyle, i18n pass 2, tooling, v7 season art — are merged to `development` and awaiting a release cut to the live site.

## Where the game is

| Tier | State |
|---|---|
| **Live on `main` / GitHub Pages** | Released 2026-07-08 (PR #28, SHELL v30, live-smoke verified): warm-daylight theme, v5 retention features, v6 question formats, v7 Shop Seasons, generated art incl. raccoon sheets. |
| **Merged to `development`, unreleased** | 5 rounds ahead of `main`, not yet on the live site: responsive all-devices (PR #29), street restyle (PR #30), i18n pass 2 (PR #31), `/update-game-plan` skill restore (PR #32), v7 season backdrops + cat costumes art (PR #33). |
| **On feature branches** | None — all work is merged to `development`. |

## Done

- **v2 "Make It Stick"** — wallet/shop, smart review, bosses, streak (2026-07-04) → [archive](archive/prd/PRD-v2-upgrade.md)
- **v3 "Lucky Cat Grows"** — XP/levels/milestones (2026-07-04, log in [V2-EXECUTION-PLAN](planning/V2-EXECUTION-PLAN.md))
- **v4 "Lucky Cat Street"** — home street, deco/effect/sound shop (2026-07-04, PR #7) → [archive](archive/prd/PRD-v4-street.md)
- **Web ship + session picker + i18n TH/EN + SVG pack v2 + data sync** (2026-07-03→07, PRs #2–#14)
- **Visual Slice v1** — PRD-exact Home + Battle rebuild + fix round (2026-07-06, PRs #15–#16) → [archive](archive/prd/PRD-visual-slice-v1.md)
- **v5 "Reference Visual Overhaul + Kind Retention"** — phases 1–5 (2026-07-07, PRs #18–#22) → [PRD lives on](prd/PRD-v5-visual-retention.md) (§8 = v-next roadmap)
- **v6 Phase 1** — question formats: listen / reverse / tone mastery ladder (2026-07-07, PR #23)
- **i18n pass 2** — howto/street/item-name localization + usage-guard test (2026-07-08); MILESTONES strings + native TH review still open
- **Responsive all-devices round** — short-phone + landscape fixes, permanent 10-viewport gate (2026-07-08, PR #29)
- **Street restyle** — warm-daylight scene, two-row layout, tier-3 crown accent (2026-07-08)
- **v7 "Shop Seasons"** — themed catalog, daily stock, season corner, deco tiers + art round (2026-07-08, PR #26) → [archive](archive/prd/PRD-v7-shop-seasons.md)

## In progress

- Nothing on branches. Open v7 tails (owner + next art session): generate the **17 v7 item art files** (6 skin sheet pairs + 5 backdrops — prompts ready in [GENERATION-PROMPTS-P0-copypaste.md](art/GENERATION-PROMPTS-P0-copypaste.md) "v7 Shop Seasons batch", drop into `art-drop/` → `python scripts/intake_art.py`); native Thai review of UI strings ([i18n-translation-review.md](i18n/i18n-translation-review.md)).

## Planned

1. **Release cut to live** — merge the 5 rounds on `development` (PRs #29–#33) to `main` so responsive, street restyle, i18n pass 2, and v7 season art reach the live site; bump SHELL, live-smoke verify.
2. **v7 art follow-ups** (filed in the [v7 plan](superpowers/plans/2026-07-07-v7-shop-seasons.md)): deco prompts + decor manifest rows, per-backdrop procedural scenes, small cleanups (doBuy renderStreet, empty-shelf state, registry-test hardening, art-drop raw pruning policy)
3. **v6 phase 2+** — deeper question types per [PRD-v5 §8](prd/PRD-v5-visual-retention.md) (typed-pinyin recall, cloze, tone minigame)
4. **Roadmaps not started:** [monetization & production](prd/PRD-monetization-and-production.md) (Supabase accounts, store launch); HSK 3.0 content refresh; social layer; notifications/widget; Android release refresh ([ANDROID_BUILD.md](build/ANDROID_BUILD.md))

## Doc map

- Live docs index: [README.md](README.md)
- Finished/superseded docs: [archive/README.md](archive/README.md)
