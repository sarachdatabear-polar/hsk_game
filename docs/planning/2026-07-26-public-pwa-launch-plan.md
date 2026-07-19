# Public PWA Launch (Sun 26 Jul) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the already-live web/PWA genuinely launch-worthy for a public 26 Jul launch — audited, shareable (social preview cards), with a hosted privacy policy — while owner-gated Play/Android work runs in parallel off the critical path.

**Architecture:** Vanilla-JS PWA. Track 1 = session-driven engineering (audit → fixes → social meta → hosted `/privacy.html` → freeze), shipped through the normal `development`→`main` release cut. Track 2 = owner Play groundwork (D-U-N-S, signed AAB), documented not coded.

**Tech Stack:** esbuild bundle, vitest tests, GitHub Pages deploy via `scripts/stage-www.js`, VPS Playwright-chromium screenshot/responsive harness.

Design/spec: `docs/planning/2026-07-26-public-pwa-launch-design.md`.

## Global Constraints

- **Every user-facing ship bumps `CACHE_VERSION` in `sw.js`** (currently `"v91"`) so installed PWAs bust the shell.
- **Release cut:** on `development` bump `sw.js`, commit, merge `--no-ff` into `main`, push; gate "done" on the green Actions run (`gh run watch <id> --exit-status`) then live-verify the served `sw.js` version. `main` is not PR-protected. **Never self-ship without Jordan's explicit "ship" per cut.**
- **Never mask the test exit code** — don't pipe `npm test` to tail/grep when gating a commit.
- **file:// constraint:** the app must still run opened directly; keep the fetch-fails-silently → fallback pattern for any new bundled data.
- **After changing `src/`, run `npm run build`** — the deployed app uses `dist/app.js`.
- **New nbhsk.* keys** go through `src/storage.js`; decide sync vs local-only. (No new stored state is expected in this plan.)
- **Launch URL:** `https://sarachdatabear-polar.github.io/hsk_game/` (CONFIRM C1 — custom domain decision by Wed 23 if any).
- **Freeze:** all Track-1 work merged + live-verified by **Fri 24 Jul**; Sat 25 soak only; Sun 26 announce.

---

### Task 1: v91 launch-readiness audit sweep (discovery — Day 1, first)

Runs first because it sizes the week's fix workload. Produces a findings list; no source change.

**Files:**
- Create: `docs/planning/2026-07-26-launch-audit-findings.md` (findings ledger)
- Read: `scripts/responsive-sweep.mjs` (existing harness; chromium via `executablePath` per [[vps-screenshot-harness]])

**Interfaces:**
- Produces: a P0/P1/P2 findings ledger consumed by Task 5.

- [ ] **Step 1: Green the engineering gates**

Run (do not mask exit codes):
```bash
npm ci && npm test && npm run build && npm run assets:validate && npm run lint
```
Expected: all pass (~2,000 tests, 95 assets). Record any failure as a P0 finding.

- [ ] **Step 2: Serve + run the responsive/screenshot sweep on the VPS**

```bash
python3 -m http.server 8000 &   # npm's serve calls bare `python` (absent here)
npx playwright install chromium # one-time, cached
node scripts/responsive-sweep.mjs   # ensure it drives chromium via executablePath, not msedge
```
Capture the tight viewports incl. **landscape 640×360 / 844×390**. App is light-theme only.

- [ ] **Step 3: Screenshot the core loop in EN + TH**

Drive a chromium probe over: Home, Word Quest / a battle word, a flashcard, Results, Settings/more, shop/street. Both `en` and `th`. Save PNGs under the scratchpad; eyeball for overflow/clipping/contrast/truncation.

- [ ] **Step 4: Write the findings ledger**

Create `docs/planning/2026-07-26-launch-audit-findings.md` with a table: `ID | Severity (P0/P1/P2) | Screen | Issue | Evidence (screenshot) | Fix owner`. P0 = launch-blocking (broken/unreadable/unusable); P1 = visible polish; P2 = nice-to-have (log, defer).

- [ ] **Step 5: Commit**

```bash
git add docs/planning/2026-07-26-launch-audit-findings.md
git commit -m "docs(launch): v91 launch-readiness audit findings ledger"
```

---

### Task 2: Social / Open Graph meta tags

Shared launch links currently render as bare URLs (no `og:*`, no `<meta description>`). Add them so posts/messages show a rich card.

**Files:**
- Modify: `index.html` (`<head>`, after the `<title>` at line ~9)
- Create: `test/social-meta.test.js`

**Interfaces:**
- Produces: `index.html` head containing `description`, `og:*`, `twitter:*` tags referencing `assets/og-image.png` (created in Task 3).

- [ ] **Step 1: Write the failing test**

```js
// test/social-meta.test.js
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

describe("social / Open Graph meta", () => {
  const required = [
    '<meta name="description"',
    'property="og:title"',
    'property="og:description"',
    'property="og:image"',
    'property="og:url"',
    'property="og:type"',
    'name="twitter:card"',
    'assets/og-image.png',
  ];
  for (const frag of required) {
    it(`includes ${frag}`, () => expect(html).toContain(frag));
  }
  it("og:url is the canonical Pages URL", () =>
    expect(html).toContain("https://sarachdatabear-polar.github.io/hsk_game/"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/social-meta.test.js`
Expected: FAIL (tags absent).

- [ ] **Step 3: Add the meta tags to `index.html`**

Insert immediately after `<title>Lucky Cat HSK 招财猫</title>`:
```html
<meta name="description" content="HSK vocab arcade: words ranked by real exam frequency. English & Thai, fully offline.">
<link rel="canonical" href="https://sarachdatabear-polar.github.io/hsk_game/">
<meta property="og:type" content="website">
<meta property="og:title" content="Lucky Cat HSK 招财猫">
<meta property="og:description" content="HSK vocab arcade: words ranked by real exam frequency. English & Thai, fully offline.">
<meta property="og:url" content="https://sarachdatabear-polar.github.io/hsk_game/">
<meta property="og:image" content="https://sarachdatabear-polar.github.io/hsk_game/assets/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Lucky Cat HSK 招财猫">
<meta name="twitter:description" content="HSK vocab arcade: words ranked by real exam frequency. English & Thai, fully offline.">
<meta name="twitter:image" content="https://sarachdatabear-polar.github.io/hsk_game/assets/og-image.png">
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/social-meta.test.js`
Expected: PASS. (Task 3 lands the actual image file.)

- [ ] **Step 5: Commit**

```bash
git add index.html test/social-meta.test.js
git commit -m "feat(launch): social/OG meta so shared links render preview cards"
```

---

### Task 3: OG share image asset (1200×630)

The `og:image` URL from Task 2 needs a real file, or the preview card is blank.

**Files:**
- Create: `assets/og-image.png` (1200×630)
- Modify: `test/asset-manifest.test.js` OR add to `test/social-meta.test.js` an existence assertion

**Interfaces:**
- Consumes: nothing. Produces: `assets/og-image.png` referenced by Task 2's tags and staged by `stage-www.js` (already ships `assets/`).

- [ ] **Step 1: Write the failing existence test**

Append to `test/social-meta.test.js`:
```js
import { existsSync, statSync } from "node:fs";
it("og-image asset exists and is non-trivial", () => {
  const p = new URL("../assets/og-image.png", import.meta.url);
  expect(existsSync(p)).toBe(true);
  expect(statSync(p).size).toBeGreaterThan(5000);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/social-meta.test.js`
Expected: FAIL (file missing).

- [ ] **Step 3: Produce the image**

Compose a 1200×630 PNG from the Lucky Cat brand: the PWA icon (`pwa/icons/icon-512.png`) + title "Lucky Cat HSK 招财猫" + the short-desc line, on the `#FBF5E8` theme background. Either a Playwright-chromium screenshot of a one-off HTML card (light-theme, matches app), or Jordan supplies brand art via the art-drop flow. Save to `assets/og-image.png`. Keep it ≤ ~150 KB.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run test/social-meta.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add assets/og-image.png test/social-meta.test.js
git commit -m "feat(launch): 1200x630 OG share image"
```

---

### Task 4: Host the privacy policy at `/privacy.html` + in-app link

Play (later) and a public launch both need a reachable privacy URL. `docs/legal/privacy-policy.md` exists but is served nowhere.

**Files:**
- Create: `privacy.html` (repo root, self-contained, light-theme styled, content from `docs/legal/privacy-policy.md`)
- Modify: `scripts/stage-www.js` (`ITEMS` array — add `"privacy.html"`)
- Modify: `index.html` (add a Privacy Policy link in the settings/more area near the analytics-consent row, ~line 1353)
- Modify: `src/i18n.js` (add `settings.privacy` key, EN + TH)
- Create: `test/privacy-page.test.js`

**Interfaces:**
- Produces: `privacy.html` at deploy root (`/privacy.html`), linked from Settings; staged into `www/` for Capacitor.

- [ ] **Step 1: Write the failing test**

```js
// test/privacy-page.test.js
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

const priv = () => readFileSync(new URL("../privacy.html", import.meta.url), "utf8");
const stage = readFileSync(new URL("../scripts/stage-www.js", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");

describe("hosted privacy policy", () => {
  it("privacy.html exists with real policy content", () => {
    const h = priv();
    expect(h).toContain("Privacy Policy");
    expect(h).toContain("sarach.northbear@gmail.com"); // contact-for-deletion
  });
  it("is staged into www/ by stage-www", () =>
    expect(stage).toContain('"privacy.html"'));
  it("is linked from the app settings screen", () =>
    expect(index).toContain('href="privacy.html"'));
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run test/privacy-page.test.js`
Expected: FAIL (file + wiring absent).

- [ ] **Step 3: Author `privacy.html`**

Self-contained HTML: same `<meta charset/viewport>` + `theme-color #FBF5E8`, an inline `<style>` matching the app's warm light theme, and the full policy body transcribed from `docs/legal/privacy-policy.md` (headings, sections 1–7, contact email, 13+ positioning). Add a comment at top: `<!-- Source of truth: docs/legal/privacy-policy.md — keep in sync -->`.

- [ ] **Step 4: Stage it + link it + i18n**

- In `scripts/stage-www.js`, change `ITEMS` to include `"privacy.html"`:
  ```js
  const ITEMS = ["index.html", "privacy.html", "dist", "data", "audio", "pwa", "sw.js", "assets"];
  ```
- In `index.html`, add near the analytics-consent settings row (~line 1358), a link:
  ```html
  <p class="settings-row-hint"><a href="privacy.html" target="_blank" rel="noopener" data-i18n="settings.privacy">Privacy Policy</a></p>
  ```
- In `src/i18n.js`, add `settings.privacy`: EN `"Privacy Policy"`, TH `"นโยบายความเป็นส่วนตัว"` (queue for native-review confirmation with the other P0 TH copy).

- [ ] **Step 5: Build + run to verify it passes**

Run: `npm run build && npx vitest run test/privacy-page.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add privacy.html scripts/stage-www.js index.html src/i18n.js dist/app.js test/privacy-page.test.js
git commit -m "feat(launch): host /privacy.html + link from settings (EN/TH)"
```

- [ ] **Step 7: Post-deploy verification (after the freeze release cut, Task 7)**

After deploy: `curl -sI https://sarachdatabear-polar.github.io/hsk_game/privacy.html` returns `200`. If Pages serves from repo root rather than `www/`, `privacy.html` at root already covers it; confirm the live 200 either way.

---

### Task 5: Fix audit P0/P1 findings (loop — sized by Task 1)

Templated because the concrete bugs are unknown until Task 1 runs. One finding = one TDD cycle = one commit.

**Files:** per-finding (from the ledger).

**Interfaces:**
- Consumes: `docs/planning/2026-07-26-launch-audit-findings.md`.

- [ ] **Step 1: Triage** — from the ledger, list every P0 (must-fix) and P1 (should-fix). Defer P2s (note them; don't block launch).

- [ ] **Step 2: For each P0, then each P1 — TDD cycle:**
  - Reproduce (screenshot/failing assertion). For logic bugs invoke superpowers:systematic-debugging.
  - Write a failing unit test in the owning module's `test/*.test.js` (main.js wiring is untested by design — for pure-logic regressions add the test to the pure helper; for canvas/DOM-only issues, verify via the chromium probe and note it).
  - Minimal fix in `src/`; `npm run build`.
  - `npm test` green (no exit-code masking).
  - Commit: `git commit -m "fix(launch): <finding-id> <summary>"`.

- [ ] **Step 3: Re-run the responsive/screenshot sweep** (Task 1 steps 2–3) to confirm no regressions and that each P0/P1 is visually resolved. Update the ledger's status column.

---

### Task 6: Native Thai P0 handoff package (owner-gated)

Not code — a clean handoff so a Thai reviewer can turn P0 copy fast. App already ships TH, so this is a quality gate, not a launch blocker.

**Files:**
- Modify/create: `docs/i18n/i18n-translation-review.md` (ensure the P0 subset — money / account-loss / cloud-backup / notification copy, plus the new `settings.privacy`) is at the top with exact keys + current EN/TH + a blank "reviewed" column.

- [ ] **Step 1** — Extract the P0 key subset from `src/i18n.js` into the review doc with `key | EN | current TH | reviewed TH | ok?` rows.
- [ ] **Step 2** — Add a one-paragraph instruction block (edit `src/i18n.js` or return key/value corrections + name/date/commit for sign-off).
- [ ] **Step 3** — Commit: `git commit -m "docs(i18n): P0 Thai review handoff for launch (incl. settings.privacy)"`. Hand the doc to Jordan's reviewer. Merge returned fixes before the Fri 24 freeze if available; otherwise launch on current TH and fast-follow.

---

### Task 7: Freeze — final release cut + live verification (Fri 24)

Everything above merged to `development`, then one clean release cut to `main`.

- [ ] **Step 1** — On `development`: full green gate `npm ci && npm test && npm run build && npm run lint && npm run assets:validate` (no masking).
- [ ] **Step 2** — Bump `CACHE_VERSION` in `sw.js` to the next `vNN`; update the sw-precache test pin if present; commit.
- [ ] **Step 3** — **Get Jordan's explicit "ship."** Then cut:
  ```bash
  git checkout main && git pull && git merge --no-ff development -m "Release vNN: public PWA launch readiness (audit fixes, social meta, hosted privacy)"
  git push origin main
  ```
- [ ] **Step 4** — Gate on the deploy: `gh run watch <run-id> --exit-status`.
- [ ] **Step 5** — Live-verify:
  ```bash
  curl -s https://sarachdatabear-polar.github.io/hsk_game/sw.js | grep CACHE_VERSION   # new vNN
  curl -sI https://sarachdatabear-polar.github.io/hsk_game/privacy.html                # 200
  ```
  Confirm a shared link preview renders (paste into a link-preview checker or a chat). Update `docs/STATUS.md`.
- [ ] **Step 6 (Sat 25)** — Soak only: no code changes; merge Thai P0 if returned (re-cut only if it lands, else it fast-follows). **Sun 26 = announce.**

---

## Appendix — Track 2: Play production groundwork (owner, off critical path, parallel)

Non-code owner actions; the session refreshes docs but cannot execute these. Full detail in `docs/owner/v85-android-release-prep.md` and `docs/OWNER-ACTIONS.md` (refresh v85→v91 text).

- [ ] **Start D-U-N-S / org-account registration today** — the long pole. Requires a registered business entity (CONFIRM C2). Verify current status via dnb.com/duns-number/lookup.html.
- [ ] Build the signed v91 AAB on Windows (keystore-bound; `versionCode`/`versionName` scheme per prep doc §1).
- [ ] Run the emulator/physical-device acceptance matrix.
- [ ] Complete the IARC content-rating questionnaire + Data Safety form (drafted in prep doc §3–§4; the hosted `/privacy.html` from Task 4 supplies the required privacy URL).
- [ ] Upload AAB to production once the org account clears. **No guaranteed date** — Sept+ if the entity/D-U-N-S is new.

---

## Self-review notes

- **Spec coverage:** Track 1 items 1.1–1.5 → Tasks 1,5 (audit+fix), 2+3 (social), 4 (privacy), 6 (Thai). Freeze → Task 7. Track 2 → Appendix. C1/C2 carried as Global Constraint / Appendix CONFIRMs.
- **Placeholder scan:** Task 5 is intentionally templated (bugs unknown pre-audit) — it carries a concrete TDD procedure, not a "TODO". Task 3 image content depends on brand-art choice (screenshot-card vs art-drop) — both paths specified.
- **Type/name consistency:** `assets/og-image.png`, `settings.privacy`, `"privacy.html"` in `ITEMS`, `CACHE_VERSION` used consistently across tasks.
