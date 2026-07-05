# Lucky Cat HSK Production Art Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the asset pipeline and migrate Lucky Cat HSK to the approved Production Art Vertical Slice v1 without changing gameplay, data loading, PWA behavior, or Android packaging.

**Architecture:** Keep the vanilla JS app and canvas render loop. Add a manifest-backed art contract, validation scripts, and a small runtime asset API that preserves existing `sprite(name)` fallback behavior and avoids runtime `fetch`, so direct `file://` still works. Integrate only approved raster/vector assets through stable filenames, while current generated/vector/canvas fallbacks remain the first-load and missing-asset path.

**Tech Stack:** Vanilla JavaScript ES modules, esbuild IIFE bundle, Vitest, inline `index.html` CSS, canvas rendering, service worker precache, Capacitor Android.

## Global Constraints

- Work in `game/`.
- Do not add a UI framework or replace the build system.
- Do not change gameplay modes, scoring, mastery, SRS, quests, shop economy, vocabulary data, local storage keys, or Android signing files.
- Preserve direct `file://` behavior; do not add runtime JSON `fetch` for required game shell data.
- Preserve existing vector/canvas fallbacks until production assets are loaded.
- Do not bake vocabulary text into raster assets.
- Production runtime filenames must match `codex-art-handoff/asset-manifest-v1.json`.
- Treat `codex-art-handoff/ChatGPT Image Jul 5, 2026, 02_29_06 PM.png` as a visual reference only, not as a runtime sprite sheet or background.
- After `src/` changes, run `npm run build`.
- For user-facing shell/art changes, bump `SHELL` in `sw.js`.

---

## Current Findings

- Handoff package exists at `codex-art-handoff/` with PRD, execution prompt, checklist, manifest, and a 1024 x 1536 reference PNG.
- Runtime app already has partial production-art support:
  - `src/sprites.js` preloads named PNG files and returns `null` until loaded.
  - `src/cat.js` uses `cat-walk.png`, `cat-happy.png`, skin sheets, boss sheets, and vector fallbacks.
  - `src/main.js` uses `ui-icons.svg` for many controls and canvas fallbacks for backdrops/effects.
  - `index.html` still references generated button PNGs and direct asset URLs.
  - `sw.js` precaches current art assets and skips missing files.
- Existing production milestone requires a stricter asset contract than current code has: manifest statuses, required dimensions, required icon IDs, inventory, validation, and an approval gate before final art integration.

## File Structure

- Create `docs/PRD-production-art-v1.md`: project-local copy of the approved PRD.
- Create `docs/CODEX-EXECUTION-PROMPT.md`: project-local execution prompt.
- Create `docs/CODEX-ART-HANDOFF-CHECKLIST.md`: project-local art review checklist.
- Create `docs/ASSET-INVENTORY.md`: current references, status table, and required art gaps.
- Create `art-source/README.md`: source-art folder policy and approval workflow.
- Create `art-source/style-guide/REFERENCE-production-target.png`: visual reference copied from the handoff package.
- Create `assets/asset-manifest.json`: runtime filename and dimension contract copied from handoff and expanded to include `ui-icons.svg`.
- Create `scripts/validate-assets.mjs`: validates manifest shape, required files that are marked approved/integrated, PNG dimensions, sprite sheet frame metadata, and SVG symbol IDs.
- Create `test/asset-manifest.test.js`: fast unit tests for manifest status values, P0 filenames, sprite registry coverage, service-worker precache coverage, and required icon IDs.
- Modify `src/sprites.js`: export `SPRITE_NAMES`, preload all manifest-backed PNG runtime sprites, keep `sprite(name)` semantics unchanged.
- Create `src/icons.js`: shared DOM SVG icon helpers using `assets/ui-icons.svg#id`.
- Modify `src/main.js`: import icon helpers, keep DOM behavior unchanged, route production icons through the shared helper.
- Modify `index.html`: add visual tokens, use consistent icon/CSS treatment, reduce generated button PNG dependency, keep layout and screen IDs stable.
- Modify `src/fx.js` and `src/main.js`: add optional production effect sprite support while retaining current particle fallbacks.
- Modify `sw.js`: precache manifest-approved shell assets and bump `SHELL`.
- Modify `scripts/stage-www.js` only if validation needs to run before staging; otherwise leave staging behavior unchanged.

---

### Task 1: Move Handoff Into Game Project

**Files:**
- Create: `docs/PRD-production-art-v1.md`
- Create: `docs/CODEX-EXECUTION-PROMPT.md`
- Create: `docs/CODEX-ART-HANDOFF-CHECKLIST.md`
- Create: `art-source/README.md`
- Create: `art-source/style-guide/REFERENCE-production-target.png`
- No test file required; this is documentation/source-art scaffolding.

**Interfaces:**
- Consumes: `codex-art-handoff/PRD-production-art-v1.md`, `codex-art-handoff/CODEX-EXECUTION-PROMPT.md`, `codex-art-handoff/CODEX-ART-HANDOFF-CHECKLIST.md`, `codex-art-handoff/ChatGPT Image Jul 5, 2026, 02_29_06 PM.png`.
- Produces: Stable project-local documentation and source-art locations used by later tasks.

- [ ] **Step 1: Create source-art directories**

Run:

```bash
mkdir -p art-source/style-guide docs
```

Expected: command exits with code 0.

- [ ] **Step 2: Copy handoff documents into `docs/`**

Run:

```bash
cp codex-art-handoff/PRD-production-art-v1.md docs/PRD-production-art-v1.md
cp codex-art-handoff/CODEX-EXECUTION-PROMPT.md docs/CODEX-EXECUTION-PROMPT.md
cp codex-art-handoff/CODEX-ART-HANDOFF-CHECKLIST.md docs/CODEX-ART-HANDOFF-CHECKLIST.md
```

Expected: each destination file exists.

- [ ] **Step 3: Copy the visual reference into `art-source/`**

Run:

```bash
cp "codex-art-handoff/ChatGPT Image Jul 5, 2026, 02_29_06 PM.png" art-source/style-guide/REFERENCE-production-target.png
```

Expected: `file art-source/style-guide/REFERENCE-production-target.png` reports `PNG image data, 1024 x 1536`.

- [ ] **Step 4: Create `art-source/README.md`**

Write:

```markdown
# Lucky Cat HSK Art Source

This folder holds source art, references, and approved production masters for the Production Art Vertical Slice v1.

## Rules

- `style-guide/REFERENCE-production-target.png` is a visual target only.
- Runtime assets live in `assets/` and must use filenames from `assets/asset-manifest.json`.
- High-resolution masters and layered source files live here, grouped by category.
- Do not mark an asset `approved` in the manifest until it has passed the checklist in `docs/CODEX-ART-HANDOFF-CHECKLIST.md`.
- Do not bake Hanzi, pinyin, Thai, English, scores, buttons, or dynamic labels into raster art.
- Keep transparent PNG edges clean with no white halo.

## Suggested Source Layout

```text
art-source/
  style-guide/
  characters/
  backgrounds/
  ui/
  effects/
  rejected/
```
```

- [ ] **Step 5: Commit**

Run:

```bash
git add docs/PRD-production-art-v1.md docs/CODEX-EXECUTION-PROMPT.md docs/CODEX-ART-HANDOFF-CHECKLIST.md art-source/README.md art-source/style-guide/REFERENCE-production-target.png
git commit -m "docs: add production art handoff"
```

Expected: commit succeeds.

---

### Task 2: Add Asset Manifest And Inventory

**Files:**
- Create: `assets/asset-manifest.json`
- Create: `docs/ASSET-INVENTORY.md`

**Interfaces:**
- Consumes: Handoff manifest and current asset references from `index.html`, `src/`, `sw.js`, and `scripts/`.
- Produces: Manifest statuses used by validation and an inventory used by art production/review.

- [ ] **Step 1: Copy manifest**

Run:

```bash
cp codex-art-handoff/asset-manifest-v1.json assets/asset-manifest.json
```

Expected: `assets/asset-manifest.json` exists and contains `"milestone": "Production Art Vertical Slice v1"`.

- [ ] **Step 2: Add icon bundle entry to manifest**

Edit `assets/asset-manifest.json` so the `assets` array contains this item after `fx-new-best`:

```json
{
  "id": "ui-icons",
  "file": "ui-icons.svg",
  "type": "icon-sprite",
  "status": "planned",
  "priority": "P0"
}
```

Expected: JSON remains valid.

- [ ] **Step 3: Create inventory**

Write `docs/ASSET-INVENTORY.md`:

```markdown
# Production Art Asset Inventory

## Status Terms

- `planned`: Required by the PRD but not yet supplied or accepted.
- `concept`: Draft exists outside runtime.
- `review`: Candidate runtime file exists and is awaiting art review.
- `approved`: Candidate passed art review but is not wired everywhere.
- `integrated`: Approved asset is loaded by runtime code, staged into `www/`, and covered by validation.
- `rejected`: Candidate exists but must not ship.

## Current Runtime References

| Area | File | Current references | Migration action |
|---|---|---:|---|
| Sprite preload | `src/sprites.js` | Cat sheets, shop skins, boss sheets, backdrops, `maneki`, `coin` | Replace hardcoded list with exported registry that covers manifest-backed PNGs. |
| Cat render | `src/cat.js` | `cat-walk`, `cat-happy`, skin sheets, boss sheets | Keep fallback vector cat; integrate approved base cat sheets first. |
| Battle canvas | `src/main.js` | `bg-${shopState.backdrop}`, `maneki`, `coin`, canvas effects | Add default `bg-battle`, optional `bg-market`, and effect sprite fallbacks. |
| Shop preview | `src/main.js` | Skin sheets, backdrop images, canvas preview art | Use same registry and preserve canvas fallback previews. |
| Home CSS | `index.html` | `bg-home.png`, generated `btn-*.png`, `coin.png`, `maneki.png`, `ui-icons.svg` | Move toward tokenized CSS and shared SVG icon mechanism. |
| PWA shell | `sw.js` | Current static art list | Keep tolerant precache and add manifest-backed shell assets after approval. |
| Staging | `scripts/stage-www.js` | Copies full `assets/` folder | No change unless validation becomes part of staging. |

## P0 Runtime Art Required

| File | Required dimensions | Current status | Notes |
|---|---:|---|---|
| `cat-walk.png` | 1536 x 256, 6 frames | review | Must be transparent and baseline-stable. |
| `cat-happy.png` | 1024 x 256, 4 frames | review | Must read as happy when sampled as stills. |
| `maneki.png` | 512 x 512 minimum | review | Home/street mascot. |
| `cat-portrait.png` | 512 x 512 | planned | Needed for home/profile/shop portrait polish. |
| `bg-home.png` | 1080 x 1920 | review | No baked UI or text. |
| `bg-battle.png` | 1024 x 512 | review | Quiet center for Hanzi. |
| `bg-market.png` | 1024 x 512 | review | Night Market premium scene. |
| `ui-panel.png` | 9-slice friendly | planned | Main panel treatment. |
| `ui-word-plaque.png` | 9-slice friendly | planned | Battle vocabulary plaque treatment. |
| `ui-button-primary.png` | scalable frame | planned | Red/gold button frame. |
| `ui-button-secondary.png` | scalable frame | planned | Jade/dark button frame. |
| `ui-button-neutral.png` | scalable frame | planned | Neutral button frame. |
| `fx-correct.png` | effect atlas | planned | Correct feedback, non-color-only. |
| `fx-wrong.png` | effect atlas | planned | Wrong feedback, non-color-only. |
| `fx-critical.png` | effect atlas | planned | Critical feedback. |
| `ui-icons.svg` | SVG symbol sprite | review | Must include every icon in `required_icons`. |

## Approval Gate

Only change a manifest status to `approved` after checking:

- Cat proportions and lighting match the reference.
- Transparent edges have no white halo.
- Sprite baselines and centers do not drift.
- Background centers stay low contrast behind vocabulary.
- No incorrect Chinese characters appear in backgrounds.
- No dynamic text is baked into art.
- Asset is readable at 360 x 640, 390 x 844, and 412 x 915.
```

- [ ] **Step 4: Verify inventory against current references**

Run:

```bash
rg -n "assets/|sprite\\(" index.html src sw.js scripts
```

Expected: output contains every runtime asset reference summarized in `docs/ASSET-INVENTORY.md`.

- [ ] **Step 5: Commit**

Run:

```bash
git add assets/asset-manifest.json docs/ASSET-INVENTORY.md
git commit -m "docs: inventory production art assets"
```

Expected: commit succeeds.

---

### Task 3: Add Manifest Validation

**Files:**
- Create: `scripts/validate-assets.mjs`
- Create: `test/asset-manifest.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: `assets/asset-manifest.json`, `assets/ui-icons.svg`, runtime assets, `src/sprites.js`, `sw.js`.
- Produces: `npm run assets:validate` and unit tests that fail when the asset contract drifts.

- [ ] **Step 1: Write failing tests**

Create `test/asset-manifest.test.js`:

```js
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SPRITE_NAMES } from "../src/sprites.js";

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "assets/asset-manifest.json"), "utf8"));
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const iconSvg = fs.readFileSync(path.join(root, "assets/ui-icons.svg"), "utf8");

const statusValues = new Set(manifest.status_values);
const pngRuntimeNames = manifest.assets
  .filter(asset => asset.file.endsWith(".png"))
  .map(asset => asset.file.replace(/\.png$/, ""));

describe("production art manifest", () => {
  it("uses only known asset statuses", () => {
    for (const asset of manifest.assets) {
      expect(statusValues.has(asset.status), `${asset.id} has unknown status`).toBe(true);
    }
  });

  it("registers every manifest PNG in the sprite registry", () => {
    for (const name of pngRuntimeNames) {
      expect(SPRITE_NAMES, `${name} missing from SPRITE_NAMES`).toContain(name);
    }
  });

  it("pre-caches every P0 shell asset with tolerant service-worker loading", () => {
    const p0Files = manifest.assets
      .filter(asset => asset.priority === "P0")
      .map(asset => `assets/${asset.file}`);
    for (const file of p0Files) {
      expect(sw, `${file} missing from sw.js`).toContain(file);
    }
    expect(sw).toContain("c.add(u).catch(() => {})");
  });

  it("keeps the required icon symbol contract", () => {
    for (const id of manifest.required_icons) {
      expect(iconSvg, `ui-icons.svg missing #${id}`).toContain(`id="${id}"`);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- test/asset-manifest.test.js
```

Expected: FAIL because `SPRITE_NAMES` is not exported and at least `cat-portrait`, `bg-results`, UI frames, and effects are not registered/pre-cached yet.

- [ ] **Step 3: Add validation script**

Create `scripts/validate-assets.mjs`:

```js
#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const manifestPath = path.join(root, "assets/asset-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const allowedStatuses = new Set(manifest.status_values);
const approvedStatuses = new Set(["approved", "integrated"]);
let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`asset validation: ${message}`);
}

function readPngSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") throw new Error("not a PNG");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

for (const asset of manifest.assets) {
  if (!allowedStatuses.has(asset.status)) {
    fail(`${asset.id} has invalid status '${asset.status}'`);
  }
  const filePath = path.join(root, "assets", asset.file);
  if (approvedStatuses.has(asset.status) && !fs.existsSync(filePath)) {
    fail(`${asset.id} is ${asset.status} but ${asset.file} is missing`);
    continue;
  }
  if (!fs.existsSync(filePath) || !asset.file.endsWith(".png")) continue;
  const size = readPngSize(filePath);
  if (asset.width && size.width !== asset.width) {
    fail(`${asset.file} width ${size.width} !== ${asset.width}`);
  }
  if (asset.height && size.height !== asset.height) {
    fail(`${asset.file} height ${size.height} !== ${asset.height}`);
  }
  if (asset.type === "sprite-sheet") {
    if (asset.frameWidth * asset.frames !== asset.width) {
      fail(`${asset.file} frameWidth * frames does not match width`);
    }
    if (asset.frameHeight !== asset.height) {
      fail(`${asset.file} frameHeight does not match height`);
    }
  }
}

const iconsAsset = manifest.assets.find(asset => asset.file === "ui-icons.svg");
if (iconsAsset && fs.existsSync(path.join(root, "assets/ui-icons.svg"))) {
  const svg = fs.readFileSync(path.join(root, "assets/ui-icons.svg"), "utf8");
  for (const id of manifest.required_icons) {
    if (!svg.includes(`id="${id}"`)) fail(`ui-icons.svg missing symbol '${id}'`);
  }
}

if (failures) process.exit(1);
console.log(`asset validation: checked ${manifest.assets.length} manifest assets`);
```

- [ ] **Step 4: Add npm script**

Modify `package.json` scripts:

```json
"assets:validate": "node scripts/validate-assets.mjs"
```

Expected: existing scripts remain unchanged.

- [ ] **Step 5: Run validator**

Run:

```bash
npm run assets:validate
```

Expected: PASS while manifest statuses are `planned`/`review`, because missing files are only fatal once status is `approved` or `integrated`.

- [ ] **Step 6: Commit**

Run:

```bash
git add scripts/validate-assets.mjs test/asset-manifest.test.js package.json
git commit -m "test: validate production art manifest"
```

Expected: commit succeeds after Task 4 makes the failing test pass.

---

### Task 4: Manifest-Backed Runtime Registry

**Files:**
- Modify: `src/sprites.js`
- Modify: `sw.js`
- Test: `test/asset-manifest.test.js`

**Interfaces:**
- Consumes: manifest filenames from Task 2.
- Produces: `SPRITE_NAMES: string[]`, unchanged `loadSprites(): void`, unchanged `sprite(name): HTMLImageElement | null`.

- [ ] **Step 1: Update `src/sprites.js`**

Replace the file with:

```js
"use strict";
/* Image registry - each sprite is preloaded fire-and-forget so it never
   blocks the game loop. sprite(name) returns the Image only once it is
   fully loaded; otherwise returns null so every draw site can use its
   vector/canvas fallback instead. Works on file:// because the registry is
   static and does not fetch JSON at runtime. */

const REGISTRY = {};

export const SPRITE_NAMES = [
  "cat-walk", "cat-happy",
  "cat-midnight-walk", "cat-midnight-happy",
  "cat-sakura-walk", "cat-sakura-happy",
  "cat-jade-walk", "cat-jade-happy",
  "cat-gold-walk", "cat-gold-happy",
  "cat-boss-walk", "cat-boss-happy",
  "cat-portrait",
  "maneki", "coin",
  "bg-home", "bg-battle", "bg-market", "bg-results",
  "bg-temple", "bg-bamboo",
  "ui-panel", "ui-word-plaque",
  "ui-button-primary", "ui-button-secondary", "ui-button-neutral",
  "ui-badge", "ui-progress-track", "ui-progress-fill",
  "fx-correct", "fx-wrong", "fx-critical", "fx-level-up", "fx-new-best",
];

export function loadSprites() {
  for (const name of SPRITE_NAMES) {
    const img = new Image();
    img.src = "assets/" + name + ".png";
    REGISTRY[name] = img;
  }
}

export function sprite(name) {
  const img = REGISTRY[name];
  if (!img) return null;
  if (!img.complete || !img.naturalWidth) return null;
  return img;
}
```

- [ ] **Step 2: Update `sw.js` precache list**

Add these P0 manifest-backed files if missing:

```js
"assets/cat-portrait.png",
"assets/bg-results.png",
"assets/ui-panel.png",
"assets/ui-word-plaque.png",
"assets/ui-button-primary.png",
"assets/ui-button-secondary.png",
"assets/ui-button-neutral.png",
"assets/ui-badge.png",
"assets/ui-progress-track.png",
"assets/ui-progress-fill.png",
"assets/fx-correct.png",
"assets/fx-wrong.png",
"assets/fx-critical.png",
"assets/fx-level-up.png",
"assets/fx-new-best.png",
```

Keep the tolerant install line:

```js
c.add(u).catch(() => {})
```

- [ ] **Step 3: Run manifest tests**

Run:

```bash
npm test -- test/asset-manifest.test.js
```

Expected: PASS if `ui-icons.svg` contains every required symbol. If it fails on icon IDs, implement Task 5 before committing.

- [ ] **Step 4: Run full tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/sprites.js sw.js test/asset-manifest.test.js
git commit -m "feat: register production art assets"
```

Expected: commit succeeds.

---

### Task 5: Shared Icon Mechanism

**Files:**
- Create: `src/icons.js`
- Modify: `src/main.js`
- Modify: `assets/ui-icons.svg`
- Modify: `index.html`
- Test: `test/asset-manifest.test.js`

**Interfaces:**
- Consumes: `assets/ui-icons.svg#<id>` symbols.
- Produces: `iconSvg(id)`, `setIconLabel(el, icon, label)`, `setIconOnly(el, icon)`, `setPill(el, icon, text)`.

- [ ] **Step 1: Create `src/icons.js`**

Write:

```js
"use strict";

const ICON_HREF = "assets/ui-icons.svg";

export function iconSvg(id) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("asset-icon");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `${ICON_HREF}#${id}`);
  svg.appendChild(use);
  return svg;
}

export function setIconLabel(el, icon, label) {
  el.replaceChildren();
  const wrap = document.createElement("span");
  wrap.className = "icon-text";
  if (icon) wrap.appendChild(iconSvg(icon));
  const text = document.createElement("span");
  text.textContent = label;
  wrap.appendChild(text);
  el.appendChild(wrap);
}

export function setIconOnly(el, icon) {
  el.replaceChildren(iconSvg(icon));
}

export function setPill(el, icon, text) {
  el.replaceChildren(iconSvg(icon), document.createTextNode(` ${text}`));
}
```

- [ ] **Step 2: Import helpers in `src/main.js`**

Add:

```js
import { iconSvg, setIconLabel, setIconOnly, setPill } from "./icons.js";
```

Remove the local `iconSvg`, `setIconLabel`, `setIconOnly`, and `setPill` functions.

- [ ] **Step 3: Update pill call sites**

Replace:

```js
function updateWalletChip(){ setPill($("#home-wallet"), "coin", wallet.toLocaleString()); }
function updateLevelChip(){ const el = $("#home-level"); if(el) setPill(el, "cat", `Lv ${levelForXp(xp)}`); }
```

with:

```js
function updateWalletChip(){ setPill($("#home-wallet"), "coin", wallet.toLocaleString()); }
function updateLevelChip(){ const el = $("#home-level"); if(el) setPill(el, "paw", `Lv ${levelForXp(xp)}`); }
```

Expected: wallet uses SVG `#coin`, level uses SVG `#paw`.

- [ ] **Step 4: Ensure required icon IDs exist**

In `assets/ui-icons.svg`, ensure symbols exist for:

```text
heart
heart-empty
coin
diamond
audio
muted
pause
close
back
home
shop
street
progress
quests
flashcards
battle
check
wrong
paw
streak
```

Aliases may reuse paths, but each required ID must be a real `<symbol id="...">`.

- [ ] **Step 5: Remove obsolete CSS image pills**

In `index.html`, remove rules that bind `coin` and `maneki` to pill background images:

```css
.pill-icon.coin{background-image:url("assets/coin.png");}
.pill-icon.cat{background-image:url("assets/maneki.png");}
```

Keep `.asset-icon` sizing and contrast styles.

- [ ] **Step 6: Run tests and build**

Run:

```bash
npm test -- test/asset-manifest.test.js
npm run build
```

Expected: both PASS; `dist/app.js` updates.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/icons.js src/main.js assets/ui-icons.svg index.html dist/app.js
git commit -m "feat: centralize production icons"
```

Expected: commit succeeds.

---

### Task 6: Visual Tokens And UI Frame Hooks

**Files:**
- Modify: `index.html`

**Interfaces:**
- Consumes: palette from `docs/PRD-production-art-v1.md`.
- Produces: CSS custom properties and frame hooks that work with or without PNG UI frames.

- [ ] **Step 1: Add visual tokens near the top of the stylesheet**

Add:

```css
:root{
  --lc-lacquer:#A51F24;
  --lc-crimson:#4A1015;
  --lc-gold:#F5C34B;
  --lc-dark-gold:#9C6900;
  --lc-jade:#2F9B72;
  --lc-night:#101B2B;
  --lc-paper:#F4E2BE;
  --lc-ink:#24150E;
  --lc-cream:#FFF4E0;
  --lc-tan:#C9A58A;
  --lc-shadow:rgba(18,8,6,.42);
}
```

- [ ] **Step 2: Replace hardcoded key colors for buttons and HUD**

Update existing button, chip, HUD, card, and panel rules to use the tokens above. Preserve class names and responsive behavior. For example:

```css
.big.primary{
  background:linear-gradient(180deg,var(--lc-lacquer),var(--lc-crimson));
  color:var(--lc-cream);
  border-color:var(--lc-gold);
}
```

- [ ] **Step 3: Add optional frame image hooks**

Add styles that layer production frame images without making them required:

```css
.screen-card,
.panel,
.shop-card{
  background-color:rgba(74,16,21,.88);
  background-image:var(--ui-panel-image, none);
  background-size:100% 100%;
}

.word-card,
.flash-card{
  background-color:var(--lc-paper);
  background-image:var(--ui-word-plaque-image, none);
  background-size:100% 100%;
  color:var(--lc-ink);
}
```

If the current class names differ, apply the same rule to the real panel/card selectors already in `index.html`.

- [ ] **Step 4: Check 360px layout manually in CSS**

Run:

```bash
rg -n "font-size:|width:|min-width:|height:" index.html
```

Expected: no production-art changes introduce fixed widths wider than 360px.

- [ ] **Step 5: Build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add index.html dist/app.js
git commit -m "style: add production art visual tokens"
```

Expected: commit succeeds.

---

### Task 7: Default Home And Battle Art Integration

**Files:**
- Modify: `src/main.js`
- Modify: `src/cat.js`
- Modify: `index.html`
- Test: existing Vitest suite

**Interfaces:**
- Consumes: `sprite("bg-battle")`, `sprite("bg-home")`, `sprite("cat-walk")`, `sprite("cat-happy")`, `sprite("maneki")`, existing canvas/vector fallbacks.
- Produces: home and battle use approved production art when loaded, with unchanged fallbacks.

- [ ] **Step 1: Make default battle background try `bg-battle` first**

Change `drawBackdrop(gy)` in `src/main.js` to:

```js
function drawBackdrop(gy){
  const selected = shopState.backdrop ? `bg-${shopState.backdrop}` : "bg-battle";
  const img = sprite(selected);
  if(img) drawCoverImage(ctx, img, 0, 0, B.w, B.h);
  else if(shopState.backdrop) paintBackdrop(ctx, B.w, B.h, gy, shopState.backdrop, performance.now());
  else paintBackdrop(ctx, B.w, B.h, gy, "", performance.now());
}
```

Expected: no behavior change when `bg-battle.png` is missing or still loading.

- [ ] **Step 2: Keep shop backdrops unchanged**

Run:

```bash
rg -n "bg-\\$\\{item.id\\}|paintBackdrop" src/main.js
```

Expected: shop preview still falls back to `paintBackdrop` for `market`, `temple`, and `bamboo`.

- [ ] **Step 3: Use portrait where appropriate without blocking existing maneki**

If a home/profile/shop portrait element exists in `index.html`, wire it to `cat-portrait.png` via CSS or DOM. If no such element exists, do not add new gameplay UI in this task; leave `cat-portrait.png` registered for Task 9 shop polish.

- [ ] **Step 4: Build and test**

Run:

```bash
npm test
npm run build
```

Expected: both PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/main.js src/cat.js index.html dist/app.js
git commit -m "feat: prefer production home and battle art"
```

Expected: commit succeeds.

---

### Task 8: Production Feedback Effects With Fallbacks

**Files:**
- Modify: `src/fx.js`
- Modify: `src/main.js`
- Test: `test/fx.test.js`

**Interfaces:**
- Consumes: `fx-correct.png`, `fx-wrong.png`, `fx-critical.png` when present.
- Produces: correct/wrong/critical feedback remains understandable without relying only on color.

- [ ] **Step 1: Add effect style metadata to `src/fx.js`**

Add:

```js
export function feedbackEffect(kind, x, y) {
  if (kind === "wrong") return { kind: "wrong", x, y, life: 0.55, sprite: "fx-wrong" };
  if (kind === "critical") return { kind: "critical", x, y, life: 0.75, sprite: "fx-critical" };
  return { kind: "correct", x, y, life: 0.6, sprite: "fx-correct" };
}
```

- [ ] **Step 2: Add failing tests**

Append to `test/fx.test.js`:

```js
import { feedbackEffect } from "../src/fx.js";

it("describes production feedback effect sprites", () => {
  expect(feedbackEffect("correct", 10, 20)).toMatchObject({ kind: "correct", x: 10, y: 20, sprite: "fx-correct" });
  expect(feedbackEffect("wrong", 10, 20)).toMatchObject({ kind: "wrong", sprite: "fx-wrong" });
  expect(feedbackEffect("critical", 10, 20)).toMatchObject({ kind: "critical", sprite: "fx-critical" });
});
```

- [ ] **Step 3: Render effect sprites in `src/main.js` only when available**

Where battle feedback particles/floaters are drawn, add sprite rendering:

```js
const fxImg = p.sprite ? sprite(p.sprite) : null;
if (fxImg) {
  const size = p.kind === "critical" ? 96 * B.S : 72 * B.S;
  ctx.drawImage(fxImg, p.x - size / 2, p.y - size / 2, size, size);
} else {
  // keep the existing particle/vector drawing for this feedback kind
}
```

Use the real particle/effect collection name in `main.js`; do not replace the existing `coinBurst`, `comboFloater`, or `fireworkRing` behavior.

- [ ] **Step 4: Test and build**

Run:

```bash
npm test -- test/fx.test.js
npm run build
```

Expected: both PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/fx.js src/main.js test/fx.test.js dist/app.js
git commit -m "feat: add production feedback effect hooks"
```

Expected: commit succeeds.

---

### Task 9: Approved Art Batch Integration

**Files:**
- Modify: `assets/asset-manifest.json`
- Modify: `assets/*.png`
- Modify: `assets/ui-icons.svg`
- Modify: `sw.js`
- Test: `scripts/validate-assets.mjs`, `test/asset-manifest.test.js`

**Interfaces:**
- Consumes: approved art files placed in `assets/`.
- Produces: manifest statuses changed from `review`/`planned` to `approved` and then `integrated` only after validation and runtime wiring pass.

- [ ] **Step 1: Place approved P0 files**

Copy approved runtime files into `assets/` with exact names:

```text
cat-walk.png
cat-happy.png
maneki.png
cat-portrait.png
bg-home.png
bg-battle.png
bg-market.png
ui-panel.png
ui-word-plaque.png
ui-button-primary.png
ui-button-secondary.png
ui-button-neutral.png
ui-badge.png
ui-progress-track.png
ui-progress-fill.png
fx-correct.png
fx-wrong.png
fx-critical.png
ui-icons.svg
```

Expected: existing generated files may be overwritten only when the replacement is approved.

- [ ] **Step 2: Validate dimensions before status changes**

Run:

```bash
npm run assets:validate
```

Expected: PASS for files that already have exact dimensions; if a file fails dimensions, move it to `art-source/rejected/` and keep its manifest status `rejected`.

- [ ] **Step 3: Update manifest statuses**

For each approved and runtime-wired file, set:

```json
"status": "integrated"
```

For approved but not yet wired files, set:

```json
"status": "approved"
```

Expected: `npm run assets:validate` still passes.

- [ ] **Step 4: Bump PWA shell cache**

In `sw.js`, increment:

```js
const SHELL = "nbhsk-shell-v13";
```

Use the next integer after the current checked-in value.

- [ ] **Step 5: Run validation**

Run:

```bash
npm run assets:validate
npm test -- test/asset-manifest.test.js
npm test
npm run build
```

Expected: all PASS.

- [ ] **Step 6: Commit**

Run:

```bash
git add assets sw.js dist/app.js
git commit -m "feat: integrate approved production art batch"
```

Expected: commit succeeds.

---

### Task 10: Mobile Visual QA And Final Packaging

**Files:**
- Modify: `docs/ASSET-INVENTORY.md`
- Modify: `www/` generated by staging
- Modify: Android generated files only through `npm run cap:sync`

**Interfaces:**
- Consumes: integrated production art.
- Produces: staged web output and QA notes for vertical slice approval.

- [ ] **Step 1: Stage web output**

Run:

```bash
npm run build
node scripts/stage-www.js
```

Expected: `stage-www: copied 7 groups (...) into www/`.

- [ ] **Step 2: Run full web validation**

Run:

```bash
npm run assets:validate
npm test
npm run build
```

Expected: all PASS.

- [ ] **Step 3: Run local server**

Run:

```bash
npm run serve
```

Expected: app serves at `http://localhost:8000`. Keep this process running only during manual QA.

- [ ] **Step 4: Check target viewports**

Use browser devtools or Playwright to check:

```text
360 x 640
390 x 844
412 x 915
```

Verify:

- Home brand is visible within two seconds.
- Play/Battle action is visible without excessive scrolling.
- Hanzi is dominant in battle.
- Thai text does not clip.
- Background center does not compete with vocabulary.
- Correct/wrong/critical feedback reads by shape/motion, not only color.
- Shop preview uses the same visual family.
- No missing asset requests appear in the console.

- [ ] **Step 5: Check direct file loading**

Open `index.html` directly from the filesystem.

Expected:

- App shell appears.
- Sprite/canvas fallbacks work while assets load.
- Audio index failure on `file://` remains silent and falls back as before.
- No new runtime manifest fetch error is required for the game shell.

- [ ] **Step 6: Sync Android**

Run:

```bash
npm run cap:sync
```

Expected: Capacitor sync completes. Do not edit files in `android-signing/`.

- [ ] **Step 7: Update inventory final notes**

Append to `docs/ASSET-INVENTORY.md`:

```markdown
## Vertical Slice QA Notes

- Validation date: 2026-07-05
- Commands passed: `npm run assets:validate`, `npm test`, `npm run build`, `node scripts/stage-www.js`, `npm run cap:sync`
- Viewports checked: 360 x 640, 390 x 844, 412 x 915
- Remaining art gaps: list only manifest assets that are not `integrated`
- Rejected assets: list filenames moved to `art-source/rejected/`
```

Replace the remaining-art and rejected-art lines with the actual filenames from the manifest.

- [ ] **Step 8: Commit**

Run:

```bash
git add docs/ASSET-INVENTORY.md www android
git commit -m "chore: stage production art vertical slice"
```

Expected: commit succeeds.

---

## Self-Review

- Spec coverage: Phase A audit/scaffolding is covered by Tasks 1-4. Icon migration is covered by Task 5. Visual tokens and UI frame hooks are covered by Task 6. Home/battle/default art integration is covered by Task 7. Feedback effects are covered by Task 8. Approved art ingestion is covered by Task 9. PWA, `file://`, mobile, staging, and Android validation are covered by Task 10.
- Placeholder scan: The plan avoids unresolved implementation placeholders. Where asset files are not available yet, the plan defines explicit approval and status gates rather than pretending generated art is final.
- Type consistency: Runtime interfaces are `SPRITE_NAMES`, `loadSprites()`, `sprite(name)`, `iconSvg(id)`, `setIconLabel(el, icon, label)`, `setIconOnly(el, icon)`, `setPill(el, icon, text)`, and `feedbackEffect(kind, x, y)` consistently across tasks.
