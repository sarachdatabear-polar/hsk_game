# Responsive All-Devices Round — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the game fully usable — no clipped controls, no mid-round scrolling — on every phone/tablet/desktop viewport, and add a repeatable viewport regression sweep.

**Architecture:** CSS-only layout fixes inside `index.html`'s inline style block (height/orientation media queries; the flex system and `layout.js` canvas scaling already adapt), plus a permanent probe script in `scripts/`. No JS logic changes, no new deps.

**Run after:** the v7 Shop Seasons PR merges to `development`. Branch `fix/responsive-all-devices` off `development`.

## Audit baseline (2026-07-07 sweep, 10 viewports, script now at `.superpowers/sdd/responsive-sweep.mjs`)

Already GOOD (verified — do not "fix"):
- Zero horizontal overflow on every viewport tested (320→1280 wide), all screens (home/shop/battle).
- `#app` fluid column, `max-width:520px`, centered; `100dvh` fallback chain; `env(safe-area-inset-*)` padding; `viewport-fit=cover` (notches handled).
- Battle canvas is ratio-free: draw loop scales off measured size (`layout.js` `uiScale`, clamped 0.7–1.8), hanzi ≥56px floor holds at 390-wide.
- Tap targets ≥36px everywhere probed; START in-fold on all portrait, tablet, desktop sizes.
- Canvases DPR-scale (crisp on high-density screens).

FAILING (the work):
1. **Short viewports (320×568 SE-class; any height ≲600):** battle's second answer row clips below the fold (probe: 3 elements clipped, row bottom 586 > 568) — cause: `.cv-wrap{min-height:260px}` + HUD + 2×~99px answer rows exceed the height budget.
2. **Landscape phones (844×390, 640×360):** battle screen is taller than the viewport — the plaque/canvas scroll off-screen while answering (pause button probed at y≈−196), and on home the START button sits below the fold.

## Global Constraints (inherited, binding)

- Markup/CSS inline in `index.html`; no new npm deps; `file://` keeps working.
- `npm test` green (DOM-id checks); `npm run build`; SHELL cache bump rides the release commit.
- All-CSS where possible; JS only if a layout truly cannot be expressed in CSS.
- Commits end with the Co-Authored-By trailer.

---

### Task 1: Short-viewport battle fit (≤620px tall)

**Files:**
- Modify: `index.html` (style block only)

- [ ] **Step 1: Reproduce (red).** Run the probe: `(python -m http.server 8000 &)` then `node scripts/responsive-sweep.mjs --battle 320x568` (after Task 3 lands the script; until then copy `.superpowers/sdd/resp-battle-probe.mjs`). Expected: `clippedBelow: 3`.

- [ ] **Step 2: Add a height media query** next to the existing `.cv-wrap` rule in `index.html`:

```css
  /* Short screens (SE-class, landscape handled separately): shrink the canvas
     floor and tighten the answer grid so HUD + canvas + 2x2 answers fit the
     height budget with no scrolling mid-round. */
  @media (max-height: 620px) and (orientation: portrait){
    .cv-wrap{min-height:180px;}
    #s-battle{padding:6px 10px 8px;}
    #s-battle .answers button, #answers button{padding-top:8px; padding-bottom:8px; min-height:64px;}
  }
```

(Adjust the button selector to the real one — check the answer-grid CSS class in the style block; the values above target ~99px→~72px rows. Keep hanzi/pinyin sizes untouched — the canvas scales itself.)

- [ ] **Step 3: Verify (green).** Probe again at 320×568 AND 360×640: `clippedBelow: 0`, all four answer buttons fully inside the viewport, canvas ≥160px tall. Screenshot both; eyeball that the word plaque is still readable.

- [ ] **Step 4: Commit** (`fix(responsive): battle fits short viewports without scrolling`).

### Task 2: Landscape phone layout

**Files:**
- Modify: `index.html` (style block only)

- [ ] **Step 1: Reproduce.** Probe at 844×390 and 640×360: battle scrolls (elements at negative y after auto-scroll), home START below fold.

- [ ] **Step 2: Add a landscape media query.** Battle goes side-by-side — canvas+HUD left, answer grid right; home becomes a two-column flow so START is reachable without scrolling:

```css
  /* Landscape phones: height is the scarce axis. Battle: canvas left, answers
     right. Home: hero shrinks so START stays in the fold. */
  @media (orientation: landscape) and (max-height: 500px){
    #app{max-width:100%;}
    #s-battle{display:flex; flex-wrap:wrap; align-items:stretch; gap:8px;}
    #s-battle .hud{flex:1 1 100%;}
    .cv-wrap{flex:1 1 46%; min-height:0;}
    #s-battle .answers{flex:1 1 46%; display:grid; grid-template-columns:1fr 1fr; align-content:stretch; gap:8px;}
    #s-battle .answers button{min-height:0;}
    /* home: shrink hero art + vertical paddings so status strip->START fits */
    .hero, #home-hero{max-height:28vh;}
  }
```

(Selectors are indicative — Step 2's first action is reading the actual hud/answers/hero class names in the style block and adapting. The structural intent is binding: battle = HUD full-width strip, canvas and 2×2 grid side by side, zero vertical scroll during a round.)

- [ ] **Step 3: Verify.** Probe 844×390 + 640×360: battle `clippedBelow: 0`, no element at negative y without user scroll, all 4 answers ≥44px tall and visible together with the word plaque; home probe: START `in-fold`. Screenshot both and eyeball.

- [ ] **Step 4: Commit** (`fix(responsive): landscape phone battle + home layouts`).

### Task 3: Permanent viewport regression harness

**Files:**
- Create: `scripts/responsive-sweep.mjs` (promote `.superpowers/sdd/responsive-sweep.mjs` + the battle probe merged, cleaned: viewport list, per-screen overflow/clip/tap-size checks, `--battle WxH` single-shot mode; exits 1 on any failure)
- Modify: `docs/planning/V2-EXECUTION-PLAN.md` (one line documenting the sweep in the release checklist)

- [ ] **Step 1:** Merge the two probe scripts into `scripts/responsive-sweep.mjs`; viewports: 320×568, 344×882, 360×640, 360×800, 390×844, 412×915, 640×360, 844×390, 768×1024, 1280×800; checks per screen (home/shop/battle): `scrollWidth` overflow, elements past right/left edge, clipped-below count in battle, START in-fold (portrait only), tap targets ≥36px, zero pageerrors.
- [ ] **Step 2:** Run full sweep — all viewports pass (Tasks 1–2 landed).
- [ ] **Step 3:** Add to the release checklist in `V2-EXECUTION-PLAN.md`: "run `node scripts/responsive-sweep.mjs` (needs `npm i --no-save playwright-core` + Edge) before each release PR".
- [ ] **Step 4:** Commit (`test(responsive): permanent viewport sweep harness`).

### Task 4: Ship

- [ ] `npm test` green; `npm run build`; commit rebuilt `dist/app.js`; bump `SHELL` (v30 → next free); PR to `development` with before/after screenshots at 320×568 and 844×390.

## Out of scope (recorded, not built)

- Tablet/desktop "wide" layouts beyond the centered 520px column — deliberate design, works today.
- Android system font-scale audit (needs a real device; add to the manual device checklist).
- Street-screen visual crowding — separate street-restyle round (already filed).
