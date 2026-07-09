# Lucky Cat HSK — Status

**Last updated:** 2026-07-09
**TL;DR:** **v6 phase 3 shipped.** Release cut 2026-07-09 (SHELL v36) carries the full cloze format (#41/#42) and the Tone Trainer minigame (#43) live. All v5/v6/v7 now on `main`.

## Where the game is

| Tier | State |
|---|---|
| **Live on `main` / GitHub Pages** | Released 2026-07-09 (SHELL **v36**): everything below plus **v6 phase 3** — cloze fill-in-the-blank (#41 data + #42 gameplay) and the **Tone Trainer** tone-discrimination minigame (#43). Prior release 2026-07-08 (PR #38, v35): v5/v6.2/v7, responsive round, street restyle, i18n pass 2, season art, typed-pinyin recall. |
| **Merged to `development`, unreleased** | None — `development` is in sync with `main` at this cut. |
| **On feature branches** | None. |

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
- **v7 season art intake** — season backdrops + cat costume sheets (2026-07-08, PR #33)
- **v7 follow-ups** — Today's Stock empty state, registry guards, 10 deco prompts + manifest rows, art-drop `--prune` tooling (2026-07-08, PR #36)
- **v6 Phase 2 "Typed-Pinyin Recall"** — ladder rung 7+, letters + per-syllable tone taps, kind diff, EN/TH (2026-07-08, PR #37, spec in [superpowers/specs](superpowers/specs/2026-07-08-v6-typed-pinyin-design.md))
- **typed-polish** — Enter-to-submit, answer-guard ordering, nü tone-row labels, a11y chips (2026-07-08, PR #39)

## In progress

- Nothing on branches. Owner tasks (next art session): generate the **10 street-deco art files** (prompts ready in [GENERATION-PROMPTS-P0-copypaste.md](art/GENERATION-PROMPTS-P0-copypaste.md) "v7 street deco batch", drop into `art-drop/` → `python3 scripts/intake_art.py`); native Thai review of UI strings ([i18n-translation-review.md](i18n/i18n-translation-review.md)).

## Planned

1. **Release cut to live** — merge `development` (PR #39 typed-polish) to `main`; bump SHELL, live-smoke verify. Small enough to ride with the next feature round.
2. **v6 phase 3 — DONE.** Cloze shipped (data #41 + gameplay #42, merged to `development`). Tone Trainer — standalone tone-discrimination minigame (`src/tone_gym.js`, `#s-tones` screen, MP3-only pool, light rewards) — on `feat/v6-tone-trainer` / **PR #43** awaiting merge. Both parked v6 question types now built; listening-first rounds remain the only parked item from [PRD-v5 §8](prd/PRD-v5-visual-retention.md).
3. **Roadmaps not started:** [monetization & production](prd/PRD-monetization-and-production.md) (Supabase accounts, store launch); HSK 3.0 content refresh; social layer; notifications/widget; Android release refresh ([ANDROID_BUILD.md](build/ANDROID_BUILD.md))

## Doc map

- Live docs index: [README.md](README.md)
- Finished/superseded docs: [archive/README.md](archive/README.md)
