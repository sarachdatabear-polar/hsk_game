# Education-First Visual Redesign — Phase A + B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Supersession note.** This plan **supersedes the visual direction** of
> `docs/superpowers/plans/../specs/2026-07-05-asset-driven-frontend-design.md` (the dark
> gold/casino "Battle / Combo / Critical" look). The *theme* is replaced by the
> education-first PRD (`art-source/PRD-education-visual-redesign-v1.md`, source of truth).
> The **registry/contract architecture** of that earlier spec is **reused, not reinvented**:
> `src/assets.js` REGISTRY / `preload` / `frameCSS` / `img` (§2), border-image CSS wiring (§4),
> the tracker + validator quality gates (§5), and mandatory fallbacks are theme-agnostic and
> carried forward here, pointed at the **education manifest** instead of the casino one. Where
> this plan and the M0 registry plan (`2026-07-05-m0-asset-registry-plan.md`) overlap, this
> plan is authoritative for the education milestone; the M0 plan is its architectural reference.

**Goal:** Ship the education-first "Lucky Cat Learning Journey" *feel* — warm paper/coral/jade
palette, education labels, one rounded icon family, calm feedback — with **zero new painted
art**, on top of a theme-agnostic asset registry that later phases light up as art lands.

**Architecture:** The education asset manifest (`assets/asset-manifest.json`) is the single
source of truth; `src/assets.js` bundles it at build time (esbuild JSON loader — no runtime
`fetch`, so `file://` keeps working) and exposes `REGISTRY` / `preload()` / `frameCSS(id)` /
`img(id)`. Every asset starts `status: "planned"`, so loading is a no-op and the game renders
100% on its existing CSS/canvas fallbacks — restyled in Phase B to the education palette. UI
labels change as **visible text only**; internal keys, `nbhsk.*` saves, scoring, and data are
untouched. Icons are inline `<symbol>` glyphs in `assets/ui-icons.svg` used via `<use href>` —
markup, not painted PNGs — so extending them needs no art production.

**Tech Stack:** Vanilla JS ES modules → `dist/app.js` via esbuild (IIFE bundle); Vitest 2;
inline `<style>` + markup in `index.html`; service worker `sw.js`; Node ≥18 for scripts.

## Global Constraints

- Work only inside `game/` (`C:\Users\sarac\Desktop\HSK\game`). Vanilla JS, no framework, no
  new runtime dependencies.
- **Execute on the CURRENT branch `docs/asset-driven-frontend-prd`.** Do **not** branch, do
  **not** push, do **not** touch `main` (push-to-main deploys to GitHub Pages).
- **`file://` constraint:** the game must run when `index.html` is opened directly. No runtime
  `fetch` for required shell data — the manifest is bundled via JSON import; `fetch` for
  `audio/index.json`-style data keeps its silent-fallback pattern.
- **Mandatory fallbacks (never removed):** `frameCSS()` returns `"none"` and `img()` returns
  `null` for unknown / not-approved / missing / still-loading assets; every call site keeps its
  CSS/canvas fallback. Every screen must render fully if no PNG loads.
- **NO new painted art in Phase A or B.** No PNGs authored. New `ui-icons.svg` `<symbol>`
  glyphs (inline vector markup) are the only new visual assets and are explicitly permitted.
  All manifest raster assets stay `status: "planned"` through both phases.
- **Must-preserve (PRD §9 / CODEX-MASTER-PROMPT):** game mechanics, vocabulary pipeline, HSK
  scope logic, mastery/SRS behaviour, `nbhsk.*` localStorage saves, `file://`, PWA/offline,
  Android compatibility, and all image/canvas fallbacks. **Never** bake dynamic Hanzi, pinyin,
  Thai, English, score, or progress text into images. Do **not** touch Android signing material.
- **Label rule:** change *visible text only*. Preserve internal keys, element `id`s, event
  names, quest ids (`combo5`, `boss1`, …), `store` keys, and scoring. Mapping (PRD §3 / §9):
  Battle→Word Quest · Combo→Learning Streak · Critical→Perfect · Lives→Focus · Shop→Collection ·
  Boss→Review Challenge · Fight Misses→Practice Missed Words · High Score→Best Session.
- After changing `src/`, run `npm run build` (`dist/app.js` is git-tracked — commit the rebuilt
  bundle). Bump the `SHELL` cache constant in `sw.js` (`nbhsk-shell-v19` → `-v20`) **once**, in
  the final Phase B task (Phase A is invisible; Phase B is user-facing).
- All commands run from `game/`. Commit messages end with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- **Leave pre-existing working-tree state alone:** untracked files under `art-source/`
  (`PRD-education-visual-redesign-v1.md`, `asset-manifest-education-v1.json`, `ART-PRODUCTION-ORDER.md`,
  `CODEX-MASTER-PROMPT.md`, `REFERENCE-production-target.png`) and the staged deletion of
  `art-source/style-guide/REFERENCE-production-target.png` are not this plan's concern. Commit
  only the files each task names.

---

## Current-state facts (grounding for the implementer)

- `src/assets.js`, `scripts/asset-report.mjs`, `test/assets.test.js` **do not exist yet** (the
  M0 plan was written but not implemented). This plan builds them, pointed at the education
  manifest.
- `assets/asset-manifest.json` currently exists as **version 1, casino theme** (fields
  `id/file/type/status/width/height/frames/frameWidth/frameHeight/priority`,
  plus `status_values` and `required_icons`). Task A2 replaces it with the education v2 contract.
- `art-source/asset-manifest-education-v1.json` is the **new asset set** (30 assets, all
  `status: "planned"`, `width/height` dims, no contract fields). Task A2 folds it into the
  active manifest and adds contract fields.
- `test/asset-manifest.test.js` exists and asserts casino-manifest shape (incl. one test that
  every manifest PNG is in the sprite registry `SPRITE_NAMES`). Task A2 rewrites it to the
  education contract.
- `scripts/validate-assets.mjs` exists (statuses, PNG dims, sprite-sheet math, icon symbols);
  it reads `width/height`. Task A2 updates it to `w/h` + a slice check + `ui-surface` awareness.
- `index.html` holds all markup + inline `<style>`. It already contains **dormant hooks** of the
  form `background-image:var(--ui-<x>-image, <fallback>)` that nothing sets (lines ~59, 66, 164,
  167, 220, 143, and the panel/misslist/scorelist/mbar groups). Task A5 migrates these to the
  `border-image:var(--f-<id>, none)` mechanism (never set in Phase A → computed no-op).
- Current palette (`:root`, lines 16–31): dark casino — `--bg:#1a0d0d`, `--panel:#2e1515`,
  gold-heavy (`--lc-gold:#F5C34B`, discs, plaques). Task B1/B2/B3 replace it.
- `assets/ui-icons.svg` currently ships these `<symbol>` ids: `audio, back, battle, coin,
  diamond, flashcards, play, pause, paw, progress, quests, wrong, target, cards, shop, home,
  street, chart, trophy, help, sound, muted, bell, bell-off, close, infinity, fight, pencil,
  check, repeat, streak, heart, heart-empty`. Education glyphs `learn, quest, review, collection,
  settings, calendar, focus-heart, star, mastery, book, headphones, retry, next, previous,
  secondary-coin` are **missing** and are added in Task B5.
- Visible label sites found: `index.html` — `#go-battle` "Battle · 20" (L340), `#r-fight-miss`
  "Fight misses" (L387), `#nw-fight` "Fight these" (L410), `#s-shop h2` "Lucky Shop" (L417) +
  `data-go="shop"` title "Lucky Shop" (L291), `#s-scores h2` "High scores" (L396) +
  `data-go="scores"` title "High scores" (L292), home tagline (L277), home hero "Play" (L279).
  `src/main.js` — `Battle · ${len}` (L195, L212), boss prompt `Boss · pick the hanzi for:`
  (L404), `#hud-combo` `"x"+B.combo` (L361), results "Perfect round!" (L851, already education),
  "new best!/best" (L879). `src/quests.js` — quest descriptions "Reach a ×5 combo",
  "Defeat a boss cat" (L7–L8).
- `sw.js`: `const SHELL = "nbhsk-shell-v19";` (L5), tolerant PRECACHE (`c.add(u).catch(()=>{})`).

---

# PHASE A — Audit & manifest install (invisible; runs 100% on fallbacks)

Phase A introduces the registry/contract infrastructure and audit docs. **No visual change**:
every asset stays `planned`, no `--f-*` var is ever set, no PNG is fetched, no palette or label
changes yet. `npm test` + `npm run build` stay green and every screen renders pixel-identical.

---

### Task A1: Source folder structure + audit/QA docs

**Files:**
- Create: `art-source/education-v1/reference/.gitkeep`, `.../characters/.gitkeep`,
  `.../backgrounds/.gitkeep`, `.../ui/.gitkeep`, `.../icons/.gitkeep`, `.../effects/.gitkeep`,
  `.../marketing/.gitkeep`
- Create: `docs/ASSET-INVENTORY.md`
- Create: `docs/ART-QA-CHECKLIST.md`

**Interfaces:**
- Consumes: nothing.
- Produces: the PRD §8 source tree and the two audit docs referenced by later art phases.

- [ ] **Step 1: Create the `art-source/education-v1/` subfolder tree (PRD §8)**

Create seven empty tracked folders via `.gitkeep` files:

```
art-source/education-v1/reference/.gitkeep
art-source/education-v1/characters/.gitkeep
art-source/education-v1/backgrounds/.gitkeep
art-source/education-v1/ui/.gitkeep
art-source/education-v1/icons/.gitkeep
art-source/education-v1/effects/.gitkeep
art-source/education-v1/marketing/.gitkeep
```

Each `.gitkeep` file contains a single line:

```
# placeholder so git tracks this empty education-v1 art-source folder
```

- [ ] **Step 2: Write `docs/ASSET-INVENTORY.md`** — audit of current assets + gambling/casino cues.

The doc has three sections. Fill the tables from the current repo (values below are the audit
results found while planning — verify against `assets/` and `index.html` while writing):

```markdown
# Asset Inventory & Casino-Cue Audit — Education-First Redesign

Baseline audit captured before the education-first redesign (Phase A).

## 1. Current runtime image assets (`assets/`)
| File | Used by | Keep / Replace / Retheme |
|---|---|---|
| bg-home.png | `#s-home` background (layered over gradient, index.html ~243) | Replace (bg-home education) |
| bg-battle.png | `#s-battle` background (index.html ~182) | Replace (bg-quest) |
| bg-market.png / bg-temple.png / bg-bamboo.png | shop backdrops (purchasable) | Retheme later |
| cat-walk.png / cat-happy.png | player sprite (canvas) | Replace (education cat) |
| cat-{midnight,sakura,jade,gold,boss}-{walk,happy}.png | shop skins / boss | Retheme later |
| maneki.png | mascot | Replace (education maneki) |
| coin.png / lantern.png / cloud.png | HUD/decor | Demote gold (coin secondary) |
| btn-learn/shop/scores/progress/howto/sound.{png,svg} | home icon-row gold discs | Replace w/ icon family + soft surfaces |
| ui-icons.svg | all inline glyphs (`<use>`) | Extend to education set (Task B5) |

## 2. Casino / gambling cues found (must be removed or demoted)
| Cue | Where | Fix (phase) |
|---|---|---|
| Dark luxury base `#1a0d0d`, maroon panels | `:root`, `html,body`, panels | Warm paper palette (B1/B2) |
| Gold-heavy buttons, plaques, HUD pills, gold discs | `.big.gold`, `.hud-pill`, `.hud-round`, `.icon-btn` | Demote gold to accent (B2/B3/B5) |
| Coin-first status on Home | `#home-wallet` leads the pill row | Learning actions lead (B4/B6) |
| "Battle / Fight misses / Fight these" combat language | index.html + main.js | Education labels (B4) |
| "×N combo" combat framing | `#hud-combo`, quests.js | Learning Streak (B4) |
| "Lucky Shop" purchase framing | `#s-shop` | Collection (B4) |
| Casino-red crimson feedback accents | `#hud .combo`, flashes | Jade/coral education accents (B2) |

## 3. Fallback routines that MUST survive (never removed)
| Surface | Fallback | Source |
|---|---|---|
| Cat / sprites | `canvas` vector draw | `cat.js`, `sprites.js` |
| Backgrounds | CSS gradient under `url()` | index.html |
| UI frames | CSS `background`/gradient | index.html |
| Effects | canvas particle routines | `fx.js` |
| Audio | Web Speech fallback when mp3/index missing | `audio.js` |
```

- [ ] **Step 3: Write `docs/ART-QA-CHECKLIST.md`** — per-asset acceptance gate (PRD §7/§11/§12).

```markdown
# Art QA Checklist — Education-First Assets

Every asset must pass before its manifest `status` may reach `approved`/`integrated`.

## Visual
- [ ] Education palette only (warm paper, coral, jade, sky, sun-yellow, ink-navy, plum, leaf); gold is a minor accent.
- [ ] Soft storybook / cel-painted style; no casino gloss, no black-and-gold framing, no neon reward bursts.
- [ ] Character proportions consistent across every pose; friendly expression; readable at 64 px.
- [ ] No money bag / wealth medallion as the focal object.

## Technical
- [ ] Clean transparency where required; exact declared dimensions (`w`/`h`).
- [ ] Sprite-sheet frame math matches (`frameWidth*frames==w`, `frameHeight==h`).
- [ ] No baked-in Hanzi / pinyin / Thai / English / score / progress text.
- [ ] Backgrounds: low-detail center for dynamic content; detail near edges.

## Integration
- [ ] Loads through `src/assets.js`; CSS/canvas fallback still renders if the PNG is absent.
- [ ] `node scripts/validate-assets.mjs` exits 0; `npm run assets:report` lists it.

## Mobile / a11y
- [ ] Legible at on-screen size at 360×640, 390×844, 412×915.
- [ ] Thai labels not clipped; core actions visible; reduced-motion respected.
```

- [ ] **Step 4: Commit**

```bash
git add art-source/education-v1 docs/ASSET-INVENTORY.md docs/ART-QA-CHECKLIST.md
git commit -m "docs(assets): education-v1 source tree + asset inventory & art-QA checklist"
```

---

### Task A2: Install education manifest v2 (contract fields) + validator + contract tests

**Files:**
- Modify (full rewrite): `assets/asset-manifest.json` (education v2)
- Modify (full rewrite): `test/asset-manifest.test.js`
- Modify: `scripts/validate-assets.mjs` (`w/h`, slice check, `ui-surface`)
- Modify: `sw.js` (PRECACHE additions only — SHELL bump is Task B7)

**Interfaces:**
- Consumes: `REGISTRY` from `src/assets.js` (Task A3 provides it; author A3 first if executing
  strictly TDD, or accept that the `REGISTRY` import test is red until A3 — this plan orders A3
  before A2's test run; see note below).
- Produces: the education contract every later task reads — per asset:
  `id, file, type, status, priority, w, h, slice, frames, frameWidth, frameHeight, states,
  anchor, fallback` (+ optional `scale`); top-level `types, status_values, required_icons,
  planned_icons`.

> **Ordering note:** `test/asset-manifest.test.js` imports `REGISTRY` from `src/assets.js`.
> Execute **Task A3 before running A2's tests** (A3 creates `src/assets.js`). The task text is
> ordered A2→A3 for narrative (manifest then runtime); a strict executor may swap them or write
> both before running either. Both are committed separately.

- [ ] **Step 1: Rewrite `assets/asset-manifest.json` to education v2**

Replace the entire file with (folds `art-source/asset-manifest-education-v1.json` + adds contract
fields; every asset `status:"planned"` except the live `ui-icons` sprite):

```json
{
  "project": "Lucky Cat HSK",
  "milestone": "Education-First Visual Redesign v1",
  "theme": "Lucky Cat Learning Journey",
  "version": 2,
  "status_values": ["planned", "concept", "review", "approved", "integrated", "rejected"],
  "types": ["sprite-sheet", "character", "background", "ui-surface", "icon-sprite", "effect"],
  "assets": [
    { "id": "cat-walk", "file": "cat-walk.png", "type": "sprite-sheet", "status": "planned", "priority": "P0", "w": 1536, "h": 256, "frames": 6, "frameWidth": 256, "frameHeight": 256, "anchor": "bottom-center", "fallback": "canvas:drawCat" },
    { "id": "cat-happy", "file": "cat-happy.png", "type": "sprite-sheet", "status": "planned", "priority": "P0", "w": 1024, "h": 256, "frames": 4, "frameWidth": 256, "frameHeight": 256, "anchor": "bottom-center", "fallback": "canvas:drawCat" },
    { "id": "cat-study", "file": "cat-study.png", "type": "character", "status": "planned", "priority": "P0", "w": 512, "h": 512, "anchor": "center", "fallback": "canvas:drawCat" },
    { "id": "cat-guide", "file": "cat-guide.png", "type": "character", "status": "planned", "priority": "P1", "w": 512, "h": 512, "anchor": "center", "fallback": "canvas:drawCat" },
    { "id": "cat-celebrate", "file": "cat-celebrate.png", "type": "character", "status": "planned", "priority": "P1", "w": 512, "h": 512, "anchor": "center", "fallback": "canvas:drawCat" },
    { "id": "cat-thinking", "file": "cat-thinking.png", "type": "character", "status": "planned", "priority": "P1", "w": 512, "h": 512, "anchor": "center", "fallback": "canvas:drawCat" },
    { "id": "cat-portrait", "file": "cat-portrait.png", "type": "character", "status": "planned", "priority": "P0", "w": 512, "h": 512, "anchor": "center", "fallback": "canvas:drawCat" },
    { "id": "maneki", "file": "maneki.png", "type": "character", "status": "planned", "priority": "P1", "w": 512, "h": 512, "anchor": "bottom-center", "fallback": "canvas:maneki-vector" },

    { "id": "bg-home", "file": "bg-home.png", "type": "background", "status": "planned", "priority": "P0", "w": 1080, "h": 1920, "fallback": "css:#s-home" },
    { "id": "bg-quest", "file": "bg-quest.png", "type": "background", "status": "planned", "priority": "P0", "w": 1024, "h": 512, "fallback": "css:#s-battle" },
    { "id": "bg-flashcards", "file": "bg-flashcards.png", "type": "background", "status": "planned", "priority": "P0", "w": 1080, "h": 1920, "fallback": "css:#s-learn" },
    { "id": "bg-results", "file": "bg-results.png", "type": "background", "status": "planned", "priority": "P1", "w": 1080, "h": 1920, "fallback": "css:.screen.festive" },
    { "id": "bg-progress", "file": "bg-progress.png", "type": "background", "status": "planned", "priority": "P1", "w": 1080, "h": 1920, "fallback": "css:#s-progress" },
    { "id": "bg-collection", "file": "bg-collection.png", "type": "background", "status": "planned", "priority": "P2", "w": 1080, "h": 1920, "fallback": "css:#s-shop" },

    { "id": "ui-card-paper", "file": "ui-card-paper.png", "type": "ui-surface", "status": "planned", "priority": "P0", "w": null, "h": null, "slice": null, "fallback": "css:.card,.word-card,.flash-card" },
    { "id": "ui-card-soft", "file": "ui-card-soft.png", "type": "ui-surface", "status": "planned", "priority": "P0", "w": null, "h": null, "slice": null, "fallback": "css:.readout" },
    { "id": "ui-button-primary", "file": "ui-button-primary.png", "type": "ui-surface", "status": "planned", "priority": "P0", "w": null, "h": null, "slice": null, "states": ["default", "pressed", "disabled"], "fallback": "css:.big.primary" },
    { "id": "ui-button-secondary", "file": "ui-button-secondary.png", "type": "ui-surface", "status": "planned", "priority": "P0", "w": null, "h": null, "slice": null, "states": ["default", "pressed", "disabled"], "fallback": "css:.big" },
    { "id": "ui-button-neutral", "file": "ui-button-neutral.png", "type": "ui-surface", "status": "planned", "priority": "P0", "w": null, "h": null, "slice": null, "states": ["default", "pressed", "disabled"], "fallback": "css:#opts button" },
    { "id": "ui-tab", "file": "ui-tab.png", "type": "ui-surface", "status": "planned", "priority": "P1", "w": null, "h": null, "slice": null, "fallback": "css:.chip" },
    { "id": "ui-badge-mastery", "file": "ui-badge-mastery.png", "type": "ui-surface", "status": "planned", "priority": "P1", "w": null, "h": null, "slice": null, "fallback": "css:.hud-round" },
    { "id": "ui-progress-track", "file": "ui-progress-track.png", "type": "ui-surface", "status": "planned", "priority": "P0", "w": null, "h": null, "slice": null, "fallback": "css:.mbar" },
    { "id": "ui-progress-fill", "file": "ui-progress-fill.png", "type": "ui-surface", "status": "planned", "priority": "P0", "w": null, "h": null, "slice": null, "fallback": "css:.mbar i" },
    { "id": "ui-stamp-correct", "file": "ui-stamp-correct.png", "type": "ui-surface", "status": "planned", "priority": "P1", "w": null, "h": null, "slice": null, "fallback": "canvas:feedbackEffect" },
    { "id": "ui-divider", "file": "ui-divider.png", "type": "ui-surface", "status": "planned", "priority": "P2", "w": null, "h": null, "slice": null, "fallback": "css:.sect" },

    { "id": "ui-icons", "file": "ui-icons.svg", "type": "icon-sprite", "status": "integrated", "priority": "P0", "w": null, "h": null, "fallback": "svg:inline" },

    { "id": "fx-correct", "file": "fx-correct.png", "type": "effect", "status": "planned", "priority": "P0", "w": null, "h": null, "anchor": "center", "fallback": "canvas:coinBurst" },
    { "id": "fx-perfect", "file": "fx-perfect.png", "type": "effect", "status": "planned", "priority": "P0", "w": null, "h": null, "anchor": "center", "fallback": "canvas:perfectBonus" },
    { "id": "fx-retry", "file": "fx-retry.png", "type": "effect", "status": "planned", "priority": "P0", "w": null, "h": null, "anchor": "center", "fallback": "canvas:feedbackEffect" },
    { "id": "fx-mastery", "file": "fx-mastery.png", "type": "effect", "status": "planned", "priority": "P1", "w": null, "h": null, "anchor": "center", "fallback": "canvas:fireworkRing" },
    { "id": "fx-level-up", "file": "fx-level-up.png", "type": "effect", "status": "planned", "priority": "P1", "w": null, "h": null, "anchor": "center", "fallback": "canvas:fireworkRing" },
    { "id": "fx-daily-goal", "file": "fx-daily-goal.png", "type": "effect", "status": "planned", "priority": "P1", "w": null, "h": null, "anchor": "center", "fallback": "canvas:comboFloater" }
  ],
  "required_icons": [
    "home", "flashcards", "audio", "muted", "progress", "streak",
    "pencil", "check", "back", "close", "pause", "play"
  ],
  "planned_icons": [
    "learn", "quest", "review", "collection", "settings", "calendar",
    "focus-heart", "star", "mastery", "book", "headphones", "retry",
    "next", "previous", "secondary-coin"
  ]
}
```

Notes (do not change without a PRD update):
- `required_icons` lists only glyphs **already present** in `ui-icons.svg` so the coverage test
  is green from Phase A. The 15 education glyphs to author live in `planned_icons`; Task B5
  authors them and **moves** them into `required_icons` (keeping the two lists disjoint).
- `w/h/slice/frames` are `null` where the PRD does not fix them; the validator only enforces
  non-null values. `ui-surface` is the education equivalent of the earlier spec's `ui-frame`.

- [ ] **Step 2: Rewrite `test/asset-manifest.test.js`** (education contract)

```js
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { REGISTRY } from "../src/assets.js";

const manifest = JSON.parse(
  readFileSync(new URL("../assets/asset-manifest.json", import.meta.url), "utf8")
);
const uiIconsSvg = readFileSync(new URL("../assets/ui-icons.svg", import.meta.url), "utf8");
const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");

const statusValues = new Set(manifest.status_values);
const types = new Set(manifest.types);
const FRAME_TYPES = new Set(["ui-surface", "ui-frame"]);

function allFiles(asset) {
  const extra = (asset.states || [])
    .filter(s => s !== "default")
    .map(s => asset.file.replace(/\.png$/, `-${s}.png`));
  return [asset.file, ...extra];
}

describe("education asset manifest contract", () => {
  it("has a unique id for every asset", () => {
    const ids = manifest.assets.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses only known statuses and types", () => {
    for (const a of manifest.assets) {
      expect(statusValues.has(a.status), `${a.id} status`).toBe(true);
      expect(types.has(a.type), `${a.id} type`).toBe(true);
    }
  });

  it("declares slice on every ui-surface (null until measured, else 4 margins)", () => {
    for (const a of manifest.assets.filter(x => FRAME_TYPES.has(x.type))) {
      expect("slice" in a, `${a.id} missing slice`).toBe(true);
      if (a.slice !== null) {
        expect(Array.isArray(a.slice) && a.slice.length === 4, `${a.id} slice shape`).toBe(true);
      }
    }
  });

  it("declares the full state set on stateful button surfaces", () => {
    for (const a of manifest.assets.filter(x => x.states)) {
      expect(a.states, `${a.id} states`).toEqual(["default", "pressed", "disabled"]);
      expect(FRAME_TYPES.has(a.type), `${a.id} must be a ui-surface`).toBe(true);
    }
  });

  it("names a fallback routine for every P0 asset", () => {
    for (const a of manifest.assets.filter(x => x.priority === "P0")) {
      expect(typeof a.fallback === "string" && a.fallback.length > 0, `${a.id} fallback`).toBe(true);
    }
  });

  it("keeps sprite-sheet frame math consistent with declared size", () => {
    for (const a of manifest.assets.filter(x => x.type === "sprite-sheet" && x.w)) {
      expect(a.frameWidth * a.frames, `${a.id} frame math`).toBe(a.w);
      expect(a.frameHeight, `${a.id} frame height`).toBe(a.h);
    }
  });

  it("mirrors the manifest 1:1 into the runtime REGISTRY", () => {
    expect(Object.keys(REGISTRY).sort()).toEqual(manifest.assets.map(a => a.id).sort());
  });

  it("pre-caches every P0 PNG (incl. state variants) tolerantly in sw.js", () => {
    const p0 = manifest.assets.filter(a => a.priority === "P0" && a.file.endsWith(".png"));
    for (const a of p0) {
      for (const f of allFiles(a)) {
        expect(sw, `assets/${f} missing from sw.js PRECACHE`).toContain(`assets/${f}`);
      }
    }
    expect(sw).toContain("c.add(u).catch(() => {})");
  });

  it("includes every required icon id in assets/ui-icons.svg", () => {
    const missing = manifest.required_icons.filter(
      id => !new RegExp(`<symbol\\b[^>]*\\bid="${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(uiIconsSvg)
    );
    expect(missing).toEqual([]);
  });

  it("keeps planned icons disjoint from required icons", () => {
    for (const id of manifest.planned_icons) {
      expect(manifest.required_icons, `${id} both planned and required`).not.toContain(id);
    }
  });
});
```

- [ ] **Step 3: Update `scripts/validate-assets.mjs` — `w/h` + slice + `ui-surface`**

Edit A — dimension checks: change `asset.width`→`asset.w`, `size.width !== asset.width`→
`size.width !== asset.w` (and the `height`/`h` pair), so lines 47–52 read:

```js
  if (asset.w && size.width !== asset.w) {
    fail(`${asset.file} width ${size.width} !== ${asset.w}`);
  }
  if (asset.h && size.height !== asset.h) {
    fail(`${asset.file} height ${size.height} !== ${asset.h}`);
  }
```

Edit B — sprite-sheet math (guard on declared size so `null` dims skip), lines 54–61:

```js
  if (asset.type === "sprite-sheet" && asset.w) {
    if (asset.frameWidth * asset.frames !== asset.w) {
      fail(`${asset.file} frameWidth * frames does not match w`);
    }
    if (asset.frameHeight !== asset.h) {
      fail(`${asset.file} frameHeight does not match h`);
    }
  }
```

Edit C — add a slice-shape check inside the `for (const asset of manifest.assets)` loop, right
after the status check (before the `filePath` block, ~line 34):

```js
  if ((asset.type === "ui-surface" || asset.type === "ui-frame") &&
      asset.slice !== null && asset.slice !== undefined) {
    const ok = Array.isArray(asset.slice) && asset.slice.length === 4 &&
      asset.slice.every(n => Number.isInteger(n) && n >= 0);
    if (!ok) fail(`${asset.id} slice must be [top,right,bottom,left] non-negative ints`);
  }
```

- [ ] **Step 4: Add education P0 PNGs to `sw.js` PRECACHE**

The existing PRECACHE already lists the education-named files that overlap the casino set
(`bg-home.png`, `cat-walk.png`, `cat-happy.png`, `maneki.png`, `cat-portrait.png`). Add the new
education P0 filenames + button state variants after the existing `assets/cat-portrait.png` line
(order irrelevant; loader is tolerant):

```js
  "assets/cat-study.png",
  "assets/bg-quest.png",
  "assets/bg-flashcards.png",
  "assets/ui-card-paper.png",
  "assets/ui-card-soft.png",
  "assets/ui-button-primary.png",
  "assets/ui-button-primary-pressed.png",
  "assets/ui-button-primary-disabled.png",
  "assets/ui-button-secondary.png",
  "assets/ui-button-secondary-pressed.png",
  "assets/ui-button-secondary-disabled.png",
  "assets/ui-button-neutral.png",
  "assets/ui-button-neutral-pressed.png",
  "assets/ui-button-neutral-disabled.png",
  "assets/ui-progress-track.png",
  "assets/ui-progress-fill.png",
  "assets/fx-correct.png",
  "assets/fx-perfect.png",
  "assets/fx-retry.png",
```

Do **not** bump `SHELL` here (Task B7).

- [ ] **Step 5: Run tests + validator (after A3 exists)**

Run: `npm test -- test/asset-manifest.test.js`  → PASS.
Run: `node scripts/validate-assets.mjs`  → exit 0, `checked 30 manifest assets`.

- [ ] **Step 6: Commit**

```bash
git add assets/asset-manifest.json test/asset-manifest.test.js scripts/validate-assets.mjs sw.js
git commit -m "feat(assets): education manifest v2 contract + validator + precache (all planned)"
```

---

### Task A3: `src/assets.js` registry runtime (reused from M0, education-aware)

**Files:**
- Create: `src/assets.js`
- Test: `test/assets.test.js`

**Interfaces:**
- Consumes: `assets/asset-manifest.json` (education v2, Task A2), bundled via JSON import.
- Produces (Task A5 / M1 rely on these exact signatures):
  - `createAssets(manifest, { makeImage?, root? }) -> { REGISTRY, preload, frameCSS, img }`
  - `REGISTRY` — `{ [id]: manifestEntry }`
  - `preload(): void` — loads P0 assets whose status is `approved|integrated` (incl. state variants)
  - `frameCSS(id, state="default"): string` — border-image shorthand once loaded, else `"none"`
  - `img(id): HTMLImageElement | null` — loaded Image or `null` (lazy-loads non-P0 on first call)
  - side effect: sets `--f-<id>` / `--f-<id>-<state>` on `<html>` when a `ui-surface` image loads

- [ ] **Step 1: Write the failing tests** — `test/assets.test.js`

```js
import { describe, it, expect } from "vitest";
import { createAssets, REGISTRY, frameCSS, img } from "../src/assets.js";

function fakeImages() {
  const created = [];
  const makeImage = () => {
    const image = { complete: false, naturalWidth: 0, onload: null, _src: "" };
    Object.defineProperty(image, "src", { set(v) { image._src = v; }, get() { return image._src; } });
    created.push(image);
    return image;
  };
  return { created, makeImage };
}
function fakeRoot() {
  const vars = {};
  return { vars, style: { setProperty: (k, v) => { vars[k] = v; } } };
}

const fixture = {
  assets: [
    { id: "ui-card-paper", file: "ui-card-paper.png", type: "ui-surface", status: "approved",
      priority: "P0", slice: [24, 24, 24, 24], fallback: "css:.card" },
    { id: "ui-button-primary", file: "ui-button-primary.png", type: "ui-surface",
      status: "approved", priority: "P0", slice: [16, 16, 16, 16],
      states: ["default", "pressed", "disabled"], fallback: "css:.big.primary" },
    { id: "ui-tab", file: "ui-tab.png", type: "ui-surface", status: "planned",
      priority: "P0", slice: null, fallback: "css:.chip" },
    { id: "ui-badge-mastery", file: "ui-badge-mastery.png", type: "ui-surface",
      status: "approved", priority: "P0", slice: null, fallback: "css:.hud-round" },
    { id: "cat-walk", file: "cat-walk.png", type: "sprite-sheet",
      status: "approved", priority: "P0", fallback: "canvas:drawCat" },
    { id: "bg-results", file: "bg-results.png", type: "background",
      status: "approved", priority: "P1", fallback: "css:.screen.festive" },
    { id: "ui-icons", file: "ui-icons.svg", type: "icon-sprite",
      status: "integrated", priority: "P0", fallback: "svg:inline" },
  ],
};

describe("createAssets", () => {
  it("preload() only fetches P0 approved/integrated PNGs", () => {
    const { created, makeImage } = fakeImages();
    createAssets(fixture, { makeImage, root: fakeRoot() }).preload();
    expect(created.map(i => i._src).sort()).toEqual([
      "assets/cat-walk.png",
      "assets/ui-badge-mastery.png",
      "assets/ui-button-primary-disabled.png",
      "assets/ui-button-primary-pressed.png",
      "assets/ui-button-primary.png",
      "assets/ui-card-paper.png",
    ]);
  });

  it("img() returns null until the image has loaded", () => {
    const { created, makeImage } = fakeImages();
    const A = createAssets(fixture, { makeImage, root: fakeRoot() });
    A.preload();
    expect(A.img("cat-walk")).toBeNull();
    const image = created.find(i => i._src === "assets/cat-walk.png");
    image.complete = true; image.naturalWidth = 1536;
    expect(A.img("cat-walk")).toBe(image);
  });

  it("img() lazy-loads P1 assets on first call", () => {
    const { created, makeImage } = fakeImages();
    const A = createAssets(fixture, { makeImage, root: fakeRoot() });
    expect(A.img("bg-results")).toBeNull();
    expect(created.some(i => i._src === "assets/bg-results.png")).toBe(true);
  });

  it("falls back safely for unknown ids", () => {
    const A = createAssets(fixture, { makeImage: fakeImages().makeImage, root: fakeRoot() });
    expect(A.img("nope")).toBeNull();
    expect(A.frameCSS("nope")).toBe("none");
  });

  it("frameCSS() is 'none' before load and never fetches planned assets", () => {
    const { created, makeImage } = fakeImages();
    const A = createAssets(fixture, { makeImage, root: fakeRoot() });
    A.preload();
    expect(A.frameCSS("ui-card-paper")).toBe("none");
    expect(A.frameCSS("ui-tab")).toBe("none");
    expect(created.some(i => i._src === "assets/ui-tab.png")).toBe(false);
  });

  it("frameCSS() returns the shorthand and sets --f-<id> after load", () => {
    const { created, makeImage } = fakeImages();
    const root = fakeRoot();
    const A = createAssets(fixture, { makeImage, root });
    A.preload();
    const image = created.find(i => i._src === "assets/ui-card-paper.png");
    image.complete = true; image.naturalWidth = 96; image.onload();
    const expected = 'url("assets/ui-card-paper.png") 24 24 24 24 fill / 24px 24px 24px 24px stretch';
    expect(A.frameCSS("ui-card-paper")).toBe(expected);
    expect(root.vars["--f-ui-card-paper"]).toBe(expected);
  });

  it("state variants resolve to sibling files and their own vars", () => {
    const { created, makeImage } = fakeImages();
    const root = fakeRoot();
    const A = createAssets(fixture, { makeImage, root });
    A.preload();
    const pressed = created.find(i => i._src === "assets/ui-button-primary-pressed.png");
    pressed.complete = true; pressed.naturalWidth = 64; pressed.onload();
    expect(A.frameCSS("ui-button-primary", "pressed"))
      .toContain('url("assets/ui-button-primary-pressed.png")');
    expect(root.vars["--f-ui-button-primary-pressed"]).toBe(A.frameCSS("ui-button-primary", "pressed"));
    expect(A.frameCSS("ui-button-primary")).toBe("none");
  });

  it("a loaded ui-surface with slice:null still returns 'none'", () => {
    const { created, makeImage } = fakeImages();
    const A = createAssets(fixture, { makeImage, root: fakeRoot() });
    A.preload();
    const image = created.find(i => i._src === "assets/ui-badge-mastery.png");
    image.complete = true; image.naturalWidth = 48; image.onload();
    expect(A.frameCSS("ui-badge-mastery")).toBe("none");
  });
});

describe("singleton (bound to the real manifest)", () => {
  it("exposes the manifest as REGISTRY", () => {
    expect(Object.keys(REGISTRY).length).toBeGreaterThan(0);
    expect(REGISTRY["cat-walk"].file).toBe("cat-walk.png");
  });
  it("degrades to fallbacks without a DOM", () => {
    expect(frameCSS("ui-card-paper")).toBe("none");
    expect(img("cat-walk")).toBeNull();
    expect(img("unknown-id")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify FAIL** — `npm test -- test/assets.test.js` → `Cannot find module '../src/assets.js'`.

- [ ] **Step 3: Implement `src/assets.js`**

```js
"use strict";
/* Education-first asset registry — single runtime source of truth for
   production art. assets/asset-manifest.json is bundled at build time by
   esbuild's JSON loader, so file:// never needs fetch().

   Mandatory fallback contract: frameCSS() returns "none" and img() returns
   null whenever an asset is unknown, not yet approved, missing, or still
   loading — every call site keeps its CSS/canvas fallback.

   Loading is status-gated: only approved/integrated assets are ever fetched.
   While every asset is "planned" (Phase A/B) the game renders 100% on
   fallbacks by contract.

   ui-surface assets surface as CSS custom properties: when "ui-card-paper"
   finishes loading, --f-ui-card-paper is set on <html> to a border-image
   shorthand; index.html reads it as border-image: var(--f-ui-card-paper, none).
   Button state variants live in sibling files (<base>-pressed.png,
   <base>-disabled.png) with --f-<id>-pressed / --f-<id>-disabled. */

import manifest from "../assets/asset-manifest.json";

const LOADABLE = new Set(["approved", "integrated"]);
const FRAME_TYPES = new Set(["ui-surface", "ui-frame"]);

export function createAssets(m, opts = {}) {
  const makeImage = opts.makeImage ||
    (() => (typeof Image === "undefined" ? null : new Image()));
  const rootEl = () =>
    opts.root || (typeof document === "undefined" ? null : document.documentElement);

  const REGISTRY = {};
  for (const a of m.assets) REGISTRY[a.id] = a;

  const images = new Map();
  const frames = new Map();

  const key = (id, state) => (state === "default" ? id : id + ":" + state);
  const stateFile = (a, state) =>
    state === "default" ? a.file : a.file.replace(/\.png$/, "-" + state + ".png");

  function frameShorthand(a, state) {
    if (!Array.isArray(a.slice) || a.slice.length !== 4) return null;
    const scale = a.scale || 1;
    const widths = a.slice.map(n => Math.round(n / scale) + "px").join(" ");
    return `url("assets/${stateFile(a, state)}") ${a.slice.join(" ")} fill / ${widths} stretch`;
  }

  function load(id, state = "default") {
    const a = REGISTRY[id];
    if (!a || !a.file.endsWith(".png") || !LOADABLE.has(a.status)) return;
    const k = key(id, state);
    if (images.has(k)) return;
    const image = makeImage();
    if (!image) return;
    image.onload = () => {
      if (!FRAME_TYPES.has(a.type)) return;
      const css = frameShorthand(a, state);
      if (!css) return;
      frames.set(k, css);
      const el = rootEl();
      if (el) el.style.setProperty("--f-" + k.replace(":", "-"), css);
    };
    image.src = "assets/" + stateFile(a, state);
    images.set(k, image);
  }

  function preload() {
    for (const a of m.assets) {
      if (a.priority !== "P0") continue;
      load(a.id);
      for (const s of a.states || []) if (s !== "default") load(a.id, s);
    }
  }

  function img(id) {
    if (!REGISTRY[id]) return null;
    load(id);
    const image = images.get(id);
    return image && image.complete && image.naturalWidth ? image : null;
  }

  function frameCSS(id, state = "default") {
    return frames.get(key(id, state)) || "none";
  }

  return { REGISTRY, preload, frameCSS, img };
}

const assets = createAssets(manifest);
export const REGISTRY = assets.REGISTRY;
export const preload = assets.preload;
export const frameCSS = assets.frameCSS;
export const img = assets.img;
```

- [ ] **Step 4: Run to verify PASS** — `npm test -- test/assets.test.js` → PASS. Then `npm test` (full suite) → all green.

- [ ] **Step 5: Commit**

```bash
git add src/assets.js test/assets.test.js
git commit -m "feat(assets): education-aware registry runtime (status-gated, fallback-first)"
```

---

### Task A4: `scripts/asset-report.mjs` — Asset Tracker

**Files:**
- Create: `scripts/asset-report.mjs`
- Modify: `package.json` (add `assets:report` script)

**Interfaces:**
- Consumes: `assets/asset-manifest.json` v2.
- Produces: `npm run assets:report` — id · file · type · status · priority · present? table +
  status/priority summary + planned-icons note. Always exits 0 (reporting; `assets:validate` gates).

- [ ] **Step 1: Write the script** — `scripts/asset-report.mjs`

```js
#!/usr/bin/env node
// Asset Tracker (PRD §5) — prints the manifest as a status table. Reporting
// only: always exits 0. The quality gate is scripts/validate-assets.mjs.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "assets", "asset-manifest.json"), "utf8")
);

const rows = manifest.assets.map(a => ({
  id: a.id, file: a.file, type: a.type, status: a.status, priority: a.priority,
  present: fs.existsSync(path.join(root, "assets", a.file)) ? "yes" : "-",
}));

const cols = ["id", "file", "type", "status", "priority", "present"];
const widths = Object.fromEntries(
  cols.map(c => [c, Math.max(c.length, ...rows.map(r => String(r[c]).length))])
);
const line = r => cols.map(c => String(r[c]).padEnd(widths[c])).join("  ");

console.log(line(Object.fromEntries(cols.map(c => [c, c.toUpperCase()]))));
console.log(cols.map(c => "-".repeat(widths[c])).join("  "));
for (const r of rows) console.log(line(r));

const byStatus = {};
for (const a of manifest.assets) byStatus[a.status] = (byStatus[a.status] || 0) + 1;
const p0 = manifest.assets.filter(a => a.priority === "P0");
console.log(
  "\nstatus:",
  Object.entries(byStatus).map(([k, v]) => `${k}=${v}`).join("  "),
  `| total=${manifest.assets.length} | P0=${p0.length}`
);
if ((manifest.planned_icons || []).length) {
  console.log("planned icons (not yet in ui-icons.svg):", manifest.planned_icons.join(", "));
}
```

- [ ] **Step 2: Add the npm script** — in `package.json` `"scripts"`, after `"assets:validate"`:

```json
    "assets:report": "node scripts/asset-report.mjs",
```

- [ ] **Step 3: Run and verify**

Run: `npm run assets:report` → 30-row table; summary `status: planned=29  integrated=1 | total=30 | P0=...`;
`planned icons ... learn, quest, review, ...`; exit 0.
Run: `npm test` → still green.

- [ ] **Step 4: Commit**

```bash
git add scripts/asset-report.mjs package.json
git commit -m "feat(assets): asset-report tracker (npm run assets:report)"
```

---

### Task A5: border-image wiring hooks + boot `preload()` (no visual change)

Migrate the dormant `background-image:var(--ui-<x>-image, <fallback>)` hooks in `index.html` to
the PRD §4 mechanism `border-image:var(--f-<id>, none)` on the same class-based elements, keeping
the current gradient/color as the plain (non-var) fallback. Because **no `--f-*` var is ever set
in Phase A** (status-gated loading), every edit is a computed-style no-op — the acceptance check
is pixel-identical rendering.

**Files:**
- Modify: `index.html` (inline `<style>` block)
- Modify: `src/main.js` (add import + boot call)

**Interfaces:**
- Consumes: `preload` from `src/assets.js`; `--f-<id>` var names (`--f-` + id, `-pressed`/
  `-disabled` for states).
- Produces: the class→asset wiring later phases light up by flipping statuses. Mapping:

| element (existing class/id) | asset id | var |
|---|---|---|
| `.big.primary` | `ui-button-primary` | `--f-ui-button-primary` (+ `-pressed` on `:active`) |
| `.big` (plain, incl. `#go-battle`,`#go-endless`) | `ui-button-secondary` | `--f-ui-button-secondary` |
| `#opts button` | `ui-button-neutral` | `--f-ui-button-neutral` (+ `-disabled` on `:disabled`) |
| `#opts button.good` | (unchanged; jade fallback kept) | — |
| `.card,.word-card,.flash-card` | `ui-card-paper` | `--f-ui-card-paper` |
| `.readout` | `ui-card-soft` | `--f-ui-card-soft` |
| `.chip` | `ui-tab` | `--f-ui-tab` |
| `.hud-round` | `ui-badge-mastery` | `--f-ui-badge-mastery` |
| `.mbar` | `ui-progress-track` | `--f-ui-progress-track` |
| `.mbar i` | `ui-progress-fill` | `--f-ui-progress-fill` |
| panel group (`.screen-card,.panel,.shop-card,.readout,.misslist,.scorelist,.quest-row`) | `ui-card-paper` | `--f-ui-card-paper` |

- [ ] **Step 1: Replace the dormant `--ui-*-image` hooks with `--f-*` border-image hooks**

For each existing declaration of the shape `background-image:var(--ui-<x>-image, <fallback>);
background-size:100% 100%;`, keep the literal fallback (gradient/color) as a plain
`background-image:` (or `background-color:`) declaration and **append** a
`border-image:var(--f-<id>, none);` line, dropping the now-unused `background-size:100% 100%;`
where it only served the removed var. Apply to:

  - `.big.primary` (line ~59–60): keep `background-image:linear-gradient(...)`; add
    `border-image:var(--f-ui-button-primary, none);`. After the existing
    `.big:active{transform:scale(.98);}` rule add:
    `.big.primary:active{border-image:var(--f-ui-button-primary-pressed, var(--f-ui-button-primary, none));}`
  - `.big` base (line ~50 area — currently `background-image:var(--ui-button-secondary-image, none)`):
    replace with `border-image:var(--f-ui-button-secondary, none);`
  - `.big.gold` (line ~66): drop the var, keep the literal gold gradient (this element is retired
    in Phase B3, but keep it valid here).
  - `.hud-pill` (line ~164): keep the literal gradient; add nothing (no education frame maps to
    the pill in Phase A — it becomes a flat education surface in B2). Remove the dead
    `var(--ui-badge-image, …)` wrapper, keeping the plain gradient.
  - `.hud-round` (line ~167): keep literal gradient; add `border-image:var(--f-ui-badge-mastery, none);`
  - `.chip` (line ~75 area): replace `var(--ui-button-neutral-image, none)` hook with
    `border-image:var(--f-ui-tag, none);`
  - `#len-custom` hook: delete the dead `background-image:var(--ui-button-neutral-image, none); background-size:100% 100%;`
  - panel group (the `.screen-card,.panel,.shop-card,.readout,.misslist,.scorelist,.quest-row,#opts button,.spk` rule):
    keep `background-color:var(--panel-wash);`; add a sibling rule
    `.screen-card,.panel,.shop-card,.readout,.misslist,.scorelist,.quest-row{border-image:var(--f-ui-card-paper, none);}`
  - `.card`/`.word-card`/`.flash-card` group (line ~143–144): replace
    `var(--ui-word-plaque-image, none)` hook with `border-image:var(--f-ui-card-paper, none);`
  - `.readout` (in addition to panel group): add `border-image:var(--f-ui-card-soft, none);`
  - `#opts button` (answer buttons): append `border-image:var(--f-ui-button-neutral, none);`;
    `#opts button:disabled{ … border-image:var(--f-ui-button-neutral-disabled, var(--f-ui-button-neutral, none));}`
  - `.mbar` (line ~220 area): replace `var(--ui-progress-track-image, none)` hook with
    `border-image:var(--f-ui-progress-track, none);`
  - `.mbar i` (line ~220): keep the literal gold gradient; add `border-image:var(--f-ui-progress-fill, none);`

- [ ] **Step 2: Verify no dormant hooks remain**

Run (Git Bash): `grep -c -- '--ui-.*-image' index.html` → `0`.
Run: `grep -c -- 'var(--f-ui' index.html` → ≥ `11`.

- [ ] **Step 3: Boot `preload()` in `src/main.js`**

Add after the `sprites.js` import (line ~9):

```js
import { preload as preloadAssets } from "./assets.js";
```

At the sprite-preload section (line ~138, next to `loadSprites();`):

```js
loadSprites();
preloadAssets();
```

- [ ] **Step 4: Build + verify pixel-identical**

Run: `npm test` → PASS.
Run: `npm run build` → success. Sanity: `grep -c 'ui-card-paper' dist/app.js` → ≥ `1`.
Run: `npm run serve`, open `http://localhost:8000`: Home/Scope/Battle/Flashcards/Results/Shop
look **identical** to pre-branch; console clean; **no** network requests for `ui-*.png`
(status-gated). Open `index.html` via `file://`: boots and plays.

- [ ] **Step 5: Commit**

```bash
git add index.html src/main.js dist/app.js
git commit -m "feat(assets): border-image wiring + boot preload for education manifest (no visual change)"
```

---

# PHASE B — Education-first UI system (visible; still no painted art)

Phase B changes the **fallbacks themselves** to the education palette, applies visible education
labels, and extends the icon family — all in CSS/markup/JS. Still **no painted PNG art**; every
manifest raster asset stays `planned`. This is the first user-facing change → SHELL bumps in B7.

---

### Task B1: Education color tokens (PRD §4 palette)

**Files:**
- Modify: `index.html` (`:root` block, lines ~16–31)

**Interfaces:**
- Consumes: nothing.
- Produces: education CSS custom properties consumed by B2/B3/B5/B6. New token names (added
  alongside — not deleting — the legacy `--lc-*` names so nothing breaks mid-refactor):
  `--edu-paper, --edu-coral, --edu-jade, --edu-sky, --edu-sun, --edu-ink, --edu-plum,
  --edu-gray, --edu-leaf, --edu-brown`.

- [ ] **Step 1: Add the education palette tokens** — inside `:root{ … }` add:

```css
    /* Education-first palette (PRD §4) — Lucky Cat Learning Journey */
    --edu-paper:#FFF8E8;   /* cards & learning surfaces */
    --edu-coral:#E65A4F;   /* primary actions */
    --edu-jade:#4FAE8A;    /* correct / positive */
    --edu-sky:#6EB6E8;     /* secondary navigation */
    --edu-sun:#F5C85B;     /* stars & small highlights */
    --edu-ink:#243447;     /* primary text */
    --edu-plum:#7B5B8E;    /* review & mastery */
    --edu-gray:#E7E2D9;    /* dividers & disabled */
    --edu-leaf:#78B86B;    /* progress & growth */
    --edu-brown:#7A5A44;   /* illustration outlines */
```

- [ ] **Step 2: Repoint the shared semantic tokens to education values** — replace the
  legacy assignments (lines ~28–31) so downstream `var(--bg/--panel/--ink/...)` reads education
  colours without touching every rule:

```css
    --bg:#FBF3E0; --panel:var(--edu-paper); --card:var(--edu-paper);
    --ink:var(--edu-ink); --muted:#6B7A88;
    --gold:var(--edu-sun); --crimson:var(--edu-coral); --jade:var(--edu-jade);
    --red:var(--edu-coral); --panel-wash:#FFFDF6; --panel-border:var(--edu-gray);
    --chip:#EFE7D4; --chip-on:var(--edu-coral); --chip-ink-on:#FFFFFF;
```

(Keep the `--lc-*` block above for now; B2/B3 remove remaining direct `--lc-*` references. If
`--panel-wash`/`--panel-border` already exist elsewhere, update in place rather than duplicating.)

- [ ] **Step 3: Verify build + quick look**

Run: `npm run build`; `npm run serve` → `http://localhost:8000`. The app now reads warm/paper
instead of dark maroon; text is ink-navy. Layout unchanged. (Some surfaces still look off until
B2/B3 — that is expected; commit anyway as an isolated token step.)

- [ ] **Step 4: Commit**

```bash
git add index.html dist/app.js
git commit -m "feat(ui): add education-first color tokens and repoint semantic palette"
```

---

### Task B2: Restyle surfaces & backgrounds to the education palette

**Files:**
- Modify: `index.html` (`html,body`, screen backgrounds, panels, cards, HUD pills, combo color)

**Interfaces:**
- Consumes: B1 tokens.
- Produces: warm-paper surfaces as the education *fallbacks* (painted art replaces them in Phase C).

- [ ] **Step 1: Base + screen backgrounds** — replace the dark casino gradients:

  - `html,body` (line ~35): `background:var(--bg);` (warm cream) instead of `#1a0d0d`.
  - `#s-home` background (line ~243): change the gradient fallback under `url("assets/bg-home.png")`
    to a soft daylight wash, e.g. `linear-gradient(#FFF8E8,#FDEFD2)`. Keep the `url(...)` layer
    first so painted art still wins when it lands.
  - `#s-battle` background (line ~182): change the gradient fallback under `url("assets/bg-battle.png")`
    to a calm dusk study wash, e.g. `linear-gradient(#EAF2FB,#DCE8F5 60%,#F1E7D6)`. (The battle
    asset id becomes `bg-quest` in Phase C; the current `bg-battle.png` file is legacy and stays
    `planned`/unused.)
  - `.screen.festive` (results/scores/progress/shop): keep the lantern decor but ensure the base
    reads paper, not dark.

- [ ] **Step 2: Panels, cards, readouts, HUD** — retheme the flat fallbacks:

  - panel group (`.screen-card,.panel,.shop-card,.readout,.misslist,.scorelist,.quest-row`):
    `background-color:var(--panel-wash);` with `border:1px solid var(--panel-border);` and a soft
    shadow (`box-shadow:0 2px 8px rgba(36,52,71,.08)`), rounded corners retained.
  - `.card,.word-card,.flash-card` (line ~143): `background-color:var(--edu-paper);` ink-navy text,
    subtle border `var(--edu-gray)`; this is the flashcard/word surface where **Hanzi must be the
    strongest element** — ensure the card's own styling doesn't out-weight the Hanzi (Hanzi font
    size/weight handled in B6 hierarchy check).
  - `.hud-pill` (line ~164): replace the gold gradient with a flat soft surface
    `background:var(--panel-wash); color:var(--edu-ink); border:1px solid var(--edu-gray);` — gold
    demoted. The coin pill keeps the `secondary-coin` glyph (B5) and reads as secondary info.
  - `.hud-round` (line ~167): flat paper disc, `background:var(--panel-wash); border:1px solid
    var(--edu-gray); color:var(--edu-ink);` (mastery badge art replaces later).
  - `#hud .combo` (line ~171): recolor from casino crimson to `color:var(--edu-jade);` (learning
    streak reads positive, not aggressive).
  - `.life-icon` (line ~172): recolor focus hearts to `color:var(--edu-coral);` (calm, not alarm red).

- [ ] **Step 2b: Icon-row discs (home)** — the gold-disc `.icon-btn` (lines ~114–137) currently
  uses gold radial gradient + `btn-*.png` gold-disc art. Replace the disc look with a soft
  education surface: `background:var(--panel-wash); border:1px solid var(--edu-gray);
  color:var(--edu-ink);` and **remove** the `btn-learn/shop/scores/progress/howto/sound.png`
  `background-image` rules (they are casino gold discs). The glyphs come from the sprite in B5.
  Keep the `.muted` grayscale rule for the sound toggle.

- [ ] **Step 3: Verify**

Run: `npm run build`; `npm run serve`. No dark casino surface remains on any screen; gold appears
only as small accents (stars/coin). Console clean; `file://` still boots.

- [ ] **Step 4: Commit**

```bash
git add index.html dist/app.js
git commit -m "feat(ui): retheme surfaces, backgrounds & HUD to education palette (gold demoted)"
```

---

### Task B3: Restyle buttons to the education palette

**Files:**
- Modify: `index.html` (`.big`, `.big.primary`, `.big.gold`, `#opts button`, `.chip`, `.back`)

**Interfaces:**
- Consumes: B1 tokens.
- Produces: coral primary / sky secondary / neutral paper buttons as fallbacks; learning actions
  visually strongest (reinforced in B6).

- [ ] **Step 1: Primary / secondary / neutral**

  - `.big.primary` (lines ~58–63): coral fill —
    `background-color:var(--edu-coral); background-image:linear-gradient(180deg,#EE6D62,#E65A4F);
    color:#FFFFFF; border-color:#C64A40;` keep `border-image:var(--f-ui-button-primary, none);`.
    Larger/bolder than other buttons (learning action = hero).
  - `.big` base (line ~50 area): secondary sky/paper —
    `background-color:var(--panel-wash); color:var(--edu-ink); border:2px solid var(--edu-sky);`
    keep `border-image:var(--f-ui-button-secondary, none);`.
  - `.big.gold` (line ~64): retire the gold look — repoint to the neutral/secondary style
    (`background:var(--panel-wash); border:2px solid var(--edu-gray); color:var(--edu-ink);`) so
    no button reads as a gold casino plate. (Element stays; only its look changes.)
  - `#opts button` (answer choices, line ~187): paper neutral —
    `background-color:var(--edu-paper); color:var(--edu-ink); border:1px solid var(--edu-gray);`
    keep the `border-image` hooks. `#opts button.good` (correct answer, line ~189):
    `background-color:var(--edu-jade); color:#0d2b20;` (positive jade, unchanged semantics).

- [ ] **Step 2: Chips + back**

  - `.chip` (line ~75) / `.chip.on`: paper pill with sky/coral selected state —
    unselected `background:var(--chip); color:var(--edu-ink); border:1px solid var(--edu-gray);`
    selected (`.on`) `background:var(--edu-sky); color:#08324a;`. (Scope selection reads as a
    lesson planner, not casino chips — supports PRD §6 Scope.)
  - `.back` (line ~71): `color:var(--edu-sky);` (calm secondary nav).

- [ ] **Step 3: Verify**

Run: `npm run build`; `npm run serve`. Primary (learning) buttons are coral and clearly dominant;
secondary/neutral are calm paper/sky; no gold plates. `file://` boots.

- [ ] **Step 4: Commit**

```bash
git add index.html dist/app.js
git commit -m "feat(ui): education button system — coral primary, sky secondary, paper neutral"
```

---

### Task B4: Visible education labels (text only; keys preserved)

**Files:**
- Modify: `index.html` (static button/heading/title text)
- Modify: `src/main.js` (dynamic label strings)
- Modify: `src/quests.js` (quest descriptions — visible in quest panel)

**Interfaces:**
- Consumes: nothing.
- Produces: PRD §3 education copy. **No** element `id`, event name, `store` key, quest `id`, or
  scoring value changes.

- [ ] **Step 1: `index.html` static text**

  - `#go-battle` (L340): `<span>Battle · 20</span>` → `<span>Word Quest · 20</span>`.
  - `#r-fight-miss` (L387): `Fight misses` → `Practice Missed Words`.
  - `#r-review` (L386): keep `Review misses` (already education-friendly) or → `Review Words`.
  - `#nw-fight` (L410): `Fight these` → `Practice These`.
  - `#s-shop h2` (L417): `Lucky Shop` → `Collection`; `data-go="shop"` button `title`/`aria-label`
    (L291): `Lucky Shop` → `Collection`.
  - `#s-scores h2` (L396): `High scores` → `Best Sessions`; `data-go="scores"` `title`/`aria-label`
    (L292): `High scores` → `Best Sessions`.
  - Home tagline (L277): replace the coin-first casino line with an education-first line, e.g.
    `Match each word to its meaning —<br>master real-exam HSK vocabulary.` (leads with learning,
    not coins → supports "Home reads educational within 2s").
  - Home hero button (L279, `data-go="scope"`): `Play` → `Learn` (education entry point).

- [ ] **Step 2: `src/main.js` dynamic text** (keep `$("#go-battle")` id, only string changes)

  - L195: `setIconLabel($("#go-battle"), "play", \`Battle · ${len}\`);` →
    `... \`Word Quest · ${len}\`);`
  - L212: same replacement (`Battle · ${scope.sessionLen}` → `Word Quest · ${scope.sessionLen}`).
  - L404 boss prompt: `\`Boss · pick the hanzi for: ${m.main}\`` → `\`Review Challenge · pick the hanzi for: ${m.main}\``.
  - L879 "new best!/best" copy stays (already "best" = Best Session language). Optionally align
    to `Best session!` / `best ${prev}`.
  - `#hud-combo` (L361) numeric `"x"+B.combo` indicator: leave the ×N number (it now reads as a
    Learning Streak count under the jade recolor). No "Combo" word appears here.

- [ ] **Step 3: `src/quests.js` descriptions** (visible in the quest panel; ids unchanged)

  - L7 `combo5`: `desc: "Reach a ×5 combo"` → `desc: "Reach a ×5 learning streak"`.
  - L8 `boss1`: `desc: "Defeat a boss cat"` → `desc: "Complete a Review Challenge"`.
  - (Other descriptions already education-friendly; leave `correct30`, `perfect1`, `review1`, `learn20`.)

- [ ] **Step 4: Verify keys/scores untouched** — confirm no `id=`, `store.get/set` key, quest
  `id`, `EVENT_QUEST` mapping, or scoring number changed.

Run: `npm test` → all green (mechanics/scoring/quests tests unaffected — they key on ids, not
copy). Run: `npm run build`; `npm run serve` → labels read education-first across Home, Scope,
Word Quest, Results, Collection, Best Sessions, Progress.

- [ ] **Step 5: Commit**

```bash
git add index.html src/main.js src/quests.js dist/app.js
git commit -m "feat(ui): education-first visible labels (Word Quest / Collection / Best Sessions / Review Challenge)"
```

---

### Task B5: Extend `ui-icons.svg` to the education icon family + promote required_icons

**Files:**
- Modify: `assets/ui-icons.svg` (add 15 `<symbol>` glyphs)
- Modify: `assets/asset-manifest.json` (move promoted glyphs planned→required)
- Modify: `index.html` (home icon-row `<use>` glyphs)

**Interfaces:**
- Consumes: the existing `<use href="assets/ui-icons.svg#…">` pattern.
- Produces: one rounded educational icon family; `required_icons` grows to include the education
  glyphs (validated by A2's coverage test).

- [ ] **Step 1: Add the 15 education `<symbol>` glyphs** to `assets/ui-icons.svg` (rounded,
  `viewBox="0 0 24 24"`, `stroke="currentColor" stroke-width` consistent with existing glyphs,
  readable at 18 px). Aliases via `<use>` where an equivalent exists; new simple paths otherwise:

```xml
  <symbol id="learn" viewBox="0 0 24 24"><use href="#book"/></symbol>
  <symbol id="quest" viewBox="0 0 24 24"><use href="#target"/></symbol>
  <symbol id="review" viewBox="0 0 24 24"><use href="#repeat"/></symbol>
  <symbol id="retry" viewBox="0 0 24 24"><use href="#repeat"/></symbol>
  <symbol id="headphones" viewBox="0 0 24 24"><use href="#sound"/></symbol>
  <symbol id="secondary-coin" viewBox="0 0 24 24"><use href="#coin"/></symbol>
  <symbol id="focus-heart" viewBox="0 0 24 24"><use href="#heart"/></symbol>
  <symbol id="book" viewBox="0 0 24 24">
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5A1.5 1.5 0 0 1 20 20.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
  </symbol>
  <symbol id="collection" viewBox="0 0 24 24">
    <rect x="4" y="4" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/>
    <rect x="13" y="4" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/>
    <rect x="4" y="13" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/>
    <rect x="13" y="13" width="7" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/>
  </symbol>
  <symbol id="settings" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </symbol>
  <symbol id="calendar" viewBox="0 0 24 24">
    <rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
    <path d="M4 9h16M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </symbol>
  <symbol id="star" viewBox="0 0 24 24">
    <path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 17l-5.3 2.8 1-5.8L3.5 9.7l5.9-.9z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
  </symbol>
  <symbol id="mastery" viewBox="0 0 24 24">
    <circle cx="12" cy="9" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
    <path d="M9 13l-1.5 7 4.5-2.5L16.5 20 15 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
  </symbol>
  <symbol id="next" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></symbol>
  <symbol id="previous" viewBox="0 0 24 24"><use href="#back"/></symbol>
```

(Adjust any `<use href>` target that isn't yet present — `book` is defined above before its
aliases reference it, or reorder so referenced ids precede their users.)

- [ ] **Step 2: Promote the education glyphs to `required_icons`** in `assets/asset-manifest.json`:
  move all 15 ids from `planned_icons` to `required_icons` (leave `planned_icons: []`). This makes
  A2's coverage test assert they all exist in the sprite (now they do) and keeps the two lists
  disjoint.

- [ ] **Step 3: Wire the home icon-row to the sprite glyphs** — in `index.html` the six
  `.icon-btn` buttons (L290–295) currently rely on removed `btn-*.png` art. Give each an inline
  `<svg class="asset-icon"><use href="assets/ui-icons.svg#…"></svg>` child:
  `scope-learn`→`#flashcards`, `shop`→`#collection`, `scores`→`#star` (Best Sessions),
  `progress`→`#progress`, `howto`→`#help`, `home-sound`→`#audio`. Keep `title`/`aria-label`.

- [ ] **Step 4: Verify**

Run: `node scripts/validate-assets.mjs` → exit 0 (all required icons present).
Run: `npm test` → coverage test green.
Run: `npm run build`; `npm run serve` → home icon-row shows the rounded education glyphs on soft
paper discs; no emoji, no gold discs; every glyph legible at 18 px on desktop and 360-wide.

- [ ] **Step 5: Commit**

```bash
git add assets/ui-icons.svg assets/asset-manifest.json index.html dist/app.js
git commit -m "feat(icons): extend ui-icons.svg to education family; promote to required_icons"
```

---

### Task B6: Reduced-motion, 44×44 touch targets, focus states, learning-first hierarchy

**Files:**
- Modify: `index.html` (`<style>` — a11y + hierarchy rules)

**Interfaces:**
- Consumes: B1 tokens.
- Produces: PRD §11 acceptance for motion/targets/hierarchy.

- [ ] **Step 1: Reduced motion** — extend the existing `@media (prefers-reduced-motion:reduce)`
  block (line ~262) to also neutralize button/press transitions and any decorative animation:

```css
  @media (prefers-reduced-motion:reduce){
    .screen.festive::before,.screen.festive::after{animation:none;}
    *{animation-duration:.001ms !important; animation-iteration-count:1 !important;
      transition-duration:.001ms !important;}
  }
```

(The canvas game loop is unaffected; this covers CSS motion only.)

- [ ] **Step 2: 44×44 minimum touch targets** — ensure tappable controls meet 44×44 CSS px:
  `.chip{min-height:44px;}`, `.back{min-height:44px; display:inline-flex; align-items:center;}`,
  `.hud-round{width:44px; height:44px;}` (currently 36), `.spk{min-width:44px; min-height:44px;}`,
  and confirm `.icon-btn` (64×64) and `.big` already exceed 44. Verify at 360×640 nothing clips.

- [ ] **Step 3: Visible focus states** — add a global keyboard-focus ring using an education
  accent (only for keyboard nav, not mouse):

```css
  :focus-visible{outline:3px solid var(--edu-sky); outline-offset:2px; border-radius:4px;}
```

- [ ] **Step 4: Learning-first hierarchy** — make learning actions visually dominant over
  currency/collection:
  - Home: the coral `Learn` hero (B3) is the largest control; the wallet/coin pill row
    (`#home-wallet`) is smaller, muted (`color:var(--muted)`), and ordered after streak/level so
    currency reads as secondary (PRD §5 Home #8).
  - Word Quest: ensure the Hanzi on `.card`/word plaque is the largest, highest-contrast element
    (ink-navy on paper); score/coin pill in HUD stays small and muted. Add/confirm a rule that the
    Hanzi glyph font-size dominates (e.g. the word plaque Hanzi ≥ ~2× the answer-button text).
  - Confirm Thai + English answer text wraps and stays readable at 360 px (line-height, no clip).

- [ ] **Step 5: Verify at mobile widths**

Run: `npm run build`; `npm run serve`. In DevTools device mode check 360×640, 360×800, 390×844,
412×915: core actions visible, nothing clipped, Hanzi dominant, currency secondary, focus ring
shows on Tab, reduced-motion honored (emulate in DevTools Rendering). `file://` boots.

- [ ] **Step 6: Commit**

```bash
git add index.html dist/app.js
git commit -m "feat(a11y): reduced-motion, 44px targets, focus states, learning-first hierarchy"
```

---

### Task B7: Regression sweep + SHELL bump

**Files:**
- Modify: `sw.js` (line 5)

- [ ] **Step 1: Bump the service-worker shell cache** — `sw.js`:
  `const SHELL = "nbhsk-shell-v19";` → `const SHELL = "nbhsk-shell-v20";`.

- [ ] **Step 2: Full verification (evidence before assertions)**

| Command / check | Expected |
|---|---|
| `npm test` | all suites pass (existing + `assets.test.js`, education manifest test) |
| `npm run build` | clean esbuild success; `dist/app.js` regenerated |
| `node scripts/validate-assets.mjs` | exit 0, `checked 30 manifest assets` |
| `npm run assets:report` | 30-row table; `planned=29 integrated=1`; exit 0; `planned icons` line empty/absent |
| `npm run serve` → `http://localhost:8000` | education look on every screen; console clean; no `ui-*.png` fetches |
| open `index.html` via `file://` | boots & plays on fallbacks |
| existing save | with a pre-existing `nbhsk.*` profile (coins/streak/mastery/best) the app loads it unchanged |
| 360×640 / 390×844 / 412×915 | core actions visible, Thai not clipped, no overflow |

Acceptance criteria to confirm (PRD §11): Home reads educational within 2s; learning actions
stronger than currency; Hanzi strongest in play; Thai/English readable; no casino-like screen;
gold minor; education labels visible; emoji replaced by one icon family; core actions visible at
360×640; existing tests pass; `npm run build` succeeds; `file://` works; existing saves load;
SW cache bumped.

- [ ] **Step 3: Commit**

```bash
git add sw.js
git commit -m "chore(sw): bump SHELL to v20 for education-first UI system"
```

Then stop — the branch ships via PR review per repo convention. Do **not** push or merge to `main`.

---

## Phase A + B acceptance (done =)

1. `npm test` green (registry + education-manifest contract tests included).
2. `npm run build` succeeds; `dist/app.js` bundles the education manifest.
3. `node scripts/validate-assets.mjs` exits 0; `npm run assets:report` prints the 30-asset tracker.
4. Every screen reads education-first (warm paper, coral/jade/sky, gold minor) and runs **entirely
   on fallbacks** — no manifest raster asset is `approved`/`integrated`, no PNG is fetched, every
   screen renders if no PNG loads.
5. Education labels visible; one rounded icon family; no casino cues; `nbhsk.*` saves load;
   `file://` + offline PWA work; SHELL bumped to v20.
6. **No painted art added** — only `ui-icons.svg` gained inline vector glyphs.

---

## Follow-on plans — Phases C–E (outline only; separate documents)

These are **blocked on art production** (`art-source/ART-PRODUCTION-ORDER.md`) or depend on C, and
are intentionally not detailed here.

- **Phase C — Approved painted-art integration (blocked on art).** As each asset is generated and
  passes `docs/ART-QA-CHECKLIST.md`, drop the PNG into `assets/`, flip its manifest `status`
  `planned→approved→integrated`, and let the registry light it up (border-image for `ui-surface`,
  `img(id)` for characters/backgrounds/effects). Migrate canvas draw sites (`cat.js`, `sprites.js`,
  `fx.js`) to `img(id)` for the education cat, `bg-quest`, and `fx-correct/perfect/retry`. Validate
  exact dimensions; never bake dynamic text into images; keep every fallback. Production order per
  ART-PRODUCTION-ORDER: `cat-study` → `cat-walk` → `cat-happy` → `bg-home` → `bg-quest` →
  `bg-flashcards` → UI surfaces → icons refinement → effects. Blocked until art lands.

- **Phase D — Screen polish (PRD §6).** Per-screen layout/hierarchy pass once art is integrated:
  Home (Continue Learning hero, daily goal, streak, journey strip, currency last), Scope (lesson
  planner: level cards, notebook tabs, est. session length, coverage), Flashcards (dominant Hanzi,
  pinyin, Thai+English, audio, mastery, Still Learning / Know It), Word Quest (friendly challenge,
  focus hearts, learning-streak feedback, soft stars/stamps), Results (accuracy, words learned,
  missed words, mastery, daily-goal, Review Mistakes as recovery), Collection (earned customization,
  currency secondary), Progress (books, mastery rings, journey milestones, weekly calendar,
  vocabulary garden). Depends on C.

- **Phase E — Validation & release.** Full matrix per PRD §12 (360×640/360×800/390×844/412×915/
  desktop, fresh + existing profile, HTTP + `file://` + offline PWA, no console errors, no missing
  assets, no clipped Thai, no sprite drift); before/after screenshots; `npm test` + `npm run build`;
  **bump SHELL again**; `npm run cap:sync` (Android) + APK smoke (no signing changes); known-issues
  report. Ships via PR, not push-to-main.

---

## Risks / assumptions / blocked items (flagged during planning)

- **A3 before A2's test run:** `test/asset-manifest.test.js` imports `REGISTRY` from
  `src/assets.js`; create `src/assets.js` (A3) before running A2's suite. Both are committed
  separately; a strict executor may reorder A2/A3.
- **`ui-surface` vs `ui-frame`:** the education manifest uses `ui-surface` where the earlier spec
  used `ui-frame`; the registry treats both as frame-able (`FRAME_TYPES`). This is a deliberate
  rename, kept backward-compatible.
- **Field rename `width/height` → `w/h`:** follows the reused §2 contract; the validator is
  updated in lock-step (A2). A repo grep found only the validator and the manifest test reading
  the old fields — no other tooling breaks.
- **Status-gated loading** interprets "preload P0 on boot" as "preload *available* (approved/
  integrated) P0" — required for the no-visual-change guarantee and to avoid 404 spam; Phase C
  flips statuses as art lands.
- **Icon glyphs are markup, not painted art:** adding inline `<symbol>` vectors in B5 is treated
  as UI-system work (permitted in Phase B), distinct from the painted PNG art blocked to Phase C.
  Several glyphs are `<use>` aliases of existing ones (learn→book, quest→target, review/retry→
  repeat, headphones→sound, secondary-coin→coin, focus-heart→heart, previous→back); the rest are
  simple new paths. If the visual reviewer wants bespoke education glyphs (not aliases), that is a
  small art follow-up, not a blocker.
- **Two SHELL bumps:** v20 ships the Phase A+B UI system; Phase E bumps again for the painted-art
  release. Each user-facing change bumps once.
- **Legacy casino art files remain in `assets/`** (`bg-battle.png`, gold `btn-*.png`, shop skins).
  Phase B stops referencing the gold discs; the rest stay `planned`/unused until Phase C reskins or
  retires them. They are not deleted here to avoid touching shop mechanics.
- **Home "Play"→"Learn" and tagline rewrite** are copy choices that materially help the
  "educational within 2s" criterion; if the owner prefers different wording, it is a one-line edit.
- **Blocked:** all of Phase C/D and the release matrix depend on painted art that does not exist
  yet (all assets `planned`). Phase A+B are fully executable today with zero art.

---

## Self-review

- **Spec coverage:** PRD §3 label map → B4 (+ quests.js); §4 palette → B1/B2/B3; §5 hierarchy →
  B6/D; §6 screens → B (labels/surfaces) + D (layout); §7 assets → A2 manifest (contract only,
  art in C); §8 source tree → A1; §9 Codex scope items 1–9,11–14 → A1–A5/B1–B6, items 6/10/15/16
  → C/E; §11 acceptance → B7 checklist; §12 validation → E. All Phase A/B items mapped; C–E
  outlined as follow-ons.
- **Placeholder scan:** every code/CSS/JSON step shows literal content; no "TBD"/"handle edge
  cases"/"similar to".
- **Type/name consistency:** `createAssets`/`preload`/`frameCSS`/`img`/`REGISTRY`, `--f-<id>`,
  `FRAME_TYPES`, `required_icons`/`planned_icons`, and `ui-surface` are used identically across
  A2/A3/A5/B5.
