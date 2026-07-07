# Lucky Cat HSK — docs index

Docs are grouped by **content / workstream**. This index lists the **active** docs
(current plan + evergreen references). Shipped one-off specs and superseded art
briefs are removed once their work lands — recover any of them from git history if
needed. Historical execution logs live under `superpowers/` and intentionally keep
their original in-text paths (they record what was done at the time).

## 📋 `prd/` — Product requirements (what to build)
- [PRD-v7-shop-seasons.md](prd/PRD-v7-shop-seasons.md) — **current plan**: Shop Seasons (themed catalog, daily stock, season exclusives, deco tiers)
- [PRD-v5-visual-retention.md](prd/PRD-v5-visual-retention.md) — shipped 2026-07-07 (phases 1–5); §8 still holds the v-next roadmap (question types → v6, HSK 3.0, social layer)
- [PRD-monetization-and-production.md](prd/PRD-monetization-and-production.md) — store launch + monetization roadmap (all monetization deferred here)

## 🎨 `art/` — Art direction & production
- [Lucky_Cat_HSK_PRD_Visual_Spec_v1.0.md](art/Lucky_Cat_HSK_PRD_Visual_Spec_v1.0.md) — visual-exact source spec (warm-daylight look)
- [STYLE-TOKENS.md](art/STYLE-TOKENS.md) — style bible: palette hex, typography, panel/light rules (v5 A0)
- [SCREEN-CHECKLIST-v5.md](art/SCREEN-CHECKLIST-v5.md) — per-screen reference-match acceptance gate (v5 A0/A1)
- [GENERATION-PROMPTS-v5.md](art/GENERATION-PROMPTS-v5.md) — style-locked master prompt + per-asset clauses (v5 A2)
- [GENERATION-PROMPTS-P0-copypaste.md](art/GENERATION-PROMPTS-P0-copypaste.md) — copy-paste prompt blocks + art-drop intake workflow
- [GENERATION-PROMPTS-visual-slice.md](art/GENERATION-PROMPTS-visual-slice.md) — earlier prompt pack for backgrounds / raccoon sheets
- [ART-QA-CHECKLIST.md](art/ART-QA-CHECKLIST.md) — per-asset style acceptance gate
- [ASSET-INVENTORY.md](art/ASSET-INVENTORY.md) — asset audit baseline

## 📌 `planning/` — Living checklists & status
- [V2-EXECUTION-PLAN.md](planning/V2-EXECUTION-PLAN.md) — cross-session technical status/log across v2–v5

## 🔧 `build/` — Build & release
- [ANDROID_BUILD.md](build/ANDROID_BUILD.md) — Capacitor → APK build/signing guide

## 🌏 `i18n/` — Localization
- [i18n-translation-review.md](i18n/i18n-translation-review.md) — Thai UI strings pending native review

## 📚 `superpowers/` — Process reference
- `plans/`, `specs/` — Superpowers workflow plans & design specs (archival)
