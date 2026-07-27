# Lucky Cat HSK — Status

**Last updated:** 2026-07-27
**TL;DR:** **Cat Journey full product is LIVE IN PRODUCTION at service-worker
`v127`.** `main` == `development` == **`7fa2c721`**; GitHub Pages run
`30242642301` succeeded 2026-07-27 06:24Z. (A prior revision of this file
claimed the cut was source-verified only and "does not claim a new live
deployment" — that was wrong: every push to `main` auto-deploys, and all three
Cat Journey commits did.) The Cat tab replaces Street by default behind a
data-safe local rollback flag; legacy Street saves remain untouched. Verified
gates: **107 test files / 9,708 tests**, **134 validated assets**, ESLint,
production build, asset budgets, a **659,749-byte** bundle, and focused Cat
Journey browser passes at 320×568, 390×844, and 844×390.

**Three release gates were NOT met before this shipped — all open:**

1. **Code review — now DONE, and it found two live defects.** The four
   commits in `013a4787..7fa2c721` were auto-deployed unreviewed; the review
   that should have preceded them is
   [2026-07-27-cat-journey-v127-review-findings.md](planning/2026-07-27-cat-journey-v127-review-findings.md).
   Two P0s: a **pre-existing** identity-switch hole in the `sessionReconciled`
   latch (`src/sync.js:33`) that can blind-push guest state over a real
   account's cloud row — unrecoverable for reinstall-then-sign-in users — and
   the **new** orphaning of the daily-quest UI and 1,500-coin monthly claim
   button, which `show()`'s Street→Cat-Journey rewrite made unreachable for
   every user. Remediation is sequenced as v128 (live defects) then v129
   (cloud-sync flip).
2. **Native Thai sign-off.** `docs/content/CAT-JOURNEY-EVERGREEN-v1-REVIEW.md`
   declares itself "a production release gate" and its native-review checkbox
   is unchecked, yet **185 machine-drafted Thai strings** are live to Thai users
   with no fallback — and **none** of them carries the `TH-REVIEW` tag, so
   nothing entered the review queue. Three of them silently replaced Thai that
   had already passed the v112–v116 humanization arc (`account.connect`,
   `learn.stillLearning`, `learn.knowIt`). Structural i18n integrity is clean
   (EN and TH both 732 keys, zero placeholder mismatches) — the defect is
   procedural, not broken text.
3. **Signed Android artifact.** None exists for v127.

Cloud sync of Journey state is deliberately dark
(`CAT_JOURNEY_CLOUD_ENABLED = false`, `src/cloud-config.js`): the live Supabase
`public.progress` table has **no `cat_journey` column** (confirmed by direct
query 2026-07-27), so
`docs/supabase/migrations/2026-07-27-cat-journey.sql` must be applied before
the flag is flipped. Until then Journey claims, Cat Bond tier, and goal history
are **device-local** — switching devices loses them. Post-MVP direction is the
[Cat Journey Full Product PRD](../../docs/superpowers/specs/2026-07-27-cat-journey-full-product-prd.md)
and
[execution plan](../../docs/superpowers/plans/2026-07-27-cat-journey-full-product-execution-plan.md).

<details><summary>Prior v85 TL;DR (superseded)</summary>

The v85 release (`ead3ff2`) shipped the HSK 3.0 (GF0025-2021) compatibility
audit and an additive read-only `h3` band on word records that is **dormant**
(rendered nowhere yet), so it was a data-only cut with no behavior change —
`dist/app.js` byte-identical and the SHELL bump only busted the PWA cache for the
regenerated `data/words.js`. The web
release is complete; signed Android and store/legal work remains in
[OWNER-ACTIONS.md](OWNER-ACTIONS.md).

</details>

## Where the game is

| Tier | State |
|---|---|
| **Live in production** | `main` == `development` == `7fa2c721`; SHELL/runtime **v127**; Pages run `30242642301` SUCCESS 2026-07-27 06:24Z. Cat Journey full product enabled by default (Phases 0–2, Phase 3 authored content, Phase 4 learning/UX). |
| **Current automated baseline** | 107 files / 9,708 tests; 134 assets; ESLint, production build, and asset budgets pass; `dist/app.js` 659,749 bytes; focused Journey QA at 320×568, 390×844, 844×390. |
| **Cloud sync of Journey state** | **DARK.** `CAT_JOURNEY_CLOUD_ENABLED = false`; live `public.progress` has no `cat_journey` column. Journey state is device-local until `docs/supabase/migrations/2026-07-27-cat-journey.sql` is applied and the flag flipped (separate cut: rebuild + SHELL v128 + sw-precache pin). |
| **Code review** | **DONE 2026-07-27, post-deploy** — [findings](planning/2026-07-27-cat-journey-v127-review-findings.md). Core reward loop, rollback flag, and v5→v6 migration all verified sound. Two P0 live defects open: identity-switch latch (pre-existing) and orphaned quest UI (new). |
| **Native Thai sign-off** | **OUTSTANDING.** Declared release gate in `docs/content/CAT-JOURNEY-EVERGREEN-v1-REVIEW.md`, unchecked; 185 drafted TH strings already live, none `TH-REVIEW`-tagged, none present in `docs/i18n/thai-review-sheet.csv`. |
| **Latest signed Android artifact on record** | Profile v74 APK. A current Cat Journey APK/AAB still needs Capacitor sync, Windows signing, and emulator/physical-device acceptance. |

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
- **Audit/hardening + Profile release** — battle readability, clean-matte cat
  art, cloud-purchase/native lifecycle hardening, and Profile-first dashboard
  released through SHELL v74 on 2026-07-15/16.
- **v75 local release-readiness integration** — Profile uses a player monogram
  instead of the cat mascot; Capacitor-6-compatible RevenueCat provider is
  installed but disabled by blank public config; webhook adds bearer + HMAC
  checks; Thai mechanical gates and dual-language viewport sweeps pass.
- **v76 UX/UI launch-readiness repair** — HSK1-first onboarding with all six
  levels, format-specific quest instructions, 44px typed/tone controls,
  landscape flashcards, bounded resumable card sessions, anti-farming flip
  guard, zoom/dialog/focus/ARIA improvements, lazy optional art, a 69-file
  atomic offline shell, compressed street decor, and deterministic Lucky Cat
  Android launcher/splash resources. The permanent browser gate now covers all
  major screens, advanced formats, Results, card resume, and keyboard focus in
  English and Thai.
- **v77–v79 releases** — live account deletion, example sentences on Cards,
  the static battle scene, and the first mobile-audio unlock pass (2026-07-17).
- **v80–v85 releases** (2026-07-17→19) — v80 corrective hardening; **v81**
  production hardening (CI on PRs, crash log, schema versioning, storage seam,
  ESLint, provider tests); **v82** HSK3/4/5 flashcard example sentences + #123
  hardening; **v83** #127 Thai wrong-meaning fix + HSK6 example sentences
  (examples now 3,887); **v84** tappable word-detail panel (flashcard ⓘ +
  needs-work rows); **v85** HSK 3.0 (GF0025-2021) compatibility audit + dormant
  additive `h3` band on word records (data-only, nothing reads it yet) + coin §6
  decisions/PRD §6.3 ledger-cursor amendment. Catalog data-quality (#126) fixed
  and closed; #127 Thai native-review remains open.

## In progress

- **Cat Journey full product:** Phases 0–2 are implemented locally: authoritative
  product docs, permanent v2 state/migration, and convergent additive cloud
  merge are complete. Phase 3 now has 30 authored evergreen memories, 12
  keepsake identities, complete draft EN/TH keys, content validation, and the
  first production bitmap keepsake; all three Journey poses are now below their
  asset budgets. Phase 4 engineering is complete locally: meaningful learned
  words, destination/word/audio journal rows, incremental permanent history,
  Home/Results cues, and native return-notification behavior. Remaining Phase
  3 gates are native Thai sign-off and 11 optional keepsake bitmaps. Cloud sync
  stays dark until the additive backend migration is deployed and verified.
  Phases 5–8 remain: measurement/operations, full release QA,
  observation/tuning, and safe Street retirement.
- **Current Android cut:** produce a signed Cat Journey APK/AAB and repeat the
  emulator/physical-device matrix after the full-product release candidate is
  frozen. The previously verified v74 APK remains recorded in
  [ANDROID_BUILD.md](build/ANDROID_BUILD.md).
- **Post-release measurement:** no production analytics pipeline exists, so
  completion, recovery, delayed recall, and D1/D7 return cannot yet be compared
  reliably.
- **Capacitor major upgrade:** v80 removes current advisories with patched
  `tar` 7.5.20 plus a fail-fast Capacitor-6 export compatibility shim. A full
  Capacitor major upgrade remains a separate native-platform project.

## v80 verification snapshot

- Unit/integration: **79 files / 1,973 tests** pass; production bundle builds.
- Assets: **95/95** validate; every street decoration is below its 120 KB
  budget.
- Browser: deterministic **10/10 EN + 10/10 TH** viewports pass across every
  major screen; 2/2 listen, 8/8 advanced-format, 3/3 Results, Cards resume, and
  dialog-focus probes pass in each language. Fixtures include the long `了`
  Cards back and `下午` bilingual cloze prompt.
- PWA: uncached boot dropped from **92 resources / 17.47 MiB** to a measured
  **27 resources / 5.33 MiB** before the final three hidden-screen images were
  also marked lazy. Offline cold launch passes with six data levels. The atomic
  shell dropped from **108 files / 18.50 MiB** to **69 files / 9.52 MiB**.
- PWA/platform: shell/runtime/audio caches advance together at v80; direct
  `file://` launch passes; both production-only and full `npm audit` report zero
  vulnerabilities.
- Android staging: `npm run cap:sync` passes with patched `tar` 7.5.20 and ends
  by applying the tracked Lucky Cat icon/splash pack; final signing and
  physical-device acceptance are owner gates.

## Planned / owner queue

The single authoritative human-action checklist is
[OWNER-ACTIONS.md](OWNER-ACTIONS.md). Engineering follows the
[Cat Journey full-product execution plan](../../docs/superpowers/plans/2026-07-27-cat-journey-full-product-execution-plan.md);
the locked
[hosting/billing go-live plan](planning/2026-07-25-golive-hosting-billing-plan.md)
remains authoritative for external launch operations. Public
social/leaderboard work remains deferred.

_UX-audit polish complete: tone glyphs (#60) + desktop ambient (#61) shipped; **dark theme decided against** (light-only is fine for this mobile learning game)._
_All 7 shop preview tiles shipped (2026-07-10): the 4 originals plus regenerated `tile-arcade`/`tile-lion-drum` and the new `tile-streak-freeze` consumable tile (audit-v50 F6 closed). Archive note: the 3 final dark-glow raws were pruned before being committed — git history only holds the old white-bg arcade/lion-drum raws; re-drop the originals to `art-drop/` if full-res archival is wanted._

## Doc map

- Live docs index: [README.md](README.md)
- Finished/superseded docs: [archive/README.md](archive/README.md)
