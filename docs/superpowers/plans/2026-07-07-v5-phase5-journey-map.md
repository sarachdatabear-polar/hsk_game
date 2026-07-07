# PRD v5 Phase 5 — B3 Journey Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An optional "Journey" view on the scope-selection screen — each HSK level a path of nodes (one per sub-scope), 0–3 stars from mastery coverage, a "you are here" cat marker, no hard gating: tapping any node starts that scope; the free-choice picker remains untouched.

**Architecture:** New pure module `src/journey.js` builds the node list (reusing `scopeNodes` from stickers.js), computes star counts (★≥50%, ★★≥80%, ★★★100%) from the same floored `scopeFacts` percentages B2 uses (map and album stay consistent by construction), and picks the current position (first node below ★★). The scope screen gets a two-tab toggle (Picker | Journey); the Journey pane is DOM-rendered by `renderJourney()` in main.js — node buttons along a vertical path, tap → set scope to that node (level + topN) → existing `renderScope()` pipeline recomputes the pool → battle starts through the normal `#go-battle` flow, or directly via a per-node START.

**Tech Stack:** Vanilla JS + inline CSS, vitest. No new npm dependencies.

**Source spec:** `docs/prd/PRD-v5-visual-retention.md` §5 B3.

## Global Constraints

- Pure logic in vitest-tested modules; `main.js` stays wiring-only; **no new npm dependencies**; `file://` keeps working.
- **No hard gating** — every node is always playable (education-first); the map only *suggests* order via the path and the "you are here" marker.
- Star thresholds exactly: ★ ≥50%, ★★ ≥80%, ★★★ 100% (100% = the B2 scope/milestone sticker — same floored pcts so the two systems agree).
- The existing free-choice picker stays fully functional and visually untouched apart from the tab row.
- Map and picker must show consistent data (both read `scope` and the same mastery facts).
- Every new user-facing string in BOTH `en` and `th`; CSS via tokens only (hex lint active).
- All existing tests stay green; `npm run build` after `src/` changes; `sw.js` SHELL bump exactly once, final task (v27 → v28).
- Branch `feat/v5-phase5-journey-map` off `development`; commits `feat(journey):` / `test:`.

## Verified code facts (do not re-derive)

- `src/stickers.js` exports `scopeNodes(levelCounts)` → `[{id:"HSK{lv}·top{N}"|"HSK{lv}·all", lv, topN}]` (topN 0 for the full level) and `scopeFacts(levelsData, mastery)` → `{levelCounts, scopePcts, levelPcts}` with floored pcts keyed by the same node ids.
- `renderScope()` in main.js: rebuilds `#lv-chips`, syncs `#topn-chips` via `+c.dataset.n===scope.topN`, rebuilds `pool = buildPool(D.levels, scope)`, persists `store.set("scope", scope)`, disables `#go-battle/#go-endless/#go-learn` below 8 words. Scope shape: `{levels:[int], core, newOnly, topN, lang, sessionLen}` — setting `scope.levels=[lv]; scope.topN=N; scope.core=false; scope.newOnly=false` then calling `renderScope()` fully applies a node.
- `#s-scope` markup: back button → `<h2 data-i18n="scope.title">` → `.sect` Levels → `#lv-chips` → `#preset-chips` → filters → `#topn-chips` → lang → len → `#readout` → `.startrow` (`#go-battle`, `#go-endless`, `#go-learn`).
- The `[data-go]` listener routes `scope` and `scope-learn` through `renderScope(); show("scope")`.
- `startBattle("round")` reads the module `pool`; `#go-battle` click handler already exists (found via `setIconLabel($("#go-battle"), ...)`).
- `masteryStore`, `D.levels`, `iconSvg`, `t`, `store`, `$` all in main.js scope. `STICKER_LEVEL_COUNTS` (Object of level→count) already exists in main.js (Phase 4).
- i18n `t(key, params)` interpolates `{name}` tokens; parity test enforces en/th.
- Level word counts: HSK1 205, HSK2 479, HSK3 1356, HSK4 3362, HSK5 6570, HSK6 10055 → node counts per level: HSK1 2 (top100, all), HSK2 3, HSK3–6 4 each → 21 nodes total.
- Suite: 531 tests / 32 files green. SHELL `nbhsk-shell-v27`.

---

### Task 1: `src/journey.js` pure module (TDD)

**Files:**
- Create: `src/journey.js`
- Test: `test/journey.test.js`

**Interfaces:**
- Consumes: `scopeNodes` from `./stickers.js`.
- Produces: `STAR_THRESHOLDS = [50, 80, 100]`; `starsFor(pct): 0|1|2|3`; `journeyNodes(levelCounts, scopePcts): [{id, lv, topN, pct, stars}]` (scopeNodes order); `currentNodeId(nodes): string|null` (first node with stars < 2; null when every node is ★★+).

- [ ] **Step 1: Create the branch**

```bash
git checkout development && git pull --ff-only && git checkout -b feat/v5-phase5-journey-map
```

- [ ] **Step 2: Write the failing test**

Create `test/journey.test.js`:

```js
import { describe, it, expect } from "vitest";
import { STAR_THRESHOLDS, starsFor, journeyNodes, currentNodeId } from "../src/journey.js";

describe("starsFor", () => {
  it("maps coverage pct to 0-3 stars at 50/80/100 (PRD B3)", () => {
    expect(STAR_THRESHOLDS).toEqual([50, 80, 100]);
    expect(starsFor(0)).toBe(0);
    expect(starsFor(49)).toBe(0);
    expect(starsFor(50)).toBe(1);
    expect(starsFor(79)).toBe(1);
    expect(starsFor(80)).toBe(2);
    expect(starsFor(99)).toBe(2);
    expect(starsFor(100)).toBe(3);
  });
});

describe("journeyNodes", () => {
  const counts = { 1: 205, 2: 479 };
  it("one node per sub-scope in path order, with pct and stars attached", () => {
    const nodes = journeyNodes(counts, { "HSK1·top100": 100, "HSK1·all": 60, "HSK2·top100": 30 });
    expect(nodes.map(n => n.id)).toEqual(["HSK1·top100", "HSK1·all", "HSK2·top100", "HSK2·top300", "HSK2·all"]);
    expect(nodes[0]).toEqual({ id: "HSK1·top100", lv: 1, topN: 100, pct: 100, stars: 3 });
    expect(nodes[1].stars).toBe(1);
    expect(nodes[3].pct).toBe(0);   // missing pct reads 0
    expect(nodes[3].stars).toBe(0);
  });
});

describe("currentNodeId", () => {
  const mk = stars => stars.map((s, i) => ({ id: "n" + i, stars: s }));
  it("is the first node below two stars (the 'you are here' marker)", () => {
    expect(currentNodeId(mk([3, 2, 1, 0]))).toBe("n2");
    expect(currentNodeId(mk([0, 0]))).toBe("n0");
    expect(currentNodeId(mk([2, 3, 2]))).toBe(null);   // everything ★★+ — journey complete
    expect(currentNodeId([])).toBe(null);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run test/journey.test.js`
Expected: FAIL — cannot resolve `../src/journey.js`.

- [ ] **Step 4: Implement `src/journey.js`**

```js
"use strict";
// Journey map (PRD v5 B3). Pure: node list, star computation, current
// position. main.js renders the map; stickers.js owns the shared sub-scope
// node catalog and the floored mastery percentages, so the journey map and
// the sticker album can never disagree about progress.
import { scopeNodes } from "./stickers.js";

// ★ ≥50%, ★★ ≥80%, ★★★ 100% (100% also earns the B2 scope/milestone sticker)
export const STAR_THRESHOLDS = [50, 80, 100];

export function starsFor(pct) {
  let stars = 0;
  for (const th of STAR_THRESHOLDS) if (pct >= th) stars++;
  return stars;
}

// The path: scopeNodes order (Top-100 → Top-300 → Top-500 → full level, per
// level ascending), each node annotated with its coverage pct and stars.
export function journeyNodes(levelCounts, scopePcts) {
  return scopeNodes(levelCounts).map(n => {
    const pct = scopePcts[n.id] ?? 0;
    return { ...n, pct, stars: starsFor(pct) };
  });
}

// "You are here": the first node still below two stars. The map only
// SUGGESTS this order — every node stays playable (no hard gating).
export function currentNodeId(nodes) {
  const cur = nodes.find(n => n.stars < 2);
  return cur ? cur.id : null;
}
```

- [ ] **Step 5: Run to verify pass, then full suite**

Run: `npx vitest run test/journey.test.js` → PASS (3 tests).
Run: `npm test` → all green (534).

- [ ] **Step 6: Commit**

```bash
git add src/journey.js test/journey.test.js
git commit -m "feat(journey): pure module — path nodes, star thresholds, current position (B3)"
```

---

### Task 2: Journey view on the scope screen

**Files:**
- Modify: `index.html` (tab row + `#journey-pane` markup + CSS)
- Modify: `src/i18n.js` (keys × 2 locales)
- Modify: `src/main.js` (imports, view state, `renderJourney()`, tab wiring)

**Interfaces:**
- Consumes: `journeyNodes`, `currentNodeId` from Task 1; `scopeFacts`, `STICKER_LEVEL_COUNTS` (already in main.js); `renderScope()`, `startBattle`, `scope`, `store`.
- Produces: `nbhsk.scopeView` store key (`"picker"` | `"journey"`).

- [ ] **Step 1: i18n keys (both tables)**

`en` (next to other `scope.*` keys):

```js
    // journey map (B3)
    "scope.tabPicker": "Picker",
    "scope.tabJourney": "Journey",
    "journey.youAreHere": "You are here",
    "journey.nodeAll": "HSK{lv} · All words",
    "journey.nodeTop": "HSK{lv} · Top {n}",
    "journey.play": "Play",
```

`th` (same position):

```js
    // journey map (B3)
    "scope.tabPicker": "เลือกเอง",
    "scope.tabJourney": "เส้นทาง",
    "journey.youAreHere": "คุณอยู่ตรงนี้",
    "journey.nodeAll": "HSK{lv} · คำทั้งหมด",
    "journey.nodeTop": "HSK{lv} · Top {n}",
    "journey.play": "เล่น",
```

- [ ] **Step 2: markup — tab row + journey pane**

In `#s-scope`, directly after the `<h2 data-i18n="scope.title">Choose your words</h2>` line, add:

```html
    <!-- B3: view toggle — the picker stays the default and untouched; the
         journey map is an optional suggested-order view over the same scopes -->
    <div class="chips" id="scope-view-tabs">
      <button class="chip on" data-view="picker" data-i18n="scope.tabPicker">Picker</button>
      <button class="chip" data-view="journey" data-i18n="scope.tabJourney">Journey</button>
    </div>
    <div id="journey-pane" hidden>
      <div id="journey-list"></div>
    </div>
    <div id="picker-pane">
```

Then find the END of the picker content — the `.startrow` div's closing `</div>` (the one after `#go-learn`'s button) — and add a closing `</div>` for `#picker-pane` right after it, BEFORE the screen's own closing `</div>`. The picker's existing markup between those two points is otherwise untouched.

- [ ] **Step 3: CSS — after the `.sticker-toast .asset-icon` rule**

```css
  /* B3 journey map: vertical path of nodes; stars show coverage; the cat
     marker suggests where to go next — every node stays tappable */
  #journey-list{display:flex; flex-direction:column; gap:0; overflow-y:auto; flex:1; padding:4px 0;}
  .j-node{display:flex; align-items:center; gap:10px; width:100%; text-align:left;
    background-color:var(--panel-wash); border:1px solid var(--panel-border); border-radius:14px;
    padding:10px 12px; margin:3px 0; box-shadow:0 2px 6px rgba(46,42,36,.08); position:relative;}
  .j-node:active{transform:scale(.98);}
  .j-node::before{content:""; position:absolute; left:26px; top:-8px; width:3px; height:8px;
    background:var(--lc-sand);}   /* path line between nodes */
  .j-node:first-child::before{display:none;}
  .j-dot{width:34px; height:34px; min-width:34px; border-radius:50%; display:flex; align-items:center;
    justify-content:center; background-color:var(--lc-sand); border:2px solid var(--lc-brown);
    font-weight:800; font-size:12px; color:var(--lc-brown);}
  .j-node.done .j-dot{background-color:var(--lc-green); border-color:var(--lc-green-deep); color:var(--lc-cream);}
  .j-copy{flex:1; min-width:0; display:flex; flex-direction:column; gap:2px;}
  .j-copy b{font-size:13.5px; color:var(--ink);}
  .j-stars{font-size:12px; letter-spacing:.1em; color:var(--lc-sun-deep);}
  .j-stars .off{color:var(--lc-gray);}
  .j-here{display:inline-flex; align-items:center; gap:4px; font-size:10.5px; font-weight:800;
    color:var(--lc-teal); background-color:var(--lc-sky); border-radius:999px; padding:2px 8px;
    align-self:flex-start;}
  .j-here .asset-icon{width:12px; height:12px;}
  .j-play{background-color:var(--lc-sun);
    background-image:linear-gradient(180deg,var(--lc-sun-hi),var(--lc-sun) 55%,var(--lc-sun-deep));
    border:2px solid var(--lc-brown); border-radius:12px; color:var(--lc-brown);
    font-weight:800; font-size:12.5px; padding:8px 12px; min-height:40px; flex:0 0 auto;}
```

- [ ] **Step 4: main.js — imports, view state, renderer, wiring**

Add the import (next to the stickers.js import):

```js
import { journeyNodes, currentNodeId } from "./journey.js";
```

Add right after the `function renderScope(){ ... }` closing brace:

```js
/* ============================== journey map (B3) ============================== */
// Optional suggested-order view over the same sub-scopes as the picker and
// the sticker album (shared scopeNodes/scopeFacts — always consistent).
// No hard gating: every node starts its scope immediately.
let scopeView = store.get("scopeView", "picker");
function applyScopeView(){
  $("#picker-pane").hidden = scopeView !== "picker";
  $("#journey-pane").hidden = scopeView !== "journey";
  document.querySelectorAll("#scope-view-tabs .chip").forEach(c =>
    c.classList.toggle("on", c.dataset.view === scopeView));
  if(scopeView === "journey") renderJourney();
}
document.querySelectorAll("#scope-view-tabs .chip").forEach(b =>
  b.addEventListener("click", ()=>{
    scopeView = b.dataset.view;
    store.set("scopeView", scopeView);
    applyScopeView();
  }));
function nodeLabel(n){
  return n.topN ? t("journey.nodeTop", { lv: n.lv, n: n.topN }) : t("journey.nodeAll", { lv: n.lv });
}
function playJourneyNode(n){
  scope.levels = [n.lv];
  scope.topN = n.topN;
  scope.core = false;
  scope.newOnly = false;
  renderScope();          // rebuilds pool + persists scope
  if(pool.length >= 8) startBattle("round");
}
function renderJourney(){
  const facts = scopeFacts(D.levels, masteryStore);
  const nodes = journeyNodes(STICKER_LEVEL_COUNTS, facts.scopePcts);
  const hereId = currentNodeId(nodes);
  const box = $("#journey-list");
  box.innerHTML = "";
  for(const n of nodes){
    const row = document.createElement("button");
    row.className = "j-node" + (n.stars >= 3 ? " done" : "");
    const dot = document.createElement("span");
    dot.className = "j-dot";
    dot.textContent = n.stars >= 3 ? "✓" : `${n.pct}%`;
    row.appendChild(dot);
    const copy = document.createElement("span");
    copy.className = "j-copy";
    const name = document.createElement("b");
    name.textContent = nodeLabel(n);
    copy.appendChild(name);
    const stars = document.createElement("span");
    stars.className = "j-stars";
    stars.innerHTML = "★".repeat(n.stars) + `<span class="off">${"★".repeat(3 - n.stars)}</span>`;
    copy.appendChild(stars);
    if(n.id === hereId){
      const here = document.createElement("span");
      here.className = "j-here";
      here.appendChild(iconSvg("paw"));
      const hl = document.createElement("span");
      hl.textContent = t("journey.youAreHere");
      here.appendChild(hl);
      copy.appendChild(here);
    }
    row.appendChild(copy);
    const play = document.createElement("span");
    play.className = "j-play";
    play.textContent = t("journey.play");
    row.appendChild(play);
    row.onclick = ()=> playJourneyNode(n);
    box.appendChild(row);
  }
}
```

In the `[data-go]` listener, extend the two scope routes so the view state applies on entry. Replace:

```js
  if(t==="scope"){ renderScope(); show("scope"); }
  else if(t==="scope-learn"){ renderScope(); show("scope"); }
```

with:

```js
  if(t==="scope"){ renderScope(); applyScopeView(); show("scope"); }
  else if(t==="scope-learn"){ renderScope(); applyScopeView(); show("scope"); }
```

- [ ] **Step 5: Build, test, commit**

```bash
npm run build && npm test
```
Expected: all green (534; i18n parity holds; hex lint green).

```bash
git add index.html src/i18n.js src/main.js dist/app.js
git commit -m "feat(journey): journey view on the scope screen — path, stars, you-are-here, tap-to-play (B3)"
```

---

### Task 3: SHELL bump + wrap

**Files:**
- Modify: `sw.js` (SHELL v27 → v28)

- [ ] **Step 1: SHELL bump**

In `sw.js` replace: `const SHELL = "nbhsk-shell-v27";`
with: `const SHELL = "nbhsk-shell-v28";`

- [ ] **Step 2: Final verification + commit**

```bash
npm run build && npm test
```
Expected: all green.

```bash
git add sw.js
git commit -m "feat(journey): SHELL v28 (B3)"
```

> **Controller checkpoint (not the implementer):** scripted browser pass — scope screen shows the Picker/Journey tabs with the picker default and unchanged; switching to Journey shows 21 nodes in path order with star rows, %-dots, and the you-are-here badge on the first <★★ node; tapping a node starts a battle over exactly that sub-scope (verify `nbhsk.scope` after tap: levels=[lv], topN=N); map/picker consistency (select HSK2 top300 in the picker → journey's HSK2·top300 node reflects the same scope pool); view choice persists across reload; TH locale renders; a fully-seeded mastery store shows ✓ dots and no here-badge.

---

## Self-review notes (already applied)

- **Spec coverage:** optional Journey view as a tab next to the picker (picker untouched) ✓; one node per scope (the per-level sub-scope keys — same `scopeNodes` catalog as B2) ✓; stars ★≥50/★★≥80/★★★100 with 100% aligning with the B2 scope sticker (shared floored pcts) ✓; no hard gating — every node tappable, marker only suggests ✓; pure `journey.js` (node list, star computation, current-position rule) + tests ✓; map rendering wired in main.js ✓; "map and picker show consistent data" — both derive from the same `scope`/`D.levels`/`masteryStore`, and the checkpoint verifies it ✓; "tapping any node starts that scope" ✓ (guarded by the existing ≥8-words startability rule — below 8 the tap still applies the scope and leaves the player on the picker-ready screen; flagged for the reviewer as the intended reading of "starts that scope").
- **Judgment calls flagged for review:** the journey view reuses the reference's card/plaque visual language via CSS (nodes as cream cards on a sand path line) rather than a canvas village scene — the PRD's "drawn in the village/street visual language" is interpreted as token-styled DOM for this round (canvas art belongs to the A2 pipeline); `playJourneyNode` resets `core`/`newOnly` so a node always means exactly its sub-scope.
- **Type consistency:** `journeyNodes` output `{id, lv, topN, pct, stars}` used identically in Task 2; `STICKER_LEVEL_COUNTS`/`scopeFacts` names match Phase 4's main.js; store key `scopeView` read/write symmetric.
- **Placeholder scan:** clean.
