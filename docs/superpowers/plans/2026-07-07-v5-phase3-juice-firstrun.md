# PRD v5 Phase 3 — A3 Juice Pass + A4 First-Run Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every answer feel juicy (paw stamps, plaque bounce, hit flash, combo glow, boss CRITICAL, screen transitions, results count-up + celebrating cat) and engineer the first session (welcome screen → 6-word flashcard warm-up → 6-word battle → results that point at the streak), plus make home START default to the smart choice.

**Architecture:** Pure math/decision logic goes in two new vitest-tested modules (`src/juice.js`, `src/firstrun.js`); all DOM/canvas wiring stays in `main.js` per repo convention. DOM effects (option paw stamps, combo-strip glow, screen transitions, cat bob) are CSS keyframes toggled by classes — the existing global `prefers-reduced-motion` rule (`index.html` reduces all animations to .001ms) covers them automatically; canvas effects go through the existing `fxDuration()`/`fxUntil()` reduced-motion helpers and the pause deadline-shift list in `resumeBattle()`.

**Tech Stack:** Vanilla JS + inline CSS + canvas, vitest. No new npm dependencies.

**Source spec:** `docs/prd/PRD-v5-visual-retention.md` §4 A3 + A4.

## Global Constraints

- Vanilla JS + esbuild; **no new npm dependencies**; pure logic in vitest-tested modules; `main.js` stays wiring-only for DOM/canvas.
- `file://` must keep working; no new `fetch()` of bundled data.
- `localStorage` keys namespaced `nbhsk.*`; migrations must not destroy existing saves (the new key is `nbhsk.introDone`; absence must NOT retrigger the intro for existing players — see `isFirstRun`).
- `prefers-reduced-motion` respected: reduced = fades only, no shake/bounce (CSS side is automatic via the existing global reduce rule; canvas side via `fxDuration()`; the plaque bounce and badge pop are skipped under reduced motion as specified per task).
- Every new user-facing string gets BOTH `en` and `th` entries in `src/i18n.js` (test-enforced parity).
- Art guardrails: friendly tokens, never jackpot/coin-shower framing; all colors via `--lc-*` tokens (index.html hex lint is active).
- Every absolute `performance.now()` deadline added to battle state MUST be shifted in `resumeBattle()` (existing list at `src/main.js:561-574`).
- All existing tests stay green (496); `npm run build` after any `src/` change; `sw.js` SHELL bump exactly once, final task (v25 → v26).
- Branch `feat/v5-phase3-juice-firstrun` off `development`; commits `feat(juice):` / `feat(firstrun):` / `test:` / `docs:`.

## Verified code facts (do not re-derive)

- `answer(btn, o)` at `src/main.js:643`: correct branch sets `btn.classList.add("good")` (line ~686) and `B.feedback = {...feedbackEffect("correct", ...), until:fxUntil(620)}` (line ~692); wrong branch sets `btn.classList.add("bad")`, `B.screenShake = REDUCED_MOTION ? 0 : 1`. `revealCorrect(word)` (line 638) adds `.good` to the correct button after a wrong tap.
- Boss final kill goes through the same correct branch with `boss === true` (stage `"hanzi"`); the stage-1 pass returns early at line ~668 and never reaches the feedback line.
- `killZombie(z)` at line 725; `draw(t)` calls `drawWordPlate(z, hideWord, t)` at line 922 and `drawFeedbackLayer(t)` at line 979. `drawWordPlate` head is at line 989 (`const wy = Math.round(B.h * 0.36);` sets the plate's y — line ~997).
- `updateComboStrip()` at line 498; strip element `#combo-strip`, badge `#combo-badge`; `comboMultiplier`/`comboFires` come from `src/hud.js`.
- `show(name)` at line 233 toggles `.screen.on`. CSS `.screen.on{display:flex}` — a `.screen.on` animation replays on every class re-add.
- `endBattle(quit)` at line 1226; sets `$("#r-score").textContent = B.score;`. Results markup `#s-results` in index.html (h2 → `#r-score` → `#r-sub` → `#r-wallet` → `#r-perfect` → `#r-levelup` → `#r-quests` → misslist → buttons).
- `startLearn()` at 328 (uses module-level `learnDeck`, `fc` state); `endLearn()` at 336 routes to results (fromMisses) or home.
- `startBattle(mode)` at 429; `battleDeckOverride` (line 52) feeds `B.deck` and sets `B.customDeck` (excluded from best scores/perfect bonus — right for intro + smart rounds); `B.wordsTotal = normalizeLen(scope.sessionLen)` at line 442.
- `$("#home-start").onclick` at line 194: `if(pool.length >= 8) startBattle("round")`. Smart deck logic at `updateSmartBtn()`/`$("#go-smart").onclick` (149–165): `smartDeck(masteryStore, pool, Date.now())`, min 8, sets `battleDeckOverride`, `questEvent("review")`.
- Boot block at the end of main.js: `pool = buildPool(D.levels, scope); applyStaticI18n(); ... renderHome(); ... updateNav(currentScreen);` with `currentScreen = "home"` (line 224) and `#s-home` carrying `class="screen on"` in markup.
- `setUiLocale(l)` (line 298) sets + persists locale and re-applies static i18n. `scope` persists via `store.set("scope", scope)`; `pool = buildPool(D.levels, scope)` rebuilds.
- `nav.js`: `navVisibleOn("welcome")` → false (not in the set) — bottom nav auto-hides on the welcome screen; same for results/learn/battle.
- Words have `f` (frequency), `h/p/e/t/lv` fields. `cat-celebrate.png` is already integrated + precached (sw.js line ~38).
- `REDUCED_MOTION` const at main.js:35; `fxDuration(ms)` halves under reduced motion; `fxUntil(ms)` returns an absolute deadline.
- Suite: 496 tests / 29 files green. SHELL is `nbhsk-shell-v25`.

---

### Task 1: Pure modules — `src/juice.js` + `src/firstrun.js` (TDD)

**Files:**
- Create: `src/juice.js`, `src/firstrun.js`
- Test: `test/juice.test.js`, `test/firstrun.test.js`

**Interfaces:**
- Produces (juice.js): `comboGlowTier(combo:number): 0|1|2|3` (0 below 5, 1 at ≥5, 2 at ≥10, 3 at ≥15); `plaqueBounce(ms:number): number` (vertical px offset, 0 outside [0,450)); `countUpValue(from:number, to:number, frac:number): number` (eased integer, exact endpoints).
- Produces (firstrun.js): `isFirstRun(introDone:boolean, masteryStore:object): boolean`; `introDeck(pool:Array<word>, n=6): Array<word>` (top-n by `f` desc, input not mutated).

- [ ] **Step 1: Create the branch**

```bash
git checkout development && git pull --ff-only && git checkout -b feat/v5-phase3-juice-firstrun
```

- [ ] **Step 2: Write the failing tests**

Create `test/juice.test.js`:

```js
import { describe, it, expect } from "vitest";
import { comboGlowTier, plaqueBounce, countUpValue } from "../src/juice.js";

describe("comboGlowTier", () => {
  it("maps combo to escalation tiers at 5/10/15 (PRD A3)", () => {
    expect(comboGlowTier(0)).toBe(0);
    expect(comboGlowTier(4)).toBe(0);
    expect(comboGlowTier(5)).toBe(1);
    expect(comboGlowTier(9)).toBe(1);
    expect(comboGlowTier(10)).toBe(2);
    expect(comboGlowTier(14)).toBe(2);
    expect(comboGlowTier(15)).toBe(3);
    expect(comboGlowTier(99)).toBe(3);
  });
});

describe("plaqueBounce", () => {
  it("is 0 before the hit and after the bounce window", () => {
    expect(plaqueBounce(-1)).toBe(0);
    expect(plaqueBounce(450)).toBe(0);
    expect(plaqueBounce(10000)).toBe(0);
    expect(plaqueBounce(Infinity)).toBe(0);
  });
  it("moves within the window and damps toward the end", () => {
    const early = Math.abs(plaqueBounce(60));
    const late = Math.abs(plaqueBounce(430));
    expect(early).toBeGreaterThan(0);
    expect(late).toBeLessThan(early);
  });
  it("never exceeds the 10px amplitude", () => {
    for (let ms = 0; ms < 450; ms += 15) {
      expect(Math.abs(plaqueBounce(ms))).toBeLessThanOrEqual(10);
    }
  });
});

describe("countUpValue", () => {
  it("hits exact endpoints", () => {
    expect(countUpValue(0, 480, 0)).toBe(0);
    expect(countUpValue(0, 480, 1)).toBe(480);
    expect(countUpValue(100, 100, 0.5)).toBe(100);
  });
  it("is monotonic and eases out (fast start)", () => {
    let prev = -1;
    for (let f = 0; f <= 1.0001; f += 0.05) {
      const v = countUpValue(0, 1000, Math.min(1, f));
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
    expect(countUpValue(0, 1000, 0.5)).toBeGreaterThan(500); // ease-out: past halfway early
  });
  it("clamps frac outside [0,1]", () => {
    expect(countUpValue(0, 50, -0.2)).toBe(0);
    expect(countUpValue(0, 50, 1.7)).toBe(50);
  });
});
```

Create `test/firstrun.test.js`:

```js
import { describe, it, expect } from "vitest";
import { isFirstRun, introDeck } from "../src/firstrun.js";

const W = (h, f) => ({ h, f, p: h + "p", e: h + "e", lv: 1 });

describe("isFirstRun", () => {
  it("true only when the intro never ran AND no mastery exists", () => {
    expect(isFirstRun(false, {})).toBe(true);
  });
  it("false once the intro completed", () => {
    expect(isFirstRun(true, {})).toBe(false);
  });
  it("false for existing players (mastery present, key absent) — no retro intro", () => {
    expect(isFirstRun(false, { "你": { seen: 3 } })).toBe(false);
  });
});

describe("introDeck", () => {
  const pool = [W("一", 50), W("二", 900), W("三", 10), W("四", 700), W("五", 300), W("六", 800), W("七", 5), W("八", 600)];
  it("picks the n most frequent words, most frequent first", () => {
    expect(introDeck(pool, 6).map(w => w.h)).toEqual(["二", "六", "四", "八", "五", "一"]);
  });
  it("defaults to 6 and caps at the pool size", () => {
    expect(introDeck(pool).length).toBe(6);
    expect(introDeck(pool.slice(0, 3), 6).length).toBe(3);
  });
  it("does not mutate the input pool", () => {
    const order = pool.map(w => w.h).join("");
    introDeck(pool, 6);
    expect(pool.map(w => w.h).join("")).toBe(order);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run test/juice.test.js test/firstrun.test.js`
Expected: FAIL — cannot resolve `../src/juice.js` / `../src/firstrun.js`.

- [ ] **Step 4: Implement the modules**

Create `src/juice.js`:

```js
"use strict";
// Pure game-feel math (PRD v5 A3). No DOM/canvas — main.js turns these into
// CSS classes and canvas offsets. Kept separate so thresholds and curves are
// unit-testable, like fx.js/hud.js.

// Combo-strip escalation tiers (PRD A3: escalating warm glow at 5/10/15).
export function comboGlowTier(combo) {
  if (combo >= 15) return 3;
  if (combo >= 10) return 2;
  if (combo >= 5) return 1;
  return 0;
}

// Word-plaque bounce on a correct answer: damped sine, 10px amplitude,
// 450ms window, 0 outside it. main.js feeds (now - B.plaqueHitAt).
const BOUNCE_MS = 450;
const BOUNCE_AMP = 10;
export function plaqueBounce(ms) {
  if (!(ms >= 0) || ms >= BOUNCE_MS) return 0;
  const f = ms / BOUNCE_MS;
  return BOUNCE_AMP * Math.sin(f * Math.PI * 3) * (1 - f);
}

// Results score count-up easing (ease-out cubic), exact endpoints, clamped.
export function countUpValue(from, to, frac) {
  const f = Math.min(1, Math.max(0, frac));
  const eased = 1 - Math.pow(1 - f, 3);
  return Math.round(from + (to - from) * eased);
}
```

Create `src/firstrun.js`:

```js
"use strict";
// First-run decisions (PRD v5 A4). Pure: main.js owns localStorage
// (nbhsk.introDone) and passes state in.

// The intro runs only for a genuinely fresh profile: never completed AND no
// mastery recorded. Existing players (pre-feature saves have no introDone
// key but do have mastery) must never see it retroactively.
export function isFirstRun(introDone, masteryStore) {
  return !introDone && Object.keys(masteryStore || {}).length === 0;
}

// The guaranteed-win warm-up deck: the n highest-frequency words of the
// chosen scope (most frequent first). Copies — never mutates the pool.
export function introDeck(pool, n = 6) {
  return [...pool].sort((a, b) => (b.f || 0) - (a.f || 0)).slice(0, n);
}
```

- [ ] **Step 5: Run to verify pass, then full suite**

Run: `npx vitest run test/juice.test.js test/firstrun.test.js` → PASS (13 tests).
Run: `npm test` → all green (509).

- [ ] **Step 6: Commit**

```bash
git add src/juice.js src/firstrun.js test/juice.test.js test/firstrun.test.js
git commit -m "feat(juice): pure modules — combo glow tiers, plaque bounce, count-up, first-run deck (A3/A4)"
```

---

### Task 2: A3 DOM juice — paw stamps, combo glow, badge pop, screen transitions, results cat

**Files:**
- Modify: `index.html` (CSS block + `#s-results` markup)
- Modify: `src/main.js` (`answer()` stamp classes, `updateComboStrip()` glow/pop)

**Interfaces:**
- Consumes: `comboGlowTier` from Task 1 (`import { comboGlowTier, plaqueBounce, countUpValue } from "./juice.js";` — add the full import now; Task 3 uses the other two).

- [ ] **Step 1: CSS — screen transition (all screens, ~200ms, consistent easing)**

In `index.html`, right after the rule `.screen.on{display:flex;}` add:

```css
  /* A3: soft enter transition on every screen change (~200ms). The global
     prefers-reduced-motion rule truncates all animations, so reduced = instant. */
  .screen.on{animation:screen-in 200ms ease-out;}
  @keyframes screen-in{from{opacity:0; transform:translateY(8px);} to{opacity:1; transform:none;}}
```

- [ ] **Step 2: CSS — paw-stamp feedback on answer buttons**

Add after the `#opts button.bad::before{...}` rule:

```css
  /* A3: paw-print stamp pops on the TAPPED option (fx sprites are the
     reference's paw stamps). ::before keeps carrying the ✓/✕ affix (a11y —
     reveal never relies on color alone), so the stamp rides on ::after. */
  #opts button{position:relative;}
  #opts button.stamp::after{
    content:""; position:absolute; inset:0; margin:auto; width:52px; height:52px;
    background:center/contain no-repeat; pointer-events:none;
    animation:paw-stamp 480ms ease-out forwards;
  }
  #opts button.stamp-good::after{background-image:url("assets/fx-correct.svg");}
  #opts button.stamp-bad::after{background-image:url("assets/fx-wrong.svg");}
  @keyframes paw-stamp{
    0%{opacity:0; transform:scale(1.7) rotate(-8deg);}
    45%{opacity:.95; transform:scale(.94) rotate(2deg);}
    70%{opacity:.9; transform:scale(1.04) rotate(0deg);}
    100%{opacity:0; transform:scale(1);}
  }
```

- [ ] **Step 3: CSS — combo-strip escalating warm glow + badge pop**

Add after the `.combo-strip-badge{...}` rule:

```css
  /* A3: escalating warm glow at 5/10/15 (tiers from juice.js comboGlowTier) */
  #combo-strip.glow-1{box-shadow:0 0 8px rgba(242,188,87,.45);}
  #combo-strip.glow-2{box-shadow:0 0 12px rgba(242,188,87,.65); border-color:var(--lc-sun);}
  #combo-strip.glow-3{box-shadow:0 0 16px rgba(242,188,87,.85), 0 0 4px rgba(230,151,119,.6); border-color:var(--lc-sun);}
  .combo-strip-badge.pop{animation:badge-pop 260ms ease-out;}
  @keyframes badge-pop{0%{transform:scale(1.5);} 100%{transform:scale(1);}}
```

- [ ] **Step 4: CSS — results celebration cat**

Add after the `.bignum{...}` rule:

```css
  /* A3: celebrating cat above the results title; gentle bob (reduced-motion
     rule freezes it). Friendly token — never a jackpot/coin-shower. */
  .r-cat{display:block; width:96px; height:96px; margin:2px auto 0;
    filter:drop-shadow(0 6px 8px rgba(46,42,36,.25));
    animation:cat-bob 2.2s ease-in-out infinite alternate;}
  @keyframes cat-bob{from{transform:translateY(0) rotate(-2deg);} to{transform:translateY(-6px) rotate(2deg);}}
```

- [ ] **Step 5: Results markup — cat image (+ Phase-4 slots added here while touching the block)**

In `#s-results`, replace:

```html
    <h2 style="text-align:center" data-i18n="results.roundOver">Round over</h2>
    <div class="bignum" id="r-score"></div>
```

with:

```html
    <img class="r-cat" src="assets/cat-celebrate.png" alt="">
    <h2 style="text-align:center" data-i18n="results.roundOver">Round over</h2>
    <div class="bignum" id="r-score"></div>
    <!-- A4/B2 slots: intro streak pointer (filled by endBattle on the intro
         round) and the sticker toast slot (activates in Phase 4 with stickers.js) -->
    <p class="sub" id="r-intro-hint" style="display:none"></p>
    <div id="r-sticker-slot" style="display:none"></div>
```

- [ ] **Step 6: main.js — stamp classes in `answer()`**

In the correct branch, replace:

```js
    btn.classList.add("good");
    lockOptions();
    B.proj = {x:B.L.mascotX+16*B.S, y:B.h-B.L.ground-30*B.S};   // coin flies at the cat
```

with:

```js
    btn.classList.add("good", "stamp", "stamp-good");
    lockOptions();
    B.proj = {x:B.L.mascotX+16*B.S, y:B.h-B.L.ground-30*B.S};   // coin flies at the cat
```

In the wrong branch, replace:

```js
    btn.classList.add("bad");
    lockOptions();
    revealCorrect(z.w);
```

with:

```js
    btn.classList.add("bad", "stamp", "stamp-bad");
    lockOptions();
    revealCorrect(z.w);
```

(The boss stage-1 pass at `btn.classList.add("good");` before `lockOptions();` + `B.bossStageAt` stays stamp-free — the word isn't resolved yet.)

- [ ] **Step 7: main.js — combo glow + badge pop in `updateComboStrip()`**

Add the import at the top of main.js (after the `hud.js` import line):

```js
import { comboGlowTier, plaqueBounce, countUpValue } from "./juice.js";
```

Replace the body section:

```js
  $("#combo-count").textContent = B.combo;
  $("#combo-badge").textContent = comboMultiplier(B.combo);
```

with:

```js
  $("#combo-count").textContent = B.combo;
  // escalating warm glow at 5/10/15 (A3); classes are additive tiers
  const tier = comboGlowTier(B.combo);
  for(let g=1; g<=3; g++) strip.classList.toggle("glow-"+g, tier===g);
  const badge = $("#combo-badge");
  const label = comboMultiplier(B.combo);
  if(badge.textContent !== label && label && !REDUCED_MOTION){
    badge.classList.remove("pop");
    void badge.offsetWidth;   // restart the keyframe
    badge.classList.add("pop");
  }
  badge.textContent = label;
```

- [ ] **Step 8: Build, test, commit**

```bash
npm run build && npm test
```
Expected: all green (509).

```bash
git add index.html src/main.js dist/app.js
git commit -m "feat(juice): paw stamps, combo glow tiers, badge pop, screen transitions, results cat (A3)"
```

---

### Task 3: A3 canvas + results juice — plaque bounce, hit flash, boss CRITICAL, score count-up

**Files:**
- Modify: `src/main.js` only (+ rebuild)

**Interfaces:**
- Consumes: `plaqueBounce`, `countUpValue` (imported in Task 2).

- [ ] **Step 1: boss CRITICAL + plaque-hit timestamp in `answer()`**

Replace (correct branch):

```js
    const gy = B.h-B.L.ground;
    B.feedback = {...feedbackEffect("correct", z.x, gy-42*B.S), until:fxUntil(620)};
```

with:

```js
    const gy = B.h-B.L.ground;
    // boss final kill gets the reference's CRITICAL! starburst (A3); the
    // 10-combo milestone below may upgrade a normal kill to critical too.
    B.feedback = boss
      ? {...feedbackEffect("critical", z.x, gy-42*B.S), until:fxUntil(750)}
      : {...feedbackEffect("correct", z.x, gy-42*B.S), until:fxUntil(620)};
    B.plaqueHitAt = performance.now();   // plaque bounce timebase (drawWordPlate)
```

- [ ] **Step 2: hit flash in `killZombie()`**

Replace:

```js
function killZombie(z){
  const gy = B.h-B.L.ground;
  B.parts.push(...coinBurst(z.x, gy-16, !!z.boss, shopState.effect));   // bosses pop a bigger, coinier burst; effect pack swaps the look
```

with:

```js
function killZombie(z){
  const gy = B.h-B.L.ground;
  // A3 enemy hit flash: quick warm-white pulse at the raccoon (drawn in draw(),
  // just before the feedback layer). Absolute deadline — shifted on resume.
  B.hitFlash = {x:z.x, y:gy-40*B.S, until:fxUntil(150)};
  B.parts.push(...coinBurst(z.x, gy-16, !!z.boss, shopState.effect));   // bosses pop a bigger, coinier burst; effect pack swaps the look
```

- [ ] **Step 3: render the hit flash in `draw()`**

Replace:

```js
  drawFeedbackLayer(t);
```

with:

```js
  if(B.hitFlash){
    const leftF = B.hitFlash.until - performance.now();
    if(leftF <= 0){ B.hitFlash = null; }
    else{
      // expanding cream pulse, fading out — a fade, so reduced-motion-safe
      // (fxUntil already halved its duration there)
      ctx.save();
      ctx.globalAlpha = 0.85 * (leftF / fxDuration(150));
      ctx.fillStyle = "rgba(251,245,232,1)";
      const rr = (18 + 30 * (1 - leftF / fxDuration(150))) * B.S;
      ctx.beginPath(); ctx.arc(B.hitFlash.x, B.hitFlash.y, rr, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }
  drawFeedbackLayer(t);
```

- [ ] **Step 4: plaque bounce in `drawWordPlate()`**

Replace:

```js
  const wy = Math.round(B.h * 0.36);
```

with:

```js
  // A3 plaque bounce: damped dip on a correct answer (juice.js curve; 0 when
  // idle or under reduced motion — no vertical motion, per "fades only").
  const bounce = (!REDUCED_MOTION && B.plaqueHitAt)
    ? plaqueBounce(performance.now() - B.plaqueHitAt) : 0;
  const wy = Math.round(B.h * 0.36) + Math.round(bounce);
```

- [ ] **Step 5: pause-shift the two new deadlines in `resumeBattle()`**

Replace:

```js
  if(B.bossStageAt) B.bossStageAt += shift;
```

with:

```js
  if(B.bossStageAt) B.bossStageAt += shift;
  if(B.hitFlash) B.hitFlash.until += shift;
  if(B.plaqueHitAt) B.plaqueHitAt += shift;
```

Also update the comment block above `PAUSE_TOGGLES` (line ~515) — its deadline list sentence gains `, B.hitFlash.until, B.plaqueHitAt`.

- [ ] **Step 6: score count-up in `endBattle()`**

Replace:

```js
  const acc = B.attempts? Math.round(100*B.correct/B.attempts) : 0;
  $("#r-score").textContent = B.score;
```

with:

```js
  const acc = B.attempts? Math.round(100*B.correct/B.attempts) : 0;
  // A3 results celebration: count the earned coins up (~700ms ease-out).
  // Reduced motion or a zero score renders instantly.
  const scoreEl = $("#r-score");
  if(REDUCED_MOTION || B.score === 0){
    scoreEl.textContent = B.score;
  }else{
    const target = B.score, t0 = performance.now(), dur = 700;
    scoreEl.textContent = "0";
    const tick = now => {
      const frac = (now - t0) / dur;
      scoreEl.textContent = countUpValue(0, target, frac);
      if(frac < 1 && currentScreen === "results") requestAnimationFrame(tick);
      else scoreEl.textContent = target;
    };
    requestAnimationFrame(tick);
  }
```

- [ ] **Step 7: Build, test, commit**

```bash
npm run build && npm test
```
Expected: all green (509).

```bash
git add src/main.js dist/app.js
git commit -m "feat(juice): plaque bounce, enemy hit flash, boss CRITICAL, score count-up (A3)"
```

---

### Task 4: A4 first run — welcome screen → 6-word warm-up → 6-word battle → streak pointer

**Files:**
- Modify: `index.html` (new `#s-welcome` screen markup + CSS)
- Modify: `src/i18n.js` (new keys, EN + TH)
- Modify: `src/main.js` (first-run flow wiring)

**Interfaces:**
- Consumes: `isFirstRun`, `introDeck` from Task 1; `#r-intro-hint` slot from Task 2.
- Produces: `nbhsk.introDone` (boolean store key); module state `introWords`, `introPhase` (`null | "learn" | "battle"`).

- [ ] **Step 1: i18n keys — add to BOTH `en` and `th` tables in `src/i18n.js`**

In the `en` table (after the `"home.scopeWords"` line):

```js
    // first run (A4)
    "welcome.title": "Welcome!",
    "welcome.blurb": "Learn Chinese words by playing — a couple of minutes a day.",
    "welcome.language": "Your language",
    "welcome.level": "Start at",
    "welcome.start": "START LEARNING",
    "results.introHint": "Great first session! Come back tomorrow to start your streak 🍵",
```

In the `th` table (same position):

```js
    // first run (A4)
    "welcome.title": "ยินดีต้อนรับ!",
    "welcome.blurb": "เรียนคำศัพท์จีนผ่านการเล่น — วันละไม่กี่นาที",
    "welcome.language": "ภาษาของคุณ",
    "welcome.level": "เริ่มที่ระดับ",
    "welcome.start": "เริ่มเรียนเลย",
    "results.introHint": "ครั้งแรกเยี่ยมมาก! กลับมาพรุ่งนี้เพื่อเริ่มสตรีคของคุณ 🍵",
```

- [ ] **Step 2: welcome screen markup — insert in index.html directly BEFORE the `<!-- STREET -->` comment**

```html
  <!-- WELCOME (A4 first run — shown once for fresh profiles; see firstrun.js) -->
  <div class="screen" id="s-welcome">
    <div class="welcome-wrap">
      <img class="welcome-cat" src="assets/cat-study.png" alt="">
      <h2 class="welcome-title" data-i18n="welcome.title">Welcome!</h2>
      <p class="welcome-blurb" data-i18n="welcome.blurb">Learn Chinese words by playing — a couple of minutes a day.</p>
      <div class="sect" data-i18n="welcome.language">Your language</div>
      <div class="chips" id="welcome-lang-chips">
        <button class="chip" data-wlang="en">English</button>
        <button class="chip" data-wlang="th">ไทย</button>
      </div>
      <div class="sect" data-i18n="welcome.level">Start at</div>
      <div class="chips" id="welcome-level-chips">
        <button class="chip" data-wlv="1">HSK1</button>
        <button class="chip" data-wlv="2">HSK2</button>
        <button class="chip" data-wlv="3">HSK3</button>
        <button class="chip" data-wlv="4">HSK4</button>
      </div>
      <button class="start-btn welcome-start" id="welcome-start" data-i18n="welcome.start">START LEARNING</button>
    </div>
  </div>
```

- [ ] **Step 3: welcome CSS — add after the `.home-secondary-row` rules**

```css
  /* A4 welcome (first run): compact single-column card, reuses chip + sun
     plaque recipes. Nav is hidden here (nav.js doesn't list "welcome"). */
  #s-welcome{justify-content:center;}
  .welcome-wrap{display:flex; flex-direction:column; gap:4px; max-width:340px; width:100%; margin:0 auto;}
  .welcome-cat{width:120px; height:120px; margin:0 auto;
    filter:drop-shadow(0 8px 10px rgba(46,42,36,.3));}
  .welcome-title{text-align:center; margin:6px 0 0;}
  .welcome-blurb{text-align:center; color:var(--muted); font-size:14.5px; margin:2px 0 6px;}
  .welcome-start{margin-top:16px; flex:none;}
```

- [ ] **Step 4: main.js — first-run wiring**

Add the import (next to the juice.js import):

```js
import { isFirstRun, introDeck } from "./firstrun.js";
```

Add module state right after the `let lastMode = "round";` line:

```js
// A4 first-run intro: null when not in the intro, else "learn" -> "battle".
// introWords carries the same 6 words from warm-up into the battle.
let introPhase = null;
let introWords = [];
```

Add the welcome renderer + handlers right after the `$("#home-start").onclick` line:

```js
/* ============================== first run (A4) ============================== */
function renderWelcome(){
  const lang = getLocale();
  document.querySelectorAll("#welcome-lang-chips .chip").forEach(b=>
    b.classList.toggle("on", b.dataset.wlang === lang));
  const lv = scope.levels[0] || 3;
  document.querySelectorAll("#welcome-level-chips .chip").forEach(b=>
    b.classList.toggle("on", Number(b.dataset.wlv) === lv));
}
document.querySelectorAll("#welcome-lang-chips .chip").forEach(b=>
  b.addEventListener("click", ()=>{ setUiLocale(b.dataset.wlang); renderWelcome(); }));
document.querySelectorAll("#welcome-level-chips .chip").forEach(b=>
  b.addEventListener("click", ()=>{
    scope.levels = [Number(b.dataset.wlv)];
    store.set("scope", scope);
    pool = buildPool(D.levels, scope);
    renderWelcome();
  }));
$("#welcome-start").onclick = ()=>{
  introWords = introDeck(pool, 6);
  if(introWords.length < 2){ store.set("introDone", true); show("home"); return; }
  introPhase = "learn";
  learnDeck = introWords.slice();
  startLearn();
};
```

- [ ] **Step 5: main.js — chain warm-up → battle → results**

Replace:

```js
function endLearn(){ show(fc.fromMisses ? "results" : "home"); }
```

with:

```js
function endLearn(){
  if(introPhase === "learn"){
    // A4: warm-up done — straight into a short battle over the same 6 words
    // (normal rules, standard distractors; no fake difficulty).
    introPhase = "battle";
    battleDeckOverride = introWords.slice();
    startBattle("round");
    return;
  }
  show(fc.fromMisses ? "results" : "home");
}
```

In `startBattle(mode)`, replace:

```js
  B.wordsTotal = mode==="round"? normalizeLen(scope.sessionLen) : Infinity;
```

with:

```js
  B.wordsTotal = mode==="round"? normalizeLen(scope.sessionLen) : Infinity;
  // A4 intro battle: exactly the 6 warm-up words, not a full session
  if(introPhase === "battle") B.wordsTotal = B.deck.length;
```

In `endBattle(quit)`, add right before `show("results");` at the end:

```js
  // A4 intro round: mark the intro complete and point at the streak
  // ("come back tomorrow"), calm framing. The Welcome sticker occupies
  // #r-sticker-slot in Phase 4 (stickers.js).
  const hintEl = $("#r-intro-hint");
  if(introPhase === "battle"){
    introPhase = null;
    store.set("introDone", true);
    hintEl.textContent = t("results.introHint");
    hintEl.style.display = "block";
  }else{
    hintEl.style.display = "none";
  }
```

Also in `endBattle`, the `quit` early-return path must clear the intro too. Replace:

```js
    show("home"); return;
```

with:

```js
    if(introPhase){ introPhase = null; store.set("introDone", true); }
    show("home"); return;
```

- [ ] **Step 6: main.js — boot branch**

In the boot block, replace:

```js
pool = buildPool(D.levels, scope);
applyStaticI18n();
syncUiLangChips();
sfx.pack = shopState.soundpack || "default";
renderHome();
```

with:

```js
pool = buildPool(D.levels, scope);
applyStaticI18n();
syncUiLangChips();
sfx.pack = shopState.soundpack || "default";
if(isFirstRun(store.get("introDone", false), masteryStore)){
  renderWelcome();
  show("welcome");
}
renderHome();
```

(`show("welcome")` after `renderHome()` order note: keep `renderHome()` — it only fills home widgets; `show("welcome")` must run before it or after it works either way since show() toggles classes — place it BEFORE `renderHome()` as written so `currentScreen` is right when `updateNav(currentScreen)` runs later in boot.)

- [ ] **Step 7: Build, test, manual first-run check**

```bash
npm run build && npm test
```
Expected: all green (509) — the i18n parity test passes because both tables got all 6 keys.

Manual: `npm run serve`, open `http://localhost:8000` in a private window (or run `localStorage.clear()` in devtools first) → welcome screen shows; pick ไทย + HSK1 → START LEARNING → 6 flashcards → battle of exactly 6 words (round pill "1/6") → results shows the streak hint; reload → home screen (no welcome). This is also re-verified by the controller checkpoint after Task 5.

- [ ] **Step 8: Commit**

```bash
git add index.html src/i18n.js src/main.js dist/app.js
git commit -m "feat(firstrun): welcome screen -> 6-word warm-up -> intro battle -> streak pointer (A4)"
```

---

### Task 5: START smart default + SHELL bump

**Files:**
- Modify: `src/main.js` (`#home-start` handler)
- Modify: `sw.js` (SHELL v25 → v26)

**Interfaces:**
- Consumes: existing `smartDeck(masteryStore, pool, Date.now())` (min 8), `battleDeckOverride`, `questEvent("review")`.

- [ ] **Step 1: START defaults to the smart choice**

Replace:

```js
$("#home-start").onclick = ()=>{ if(pool.length >= 8) startBattle("round"); };
```

with:

```js
// A4: START launches the smart choice — Smart Review when >=8 weak/due words,
// else a normal round over the configured scope. The scope chip next to it
// keeps the full picker one tap away.
$("#home-start").onclick = ()=>{
  if(pool.length < 8) return;
  const deck = smartDeck(masteryStore, pool, Date.now());
  if(deck.length >= 8){
    battleDeckOverride = deck;
    questEvent("review");
  }
  startBattle("round");
};
```

- [ ] **Step 2: SHELL bump**

In `sw.js` replace: `const SHELL = "nbhsk-shell-v25";`
with: `const SHELL = "nbhsk-shell-v26";`

- [ ] **Step 3: Build, full suite, commit**

```bash
npm run build && npm test
```
Expected: all green (509).

```bash
git add src/main.js sw.js dist/app.js
git commit -m "feat(firstrun): home START defaults to smart review when due; SHELL v26 (A4)"
```

> **Controller checkpoint (not the implementer):** scripted playthrough with screenshots — fresh profile: welcome (EN + TH) → warm-up → intro battle (verify paw stamps, plaque bounce, hit flash, round pill 1/6) → results (cat bob, count-up, streak hint). Returning profile: home → START one tap into a session; combo ≥5 glow tiers via #debug answer driving; boss CRITICAL if reachable; reduced-motion spot-check (emulate via CDP). A3 acceptance "frame budget on a mid-range Android device" cannot be measured here — noted for the owner's device pass.

---

## Self-review notes (already applied)

- **Spec coverage:** A3 correct/wrong stamps → Task 2 (option stamps; enemy hit flash + plaque bounce → Task 3; "correct answer highlighted, restyled" already exists via `revealCorrect` + Phase-1 `.good`); combo 5/10/15 glow + badge pop → Tasks 1–2; boss CRITICAL → Task 3 (10-combo CRITICAL already existed); transitions → Task 2; results celebration + count-up (no jackpot) → Tasks 2–3; reduced-motion → CSS global rule + `fxDuration` + explicit skips (badge pop, plaque bounce, count-up). A4 home = re-verify only (shipped in Visual Slice v1); first-run flow → Task 4; START smart default → Task 5; "first sticker activates in Phase 4" → `#r-sticker-slot` placeholder (Task 2) + note in Task 4 code comment.
- **Deliberate judgment calls:** welcome level chips stop at HSK4 (a brand-new learner starting at HSK5/6 is an edge case; the full picker is on the scope screen — flagged for owner at review). `plaqueBounce` uses wall-clock via `B.plaqueHitAt` rather than rAF `t` for symmetry with the other deadlines; both are `performance.now()`-based so the pause shift works.
- **Type consistency:** `comboGlowTier/plaqueBounce/countUpValue/isFirstRun/introDeck` names match across Tasks 1–5; `introPhase` values `"learn"`/`"battle"`/null used consistently; store key `introDone` read with default `false` everywhere.
- **Placeholder scan:** clean.
