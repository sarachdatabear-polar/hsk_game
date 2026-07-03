# Session-Length Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the player choose how many words a Battle / Fight Misses round uses (20 / 40 / 100 / typed custom), replacing the hardcoded 20.

**Architecture:** A "Session length" chip row on the scope screen (same pattern as the Top-N row) drives a `sessionLen` field persisted inside the existing `nbhsk.scope` localStorage blob. Two new pure helpers in `src/pool.js` (`normalizeLen`, `modeKey`) carry all testable logic; `src/main.js` wiring stays thin. Fight Misses inherits the length automatically because it funnels through `startBattle("round")`.

**Tech Stack:** Vanilla JS (esbuild IIFE bundle), vitest for unit tests. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-03-session-length-design.md`

## Global Constraints

- Length clamp is exactly **5–500**; `null`/`undefined`/`""`/`NaN` → default **20**.
- High-score key: round of 20 keeps legacy key `round`; other lengths use `round{len}` (e.g. `round40`). `endless` key never changes.
- Endless mode stays `Infinity` words — untouched.
- Persist only `sessionLen` (a number) inside the `nbhsk.scope` blob — no separate localStorage key, no "custom" flag.
- Follow existing UI idioms: `.sect` label + `.chips`/`.chip`/`.on` classes; custom input styled like a chip.
- All 30 existing tests must keep passing; run with `npm test`.

---

### Task 1: Pure helpers `normalizeLen` + `modeKey` (TDD)

**Files:**
- Modify: `src/pool.js` (append two exported functions after `meaning`, line 43)
- Create: `test/sessionlen.test.js`

**Interfaces:**
- Produces: `normalizeLen(v) -> number` (int, 5–500, default 20) and `modeKey(mode, len) -> string` — Task 2 imports both from `./pool.js`.

- [ ] **Step 1: Write the failing tests**

Create `test/sessionlen.test.js`:

```js
import { describe, it, expect } from "vitest";
import { normalizeLen, modeKey } from "../src/pool.js";

describe("normalizeLen", () => {
  it("defaults to 20 for missing or invalid input", () => {
    expect(normalizeLen(undefined)).toBe(20);
    expect(normalizeLen(null)).toBe(20);
    expect(normalizeLen("")).toBe(20);
    expect(normalizeLen("abc")).toBe(20);
    expect(normalizeLen(NaN)).toBe(20);
  });
  it("accepts valid lengths, coercing strings and rounding", () => {
    expect(normalizeLen(40)).toBe(40);
    expect(normalizeLen("100")).toBe(100);
    expect(normalizeLen(33.7)).toBe(34);
  });
  it("clamps to 5..500", () => {
    expect(normalizeLen(0)).toBe(5);
    expect(normalizeLen(4)).toBe(5);
    expect(normalizeLen(501)).toBe(500);
    expect(normalizeLen(9999)).toBe(500);
  });
});

describe("modeKey", () => {
  it("keeps legacy keys for round-of-20 and endless", () => {
    expect(modeKey("round", 20)).toBe("round");
    expect(modeKey("endless", Infinity)).toBe("endless");
  });
  it("appends length for non-default rounds", () => {
    expect(modeKey("round", 40)).toBe("round40");
    expect(modeKey("round", 100)).toBe("round100");
    expect(modeKey("round", 7)).toBe("round7");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: the new file FAILS with "does not provide an export named 'normalizeLen'"; the existing 30 tests still pass.

- [ ] **Step 3: Implement the helpers**

Append to `src/pool.js` (after the `meaning` function):

```js
// Session length: how many words a "round" battle spawns before it ends.
export function normalizeLen(v) {
  if (v === null || v === undefined || v === "") return 20;
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 20;
  return Math.min(500, Math.max(5, n));
}

// High-score bucket: longer rounds score more, so each length gets its own
// key — except 20, which keeps the legacy "round" key so old bests survive.
export function modeKey(mode, len) {
  return (mode === "round" && len !== 20) ? "round" + len : mode;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all pass (30 existing + 8 new).

- [ ] **Step 5: Commit**

```bash
git add src/pool.js test/sessionlen.test.js
git commit -m "feat: normalizeLen + modeKey helpers for session length"
```

---

### Task 2: Scope-screen picker UI + battle wiring

**Files:**
- Modify: `index.html` (CSS block ~line 56; scope screen markup after line 228)
- Modify: `src/main.js` (import line 2; scope defaults line 19; module state near line 24; `renderScope` lines 60–88; chip handlers near line 91; `startBattle` line 186; `endBattle` line 405)

**Interfaces:**
- Consumes: `normalizeLen(v)`, `modeKey(mode, len)` from `./pool.js` (Task 1).

- [ ] **Step 1: Add markup — `index.html`, between the closing `</div>` of `#lang-chips` (line 228) and `<div class="readout" id="readout">`:**

```html
    <div class="sect">Session length</div>
    <div class="chips" id="len-chips">
      <button class="chip" data-len="20">20</button>
      <button class="chip" data-len="40">40</button>
      <button class="chip" data-len="100">100</button>
      <button class="chip" data-len="custom">✏️ Custom</button>
      <input id="len-custom" type="number" inputmode="numeric" min="5" max="500" placeholder="5–500" hidden>
    </div>
```

- [ ] **Step 2: Add CSS — `index.html`, after the `.chip.preset{...}` rule (line 56):**

```css
  #len-custom{width:86px; padding:9px 14px; border-radius:999px; background:var(--chip);
    color:var(--ink); font-size:15px; font-weight:600; border:1px solid #5a2c22; text-align:center;}
  #len-custom:focus{outline:none; border-color:var(--gold);}
```

- [ ] **Step 3: Wire `src/main.js`**

3a. Extend the import (line 2):

```js
import { buildPool, coveragePct, scopeKey, meaning as meaningOf, normalizeLen, modeKey } from "./pool.js";
```

3b. Add `sessionLen` to the scope defaults (line 19):

```js
const scope = Object.assign({levels:[3], core:false, newOnly:false, topN:0, lang:"both", sessionLen:20},
                            store.get("scope", {}));
```

3c. Add transient UI state next to `let learnDeck = null;` (line 24):

```js
let lenCustomOpen = false;  // "Custom" chip tapped; input visible even if value matches a preset
```

3d. Inside `renderScope()`, immediately before `store.set("scope", scope);` (line 85), insert:

```js
  const len = normalizeLen(scope.sessionLen);
  scope.sessionLen = len;
  if(![20,40,100].includes(len)) lenCustomOpen = true;
  document.querySelectorAll("#len-chips .chip").forEach(c=>{
    const on = c.dataset.len==="custom" ? lenCustomOpen : (!lenCustomOpen && +c.dataset.len===len);
    c.classList.toggle("on", on);
  });
  const lenInput = $("#len-custom");
  lenInput.hidden = !lenCustomOpen;
  if(lenCustomOpen && document.activeElement !== lenInput) lenInput.value = len;
  $("#go-battle").textContent = `🧧 Battle · ${len}`;
```

3e. Add handlers next to the other chip handlers (after line 92):

```js
document.querySelectorAll("#len-chips .chip").forEach(c=>c.onclick = ()=>{
  if(c.dataset.len==="custom"){ lenCustomOpen = true; renderScope(); $("#len-custom").focus(); }
  else { lenCustomOpen = false; scope.sessionLen = +c.dataset.len; renderScope(); }
});
$("#len-custom").addEventListener("input", ()=>{
  scope.sessionLen = normalizeLen($("#len-custom").value);
  store.set("scope", scope);
  $("#go-battle").textContent = `🧧 Battle · ${scope.sessionLen}`;
});
$("#len-custom").addEventListener("change", ()=>renderScope());  // blur/Enter: snap display to normalized value
```

3f. Use the length in `startBattle` — replace line 186:

```js
  B.wordsTotal = mode==="round"? normalizeLen(scope.sessionLen) : Infinity;
```

3g. Length-aware high-score key in `endBattle` — replace line 405:

```js
  const key = scopeKey(scope)+"·"+modeKey(B.mode, B.wordsTotal);
```

- [ ] **Step 4: Run unit tests**

Run: `npm test`
Expected: all pass (no regressions — main.js is not under unit test).

- [ ] **Step 5: Build, stage, and browser-verify**

```bash
npm run build
node scripts/stage-www.js
```

Then write a throwaway playwright-core script in your temp dir (NOT the repo; launch `chromium.launch({channel:"msedge"})`, serve `www/` on a local port) that verifies:
1. Scope screen: `#len-chips` renders 4 chips; `20` starts `.on`; battle button text is `🧧 Battle · 20`.
2. Click chip `40` → battle button text becomes `🧧 Battle · 40`; reload page, navigate back to scope → `40` still selected (persistence).
3. Click `✏️ Custom` → `#len-custom` visible; fill `7` → button text `🧧 Battle · 7`; fill `9999`, blur → input snaps to `500`.
4. Click chip `20`, then Battle → battle screen shows; no console errors on the whole flow.

Expected: all four checks pass, zero console errors.

- [ ] **Step 6: Commit**

```bash
git add index.html src/main.js
git commit -m "feat: session-length picker (20/40/100/custom) for battles"
```
