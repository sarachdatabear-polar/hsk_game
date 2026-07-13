# Lucky Cat HSK — Status

**Last updated:** 2026-07-13
**TL;DR:** Lantern Trail is live on `main` and GitHub Pages at **SHELL v69** (PR #98). The public Word Quest release and signed Android candidate passed their accepted release gates. Since then, the **re-engagement notification** (day-3 lapsed-streak nudge) shipped to `main` (PRs #101/#102, deploy `29262391961`) — **native-only, so no SHELL bump** (web-inert; runs on the next Android cut).

## Where the game is

| Tier | State |
|---|---|
| **Live on `main` / GitHub Pages** | SHELL **v69** (PR #98, merge `336a56d`, 2026-07-13): complete Lantern Trail Word Quest, Review Pouch retries, semantic Review Challenge, postcard Results/rewards, responsive/accessibility repairs, updated EN/TH how-to, and the preceding v66 retention/content/battle/coin-purchase foundation. Pages deployment `29238824245` passed. |
| **Merged to `development`, unreleased** | No unreleased gameplay changes. `development` and `main` both carry the v69 content plus the re-engagement notification (native-only). |
| **On feature branches** | `docs/plan-refresh-2026-07-13-lantern-release` archives the completed migration plan and records the live release. No gameplay changes live on this docs branch. |

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
- **UX/UI audit round** ([archive](archive/planning/ux-audit-2026-07-09.md)) — Chromium screenshot sweep; shipped fixes: quest-row frame clip + top-align sparse screens (PR #51), shop effect/soundpack preview fill (PR #53).
- **Shop deco-tile fit** — painted deco sprites fit the shop preview tile instead of overflowing at street scale (2026-07-09, PR #55)
- **Removed 4 deprecated skins** — midnight/sakura/jade/gold fully removed (catalog, palettes, i18n, sprites, manifest, precache, art); owners degrade gracefully to the default cat (2026-07-09, PR #56)
- **10 street-deco art files** — owner-generated art intaken + integrated; all 15 decos render in shop + street (2026-07-09, PR #59)
- **Tone Trainer pitch-contour glyphs** — replaced the tiny spacing tone marks with Chao-5-level contours (2026-07-09, PR #60)
- **Desktop ambient backdrop** — warm vignette + column lift so the wide-screen column reads as an intentional panel (2026-07-09, PR #61)
- **Shop effect/soundpack tile art (4 of 6)** — painted full-bleed tiles for sakura-fx, firecracker-fx, star-shower, bells replace the procedural previews; arcade + lion-drum fall back to procedural pending art regen (2026-07-09)
- **Retention pack + follow-ups** — streak freezes, monthly quest, streak saver, and repair round (2026-07-10, PRs #70–#71) → [archive](archive/planning/2026-07-09-retention-pack.md)
- **Client auth + cloud save** — guest/email OTP and cross-device reconciliation (2026-07-10, PRs #74 and #76) → [archive](archive/planning/2026-07-10-client-auth-plan.md)
- **Content and live-audit rounds** — gloss/Thai repair, street/quest/battle/audio fixes, and battle-interface Waves 1–2 (2026-07-11–12, PRs #78–#86)
- **Bug-hunt + coin purchase Phase 1 dark release** (2026-07-12, PRs #87–#89) → [bug-hunt archive](archive/planning/2026-07-12-bug-hunt-fix-plan.md)
- **Lantern Trail continuous quest core** — deep scheduler, Review Pouch, learned targets, no hearts, and existing-vibe integration; 1,789 tests and 95 assets green (2026-07-13, `7d0aded`) → [archived migration plan](archive/planning/2026-07-13-lantern-trail-migration-plan.md)
- **Lantern Trail Phases 3–4** — semantic Word Quest hierarchy, Lucky Flow/purpose rail, three-node local trail, advancing cat, friendly guide, lucky-charm feedback, and rotating existing chapter art (2026-07-13, PRs #90–#91; 1,811 tests and 95 assets green) → [archived migration plan](archive/planning/2026-07-13-lantern-trail-migration-plan.md)
- **Lantern Trail Phase 5** — semantic Review Challenge, postcard results/rewards, missed-word recap, tomorrow hook, and retry-economy protection; 62 test files / 1,827 tests and 95 assets green (2026-07-13, PR #93, merge `3d3f821`) → [archived migration plan](archive/planning/2026-07-13-lantern-trail-migration-plan.md)
- **Lantern Trail Phase 6 and release** — SHELL v69, 44px target floor, responsive/listening/real-Results sweeps, signed APK, accepted emulator playthrough, and successful live Pages verification (2026-07-13, PRs #95 and #98, live merge `336a56d`) → [archived migration plan](archive/planning/2026-07-13-lantern-trail-migration-plan.md)
- **Re-engagement notification** — day-3 lapsed-streak "come back" local notification for players with an established streak (notification id 1002, distinct from the same-day streak-saver 1001); pure `reengagePlan()` + native `syncReengageReminder()`, EN/TH copy (TH queued for native review). Native-only, **no SHELL bump**; suite 1833, whole-branch review clean (2026-07-13, PRs #101/#102, live merge `223ca53`) → design/plan `planning/2026-07-13-reengagement-notification-{design,plan}.md`. Owed on next Android cut: `cap sync` + emulator check of id-1002 firing/cancel.

## In progress

- **Post-release observation:** compare completion, wrong-answer recovery, delayed recall, and D1/D7 return after the v69 release. No corrective feature branch is open.
- **Physical-device follow-up:** haptic feel and real mid-range-device performance could not be proven because no phone is available. They remain explicit non-blocking follow-ups. The signed APK is `dist-apk/LuckyCatHSK-1.0.0.apk` (SHA-256 `A81970806068EDF0FD436A9B000CF228844081CFDB0EDB264BE3A6CB1526488F`).

## Planned

Ordered by priority. `(owner)` = needs a human action Claude can't do; `(needs direction)` = Claude can build once you pick an approach; `(Claude-ready)` = actionable now.

1. **Coin purchase Phase 2 / monetization production gates** `(owner + implementation)` — configure the real provider/products and closed-track testing, then implement the deferred provider/join-key/fresh-cursor gates in the [go-live plan](planning/2026-07-12-coin-purchase-golive.md). See also the [PRD](prd/PRD-monetization-and-production.md).
2. **Native Thai review of UI strings** `(owner)` — including later account, IAP, and Lantern Trail terminology ([i18n-translation-review.md](i18n/i18n-translation-review.md)).
3. **Later roadmaps** — HSK 3.0 content refresh, social layer, notifications/widget, and Android release refresh ([ANDROID_BUILD.md](build/ANDROID_BUILD.md)).

_UX-audit polish complete: tone glyphs (#60) + desktop ambient (#61) shipped; **dark theme decided against** (light-only is fine for this mobile learning game)._
_All 7 shop preview tiles shipped (2026-07-10): the 4 originals plus regenerated `tile-arcade`/`tile-lion-drum` and the new `tile-streak-freeze` consumable tile (audit-v50 F6 closed). Archive note: the 3 final dark-glow raws were pruned before being committed — git history only holds the old white-bg arcade/lion-drum raws; re-drop the originals to `art-drop/` if full-res archival is wanted._

## Doc map

- Live docs index: [README.md](README.md)
- Finished/superseded docs: [archive/README.md](archive/README.md)
