# Battle Screen Mobile Fit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the battle screen read correctly on phones: bigger hanzi/word card, bigger cat & raccoon, and answer buttons that stop ballooning and stealing canvas space.

**Architecture:** The battle canvas derives every drawing size from one scale `S = clamp(min(h/480, w/380), 0.7, 1.8)` (`src/layout.js`). On height-bound canvases S collapses to its 0.7 floor, dragging the hanzi down to 42px (PRD floor is 56px) and the mascots to ~34px. Fix by splitting one scale into three concerns: `textS` (width-driven, for the word plaque), `mascotS` (S with a higher floor and a 1.2× boost, for the cat/raccoon), and the existing `S` (scene geometry, HUD, floaters — unchanged). Separately, cap answer-button height in CSS so a long gloss can't inflate the `grid-auto-rows:1fr` grid to 149px and squeeze the canvas.

**Tech Stack:** Vanilla JS ES modules (esbuild bundle), vitest, Playwright-chromium probe harness (`scripts/responsive-sweep.mjs`).

## Global Constraints

- Repo: `/root/work/HSK/game`, branch off `development` (e.g. `fix/battle-mobile-fit`). Never stage `game/` from the root repo.
- After changing `src/`, run `npm run build` — the served app uses `dist/app.js`.
- `npm test` must be run without piping (capture the real exit code): `npm test > /tmp/t.txt 2>&1; echo EXIT=$?`.
- Sweep needs a server: `(python3 -m http.server 8000 >/dev/null 2>&1 &)` from the repo root (`npm run serve` calls `python`, not on PATH on the VPS). Node via `. ~/.nvm/nvm.sh`.
- `sw.js` SHELL bump (v47→v48) happens only at release-cut time, not in this plan's commits.
- Measured baselines (2026-07-09 probe, for reference): canvas 336×278 at 360×640 → S=0.7, hanzi 42px; buttons 112px tall at 360×640, 149px at 412×915, 74px at 390×844; cat drawn at `0.9*S` ≈ 34px-scale at S=0.7.
- PRD floor (encoded in `layout.js` comment): hanzi ≥ 56 CSS px at a 390-wide viewport.

## File Structure

- `src/layout.js` — owns all three scales; only file where scale formulas live.
- `test/layout.test.js` — unit tests for the scales (extend, don't rewrite).
- `src/main.js` — draw-loop call sites switch to the new scale fields; no formula logic here.
- `index.html` — base `#opts button` cap + `.opt-label` clamp (CSS only).
- `scripts/responsive-sweep.mjs` — two new permanent gates (hanzi floor, button cap).

---

### Task 1: Sweep gates first (they must FAIL against today's code)

**Files:**
- Modify: `scripts/responsive-sweep.mjs` (probeBattle ~line 155–200, runFullSweep failure block ~line 336)

**Interfaces:**
- Consumes: `layout(w, h)` from `../src/layout.js` (existing export; Task 2 changes its fields but not its signature).
- Produces: failure strings `battle hanzi=…<…` and `battle opt-height=…>142` that later tasks turn green.

- [ ] **Step 1: Add the gates**

At the top of `scripts/responsive-sweep.mjs` add:

```js
import { layout } from "../src/layout.js";
```

In `probeBattle` (the in-page function that already returns `optBtnCount`), also return per-button heights:

```js
optHeights: [...document.querySelectorAll("#opts button")].map(b => Math.round(b.getBoundingClientRect().height)),
```

In `runFullSweep`, after `battleInfo` is collected, measure the canvas and compute the layout the app will use:

```js
const cvRect = await page.evaluate(() => {
  const r = document.querySelector("#cv").getBoundingClientRect();
  return { w: r.width, h: r.height };
});
const L = layout(cvRect.w, cvRect.h);
```

In the failures block add:

```js
const hanziFloor = cvRect.w >= 360 ? 56 : 48;
if (L.hanziPx < hanziFloor)
  failures.push(`battle hanzi=${L.hanziPx.toFixed(1)}<${hanziFloor} (cv ${Math.round(cvRect.w)}x${Math.round(cvRect.h)})`);
const maxOpt = battleInfo.optHeights.length ? Math.max(...battleInfo.optHeights) : 0;
if (maxOpt > 142) failures.push(`battle opt-height=${maxOpt}>142`);
```

- [ ] **Step 2: Run the sweep and verify the new gates FAIL**

Run: `node scripts/responsive-sweep.mjs`
Expected: exit 1; at least `s-360` and `se-320` fail with `battle hanzi=42.0<…`; `andr-412` fails with `battle opt-height=149>142` (opt heights vary a little with the random word — anything >142 counts).

- [ ] **Step 3: Commit**

```bash
git add scripts/responsive-sweep.mjs
git commit -m "test(sweep): gate battle hanzi size and answer-button height (red)"
```

---

### Task 2: `layout.js` — three scales instead of one

**Files:**
- Modify: `src/layout.js`
- Test: `test/layout.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `layout(w, h)` returns the existing fields plus `textS` (number) and `mascotS` (number); `hanziPx`/`pinyinPx` now derive from `textS`; `catHalf` now derives from `mascotS`; `mascotPx` is REMOVED (verified unused by the draw loop — only the old test referenced it).

- [ ] **Step 1: Write the failing tests**

Append to `test/layout.test.js` (and delete the `mascotPx` assertion from the existing "derived fields" test):

```js
describe("textS / mascotS (battle-mobile-fit)", () => {
  it("textS is width-driven at phone sizes (not dragged down by a short canvas)", () => {
    // 360x640 viewport -> canvas ~336x278: old S bottomed out at 0.7 (hanzi 42px)
    const L = layout(336, 278);
    expect(L.textS).toBeCloseTo(336 / 380, 5);
    expect(L.hanziPx).toBeGreaterThanOrEqual(56);   // 64 * 336/380 = 56.59
  });
  it("textS has a height guard so the plaque can't outgrow very short canvases", () => {
    expect(layout(380, 130).textS).toBe(0.72);      // min(1, 0.5) -> clamped to floor
  });
  it("textS clamps to [0.72, 1.8]", () => {
    expect(layout(100, 100).textS).toBe(0.72);
    expect(layout(2000, 2000).textS).toBe(1.8);
  });
  it("hanziPx and pinyinPx derive from textS", () => {
    const L = layout(380, 480);                     // textS = 1
    expect(L.hanziPx).toBe(64);
    expect(L.pinyinPx).toBe(18);
  });
  it("mascotS boosts the scene scale 1.2x with a 0.85 floor", () => {
    expect(layout(380, 480).mascotS).toBeCloseTo(1.2, 5);        // S=1
    expect(layout(336, 278).mascotS).toBeCloseTo(0.85 * 1.2, 5); // S=0.7 -> floored
    expect(layout(2000, 2000).mascotS).toBe(2.1);                // ceiling
  });
  it("catHalf follows mascotS so the bite threshold matches the bigger sprite", () => {
    expect(layout(380, 480).catHalf).toBeCloseTo(34 * 1.2, 5);
  });
  it("mascotPx is gone (was dead — draw loop never read it)", () => {
    expect(layout(380, 480).mascotPx).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/layout.test.js`
Expected: FAIL — `textS`/`mascotS` undefined, `hanziPx` 42 vs ≥56, old `mascotPx` assertion removed but new one passes trivially only after impl.

- [ ] **Step 3: Implement**

Replace the `layout` function body in `src/layout.js` (keep `uiScale` exactly as is):

```js
/* Three scales, one per concern:
   - S       scene geometry (ground, positions, HUD text, floaters) — unchanged.
   - textS   word plaque (hanzi/pinyin/translation). Width-driven so a short
             canvas no longer shrinks the hanzi: at a 360-wide viewport the
             old min(h/480, w/380) bottomed out at the 0.7 floor -> 42px hanzi,
             failing the PRD "hanzi >= 56 CSS px at 390-wide" spirit on the
             most common Android width. h/260 is only a guard so the plaque
             (~2.05*hanziPx tall with both translation rows) can't outgrow a
             very short canvas.
   - mascotS S with a 0.85 floor and a 1.2x boost: the cat/raccoon read as
             the protagonists, not garnish, on every phone size. catHalf
             (bite threshold, kitten offset) follows it so gameplay geometry
             matches the visible sprite. */
export function layout(w, h) {
  const S = uiScale(w, h);
  const textS = Math.max(0.72, Math.min(1.8, Math.min(w / 380, h / 260)));
  const mascotS = Math.min(2.1, Math.max(S, 0.85) * 1.2);
  return {
    S,
    textS,
    mascotS,
    ground: 30 * S,
    mascotX: 52 * S,
    catHalf: 34 * mascotS,
    hanziPx: 64 * textS,
    pinyinPx: 18 * textS,
    floaterPx: 20 * S,
    coinPx: 20 * S
  };
}
```

Also update the module's top comment ("Battle-canvas UI scale…") to mention the three scales.

- [ ] **Step 4: Run tests**

Run: `npx vitest run test/layout.test.js`
Expected: PASS (all, including the untouched `uiScale` describe block).

- [ ] **Step 5: Commit**

```bash
git add src/layout.js test/layout.test.js
git commit -m "feat(layout): width-driven textS + boosted mascotS scales"
```

---

### Task 3: `main.js` — word plaque draws at `textS`

**Files:**
- Modify: `src/main.js` — only inside `drawWordPlate` (the function starting near line 1575 containing `B.plaqueRect` assignment and the `ui-word-plaque` nine-slice; it spans roughly lines 1575–1700)

**Interfaces:**
- Consumes: `B.L.textS`, `B.L.hanziPx`, `B.L.pinyinPx` from Task 2.
- Produces: nothing new for later tasks; visual change only (main.js wiring is untested by design — Task 1's sweep gate + Task 6's screenshots are the verification).

- [ ] **Step 1: Switch the plaque's metrics from `B.S` to `textS`**

At the top of `drawWordPlate`, add:

```js
const T = B.L.textS;   // plaque metrics scale with the width-driven text scale
```

Then, **within this function only**, replace every `B.S` with `T`. That covers (verify each — this is the complete list as of today): `74*B.S` (min text width), `spkR = 12*B.S`, `lw`'s `24*B.S` and `56*B.S`, `padV = 10*B.S`, `pinyinH = 22*B.S`, `transH = (showSub ? 40 : 24) * B.S`, the nine-slice `di = Math.min(20*B.S, …)`, all vector-fallback constants (`12*B.S`, `4*B.S`, `14*B.S`, `2.6*B.S`, `1.3*B.S`, `13*B.S`, `1.2*B.S`, `6*B.S`, `9*B.S`, `1.8*B.S`, `tk = 5*B.S`, `ti = 10*B.S`), the translation fonts `15*B.S` and `13*B.S`, and the dashed-placeholder constants after the `revealed` branch. Do NOT touch `wy = Math.round(B.h * 0.36)` (position, not size) and do not touch anything outside `drawWordPlate` (floaters at `B.L.floaterPx`, HUD, coin all stay on `S`).

`hanziH = B.L.hanziPx * 1.05` and the two `fontString(*, B.L.hanziPx/pinyinPx, …)` calls need no edit — they follow Task 2 automatically.

- [ ] **Step 2: Build and eyeball**

Run: `npm run build` then `(python3 -m http.server 8000 >/dev/null 2>&1 &)` and screenshot a battle at 360×640 (reuse the probe pattern from Task 6 Step 1 if handy).
Expected: hanzi visibly larger (~57px vs 42px); plaque still clears the mascots at the bottom of the canvas.

- [ ] **Step 3: Run unit tests (regression only)**

Run: `npm test > /tmp/t.txt 2>&1; echo EXIT=$?; tail -3 /tmp/t.txt`
Expected: EXIT=0, 1416+ tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/main.js dist/app.js
git commit -m "feat(battle): word plaque scales with width-driven textS"
```

---

### Task 4: `main.js` — mascots draw at `mascotS`

**Files:**
- Modify: `src/main.js:1476-1477` (cat + kitten), `src/main.js:1498-1499` (raccoon scale), `src/main.js:1508` (HP bar)

**Interfaces:**
- Consumes: `B.L.mascotS`, `B.L.catHalf` from Task 2 (`catHalf` call sites at lines 1238/1352/1356/1477 need no edit — the field itself grew).
- Produces: visual change only.

- [ ] **Step 1: Switch the four draw calls**

```js
// line ~1476-1477 — was .9*B.S and 0.5*B.S
drawCat(ctx, B.L.mascotX, gy + 6*B.S, now, playerState, SKIN_PALETTES[shopState.skin], .9*B.L.mascotS, B.acc, false);
if(B.hasKitten) drawCat(ctx, B.L.mascotX - B.L.catHalf, gy + 6*B.S, now + 250, playerState, SKIN_PALETTES[shopState.skin], 0.5*B.L.mascotS, [], false);
```

```js
// line ~1498 — was z.boss ? 1.5*B.S : B.S
const rScale = z.boss ? 1.5*B.L.mascotS : B.L.mascotS;
```

```js
// line ~1508 — bar width was 46*B.S, stroke scale was B.S
drawHpBar(ctx, z.x, gy + 6*B.S - RACCOON_HEIGHT*rScale, 46*B.L.mascotS, hpFrac, B.L.mascotS);
```

Leave `gy + 6*B.S` offsets and `B.L.mascotX` alone (positions stay on scene scale). Leave the shop/street `drawCat` calls at lines ~2146/2258 alone (fixed preview scales). Gameplay note for the commit message: `biteX = mascotX + catHalf` grows ~7 CSS px at S=1, so the raccoon is caught marginally earlier — imperceptible at walk speed, and the threshold now matches the visible sprite edge.

- [ ] **Step 2: Build, screenshot 390×844 battle, eyeball**

Run: `npm run build`, re-screenshot.
Expected: cat/raccoon ~20% larger at 390 (net cat scale 1.08 vs 0.9), ~40% larger at 360×640 (1.02·0.9 vs 0.63); HP bar rides above the bigger raccoon, not inside it.

- [ ] **Step 3: Run unit tests**

Run: `npm test > /tmp/t.txt 2>&1; echo EXIT=$?; tail -3 /tmp/t.txt`
Expected: EXIT=0.

- [ ] **Step 4: Commit**

```bash
git add src/main.js dist/app.js
git commit -m "feat(battle): mascots draw at boosted mascotS; bite threshold follows sprite"
```

---

### Task 5: `index.html` — answer buttons stop ballooning

**Files:**
- Modify: `index.html` — the base `#opts button` rule (~line 310) and a new base `.opt-label` rule right after it

**Interfaces:**
- Consumes: `.opt-label` span markup (always present — `main.js:1048` renders `<span class="opt-label">…</span>`).
- Produces: rows ≤ ~140px on every viewport, turning Task 1's `opt-height` gate green and handing the freed height to `.cv-wrap{flex:1}` (canvas grows).

- [ ] **Step 1: Add the base cap + clamp**

In the base `#opts button` rule add one declaration: `max-height:140px;` (backstop; with the clamp below, real content tops out around 118–137px, so centering is preserved and the cap almost never crops).

Immediately after that rule, add (mirrors the existing ≤700px-tier pattern at line ~371 with the same rationale comment style):

```css
/* Base-tier gloss clamp: grid-auto-rows:1fr sizes ALL four buttons to the
   tallest one, so a single rare 4-5 line gloss inflated every row to ~150px
   on tall phones (412x915 measured 149px), squeezing the canvas above it.
   Clamp the label to 3 lines at every size — the ≤700px tiers below override
   with their tighter caps via source order, exactly as before. */
#opts button .opt-label{display:-webkit-box; -webkit-box-orient:vertical;
  -webkit-line-clamp:3; overflow:hidden; width:100%;}
```

Do not touch the ≤700px and ≤620px tier blocks (they still win below 700px by source order) or the landscape block.

- [ ] **Step 2: Rebuild + spot-check the tall-phone case**

Run: `npm run build`; screenshot battle at 412×915.
Expected: all four buttons equal height ≤ ~140px; canvas visibly taller than the 480px baseline.

- [ ] **Step 3: Run unit tests**

Run: `npm test > /tmp/t.txt 2>&1; echo EXIT=$?; tail -3 /tmp/t.txt`
Expected: EXIT=0 (no test reads this CSS, but the run gates the commit).

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "fix(battle): clamp answer-button height so long glosses stop squeezing the canvas"
```

---

### Task 6: Full verification + screenshots + PR

**Files:**
- No new edits (fix-forward only if a gate fails).

**Interfaces:**
- Consumes: everything above.
- Produces: green sweep (incl. Task 1 gates), screenshot evidence, PR to `development`.

- [ ] **Step 1: Screenshot matrix**

Screenshot battle at 320×568, 360×640, 390×844, 412×915 (probe pattern: launch playwright-core chromium from `~/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome`, `addInitScript` setting `nbhsk.introDone=true` + `nbhsk.locale='"en"'`, click `#home-start`, wait 900ms, screenshot). Eyeball each: hanzi prominent, plaque clear of mascots, mascots read as characters, no button crop of ordinary 1–2 line answers, ✓/✕ reveal affixes still visible.

- [ ] **Step 2: Full gates**

Run: `npm test > /tmp/t.txt 2>&1; echo EXIT=$?; tail -3 /tmp/t.txt` → EXIT=0.
Run: `node scripts/responsive-sweep.mjs` → **10/10, exit 0** (hanzi + opt-height gates now green; run twice for stability).

- [ ] **Step 3: PR**

```bash
git push -u origin fix/battle-mobile-fit
gh pr create --base development --title "fix(battle): mobile fit — bigger hanzi & mascots, capped answer buttons" \
  --body "textS/mascotS split in layout.js; plaque + mascots rescaled; base gloss clamp; 2 new sweep gates. Pre-fix gates: red on s-360/se-320/andr-412. Post: 10/10. SHELL bump owed at release."
```

Do **not** self-merge; Jordan merges. SHELL v47→v48 at the release cut.

---

## Self-Review (done at planning time)

- **Spec coverage:** hanzi too small → Tasks 2+3; screen "not fit" (proportions/squeeze) → Tasks 5 (+3 plaque scale); mascots small → Task 4; regression protection → Tasks 1+6. ✓
- **Numbers checked:** hanzi 42→56.6px at 360×640, 58→61.6 at 390×844, 42→50.5 at 320×568 (gate floor 48 below 360-wide canvases is deliberate); buttons 149→~118 typical / 140 cap; plaque height ≈2.05×hanziPx fits every sweep viewport (h/260 guard covers the ≤620 short tier, where a small plaque/mascot overlap pre-exists today and does not worsen by more than ~3px).
- **Type consistency:** `textS`/`mascotS`/`catHalf` names match across Tasks 1, 2, 3, 4. `mascotPx` removed in Task 2 and not referenced by any later task. ✓
- **Placeholder scan:** every code step has literal code; no TBDs. ✓
