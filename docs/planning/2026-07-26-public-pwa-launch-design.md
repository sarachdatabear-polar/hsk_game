# Public PWA Launch — Sunday 26 July 2026 (design/spec)

**Author:** session with Jordan, 2026-07-19 (Sun).
**Status:** design approved in principle (web-first framing confirmed); two
CONFIRM items open (launch URL, business-entity status). Turn into an executable
plan via `writing-plans` after Jordan reviews this doc.

---

## Goal

Make **Sunday 26 July** a real, public launch of the **already-live web / PWA**
app (`Lucky Cat HSK`), and treat **Google Play production as a separate, later
beat** that ships whenever the org account clears. The two are decoupled: the
web launch never waits on Google.

- **26 Jul deliverable:** the web app is publicly announced and promoted, and is
  genuinely launch-worthy — audited, shareable, with a reachable privacy policy.
- **Play beat:** August+ (see *Honesty flags* — the date is unbounded and gated
  on a D-U-N-S, which requires a registered business entity).

## Why not Play production on 26 Jul (the constraint that set this scope)

Confirmed against current (2026) Google policy:

- **Personal account** (what Jordan has): new personal accounts must run **12
  testers × 14 continuous days** of closed testing before they can *apply* for
  production. Starting today → earliest production mid-Aug. Cannot fit 7 days.
- **Organization account** (the chosen end-state): **exempt** from the tester
  rule, but requires a **D-U-N-S number**, which you cannot create the org
  account without, and which takes **up to ~30 days** to issue (occasionally
  instant; varies by region). D-U-N-S in turn requires a **registered business
  entity**.

Neither clock is compressible by engineering, so production-to-everyone by 26
Jul is not achievable. The web/PWA — already live at v91 — is. Hence web-first.

Sources: Play Console Help "App testing requirements for new personal developer
accounts" (support.google.com/googleplay/android-developer/answer/14151465);
"Required information to create a Play Console developer account"
(answer/13628312); D&B D-U-N-S issuance timeline (up to ~30 days).

---

## Track 1 — PWA launch readiness (driven on the VPS this week)

Sequenced so the *variable-size* work (the audit) is discovered first and the
*fixed-size* work (meta tags, privacy page) fills the rest.

### 1.1 Fresh v91 launch-readiness audit — **Day 1, first**
- Chromium screenshot sweep via the VPS Playwright harness (light-theme app) +
  the 10-viewport responsive sweep incl. landscape 640×360 / 844×390 + full
  `npm test` + `npm run build` + `assets:validate`.
- Output: a P0/P1/P2 findings list. This is the *discovery* step that sizes the
  week — it runs today, not on the 25th.
- The existing audit doc (`2026-07-16-ux-ui-launch-readiness-audit.md`) is
  v76-era and stale; this supersedes it at v91.

### 1.2 Fix what the audit surfaces
- P0/P1 fixes land via normal release cuts (bump `SHELL` in `sw.js`, merge
  `development` → `main`, gate on the green Actions run, live-verify the served
  `sw.js`). P2s are logged, not necessarily shipped pre-launch.

### 1.3 Shareable-launch polish
- **Social meta:** add `<meta name="description">` + Open Graph
  (`og:title`/`og:description`/`og:image`/`og:url`/`og:type`) + Twitter card
  tags to `index.html`. Today there are **none**, so shared launch links render
  as bare URLs — this is the single highest-leverage marketing fix.
- **OG image:** produce one 1200×630 share image (reuse the Lucky Cat PWA icon /
  a game screenshot); bundle it and reference by absolute URL.
- **PWA install check:** verify `pwa/manifest.webmanifest`, icons, `theme-color`,
  and the install/add-to-home-screen path are clean on mobile.
- **Launch screenshots:** capture a small set (Home, a battle/word screen,
  Results) for announcement posts.

### 1.4 Host the privacy policy
- Render `docs/legal/privacy-policy.md` → **`/privacy.html`** served by the
  existing GitHub Pages deploy (no separate hosting decision; reuses the
  pipeline). Link it from **Settings / About** in-app.
- One artifact serves both the 26 Jul web launch and the later Play Data Safety
  form (which requires a public privacy URL).

### 1.5 Native Thai P0 sign-off — *owner-gated*
- The app already ships Thai, so this is a **quality gate, not a launch
  blocker**. Prepare a clean handoff of the prioritized P0 queue
  (`docs/i18n/i18n-translation-review.md` — money / account-loss / cloud-backup
  / notification copy). If a reviewer returns fixes before the Fri 24 freeze,
  merge them; otherwise launch on the current TH and fast-follow.

### Freeze / soak
- **All Track-1 work merged + live-verified by Fri 24 Jul.** Sat 25 is
  soak/dry-run only (no code changes). Sun 26 is announce-day, not ship-day.

---

## Track 2 — Play production groundwork (owner-gated, starts now, OFF the 26-Jul critical path)

- **Start the D-U-N-S / org-account process today** — the long pole. Nothing
  else in Track 2 matters until this clears.
- Owner build/store actions (needed only for the Aug+ beat, not for 26 Jul):
  signed v91 AAB (Windows, keystore-bound), IARC content-rating questionnaire,
  device-acceptance matrix. Store listing + Data Safety form are already drafted
  (`docs/owner/v85-android-release-prep.md`); refresh them from v85 → v91 text.
- These are documented owner steps; the session prepares/refreshes docs but
  cannot create accounts, sign on Windows, or run a physical device.

---

## Day-by-day (Sun 19 → Sun 26)

| Day | Track 1 (session) | Track 2 (owner) |
|---|---|---|
| **Sun 19** (today) | Run the v91 audit sweep; triage into P0/P1/P2 | Start D-U-N-S; confirm business-entity status |
| **Mon 20** | Begin P0 fixes; start OG/meta + `privacy.html` | (D-U-N-S in flight) |
| **Tue 21** | Ship `privacy.html` + social meta (release cut); live-verify | — |
| **Wed 22** | Finish P0/P1 fixes; capture launch screenshots + OG image; hand off Thai P0 queue | — |
| **Thu 23** | Buffer — remaining fixes; re-run full sweep | — |
| **Fri 24** | **FREEZE** — final release cut + live-verify; launch copy/assets locked | — |
| **Sat 25** | Soak / dry-run only (no code changes); merge Thai P0 if returned | — |
| **Sun 26** | **LAUNCH** — announce & promote the web app | — |

---

## Honesty flags (state, don't bury)

1. **Org = no guaranteed Play date.** D-U-N-S needs a registered business
   entity. If Jordan has **no entity registered yet**, org Play production could
   slip to **September+**, not August. The only path to a *guaranteed* August
   Play date was a parallel personal closed-test (Jordan passed on it — org is
   the cleaner end-state, but the date is genuinely unbounded). This does **not**
   affect the 26 Jul web launch.
2. **The web launch has no external clock** — everything on its critical path is
   in-repo and session-drivable. The only risk is fix-workload discovered by the
   audit, which is why the audit is front-loaded to Day 1.

## Open CONFIRM items (Jordan)

- **C1 — Launch URL.** Default: existing `sarachdatabear-polar.github.io/hsk_game/`.
  A **custom domain** needs GitHub Pages DNS + cert (24h+ lead) — decide by
  ~Wed 23 at the latest, not launch day.
- **C2 — Business-entity status.** Do you already have a registered company /
  legal entity (prerequisite for D-U-N-S → org account)? If no, the Play beat is
  Sept+; if you want a guaranteed Aug date, reconsider the parallel personal
  closed-test. Either way, does not move 26 Jul.

## Out of scope (explicitly not for 26 Jul)

- Real-money monetization (RevenueCat still dark; Play-gated).
- Analytics pipeline (opt-in, off by default; server table unapplied — a launch
  can proceed without it, though see *risk* note: no launch-day metrics).
- Android widget, learning-depth/radicals, friend-compare expansion (data/owner
  gated per the work queue).
