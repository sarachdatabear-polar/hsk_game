# Lucky Cat HSK — Status

**Last updated:** 2026-07-09
**TL;DR:** **v6 phase 3 is live** (SHELL v36: cloze #41/#42 + Tone Trainer #43). Three follow-ups now **merged to `development`, awaiting the next release cut**: i18n extraction completeness (#46), Monetization P0 no-accounts foundations (#47), and street deco auto-arrange (#48).

## Where the game is

| Tier | State |
|---|---|
| **Live on `main` / GitHub Pages** | Released 2026-07-09 (SHELL **v36**): everything below plus **v6 phase 3** — cloze fill-in-the-blank (#41 data + #42 gameplay) and the **Tone Trainer** tone-discrimination minigame (#43). Prior release 2026-07-08 (PR #38, v35): v5/v6.2/v7, responsive round, street restyle, i18n pass 2, season art, typed-pinyin recall. |
| **Merged to `development`, unreleased** | **i18n extraction completeness** (#46 — last hardcoded UI strings routed through `t()`, +11 EN/TH keys); **Monetization P0 no-accounts foundations** (#47 — Supabase `schema.sql`+README, privacy-policy DRAFT, pure `interstitial-policy.js`); **street deco auto-arrange** (#48 — even, tier-aware, never-overlapping deco layout). Ride the next release cut (bump SHELL). |
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
- **i18n extraction completeness** — routed the last hardcoded UI strings (growth/progress card, milestone names, `CRITICAL!` burst, speaker labels, `index.html` straggler) through `t()`; +11 EN/TH keys; guard test extended to `milestone.*` (2026-07-09, PR #46, merged to `development`)
- **Monetization P0 no-accounts foundations** — Supabase `schema.sql`+README (RLS, mirrors `nbhsk.*` keys), PDPA/GDPR privacy-policy DRAFT, and a pure/tested `src/monetization/interstitial-policy.js` (180s/no-two-in-a-row/session-1/Supporter caps, not wired yet) (2026-07-09, PR #47, merged to `development`) → [PRD](prd/PRD-monetization-and-production.md)
- **Street deco auto-arrange** — replaced fixed overlapping deco slots with an even, tier-aware, provably-non-overlapping layout (N=1..15, all-max-tier); dropped stale ghost pads (2026-07-09, PR #48, merged to `development`)

## In progress

- Nothing on branches. Owner tasks (next art session): generate the **10 street-deco art files** (prompts ready in [GENERATION-PROMPTS-P0-copypaste.md](art/GENERATION-PROMPTS-P0-copypaste.md) "v7 street deco batch", drop into `art-drop/` → `python3 scripts/intake_art.py`); native Thai review of UI strings, **now including the pass-3 additions** ([i18n-translation-review.md](i18n/i18n-translation-review.md)).

## Planned

1. **Release cut to live** — merge `development` → `main` (carries #46/#47/#48); **bump SHELL v36→v37**, live-smoke verify. Nothing else is parked, so this can go whenever.
2. **Monetization P0 — no-accounts slices DONE** (#46 i18n + #47 foundations). Remaining P0 is **account-gated (owner)**: stand up the Supabase project (apply `docs/supabase/schema.sql`), register RevenueCat products + AdMob, add the iOS/Capacitor target, get the privacy policy legally reviewed. Then **P1 (ads)** wires the AdMob plugin into the already-built `interstitial-policy.js`. See [scope note](../../MEMORY.md) — provider abstraction/mock + results UI + client clamp are deliberately deferred until the SDKs exist.
3. **Roadmaps not started:** HSK 3.0 content refresh; social layer; notifications/widget; Android release refresh ([ANDROID_BUILD.md](build/ANDROID_BUILD.md)). Optional: light deco self-expression (reorder), and a display cap/second row when the deco catalog grows past ~15.

## Doc map

- Live docs index: [README.md](README.md)
- Finished/superseded docs: [archive/README.md](archive/README.md)
