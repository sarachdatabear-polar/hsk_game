# M0 — Asset Registry & Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Source PRD:** `docs/superpowers/specs/2026-07-05-asset-driven-frontend-design.md` (§2 contract, §3 inventory, §4 integration, §5 tracker, §6 milestone M0, §7 tests). This plan implements **Milestone M0 only**.

**Goal:** Build the asset contract and runtime registry (`src/assets.js`, upgraded `assets/asset-manifest.json`, `scripts/asset-report.mjs`, CSS `border-image` wiring hooks, vitest integrity tests) with **zero visual change** — no art is produced; the game runs entirely on its existing CSS/canvas fallbacks.

**Architecture:** The manifest JSON is the single source of truth. `src/assets.js` bundles it at build time (esbuild's built-in JSON loader — no runtime `fetch`, so `file://` keeps working) and exposes `REGISTRY`, `preload()`, `frameCSS(id)`, `img(id)`. UI frames surface as CSS custom properties (`--f-<id>`) holding a `border-image` shorthand that `assets.js` sets on `<html>` **only after** an asset's image actually loads; `index.html` rules read them as `border-image: var(--f-<id>, none)`, so an unset var is a computed no-op. Canvas art keeps the existing `sprite()`-style null-until-loaded pattern via `img(id)`.

**Tech Stack:** Vanilla JS ES modules, esbuild (IIFE bundle to `dist/app.js`), Vitest 2, inline CSS in `index.html`, service worker (`sw.js`), Node ≥18 for scripts.

## Global Constraints

- Work only inside `game/`. Vanilla JS, no framework, no new runtime dependencies.
- Execute on a feature branch (e.g. `feat/m0-asset-registry`) — **never commit to `main`, never push** (push-to-main deploys to GitHub Pages).
- `file://` constraint: the game must run when `index.html` is opened directly. No runtime `fetch` for required shell data — the manifest is bundled via JSON import.
- **Mandatory fallbacks:** `frameCSS()` returns `"none"` and `img()` returns `null` for unknown / not-approved / missing / still-loading assets; every call site keeps its CSS/canvas fallback in those cases.
- **Zero visual change is an acceptance criterion:** no manifest asset reaches `approved`/`integrated` raster status in M0 (the `ui-icons.svg` sprite, already live, is the only `integrated` entry and is never Image-loaded), so no `--f-*` var is ever set and every screen renders pixel-identical to before.
- **No art files are created in M0** — no PNGs, no new SVG glyphs.
- After changing `src/`, run `npm run build` (`dist/app.js` is git-tracked — commit the rebuilt bundle).
- Bump the `SHELL` cache constant in `sw.js` (`nbhsk-shell-v19` → `nbhsk-shell-v20`) once, in the final task.
- All commands run from `game/` (`C:\Users\sarac\Desktop\HSK\game`).
- Commit messages end with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## Context for the implementer (current state of the repo)

- `src/sprites.js` already implements the null-until-loaded image pattern (`loadSprites()` fire-and-forget, `sprite(name)` returns `null` unless `complete && naturalWidth`). It stays untouched — existing draw sites keep using it; `src/assets.js` is the new loader-of-record for manifest assets and migrating the draw sites is M1 work.
- `assets/asset-manifest.json` **already exists** (version 1, from earlier scaffolding): fields `id/file/type/status/width/height/frames/frameWidth/frameHeight/priority`, plus top-level `status_values` and `required_icons`. Task 2 upgrades it to the PRD §2 contract (rename `width/height` → `w/h`; add `slice`, `states`, `anchor`, `fallback`, `types`, `planned_icons`; full P0 inventory).
- `test/asset-manifest.test.js` already exists and one of its tests ("registers every manifest PNG in the sprite registry" against `SPRITE_NAMES`) will be **replaced** in Task 2 — with the registry as loader-of-record, manifest PNGs are no longer required to appear in `SPRITE_NAMES`.
- `scripts/validate-assets.mjs` already exists (quality gate: statuses, PNG dimensions, sheet frame math, icon symbols). Task 2 updates its field names to the new contract. `scripts/asset-report.mjs` (Task 3) is a separate *tracker* (always exits 0); the validator stays the *gate*.
- `index.html` already contains dormant hooks of the form `background-image: var(--ui-<x>-image, <fallback>)` — nothing ever sets those vars. Task 4 replaces them with the PRD §4 `border-image: var(--f-<id>, none)` mechanism (also never set in M0 → computed no-op).
- `sw.js` PRECACHE is tolerant (`c.add(u).catch(() => {})`) — listing not-yet-existing files is safe by design.
- Icon sprite `assets/ui-icons.svg` currently ships these `<symbol>` ids: audio, back, battle, coin, diamond, flashcards, play, pause, paw, progress, quests, wrong, target, cards, shop, home, street, chart, trophy, help, sound, muted, bell, bell-off, close, infinity, fight, pencil, check, repeat, streak, heart, heart-empty. PRD §3.6 also wants `settings`, `flame`, `star`, `lock` — those are **art authoring** and therefore M1; M0 tracks them in a new manifest `planned_icons` array (`gem` is satisfied by the existing `diamond` glyph).

### Design decisions locked by this plan (implement as written)

1. **Status-gated loading:** `preload()`/`img()` only ever create an `Image` for assets whose `status` is `approved` or `integrated`. Planned assets are never fetched — this makes "M0 renders entirely on fallbacks" a contract guarantee (and avoids ~30 pointless 404s per boot), not an accident of missing files. M1 flips per-asset status as art lands.
2. **Button states as sibling files:** an asset with `"states": ["default","pressed","disabled"]` stores `default` in `file` and the variants in `<file-base>-pressed.png` / `<file-base>-disabled.png`. CSS consumes them as separate vars: `--f-<id>`, `--f-<id>-pressed`, `--f-<id>-disabled` (CSS `border-image` cannot crop a region of one sheet).
3. **`frameCSS` shorthand shape:** `url("assets/<file>") <t> <r> <b> <l> fill / <t>px <r>px <b>px <l>px stretch`, widths divided by optional manifest `scale` (default 1, for @2x art). `slice: null` (unknown until the asset is painted) ⇒ `frameCSS` returns `"none"`.
4. **Field rename `width/height` → `w/h`** to match the PRD §2 contract table verbatim; `scripts/validate-assets.mjs` is updated in the same task so the gate never breaks.
5. **`createAssets(manifest, opts)` factory:** the module's logic is a pure factory (injectable `makeImage` and `root` for tests); the module also exports a singleton bound to the real manifest. No DOM/`Image` access happens at import time, so vitest (node env) can import it safely.

## File Structure

- **Create** `src/assets.js` — registry runtime: `createAssets()` factory + singleton `REGISTRY` / `preload` / `frameCSS` / `img`.
- **Create** `test/assets.test.js` — unit tests for the runtime (fixture manifest + fake images).
- **Rewrite** `assets/asset-manifest.json` — version 2, PRD §2 contract fields, full P0 inventory (§3.1–3.4 + §3.6) as `status: "planned"` entries.
- **Modify** `test/asset-manifest.test.js` — contract-shape tests (unique ids, types, slice/states/fallback rules, sheet math, REGISTRY sync, precache coverage, icons).
- **Modify** `scripts/validate-assets.mjs` — `w`/`h` field names + slice shape check.
- **Create** `scripts/asset-report.mjs` — Asset Tracker table (PRD §5); **modify** `package.json` (`assets:report` script).
- **Modify** `sw.js` — PRECACHE entries for new P0 files; SHELL bump (final task).
- **Modify** `index.html` — replace dormant `--ui-*-image` hooks with `border-image: var(--f-<id>, none)` wiring on the existing class-based elements.
- **Modify** `src/main.js` — call `preload()` at boot next to `loadSprites()`.

---

### Task 1: `src/assets.js` runtime (registry, preload, frameCSS, img)

**Files:**
- Create: `src/assets.js`
- Test: `test/assets.test.js`

**Interfaces:**
- Consumes: `assets/asset-manifest.json` (works with the current v1 shape; fully exercised once Task 2 upgrades it).
- Produces (later tasks and M1 rely on these exact signatures):
  - `createAssets(manifest, { makeImage?, root? }) -> { REGISTRY, preload, frameCSS, img }`
  - `REGISTRY` — `{ [id]: manifestEntry }`
  - `preload(): void` — kicks off loads for P0 assets with status `approved|integrated` (including state variants)
  - `frameCSS(id: string, state = "default"): string` — border-image shorthand once loaded, else `"none"`
  - `img(id: string): HTMLImageElement | null` — loaded Image or `null` (lazy-loads non-P0 on first call)
  - CSS side effect: sets `--f-<id>` / `--f-<id>-<state>` on `<html>` when a `ui-frame` image loads

- [ ] **Step 1: Write the failing tests**

Create `test/assets.test.js`:

```js
import { describe, it, expect } from "vitest";
import { createAssets, REGISTRY, frameCSS, img } from "../src/assets.js";

/* Fake image factory: records every created image; tests flip
   complete/naturalWidth and fire onload() by hand. */
function fakeImages() {
  const created = [];
  const makeImage = () => {
    const image = { complete: false, naturalWidth: 0, onload: null, _src: "" };
    Object.defineProperty(image, "src", {
      set(v) { image._src = v; },
      get() { return image._src; },
    });
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
    { id: "ui-panel", file: "ui-panel.png", type: "ui-frame", status: "approved",
      priority: "P0", slice: [24, 24, 24, 24], fallback: "css:.panel" },
    { id: "ui-button-primary", file: "ui-button-primary.png", type: "ui-frame",
      status: "approved", priority: "P0", slice: [16, 16, 16, 16],
      states: ["default", "pressed", "disabled"], fallback: "css:.big.primary" },
    { id: "ui-tag", file: "ui-tag.png", type: "ui-frame", status: "planned",
      priority: "P0", slice: null, fallback: "css:.chip" },
    { id: "ui-hud-pill", file: "ui-hud-pill.png", type: "ui-frame", status: "approved",
      priority: "P0", slice: null, fallback: "css:.hud-pill" },
    { id: "cat-base-walk", file: "cat-walk.png", type: "sprite-sheet",
      status: "approved", priority: "P0", fallback: "canvas:drawCat" },
    { id: "bg-results", file: "bg-results.png", type: "background",
      status: "approved", priority: "P1", fallback: "css:.screen.festive" },
    { id: "ui-icons", file: "ui-icons.svg", type: "icon-sprite",
      status: "integrated", priority: "P0", fallback: "svg:inline" },
  ],
};

describe("createAssets", () => {
  it("preload() only fetches P0 assets whose status is approved/integrated (PNG only)", () => {
    const { created, makeImage } = fakeImages();
    const A = createAssets(fixture, { makeImage, root: fakeRoot() });
    A.preload();
    const srcs = created.map(i => i._src).sort();
    expect(srcs).toEqual([
      "assets/cat-walk.png",
      "assets/ui-button-primary-disabled.png",
      "assets/ui-button-primary-pressed.png",
      "assets/ui-button-primary.png",
      "assets/ui-hud-pill.png",
      "assets/ui-panel.png",
    ]);
    // ui-tag: planned -> never fetched; bg-results: P1 -> not preloaded;
    // ui-icons: .svg -> never Image-loaded.
  });

  it("img() returns null until the image has actually loaded", () => {
    const { created, makeImage } = fakeImages();
    const A = createAssets(fixture, { makeImage, root: fakeRoot() });
    A.preload();
    expect(A.img("cat-base-walk")).toBeNull();
    const image = created.find(i => i._src === "assets/cat-walk.png");
    image.complete = true;
    image.naturalWidth = 1536;
    expect(A.img("cat-base-walk")).toBe(image);
  });

  it("img() lazy-loads P1 assets on first call and returns null meanwhile", () => {
    const { created, makeImage } = fakeImages();
    const A = createAssets(fixture, { makeImage, root: fakeRoot() });
    expect(A.img("bg-results")).toBeNull();
    expect(created.some(i => i._src === "assets/bg-results.png")).toBe(true);
  });

  it("img() and frameCSS() fall back safely for unknown ids", () => {
    const A = createAssets(fixture, { makeImage: fakeImages().makeImage, root: fakeRoot() });
    expect(A.img("no-such-asset")).toBeNull();
    expect(A.frameCSS("no-such-asset")).toBe("none");
  });

  it("frameCSS() returns 'none' before load, and never fetches planned assets", () => {
    const { created, makeImage } = fakeImages();
    const A = createAssets(fixture, { makeImage, root: fakeRoot() });
    A.preload();
    expect(A.frameCSS("ui-panel")).toBe("none");        // kicked off, not loaded
    expect(A.frameCSS("ui-tag")).toBe("none");           // planned
    expect(created.some(i => i._src === "assets/ui-tag.png")).toBe(false);
  });

  it("frameCSS() returns the border-image shorthand and sets --f-<id> after load", () => {
    const { created, makeImage } = fakeImages();
    const root = fakeRoot();
    const A = createAssets(fixture, { makeImage, root });
    A.preload();
    const image = created.find(i => i._src === "assets/ui-panel.png");
    image.complete = true;
    image.naturalWidth = 96;
    image.onload();
    const expected = 'url("assets/ui-panel.png") 24 24 24 24 fill / 24px 24px 24px 24px stretch';
    expect(A.frameCSS("ui-panel")).toBe(expected);
    expect(root.vars["--f-ui-panel"]).toBe(expected);
  });

  it("state variants resolve to sibling files and their own --f- vars", () => {
    const { created, makeImage } = fakeImages();
    const root = fakeRoot();
    const A = createAssets(fixture, { makeImage, root });
    A.preload();
    const pressed = created.find(i => i._src === "assets/ui-button-primary-pressed.png");
    pressed.complete = true;
    pressed.naturalWidth = 64;
    pressed.onload();
    expect(A.frameCSS("ui-button-primary", "pressed"))
      .toContain('url("assets/ui-button-primary-pressed.png")');
    expect(root.vars["--f-ui-button-primary-pressed"]).toBe(
      A.frameCSS("ui-button-primary", "pressed"));
    expect(A.frameCSS("ui-button-primary")).toBe("none"); // default not loaded yet
  });

  it("a loaded ui-frame with slice:null still returns 'none' (fallback kept)", () => {
    const { created, makeImage } = fakeImages();
    const A = createAssets(fixture, { makeImage, root: fakeRoot() });
    A.preload();
    const image = created.find(i => i._src === "assets/ui-hud-pill.png");
    image.complete = true;
    image.naturalWidth = 48;
    image.onload();
    expect(A.frameCSS("ui-hud-pill")).toBe("none");
  });
});

describe("singleton (bound to the real manifest)", () => {
  it("exposes the manifest as REGISTRY", () => {
    expect(Object.keys(REGISTRY).length).toBeGreaterThan(0);
    expect(REGISTRY["cat-base-walk"].file).toBe("cat-walk.png");
  });

  it("degrades to fallbacks in a DOM-less environment without throwing", () => {
    expect(frameCSS("ui-panel")).toBe("none");
    expect(img("cat-base-walk")).toBeNull();
    expect(img("unknown-id")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- test/assets.test.js`
Expected: FAIL — `Cannot find module '../src/assets.js'` (or equivalent resolve error).

- [ ] **Step 3: Implement `src/assets.js`**

```js
"use strict";
/* Asset registry — single runtime source of truth for production art
   (PRD 2026-07-05 §2/§4). assets/asset-manifest.json is bundled at build
   time by esbuild's built-in JSON loader, so file:// never needs fetch().

   Mandatory fallback contract: frameCSS() returns "none" and img() returns
   null whenever an asset is unknown, not yet approved, missing, or still
   loading — every call site keeps its CSS/canvas fallback in those cases.

   Loading is status-gated: only assets marked approved/integrated in the
   manifest are ever fetched. While every asset is "planned" (M0) the game
   renders 100% on fallbacks by contract.

   ui-frame assets surface as CSS custom properties: when ui-frame "ui-panel"
   finishes loading, --f-ui-panel is set on <html> to a border-image
   shorthand; index.html reads it as  border-image: var(--f-ui-panel, none).
   Button state variants live in sibling files (<base>-pressed.png,
   <base>-disabled.png) and get --f-<id>-pressed / --f-<id>-disabled. */

import manifest from "../assets/asset-manifest.json";

const LOADABLE = new Set(["approved", "integrated"]);

export function createAssets(m, opts = {}) {
  const makeImage = opts.makeImage ||
    (() => (typeof Image === "undefined" ? null : new Image()));
  const rootEl = () =>
    opts.root || (typeof document === "undefined" ? null : document.documentElement);

  const REGISTRY = {};
  for (const a of m.assets) REGISTRY[a.id] = a;

  const images = new Map(); // "id" or "id:state" -> Image (kicked off)
  const frames = new Map(); // same keys -> border-image shorthand once ready

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
    if (!image) return; // DOM-less environment (tests/node)
    image.onload = () => {
      if (a.type !== "ui-frame") return;
      const css = frameShorthand(a, state);
      if (!css) return; // slice unknown -> keep CSS fallback
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
    load(id); // lazy path for P1 assets; no-op when already kicked off or gated
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

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- test/assets.test.js`
Expected: PASS (all tests). Then run the full suite: `npm test` — everything still green (nothing imports `assets.js` yet).

- [ ] **Step 5: Commit**

```bash
git add src/assets.js test/assets.test.js
git commit -m "feat(assets): registry runtime with status-gated loading and mandatory fallbacks"
```

---

### Task 2: Manifest v2 contract + full P0 inventory (+ validator, sw.js precache, contract tests)

**Files:**
- Modify: `assets/asset-manifest.json` (full rewrite, version 2)
- Modify: `test/asset-manifest.test.js` (full rewrite)
- Modify: `scripts/validate-assets.mjs` (field renames + slice check)
- Modify: `sw.js` (PRECACHE additions only — SHELL bump happens in Task 5)

**Interfaces:**
- Consumes: `REGISTRY` from `src/assets.js` (Task 1).
- Produces: the manifest contract every later milestone reads — fields `id, file, type, status, priority, w, h, slice, frames, frameWidth, frameHeight, states, anchor, fallback` (+ optional `scale`), top-level `types`, `status_values`, `required_icons`, `planned_icons`.

- [ ] **Step 1: Rewrite the tests first**

Replace the whole content of `test/asset-manifest.test.js` with:

```js
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { REGISTRY } from "../src/assets.js";

const manifest = JSON.parse(
  readFileSync(new URL("../assets/asset-manifest.json", import.meta.url), "utf8")
);
const uiIconsSvg = readFileSync(
  new URL("../assets/ui-icons.svg", import.meta.url),
  "utf8"
);
const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");

const statusValues = new Set(manifest.status_values);
const types = new Set(manifest.types);

// default file + derived state-variant files (see src/assets.js stateFile)
function allFiles(asset) {
  const extra = (asset.states || [])
    .filter(s => s !== "default")
    .map(s => asset.file.replace(/\.png$/, `-${s}.png`));
  return [asset.file, ...extra];
}

describe("asset manifest contract (PRD §2/§7)", () => {
  it("has a unique id for every asset", () => {
    const ids = manifest.assets.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses only known statuses and types", () => {
    for (const a of manifest.assets) {
      expect(statusValues.has(a.status), `${a.id} has unknown status`).toBe(true);
      expect(types.has(a.type), `${a.id} has unknown type`).toBe(true);
    }
  });

  it("declares slice on every ui-frame (null until measured, else 4 margins)", () => {
    for (const a of manifest.assets.filter(x => x.type === "ui-frame")) {
      expect("slice" in a, `${a.id} missing slice field`).toBe(true);
      if (a.slice !== null) {
        expect(Array.isArray(a.slice) && a.slice.length === 4,
          `${a.id} slice must be [top,right,bottom,left]`).toBe(true);
      }
    }
  });

  it("declares the full state set on stateful button frames", () => {
    for (const a of manifest.assets.filter(x => x.states)) {
      expect(a.states, `${a.id} states`).toEqual(["default", "pressed", "disabled"]);
      expect(a.type, `${a.id} must be a ui-frame`).toBe("ui-frame");
    }
  });

  it("names a fallback routine for every P0 asset", () => {
    for (const a of manifest.assets.filter(x => x.priority === "P0")) {
      expect(typeof a.fallback === "string" && a.fallback.length > 0,
        `${a.id} missing fallback`).toBe(true);
    }
  });

  it("keeps sprite-sheet frame math consistent with declared size", () => {
    for (const a of manifest.assets.filter(x => x.type === "sprite-sheet" && x.w)) {
      expect(a.frameWidth * a.frames, `${a.id} frame math`).toBe(a.w);
      expect(a.frameHeight, `${a.id} frame height`).toBe(a.h);
    }
  });

  it("mirrors the manifest 1:1 into the runtime REGISTRY", () => {
    expect(Object.keys(REGISTRY).sort())
      .toEqual(manifest.assets.map(a => a.id).sort());
  });

  it("pre-caches every P0 PNG (incl. state variants) tolerantly in sw.js", () => {
    const p0 = manifest.assets.filter(
      a => a.priority === "P0" && a.file.endsWith(".png")
    );
    for (const a of p0) {
      for (const f of allFiles(a)) {
        expect(sw, `assets/${f} missing from sw.js PRECACHE`).toContain(`assets/${f}`);
      }
    }
    expect(sw).toContain("c.add(u).catch(() => {})");
  });

  it("includes every required icon id in assets/ui-icons.svg", () => {
    const missing = manifest.required_icons.filter(
      iconId =>
        !new RegExp(
          `<symbol\\b[^>]*\\bid="${iconId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`
        ).test(uiIconsSvg)
    );
    expect(missing).toEqual([]);
  });

  it("keeps planned icons disjoint from required icons", () => {
    for (const id of manifest.planned_icons) {
      expect(manifest.required_icons, `${id} is both planned and required`)
        .not.toContain(id);
    }
  });
});
```

- [ ] **Step 2: Run to verify the new expectations fail against the v1 manifest**

Run: `npm test -- test/asset-manifest.test.js`
Expected: FAIL — at minimum "unknown type" (no `types` array yet → `types.has` false), "missing slice field", "missing fallback", and "planned icons" (`manifest.planned_icons` undefined).

- [ ] **Step 3: Rewrite `assets/asset-manifest.json` (version 2, full P0 inventory)**

Replace the entire file with exactly:

```json
{
  "project": "Lucky Cat HSK",
  "milestone": "Asset-Driven Front-End — M0 contract & registry",
  "version": 2,
  "status_values": ["planned", "concept", "review", "approved", "integrated", "rejected"],
  "types": ["background", "character", "sprite-sheet", "ui-frame", "effect-atlas", "icon-sprite"],
  "assets": [
    { "id": "ui-panel", "file": "ui-panel.png", "type": "ui-frame", "status": "planned", "priority": "P0", "w": null, "h": null, "slice": null, "fallback": "css:.panel" },
    { "id": "ui-button-primary", "file": "ui-button-primary.png", "type": "ui-frame", "status": "planned", "priority": "P0", "w": null, "h": null, "slice": null, "states": ["default", "pressed", "disabled"], "fallback": "css:.big.primary" },
    { "id": "ui-button-secondary", "file": "ui-button-secondary.png", "type": "ui-frame", "status": "planned", "priority": "P0", "w": null, "h": null, "slice": null, "states": ["default", "pressed", "disabled"], "fallback": "css:#opts button.good" },
    { "id": "ui-button-neutral", "file": "ui-button-neutral.png", "type": "ui-frame", "status": "planned", "priority": "P0", "w": null, "h": null, "slice": null, "states": ["default", "pressed", "disabled"], "fallback": "css:#opts button" },
    { "id": "ui-badge", "file": "ui-badge.png", "type": "ui-frame", "status": "planned", "priority": "P0", "w": null, "h": null, "slice": null, "fallback": "css:.hud-round" },
    { "id": "ui-tag", "file": "ui-tag.png", "type": "ui-frame", "status": "planned", "priority": "P0", "w": null, "h": null, "slice": null, "fallback": "css:.chip" },
    { "id": "ui-progress-track", "file": "ui-progress-track.png", "type": "ui-frame", "status": "planned", "priority": "P0", "w": null, "h": null, "slice": null, "fallback": "css:.mbar" },
    { "id": "ui-progress-fill", "file": "ui-progress-fill.png", "type": "ui-frame", "status": "planned", "priority": "P0", "w": null, "h": null, "slice": null, "fallback": "css:.mbar i" },
    { "id": "ui-hud-pill", "file": "ui-hud-pill.png", "type": "ui-frame", "status": "planned", "priority": "P0", "w": null, "h": null, "slice": null, "fallback": "css:.hud-pill" },
    { "id": "ui-nav-bar", "file": "ui-nav-bar.png", "type": "ui-frame", "status": "planned", "priority": "P0", "w": null, "h": null, "slice": null, "fallback": "css:.icon-row" },
    { "id": "ui-icons", "file": "ui-icons.svg", "type": "icon-sprite", "status": "integrated", "priority": "P0", "w": null, "h": null, "fallback": "svg:inline" },

    { "id": "bg-home", "file": "bg-home.png", "type": "background", "status": "planned", "priority": "P0", "w": 1080, "h": 1920, "fallback": "css:body" },
    { "id": "maneki-home", "file": "maneki.png", "type": "character", "status": "planned", "priority": "P0", "w": 512, "h": 512, "anchor": "bottom-center", "fallback": "canvas:maneki-vector" },
    { "id": "cat-portrait", "file": "cat-portrait.png", "type": "character", "status": "planned", "priority": "P0", "w": 512, "h": 512, "anchor": "center", "fallback": "canvas:cat-portrait-vector" },
    { "id": "home-logo", "file": "home-logo.png", "type": "ui-frame", "status": "planned", "priority": "P0", "w": null, "h": null, "slice": null, "fallback": "css:h1" },
    { "id": "home-street-card", "file": "home-street-card.png", "type": "ui-frame", "status": "planned", "priority": "P0", "w": null, "h": null, "slice": null, "fallback": "css:#street-cv" },
    { "id": "btn-battle", "file": "btn-battle.png", "type": "ui-frame", "status": "planned", "priority": "P0", "w": null, "h": null, "slice": null, "states": ["default", "pressed", "disabled"], "fallback": "css:.big.primary" },
    { "id": "btn-flashcards", "file": "btn-flashcards.png", "type": "ui-frame", "status": "planned", "priority": "P0", "w": null, "h": null, "slice": null, "states": ["default", "pressed", "disabled"], "fallback": "css:.big" },

    { "id": "bg-battle", "file": "bg-battle.png", "type": "background", "status": "planned", "priority": "P0", "w": 1024, "h": 512, "fallback": "css:#cv" },
    { "id": "cat-base-walk", "file": "cat-walk.png", "type": "sprite-sheet", "status": "planned", "priority": "P0", "w": 1536, "h": 256, "frames": 6, "frameWidth": 256, "frameHeight": 256, "anchor": "bottom-center", "fallback": "canvas:drawCat" },
    { "id": "cat-base-happy", "file": "cat-happy.png", "type": "sprite-sheet", "status": "planned", "priority": "P0", "w": 1024, "h": 256, "frames": 4, "frameWidth": 256, "frameHeight": 256, "anchor": "bottom-center", "fallback": "canvas:drawCat" },
    { "id": "enemy-scholar", "file": "enemy-scholar.png", "type": "character", "status": "planned", "priority": "P0", "w": null, "h": null, "anchor": "bottom-center", "fallback": "canvas:zombie" },
    { "id": "ui-word-plaque", "file": "ui-word-plaque.png", "type": "ui-frame", "status": "planned", "priority": "P0", "w": null, "h": null, "slice": null, "fallback": "css:.card" },
    { "id": "ui-scroll-banner", "file": "ui-scroll-banner.png", "type": "ui-frame", "status": "planned", "priority": "P0", "w": null, "h": null, "slice": null, "fallback": "dom:hidden-until-ready" },
    { "id": "ui-round-badge", "file": "ui-round-badge.png", "type": "ui-frame", "status": "planned", "priority": "P0", "w": null, "h": null, "slice": null, "fallback": "css:#hud-left" },
    { "id": "ui-boss-hp", "file": "ui-boss-hp.png", "type": "ui-frame", "status": "planned", "priority": "P0", "w": null, "h": null, "slice": null, "fallback": "canvas:boss-hp" },
    { "id": "ui-combo-meter", "file": "ui-combo-meter.png", "type": "ui-frame", "status": "planned", "priority": "P0", "w": null, "h": null, "slice": null, "fallback": "css:#hud .combo" },
    { "id": "ui-combo-ring", "file": "ui-combo-ring.png", "type": "ui-frame", "status": "planned", "priority": "P0", "w": null, "h": null, "slice": null, "fallback": "css:#hud .combo" },

    { "id": "fx-correct", "file": "fx-correct.png", "type": "effect-atlas", "status": "planned", "priority": "P0", "w": null, "h": null, "frames": null, "frameWidth": null, "frameHeight": null, "anchor": "center", "fallback": "canvas:coinBurst" },
    { "id": "fx-wrong", "file": "fx-wrong.png", "type": "effect-atlas", "status": "planned", "priority": "P0", "w": null, "h": null, "frames": null, "frameWidth": null, "frameHeight": null, "anchor": "center", "fallback": "canvas:feedbackEffect" },
    { "id": "fx-critical", "file": "fx-critical.png", "type": "effect-atlas", "status": "planned", "priority": "P0", "w": null, "h": null, "frames": null, "frameWidth": null, "frameHeight": null, "anchor": "center", "fallback": "canvas:perfectBonus" },
    { "id": "fx-level-up", "file": "fx-level-up.png", "type": "effect-atlas", "status": "planned", "priority": "P1", "w": null, "h": null, "frames": null, "frameWidth": null, "frameHeight": null, "anchor": "center", "fallback": "canvas:fireworkRing" },
    { "id": "fx-new-best", "file": "fx-new-best.png", "type": "effect-atlas", "status": "planned", "priority": "P1", "w": null, "h": null, "frames": null, "frameWidth": null, "frameHeight": null, "anchor": "center", "fallback": "canvas:comboFloater" },

    { "id": "bg-market", "file": "bg-market.png", "type": "background", "status": "planned", "priority": "P1", "w": 1024, "h": 512, "fallback": "css:.screen.festive" },
    { "id": "bg-results", "file": "bg-results.png", "type": "background", "status": "planned", "priority": "P1", "w": 1080, "h": 1920, "fallback": "css:.screen.festive" }
  ],
  "required_icons": [
    "heart", "heart-empty", "coin", "diamond", "audio", "muted", "pause",
    "close", "back", "home", "shop", "street", "progress", "quests",
    "flashcards", "battle", "check", "wrong", "paw", "streak",
    "play", "target", "infinity", "cards", "pencil", "repeat", "trophy"
  ],
  "planned_icons": ["settings", "flame", "star", "lock"]
}
```

Notes (do not change without a PRD update):
- Everything is `status: "planned"` except `ui-icons`, which is genuinely live today (`integrated`); its four missing PRD §3.6 glyphs are tracked in `planned_icons` and get authored in M1 (`gem` is satisfied by the existing `diamond` glyph).
- `bg-market` moves P0 → P1 (PRD §3.5 lists the shop backdrop as P1); `ui-badge`, `ui-progress-track`, `ui-progress-fill` move P1 → P0 (PRD §3.1).
- `w`/`h`/`slice`/`frames` are `null` where the PRD does not fix them — they get locked at each asset's `concept` gate in M1; `scripts/validate-assets.mjs` only enforces non-null values.
- `fallback` strings are human-readable pointers for the tracker (CSS selector or canvas routine); tests only require them non-empty for P0.

- [ ] **Step 4: Update `scripts/validate-assets.mjs` to the new field names + slice check**

Three edits:

Edit A — dimension checks (`width`/`height` → `w`/`h`):

```js
  if (asset.w && size.width !== asset.w) {
    fail(`${asset.file} width ${size.width} !== ${asset.w}`);
  }
  if (asset.h && size.height !== asset.h) {
    fail(`${asset.file} height ${size.height} !== ${asset.h}`);
  }
```

Edit B — sprite-sheet math (guard on declared size so `null` dims skip cleanly):

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

Edit C — add a slice shape check inside the main `for (const asset of manifest.assets)` loop (before the `filePath` block):

```js
  if (asset.type === "ui-frame" && asset.slice !== null && asset.slice !== undefined) {
    const ok = Array.isArray(asset.slice) && asset.slice.length === 4 &&
      asset.slice.every(n => Number.isInteger(n) && n >= 0);
    if (!ok) fail(`${asset.id} slice must be [top,right,bottom,left] non-negative ints`);
  }
```

- [ ] **Step 5: Add the new P0 files to `sw.js` PRECACHE**

Insert after the existing `"assets/ui-progress-fill.png",` line (order irrelevant; the loader is tolerant of missing files):

```js
  "assets/ui-tag.png",
  "assets/ui-hud-pill.png",
  "assets/ui-nav-bar.png",
  "assets/ui-scroll-banner.png",
  "assets/ui-round-badge.png",
  "assets/ui-boss-hp.png",
  "assets/ui-combo-meter.png",
  "assets/ui-combo-ring.png",
  "assets/ui-word-plaque.png",
  "assets/home-logo.png",
  "assets/home-street-card.png",
  "assets/btn-battle.png",
  "assets/btn-battle-pressed.png",
  "assets/btn-battle-disabled.png",
  "assets/btn-flashcards.png",
  "assets/btn-flashcards-pressed.png",
  "assets/btn-flashcards-disabled.png",
  "assets/ui-button-primary-pressed.png",
  "assets/ui-button-primary-disabled.png",
  "assets/ui-button-secondary-pressed.png",
  "assets/ui-button-secondary-disabled.png",
  "assets/ui-button-neutral-pressed.png",
  "assets/ui-button-neutral-disabled.png",
  "assets/enemy-scholar.png",
```

(`ui-word-plaque.png` is already listed at line ~43 — if so, skip the duplicate; the test only requires presence.)

Do **not** bump `SHELL` yet — that happens once in Task 5.

- [ ] **Step 6: Run everything**

Run: `npm test`
Expected: PASS — all suites, including the rewritten `asset-manifest.test.js` and Task 1's `assets.test.js`.

Run: `node scripts/validate-assets.mjs`
Expected: exit 0, `asset validation: checked 35 manifest assets`.

- [ ] **Step 7: Commit**

```bash
git add assets/asset-manifest.json test/asset-manifest.test.js scripts/validate-assets.mjs sw.js
git commit -m "feat(assets): manifest v2 contract with full P0 inventory (all planned)"
```

---

### Task 3: `scripts/asset-report.mjs` — the Asset Tracker

**Files:**
- Create: `scripts/asset-report.mjs`
- Modify: `package.json` (add script)

**Interfaces:**
- Consumes: `assets/asset-manifest.json` v2 (Task 2).
- Produces: `npm run assets:report` — human-readable tracker table (id · file · type · status · priority · present?), status/priority summary, pending-icons note. Always exits 0 (it reports; `assets:validate` gates).

- [ ] **Step 1: Write the script**

Create `scripts/asset-report.mjs`:

```js
#!/usr/bin/env node
// Asset Tracker (PRD §5) — prints the manifest as a status table mirroring
// the reference "Asset Tracker" panel. Reporting only: always exits 0.
// The quality gate is scripts/validate-assets.mjs (npm run assets:validate).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "assets", "asset-manifest.json"), "utf8")
);

const rows = manifest.assets.map(a => ({
  id: a.id,
  file: a.file,
  type: a.type,
  status: a.status,
  priority: a.priority,
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

- [ ] **Step 2: Add the npm script**

In `package.json` `"scripts"`, after `"assets:validate"`:

```json
    "assets:report": "node scripts/asset-report.mjs",
```

- [ ] **Step 3: Run and verify the output**

Run: `npm run assets:report`
Expected: a 35-row table; summary line `status: planned=34  integrated=1 | total=35 | P0=31`; `planned icons ... settings, flame, star, lock`; exit code 0. (Legacy placeholder files like `bg-home.png` correctly show `present=yes` while `status=planned` — presence and production-status are independent columns.)

Run: `npm test`
Expected: still all green.

- [ ] **Step 4: Commit**

```bash
git add scripts/asset-report.mjs package.json
git commit -m "feat(assets): asset-report tracker script (npm run assets:report)"
```

---

### Task 4: border-image wiring in `index.html` + boot `preload()` in `main.js`

`index.html` today contains dormant `background-image: var(--ui-<x>-image, <fallback>)` hooks that nothing sets. This task migrates them to the PRD §4 mechanism: `border-image: var(--f-<id>, none)` on the same class-based elements, with the current gradient/color kept as the plain (non-var) fallback declaration. Because no `--f-*` var is ever set in M0 (status-gated loading, Task 1), **every edit below is a computed-style no-op** — the acceptance check is that the app looks pixel-identical.

**Files:**
- Modify: `index.html` (inline `<style>` block, lines ~50–220)
- Modify: `src/main.js` (imports, line ~9; boot, line ~139)

**Interfaces:**
- Consumes: `preload` from `src/assets.js`; `--f-<id>` var names produced by `assets.js` (`--f-` + asset id, with `-pressed`/`-disabled` suffixes for states).
- Produces: the class→asset wiring M1 lights up by flipping manifest statuses. Mapping (also the reference table for M1):

| element (existing class) | asset id | var |
|---|---|---|
| `.panel`-group (`.screen-card,.panel,.shop-card,.readout,.misslist,.scorelist,.quest-row`) | `ui-panel` | `--f-ui-panel` |
| `.big` (plain) | `ui-button-neutral` | `--f-ui-button-neutral` |
| `.big.primary` | `ui-button-primary` | `--f-ui-button-primary` (+ `-pressed` on `:active`) |
| `.chip` | `ui-tag` | `--f-ui-tag` |
| `.card`-group (`.word-card,.flash-card,.card`) | `ui-word-plaque` | `--f-ui-word-plaque` |
| `.hud-pill` | `ui-hud-pill` | `--f-ui-hud-pill` |
| `.hud-round` | `ui-badge` | `--f-ui-badge` |
| `#opts button` | `ui-button-neutral` | `--f-ui-button-neutral` (+ `-disabled` on `:disabled`) |
| `#opts button.good` | `ui-button-secondary` | `--f-ui-button-secondary` |
| `.mbar` | `ui-progress-track` | `--f-ui-progress-track` |
| `.mbar i` | `ui-progress-fill` | `--f-ui-progress-fill` |

(`ui-nav-bar`, `home-logo`, `home-street-card`, `btn-battle`, `btn-flashcards`, `ui-scroll-banner`, `ui-round-badge`, `ui-boss-hp`, `ui-combo-meter`, `ui-combo-ring`, `.big.gold`, `#len-custom` stay manifest-only in M0 — their elements are canvas-drawn, not yet built, or unmapped; M1/M2 wire them.)

- [ ] **Step 1: Apply the CSS edits**

All edits are inside the `<style>` block of `index.html`. Old text shown exactly as in the file.

**E1 — `.big` (line ~50):** replace

```css
    background-image:var(--ui-button-secondary-image, none);
    background-size:100% 100%;
```

with

```css
    border-image:var(--f-ui-button-neutral, none);
```

**E2 — `.big.primary` (line ~58):** replace

```css
    background-image:var(--ui-button-primary-image, linear-gradient(180deg,var(--lc-lacquer) 0%,var(--lc-crimson) 100%));
    background-size:100% 100%;
```

with

```css
    background-image:linear-gradient(180deg,var(--lc-lacquer) 0%,var(--lc-crimson) 100%);
    border-image:var(--f-ui-button-primary, none);
```

and directly after the existing `.big:active{transform:scale(.98);}` rule add:

```css
  .big.primary:active{border-image:var(--f-ui-button-primary-pressed, var(--f-ui-button-primary, none));}
```

**E3 — `.big.gold` (line ~64):** replace

```css
    background-image:var(--ui-button-neutral-image, linear-gradient(180deg,var(--lc-paper) 0%,var(--lc-gold) 45%,var(--lc-dark-gold) 100%));
    background-size:100% 100%;
```

with

```css
    background-image:linear-gradient(180deg,var(--lc-paper) 0%,var(--lc-gold) 45%,var(--lc-dark-gold) 100%);
```

**E4 — `.chip` (line ~75):** replace

```css
    background-image:var(--ui-button-neutral-image, none); background-size:100% 100%;
```

with

```css
    border-image:var(--f-ui-tag, none);
```

**E5 — `#len-custom` (line ~81):** delete the line

```css
    background-image:var(--ui-button-neutral-image, none); background-size:100% 100%;
```

**E6 — panel group (lines ~87–99):** replace the whole rule

```css
  .screen-card,
  .panel,
  .shop-card,
  .readout,
  .misslist,
  .scorelist,
  .quest-row,
  #opts button,
  .spk{
    background-color:var(--panel-wash);
    background-image:var(--ui-panel-image, none);
    background-size:100% 100%;
  }
```

with

```css
  .screen-card,
  .panel,
  .shop-card,
  .readout,
  .misslist,
  .scorelist,
  .quest-row,
  #opts button,
  .spk{
    background-color:var(--panel-wash);
  }
  .screen-card,
  .panel,
  .shop-card,
  .readout,
  .misslist,
  .scorelist,
  .quest-row{
    border-image:var(--f-ui-panel, none);
  }
```

(`#opts button` and `.spk` keep the shared wash color but are wired to button frames / left unwired instead of the panel frame.)

**E7 — card group (lines ~140–146):** replace

```css
    background-image:var(--ui-word-plaque-image, none);
    background-size:100% 100%;
```

with

```css
    border-image:var(--f-ui-word-plaque, none);
```

**E8 — `.hud-pill` (line ~164):** replace

```css
background-image:var(--ui-badge-image, linear-gradient(180deg,var(--lc-paper),var(--lc-gold) 55%,var(--lc-dark-gold)));
    background-size:100% 100%;
```

with

```css
background-image:linear-gradient(180deg,var(--lc-paper),var(--lc-gold) 55%,var(--lc-dark-gold));
    border-image:var(--f-ui-hud-pill, none);
```

**E9 — `.hud-round` (line ~167):** replace

```css
background-image:var(--ui-badge-image, linear-gradient(180deg,var(--lc-paper),var(--lc-gold) 55%,var(--lc-dark-gold)));
    background-size:100% 100%;
```

with

```css
background-image:linear-gradient(180deg,var(--lc-paper),var(--lc-gold) 55%,var(--lc-dark-gold));
    border-image:var(--f-ui-badge, none);
```

**E10 — answer buttons (lines ~187–193):** append `border-image` declarations to the three existing rules:

```css
  #opts button{padding:13px 8px; font-size:15.5px; line-height:1.3; background-color:var(--panel);
    color:var(--ink); border:1px solid var(--panel-border); border-radius:12px; min-height:62px;
    border-image:var(--f-ui-button-neutral, none);}
```

```css
  #opts button.good{background-color:var(--jade); color:#1a3a00; border-image:var(--f-ui-button-secondary, none);}
```

```css
  #opts button:disabled{opacity:.55; border-image:var(--f-ui-button-neutral-disabled, var(--f-ui-button-neutral, none));}
```

**E11 — `.misslist` (line ~198):** in its rule, delete the duplicate hook

```css
background-color:var(--panel-wash); background-image:var(--ui-panel-image, none); background-size:100% 100%;
```

(the E6 group already provides `background-color:var(--panel-wash)` and the border-image; also remove the now-redundant first `background-color:var(--panel);` if both are present, keeping one `background-color:var(--panel-wash)` total).

**E12 — `.scorelist` (line ~207):** same treatment — delete `background-image:var(--ui-panel-image, none); background-size:100% 100%;` from the rule (covered by E6 group).

**E13 — `.mbar` (line ~219):** replace

```css
background-image:var(--ui-progress-track-image, none); background-size:100% 100%;
```

with

```css
border-image:var(--f-ui-progress-track, none);
```

**E14 — `.mbar i` (line ~220):** replace

```css
background-image:var(--ui-progress-fill-image, linear-gradient(180deg,var(--lc-paper),var(--lc-gold) 50%,var(--lc-dark-gold))); background-size:100% 100%;
```

with

```css
background-image:linear-gradient(180deg,var(--lc-paper),var(--lc-gold) 50%,var(--lc-dark-gold)); border-image:var(--f-ui-progress-fill, none);
```

- [ ] **Step 2: Verify the old hooks are gone and the new ones are in**

Run (Git Bash): `grep -c -- '--ui-.*-image' index.html`
Expected: `0`

Run: `grep -c -- '--f-ui' index.html`
Expected: `13` (E1, E2×2, E4, E6, E7, E8, E9, E10×3, E13, E14).

- [ ] **Step 3: Boot `preload()` in `src/main.js`**

Add to the import block (after the `sprites.js` import at line ~9):

```js
import { preload as preloadAssets } from "./assets.js";
```

And at the sprite-preload section (line ~138):

```js
/* ============================== sprite preload ============================== */
loadSprites();
preloadAssets();
```

- [ ] **Step 4: Build and verify no behavior change**

Run: `npm test`
Expected: PASS.

Run: `npm run build`
Expected: success — esbuild's JSON loader inlines the manifest into `dist/app.js`. Sanity-check the bundle picked it up (Git Bash): `grep -c 'ui-combo-ring' dist/app.js` → `1` (or more).

Run: `npm run serve`, open `http://localhost:8000` (the canonical dev check — not a possibly-stale installed PWA):
- Home, scope, battle, flashcards, results, shop screens look **pixel-identical** to before this branch.
- DevTools console: no new errors; **no** network requests for `ui-panel.png`/`ui-tag.png` etc. (status-gated loading means planned assets are never fetched).
- Also open `index.html` directly via `file://` — game boots and plays (no fetch regressions).

- [ ] **Step 5: Commit**

```bash
git add index.html src/main.js dist/app.js
git commit -m "feat(assets): border-image CSS custom-property wiring + boot preload (no visual change)"
```

---

### Task 5: SHELL bump + full regression sweep

**Files:**
- Modify: `sw.js` (line 5)

- [ ] **Step 1: Bump the service-worker shell cache version**

In `sw.js` change:

```js
const SHELL = "nbhsk-shell-v19";
```

to

```js
const SHELL = "nbhsk-shell-v20";
```

- [ ] **Step 2: Full verification (evidence before assertions)**

Run each and confirm output:

| Command | Expected |
|---|---|
| `npm test` | all suites pass (existing ~19 files + `assets.test.js`) |
| `npm run build` | clean esbuild success |
| `node scripts/validate-assets.mjs` | exit 0, `checked 35 manifest assets` |
| `npm run assets:report` | 35-row table, `planned=34 integrated=1`, exit 0 |
| `npm run serve` → `http://localhost:8000` | app identical to pre-branch; console clean |
| open `index.html` via `file://` | boots and plays on fallbacks |

- [ ] **Step 3: Commit**

```bash
git add sw.js
git commit -m "chore(sw): bump SHELL to v20 for M0 asset-contract wiring"
```

Then stop: per repo convention the branch ships via PR review — do **not** push or merge to `main` from this plan.

---

## Acceptance criteria (M0 done =)

1. `npm test` green, including the new registry-integrity tests (unique ids, icon coverage, fallback-on-unknown/missing, precache coverage, REGISTRY⇄manifest sync).
2. `npm run build` succeeds; `dist/app.js` contains the bundled manifest.
3. `npm run assets:report` prints the full 35-asset tracker; `node scripts/validate-assets.mjs` exits 0.
4. **Zero visual change:** every screen renders identically on `localhost:8000` and `file://`; no `--f-*` var is set at runtime; no planned asset is ever fetched.
5. No art files were added — `git status` shows no new files under `assets/` beyond the rewritten manifest.

## Risks & assumptions (flagged during planning)

- **Field rename `width/height` → `w/h`** follows the PRD §2 table verbatim; `validate-assets.mjs` is updated in lock-step (Task 2). Any other tooling reading the old fields would break — a repo grep found only the validator and the manifest test.
- **Status-gated loading** interprets PRD §2 "preload() warms all P0 assets on boot" as "all *available* (approved/integrated) P0 assets" — necessary for M0's no-visual-change guarantee and to avoid 404 spam; M1 flips statuses as art lands.
- **Button states as sibling files** interprets §4 "pressed/disabled slice of the same asset" as same asset *id* with derived filenames, because CSS `border-image` cannot address a sub-region of one sheet.
- **Icon gaps:** `settings`, `flame`, `star`, `lock` are missing from `ui-icons.svg`; they are tracked in `planned_icons` (authored in M1) so the required-icons test stays honest without producing art in M0.
- **P1 enumeration is partial by design:** the manifest carries the full P0 inventory plus already-known P1 entries; the remaining §3.5/§3.7 P1/expansion entries are enumerated by the M2/M3 plans.
- `border-image` widths derive from `slice` px (optional `scale` for @2x art); real values are tuned per asset at M1's concept/review gates — M0 only fixes the mechanism.

## Follow-on plans (separate documents, not detailed here)

- **M1 — VS v1 P0 art integration:** author + gate all P0 assets (§3.1–3.4), add the four planned icon glyphs, §3.8 style-bible reference tiles and palette tokens, fill `slice`/`w`/`h`/`frames`, flip statuses to `integrated`, migrate canvas draw sites (`cat.js`/`sprites.js`/`fx.js`) to `img(id)`, remove gradient chrome from migrated screens.
- **M2 — Other screens (§3.5):** results/shop/generic backgrounds, flashcard face, shop-item and result-panel frames; wire remaining elements (nav bar, home lockup, street card).
- **M3 — Expansion (§3.7):** cat skins, boss sheets, extra backgrounds, street decor, VFX pack, shop previews, marketing set.
