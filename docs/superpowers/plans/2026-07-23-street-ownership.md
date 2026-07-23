# Street Ownership (A-layer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Street feel "proudly theirs" — turn its dead-ending loop into one with collection payoff, persistent authorship, and a positive-only daily-return moment, shipping with existing art only.

**Architecture:** New pure, unit-tested modules (`street-collection.js`, `street-keepsakes.js`, `street-daily.js`) hold all logic; escrow extends `street-project.js`. The `streetLayout` stored shape goes v2→v3 (five new fields) behind a guarded migration and an extended cloud-merge fold. All DOM/canvas wiring extends `src/ui/street-screen.js` — `main.js` is untouched beyond its existing `createStreetScreen(deps)` seam.

**Tech Stack:** Vanilla JS ES modules, esbuild bundle, Vitest, ESLint flat config. Persistence via `src/storage.js` `createStore`; cloud reconcile via `src/merge.js`.

Spec: `docs/superpowers/specs/2026-07-23-street-ownership-design.md`.

## Global Constraints

- **Pure modules only for logic** — no DOM, no `localStorage`, no direct `Date.now()` inside pure functions; date/day is always passed in as a `"YYYY-MM-DD"` string (same convention as `daily.js`/`quests.js`/`shop.js`).
- **`main.js` is frozen** — new wiring lives in `src/ui/street-screen.js` (or a new `src/ui/*` module it mounts). Do not add feature wiring to `main.js`.
- **Persistence through `src/storage.js` `createStore`** — never touch `localStorage` directly from feature code. Street state stays inside the synced `nbhsk.shop` object; no new top-level `nbhsk.*` key is introduced by this plan.
- **Any stored-shape change needs a migration** — bump `CURRENT_SCHEMA_VERSION` in `src/migrations.js` and append one guarded `{ to, up(storage) }` ladder entry. Guards make corrupt/missing data a silent no-op, never a throw.
- **EN + TH i18n** — every player-facing string is a `t("street.*", vars)` key with parallel English and Thai entries in `src/i18n.js`. No hardcoded copy in wiring.
- **Street never modifies learning** — no SRS/quest/daily/mastery/growth/boss writes. Keepsake words are frozen display-only snapshots.
- **Kind-retention guardrail (daily surprise)** — no penalty, no countdown, no loss/guilt copy, no reset-shame, no paid mercy. A skipped day is invisible.
- **No new art ⇒ no `sw.js` shell change in this layer.** (SHELL cache bump happens at release time per the release-cut process, not per task.)
- **Gate every commit on the full suite** — `npm test` (never masked/piped to `tail`/`grep`), `npm run lint`, `npm run build` all green.
- **Set membership is derived** from `DECO_META` (`src/street.js`) + `CATALOG` (`src/shop.js`); only `setsCompleted[]` is stored, and only as a grant-once guard.
- Sets and their members (from `DECO_META`): `market` = red-lantern, noodle-stall, tea-sign, mahjong-table, bubble-tea, neon-cat-sign (6); `garden` = foo-dog, koi-pond, paper-umbrella, goldfish-banner (4); `festival` = golden-arch, drum-tower, shaved-ice-cart, mooncake-stall, firecracker-arch (5). The `welcome` set (single earn-only lantern) is **excluded** from set-completion.

---

## Build order & independence

- **Foundation (sequential):** Task 1 (v3 shape) → Task 2 (migration) → Task 3 (merge fold). Task 1 must land first; 2 and 3 depend on it.
- **Pure logic (parallel after Task 1):** Tasks 4, 5, 6, 7 are independent of each other.
- **Wiring (after its logic + foundation):** Tasks 8–14 are independent of one another; each depends only on the foundation and its own pure module.

---

## Task 1: `streetLayout` v2 → v3 shape

**Files:**
- Modify: `src/street.js` (`STREET_LAYOUT_VERSION`, `defaultStreetLayout`, `normalizeStreetLayout`)
- Modify: `src/merge.js:111` (replace hardcoded `.v === 2` with the constant)
- Test: `test/street.test.js` (append cases)

**Interfaces:**
- Consumes: nothing new.
- Produces: `STREET_LAYOUT_VERSION === 3`; `defaultStreetLayout()` and `normalizeStreetLayout(layout, ownedIds)` now carry `name` (string), `savedLayouts` (array of `{ name, placements }`, max 3), `keepsakes` (array), `setsCompleted` (array of strings), `lastVisitDay` (string|null). Existing `placements`/`welcomeOwned`/`coachDone` semantics unchanged.

- [ ] **Step 1: Write the failing tests**

Append to `test/street.test.js`:

```js
import { STREET_LAYOUT_VERSION, defaultStreetLayout, normalizeStreetLayout } from "../src/street.js";

describe("streetLayout v3 ownership fields", () => {
  it("defaults the five new fields", () => {
    expect(defaultStreetLayout()).toEqual({
      v: 3, placements: {}, welcomeOwned: false, coachDone: false,
      name: "", savedLayouts: [], keepsakes: [], setsCompleted: [], lastVisitDay: null,
    });
    expect(STREET_LAYOUT_VERSION).toBe(3);
  });

  it("normalizes and defends the new fields", () => {
    const out = normalizeStreetLayout({
      v: 2, placements: {}, name: "  My Street  ",
      savedLayouts: [{ name: "A", placements: {} }, "junk", { name: "B", placements: {} },
                     { name: "C", placements: {} }, { name: "D", placements: {} }],
      keepsakes: [{ id: "k1", kind: "welcome", day: "2026-07-23" }, null],
      setsCompleted: ["market", "market", 7, "garden"],
      lastVisitDay: "2026-07-23",
    }, []);
    expect(out.v).toBe(3);
    expect(out.name).toBe("My Street");            // trimmed, capped at 24
    expect(out.savedLayouts).toHaveLength(3);      // capped at 3, junk dropped
    expect(out.keepsakes).toEqual([{ id: "k1", kind: "welcome", day: "2026-07-23" }]); // nulls dropped
    expect(out.setsCompleted).toEqual(["market", "garden"]); // deduped, non-strings dropped
    expect(out.lastVisitDay).toBe("2026-07-23");
  });

  it("coerces a missing/garbage lastVisitDay to null and name to ''", () => {
    const out = normalizeStreetLayout({ name: 7, lastVisitDay: 123 }, []);
    expect(out.name).toBe("");
    expect(out.lastVisitDay).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd game && npx vitest run test/street.test.js -t "v3 ownership"`
Expected: FAIL (`STREET_LAYOUT_VERSION` is 2; fields absent).

- [ ] **Step 3: Implement the v3 shape**

In `src/street.js`, change the version constant and the two functions:

```js
export const STREET_LAYOUT_VERSION = 3;

const STREET_NAME_MAX = 24;
const SAVED_LAYOUTS_MAX = 3;

export function defaultStreetLayout() {
  return {
    v: STREET_LAYOUT_VERSION, placements: {}, welcomeOwned: false, coachDone: false,
    name: "", savedLayouts: [], keepsakes: [], setsCompleted: [], lastVisitDay: null,
  };
}

function normName(v) { return typeof v === "string" ? v.trim().slice(0, STREET_NAME_MAX) : ""; }
function normSavedLayouts(v) {
  return (Array.isArray(v) ? v : [])
    .filter(s => s && typeof s === "object" && typeof s.name === "string" && s.placements && typeof s.placements === "object")
    .slice(0, SAVED_LAYOUTS_MAX)
    .map(s => ({ name: s.name.slice(0, STREET_NAME_MAX), placements: { ...s.placements } }));
}
function normKeepsakes(v) {
  return (Array.isArray(v) ? v : [])
    .filter(k => k && typeof k === "object" && typeof k.id === "string" && typeof k.kind === "string");
}
function normSetsCompleted(v) {
  return [...new Set((Array.isArray(v) ? v : []).filter(s => typeof s === "string"))];
}
function normLastVisitDay(v) { return typeof v === "string" && v ? v : null; }
```

Then, inside `normalizeStreetLayout`, extend the `out` object literal (keep the existing placement-normalization loop unchanged):

```js
  const out = {
    v: STREET_LAYOUT_VERSION,
    placements: {},
    welcomeOwned: !!raw.welcomeOwned,
    coachDone: !!raw.coachDone,
    name: normName(raw.name),
    savedLayouts: normSavedLayouts(raw.savedLayouts),
    keepsakes: normKeepsakes(raw.keepsakes),
    setsCompleted: normSetsCompleted(raw.setsCompleted),
    lastVisitDay: normLastVisitDay(raw.lastVisitDay),
  };
```

- [ ] **Step 4: Update the merge version check**

In `src/merge.js` line ~111, replace the hardcoded literal so the v3 bump doesn't break cloud adoption of a layout:

```js
// was: const bHasLayout = !!(b && b.streetLayout && b.streetLayout.v === 2);
const bHasLayout = !!(b && b.streetLayout && b.streetLayout.v === STREET_LAYOUT_VERSION);
```

Add `STREET_LAYOUT_VERSION` to the existing `import { ... } from "./street.js";` line in `merge.js`.

- [ ] **Step 5: Run tests to verify pass**

Run: `cd game && npx vitest run test/street.test.js test/merge.test.js`
Expected: PASS (new v3 cases green; existing street/merge tests still green).

- [ ] **Step 6: Commit**

```bash
git add src/street.js src/merge.js test/street.test.js
git commit -m "feat(street): streetLayout v3 — name, savedLayouts, keepsakes, setsCompleted, lastVisitDay"
```

---

## Task 2: v2 → v3 migration

**Files:**
- Modify: `src/migrations.js` (`CURRENT_SCHEMA_VERSION`, append ladder entry)
- Test: `test/migrations.test.js` (append cases)

**Interfaces:**
- Consumes: `normalizeStreetLayout` (Task 1) via the existing `street.js` import.
- Produces: `CURRENT_SCHEMA_VERSION === 3`; a `{ to: 3, up }` entry that upgrades a stored `nbhsk.shop.streetLayout` in place and defaults `streetProject.reserve`.

- [ ] **Step 1: Write the failing tests**

Append to `test/migrations.test.js`:

```js
import { CURRENT_SCHEMA_VERSION, MIGRATIONS, runMigrations } from "../src/migrations.js";

function memStorage(seed = {}) {
  const m = new Map(Object.entries(seed));
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
    _dump: () => Object.fromEntries(m),
  };
}

describe("v2 → v3 street ownership migration", () => {
  it("adds the new streetLayout fields and reserve flag on a v2 install", () => {
    const s = memStorage({
      "nbhsk.schemaVersion": "2",
      "nbhsk.shop": JSON.stringify({
        owned: ["red-lantern"],
        streetLayout: { v: 2, placements: {}, welcomeOwned: true, coachDone: true },
        streetProject: { v: 1, itemId: "", plotId: "" },
      }),
    });
    runMigrations(s);
    const shop = JSON.parse(s.getItem("nbhsk.shop"));
    expect(shop.streetLayout.v).toBe(3);
    expect(shop.streetLayout.keepsakes).toEqual([]);
    expect(shop.streetLayout.setsCompleted).toEqual([]);
    expect(shop.streetLayout.lastVisitDay).toBeNull();
    expect(shop.streetLayout.welcomeOwned).toBe(true);   // preserved
    expect(shop.streetProject.reserve).toBe(false);
    expect(s.getItem("nbhsk.schemaVersion")).toBe("3");
  });

  it("no-ops without throwing on corrupt shop JSON", () => {
    const s = memStorage({ "nbhsk.schemaVersion": "2", "nbhsk.shop": "{not json" });
    expect(() => runMigrations(s)).not.toThrow();
    expect(s.getItem("nbhsk.schemaVersion")).toBe("3");   // still stamps current
  });

  it("stamps a fresh install straight to current without running entries", () => {
    const s = memStorage({});
    runMigrations(s);
    expect(s.getItem("nbhsk.schemaVersion")).toBe("3");
    expect(s.getItem("nbhsk.shop")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd game && npx vitest run test/migrations.test.js -t "v3 street ownership"`
Expected: FAIL (`CURRENT_SCHEMA_VERSION` is 2; no v3 entry).

- [ ] **Step 3: Implement the migration**

In `src/migrations.js`, bump the constant and append the entry (after the existing `to: 2` entry, before the closing `]`):

```js
export const CURRENT_SCHEMA_VERSION = 3;
```

```js
  {
    to: 3,
    up(storage) {
      // v2→v3: streetLayout gains ownership fields (name, savedLayouts,
      // keepsakes, setsCompleted, lastVisitDay) and streetProject gains an
      // opt-in `reserve` flag. normalizeStreetLayout fills the new fields
      // defensively; every step is guarded so corrupt data is a no-op.
      let shop;
      try {
        const raw = storage.getItem("nbhsk.shop");
        if (raw === null) return;
        shop = JSON.parse(raw);
      } catch (e) { return; }
      if (!shop || typeof shop !== "object") return;
      const owned = Array.isArray(shop.owned) ? shop.owned : [];
      try {
        shop.streetLayout = normalizeStreetLayout(shop.streetLayout, owned);
      } catch (e) { return; }
      if (shop.streetProject && typeof shop.streetProject === "object"
          && typeof shop.streetProject.reserve !== "boolean") {
        shop.streetProject.reserve = false;
      }
      try { storage.setItem("nbhsk.shop", JSON.stringify(shop)); } catch (e) {}
    },
  },
```

(`normalizeStreetLayout` is already imported at the top of `migrations.js`.)

- [ ] **Step 4: Run tests to verify pass**

Run: `cd game && npx vitest run test/migrations.test.js`
Expected: PASS (new cases green; `assertSortedLadder` still happy — `to:3 > to:2`).

- [ ] **Step 5: Commit**

```bash
git add src/migrations.js test/migrations.test.js
git commit -m "feat(street): v2→v3 migration for streetLayout ownership fields + project reserve"
```

---

## Task 3: Cloud-merge fold for the new fields

**Files:**
- Modify: `src/merge.js` (`mergeShop` streetLayout block)
- Test: `test/merge.test.js` (append cases)

**Interfaces:**
- Consumes: the v3 layout from Task 1.
- Produces: `mergeShop` result whose `streetLayout` folds `keepsakes` (union by `id`), `setsCompleted` (union), `lastVisitDay` (max string), and `name`/`savedLayouts` (dirty-flag-wins, same `layoutDirty` bit already used for placements).

- [ ] **Step 1: Write the failing tests**

Append to `test/merge.test.js`:

```js
describe("mergeShop folds v3 ownership fields", () => {
  const base = () => ({ owned: [], tiers: {},
    streetLayout: { v: 3, placements: {}, welcomeOwned: false, coachDone: false,
      name: "", savedLayouts: [], keepsakes: [], setsCompleted: [], lastVisitDay: null } });

  it("unions keepsakes by id and setsCompleted, and takes the max lastVisitDay", () => {
    const a = base(); a.streetLayout.keepsakes = [{ id: "k1", kind: "welcome", day: "2026-07-20" }];
    a.streetLayout.setsCompleted = ["market"]; a.streetLayout.lastVisitDay = "2026-07-20";
    const b = base(); b.streetLayout.keepsakes = [{ id: "k1", kind: "welcome", day: "2026-07-20" },
      { id: "k2", kind: "set", day: "2026-07-22" }];
    b.streetLayout.setsCompleted = ["garden"]; b.streetLayout.lastVisitDay = "2026-07-22";
    const out = mergeShop(a, b, { slotsDirty: false, layoutDirty: false, projectDirty: false });
    expect(out.streetLayout.keepsakes.map(k => k.id).sort()).toEqual(["k1", "k2"]);
    expect(out.streetLayout.setsCompleted.sort()).toEqual(["garden", "market"]);
    expect(out.streetLayout.lastVisitDay).toBe("2026-07-22");
  });

  it("name/savedLayouts follow the layoutDirty bit (local wins when dirty)", () => {
    const a = base(); a.streetLayout.name = "Local"; a.streetLayout.savedLayouts = [{ name: "L", placements: {} }];
    const b = base(); b.streetLayout.name = "Cloud"; b.streetLayout.savedLayouts = [];
    expect(mergeShop(a, b, { layoutDirty: true }).streetLayout.name).toBe("Local");
    expect(mergeShop(a, b, { layoutDirty: false }).streetLayout.name).toBe("Cloud");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd game && npx vitest run test/merge.test.js -t "folds v3 ownership"`
Expected: FAIL (fold drops the new fields — `normalizeStreetLayout` on the chosen side keeps only that side's values; union/max not applied).

- [ ] **Step 3: Implement the fold**

In `src/merge.js`, inside `mergeShop`, replace the existing `streetLayout` construction (the `const chosenLayout ...` / `const streetLayout = normalizeStreetLayout({...})` block) with a version that additively folds the ownership fields regardless of which side's placements win:

```js
  const bHasLayout = !!(b && b.streetLayout && b.streetLayout.v === STREET_LAYOUT_VERSION);
  const chosenLayout = flags.layoutDirty || !bHasLayout ? A.streetLayout : B.streetLayout;
  const la = A.streetLayout || {}, lb = B.streetLayout || {};
  const keepsakesById = new Map();
  for (const k of [...(la.keepsakes || []), ...(lb.keepsakes || [])]) {
    if (k && typeof k.id === "string" && !keepsakesById.has(k.id)) keepsakesById.set(k.id, k);
  }
  const maxDay = (x, y) => (String(x || "") > String(y || "") ? (x || null) : (y || null));
  const streetLayout = normalizeStreetLayout({
    ...(chosenLayout || {}),
    welcomeOwned: !!(la.welcomeOwned || lb.welcomeOwned),
    coachDone: !!(la.coachDone || lb.coachDone),
    keepsakes: [...keepsakesById.values()],
    setsCompleted: [...new Set([...(la.setsCompleted || []), ...(lb.setsCompleted || [])])],
    lastVisitDay: maxDay(la.lastVisitDay, lb.lastVisitDay),
    // name + savedLayouts ride `chosenLayout` (the layoutDirty-selected side).
  }, owned);
```

Note: `name` and `savedLayouts` are intentionally taken from `chosenLayout` (spread first), so the `layoutDirty` bit governs them exactly as it already governs `placements`.

- [ ] **Step 4: Run tests to verify pass**

Run: `cd game && npx vitest run test/merge.test.js`
Expected: PASS (new cases green; existing merge tests still green).

- [ ] **Step 5: Commit**

```bash
git add src/merge.js test/merge.test.js
git commit -m "feat(street): cloud-merge fold for keepsakes/setsCompleted/lastVisitDay (union/max), name+layouts dirty-wins"
```

---

## Task 4: `street-collection.js` — set membership, completion, book view

**Files:**
- Create: `src/street-collection.js`
- Test: `test/street-collection.test.js`

**Interfaces:**
- Consumes: `DECO_META`, `WELCOME_ID` from `src/street.js`; `CATALOG` from `src/shop.js`.
- Produces:
  - `SET_IDS` → `["market", "garden", "festival"]`
  - `setMembers(setId)` → `[itemId]` (from `DECO_META`, excludes `welcome`)
  - `completedSets(ownedIds)` → `[setId]` where every member is owned
  - `newlyCompletedSets(ownedIds, alreadyGranted)` → sets complete now but not in `alreadyGranted`
  - `collectionView(ownedIds, tiers)` → `[{ set, complete, items: [{ id, name, price, owned, tier }] }]`

- [ ] **Step 1: Write the failing tests**

Create `test/street-collection.test.js`:

```js
import { describe, it, expect } from "vitest";
import {
  SET_IDS, setMembers, completedSets, newlyCompletedSets, collectionView,
} from "../src/street-collection.js";

describe("street collection sets", () => {
  it("exposes the three real sets, excluding welcome", () => {
    expect(SET_IDS).toEqual(["market", "garden", "festival"]);
    expect(setMembers("garden")).toEqual(["foo-dog", "koi-pond", "paper-umbrella", "goldfish-banner"]);
    expect(setMembers("welcome")).toEqual([]);
  });

  it("reports a set complete only when every member is owned", () => {
    const garden = ["foo-dog", "koi-pond", "paper-umbrella", "goldfish-banner"];
    expect(completedSets(garden.slice(0, 3))).toEqual([]);
    expect(completedSets(garden)).toEqual(["garden"]);
  });

  it("returns only newly-completed sets not already granted", () => {
    const garden = ["foo-dog", "koi-pond", "paper-umbrella", "goldfish-banner"];
    expect(newlyCompletedSets(garden, [])).toEqual(["garden"]);
    expect(newlyCompletedSets(garden, ["garden"])).toEqual([]);
  });

  it("builds a grouped view with owned/tier/price", () => {
    const view = collectionView(["foo-dog"], { "foo-dog": 2 });
    const garden = view.find(g => g.set === "garden");
    const foo = garden.items.find(i => i.id === "foo-dog");
    expect(foo).toEqual({ id: "foo-dog", name: "Foo Dog", price: 3000, owned: true, tier: 2 });
    expect(garden.items.find(i => i.id === "koi-pond").owned).toBe(false);
    expect(garden.complete).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd game && npx vitest run test/street-collection.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the module**

Create `src/street-collection.js`:

```js
"use strict";
// Street Collection — pure. Set membership + completion + book view model.
// Membership derives from DECO_META (street.js); prices/names from CATALOG
// (shop.js). Nothing here reads storage.
import { DECO_META, WELCOME_ID } from "./street.js";
import { CATALOG } from "./shop.js";

// Real collectible sets, in display order. The single earn-only `welcome`
// "set" is deliberately excluded from set-completion.
export const SET_IDS = ["market", "garden", "festival"];

const NAME = Object.fromEntries(CATALOG.map(i => [i.id, i.name]));
const PRICE = Object.fromEntries(CATALOG.map(i => [i.id, i.price]));

export function setMembers(setId) {
  if (!SET_IDS.includes(setId)) return [];
  return Object.keys(DECO_META).filter(id => id !== WELCOME_ID && DECO_META[id].set === setId);
}

export function completedSets(ownedIds) {
  const owned = new Set(ownedIds || []);
  return SET_IDS.filter(s => { const m = setMembers(s); return m.length > 0 && m.every(id => owned.has(id)); });
}

export function newlyCompletedSets(ownedIds, alreadyGranted = []) {
  const granted = new Set(alreadyGranted || []);
  return completedSets(ownedIds).filter(s => !granted.has(s));
}

export function collectionView(ownedIds, tiers = {}) {
  const owned = new Set(ownedIds || []);
  const complete = new Set(completedSets(ownedIds));
  return SET_IDS.map(set => ({
    set,
    complete: complete.has(set),
    items: setMembers(set).map(id => ({
      id, name: NAME[id] || id, price: PRICE[id] || 0,
      owned: owned.has(id), tier: (tiers && tiers[id]) || 1,
    })),
  }));
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cd game && npx vitest run test/street-collection.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/street-collection.js test/street-collection.test.js
git commit -m "feat(street): street-collection pure module — set membership, completion, book view"
```

---

## Task 5: `street-keepsakes.js` — the keepsake ledger

**Files:**
- Create: `src/street-keepsakes.js`
- Test: `test/street-keepsakes.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `makeKeepsake(kind, day, opts?)` → `{ id, kind, day, word? }` where `kind` ∈ `"welcome"|"set"|"daily"`, `id` is deterministic from `(kind, day, opts.set|opts.seq)`, `word` is included only when a non-empty string is passed.
  - `addKeepsake(list, keepsake)` → new array; append-only; a keepsake with a duplicate `id` is ignored (idempotent).

- [ ] **Step 1: Write the failing tests**

Create `test/street-keepsakes.test.js`:

```js
import { describe, it, expect } from "vitest";
import { makeKeepsake, addKeepsake } from "../src/street-keepsakes.js";

describe("street keepsakes", () => {
  it("makes a deterministic id per (kind, day, set) and includes a word only when given", () => {
    const k1 = makeKeepsake("set", "2026-07-23", { set: "garden", word: "谢谢" });
    expect(k1).toEqual({ id: "set:garden:2026-07-23", kind: "set", day: "2026-07-23", word: "谢谢" });
    const k2 = makeKeepsake("welcome", "2026-07-23");
    expect(k2).toEqual({ id: "welcome:2026-07-23", kind: "welcome", day: "2026-07-23" });
    expect("word" in k2).toBe(false);
  });

  it("appends without mutating and stays idempotent on duplicate id", () => {
    const a = [];
    const b = addKeepsake(a, makeKeepsake("welcome", "2026-07-23"));
    expect(a).toEqual([]);                 // input not mutated
    expect(b).toHaveLength(1);
    const c = addKeepsake(b, makeKeepsake("welcome", "2026-07-23"));
    expect(c).toHaveLength(1);             // duplicate id ignored
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd game && npx vitest run test/street-keepsakes.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the module**

Create `src/street-keepsakes.js`:

```js
"use strict";
// Street Keepsakes — pure, append-only ledger of cosmetic mementos. A keepsake
// may DISPLAY a word the player already mastered (frozen string snapshot); it
// never drives review or any learning state.

export function makeKeepsake(kind, day, opts = {}) {
  const seg = opts.set != null ? String(opts.set)
    : opts.seq != null ? String(opts.seq) : "";
  const id = seg ? `${kind}:${seg}:${day}` : `${kind}:${day}`;
  const k = { id, kind, day };
  if (typeof opts.word === "string" && opts.word) k.word = opts.word;
  return k;
}

export function addKeepsake(list, keepsake) {
  const arr = Array.isArray(list) ? list : [];
  if (!keepsake || typeof keepsake.id !== "string") return arr.slice();
  if (arr.some(k => k && k.id === keepsake.id)) return arr.slice();
  return [...arr, keepsake];
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cd game && npx vitest run test/street-keepsakes.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/street-keepsakes.js test/street-keepsakes.test.js
git commit -m "feat(street): street-keepsakes pure module — append-only cosmetic ledger"
```

---

## Task 6: `street-daily.js` — new-day detection + deterministic gift

**Files:**
- Create: `src/street-daily.js`
- Test: `test/street-daily.test.js`

**Interfaces:**
- Consumes: `SKIN_PALETTES` from `src/shop.js` (to pick a neighbour palette key deterministically).
- Produces:
  - `isNewDay(lastVisitDay, todayKey)` → `bool` (true when `todayKey` is a valid non-empty string ≠ `lastVisitDay`)
  - `dailyGift(todayKey)` → `{ coins, keepsake: bool, neighbour }` — fully deterministic from `todayKey` (same key ⇒ same gift), `coins` ∈ a small positive set, `keepsake` true ~1 day in 4, `neighbour` a `SKIN_PALETTES` key.

- [ ] **Step 1: Write the failing tests**

Create `test/street-daily.test.js`:

```js
import { describe, it, expect } from "vitest";
import { isNewDay, dailyGift } from "../src/street-daily.js";
import { SKIN_PALETTES } from "../src/shop.js";

describe("street daily surprise", () => {
  it("detects a new day only for a valid, different key", () => {
    expect(isNewDay(null, "2026-07-23")).toBe(true);
    expect(isNewDay("2026-07-22", "2026-07-23")).toBe(true);
    expect(isNewDay("2026-07-23", "2026-07-23")).toBe(false);
    expect(isNewDay("2026-07-23", "")).toBe(false);
  });

  it("is deterministic for a given day and valid in shape", () => {
    const g1 = dailyGift("2026-07-23");
    const g2 = dailyGift("2026-07-23");
    expect(g1).toEqual(g2);                       // reload-stable
    expect(g1.coins).toBeGreaterThan(0);
    expect(typeof g1.keepsake).toBe("boolean");
    expect(Object.keys(SKIN_PALETTES)).toContain(g1.neighbour);
  });

  it("varies across days", () => {
    const days = ["2026-07-20", "2026-07-21", "2026-07-22", "2026-07-23", "2026-07-24"];
    const coinSet = new Set(days.map(d => dailyGift(d).coins));
    expect(coinSet.size).toBeGreaterThan(1);      // not a constant
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd game && npx vitest run test/street-daily.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the module**

Create `src/street-daily.js`:

```js
"use strict";
// Street Daily Surprise — pure, positive-only return loop. A gift is a pure
// function of the day key (no RNG), so a reload on the same day shows the same
// gift and it cannot be farmed. Nothing here reads storage or the clock.
import { SKIN_PALETTES } from "./shop.js";

const NEIGHBOURS = Object.keys(SKIN_PALETTES);
const COIN_TIERS = [20, 30, 40, 50];

// Small deterministic string hash (djb2), same spirit as quests.js date-hashing.
function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function isNewDay(lastVisitDay, todayKey) {
  if (typeof todayKey !== "string" || !todayKey) return false;
  return todayKey !== lastVisitDay;
}

export function dailyGift(todayKey) {
  const h = hash(String(todayKey));
  return {
    coins: COIN_TIERS[h % COIN_TIERS.length],
    keepsake: (Math.floor(h / 7) % 4) === 0,          // ~1 in 4 days
    neighbour: NEIGHBOURS[Math.floor(h / 3) % NEIGHBOURS.length],
  };
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cd game && npx vitest run test/street-daily.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/street-daily.js test/street-daily.test.js
git commit -m "feat(street): street-daily pure module — new-day detection + date-hashed gift"
```

---

## Task 7: Project escrow (opt-in reserve)

**Files:**
- Modify: `src/street-project.js` (`defaultStreetProject`, `normalizeStreetProject`, add `reservedAmount`)
- Test: `test/street-project.test.js` (adjust the two default/normalize expectations; append reserve cases)

**Interfaces:**
- Consumes: nothing new.
- Produces: `streetProject` shape gains `reserve` (boolean, default false); `reservedAmount(project, item, wallet)` → coins spoken-for (`min(wallet, item.price)` when `reserve` is on and `item` is the project deco, else 0). The Street Shop's affordability for OTHER items is checked against `wallet − reservedAmount(...)` (wired in Task 14).

- [ ] **Step 1: Update the failing/￼changed tests**

In `test/street-project.test.js`, update the default + normalize expectations to include `reserve`, and append reserve cases:

```js
  it("has a versioned empty default", () => {
    expect(defaultStreetProject()).toEqual({ v: 1, itemId: "", plotId: "", reserve: false });
  });

  it("creates a normalized project without mutating inputs", () => {
    expect(makeStreetProject("koi-pond", "plot-medium-02"))
      .toEqual({ v: 1, itemId: "koi-pond", plotId: "plot-medium-02", reserve: false });
  });
```

Append a new describe block:

```js
import { reservedAmount } from "../src/street-project.js";

describe("Street Project escrow (opt-in)", () => {
  const koi = { id: "koi-pond", type: "deco", price: 6000 };
  it("reserves nothing when reserve is off", () => {
    const p = { v: 1, itemId: "koi-pond", plotId: "", reserve: false };
    expect(reservedAmount(p, koi, 2000)).toBe(0);
  });
  it("reserves min(wallet, price) for the project item when reserve is on", () => {
    const p = { v: 1, itemId: "koi-pond", plotId: "", reserve: true };
    expect(reservedAmount(p, koi, 2000)).toBe(2000);   // wallet-capped
    expect(reservedAmount(p, koi, 9000)).toBe(6000);   // price-capped
  });
  it("reserves nothing for a non-project item", () => {
    const p = { v: 1, itemId: "koi-pond", plotId: "", reserve: true };
    expect(reservedAmount(p, { id: "tea-sign", type: "deco", price: 2200 }, 9000)).toBe(0);
  });
  it("normalizes reserve to a boolean and preserves it", () => {
    expect(normalizeStreetProject({ itemId: "koi-pond", reserve: 1 }).reserve).toBe(true);
    expect(normalizeStreetProject({ itemId: "koi-pond" }).reserve).toBe(false);
  });
});
```

The existing "does not report negative session earnings when wallet fell" test is unchanged — escrow does not touch `streetProjectProgress`.

- [ ] **Step 2: Run to verify failure**

Run: `cd game && npx vitest run test/street-project.test.js`
Expected: FAIL (default lacks `reserve`; `reservedAmount` undefined).

- [ ] **Step 3: Implement escrow**

In `src/street-project.js`:

```js
export function defaultStreetProject() {
  return { v: STREET_PROJECT_VERSION, itemId: "", plotId: "", reserve: false };
}

export function normalizeStreetProject(project, ownedIds = []) {
  const raw = project && typeof project === "object" ? project : {};
  const itemId = typeof raw.itemId === "string" ? raw.itemId : "";
  const plotId = typeof raw.plotId === "string" ? raw.plotId : "";
  const reserve = !!raw.reserve;
  if (!itemId || (ownedIds || []).includes(itemId)) return defaultStreetProject();
  return { v: STREET_PROJECT_VERSION, itemId, plotId, reserve };
}
```

`makeStreetProject` already routes through `normalizeStreetProject`, so it inherits `reserve`. Add the reserve helper:

```js
// Coins spoken-for by an active reserved project. A commitment device, not a
// hard lock: the Street Shop checks OTHER purchases against wallet - this.
export function reservedAmount(project, item, wallet) {
  if (!project?.reserve || !item || item.type !== "deco" || project.itemId !== item.id) return 0;
  return Math.min(coins(wallet), coins(item.price));
}
```

(`coins` is the existing private helper in this module.)

- [ ] **Step 4: Run tests to verify pass**

Run: `cd game && npx vitest run test/street-project.test.js test/merge.test.js`
Expected: PASS. (Check `merge.test.js`: if any assertion deep-equals a whole `streetProject`, add `reserve: false` there too.)

- [ ] **Step 5: Commit**

```bash
git add src/street-project.js test/street-project.test.js
git commit -m "feat(street): opt-in project escrow — reserve flag + reservedAmount helper"
```

---

## Task 8: Set-completion payoff wiring (banner + glow + keepsake grant)

**Files:**
- Modify: `src/ui/street-screen.js` (post-purchase path; render a completed-set banner; glow on completed-set placed items)
- Modify: `src/i18n.js` (EN + TH)

**Interfaces:**
- Consumes: `newlyCompletedSets` (Task 4), `makeKeepsake`/`addKeepsake` (Task 5), the persisted `streetLayout.setsCompleted`/`keepsakes` (Task 1). A mastered word for the keepsake comes from the deps' mastery accessor (display-only snapshot).
- Produces: after any successful deco purchase, each newly-completed set grants exactly one `kind:"set"` keepsake (id `set:<setId>:<day>`), appends its id to `setsCompleted`, persists via the store, and surfaces a one-shot banner; the set's placed items render with the existing glow primitive.

- [ ] **Step 1: Implement the grant + banner**

In `street-screen.js`, after the existing successful-purchase handling (where `buy()` result is committed and the scene re-renders), add:

1. Read `owned` (post-purchase) and `layout.setsCompleted`. Compute `const fresh = newlyCompletedSets(owned, layout.setsCompleted)`.
2. For each `setId` in `fresh`: build `makeKeepsake("set", todayKey(), { set: setId, word: aMasteredWordOrUndefined })`, `addKeepsake` it to `layout.keepsakes`, and push `setId` into `layout.setsCompleted`.
3. Persist the updated `streetLayout` through the existing store-save path used elsewhere in this module (the same one that saves placements), and mark the layout dirty for sync (same dirty bit placements use).
4. Show a one-shot banner using existing nine-slice/panel UI: `t("street.setComplete", { set: t("street.set." + setId) })`.
5. In the scene render, when a placed piece's `id` belongs to a completed set, pass the existing "celebrate/light" glow through `drawStreetBehavior` (reuse — no new draw code).

`todayKey()` = the module's existing local-date accessor (the same `"YYYY-MM-DD"` source the daily-quest/season code uses via deps). Do not call `Date` inside pure modules.

- [ ] **Step 2: Add i18n keys (EN + TH)**

Add to `src/i18n.js` under the street block, both locales:

```
street.setComplete: "{set} complete ✨"     // TH: "{set} ครบชุดแล้ว ✨"
street.set.market: "Night Market"           // TH: "ตลาดกลางคืน"
street.set.garden: "Garden"                 // TH: "สวน"
street.set.festival: "Festival"             // TH: "เทศกาล"
```

- [ ] **Step 3: Verify in a browser (manual)**

Run: `cd game && npm run build && npm run serve`, open `http://localhost:8000`, grant coins (dev), buy the final missing item of a set, confirm the banner appears once, a keepsake lands in the shelf (Task 12), and re-entering the Street does not re-fire the banner.

- [ ] **Step 4: Gate + commit**

```bash
cd game && npm test && npm run lint && npm run build
git add src/ui/street-screen.js src/i18n.js
git commit -m "feat(street): set-completion payoff — one-time banner, glow, keepsake grant"
```

---

## Task 9: Collection book overlay

**Files:**
- Modify: `index.html` (a collection-book overlay container, following the existing Street overlay markup pattern)
- Modify: `src/ui/street-screen.js` (an entry button on the Street; render `collectionView` into the overlay)
- Modify: `src/i18n.js` (EN + TH)

**Interfaces:**
- Consumes: `collectionView(owned, tiers)` (Task 4).
- Produces: a read-only overlay grouping decorations by set (owned = sprite; unowned = the same sprite at reduced opacity as a "locked" silhouette — no new art), showing tier stars, price, per-set "N of M" and a complete check. "Buy" affordances route to the existing Street Shop preview flow (`openStreetPreview`/`openStreetShop`).

- [ ] **Step 1: Implement the overlay**

1. Add a `#street-collection` overlay to `index.html` mirroring the existing Street Shop overlay structure (backdrop + panel + close button).
2. Add a "Collection" button on the Street (near the existing Quests/Shop buttons).
3. On open, render `collectionView(getShopState().owned, getShopState().tiers)`: one section per set with header `t("street.collectionSetHeader", { name, owned, total })` + a ✓ when `complete`; each item shows its sprite (reduced opacity when `!owned`), tier stars for owned, and price for unowned. Tapping an unowned item closes the overlay and opens the existing preview for that id.
4. Localize the empty/loading states.

- [ ] **Step 2: Add i18n keys (EN + TH)**

```
street.collection: "Collection"                              // TH: "คอลเลกชัน"
street.collectionSetHeader: "{name} — {owned}/{total}"       // TH identical shape
street.collectionComplete: "Complete ✓"                      // TH: "ครบแล้ว ✓"
street.collectionLocked: "Not yet owned"                     // TH: "ยังไม่มี"
```

- [ ] **Step 3: Verify in a browser (manual)** — open the Street, tap Collection, confirm three sets render with correct owned/locked/tier/price and the "N of M" counts, and tapping a locked item opens its shop preview.

- [ ] **Step 4: Gate + commit**

```bash
cd game && npm test && npm run lint && npm run build
git add index.html src/ui/street-screen.js src/i18n.js
git commit -m "feat(street): collection book overlay — sets, owned/locked, tiers, prices"
```

---

## Task 10: Name your street

**Files:**
- Modify: `index.html` (name control/dialog)
- Modify: `src/ui/street-screen.js` (edit + persist `streetLayout.name`; show in caption + results)
- Modify: `src/i18n.js` (EN + TH)

**Interfaces:**
- Consumes: `streetLayout.name` (Task 1; already trimmed/capped by `normalizeStreetLayout`).
- Produces: an editable street title shown in the Street caption and the post-round results readout; empty ⇒ existing generic caption.

- [ ] **Step 1: Implement**

1. Add an "edit name" affordance (a small pencil next to the caption).
2. On submit, set `layout.name = value` (the store/normalize enforces trim + 24-cap), persist through the same store-save path as placements, mark layout dirty.
3. In the caption render, when `layout.name` is non-empty show `t("street.namedCaption", { name })`; otherwise the existing caption.
4. In `renderProjectResults` (results readout), prefix with the name when set.

- [ ] **Step 2: i18n (EN + TH)**

```
street.nameEdit: "Name your street"          // TH: "ตั้งชื่อถนนของคุณ"
street.namePlaceholder: "e.g. Sunny Lane"    // TH: "เช่น ถนนแสงตะวัน"
street.namedCaption: "{name}"                // TH: "{name}"
```

- [ ] **Step 3: Verify (manual)** — set a name (try >24 chars + surrounding spaces → stored trimmed/capped), confirm it shows in the caption and after a round; clear it → generic caption returns.

- [ ] **Step 4: Gate + commit**

```bash
cd game && npm test && npm run lint && npm run build
git add index.html src/ui/street-screen.js src/i18n.js
git commit -m "feat(street): name-your-street — caption + results readout"
```

---

## Task 11: Saved layouts (×3)

**Files:**
- Modify: `index.html` (three save/load slot controls inside the edit toolbar)
- Modify: `src/ui/street-screen.js` (save/load/overwrite against `streetLayout.savedLayouts`)
- Modify: `src/i18n.js` (EN + TH)

**Interfaces:**
- Consumes: `streetLayout.savedLayouts` (Task 1); `normalizeStreetLayout` (drops entries referencing absent/unowned ids on load).
- Produces: up to 3 named slots; Save captures the current `placements`; Load replaces live `placements` (then re-normalizes against current ownership); overwriting an occupied slot confirms first.

- [ ] **Step 1: Implement**

1. In the existing edit-mode toolbar (Store/Undo/Auto-arrange/Cancel/Done), add a "Layouts" control exposing 3 slots.
2. Save slot _i_: `layout.savedLayouts[i] = { name, placements: { ...layout.placements } }` (cap 3, enforced by normalize); persist + dirty.
3. Load slot _i_: `layout.placements = { ...slot.placements }`, then run the existing normalize-on-save so any absent/unowned/incompatible entries drop silently; persist + dirty.
4. Overwrite confirm when the target slot is occupied.

- [ ] **Step 2: i18n (EN + TH)**

```
street.layouts: "Layouts"                    // TH: "เลย์เอาต์"
street.layoutSave: "Save here"               // TH: "บันทึกที่นี่"
street.layoutLoad: "Load"                    // TH: "โหลด"
street.layoutSlot: "Slot {n}"                // TH: "ช่อง {n}"
street.layoutOverwrite: "Replace this saved layout?"  // TH: "แทนที่เลย์เอาต์ที่บันทึกไว้?"
```

- [ ] **Step 3: Verify (manual)** — arrange, save to slot 1; rearrange; load slot 1 → original arrangement restored; sell/unequip an item present in a saved slot, load again → that item silently absent, no crash.

- [ ] **Step 4: Gate + commit**

```bash
cd game && npm test && npm run lint && npm run build
git add index.html src/ui/street-screen.js src/i18n.js
git commit -m "feat(street): saved layouts x3 — save/load/overwrite"
```

---

## Task 12: Keepsake shelf overlay

**Files:**
- Modify: `index.html` (keepsake shelf overlay)
- Modify: `src/ui/street-screen.js` (render `streetLayout.keepsakes`)
- Modify: `src/i18n.js` (EN + TH)

**Interfaces:**
- Consumes: `streetLayout.keepsakes` (Task 1), written by Tasks 8 (set) and 13 (daily) and the existing welcome moment.
- Produces: a cozy shelf listing keepsakes newest-first, each with a per-`kind` caption and, when present, the frozen `word` shown as display text only (never a review trigger).

- [ ] **Step 1: Implement**

1. Add a `#street-keepsakes` overlay (existing overlay pattern) + a "Keepsakes" entry button on the Street.
2. Render each keepsake with an icon by `kind` and copy: welcome → `t("street.keepsakeWelcome")`; set → `t("street.keepsakeSet", { set })`; daily → `t("street.keepsakeDaily", { day })`. When `k.word` is set, append `t("street.keepsakeWord", { word: k.word })` — plain text, no tap-to-review.
3. Empty state when no keepsakes yet.

- [ ] **Step 2: i18n (EN + TH)**

```
street.keepsakes: "Keepsakes"                          // TH: "ของที่ระลึก"
street.keepsakeWelcome: "Your first lantern"           // TH: "โคมไฟดวงแรกของคุณ"
street.keepsakeSet: "{set} set completed"              // TH: "สะสมชุด {set} ครบแล้ว"
street.keepsakeDaily: "A neighbour dropped by"         // TH: "เพื่อนบ้านแวะมา"
street.keepsakeWord: "— you'd learned {word}"          // TH: "— คุณเรียน {word} แล้ว"
street.keepsakesEmpty: "Keepsakes you earn will rest here." // TH: "ของที่ระลึกที่ได้จะอยู่ที่นี่"
```

- [ ] **Step 3: Verify (manual)** — complete a set and trigger a daily gift; confirm both keepsakes appear newest-first with correct copy, and a keepsake carrying a word shows it as plain text.

- [ ] **Step 4: Gate + commit**

```bash
cd game && npm test && npm run lint && npm run build
git add index.html src/ui/street-screen.js src/i18n.js
git commit -m "feat(street): keepsake shelf overlay — cosmetic mementos"
```

---

## Task 13: Daily surprise on-show (neighbour gift + time-of-day tint)

**Files:**
- Modify: `src/ui/street-screen.js` (on-show new-day check; credit gift; render neighbour cat + tint)
- Modify: `src/i18n.js` (EN + TH — **guardrail-reviewed copy**)

**Interfaces:**
- Consumes: `isNewDay`/`dailyGift` (Task 6), `makeKeepsake`/`addKeepsake` (Task 5), `SKIN_PALETTES` (already used by the resident), the deps' wallet-credit + today-key accessors.
- Produces: on the first Street show of a new calendar day: credit `gift.coins` to the wallet, optionally add a `kind:"daily"` keepsake (id `daily:<day>`), set `layout.lastVisitDay = todayKey`, persist (+ dirty), and show a passing neighbour cat (existing cat art recoloured via `SKIN_PALETTES[gift.neighbour]`) with a warm greeting. A time-of-day tint (cosmetic canvas overlay, not stored) is applied to the scene each render.

- [ ] **Step 1: Implement the on-show check**

In the Street show/visibility path (the same gate that starts the resident loop):

1. `const today = todayKey();` if `isNewDay(layout.lastVisitDay, today)`:
   - `const gift = dailyGift(today);`
   - credit `gift.coins` via the deps' wallet-add (the same path battle rewards use — this is coins IN only, allowed);
   - if `gift.keepsake`: `layout.keepsakes = addKeepsake(layout.keepsakes, makeKeepsake("daily", today, { word: aMasteredWordOrUndefined }))`;
   - `layout.lastVisitDay = today`; persist streetLayout + mark dirty.
   - Trigger a one-shot neighbour animation + toast: `t("street.dailyGreeting")` and `t("street.dailyGift", { coins: gift.coins })`.
2. **Guardrail:** do not compute or display any streak/day-count, "in danger", or missed-day text. If `!isNewDay`, do nothing at all (no "come back tomorrow" nag).

- [ ] **Step 2: Time-of-day tint**

In the scene render, apply a cosmetic tint chosen from the current hour bucket (morning/day/dusk/night) — a low-alpha `fillRect` over the background, using the deps' clock accessor for the hour (rendering may read the real clock; only the persisted gift is date-keyed). Reduced-motion is unaffected (tint is static).

- [ ] **Step 3: i18n (EN + TH) — guardrail-reviewed**

```
street.dailyGreeting: "A neighbour stopped by!"        // TH: "เพื่อนบ้านแวะมา!"
street.dailyGift: "They left you {coins} coins."       // TH: "ฝากเหรียญไว้ให้ {coins} เหรียญ"
```

No loss/guilt/countdown strings exist for this feature. (Confirm with a grep in Step 4.)

- [ ] **Step 4: Verify (manual) + guardrail grep**

Run: `cd game && npm run build && npm run serve`; open the Street on a fresh day (or clear `lastVisitDay` in the stored shop) → neighbour + coins credited once; reopen same day → nothing re-fires; scene tint differs by time of day.
Run: `grep -riE "streak|in danger|don'?t lose|missed|come back" src/i18n.js` and confirm no such copy was added for `street.daily*`.

- [ ] **Step 5: Gate + commit**

```bash
cd game && npm test && npm run lint && npm run build
git add src/ui/street-screen.js src/i18n.js
git commit -m "feat(street): positive-only daily surprise — neighbour gift + time-of-day tint"
```

---

## Task 14: Escrow toggle UI + spendable-wallet gate

**Files:**
- Modify: `src/ui/street-screen.js` (a reserve toggle in the project UI; gate other Street Shop purchases against `wallet − reservedAmount`)
- Modify: `src/i18n.js` (EN + TH)

**Interfaces:**
- Consumes: `reservedAmount(project, item, wallet)` (Task 7).
- Produces: an opt-in "reserve coins for this build" toggle (default off) on the active project; when on, the Street Shop's affordability for OTHER items is computed against `wallet − reservedAmount(project, projectItem, wallet)`, and an attempt to buy another item that would dip into the reserve is blocked with a gentle hint. The `off` path behaves exactly as today.

- [ ] **Step 1: Implement**

1. When a project is active, show a toggle bound to `streetProject.reserve`; toggling persists the project (+ project dirty bit) through the existing project-save path.
2. Where the Street Shop computes whether the player can afford a NON-project item, subtract the reserve: `const spendable = wallet - reservedAmount(project, catalogItem(project.itemId), wallet);` gate the buy button / purchase on `spendable >= item.price`.
3. When blocked by the reserve, show `t("street.reserveBlocked")` instead of the generic "not enough coins".
4. Leave `buy()` in `shop.js` untouched — the gate is purely at the Street Shop affordability layer, so all existing `shop`/`buy` tests stay green.

- [ ] **Step 2: i18n (EN + TH)**

```
street.reserveToggle: "Reserve coins for this build"   // TH: "กันเหรียญไว้สำหรับงานนี้"
street.reserveHint: "Reserved coins stay set aside for your next build." // TH: "เหรียญที่กันไว้จะถูกเก็บไว้สำหรับงานถัดไป"
street.reserveBlocked: "Those coins are reserved for your build." // TH: "เหรียญเหล่านั้นถูกกันไว้สำหรับงานของคุณ"
```

- [ ] **Step 3: Verify (manual)** — set a project, toggle reserve on; with coins between the reserve and a second item's price, confirm the second item can't be bought and shows the reserve hint; toggle off → it can be bought again; confirm the project meter doesn't regress while reserved.

- [ ] **Step 4: Gate + commit**

```bash
cd game && npm test && npm run lint && npm run build
git add src/ui/street-screen.js src/i18n.js
git commit -m "feat(street): opt-in escrow toggle + spendable-wallet gate in Street Shop"
```

---

## Final verification

- [ ] **Full gate:** `cd game && npm test && npm run lint && npm run build` — all green (never mask the test exit code).
- [ ] **i18n parity:** confirm every new `street.*` key has both an EN and a TH entry (`test/i18n-usage.test.js` scans `src/` recursively and will flag a used-but-undefined key).
- [ ] **Migration smoke:** in a browser, seed a `v2`-shaped `nbhsk.shop` in localStorage, reload, confirm boot + Street render + `schemaVersion` now `3`, no data loss.
- [ ] **Guardrail check:** re-grep for loss/guilt/streak copy in the daily-surprise strings — none present.
- [ ] Note for release (not this branch): the SHELL cache version in `sw.js` gets bumped at release-cut time so installed PWAs fetch the new `dist/app.js`.

---

## Self-review notes (author)

- **Spec coverage:** set payoffs (T8) · collection book (T9) · name (T10) · saved layouts (T11) · keepsake shelf (T12) · daily surprise + tint (T13) · escrow (T7+T14) · data model v3 (T1) · migration (T2) · merge fold (T3) · i18n EN+TH (each wiring task) · testing (T1–T7 + final). All spec sections map to a task.
- **Type consistency:** `streetLayout` v3 fields (`name`/`savedLayouts`/`keepsakes`/`setsCompleted`/`lastVisitDay`) are defined in T1 and consumed by T3/T8/T10/T11/T12/T13; `reserve` defined in T7, consumed in T14; `newlyCompletedSets`/`collectionView` defined in T4, consumed in T8/T9; `makeKeepsake`/`addKeepsake` in T5, consumed in T8/T13; `isNewDay`/`dailyGift` in T6, consumed in T13; `reservedAmount` in T7, consumed in T14. Names match across tasks.
- **Known follow-up (pre-existing, out of scope):** the street inventory `deco-<id>.png` 404→vector fallback for non-deco owned ids (cosmetic, since v98) is not addressed here.
