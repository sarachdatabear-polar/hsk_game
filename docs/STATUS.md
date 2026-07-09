# Lucky Cat HSK — Status

**Last updated:** 2026-07-09
**TL;DR:** Live on `main` at **SHELL v38** — v6 phase 3 plus today's release train (deco PNG art, UX-audit quest/layout fixes, shop-preview art). Two fixes sit on **open PRs** (#55 shop deco-tile fit, #56 remove 4 old skins). The big unstarted item is **monetization / store production**. Next owner task: **generate the 10 street-deco art files**.

## Where the game is

| Tier | State |
|---|---|
| **Live on `main` / GitHub Pages** | SHELL **v38** (released 2026-07-09 via #54). Everything below, plus today's train: **deco PNG art** — 5 legacy street decos as real art with vector fallback (#50); **UX-audit fixes** — quest-row frame no longer clips text + Street/Quests/More top-align instead of floating (#51); **shop preview tiles** — effect/soundpack previews fill the tile (#53); **UI polish** audit F1–F10 (#44); **v6 phase 3** — cloze fill-in-the-blank (#41/#42) + Tone Trainer (#43). Earlier: i18n completeness (#46), Monetization P0 foundations (#47), street deco auto-arrange (#48), v5/v6/v7, responsive round, season art. |
| **Merged to `development`, unreleased** | No unreleased **code** — `development` == `main` at v38, ahead only by docs. |
| **On feature branches (open PRs → `development`)** | **#55** — shop deco-tile fit: painted decos fit the preview tile instead of overflowing at street scale (SHELL v39). **#56** — full removal of the 4 old recolor skins midnight/sakura/jade/gold (SHELL v40). Both tests-green and ready to merge. |

## Done

- **v2 "Make It Stick"** — wallet/shop, smart review, bosses, streak (2026-07-04) → [archive](archive/prd/PRD-v2-upgrade.md)
- **v3 "Lucky Cat Grows"** — XP/levels/milestones (2026-07-04, log in [V2-EXECUTION-PLAN](planning/V2-EXECUTION-PLAN.md))
- **v4 "Lucky Cat Street"** — home street, deco/effect/sound shop (2026-07-04, PR #7) → [archive](archive/prd/PRD-v4-street.md)
- **Web ship + session picker + i18n TH/EN + SVG pack v2 + data sync** (2026-07-03→07, PRs #2–#14)
- **Visual Slice v1** — PRD-exact Home + Battle rebuild + fix round (2026-07-06, PRs #15–#16) → [archive](archive/prd/PRD-visual-slice-v1.md)
- **v5 "Reference Visual Overhaul + Kind Retention"** — phases 1–5 (2026-07-07, PRs #18–#22) → [PRD lives on](prd/PRD-v5-visual-retention.md) (§8 = v-next roadmap)
- **v6 Phase 1** — question formats: listen / reverse / tone mastery ladder (2026-07-07, PR #23)
- **i18n pass 2** — howto/street/item-name localization + usage-guard test (2026-07-08); native TH review still open
- **Responsive all-devices round** — short-phone + landscape fixes, permanent 10-viewport gate (2026-07-08, PR #29)
- **Street restyle** — warm-daylight scene, two-row layout, tier-3 crown accent (2026-07-08)
- **v7 "Shop Seasons"** — themed catalog, daily stock, season corner, deco tiers + art round (2026-07-08, PR #26) → [archive](archive/prd/PRD-v7-shop-seasons.md)
- **v7 season art intake** — season backdrops + cat costume sheets (2026-07-08, PR #33)
- **v7 follow-ups** — Today's Stock empty state, registry guards, 10 deco prompts + manifest rows, art-drop `--prune` tooling (2026-07-08, PR #36)
- **v6 Phase 2 "Typed-Pinyin Recall"** — ladder rung 7+, letters + per-syllable tone taps, EN/TH (2026-07-08, PR #37) + typed-polish (PR #39)
- **v6 Phase 3** — cloze fill-in-the-blank (#41 data + #42 gameplay) + **Tone Trainer** tone-discrimination minigame (#43) (2026-07-09)
- **UI polish audit F1–F10** (2026-07-09, PR #44)
- **i18n extraction completeness** — last hardcoded UI strings through `t()`, +11 EN/TH keys, guard test extended to `milestone.*` (2026-07-09, PR #46)
- **Monetization P0 no-accounts foundations** — Supabase `schema.sql`+README, privacy-policy DRAFT, pure/tested `interstitial-policy.js` (not wired) (2026-07-09, PR #47) → [PRD](prd/PRD-monetization-and-production.md)
- **Street deco auto-arrange** — even, tier-aware, provably-non-overlapping deco layout (2026-07-09, PR #48)
- **Street deco PNG art** — 5 legacy decos rendered as real art with vector fallback (2026-07-09, PR #50)
- **UX/UI audit round** ([ux-audit-2026-07-09.md](planning/ux-audit-2026-07-09.md)) — Chromium screenshot sweep; shipped fixes: quest-row frame clip + top-align sparse screens (PR #51), shop effect/soundpack preview fill (PR #53). Remaining findings are in **Planned** below.

## In progress

- **PR #55** — shop deco-tile fit (painted decos fit the preview tile). Ready, tests green.
- **PR #56** — remove the 4 old recolor skins (midnight/sakura/jade/gold); owners degrade gracefully to the default cat. Ready, tests green.
- No other active branches.

## Planned

Ordered by priority. `(owner)` = needs a human action Claude can't do; `(needs direction)` = Claude can build once you pick an approach; `(Claude-ready)` = actionable now.

1. **Merge the two open PRs + cut a release** `(owner)` — merge #55 then #56 into `development`; whichever lands second, bump its `SHELL` to the next free number (they're v39/v40). Then cut `development` → `main` and live-smoke-verify. Small, no dependencies.
2. **Generate the 10 street-deco art files** `(owner)` — prompts ready in [`art-drop/REMAINING-DECO-PROMPTS.md`](../art-drop/REMAINING-DECO-PROMPTS.md) (and the v7 batch in [GENERATION-PROMPTS-P0-copypaste.md](art/GENERATION-PROMPTS-P0-copypaste.md)). Ids: mahjong-table, koi-pond, drum-tower, bubble-tea, paper-umbrella, goldfish-banner, neon-cat-sign, shaved-ice-cart, mooncake-stall, firecracker-arch. Save each as `deco-<id>.png` → `art-drop/` → `python3 scripts/intake_art.py`. Until then those shop tiles show tiny vector placeholders; once installed they auto-use the fitted preview from #55.
3. **UX-audit remaining polish** `(needs direction)` — deferred items from [ux-audit-2026-07-09.md](planning/ux-audit-2026-07-09.md), each a design call: (a) **Tone Trainer glyphs** — the `1 ˉ / 2 ´` labels read small/floaty; alt = `mā má mǎ mà` or a pitch-contour icon; (b) **desktop phone-column** — the game is a ~640px column on bare cream at ≥1024px; add a backdrop treatment or leave it; (c) **dark theme** — currently light-only; build a second palette or skip. Pick a direction per item and Claude ships it.
4. **Monetization P0 — account-gated slices** `(owner)` — the no-accounts slices are done (#46/#47). Remaining P0 needs the owner: stand up the Supabase project (apply [`docs/supabase/schema.sql`](supabase/schema.sql)), register RevenueCat products + AdMob, add the iOS/Capacitor target, get the privacy policy legally reviewed. Then **P1 (ads)** wires AdMob into the built `src/monetization/interstitial-policy.js`. Provider abstraction/mock + results UI + client clamp are deferred until the SDKs exist. See [PRD](prd/PRD-monetization-and-production.md).
5. **Native Thai review of UI strings** `(owner)` — incl. the i18n pass-2/3 additions ([i18n-translation-review.md](i18n/i18n-translation-review.md)).
6. **Roadmaps not started** — HSK 3.0 content refresh; social layer; notifications/widget; Android release refresh ([ANDROID_BUILD.md](build/ANDROID_BUILD.md)). Optional: deco reorder self-expression; a display cap / second row when the deco catalog grows past ~15.

## Doc map

- Live docs index: [README.md](README.md)
- Finished/superseded docs: [archive/README.md](archive/README.md)
