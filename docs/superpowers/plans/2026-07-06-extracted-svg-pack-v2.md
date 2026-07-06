# Extracted SVG Pack v2 Production Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the extracted SVG pack (`assets/_plan/extracted/`) into the live game: restyled button/tag/progress/badge/fx surfaces in their existing slots, new panel/plaque/start/danger surfaces, tile-style icon buttons, and orb answer-feedback bursts in the battle canvas.

**Architecture:** All DOM surfaces load through the existing manifest-driven loader (`src/assets.js` → 9-slice `border-image` CSS vars `--f-<id>` + `has-<id>` root classes, feature-detected so file:// fallbacks survive). All canvas art loads through `src/sprites.js` (`sprite()` returns null until loaded; every draw site keeps its vector fallback). No new fetch paths.

**Tech Stack:** Vanilla JS ES modules, esbuild bundle, vitest, hand-edited SVG.

**Spec:** `docs/superpowers/specs/2026-07-06-extracted-svg-pack-integration-design.md`

## Global Constraints

- Work in the `game/` repo only, on branch `feature/extracted-svg-pack-v2` (exists, based on current `development`). Never stage `game/` from the root repo.
- **Do NOT commit** `data/words.js`, `data/words.json`, or the `SHELL` version line of `sw.js` — those working-tree modifications belong to another in-flight session (backup exists in `git stash list`: "in-flight word refresh + shell bump"). Task 7 has an exact procedure for committing `sw.js` precache changes without the version line.
- No baked text in shipped assets: strip `<text>` from `ui-button-start`, `ui-tag-hsk` ("HSK 2"), `fx-critical` ("CRITICAL!"). Labels are live DOM/canvas text.
- Only `priority: "P0"` manifest assets ever load (`preload()` filters on it) — every surface this plan wires must be P0.
- Run all commands from `game/` (`C:\Users\sarac\Desktop\HSK\game`). Tests: `npm test` (vitest run). Build: `npm run build`.
- Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- One deliberate deviation from the spec's icon section, decided during planning: the game already has an `.icon-btn` component whose glyphs come from the flat `ui-icons.svg` sprite, and the 12 baked tiles cover only ~half of the current icon slots (no help/target/flashcards/collection tiles). So we ship ONE `ui-icon-tile.svg` chrome surface (the pack's green rounded-square + sheen, no glyph) applied to every `.icon-btn`, keeping the existing cream-tinted glyphs on top. Same visual as the pack, full slot coverage, i18n-safe. The 12 individual tiles stay in `_plan/extracted/` (tracked in git) as source.

---

### Task 1: Promote and sanitize the SVG files

**Files:**
- Create (from `assets/_plan/extracted/`, some edited): `assets/ui-button-primary.svg`, `assets/ui-button-secondary.svg`, `assets/ui-button-neutral.svg`, `assets/ui-button-neutral-disabled.svg`, `assets/ui-button-danger.svg`, `assets/ui-button-start.svg`, `assets/ui-tag.svg`, `assets/ui-badge-mastery.svg`, `assets/ui-panel.svg`, `assets/ui-word-plaque.svg`, `assets/ui-icon-tile.svg`, `assets/ui-progress-track.svg`, `assets/ui-progress-fill.svg`, `assets/fx-correct.svg`, `assets/fx-wrong.svg`, `assets/fx-critical.svg`, `assets/vfx-orb-green.svg`, `assets/vfx-orb-red.svg`, `assets/vfx-orb-blue.svg`, `assets/vfx-orb-gold.svg`
- Test: `test/asset-files.test.js` (new)

**Interfaces:**
- Produces: the 20 files above under `assets/` — later tasks reference them by these exact names.

- [ ] **Step 1: Write the failing test**

Create `test/asset-files.test.js`:

```js
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");

// Every SVG the extracted-pack integration ships. Baked text is forbidden:
// the UI is trilingual with a live language toggle, so labels must stay live text.
const PACK_SVGS = [
  "ui-button-primary.svg", "ui-button-secondary.svg", "ui-button-neutral.svg",
  "ui-button-neutral-disabled.svg", "ui-button-danger.svg", "ui-button-start.svg",
  "ui-tag.svg", "ui-badge-mastery.svg", "ui-panel.svg", "ui-word-plaque.svg",
  "ui-icon-tile.svg", "ui-progress-track.svg", "ui-progress-fill.svg",
  "fx-correct.svg", "fx-wrong.svg", "fx-critical.svg",
  "vfx-orb-green.svg", "vfx-orb-red.svg", "vfx-orb-blue.svg", "vfx-orb-gold.svg",
];

describe("extracted-pack production assets", () => {
  for (const file of PACK_SVGS) {
    it(`${file} exists and has no baked <text>`, () => {
      const path = join(ASSETS, file);
      expect(existsSync(path), `${file} missing from assets/`).toBe(true);
      const svg = readFileSync(path, "utf8");
      expect(svg).toContain("<svg");
      expect(svg, `${file} contains baked text`).not.toMatch(/<text[\s>]/);
    });
  }

  it("progress fill spans the full canvas width so border-image stretch works", () => {
    const svg = readFileSync(join(ASSETS, "ui-progress-fill.svg"), "utf8");
    expect(svg).toMatch(/width="400"/);
    expect(svg).not.toMatch(/width="289\.5"/); // the baked partial fill from the source file
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/asset-files.test.js`
Expected: FAIL — files like `ui-button-neutral-disabled.svg`, `ui-panel.svg`, `vfx-orb-*.svg` missing; existing `fx-critical.svg` may pass or fail, ordering doesn't matter as long as the suite is red.

- [ ] **Step 3: Copy the straight promotions**

From `game/`:

```bash
E=assets/_plan/extracted
cp $E/ui/ui-button-primary.svg    assets/ui-button-primary.svg
cp $E/ui/ui-button-secondary.svg  assets/ui-button-secondary.svg
cp $E/ui/ui-button-neutral.svg    assets/ui-button-neutral.svg
cp $E/ui/ui-button-disabled.svg   assets/ui-button-neutral-disabled.svg
cp $E/ui/ui-button-danger.svg     assets/ui-button-danger.svg
cp $E/ui/ui-badge-paw.svg         assets/ui-badge-mastery.svg
cp $E/ui/ui-panel.svg             assets/ui-panel.svg
cp $E/ui/ui-word-plaque.svg       assets/ui-word-plaque.svg
cp $E/effects/fx-paw-correct.svg  assets/fx-correct.svg
cp $E/effects/fx-paw-wrong.svg    assets/fx-wrong.svg
cp $E/vfx/vfx-orb-green.svg       assets/vfx-orb-green.svg
cp $E/vfx/vfx-orb-red.svg         assets/vfx-orb-red.svg
cp $E/vfx/vfx-orb-blue.svg        assets/vfx-orb-blue.svg
cp $E/vfx/vfx-orb-gold.svg        assets/vfx-orb-gold.svg
```

(`ui-button-neutral-disabled.svg` is the loader's state-file convention: `assets.js stateFile()` maps state `disabled` of `ui-button-neutral` to that name.)

- [ ] **Step 4: Write the text-stripped ui-button-start.svg**

Copy `$E/ui/ui-button-start.svg` to `assets/ui-button-start.svg`, then delete the entire `<text …>START</text>` element (everything from `<text x="190"` through `</text>`). Resulting file is the gold plaque only: defs (gold/rim gradients, drop filter), outer rim rect, gold face rect, sheen rect, notched inset frame path.

- [ ] **Step 5: Write the text-stripped ui-tag.svg**

Create `assets/ui-tag.svg` (from `$E/ui/ui-tag-hsk.svg` minus its `<text>` line):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="150" height="64" viewBox="0 0 150 64">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#43A374"/><stop offset="1" stop-color="#256A49"/></linearGradient></defs>
<rect x="2" y="2" width="146" height="60" rx="14" fill="url(#g)" stroke="#1E5A3E" stroke-width="3"/>
<rect x="7" y="6" width="136" height="16" rx="8" fill="#FFFFFF" opacity="0.2"/>
</svg>
```

This overwrites the existing `assets/ui-tag.svg`.

- [ ] **Step 6: Write the text-stripped fx-critical.svg**

Copy `$E/effects/fx-critical.svg` to `assets/fx-critical.svg` (overwrite), then delete BOTH `<text …>CRITICAL!</text>` elements (the white-stroke outline copy and the fill copy). Resulting file: defs (burst radialGradient, drop filter) + the 24-point starburst `<polygon>` only.

- [ ] **Step 7: Split the progress bar into track and fill**

The source `$E/ui/ui-progress-bar.svg` bakes a 289.5px-wide fill (≈73% progress) — shipping it as-is would show phantom progress. Create two files:

`assets/ui-progress-track.svg` (overwrite existing):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="44" viewBox="0 0 400 44">
<rect x="2" y="2" width="396" height="40" rx="20" fill="#EFE3C4" stroke="#C08A1E" stroke-width="3"/>
</svg>
```

`assets/ui-progress-fill.svg` (overwrite existing; fill spans the full width — the live `.mbar i` element's width expresses actual progress):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="44" viewBox="0 0 400 44">
<defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#43A374"/><stop offset="1" stop-color="#256A49"/></linearGradient></defs>
<rect x="0" y="7" width="400" height="30" rx="15" fill="url(#fill)"/>
<rect x="5" y="10" width="390" height="10" rx="5" fill="#FFFFFF" opacity="0.3"/>
</svg>
```

- [ ] **Step 8: Write ui-icon-tile.svg**

Create `assets/ui-icon-tile.svg` — the pack's tile chrome (taken from `icons/icon-home.svg` minus the glyph group):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
<defs><linearGradient id="t" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#43A374"/><stop offset="1" stop-color="#256A49"/></linearGradient></defs>
<rect x="3" y="3" width="90" height="90" rx="22" fill="url(#t)" stroke="#1E5A3E" stroke-width="4"/>
<rect x="9" y="8" width="78" height="22" rx="11" fill="#FFFFFF" opacity="0.18"/>
</svg>
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npx vitest run test/asset-files.test.js`
Expected: PASS (21 tests).

- [ ] **Step 10: Commit**

```bash
git add assets/*.svg test/asset-files.test.js
git commit -m "feat(assets): promote extracted SVG pack v2 to production files

Text-stripped start/tag/critical (no baked labels), progress bar split
into track+fill, icon tile chrome extracted, orbs + plaque + panel added.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Manifest v3 — register new surfaces and geometry

**Files:**
- Modify: `assets/asset-manifest.json`
- Test: `test/assets.test.js` (append a describe block)

**Interfaces:**
- Consumes: files from Task 1.
- Produces: manifest ids `ui-button-danger`, `ui-button-start`, `ui-panel`, `ui-icon-tile`, `ui-word-plaque`, `vfx-orb-green|red|blue|gold`; `ui-button-neutral` gains `"states": ["disabled"]`. CSS vars that will exist at runtime: `--f-ui-button-danger`, `--f-ui-button-start`, `--f-ui-panel`, `--f-ui-icon-tile`, `--f-ui-button-neutral-disabled`, `--f-ui-tag`, `--f-ui-progress-track`, `--f-ui-progress-fill` (Task 5 consumes these names).

- [ ] **Step 1: Write the failing test**

Append to `test/assets.test.js`:

```js
import manifest from "../assets/asset-manifest.json";

describe("extracted pack v2 manifest entries", () => {
  const byId = Object.fromEntries(manifest.assets.map(a => [a.id, a]));

  it("registers the new pack surfaces as loadable P0 ui-surfaces with slices", () => {
    for (const id of ["ui-button-danger", "ui-button-start", "ui-panel", "ui-icon-tile"]) {
      const a = byId[id];
      expect(a, `${id} missing`).toBeTruthy();
      expect(a.type).toBe("ui-surface");
      expect(a.status).toBe("integrated");
      expect(a.priority).toBe("P0");
      expect(Array.isArray(a.slice) && a.slice.length === 4, `${id} needs a 4-part slice`).toBe(true);
    }
  });

  it("activates tag and progress surfaces (P0 + slice, previously inert)", () => {
    for (const id of ["ui-tag", "ui-progress-track", "ui-progress-fill"]) {
      const a = byId[id];
      expect(a.priority).toBe("P0");
      expect(a.status).toBe("integrated");
      expect(Array.isArray(a.slice)).toBe(true);
    }
  });

  it("gives ui-button-neutral a disabled state", () => {
    expect(byId["ui-button-neutral"].states).toContain("disabled");
  });

  it("registers plaque and orbs (canvas-drawn, no frame slice)", () => {
    expect(byId["ui-word-plaque"]).toMatchObject({ status: "integrated", slice: null });
    for (const c of ["green", "red", "blue", "gold"]) {
      expect(byId[`vfx-orb-${c}`]).toMatchObject({ type: "effect", status: "integrated" });
    }
  });

  it("bumps the manifest version", () => {
    expect(manifest.version).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/assets.test.js`
Expected: FAIL — new describe block red ("ui-button-danger missing"), pre-existing tests still green.

- [ ] **Step 3: Edit the manifest**

In `assets/asset-manifest.json`:

a) `"version": 2` → `"version": 3`.

b) Update the three existing button entries' geometry (the new canvas is 380×98; face inset 7px, notched frame at 20–30px, bottom drop shadow):

```json
{ "id": "ui-button-primary", "file": "ui-button-primary.svg", "type": "ui-surface", "status": "integrated", "priority": "P0", "w": 380, "h": 98, "slice": [32, 32, 34, 32], "scale": 2, "fallback": "css:.big.primary" },
{ "id": "ui-button-secondary", "file": "ui-button-secondary.svg", "type": "ui-surface", "status": "integrated", "priority": "P0", "w": 380, "h": 98, "slice": [32, 32, 34, 32], "scale": 2, "fallback": "css:.big" },
{ "id": "ui-button-neutral", "file": "ui-button-neutral.svg", "type": "ui-surface", "status": "integrated", "priority": "P0", "w": 380, "h": 98, "slice": [32, 32, 34, 32], "scale": 2, "states": ["default", "disabled"], "fallback": "css:#opts button" },
```

c) Update `ui-tag`, `ui-progress-track`, `ui-progress-fill` (activate: P0 + integrated + slice; scale 8 on the progress pair keeps border widths ≤3px for the 6px-tall `.mbar`):

```json
{ "id": "ui-tag", "file": "ui-tag.svg", "type": "ui-surface", "status": "integrated", "priority": "P0", "w": 150, "h": 64, "slice": [18, 18, 18, 18], "scale": 2, "fallback": "css:.chip.on" },
{ "id": "ui-progress-track", "file": "ui-progress-track.svg", "type": "ui-surface", "status": "integrated", "priority": "P0", "w": 400, "h": 44, "slice": [22, 22, 22, 22], "scale": 8, "fallback": "css:.mbar" },
{ "id": "ui-progress-fill", "file": "ui-progress-fill.svg", "type": "ui-surface", "status": "integrated", "priority": "P0", "w": 400, "h": 44, "slice": [16, 16, 16, 16], "scale": 8, "fallback": "css:.mbar i" },
```

d) Add new entries after `ui-divider`:

```json
{ "id": "ui-button-danger", "file": "ui-button-danger.svg", "type": "ui-surface", "status": "integrated", "priority": "P0", "w": 380, "h": 98, "slice": [32, 32, 34, 32], "scale": 2, "fallback": "css:.big.danger" },
{ "id": "ui-button-start", "file": "ui-button-start.svg", "type": "ui-surface", "status": "integrated", "priority": "P0", "w": 380, "h": 98, "slice": [32, 32, 34, 32], "scale": 2, "fallback": "css:#go-battle" },
{ "id": "ui-panel", "file": "ui-panel.svg", "type": "ui-surface", "status": "integrated", "priority": "P0", "w": 560, "h": 200, "slice": [34, 34, 34, 34], "scale": 2, "fallback": "css:#quest-panel" },
{ "id": "ui-icon-tile", "file": "ui-icon-tile.svg", "type": "ui-surface", "status": "integrated", "priority": "P0", "w": 96, "h": 96, "slice": [30, 30, 30, 30], "scale": 2, "fallback": "css:.icon-btn" },
{ "id": "ui-word-plaque", "file": "ui-word-plaque.svg", "type": "ui-surface", "status": "integrated", "priority": "P1", "w": 560, "h": 320, "slice": null, "fallback": "canvas:drawWordPlate" },
```

e) Add orb entries after `fx-daily-goal`:

```json
{ "id": "vfx-orb-green", "file": "vfx-orb-green.svg", "type": "effect", "status": "integrated", "priority": "P1", "w": 220, "h": 220, "anchor": "center", "fallback": "canvas:feedbackEffect" },
{ "id": "vfx-orb-red", "file": "vfx-orb-red.svg", "type": "effect", "status": "integrated", "priority": "P1", "w": 220, "h": 220, "anchor": "center", "fallback": "canvas:feedbackEffect" },
{ "id": "vfx-orb-blue", "file": "vfx-orb-blue.svg", "type": "effect", "status": "integrated", "priority": "P1", "w": 220, "h": 220, "anchor": "center", "fallback": "canvas:feedbackEffect" },
{ "id": "vfx-orb-gold", "file": "vfx-orb-gold.svg", "type": "effect", "status": "integrated", "priority": "P1", "w": 220, "h": 220, "anchor": "center", "fallback": "canvas:feedbackEffect" }
```

(`ui-word-plaque` and the orbs are P1 on purpose: they load via `sprites.js`, not `preload()`; the manifest entries are bookkeeping + tests.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/assets.test.js test/asset-manifest.test.js`
Expected: PASS, including all pre-existing tests (`test/asset-manifest.test.js` validates manifest shape — if it asserts on `version: 2` or entry counts, update those assertions in the same commit).

- [ ] **Step 5: Commit**

```bash
git add assets/asset-manifest.json test/assets.test.js test/asset-manifest.test.js
git commit -m "feat(assets): manifest v3 — register pack v2 surfaces, activate tag/progress

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Canvas sprite registry — orbs + word plaque

**Files:**
- Modify: `src/sprites.js:10-24`
- Test: `test/asset-files.test.js` (append)

**Interfaces:**
- Produces: `sprite("vfx-orb-green"|"vfx-orb-red"|"vfx-orb-blue"|"vfx-orb-gold"|"ui-word-plaque")` usable from `main.js` (Tasks 4/6 consume). `SPRITE_NAMES` export gains those 5 names.

- [ ] **Step 1: Write the failing test**

Append to `test/asset-files.test.js`:

```js
import { SPRITE_NAMES } from "../src/sprites.js";

describe("sprite registry", () => {
  it("registers the orbs and word plaque for canvas drawing", () => {
    for (const name of ["vfx-orb-green", "vfx-orb-red", "vfx-orb-blue", "vfx-orb-gold", "ui-word-plaque"]) {
      expect(SPRITE_NAMES).toContain(name);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/asset-files.test.js`
Expected: FAIL — `SPRITE_NAMES` lacks the new names.

- [ ] **Step 3: Implement**

In `src/sprites.js`, change:

```js
  "fx-correct", "fx-wrong", "fx-critical", "fx-level-up",
];
```

to:

```js
  "fx-correct", "fx-wrong", "fx-critical", "fx-level-up",
  "vfx-orb-green", "vfx-orb-red", "vfx-orb-blue", "vfx-orb-gold",
  "ui-word-plaque",
];
```

and change:

```js
const SVG_SPRITES = new Set(["fx-correct", "fx-wrong", "fx-critical", "fx-level-up"]);
```

to:

```js
const SVG_SPRITES = new Set([
  "fx-correct", "fx-wrong", "fx-critical", "fx-level-up",
  "vfx-orb-green", "vfx-orb-red", "vfx-orb-blue", "vfx-orb-gold",
  "ui-word-plaque",
]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/asset-files.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sprites.js test/asset-files.test.js
git commit -m "feat(battle): preload orb + word-plaque sprites

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Orb feedback specs in fx.js

**Files:**
- Modify: `src/fx.js:83-87`
- Test: `test/fx.test.js:116-121` (extend the `feedbackEffect` describe)

**Interfaces:**
- Consumes: nothing new (pure module).
- Produces: `feedbackEffect(kind, x, y)` where every returned spec has an `orb` string field; new kind `"streak"` returns `{ kind: "streak", x, y, life: 0.75, sprite: null, orb: "vfx-orb-blue" }`. Task 6 consumes `fb.orb` and kind `"streak"`.

- [ ] **Step 1: Extend the tests (failing first)**

In `test/fx.test.js`, inside `describe("feedbackEffect", …)`, extend the existing assertions and add the streak case:

```js
  it("maps kinds to fx stamps and orb bursts", () => {
    expect(feedbackEffect("correct", 10, 20)).toMatchObject({ kind: "correct", x: 10, y: 20, sprite: "fx-correct", orb: "vfx-orb-green" });
    expect(feedbackEffect("wrong", 10, 20)).toMatchObject({ kind: "wrong", sprite: "fx-wrong", orb: "vfx-orb-red" });
    expect(feedbackEffect("critical", 10, 20)).toMatchObject({ kind: "critical", sprite: "fx-critical", orb: "vfx-orb-gold" });
  });

  it("streak milestone gets a blue orb and no stamp", () => {
    expect(feedbackEffect("streak", 5, 6)).toMatchObject({ kind: "streak", x: 5, y: 6, life: 0.75, sprite: null, orb: "vfx-orb-blue" });
  });
```

Keep the pre-existing assertions (they still pass — `toMatchObject` ignores the added `orb` key), or fold them into the block above.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/fx.test.js`
Expected: FAIL — `orb` undefined, `streak` falls through to the correct branch.

- [ ] **Step 3: Implement**

Replace `feedbackEffect` in `src/fx.js`:

```js
export function feedbackEffect(kind, x, y) {
  if (kind === "wrong") return { kind: "wrong", x, y, life: 0.55, sprite: "fx-wrong", orb: "vfx-orb-red" };
  if (kind === "critical") return { kind: "critical", x, y, life: 0.75, sprite: "fx-critical", orb: "vfx-orb-gold" };
  // 10-combo milestone: pure orb pop, no stamp (the combo floater carries the number)
  if (kind === "streak") return { kind: "streak", x, y, life: 0.75, sprite: null, orb: "vfx-orb-blue" };
  return { kind: "correct", x, y, life: 0.6, sprite: "fx-correct", orb: "vfx-orb-green" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/fx.test.js`
Expected: PASS (all fx tests).

- [ ] **Step 5: Commit**

```bash
git add src/fx.js test/fx.test.js
git commit -m "feat(fx): orb burst per feedback kind + streak milestone kind

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Nine-slice helper for the canvas word plaque

**Files:**
- Create: `src/nineslice.js`
- Test: `test/nineslice.test.js` (new)

**Interfaces:**
- Consumes: nothing (pure module).
- Produces: `nineSliceRects(sw, sh, si, dx, dy, dw, dh, di)` → array of 9 `{sx, sy, sw, sh, dx, dy, dw, dh}` rects (source inset `si` px, dest inset `di` px). Task 6 consumes it to draw `ui-word-plaque` without corner distortion.

- [ ] **Step 1: Write the failing test**

Create `test/nineslice.test.js`:

```js
import { describe, it, expect } from "vitest";
import { nineSliceRects } from "../src/nineslice.js";

describe("nineSliceRects", () => {
  // 560×320 source with 48px inset drawn to 300×90 dest with 24px inset
  const rects = nineSliceRects(560, 320, 48, 10, 20, 300, 90, 24);

  it("produces 9 rects covering the dest area exactly", () => {
    expect(rects).toHaveLength(9);
    const xs = [...new Set(rects.map(r => r.dx))].sort((a, b) => a - b);
    const ys = [...new Set(rects.map(r => r.dy))].sort((a, b) => a - b);
    expect(xs).toEqual([10, 34, 286]);        // 10, 10+24, 10+300-24
    expect(ys).toEqual([20, 44, 86]);         // 20, 20+24, 20+90-24
    const total = rects.reduce((s, r) => s + r.dw * r.dh, 0);
    expect(total).toBe(300 * 90);
  });

  it("keeps corner source rects unscaled in shape (si × si)", () => {
    const corner = rects.find(r => r.dx === 10 && r.dy === 20);
    expect(corner).toMatchObject({ sx: 0, sy: 0, sw: 48, sh: 48, dw: 24, dh: 24 });
  });

  it("stretches only the middle band", () => {
    const center = rects.find(r => r.dx === 34 && r.dy === 44);
    expect(center).toMatchObject({ sx: 48, sy: 48, sw: 560 - 96, sh: 320 - 96, dw: 300 - 48, dh: 90 - 48 });
  });

  it("clamps the dest inset when the dest is smaller than two insets", () => {
    const tiny = nineSliceRects(560, 320, 48, 0, 0, 40, 30, 24);
    const total = tiny.reduce((s, r) => s + r.dw * r.dh, 0);
    expect(total).toBe(40 * 30); // no negative middle bands
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/nineslice.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/nineslice.js`:

```js
"use strict";
// Pure 9-slice geometry: split a source image (sw×sh, uniform inset si) and a
// dest rect (dx,dy,dw,dh, uniform inset di) into 9 aligned draw rects so
// corners keep their aspect while edges/center stretch. Kept DOM-free so the
// math is unit-testable; main.js feeds the rects to ctx.drawImage.
export function nineSliceRects(sw, sh, si, dx, dy, dw, dh, di) {
  const d = Math.min(di, dw / 2, dh / 2); // clamp: no negative middle bands
  const sxs = [0, si, sw - si];
  const sws = [si, sw - 2 * si, si];
  const dxs = [dx, dx + d, dx + dw - d];
  const dws = [d, dw - 2 * d, d];
  const sys = [0, si, sh - si];
  const shs = [si, sh - 2 * si, si];
  const dys = [dy, dy + d, dy + dh - d];
  const dhs = [d, dh - 2 * d, d];
  const rects = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      rects.push({
        sx: sxs[col], sy: sys[row], sw: sws[col], sh: shs[row],
        dx: dxs[col], dy: dys[row], dw: dws[col], dh: dhs[row],
      });
    }
  }
  return rects;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/nineslice.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/nineslice.js test/nineslice.test.js
git commit -m "feat(battle): pure nine-slice geometry helper for canvas surfaces

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: main.js — orb rendering, streak trigger, plaque sprite

**Files:**
- Modify: `src/main.js` (three sites: combo-milestone block ~line 509, `drawFeedbackLayer` ~line 823, `drawWordPlate` ~line 761; import list ~line 5-10)
- Test: covered by Tasks 4/5 unit tests + Task 8 visual verification (this task is DOM/canvas wiring)

**Interfaces:**
- Consumes: `feedbackEffect(kind, …).orb` and kind `"streak"` (Task 4); `nineSliceRects` (Task 5); `sprite("vfx-orb-*")`, `sprite("ui-word-plaque")` (Task 3).

- [ ] **Step 1: Import the helper**

At the top of `src/main.js`, extend the sprites import line (line 9 area):

```js
import { nineSliceRects } from "./nineslice.js";
```

- [ ] **Step 2: Streak milestone fires the blue orb**

In the correct-answer branch, replace:

```js
    // milestone combo (10, 20, ...): extra sparkle on top of the usual combo sting above
    if(B.combo>=10 && B.combo%10===0) B.parts.push(...fireworkRing(z.x, gy-16));
```

with:

```js
    // milestone combo (10, 20, ...): extra sparkle + blue streak orb replaces the plain stamp
    if(B.combo>=10 && B.combo%10===0){
      B.parts.push(...fireworkRing(z.x, gy-16));
      B.feedback = {...feedbackEffect("streak", z.x, gy-42*B.S), until:performance.now()+750};
    }
```

(The streak assignment intentionally overwrites the `correct` feedback set a few lines above — one feedback slot, the rarer event wins.)

- [ ] **Step 3: Render the orb layer in drawFeedbackLayer**

In `drawFeedbackLayer`, change the `total` line to know about streak, and draw the orb beneath the stamp. Replace:

```js
  const total = kind === "critical" ? 750 : kind === "correct" ? 620 : 560;
```

with:

```js
  const total = (kind === "critical" || kind === "streak") ? 750 : kind === "correct" ? 620 : 560;
```

and after `ctx.globalAlpha = Math.max(0, 1-p);` insert (before the `fxImg` lines):

```js
  // orb burst: quick scale-in pop behind the stamp; skipped silently if the
  // sprite hasn't loaded (file:// first-frame, offline) — stamp/vector remains
  const orbImg = fb.orb ? sprite(fb.orb) : null;
  if(orbImg){
    const os = (kind === "streak" ? 110 : 84) * B.S * (0.6 + 0.5 * Math.min(1, p * 2.4));
    ctx.drawImage(orbImg, fb.x - os/2, fb.y - os/2, os, os);
  }
```

Then make the vector fallback ignore the stamp-less streak kind — change:

```js
  }else if(kind === "correct"){
```

to:

```js
  }else if(kind === "correct" || (kind === "streak" && !orbImg)){
```

- [ ] **Step 4: Word plaque sprite in drawWordPlate**

In `drawWordPlate`, wrap the hand-drawn plaque in a sprite check. After the `const x = B.w/2 - lw/2, y = wy - lh/2;` line, replace the block from `ctx.shadowColor = "rgba(60,40,20,.32)";` down to the end of the corner-ticks `ctx.stroke();` (keep everything from `ctx.fillStyle = boss ? …` onward) with:

```js
  const plaqueImg = sprite("ui-word-plaque");
  if(plaqueImg){
    // 9-slice so the gold rim + notched frame stay crisp at any plaque size
    const di = Math.min(20*B.S, lw/3, lh/3);
    for(const r of nineSliceRects(560, 320, 48, x, y, lw, lh, di)){
      ctx.drawImage(plaqueImg, r.sx, r.sy, r.sw, r.sh, r.dx, r.dy, r.dw, r.dh);
    }
  }else{
    // vector fallback: cream paper plaque (education-first reference): matte
    // paper, warm-brown border, corner ticks — hanzi/pinyin stay dynamic text
    ctx.shadowColor = "rgba(60,40,20,.32)";
    ctx.shadowBlur = 12*B.S;
    ctx.shadowOffsetY = 4*B.S;
    const paper = ctx.createLinearGradient(0,y,0,y+lh);
    paper.addColorStop(0,"rgba(253,246,227,.97)");
    paper.addColorStop(1,"rgba(243,230,198,.97)");
    ctx.fillStyle = paper;
    roundRect(x,y,lw,lh,14*B.S); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = boss ? "#D8A93A" : "#B98F55";
    ctx.lineWidth = 2.6*B.S;
    roundRect(x+1.3*B.S,y+1.3*B.S,lw-2.6*B.S,lh-2.6*B.S,13*B.S); ctx.stroke();
    ctx.strokeStyle = "rgba(231,211,166,.9)";
    ctx.lineWidth = 1.2*B.S;
    roundRect(x+6*B.S,y+6*B.S,lw-12*B.S,lh-12*B.S,9*B.S); ctx.stroke();
    // corner ticks
    ctx.strokeStyle = "#C29B5F";
    ctx.lineWidth = 1.8*B.S;
    ctx.lineCap = "round";
    const tk = 5*B.S, ti = 10*B.S;
    ctx.beginPath();
    ctx.moveTo(x+ti, y+ti+tk); ctx.lineTo(x+ti, y+ti); ctx.lineTo(x+ti+tk, y+ti);
    ctx.moveTo(x+lw-ti-tk, y+ti); ctx.lineTo(x+lw-ti, y+ti); ctx.lineTo(x+lw-ti, y+ti+tk);
    ctx.moveTo(x+ti, y+lh-ti-tk); ctx.lineTo(x+ti, y+lh-ti); ctx.lineTo(x+ti+tk, y+lh-ti);
    ctx.moveTo(x+lw-ti-tk, y+lh-ti); ctx.lineTo(x+lw-ti, y+lh-ti); ctx.lineTo(x+lw-ti, y+lh-ti-tk);
    ctx.stroke();
  }
```

(Exact code inside the fallback branch is the current code verbatim, indented one level — do not retype it, move it.)

- [ ] **Step 5: Run the full suite and build**

Run: `npm test`
Expected: PASS (all suites).
Run: `npm run build`
Expected: `dist/app.js` written, no errors.

- [ ] **Step 6: Commit**

```bash
git add src/main.js
git commit -m "feat(battle): orb feedback pops, streak milestone orb, 9-sliced word plaque

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: index.html CSS wiring + sw.js precache

**Files:**
- Modify: `index.html` (CSS block, ~lines 61-84, 137-143, 91-96)
- Modify: `sw.js` PRECACHE list only (NOT the SHELL line — see procedure)

**Interfaces:**
- Consumes: CSS vars from Task 2 (`--f-ui-button-start`, `--f-ui-button-danger`, `--f-ui-icon-tile`, `--f-ui-panel`).

- [ ] **Step 1: Hero CTA — start surface on #go-battle**

In the CSS "glossy pill buttons" section, after the `.big.primary:active{…}` rule, add:

```css
  /* gold start plaque (pack v2) on the Word Quest launcher */
  #go-battle{border-image:var(--f-ui-button-start, var(--f-ui-button-primary, none));}
  :root.has-ui-button-start #go-battle{background:none; border-color:transparent; border-radius:22px;
    color:#3A2E1A; box-shadow:0 4px 9px rgba(60,42,22,.25); text-shadow:none;}
```

- [ ] **Step 2: Danger surface hook**

Immediately after the block above, add (no current button carries `.danger`; the hook is ready for destructive actions — there are none in today's UI):

```css
  .big.danger{border-image:var(--f-ui-button-danger, none);}
  :root.has-ui-button-danger .big.danger{background:none; border-color:transparent; border-radius:22px;
    color:#FFFFFF; box-shadow:0 4px 9px rgba(120,30,20,.25);}
```

- [ ] **Step 3: Icon tiles on .icon-btn**

Extend the `.icon-btn` rule set. After `.icon-btn:active{transform:scale(.96);}` add:

```css
  .icon-btn{border-image:var(--f-ui-icon-tile, none);}
  :root.has-ui-icon-tile .icon-btn{background:none; border-color:transparent; border-radius:16px;
    color:#F7EFD9; box-shadow:0 3px 8px rgba(30,90,62,.28);}
```

(One combined `.icon-btn` declaration is also fine — keep the two `border-image` lines separate from the existing rule only if it reads cleaner; behavior is identical.)

- [ ] **Step 4: Panel surface on the quest panel**

Locate the `#quest-panel` CSS rule (search `#quest-panel` in the style block; it's the home-screen daily-quest card). Add to it:

```css
border-image:var(--f-ui-panel, none);
```

If `#quest-panel` has a visible `background`/`border` fallback, add the neutralizer:

```css
  :root.has-ui-panel #quest-panel{background:none; border-color:transparent; border-radius:20px;}
```

- [ ] **Step 5: sw.js precache — without touching the SHELL line**

The working-tree `sw.js` carries another session's uncommitted `SHELL = "nbhsk-shell-v25"` bump (HEAD says v23). Dev-branch PRs exclude SHELL bumps (see PR #12 note); the bump ships at release. Procedure to commit ONLY the precache additions:

```bash
# 1. set the version line back to HEAD's value
sed -i 's/const SHELL = "nbhsk-shell-v25";/const SHELL = "nbhsk-shell-v23";/' sw.js
```

2. In the PRECACHE array, after the line `"assets/fx-daily-goal.svg",` insert:

```js
  "assets/ui-button-neutral-disabled.svg",
  "assets/ui-button-danger.svg",
  "assets/ui-button-start.svg",
  "assets/ui-panel.svg",
  "assets/ui-word-plaque.svg",
  "assets/ui-icon-tile.svg",
  "assets/vfx-orb-green.svg",
  "assets/vfx-orb-red.svg",
  "assets/vfx-orb-blue.svg",
  "assets/vfx-orb-gold.svg",
```

```bash
# 3. verify the diff contains ONLY precache additions, then commit
git diff sw.js            # must show only the 10 added lines
git add sw.js index.html
git commit -m "feat(ui): wire pack v2 surfaces — start CTA, icon tiles, panel, danger hook; precache new assets

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
# 4. restore the other session's uncommitted bump exactly as found
sed -i 's/const SHELL = "nbhsk-shell-v23";/const SHELL = "nbhsk-shell-v25";/' sw.js
```

After step 4, `git status` must again show `sw.js` modified (the v25 line only) — same dirty state as before this task.

- [ ] **Step 6: Build and eyeball**

Run: `npm run build && npm run serve` (background), open http://localhost:8000 —
- Home: icon row shows green tiles with cream glyphs; quest panel papered.
- Scope: "Word Quest · 20" button is the gold start plaque, label text readable.
- Battle: answer buttons use the new neutral surface; disabled state uses the disabled art after answering; word plaque is the gold-rimmed paper card; correct answer pops a green orb, wrong a red one.
Expected: no console errors, no 404s in the network tab.

- [ ] **Step 7: Commit any visual-polish fixups from Step 6**

```bash
git add index.html assets/asset-manifest.json
git commit -m "fix(ui): pack v2 slice/contrast fixups from visual pass

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

(Skip if Step 6 needed no changes.)

---

### Task 8: Full verification + spec status

**Files:**
- Modify: `docs/superpowers/specs/2026-07-06-extracted-svg-pack-integration-design.md` (status line)

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: PASS — every suite, including the pre-existing ~30 unit tests.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: clean esbuild output.

- [ ] **Step 3: file:// smoke test**

Open `index.html` directly from disk (e.g. `start index.html`). Expected: game loads, home renders (tiles appear once SVGs load — they're local files, so they do), battle playable, no uncaught errors. The `sprite()`/`--f-*` fallbacks mean even blocked loads degrade to the previous vector look.

- [ ] **Step 4: 360×640 layout check**

In DevTools responsive mode at 360×640: home icon row wraps cleanly, start plaque label not clipped, Thai text on answer buttons intact.

- [ ] **Step 5: Update spec status + commit**

Change the spec's `**Status:**` line to `Implemented on feature/extracted-svg-pack-v2 (2026-07-06)`.

```bash
git add docs/superpowers/specs/2026-07-06-extracted-svg-pack-integration-design.md
git commit -m "docs: mark extracted-pack-v2 spec implemented

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Ship**

Invoke the `open-pr-to-dev` skill to push `feature/extracted-svg-pack-v2` and open the PR against `development` (never main). PR body notes: SHELL bump intentionally excluded per dev-PR workflow; `data/words.*` working-tree changes intentionally excluded (another session's in-flight work).

---

## Post-review follow-ups (final whole-branch review, 2026-07-06)

Non-blocking; branch shipped READY TO MERGE.

1. `fx-correct.svg`/`fx-wrong.svg` are 420×440 (non-square) but `drawFeedbackLayer` draws a square dest → ~4.5% vertical squish on the paw stamps. Square the viewBoxes or divide dest height by 420/440.
2. `ui-badge-mastery.svg` now carries the gold-disc paw badge art. Dormant (P1/approved — never loads), but it reads coin-adjacent; run it past the art-direction guardrails before ever promoting it to P0.
3. Pre-existing dead frame vars (not from this branch): `.chip` references `--f-ui-tab` (P1, never preloads); `.big.primary:active` references `--f-ui-button-primary-pressed` (no file/manifest entry). Either promote/ship the assets or drop the vars.
4. SHELL cache bump deliberately NOT in this branch (dev-PR workflow); bump ships at release with the deploy.
