# Lucky Cat HSK — docs index

**Start here → [STATUS.md](STATUS.md)** — what stage the game is at, what's done, what's next.

This index lists the **active** docs (pending plans + evergreen references).
Finished and superseded docs move to [`archive/`](archive/README.md) (run
`/update-game-plan` after a round merges). Historical execution logs live under
`superpowers/` and intentionally keep their original in-text paths.

## 📋 `prd/` — Product requirements (what to build)
- [PRD-v5-visual-retention.md](prd/PRD-v5-visual-retention.md) — shipped 2026-07-07 (phases 1–5); stays live because §8 is the standing v-next roadmap (question types, HSK 3.0, social)
- [PRD-monetization-and-production.md](prd/PRD-monetization-and-production.md) — store launch + monetization roadmap (not started)

## 🎨 `art/` — Art direction & production (active pipeline)
- [Lucky_Cat_HSK_PRD_Visual_Spec_v1.0.md](art/Lucky_Cat_HSK_PRD_Visual_Spec_v1.0.md) — visual-exact source spec (warm-daylight look)
- [STYLE-TOKENS.md](art/STYLE-TOKENS.md) — style bible: palette hex, typography, panel/light rules
- [SCREEN-CHECKLIST-v5.md](art/SCREEN-CHECKLIST-v5.md) — per-screen reference-match acceptance gate
- [GENERATION-PROMPTS-v5.md](art/GENERATION-PROMPTS-v5.md) — master style prompt + per-asset clauses
- [GENERATION-PROMPTS-P0-copypaste.md](art/GENERATION-PROMPTS-P0-copypaste.md) — copy-paste prompt blocks + `art-drop/` intake workflow (includes the pending v7 batch)
- [ART-QA-CHECKLIST.md](art/ART-QA-CHECKLIST.md) — per-asset style acceptance gate
- [ASSET-INVENTORY.md](art/ASSET-INVENTORY.md) — asset audit baseline

## 📌 `planning/` — Living checklists & status
- [2026-07-13-lantern-trail-migration-plan.md](planning/2026-07-13-lantern-trail-migration-plan.md) — active migration; Phases 0–5 merged, full responsive/device verification and release pending
- [2026-07-12-coin-purchase-golive.md](planning/2026-07-12-coin-purchase-golive.md) — Phase 1 merged dark; real-provider Phase 2 and owner gates remain pending
- [2026-07-09-duolingo-comparison.md](planning/2026-07-09-duolingo-comparison.md) — evergreen verified comparison and adoption reference
- [V2-EXECUTION-PLAN.md](planning/V2-EXECUTION-PLAN.md) — cross-session technical log across v2–v7

## 🔧 `build/` — Build & release
- [ANDROID_BUILD.md](build/ANDROID_BUILD.md) — Capacitor → APK build/signing guide

## 🌏 `i18n/` — Localization
- [i18n-translation-review.md](i18n/i18n-translation-review.md) — Thai UI strings pending native review (incl. v7 shop strings)

## 🗄️ `archive/` — Finished & superseded
- [archive/README.md](archive/README.md) — index of shipped PRDs and superseded art docs

## 📚 `superpowers/` — Process reference
- `plans/`, `specs/` — Superpowers workflow plans & design specs (archival; pending: [responsive-all-devices](superpowers/plans/2026-07-07-responsive-all-devices.md))
