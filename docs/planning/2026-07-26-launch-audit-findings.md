# v91 launch-readiness audit — findings ledger

**Date:** 2026-07-19 (audit run) — target release: v91, 2026-07-26 public PWA launch
**Scope:** Task 1 of the launch-readiness plan (discovery only, no source change).
**HEAD audited:** `83d6879` on `development`.
**Environment:** headless VPS, Playwright chromium (cached `chromium-1228`), app served
via `python3 -m http.server 8000`, light theme only (dark mode intentionally out of scope).

## Verdict

Mostly clean, with **one real P1 found on the first-run onboarding screen** (below) —
not launch-blocking, but worth a fix before the 2026-07-26 ship. Every engineering gate is
green and the permanent responsive/format/results/accessibility harness passes 10/10
viewports in both English and Thai. Manual screenshot review of the eight core screens in
both languages, including the two viewports that have regressed before (640×360 and
844×390 landscape), found no overflow, clipping, truncation, or contrast defects there.
**The P0 section is empty — nothing found blocks launch.**

Important caveat on the "clean" verdict: `scripts/responsive-sweep.mjs` and my first
screenshot pass both seed `nbhsk.introDone=true` before every page load, which means
neither the harness nor my first pass ever rendered the actual first-run **Welcome /
onboarding** screen — the one screen every new user hits before anything else. A second,
dedicated onboarding pass (see below) found a real landscape defect there that the
existing permanent gate cannot catch, because the gate never visits that screen in any
viewport.

This is otherwise consistent with the prior [2026-07-16 launch-readiness
audit](2026-07-16-ux-ui-launch-readiness-audit.md), which closed out the last round of
UI defects at v76, including a previous onboarding defect (defaulted to HSK3, only
exposed HSK1–4). That fix (defaults to HSK1, exposes HSK1–6, beginner hint) still holds —
confirmed in the portrait onboarding screenshots — but landscape onboarding was
apparently never covered by that round either.

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

**Coverage gap:** every `preparePage()` call in this script sets `nbhsk.introDone=true`
before load (by design — it's testing the returning-user app, not onboarding), so the
Welcome screen is structurally out of this gate's reach at every viewport. See Finding F2.

## Manual screenshot sweep — returning-user screens

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

## Manual screenshot sweep — true first-run onboarding (follow-up pass)

A second throwaway probe (`.superpowers/sdd/onboarding-probe.mjs`, gitignored, not
committed) drove the app with **no** localStorage seeding at all — true first-run state —
through Welcome → intro-learn (flashcard) → intro-battle (Word Quest), plus the welcome
screen's **live** language-toggle interaction (clicking the ไทย chip, not injecting
`nbhsk.locale`). 13 additional PNGs captured.

- Welcome screen, portrait 390×844, EN and TH (default + live-toggled): clean, matches
  the v76 fix (HSK1 default, HSK1–6 exposed, beginner hint visible). Live locale toggle
  re-renders instantly and correctly, no untranslated flash, no layout break when
  switching to the longer Thai strings.
- Intro-learn (flashcard) and intro-battle (Word Quest), portrait 390×844, EN and TH:
  clean, indistinguishable in layout quality from the equivalent returning-user screens
  already checked. No JS console errors in any run.
- **Welcome screen, landscape 640×360 and 844×390, EN and TH: broken — see F2.**

## Findings

| ID | Severity | Screen | Issue | Evidence | Fix owner |
|---|---|---|---|---|---|
| — | P0 | — | None found. | — | — |
| F2 | P1 | Welcome / onboarding, landscape 640×360 and 844×390 (both EN and TH) | The primary "START LEARNING" CTA is entirely below the initial viewport, with the HSK5/HSK6 level chips also cut off, and **no scroll affordance** (no partial button peek, no down-chevron, no hint) — a first-time user on a landscape phone or foldable would see Welcome text and language/level chips but no visible way to proceed. Confirmed the content *is* reachable by scrolling (`document.scrollHeight` 580px > `innerHeight` 360px at 640×360; button lands fully in view after `scrollTo(bottom)`), so it's not a hard block — but this is the very first screen every new install shows, and unlike the battle screen (which has an explicit "no scroll needed" gate for landscape, enforced by `scripts/responsive-sweep.mjs`), the welcome screen has no such protection and isn't in that gate's coverage at all (see coverage-gap note above). | `onboard-welcome-en-land-640x360.png`, `onboard-welcome-th-land-640x360.png`, `onboard-welcome-en-land-844x390.png`, verified-scrollable via `onboard-welcome-en-land-640x360-scrolled.png` | game frontend — likely needs a compact/two-column landscape variant of `#s-welcome` (`index.html` + its CSS), analogous to the flashcard's existing landscape layout; recommend also adding a permanent `scripts/responsive-sweep.mjs` welcome-screen probe (currently structurally impossible since every run seeds `introDone=true`) so this class of regression is caught going forward |
| F1 | P2 | Settings ("More"), landscape 640×360 | At the tightest landscape tier the "More" screen's 4th button (Account) and the Language toggle row sit below the initial viewport and require a scroll to reach. Verified this is normal scrolling, not a defect: `document.scrollHeight` (646px) > `innerHeight` (360px), the bottom nav is `position: sticky` and stays fully in-view both before and after scrolling to the bottom (confirmed via a throwaway probe, not committed). No control is unreachable or clipped. | `en-more-settings-land-640x360.png` / `en-more-settings-land-640x360-scrolled.png` in the audit scratchpad | log only — no owner assigned, defer indefinitely unless UX wants a denser landscape layout |

Why F2 is P1 and not P0: the content is genuinely reachable (scroll works, nothing is
clipped or destroyed), so it doesn't meet this ledger's P0 bar of
"broken/unreadable/unusable." But it's ranked above F1 because it gates the *first*
interaction of every new user on this device class, with zero visual cue that scrolling
is required — a meaningfully different risk than a rarely-visited settings sub-panel.

## Evidence inventory

Screenshots and probe scripts are session-scratch, not committed (per the harness note in
the task brief). Saved under
`/tmp/claude-0/-root-work-HSK/1ee1c8cf-280c-4250-bd35-b656a65fa13d/scratchpad/audit/`:

Returning-user sweep (28 files):
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

First-run onboarding follow-up (14 files):
- `onboard-welcome-default-390x844.png`, `onboard-welcome-en-390x844.png`
- `onboard-welcome-th-live-toggle-390x844.png`, `onboard-welcome-th-hsk3-390x844.png`
- `onboard-welcome-en-land-640x360.png`, `onboard-welcome-th-land-640x360.png`
- `onboard-welcome-en-land-640x360-scrolled.png` (F2 verification)
- `onboard-welcome-en-land-844x390.png` (F2 verification)
- `onboard-intro-learn-{en,th}-390x844.png`
- `onboard-intro-battle-{en,th}-390x844.png`

## Notes for Task 5 (consumer of this ledger)

One real actionable item: **fix F2** (landscape welcome-screen CTA below the fold) before
2026-07-26, and consider adding a permanent onboarding probe to
`scripts/responsive-sweep.mjs` so it isn't structurally excluded from the regression gate
going forward. Everything else is clean. The remaining launch blockers are the ones
already tracked outside this audit's scope: native Thai sign-off, signed Android
build/device testing, real-provider purchase wiring, and store/legal attestations (see the
"Remaining concerns" section of the 2026-07-16 audit and `../OWNER-ACTIONS.md`).
