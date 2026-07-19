# v91 launch-readiness audit — findings ledger

**Date:** 2026-07-19 (audit run) — target release: v91, 2026-07-26 public PWA launch
**Scope:** Task 1 of the launch-readiness plan (discovery only, no source change).
**HEAD audited:** `83d6879` on `development`.
**Environment:** headless VPS, Playwright chromium (cached `chromium-1228`), app served
via `python3 -m http.server 8000`, light theme only (dark mode intentionally out of scope).

## Verdict

Clean. Every engineering gate is green and the permanent responsive/format/results/
accessibility harness passes 10/10 viewports in both English and Thai. Manual screenshot
review of the eight core screens in both languages, including the two viewports that have
regressed before (640×360 and 844×390 landscape), found no overflow, clipping, truncation,
or contrast defects. **The P0 section is empty — nothing found blocks launch.**

This is consistent with the prior [2026-07-16 launch-readiness
audit](2026-07-16-ux-ui-launch-readiness-audit.md), which closed out the last round of
UI defects at v76; this v91 sweep found no regressions since.

## Engineering gates

| Gate | Result |
|---|---|
| `npm ci` | pass |
| `npm test` | pass — 9,178 tests / 88 files |
| `npm run build` | pass |
| `npm run assets:validate` | pass — 95 manifest assets |
| `npm run lint` | pass |

No failures — no P0s from this step.

## Automated responsive/regression sweep (`scripts/responsive-sweep.mjs`)

The script already falls back to the cached Playwright chromium binary via
`executablePath` when not on Windows (`launchOpts()`, lines 25-32) — no code change was
needed to run it on this VPS. Ran both the default (EN) and `--locale=th` passes.

| Locale | Viewport matrix | Format probes | Results probes | Cards-resume | Accessibility |
|---|---|---|---|---|---|
| EN | 10/10 pass | 8/8 pass | 3/3 pass | pass | pass |
| TH | 10/10 pass | 8/8 pass | 3/3 pass | pass | pass |

Matrix covers `se-320, fold-344, s-360, tall-360, iph-390, andr-412, land-640 (640×360),
land-844 (844×390), tab-768, desk-1280` — including the two landscape tiers flagged in the
brief as historically prone to regressing against the
`@media (orientation:landscape) and (max-height:500px)` block. Both passed clean in both
languages.

## Manual screenshot sweep

28 PNGs captured with a throwaway Playwright probe (not committed —
`.superpowers/` is gitignored) and eyeballed directly. Covered: Home, Word Quest (battle,
default "choose meaning" format), Flashcard (front + back), Results postcard, Settings
("More"), Shop, Street (+ Daily Quests popup), Profile/Progress — each in English and
Thai at 390×844, plus Battle, Flashcard, and Settings at landscape 640×360, and Battle at
landscape 844×390, in both languages.

No overflow, clipping, truncation, or contrast issues found in any of the 28 captures.
Thai strings (generally longer than English) wrap correctly inside their containers in
every screen checked, including the Daily Quests popup rows and the Results postcard's
bonus-reason lines, which were the highest-risk truncation candidates.

## Findings

| ID | Severity | Screen | Issue | Evidence | Fix owner |
|---|---|---|---|---|---|
| — | P0 | — | None found. | — | — |
| — | P1 | — | None found. | — | — |
| F1 | P2 | Settings ("More"), landscape 640×360 | At the tightest landscape tier the "More" screen's 4th button (Account) and the Language toggle row sit below the initial viewport and require a scroll to reach. Verified this is normal scrolling, not a defect: `document.scrollHeight` (646px) > `innerHeight` (360px), the bottom nav is `position: sticky` and stays fully in-view both before and after scrolling to the bottom (confirmed via a throwaway probe, not committed). No control is unreachable or clipped. | `en-more-settings-land-640x360.png` / `en-more-settings-land-640x360-scrolled.png` in the audit scratchpad | log only — no owner assigned, defer indefinitely unless UX wants a denser landscape layout |

## Evidence inventory

Screenshots and probe scripts are session-scratch, not committed (per the harness note in
the task brief). Saved under
`/tmp/claude-0/-root-work-HSK/1ee1c8cf-280c-4250-bd35-b656a65fa13d/scratchpad/audit/`:

- `{en,th}-home-390x844.png`
- `{en,th}-battle-390x844.png`
- `{en,th}-flashcard-{front,back}-390x844.png`
- `{en,th}-results-390x844.png`
- `{en,th}-more-settings-390x844.png`
- `{en,th}-shop-390x844.png`
- `{en,th}-street-390x844.png`
- `{en,th}-street-quests-popup-390x844.png`
- `{en,th}-progress-390x844.png`
- `{en,th}-battle-land-640x360.png`
- `{en,th}-battle-land-844x390.png`
- `{en,th}-flashcard-land-640x360.png`
- `{en,th}-more-settings-land-640x360.png`
- `en-more-settings-land-640x360-scrolled.png` (F1 verification)

## Notes for Task 5 (consumer of this ledger)

Nothing to action from a UI-defect standpoint. The remaining launch blockers are the ones
already tracked outside this audit's scope: native Thai sign-off, signed Android
build/device testing, real-provider purchase wiring, and store/legal attestations (see the
"Remaining concerns" section of the 2026-07-16 audit and `../OWNER-ACTIONS.md`) — this
sweep only re-confirms the UI layer itself is still clean at v91.
