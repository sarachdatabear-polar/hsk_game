# Street Mechanics-Depth v1 (bricks) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-directional learning→build loop: studying earns **bricks**, which the player spends on the Street to raise landmarks scaffold→half→finished, and neighbours move into the home they built.

**Architecture:** A new pure `bricks.js` module holds all earn/cost/build logic (unit-tested). Bricks are a new top-level synced counter, earned in `main.js` at the battle results sites exactly like coins. Per-landmark construction stage moves from a level-derived function into stored `streetLayout.builtStages` (schema v4→v5 migration seeds it from current level so nothing regresses). `street-screen.js` renders a bricks chip + tap-to-build affordance; neighbour move-in reties from "hit level N" to "you finished their building."

**Tech Stack:** Vanilla JS ES modules, esbuild bundle, vitest (`npm test` = `vitest run`), eslint (`npm run lint`), esbuild build (`npm run build`). Node via nvm (`. ~/.nvm/nvm.sh` if `node` missing).

## Global Constraints

- **One-directional coupling:** learning produces bricks; the Street only reads/spends a brick balance. The Street NEVER writes mastery, never gates learning behind Street state.
- **Kind guardrail:** bricks only ever accrue — no decay, no timers, no loss, no negative/"behind" copy. Building is always optional.
- **`main.js` frozen at current scope:** only additions are (a) a `bricks` counter var, (b) a mastery snapshot at battle start, (c) brick-award lines at the existing result sites, (d) two deps passed to `createStreetScreen`. No new feature logic in `main.js`.
- **Persistence via `src/storage.js`** (`store.get`/`store.set`); new synced key added to `SYNC_KEYS` in `merge.js`.
- **Stored-shape change ⇒ migration:** bump `CURRENT_SCHEMA_VERSION` 4→5 + append a guarded `{to:5}` ladder entry. Bump `STREET_LAYOUT_VERSION` 4→5 (every prior streetLayout field addition did).
- **Thai strings tagged `TH-REVIEW`** per existing i18n convention; values are machine drafts pending Jordan's native review.
- **After `src/` changes run `npm run build`.** Never mask the test exit code.
- **Constants:** landmarks = `BUILDINGS` (`lantern-post` lv5, `coin-bank` lv10, `tailor` lv20, `kitten-cafe` lv30, `emperor-gate` lv50). Neighbours (`street-neighbours.js NEIGHBOURS`): tiao→coin-bank, pang→tailor, wen→kitten-cafe. `BRICK_STAGE_COST = [8, 12, 16]`. Earn = `2 × masteredThisRound + (completedRound ? 1 : 0)`.

---

### Task 1: `bricks.js` pure module (earn / cost / build logic)

**Files:**
- Create: `src/bricks.js`
- Test: `test/bricks.test.js`

**Interfaces:**
- Consumes: `BUILDINGS` from `src/street.js` (`[{lv,id,name}]`).
- Produces:
  - `BRICK_STAGE_COST: number[]` — `[8,12,16]`, index = stage being entered.
  - `landmarkUnlockLevel(id: string): number`
  - `landmarkBuildCost(stage: number): number|null` — cost to go `stage`→`stage+1`; `null` if `stage>=3` or invalid.
  - `landmarkBuildable(level: number, id: string, builtStages: object): boolean`
  - `bricksForRound({mastered?: number, completed?: boolean}): number`
  - `advanceLandmark(builtStages: object, id: string, bricks: number, level: number): {ok: boolean, builtStages: object, bricks: number, reachedStage: number}` — pure; on failure returns the SAME `builtStages` reference and unchanged bricks; on success returns a NEW `builtStages` object and decremented bricks.

- [ ] **Step 1: Write the failing test**

```js
// test/bricks.test.js
import { describe, it, expect } from "vitest";
import {
  BRICK_STAGE_COST, landmarkUnlockLevel, landmarkBuildCost,
  landmarkBuildable, bricksForRound, advanceLandmark,
} from "../src/bricks.js";

describe("cost model", () => {
  it("stage costs are 8/12/16 to enter stages 1/2/3", () => {
    expect(BRICK_STAGE_COST).toEqual([8, 12, 16]);
    expect(landmarkBuildCost(0)).toBe(8);
    expect(landmarkBuildCost(1)).toBe(12);
    expect(landmarkBuildCost(2)).toBe(16);
    expect(landmarkBuildCost(3)).toBeNull(); // already finished
  });
  it("maps unlock levels from BUILDINGS", () => {
    expect(landmarkUnlockLevel("coin-bank")).toBe(10);
    expect(landmarkUnlockLevel("emperor-gate")).toBe(50);
    expect(landmarkUnlockLevel("nope")).toBe(Infinity);
  });
});

describe("bricksForRound", () => {
  it("gives 2 per mastered word plus 1 for a completed round", () => {
    expect(bricksForRound({ mastered: 3, completed: true })).toBe(7);
    expect(bricksForRound({ mastered: 0, completed: true })).toBe(1);
    expect(bricksForRound({ mastered: 2, completed: false })).toBe(4);
    expect(bricksForRound({})).toBe(0);
    expect(bricksForRound({ mastered: -5, completed: false })).toBe(0); // clamps
  });
});

describe("landmarkBuildable", () => {
  it("is buildable only at/above unlock level and below stage 3", () => {
    expect(landmarkBuildable(10, "coin-bank", {})).toBe(true);          // level ok, stage 0
    expect(landmarkBuildable(9, "coin-bank", {})).toBe(false);          // below unlock
    expect(landmarkBuildable(99, "coin-bank", { "coin-bank": 3 })).toBe(false); // finished
  });
});

describe("advanceLandmark", () => {
  it("spends the stage cost and advances one stage, without mutating inputs", () => {
    const before = { "coin-bank": 0 };
    const res = advanceLandmark(before, "coin-bank", 20, 10);
    expect(res.ok).toBe(true);
    expect(res.reachedStage).toBe(1);
    expect(res.bricks).toBe(12);                 // 20 - 8
    expect(res.builtStages).toEqual({ "coin-bank": 1 });
    expect(before).toEqual({ "coin-bank": 0 });  // original untouched
  });
  it("refuses when too few bricks", () => {
    const before = { "coin-bank": 0 };
    const res = advanceLandmark(before, "coin-bank", 5, 10);
    expect(res.ok).toBe(false);
    expect(res.bricks).toBe(5);
    expect(res.builtStages).toBe(before);        // same reference on failure
  });
  it("refuses when below unlock level or already finished", () => {
    expect(advanceLandmark({}, "coin-bank", 99, 9).ok).toBe(false);
    expect(advanceLandmark({ "coin-bank": 3 }, "coin-bank", 99, 99).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `. ~/.nvm/nvm.sh; npx vitest run test/bricks.test.js`
Expected: FAIL — `Cannot find module '../src/bricks.js'`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/bricks.js
"use strict";
// Pure model for the "build the neighbourhood" loop: studying earns bricks
// (main.js awards them at the results screen, like coins), and the player
// spends them to advance a landmark's construction stage. Nothing here reads
// storage, the DOM, or the clock — main.js/street-screen.js wire it up.
import { BUILDINGS } from "./street.js";

export const BRICK_STAGE_COST = [8, 12, 16]; // to enter stage 1, 2, 3

export function landmarkUnlockLevel(id) {
  const b = BUILDINGS.find(x => x.id === id);
  return b ? b.lv : Infinity;
}

export function landmarkBuildCost(stage) {
  const s = Number(stage) || 0;
  return s >= 0 && s < 3 ? BRICK_STAGE_COST[s] : null;
}

export function landmarkBuildable(level, id, builtStages) {
  const stage = Number((builtStages || {})[id]) || 0;
  return (Number(level) || 0) >= landmarkUnlockLevel(id) && stage < 3;
}

export function bricksForRound({ mastered = 0, completed = false } = {}) {
  const m = Math.max(0, Math.floor(Number(mastered) || 0));
  return m * 2 + (completed ? 1 : 0);
}

export function advanceLandmark(builtStages, id, bricks, level) {
  const b = Number(bricks) || 0;
  const stage = Number((builtStages || {})[id]) || 0;
  if (!landmarkBuildable(level, id, builtStages)) {
    return { ok: false, builtStages, bricks: b, reachedStage: stage };
  }
  const cost = landmarkBuildCost(stage);
  if (cost === null || b < cost) {
    return { ok: false, builtStages, bricks: b, reachedStage: stage };
  }
  const next = { ...(builtStages || {}), [id]: stage + 1 };
  return { ok: true, builtStages: next, bricks: b - cost, reachedStage: stage + 1 };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `. ~/.nvm/nvm.sh; npx vitest run test/bricks.test.js`
Expected: PASS (all tests green).

- [ ] **Step 5: Commit**

```bash
git add src/bricks.js test/bricks.test.js
git commit -m "feat(bricks): pure earn/cost/build model for street landmarks"
```

---

### Task 2: `masteredCount` helper in `mastery.js`

**Files:**
- Modify: `src/mastery.js` (add one exported function)
- Test: `test/mastery.test.js` (append a describe block)

**Interfaces:**
- Consumes: existing `isMastered(store, hanzi)` in the same file.
- Produces: `masteredCount(store: object): number` — count of words currently mastered (streak `r >= 3`). Used by `main.js` to derive "words mastered this round" via a before/after snapshot.

- [ ] **Step 1: Write the failing test**

```js
// test/mastery.test.js — append
import { masteredCount } from "../src/mastery.js";

describe("masteredCount", () => {
  it("counts words whose current streak is >= 3", () => {
    const store = {
      "火": { s: 5, k: 5, r: 4 },  // mastered
      "水": { s: 3, k: 3, r: 3 },  // mastered
      "土": { s: 2, k: 1, r: 1 },  // not yet
    };
    expect(masteredCount(store)).toBe(2);
  });
  it("is 0 for empty/undefined stores", () => {
    expect(masteredCount({})).toBe(0);
    expect(masteredCount(undefined)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `. ~/.nvm/nvm.sh; npx vitest run test/mastery.test.js`
Expected: FAIL — `masteredCount is not a function` / import undefined.

- [ ] **Step 3: Write minimal implementation**

```js
// src/mastery.js — add after isMastered
export function masteredCount(store) {
  const s = store || {};
  let n = 0;
  for (const h in s) if (isMastered(s, h)) n++;
  return n;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `. ~/.nvm/nvm.sh; npx vitest run test/mastery.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/mastery.js test/mastery.test.js
git commit -m "feat(mastery): masteredCount for per-round brick derivation"
```

---

### Task 3: `streetLayout.builtStages` field (default + normalize + version bump)

**Files:**
- Modify: `src/street.js` — `STREET_LAYOUT_VERSION` (line 130), `defaultStreetLayout` (lines 135-141), add `normBuiltStages` helper (near line 143-160), `normalizeStreetLayout` output (lines 185-197).
- Test: `test/street.test.js` (append)

**Interfaces:**
- Consumes: `BUILDINGS` (already in this file).
- Produces: `streetLayout.builtStages` — `{[landmarkId]: 1|2|3}` (zeros omitted for compactness), present in both `defaultStreetLayout()` and every `normalizeStreetLayout()` result. `STREET_LAYOUT_VERSION === 5`.

- [ ] **Step 1: Write the failing test**

```js
// test/street.test.js — append
import { normalizeStreetLayout, defaultStreetLayout, STREET_LAYOUT_VERSION } from "../src/street.js";

describe("builtStages normalization", () => {
  it("defaults to an empty object and stamps version 5", () => {
    expect(STREET_LAYOUT_VERSION).toBe(5);
    expect(defaultStreetLayout().builtStages).toEqual({});
  });
  it("clamps to 0-3, drops zeros and unknown ids", () => {
    const out = normalizeStreetLayout(
      { builtStages: { "coin-bank": 2, "tailor": 9, "bogus": 3, "lantern-post": 0 } }, []);
    expect(out.builtStages).toEqual({ "coin-bank": 2, "tailor": 3 });
  });
  it("tolerates a missing/garbage builtStages", () => {
    expect(normalizeStreetLayout({}, []).builtStages).toEqual({});
    expect(normalizeStreetLayout({ builtStages: "x" }, []).builtStages).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `. ~/.nvm/nvm.sh; npx vitest run test/street.test.js`
Expected: FAIL — `STREET_LAYOUT_VERSION` is 4 / `builtStages` undefined.

- [ ] **Step 3: Write minimal implementation**

In `src/street.js`, bump the version constant (line 130):

```js
export const STREET_LAYOUT_VERSION = 5;
```

Add `builtStages: {}` to `defaultStreetLayout()`'s returned object (in the line with `metNeighbours: []`):

```js
    name: "", savedLayouts: [], keepsakes: [], setsCompleted: [], lastVisitDay: null,
    metNeighbours: [], builtStages: {},
```

Add the `normBuiltStages` helper alongside the other `norm*` helpers:

```js
function normBuiltStages(v) {
  const raw = v && typeof v === "object" ? v : {};
  const out = {};
  for (const b of BUILDINGS) {
    const s = Math.min(3, Math.max(0, Math.round(Number(raw[b.id]) || 0)));
    if (s > 0) out[b.id] = s;
  }
  return out;
}
```

Add `builtStages` to the `normalizeStreetLayout` output object (in the block with `metNeighbours: normMetNeighbours(raw.metNeighbours),`):

```js
    metNeighbours: normMetNeighbours(raw.metNeighbours),
    builtStages: normBuiltStages(raw.builtStages),
    lastVisitDay: normLastVisitDay(raw.lastVisitDay),
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `. ~/.nvm/nvm.sh; npx vitest run test/street.test.js`
Expected: PASS. (If other tests hardcode `v: 4` for a street layout, update them to `5` — run `npx vitest run` to find any and fix.)

- [ ] **Step 5: Commit**

```bash
git add src/street.js test/street.test.js
git commit -m "feat(street): builtStages field + normalize, streetLayout v4->v5"
```

---

### Task 4: `landmarkStage` reads stored stage

**Files:**
- Modify: `src/street-construction.js` — `landmarkStage` (lines ~14-22); drop the now-unused `span`/`projectStage`/`BUILDINGS` imports if unreferenced. `constructionSprite` UNCHANGED.
- Test: `test/street-construction.test.js` — rewrite the `landmarkStage` describe block.

**Interfaces:**
- Produces: `landmarkStage(builtStages: object, id: string): number` — returns the stored stage (0–3, clamped) for `id`. **Signature changed** from `(level, id)`. Callers: `street-screen.js` (Task 9).

- [ ] **Step 1: Write the failing test**

Replace the entire `describe("landmarkStage", ...)` block (lines 4-27) with:

```js
describe("landmarkStage (stored)", () => {
  it("returns the stored stage for a landmark", () => {
    expect(landmarkStage({ "tailor": 2 }, "tailor")).toBe(2);
    expect(landmarkStage({ "coin-bank": 3 }, "coin-bank")).toBe(3);
  });
  it("is 0 for an unbuilt or unknown landmark", () => {
    expect(landmarkStage({}, "tailor")).toBe(0);
    expect(landmarkStage({ "tailor": 1 }, "nope")).toBe(0);
  });
  it("clamps garbage to 0-3", () => {
    expect(landmarkStage({ "tailor": 9 }, "tailor")).toBe(3);
    expect(landmarkStage(null, "tailor")).toBe(0);
    expect(landmarkStage({ "tailor": -2 }, "tailor")).toBe(0);
  });
});
```

(Leave the `constructionSprite` describe block untouched.)

- [ ] **Step 2: Run test to verify it fails**

Run: `. ~/.nvm/nvm.sh; npx vitest run test/street-construction.test.js`
Expected: FAIL — old `landmarkStage(level,id)` logic returns wrong values for the new stored-stage calls.

- [ ] **Step 3: Write minimal implementation**

Replace `span` + `landmarkStage` (lines 8-22) with just:

```js
export function landmarkStage(builtStages, id) {
  const raw = builtStages && typeof builtStages === "object" ? builtStages[id] : 0;
  return Math.min(3, Math.max(0, Math.round(Number(raw) || 0)));
}
```

Remove the now-unused imports at the top if ESLint flags them:

```js
// DELETE if unreferenced after the change:
// import { BUILDINGS } from "./street.js";
// import { projectStage } from "./street-project.js";
```

(Keep `constructionSprite` exactly as-is.)

- [ ] **Step 4: Run test + lint to verify**

Run: `. ~/.nvm/nvm.sh; npx vitest run test/street-construction.test.js && npm run lint`
Expected: tests PASS, lint clean (no unused-import errors).

- [ ] **Step 5: Commit**

```bash
git add src/street-construction.js test/street-construction.test.js
git commit -m "feat(street): landmarkStage reads stored stage instead of level"
```

---

### Task 5: Migration v4→v5 (seed builtStages from level)

**Files:**
- Modify: `src/migrations.js` — `CURRENT_SCHEMA_VERSION` (line 18), add imports (`BUILDINGS`, `levelForXp`), append `{to:5}` entry to `MIGRATIONS` (before the closing `];` at line 107).
- Test: `test/migrations.test.js` (append)

**Interfaces:**
- Consumes: `normalizeStreetLayout` (already imported), `BUILDINGS` from `street.js`, `levelForXp` from `growth.js`.
- Produces: `CURRENT_SCHEMA_VERSION === 5`; a guarded migration that seeds `shop.streetLayout.builtStages[id] = level >= BUILDINGS[id].lv ? 3 : 0`.

- [ ] **Step 1: Write the failing test**

```js
// test/migrations.test.js — append. (Follow the file's existing fake-storage helper;
// if none, use this inline one.)
import { runMigrations, CURRENT_SCHEMA_VERSION } from "../src/migrations.js";

function fakeStorage(seed = {}) {
  const m = new Map(Object.entries(seed));
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
    _get: k => m.get(k),
  };
}

describe("migration v4->v5 builtStages", () => {
  it("bumps CURRENT_SCHEMA_VERSION to 5", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(5);
  });
  it("seeds finished landmarks from level, leaves unreached at 0", () => {
    // A level-25 player (xp mapped) has passed lantern-post(5)/coin-bank(10)/tailor(20).
    const s = fakeStorage({
      "nbhsk.schemaVersion": "4",
      "nbhsk.xp": JSON.stringify(999999),      // clearly past level 30 (see note)
      "nbhsk.shop": JSON.stringify({ owned: [], streetLayout: { v: 4 } }),
    });
    runMigrations(s);
    const shop = JSON.parse(s._get("nbhsk.shop"));
    // High xp => all five finished.
    expect(shop.streetLayout.builtStages).toEqual({
      "lantern-post": 3, "coin-bank": 3, "tailor": 3, "kitten-cafe": 3, "emperor-gate": 3,
    });
  });
  it("is a no-op on corrupt shop data (never throws)", () => {
    const s = fakeStorage({ "nbhsk.schemaVersion": "4", "nbhsk.shop": "{not json" });
    expect(() => runMigrations(s)).not.toThrow();
  });
});
```

> Note for the implementer: pick the `nbhsk.xp` value so `levelForXp(xp)` clears level 50 — read `growth.js`'s XP curve and use a value safely above the level-50 threshold (the test asserts all five finished). If you prefer a mid-level assertion, compute a value that lands between two unlock levels and assert the split.

- [ ] **Step 2: Run test to verify it fails**

Run: `. ~/.nvm/nvm.sh; npx vitest run test/migrations.test.js`
Expected: FAIL — `CURRENT_SCHEMA_VERSION` is 4 / builtStages undefined.

- [ ] **Step 3: Write minimal implementation**

At the top of `src/migrations.js`, extend the imports:

```js
import { normalizeStreetLayout, BUILDINGS } from "./street.js";
import { levelForXp } from "./growth.js";
```

Bump the version (line 18):

```js
export const CURRENT_SCHEMA_VERSION = 5;
```

Append this entry to the `MIGRATIONS` array (after the `{to:4,...}` object, before `];`):

```js
  {
    to: 5,
    up(storage) {
      // v4->v5: streetLayout gains builtStages (per-landmark construction
      // stage, now player-driven via bricks instead of level-derived). Seed
      // each landmark from the player's CURRENT level so nothing regresses:
      // anything already past its unlock level stays finished (3), the rest
      // start at 0 and open for brick-building. Every step guarded.
      let level = 0;
      try {
        const rawXp = storage.getItem("nbhsk.xp");
        if (rawXp !== null) level = levelForXp(Number(JSON.parse(rawXp)) || 0);
      } catch (e) { level = 0; }
      let shop;
      try {
        const raw = storage.getItem("nbhsk.shop");
        if (raw === null) return;
        shop = JSON.parse(raw);
      } catch (e) { return; }
      if (!shop || typeof shop !== "object") return;
      const owned = Array.isArray(shop.owned) ? shop.owned : [];
      const builtStages = {};
      for (const b of BUILDINGS) builtStages[b.id] = level >= b.lv ? 3 : 0;
      try {
        shop.streetLayout = normalizeStreetLayout({ ...(shop.streetLayout || {}), builtStages }, owned);
      } catch (e) { return; }
      try { storage.setItem("nbhsk.shop", JSON.stringify(shop)); } catch (e) {}
    },
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `. ~/.nvm/nvm.sh; npx vitest run test/migrations.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/migrations.js test/migrations.test.js
git commit -m "feat(migrations): v4->v5 seeds builtStages from level"
```

---

### Task 6: Sync — `bricks` key + `builtStages` merge

**Files:**
- Modify: `src/merge.js` — `SYNC_KEYS` (line 13), add `mergeBricks` (near `mergeWallet` line 23), add `bricks` to `mergeAll` return (line 279-294), add `builtStages` fold in `mergeShop` (line 134-143); extend the `street.js` import (line 10) with `BUILDINGS`.
- Test: `test/merge.test.js` (append)

**Interfaces:**
- Consumes: `BUILDINGS`.
- Produces: `mergeBricks(a,b): number` (= `Math.max(num(a),num(b),0)`); `"bricks"` in `SYNC_KEYS`; `mergeAll(...).bricks`; per-landmark `max` fold of `builtStages` inside merged `streetLayout`.

- [ ] **Step 1: Write the failing test**

```js
// test/merge.test.js — append
import { mergeBricks, SYNC_KEYS, mergeAll, mergeShop } from "../src/merge.js";

describe("bricks sync", () => {
  it("bricks is a synced key and folds by max", () => {
    expect(SYNC_KEYS).toContain("bricks");
    expect(mergeBricks(30, 12)).toBe(30);
    expect(mergeBricks(undefined, 7)).toBe(7);
    expect(mergeBricks(-5, 0)).toBe(0);
    expect(mergeAll({ bricks: 5 }, { bricks: 40 }).bricks).toBe(40);
  });
});

describe("builtStages merge (per-landmark max)", () => {
  it("takes the higher stage per landmark across devices", () => {
    const a = { owned: [], streetLayout: { v: 5, builtStages: { "coin-bank": 3, "tailor": 1 } } };
    const b = { owned: [], streetLayout: { v: 5, builtStages: { "coin-bank": 1, "tailor": 2 } } };
    const out = mergeShop(a, b);
    expect(out.streetLayout.builtStages).toEqual({ "coin-bank": 3, "tailor": 2 });
  });
  it("tolerates a legacy cloud row with no builtStages", () => {
    const a = { owned: [], streetLayout: { v: 5, builtStages: { "tailor": 2 } } };
    const b = { owned: [], streetLayout: { v: 4 } };
    expect(mergeShop(a, b).streetLayout.builtStages).toEqual({ "tailor": 2 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `. ~/.nvm/nvm.sh; npx vitest run test/merge.test.js`
Expected: FAIL — `mergeBricks` undefined / `bricks` not in SYNC_KEYS / builtStages missing.

- [ ] **Step 3: Write minimal implementation**

Extend the import (line 10):

```js
import { normalizeStreetLayout, STREET_LAYOUT_VERSION, BUILDINGS } from "./street.js";
```

Add `"bricks"` to `SYNC_KEYS` (line 13-14):

```js
export const SYNC_KEYS = ["mastery", "xp", "daily", "quests", "monthly",
  "wallet", "bricks", "freezes", "shop", "stickers", "best"];
```

Add `mergeBricks` next to `mergeWallet`:

```js
export function mergeBricks(a, b) { return Math.max(num(a), num(b), 0); }
```

Add `bricks` to the `mergeAll` return object (right after the `wallet:` line, line 285):

```js
    bricks: mergeBricks(l.bricks, c.bricks),
```

In `mergeShop`, build the per-landmark max fold and include it in the `normalizeStreetLayout` call. Insert just before `const streetLayout = normalizeStreetLayout({` (line 134):

```js
  const builtStages = {};
  for (const bd of BUILDINGS) {
    const s = Math.max(num((la.builtStages || {})[bd.id]), num((lb.builtStages || {})[bd.id]));
    if (s > 0) builtStages[bd.id] = Math.min(3, s);
  }
```

Then add `builtStages,` inside the object passed to `normalizeStreetLayout` (alongside `metNeighbours: [...]`):

```js
    metNeighbours: [...new Set([...(la.metNeighbours || []), ...(lb.metNeighbours || [])])],
    builtStages,
    lastVisitDay: maxDay(la.lastVisitDay, lb.lastVisitDay),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `. ~/.nvm/nvm.sh; npx vitest run test/merge.test.js`
Expected: PASS. (If a `mergeAll` snapshot/shape test asserts an exact key set, add `bricks` there too.)

- [ ] **Step 5: Commit**

```bash
git add src/merge.js test/merge.test.js
git commit -m "feat(sync): bricks key + per-landmark builtStages max-merge"
```

---

### Task 7: Neighbour move-in triggers on finished build

**Files:**
- Modify: `src/street-neighbours.js` — add `newlyMovedInByBuild`.
- Test: `test/street-neighbours.test.js` (append)

**Interfaces:**
- Produces: `newlyMovedInByBuild(builtStages: object, met: string[]): string[]` — neighbour ids whose `landmarkId` is at stage 3 and not already in `met`. Replaces the level-based `newlyMovedIn` at the Street call site (Task 9).

- [ ] **Step 1: Write the failing test**

```js
// test/street-neighbours.test.js — append
import { newlyMovedInByBuild } from "../src/street-neighbours.js";

describe("newlyMovedInByBuild", () => {
  it("returns neighbours whose landmark is finished and not yet met", () => {
    expect(newlyMovedInByBuild({ "coin-bank": 3 }, [])).toEqual(["tiao"]);
    expect(newlyMovedInByBuild({ "coin-bank": 3, "tailor": 3 }, ["tiao"])).toEqual(["pang"]);
  });
  it("ignores unfinished landmarks and already-met neighbours", () => {
    expect(newlyMovedInByBuild({ "coin-bank": 2 }, [])).toEqual([]);
    expect(newlyMovedInByBuild({ "kitten-cafe": 3 }, ["wen"])).toEqual([]);
    expect(newlyMovedInByBuild({}, [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `. ~/.nvm/nvm.sh; npx vitest run test/street-neighbours.test.js`
Expected: FAIL — `newlyMovedInByBuild` undefined.

- [ ] **Step 3: Write minimal implementation**

```js
// src/street-neighbours.js — add after newlyMovedIn
export function newlyMovedInByBuild(builtStages, met) {
  const seen = new Set(Array.isArray(met) ? met : []);
  const bs = builtStages && typeof builtStages === "object" ? builtStages : {};
  return NEIGHBOURS
    .filter(n => (Number(bs[n.landmarkId]) || 0) >= 3 && !seen.has(n.id))
    .map(n => n.id);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `. ~/.nvm/nvm.sh; npx vitest run test/street-neighbours.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/street-neighbours.js test/street-neighbours.test.js
git commit -m "feat(street): neighbour move-in on finished build (bricks)"
```

---

### Task 8: i18n strings (EN + TH, TH-REVIEW)

**Files:**
- Modify: `src/i18n.js` — add three keys to the EN block (~line 212) and the TH block (~line 794).
- Test: none new — the existing `test/i18n-usage.test.js` / i18n-parity test enforces EN/TH parity and that used keys exist.

**Interfaces:**
- Produces: `street.bricks` ("{n}" label), `street.build` (build button), `street.opensAtLevel` (locked hint). Consumed by Task 9.

- [ ] **Step 1: Add EN keys**

In the EN map, near the other `street.*` keys:

```js
    "street.bricks": "{n} 🧱",
    "street.build": "Build · {cost} 🧱",
    "street.opensAtLevel": "Opens at level {lv}",
```

- [ ] **Step 2: Add TH keys (tagged TH-REVIEW)**

In the TH map, mirror them, following the file's existing `TH-REVIEW` tagging convention (grep an existing tagged key to copy the exact comment style):

```js
    // TH-REVIEW
    "street.bricks": "{n} 🧱",
    // TH-REVIEW
    "street.build": "สร้าง · {cost} 🧱",
    // TH-REVIEW
    "street.opensAtLevel": "เปิดที่เลเวล {lv}",
```

- [ ] **Step 3: Run the i18n tests**

Run: `. ~/.nvm/nvm.sh; npx vitest run test/i18n-usage.test.js`
Expected: PASS (EN/TH parity holds; no missing/extra keys).

- [ ] **Step 4: Commit**

```bash
git add src/i18n.js
git commit -m "i18n(street): bricks/build/opensAtLevel strings (TH-REVIEW)"
```

---

### Task 9: Street wiring — bricks chip, tap-to-build, neighbour retie

**Files:**
- Modify: `src/ui/street-screen.js` — factory destructure (lines 51-56), imports (line 40 area), landmark render (lines 776-790), hit-layer render (`renderStreetHits`, lines ~498-525), `grantMovedInNeighbours` (lines 186-206), wallet-chip render (line 817), add `doBuildLandmark`.
- Modify: `index.html` — add a `#street-bricks` chip element next to `#street-wallet`'s container.
- Verification: **browser-verified (headless Chromium), not unit-tested** (per the untested-wiring convention). No new unit test file.

**Interfaces:**
- Consumes: `landmarkStage(builtStages,id)` (Task 4), `landmarkBuildable/advanceLandmark/landmarkBuildCost` (Task 1), `newlyMovedInByBuild` (Task 7), new deps `getBricks`/`setBricks` (Task 10), i18n keys (Task 8).

- [ ] **Step 1: Add imports and deps**

Add to the imports near line 40:

```js
import { landmarkBuildable, advanceLandmark, landmarkBuildCost } from "../bricks.js";
import { newlyMovedInByBuild } from "../street-neighbours.js";
```

(`newlyMovedIn` may become unused — remove it from its import if so.)

Add `getBricks`, `setBricks` to the `createStreetScreen({...})` destructure (lines 51-56):

```js
  getWallet, setWallet, getBricks, setBricks, getXp, getCurrentScreen, getShopState, setShopState,
```

- [ ] **Step 2: Point landmark render at stored stages + keep buildables visible**

At lines 776-783, change the stage tag and filter so buildable (stage-0-but-unlocked) landmarks survive the filter:

```js
    const level=levelForXp(getXp());
    const pieces=streetPieces(Infinity,owned,tiers,layout)
      .map(p=>p.kind==="building" ? {...p, stage:landmarkStage(layout.builtStages,p.id), buildable:landmarkBuildable(level,p.id,layout.builtStages)} : p)
      .filter(p=>p.kind!=="building" || p.stage>=1 || p.buildable);
```

In the building draw branch (the `if(p.kind==="building"){ ... drawStreetLandmark(...) }` block), when `p.stage===0 && p.buildable`, draw a faint foundation footprint instead of a (null) sprite — reuse `roundRectOn` at the piece rect with low alpha. Keep `drawStreetLandmark` for `p.stage>=1`.

- [ ] **Step 3: Add build hit-buttons in the hit-layer**

In `renderStreetHits` (the function containing lines 498-525 that appends `street-hit` buttons to `#street-hit-layer`), after the existing item/plot hit loop, append a build button for each buildable building piece, following the SAME positioning pattern the item-hits use (screen rect from `p.slot*w` / `gy` / scale):

```js
    for(const p of buildingPieces){                 // the building pieces computed in renderStreet
      if(!p.buildable) continue;
      const cost=landmarkBuildCost(p.stage);
      const btn=document.createElement("button");
      btn.className="street-hit build-hit";
      // position btn over the landmark's screen rect exactly like item-hit does
      btn.textContent=t("street.build",{cost});
      btn.onclick=()=>doBuildLandmark(p.id);
      layer.appendChild(btn);
    }
```

> Implementer: mirror the exact rect math and CSS positioning the neighbouring `item-hit` block uses (`btn.style.left/top/width/height`). Add a `.build-hit` CSS rule in `index.html` styled like the other `.street-hit` affordances (a small pill showing the cost). Pass the building pieces list into `renderStreetHits` the same way plot/piece data already reaches it.

- [ ] **Step 4: Add the build action**

Add near `grantMovedInNeighbours`:

```js
  function doBuildLandmark(id){
    const layout = ensureStreetLayout();
    const level = levelForXp(getXp());
    const res = advanceLandmark(layout.builtStages, id, getBricks(), level);
    if(!res.ok) return;                                  // not enough bricks / not buildable
    setBricks(res.bricks); store.set("bricks", getBricks());
    const granted = normalizeStreetLayout({ ...layout, builtStages: res.builtStages }, getShopState().owned);
    setShopState({ ...getShopState(), streetLayout: granted });
    store.set("shop", getShopState());
    pushEdge("purchase");
    streetReveal = { id, start: null };                  // reuse the construction pop/dust
    if(res.reachedStage >= 3) grantMovedInNeighbours();  // finishing a home may move a neighbour in
    renderStreet();
  }
```

- [ ] **Step 5: Retie `grantMovedInNeighbours` to build completion**

Change the `fresh` line inside `grantMovedInNeighbours` (line ~189) from the level-based call to the build-based one:

```js
    const layout = ensureStreetLayout();
    const fresh = newlyMovedInByBuild(layout.builtStages, layout.metNeighbours);
```

(Delete the now-unused `const level = levelForXp(getXp());` line in that function if nothing else there uses it.)

- [ ] **Step 6: Render the bricks chip**

In `index.html`, add next to `#street-wallet` (same chip container):

```html
<span id="street-bricks" class="chip"></span>
```

In `street-screen.js` near line 817 where `#street-wallet` is set:

```js
    $("#street-wallet").textContent=t("shop.coins",{coins:getWallet().toLocaleString()});
    $("#street-bricks").textContent=t("street.bricks",{n:getBricks().toLocaleString()});
```

Also render the single "Opens at level N" locked hint for the next-unlock landmark (the lowest `BUILDINGS` entry with `level < lv`) — a small inert label near its slot using `t("street.opensAtLevel",{lv})`.

- [ ] **Step 7: Build + browser-verify**

Run: `. ~/.nvm/nvm.sh; npm run build`
Then browser-verify in headless Chromium (seed a profile with bricks and a level past an unlock): open Street → a buildable landmark shows a "Build · N 🧱" pill → tapping it spends bricks and advances the stage art → finishing coin-bank fires Tiao's portrait greeting once → the bricks chip updates → console clean, EN + TH.

- [ ] **Step 8: Commit**

```bash
git add src/ui/street-screen.js index.html
git commit -m "feat(street): bricks chip + tap-to-build landmarks + neighbour retie"
```

---

### Task 10: main.js — earn bricks, pass deps

**Files:**
- Modify: `src/main.js` — import (mastery + bricks), `bricks` var (near line 175 + re-read near line 830), battle-init snapshot, `endBattle` (both paths, lines 3114-3159), `createStreetScreen` call (lines 3807-3818).
- Verification: browser-verified (per Task 9's flow); no unit test (main.js is untested by design).

**Interfaces:**
- Consumes: `masteredCount` (Task 2), `bricksForRound` (Task 1). Produces: `getBricks`/`setBricks` deps for `createStreetScreen`.

- [ ] **Step 1: Imports + counter**

Add to the existing `mastery.js` import: `masteredCount`. Add:

```js
import { bricksForRound } from "./bricks.js";
```

Near `let wallet = store.get("wallet", 0);` (line 175):

```js
let bricks = store.get("bricks", 0);
```

Near the post-sync re-read `wallet = store.get("wallet", 0);` (line ~830):

```js
bricks = store.get("bricks", 0);
```

- [ ] **Step 2: Snapshot mastery at battle start**

Where the battle-state object `B` is initialized (grep `B = {` / `B={` in the battle-start path), add after it:

```js
B.masteredAtStart = masteredCount(masteryStore);
```

- [ ] **Step 3: Award bricks in `endBattle`**

In the normal path, right after `store.set("wallet", wallet); updateWalletChip();` (before `streetScreen.renderProjectResults`):

```js
  const gained = Math.max(0, masteredCount(masteryStore) - (B.masteredAtStart || 0));
  const earnedBricks = bricksForRound({ mastered: gained, completed: true });
  if(earnedBricks){ bricks += earnedBricks; store.set("bricks", bricks); }
```

In the quit path, right after `if(B.score > 0){ wallet += B.score; store.set("wallet", wallet); updateWalletChip(); }`:

```js
    const gainedQ = Math.max(0, masteredCount(masteryStore) - (B.masteredAtStart || 0));
    const earnedBricksQ = bricksForRound({ mastered: gainedQ, completed: false });
    if(earnedBricksQ){ bricks += earnedBricksQ; store.set("bricks", bricks); }
```

- [ ] **Step 4: Pass deps to the Street**

In the `createStreetScreen({...})` call (lines 3807-3818), add after the `getWallet/setWallet` lines:

```js
  getBricks: () => bricks, setBricks: v => { bricks = v; },
```

- [ ] **Step 5: Build + full gate + browser-verify**

```bash
. ~/.nvm/nvm.sh
npm run lint && npm test && npm run build
```
Expected: lint 0, full suite green, build clean. Then browser-verify a real battle credits bricks (finish a round with ≥1 word reaching mastery → bricks increase by `2×mastered + 1`; open Street → chip reflects it → build a landmark).

- [ ] **Step 6: Commit**

```bash
git add src/main.js
git commit -m "feat(main): award bricks from mastered words, wire street build deps"
```

---

### Task 11: Release cut v122→v123 (lead-run, owner-gated)

**Files:**
- Modify: `sw.js` (`CACHE_VERSION`), `test/sw-precache.test.js` (the pinned version string) — SAME commit.

- [ ] **Step 1: Bump SHELL + pin (same commit)**

In `sw.js`: `const CACHE_VERSION = "v123";`
In `test/sw-precache.test.js`: `expect(swSrc).toContain('const CACHE_VERSION = "v123"');`

- [ ] **Step 2: Full gate AFTER the bump**

```bash
. ~/.nvm/nvm.sh
npm run lint && npm test && npm run build
```
Expected: lint 0, full suite green (sw-precache test now checks v123), build clean.

- [ ] **Step 3: Commit, merge, deploy**

```bash
git add sw.js test/sw-precache.test.js
git commit -m "chore(release): bump SHELL cache v122->v123 for street bricks"
# feature branch -> development -> main (release merge) per the standard flow
```
Then merge to `development`, release-merge `development`→`main`, push, verify the Pages run SUCCESS and live `sw.js` serves `v123`, and the live bundle byte-matches the local build. Fast-forward `development` to `main`. Update `../HANDOFF.md`.

> This step is **owner-gated** on Jordan's "ship."

---

## Self-Review

**1. Spec coverage:**
- Resource bricks (synced, earned like coins) → Tasks 1, 2, 6, 10. ✓
- Build mechanic (spend to advance stage, reuse v121 art) → Tasks 1, 4, 9. ✓
- Level = unlocker; stored stage → Tasks 3, 4, 9. ✓
- Neighbour move-in on finished build → Tasks 7, 9. ✓
- Storage/migration v4→v5 + sync merge → Tasks 3, 5, 6. ✓
- Modules & boundaries (main.js frozen except award lines) → Task 10. ✓
- i18n EN+TH TH-REVIEW → Task 8. ✓
- Testing (bricks/migrations/street/merge/neighbours unit; wiring browser-verified) → Tasks 1-8 unit, 9-10 browser. ✓
- Guardrails (one-directional, kind) → enforced by design in Tasks 1 & 10 (bricks only added, never subtracted except by voluntary build). ✓

**2. Placeholder scan:** No TBD/TODO. The one soft spot — exact `nbhsk.xp` value in Task 5's test and the exact rect math in Task 9 — are called out with explicit instructions to derive from `growth.js`/the existing `item-hit` block, not left vague.

**3. Type consistency:** `builtStages` is `{[id]: 1|2|3}` everywhere (Tasks 3/4/5/6/9). `landmarkStage(builtStages,id)` signature is consistent across Task 4 (def) and Task 9 (call). `advanceLandmark` return shape `{ok,builtStages,bricks,reachedStage}` used identically in Task 1 (def) and Task 9 (call). `bricksForRound({mastered,completed})` consistent in Tasks 1/10. `getBricks/setBricks` deps consistent in Tasks 9/10.
