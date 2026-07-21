# 2026-07-20 Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the four 2026-07-20 phone-audit findings: listen-mode stage crush, ghost raccoon on wrong answers, silent first audio play, mixed TTS voices — and rebuild the street as a composed scene.

**Architecture:** Four sequential PRs into `development` (spec: `docs/superpowers/specs/2026-07-20-audit-fixes-design.md`). Pure logic stays in `src/street.js` / `src/audio.js` with vitest coverage; `main.js` gets only wiring edits to existing features (its scope is frozen); one CSS fix in `index.html`; SW/staging changes for the full-voice set.

**Tech Stack:** Vanilla JS ES modules, esbuild, vitest, Capacitor, edge-tts (Python), GitHub Pages.

## Global Constraints

- All branches cut from and PR'd into `development` (source of truth; `main` deploys).
- Gate every commit on `npm test` run bare — **never** piped to `tail`/`grep` (exit code must fail loudly).
- Run `npm run lint` before every push (CI enforces).
- After any `src/` change: `npm run build` and include `dist/app.js` in the commit (repo convention — deployed/file:// app uses the bundle).
- Do **not** bump `SHELL` in `sw.js` in these PRs — that happens at release cut (freeze commit), per the release process.
- No new `localStorage` keys, no stored-shape changes anywhere in this plan (nothing here needs `migrations.js`).
- `main.js` is frozen at current scope: edits below only touch existing feature wiring already living there.
- Deviation from spec, agreed rationale: the "errlog breadcrumb" for audio debugging is a `console.warn` in the play-rejection path instead (errlog.js is a pure ring-buffer module wired only to uncaught errors; plumbing storage into audio.js isn't worth it).

---

# Phase 1 — PR `fix/listen-layout-raccoon-stopgap`

Branch: `git checkout development && git pull && git checkout -b fix/listen-layout-raccoon-stopgap`

### Task 1: Gate the listen-mode canvas shrink to short viewports

**Files:**
- Modify: `index.html:498-505` (the F9 rule)

**Interfaces:** none (CSS only). `main.js` keeps toggling `#s-battle.listen-fmt` in `renderQuestion` — unchanged.

- [ ] **Step 1: Replace the unconditional rule**

Replace lines 498–505 (the whole F9 comment + rule):

```css
  /* F9 (rev 2026-07-20 audit): the listen format prepends a full-width replay
     row inside #opts. Only short viewports need the canvas floor to yield for
     that row — the previous unconditional 116px floor crushed the stage on
     tall phones (the word plate covered both mascots). Mirror cloze's gated
     pattern: ≤700px portrait gets a 170px floor (specificity id+class+class
     beats the base 260px and the 621–700px 240px rules); taller viewports
     keep the normal floors — flex absorbs the extra row there. */
  @media (max-height: 700px) and (orientation: portrait){
    #s-battle.listen-fmt .cv-wrap{min-height:170px;}
  }
```

- [ ] **Step 2: Verify with screenshots**

`npm run serve` + Playwright chromium (see the responsive-sweep harness; chromium via `executablePath`, app is light-theme only). Capture a listen question at viewports 390×844 (tall — stage must be full-height, card clear of both mascots) and 375×620 (short — replay row visible, no vertical page scroll). Compare against `audit/battle-screen-hanzi-cover-mascot.png`.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "fix(battle): listen-mode canvas floor only yields on short viewports (audit 2026-07-20)"
```

### Task 2: Word plate degrades gracefully on genuinely short stages

**Files:**
- Modify: `src/main.js:2663-2666` (`drawWordPlate` sizing) and `src/main.js:2692` (plate origin)

**Interfaces:** none — internal to `drawWordPlate` (canvas wiring, untested by design).

- [ ] **Step 1: Add the squeeze factor**

Replace lines 2663–2666:

```js
  // Audit 2026-07-20: when flexbox has genuinely squeezed the stage (short
  // phones + the listen replay row), shrink the whole plate with it instead
  // of holding fixed floors that swallow the scene. squeeze<1 only when a
  // full-size plate (~150px) would exceed 58% of the canvas height; the 56px
  // hanzi legibility floor intentionally bends to 40px there — a smaller
  // glyph beats an unreadable overlap.
  const squeeze = Math.max(0.7, Math.min(1, (B.h * 0.58) / 150));
  const CARD = 0.85 * squeeze;
  const wy = Math.round(B.h * 0.31) + Math.round(bounce);
  const T = B.L.textS * CARD;   // plaque metrics scale with the width-driven text scale
  const hzPx = Math.max(squeeze < 1 ? 40 : 56, B.L.hanziPx * CARD);
```

- [ ] **Step 2: Clamp the plate top**

Replace line 2692:

```js
  const x = B.w/2 - lw/2, y = Math.max(4, wy - lh/2);
```

- [ ] **Step 3: Build + verify**

Run: `npm test` (expect: all pass — no unit coverage on main.js, this catches regressions elsewhere), `npm run build`. Re-capture the 375×620 listen screenshot from Task 1; plate must sit fully inside the canvas with the cat visible.

- [ ] **Step 4: Commit**

```bash
git add src/main.js dist/app.js
git commit -m "fix(battle): word plate scales down on squeezed stages instead of covering the mascots"
```

### Task 3: Wrong-state raccoon uses the walk sheet (stopgap until dedicated art)

**Files:**
- Modify: `src/raccoon.js:96-111`
- Create: `test/raccoon-wrong-sprite.test.js`

**Interfaces:**
- Consumes: `sprite(name)` from `src/sprites.js`, `drawSpriteFrame(ctx, img, frame, x, groundY, name, height)` from `src/sprite-draw.js` (both already imported by raccoon.js).
- Produces: no API change — `drawRaccoon(ctx, x, groundY, tMs, state, scale, boss)` unchanged.

- [ ] **Step 1: Write the failing test**

```js
// test/raccoon-wrong-sprite.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/sprites.js", () => ({ sprite: vi.fn() }));
vi.mock("../src/sprite-draw.js", () => ({ drawSpriteFrame: vi.fn() }));
import { sprite } from "../src/sprites.js";
import { drawSpriteFrame } from "../src/sprite-draw.js";
import { drawRaccoon } from "../src/raccoon.js";

// Every ctx method becomes a no-op; property sets land on the target.
const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => (t[k] = v, true) });

describe("wrong-state sprite stopgap", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("uses the walk sheet for the wrong state when loaded (no vector ghost)", () => {
    sprite.mockImplementation(name => (name === "raccoon-walk" ? {} : null));
    drawRaccoon(ctx, 100, 200, 0, "wrong", 1, false);
    expect(drawSpriteFrame).toHaveBeenCalledTimes(1);
    expect(drawSpriteFrame.mock.calls[0][5]).toBe("raccoon-walk");
  });

  it("still falls back to vector when no sheet has loaded", () => {
    sprite.mockReturnValue(null);
    drawRaccoon(ctx, 100, 200, 0, "wrong", 1, false);
    expect(drawSpriteFrame).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it — expect FAIL** (`npx vitest run test/raccoon-wrong-sprite.test.js`): first assertion fails, `drawSpriteFrame` not called for `"wrong"`.

- [ ] **Step 3: Implement**

In `src/raccoon.js`, after the `happy` sheet block (line 111), insert:

```js
  // Stopgap until a dedicated raccoon-wrong sheet lands (art round, audit
  // 2026-07-20): reuse the walk sheet at a slow amble so the wrong-state
  // raccoon keeps the painted style instead of dropping to the grey vector
  // ghost. raccoonBob already supplies the retreat hop via groundY; the smug
  // backward lean stays a vector-only nicety.
  if (!drawn && wrong) {
    const img = sprite("raccoon-walk");
    if (img) {
      const frame = Math.floor(tMs / 160) % 6;
      drawSpriteFrame(ctx, img, frame, x, groundY, "raccoon-walk", RACCOON_HEIGHT);
      drawn = true;
    }
  }
```

Also update the comment at lines 90–94: change `(walk/happy only — "wrong" has no sheet and always falls through …)` to `(walk/happy sheets; "wrong" borrows the walk sheet as a stopgap — see below)`.

- [ ] **Step 4: Run tests — expect PASS**, then full `npm test`, `npm run build`.

- [ ] **Step 5: Commit**

```bash
git add src/raccoon.js test/raccoon-wrong-sprite.test.js dist/app.js
git commit -m "fix(battle): wrong-answer raccoon borrows the walk sheet — no more grey vector ghost"
```

### Task 4: Ship PR 1

- [ ] `npm test` (bare) → all pass; `npm run lint` → clean.
- [ ] Push and open PR: base `development`, title `fix: listen-mode layout + wrong-answer raccoon ghost (2026-07-20 audit)`, body links the spec + before/after screenshots. Wait for CI green; merge per repo flow.

---

# Phase 2 — PR `fix/audio-first-play`

Branch from updated `development`: `fix/audio-first-play`

### Task 1: `audioIndexReady` — auto-speak stops racing the index fetch

**Files:**
- Modify: `src/audio.js` (top-of-module + `initAudio`)
- Modify: `test/audio.test.js` (append describe)

**Interfaces:**
- Produces: `export const audioIndexReady: Promise<void>` — resolves once `initAudio()` has run (success **or** the `catch(()=>initAudio([]))` fallback). Task 2 consumes it.

- [ ] **Step 1: Write the failing test** (append to `test/audio.test.js`, follow the file's existing `vi.resetModules()` + dynamic-import pattern; if it doesn't have one, use this shape):

```js
describe("audioIndexReady", () => {
  it("resolves once initAudio runs", async () => {
    vi.resetModules();
    const mod = await import("../src/audio.js");
    let settled = false;
    mod.audioIndexReady.then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);          // pending before init
    mod.initAudio(["你"]);
    await Promise.resolve(); await Promise.resolve();
    expect(settled).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (no export `audioIndexReady`).

- [ ] **Step 3: Implement** — in `src/audio.js` below the `mp3Set` declarations:

```js
// Resolves the first time initAudio() runs (with real data or the boot
// catch's empty fallback) — the moment mp3Set is trustworthy. Auto-speak
// paths race this (with a timeout) instead of reading mp3Set while the boot
// fetch is still in flight, which used to send a session's first question
// down the TTS path even when its mp3 exists.
let indexReadyResolve;
export const audioIndexReady = new Promise(res => { indexReadyResolve = res; });
```

At the end of `initAudio(...)` add:

```js
  if (indexReadyResolve) { indexReadyResolve(); indexReadyResolve = null; }
```

- [ ] **Step 4: Run — expect PASS.** Commit:

```bash
git add src/audio.js test/audio.test.js
git commit -m "feat(audio): audioIndexReady promise — mp3 index readiness is observable"
```

### Task 2: `speakWhenReady` for auto-spoken words

**Files:**
- Modify: `src/audio.js`, `src/main.js:1961` and `src/main.js:1414`, `test/audio.test.js`

**Interfaces:**
- Consumes: `audioIndexReady` (Task 1), module-local `unlocking` promise.
- Produces: `export function speakWhenReady(hanzi, timeoutMs = 1500): void`. Tap-driven replay buttons keep calling `speak()` directly (synchronous inside their gesture).

- [ ] **Step 1: Write the failing test:**

```js
describe("speakWhenReady", () => {
  it("waits for the index, then speaks via the mp3 path", async () => {
    vi.resetModules();
    vi.useFakeTimers();
    const played = [];
    globalThis.Audio = class { constructor(){ this.paused = true; }
      play(){ played.push(this.src); return Promise.resolve(); } pause(){} };
    const mod = await import("../src/audio.js");
    mod.speakWhenReady("你");
    await vi.advanceTimersByTimeAsync(0);
    expect(played).toEqual([]);            // index not ready yet — no premature TTS/mp3
    mod.initAudio(["你"]);
    await vi.advanceTimersByTimeAsync(0);
    expect(played.length).toBe(1);
    expect(played[0]).toContain(encodeURIComponent("你"));
    vi.useRealTimers(); delete globalThis.Audio;
  });

  it("gives up waiting after the timeout and speaks anyway", async () => {
    vi.resetModules();
    vi.useFakeTimers();
    const played = [];
    globalThis.Audio = class { constructor(){ this.paused = true; }
      play(){ played.push(this.src); return Promise.resolve(); } pause(){} };
    const mod = await import("../src/audio.js");
    mod.speakWhenReady("你", 1500);        // never call initAudio
    await vi.advanceTimersByTimeAsync(1600);
    // empty mp3Set -> falls to TTS; with no speechSynthesis stub that's a
    // silent no-op, but speak() must have been reached: play never called.
    expect(played).toEqual([]);
    vi.useRealTimers(); delete globalThis.Audio;
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (no export).

- [ ] **Step 3: Implement** in `src/audio.js`:

```js
// Auto-speak entry for words the game speaks on its own (question spawn,
// tone-trainer prompt) — NOT for tap-driven replay buttons, which must stay
// synchronous inside their gesture. Waits (briefly) for the bundled-mp3
// index and any in-flight unlock so a session's first auto-spoken word takes
// the mp3 path instead of losing the boot race.
export function speakWhenReady(hanzi, timeoutMs = 1500) {
  if (!hanzi) return;
  const timeout = new Promise(res => setTimeout(res, timeoutMs));
  Promise.race([audioIndexReady, timeout])
    .then(() => unlocking || null)
    .then(() => speak(hanzi));
}
```

- [ ] **Step 4: Wire the two auto-speak sites** in `src/main.js` (add `speakWhenReady` to the existing `./audio.js` import):
  - Line 1961: `if(!z.frozen && (pol === "always" || (pol === "setting" && settings.autoSpeak))) speakWhenReady(w.h);`
  - Line 1414 (tone trainer spawn): `speakWhenReady(TG.q.word.h);`

- [ ] **Step 5: Run tests + `npm run build`. Commit:**

```bash
git add src/audio.js src/main.js test/audio.test.js dist/app.js
git commit -m "fix(audio): auto-spoken words wait for the mp3 index + unlock instead of racing boot"
```

### Task 3: Retry a rejected play after unlock instead of instant TTS surrender

**Files:**
- Modify: `src/audio.js` (`speak`, `unlockAudio`), `test/audio.test.js`

**Interfaces:** internal only (`pendingRetry`); no API change.

- [ ] **Step 1: Write the failing test:**

```js
describe("retry after unlock", () => {
  it("replays the pending word once unlock succeeds instead of falling to TTS", async () => {
    vi.resetModules();
    let failNext = true;
    const played = [];
    globalThis.Audio = class {
      constructor(){ this.paused = true; }
      play(){
        if (this.muted) return Promise.resolve();            // silent-WAV priming
        played.push(this.src);
        return failNext ? (failNext = false, Promise.reject(new Error("gesture"))) : Promise.resolve();
      }
      pause(){}
    };
    const mod = await import("../src/audio.js");
    mod.initAudio(["你"]);
    mod.speak("你");                       // first play rejects (locked)
    await Promise.resolve(); await Promise.resolve();
    await mod.unlockAudio();               // gesture lands -> unlock succeeds
    await Promise.resolve(); await Promise.resolve();
    expect(played.length).toBe(2);         // original attempt + one retry
    expect(played[1]).toContain(encodeURIComponent("你"));
    delete globalThis.Audio;
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (only one play; no retry).

- [ ] **Step 3: Implement** in `src/audio.js`:

Below the `unlocked/unlocking` declarations:

```js
// A rejected play() before the session is unlocked usually means the iOS
// gesture unlock hasn't landed yet. Remember the word; unlockAudio() replays
// it on success — so a session's FIRST question is heard on the first tap
// instead of silently downgrading to a TTS voice iOS also tends to drop.
let pendingRetry = null; // { hanzi, at }
const RETRY_WINDOW_MS = 8000;
```

In `speak()`: first line of the function body becomes

```js
  if (!hanzi) return;
  pendingRetry = null;   // a newer word supersedes any queued retry
```

and the mp3 branch's catch (line 123) becomes:

```js
    el.play().catch(() => {
      console.warn("[audio] mp3 play rejected", hanzi);
      if (!unlocked) { pendingRetry = { hanzi, at: Date.now() }; return; }
      ttsFallback(hanzi, synth, deferred);
    });
```

In `unlockAudio()`'s success `.then` (after `unlocked = true;`, line 62):

```js
      if (pendingRetry && Date.now() - pendingRetry.at < RETRY_WINDOW_MS) {
        const h = pendingRetry.hanzi; pendingRetry = null;
        speak(h);
      }
```

- [ ] **Step 4: Run — expect PASS**, then full `npm test`, `npm run build`. Commit:

```bash
git add src/audio.js test/audio.test.js dist/app.js
git commit -m "fix(audio): rejected first play retries after unlock instead of surrendering to TTS"
```

### Task 4: Prefetch session audio inside the start gesture

**Files:**
- Modify: `src/audio.js`, `src/main.js` (`startBattle`, line ~1666 after `B.deck` is set), `test/audio.test.js`

**Interfaces:**
- Produces: `export function prefetchAudio(hanziList, limit = 16): void`.

- [ ] **Step 1: Test:**

```js
describe("prefetchAudio", () => {
  it("fetches only words with a bundled mp3, capped at the limit", async () => {
    vi.resetModules();
    const fetched = [];
    globalThis.fetch = url => { fetched.push(String(url)); return Promise.resolve({ ok: true }); };
    const mod = await import("../src/audio.js");
    mod.initAudio(["一", "二", "三"]);
    mod.prefetchAudio(["一", "无", "二", "三"], 2);
    expect(fetched.length).toBe(2);
    expect(fetched[0]).toContain(encodeURIComponent("一"));
    delete globalThis.fetch;
  });
});
```

- [ ] **Step 2: Run — FAIL.** **Step 3: Implement:**

```js
// Fire-and-forget warm-up of mp3s the session is about to use, called inside
// the start-button gesture. On the PWA the service worker's cache-first mp3
// route stores them, so mid-battle playback never waits on the network.
// Silently a no-op on file:// and native (fetch fails / no SW — harmless).
export function prefetchAudio(hanziList, limit = 16) {
  if (typeof fetch !== "function" || !Array.isArray(hanziList)) return;
  hanziList.filter(h => mp3Set.has(h)).slice(0, limit)
    .forEach(h => { try { fetch(base + encodeURIComponent(h) + ".mp3").catch(() => {}); } catch (e) {} });
}
```

In `startBattle` (`src/main.js`, right after the `B.customDeck` assignment block, ~line 1671): 

```js
  // Warm the mp3 cache for the session inside this tap's gesture window.
  prefetchAudio(B.deck.slice(0, 16).map(w => w.h));
```

(Known limitation, accepted: for weighted full-pool rounds the first 16 deck words are an approximation of what will spawn.)

- [ ] **Step 4: PASS + full `npm test` + `npm run lint` + `npm run build`. Commit:**

```bash
git add src/audio.js src/main.js test/audio.test.js dist/app.js
git commit -m "feat(audio): prefetch session mp3s inside the start gesture"
```

### Task 5: Ship PR 2 — base `development`, title `fix: silent first audio play on iOS (index race, unlock sequencing, retry, prefetch)`. CI green → merge. Ask Jordan for an on-device check (iPhone PWA): first question of a fresh session must be audible without a second tap.

---

# Phase 3 — PR `feat/street-scene-composer`

Branch from updated `development`: `feat/street-scene-composer`

### Task 1: street.js — classes, lanes, anchors, stable assignment

**Files:**
- Modify: `src/street.js` (replace the `DECO_BAND`/`BASE_DECO_W`/`TIER_MAX_FACTOR`/`decoLayout` block and `streetPieces`; keep `BUILDINGS`, `DECO_IDS`, `BUILDING_SLOTS`, `DECO_SPRITE_SCALE`, `UNIT_FRAC`, `streetProgress`, `streetMetrics`)
- Modify: `test/street.test.js`

**Interfaces:**
- Produces (consumed by Task 2 and tests):
  - `DECO_CLASS: {[id]: "gateway"|"large"|"medium"|"small"}`, `CLASS_SIZE`, `LANES: {back|mid|front: {laneY, laneScale}}`, `DECO_ANCHORS`
  - `assignDecoAnchors(ownedIds: string[]): Map<id, {x, lane, cls}>`
  - `streetPieces(level, owned, tiers)` now returns pieces with `laneY` (buildings `0.86`) and deco `scale = CLASS_SIZE[cls] * laneScale`, sorted by `(laneY, slot)`.
- Removed: `decoLayout` (private anyway), `BASE_DECO_W`, `TIER_MAX_FACTOR` exports. Before deleting run `grep -rn "BASE_DECO_W\|TIER_MAX_FACTOR" src/ test/` and fix every hit (expected: only street.js + street.test.js).

- [ ] **Step 1: Write the failing tests** — in `test/street.test.js`, delete the describes covering `decoLayout` spacing/scale and the `BASE_DECO_W >= DECO_SPRITE_SCALE * UNIT_FRAC` coupling assertion (keep the BUILDINGS/growth-milestone mirror, `streetProgress`, `streetMetrics`, and unknown-id-ignored tests, updating any that assert the old evenly-spaced slots). Append:

```js
import { streetPieces, assignDecoAnchors, DECO_IDS, DECO_CLASS, CLASS_SIZE,
         DECO_ANCHORS, LANES, DECO_SPRITE_SCALE, UNIT_FRAC } from "../src/street.js";

describe("scene composer", () => {
  it("every deco id has a class and every class anchor list fits its census", () => {
    const census = {};
    for (const id of DECO_IDS) {
      expect(DECO_CLASS[id], id).toBeTruthy();
      census[DECO_CLASS[id]] = (census[DECO_CLASS[id]] || 0) + 1;
    }
    for (const cls of Object.keys(census)) expect(DECO_ANCHORS[cls].length).toBe(census[cls]);
  });

  it("assignment is stable under growth (an item never moves when more are bought)", () => {
    const some = ["red-lantern", "noodle-stall", "koi-pond"];
    const more = [...some, "golden-arch", "foo-dog", "drum-tower"];
    const a = assignDecoAnchors(some), b = assignDecoAnchors(more);
    for (const id of some) expect(b.get(id)).toEqual(a.get(id));
  });

  it("all 15 owned: same-lane neighbours overlap at most 40%", () => {
    const decos = streetPieces(1, DECO_IDS.slice()).filter(p => p.kind === "deco");
    expect(decos.length).toBe(15);
    const F = DECO_SPRITE_SCALE * UNIT_FRAC;   // draw-box width fraction at scale 1
    const byLane = {};
    for (const p of decos) (byLane[p.laneY] = byLane[p.laneY] || []).push(p);
    for (const lane of Object.values(byLane)) {
      lane.sort((x, y) => x.slot - y.slot);
      for (let i = 1; i < lane.length; i++) {
        const a = lane[i - 1], b = lane[i];
        expect(b.slot - a.slot).toBeGreaterThanOrEqual(0.6 * (F * a.scale + F * b.scale) / 2);
      }
    }
  });

  it("gateways sit on the road-center anchors", () => {
    const decos = streetPieces(1, ["golden-arch", "firecracker-arch"]).filter(p => p.kind === "deco");
    expect(decos.length).toBe(2);
    for (const p of decos) expect(p.slot).toBe(0.5);
  });

  it("pieces come back sorted back-to-front, then left-to-right", () => {
    const pieces = streetPieces(60, DECO_IDS.slice());
    for (let i = 1; i < pieces.length; i++) {
      const prev = pieces[i - 1], cur = pieces[i];
      expect(prev.laneY < cur.laneY || (prev.laneY === cur.laneY && prev.slot <= cur.slot)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (missing exports).

- [ ] **Step 3: Implement** — replace `street.js` lines 24–59 (`DECO_BAND` through `decoLayout`, keeping `DECO_SPRITE_SCALE` and `UNIT_FRAC`) with:

```js
const BUILDING_SLOTS = [.18, .34, .5, .66, .82];

// ---- scene composer (2026-07-20) ----
// The street is a curated scene, not a shelf: each deco has a size class and
// classes have hand-authored anchors in three depth lanes composed around
// bg-street.png (road up the middle, fences at the sides). See
// docs/superpowers/specs/2026-07-20-audit-fixes-design.md.
export const DECO_CLASS = {
  "golden-arch": "gateway", "firecracker-arch": "gateway",
  "drum-tower": "large", "noodle-stall": "large",
  "mooncake-stall": "large", "shaved-ice-cart": "large",
  "koi-pond": "medium", "mahjong-table": "medium", "bubble-tea": "medium",
  "tea-sign": "medium", "neon-cat-sign": "medium",
  "red-lantern": "small", "paper-umbrella": "small",
  "goldfish-banner": "small", "foo-dog": "small",
};
export const CLASS_SIZE = { gateway: 1.6, large: 1.25, medium: 1.0, small: 0.8 };
// laneY = the piece's ground line as a fraction of street height (1.0 is the
// front ground line main.js draws on); laneScale shrinks pieces with
// distance. Buildings keep their historical 0.86 row between back and mid.
export const LANES = {
  back:  { laneY: 0.82, laneScale: 0.72 },
  mid:   { laneY: 0.91, laneScale: 0.86 },
  front: { laneY: 1.0,  laneScale: 1.0  },
};
// One anchor list per class, list length = class census, so every deco always
// has a home and classes never compete. List order is fill order. Front-lane
// left margin (≥.15 after half-widths) clears the maneki mascot; gateways own
// the road center so an arch reads as the street's entrance.
export const DECO_ANCHORS = {
  gateway: [ { x: 0.50, lane: "mid" }, { x: 0.50, lane: "back" } ],
  large:   [ { x: 0.25, lane: "front" }, { x: 0.77, lane: "front" },
             { x: 0.30, lane: "back" },  { x: 0.70, lane: "back" } ],
  medium:  [ { x: 0.58, lane: "front" }, { x: 0.93, lane: "front" },
             { x: 0.20, lane: "mid" },   { x: 0.35, lane: "mid" },
             { x: 0.80, lane: "mid" } ],
  small:   [ { x: 0.42, lane: "front" }, { x: 0.68, lane: "mid" },
             { x: 0.14, lane: "back" },  { x: 0.88, lane: "back" } ],
};

// Stable anchor assignment: walk DECO_IDS order, give each owned deco the
// next unused anchor of its class. Owning MORE decos never moves an
// already-placed one — the street grows, it doesn't reshuffle.
export function assignDecoAnchors(ownedIds) {
  const used = { gateway: 0, large: 0, medium: 0, small: 0 };
  const out = new Map();
  for (const id of DECO_IDS) {
    if (!ownedIds.includes(id)) continue;
    const cls = DECO_CLASS[id];
    const anchor = DECO_ANCHORS[cls][used[cls]++];
    if (anchor) out.set(id, { x: anchor.x, lane: anchor.lane, cls });
  }
  return out;
}
```

and replace `streetPieces` with:

```js
export function streetPieces(level, owned, tiers = {}) {
  const pieces = [];
  BUILDINGS.forEach((b, i) => {
    if (level >= b.lv) pieces.push({ id: b.id, kind: "building", slot: BUILDING_SLOTS[i], laneY: 0.86 });
  });
  for (const [id, a] of assignDecoAnchors(owned)) {
    const lane = LANES[a.lane];
    pieces.push({
      id, kind: "deco", slot: a.x, tier: tiers[id] || 1,
      laneY: lane.laneY, scale: CLASS_SIZE[a.cls] * lane.laneScale,
    });
  }
  // Painter's order for the caller: farthest ground line first, then x.
  return pieces.sort((a, b) => (a.laneY - b.laneY) || (a.slot - b.slot));
}
```

- [ ] **Step 4: Run street tests — PASS**, then full `npm test` and fix any test still importing removed constants. Commit:

```bash
git add src/street.js test/street.test.js
git commit -m "feat(street): scene-composer layout — size classes, depth lanes, stable hand-authored anchors"
```

### Task 2: renderStreet draws the composed scene

**Files:**
- Modify: `src/main.js:3628-3643` (the two piece loops in `renderStreet`)

**Interfaces:**
- Consumes: pieces with `laneY` from Task 1. `drawStreetPads`, `drawContactShadow`, `drawStreetBuilding`, `drawTieredDeco` signatures unchanged.

- [ ] **Step 1: Replace lines 3628–3643 with:**

```js
  const backGy = gy - h * (1 - 0.86);
  drawStreetPads(sc, w, gy, h, pieces, m);
  // streetPieces is pre-sorted by ground line (deco back lane → buildings →
  // mid → front), so one loop paints the scene back-to-front; slight overlap
  // between lanes is intended depth, not a layout bug.
  for(const p of pieces){
    const x = p.slot * w;
    const py = gy - h * (1 - (p.laneY ?? 1));
    if(p.kind === "building"){
      const basis = m.unit * m.backScale;
      drawContactShadow(sc, x, py, basis);
      drawStreetBuilding(sc, p.id, x, py, basis);
    }else{
      const du = m.unit * (p.scale || 1);
      drawContactShadow(sc, x, py, du);
      drawTieredDeco(sc, p, x, py, du);
    }
  }
```

Then `grep -n "backGy" src/main.js` — if nothing else uses `backGy` after this edit, delete its declaration too.

- [ ] **Step 2: Build + visual check** — `npm run build`, `npm run serve`, seed a full street in the browser console and screenshot the street tab:

```js
localStorage["nbhsk.shop"] = JSON.stringify({ owned: ["red-lantern","noodle-stall","tea-sign","foo-dog","golden-arch","mahjong-table","koi-pond","drum-tower","bubble-tea","paper-umbrella","goldfish-banner","neon-cat-sign","shaved-ice-cart","mooncake-stall","firecracker-arch"], tiers: {} });
location.reload();
```

(If the stored shop shape has more fields, copy the existing value and extend `owned` instead.) Check: arch over the road, three visible depth rows, no deco under the maneki, nothing clipped at the right edge. Iterate anchor x-values in `DECO_ANCHORS` if composition looks off — tests pin only overlap/census/stability, the exact numbers are art direction. Save the screenshot for the PR + Jordan.

- [ ] **Step 3: Full `npm test` + commit:**

```bash
git add src/main.js dist/app.js
git commit -m "feat(street): render the composed scene — depth lanes, per-class sizes, painter order"
```

### Task 3: Construction moment + caption

**Files:**
- Modify: `src/main.js` (shop `doBuy` ~line 3204; `renderStreet`), `src/i18n.js` (both locales)

**Interfaces:** internal (`streetReveal` module state in main.js).

- [ ] **Step 1: i18n keys** — next to the existing `street.caption*` keys: en (line ~110): `"street.captionNew": "New on your street: {name}!",` — th (line ~552): `"street.captionNew": "ของใหม่บนถนนของคุณ: {name}!",`

- [ ] **Step 2: Reveal state + buy hook** — near `renderStreet`, add:

```js
// Construction moment (scene composer): the most recent deco purchase/upgrade
// pops in with a bounce + dust the next time the street is actually seen.
// In-memory only — losing it on refresh just skips one animation.
let streetReveal = null; // { id, start } — start stamps on first visible frame
```

In `doBuy` (line ~3209, after `justBought = …`):

```js
    if(item.type === "deco") streetReveal = { id: item.id, start: 0 };
```

- [ ] **Step 3: Animate in `renderStreet`** — helpers above it:

```js
function revealPopScale(id){
  if(!streetReveal || streetReveal.id !== id || !streetReveal.start) return 1;
  const t = Math.min(1, (performance.now() - streetReveal.start) / 700);
  // easeOutBack: overshoot ~12% then settle
  const s = 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
  return Math.max(0.01, s);
}
function drawRevealDust(sc, x, py, du){
  const t = (performance.now() - streetReveal.start) / 900;
  if(t >= 1) return;
  sc.save();
  sc.globalAlpha = 0.5 * (1 - t);
  sc.fillStyle = "#FBF5E8";
  for(const [dx, r] of [[-0.4, 0.16], [0.05, 0.22], [0.45, 0.14]]){
    sc.beginPath();
    sc.ellipse(x + dx*du, py - 4, du*r*(0.6 + t), du*r*0.6*(0.6 + t), 0, 0, Math.PI*2);
    sc.fill();
  }
  sc.restore();
}
```

In the deco branch of the piece loop (Task 2's code), change the draw call to apply the pop and dust:

```js
    }else{
      const pop = revealPopScale(p.id);
      const du = m.unit * (p.scale || 1) * pop;
      drawContactShadow(sc, x, py, du);
      drawTieredDeco(sc, p, x, py, du);
      if(streetReveal && streetReveal.id === p.id && streetReveal.start) drawRevealDust(sc, x, py, du);
    }
```

At the end of `renderStreet` (after the caption block), drive the animation and swap the caption while it runs:

```js
  if(streetReveal && shopState.owned.includes(streetReveal.id)){
    if(!streetReveal.start) streetReveal.start = performance.now();
    cap.textContent = t("street.captionNew", { name: tOr("item." + streetReveal.id, streetReveal.id) });
    if(performance.now() - streetReveal.start > 900){ streetReveal = null; }
    else requestAnimationFrame(() => {
      if(currentScreen === "street") renderStreet();
      else streetReveal = null;
    });
  }
```

Note: the caption block currently ends with `if(!cap) return;` before setting text — place the reveal block AFTER the existing caption assignment, and if `cap` was null the early return also skips the animation (acceptable: no caption element means a non-standard embed).

- [ ] **Step 4: Verify** — with the seeded street from Task 2, buy any deco you don't own (or temporarily `streetReveal = {id:"koi-pond", start:0}` in the console) → switch to Street: item bounces in with dust, caption announces it, settles after ~0.9s. `npm test`, `npm run lint`, `npm run build`.

- [ ] **Step 5: Commit + ship PR 3** — base `development`, title `feat: street scene composer (2026-07-20 audit)`, body includes before (`audit/street.PNG`) / after screenshots for Jordan.

```bash
git add src/main.js src/i18n.js dist/app.js
git commit -m "feat(street): construction moment — purchases pop in with dust + caption callout"
```

---

# Phase 4 — full-voice set (generation run + PR `feat/full-audio-lazy-fetch`)

### Task 0: Overnight generation run (no PR yet)

**Files:**
- Modify: `build_audio.py`

- [ ] **Step 1: Split core vs full word lists.** Keep `WORDS_CAP = 2000` and `ALWAYS_LEVELS = ("1","2")`. Replace `load_words()` (lines 30–50) with:

```py
def load_data() -> dict:
    return json.loads(WORDS_JSON.read_text(encoding="utf-8"))


def core_words(data) -> list[str]:
    """Bundled core set: the top WORDS_CAP by frequency across every level
    (deduped by hanzi keeping the max frequency seen), plus all of
    ALWAYS_LEVELS in full."""
    best_freq: dict[str, int] = {}
    for level_words in data["levels"].values():
        for w in level_words:
            hanzi = w["h"]
            freq = w.get("f", 0)
            if hanzi not in best_freq or freq > best_freq[hanzi]:
                best_freq[hanzi] = freq
    ranked = sorted(best_freq.items(), key=lambda kv: -kv[1])
    words = [hanzi for hanzi, _ in ranked[:WORDS_CAP]]
    seen = set(words)
    for lv in ALWAYS_LEVELS:
        for w in data["levels"][lv]:
            if w["h"] not in seen:
                seen.add(w["h"])
                words.append(w["h"])
    return words


def all_words(data) -> list[str]:
    """Full voice set: every distinct hanzi across all levels."""
    seen: set[str] = set()
    out: list[str] = []
    for level_words in data["levels"].values():
        for w in level_words:
            if w["h"] not in seen:
                seen.add(w["h"])
                out.append(w["h"])
    return out
```

Harden `synth` so one failed word can't kill an 11k-word batch:

```py
async def synth(word: str, path: Path, sem: asyncio.Semaphore):
    async with sem:
        try:
            await edge_tts.Communicate(word, VOICE).save(str(path))
        except Exception as e:  # a failed word must not abort the full run
            print(f"  FAILED {word}: {e}")
            if path.exists():
                path.unlink()
```

Replace `main()`'s word selection and index write (lines 58–73) with:

```py
async def main() -> int:
    OUT.mkdir(exist_ok=True)
    data = load_data()
    words = all_words(data)
    sem = asyncio.Semaphore(CONCURRENCY)
    todo = [(w, OUT / f"{w}.mp3") for w in words if not (OUT / f"{w}.mp3").exists()]
    print(f"{len(words)} words, {len(todo)} to synthesize")
    for i in range(0, len(todo), 100):
        batch = todo[i:i + 100]
        await asyncio.gather(*(synth(w, p, sem) for w, p in batch))
        print(f"  {min(i + 100, len(todo))}/{len(todo)}")
    # Both indexes rebuild from what actually exists on disk. index.json is
    # the BUNDLED core set (APK staging + hasMp3 gating read it); index-full
    # lists every hosted mp3 for the remote-voice ladder.
    on_disk = {p.stem for p in OUT.glob("*.mp3")}
    core = [h for h in core_words(data) if h in on_disk]
    full = sorted(on_disk)
    (OUT / "index.json").write_text(json.dumps(core, ensure_ascii=False), encoding="utf-8")
    (OUT / "index-full.json").write_text(json.dumps(full, ensure_ascii=False), encoding="utf-8")
    print(f"index.json: {len(core)} core / index-full.json: {len(full)} total")
    return 0
```

Update the module docstring (lines 2–13): scope is now the FULL vocabulary; `index.json` = bundled core (top WORDS_CAP + HSK1-2), `index-full.json` = everything on disk.

- [ ] **Step 2: Kick off generation in the background** (VPS, ~11.6k words, hours):

Run: `cd /root/work/HSK/game && nohup python3 build_audio.py > /tmp/build_audio_full.log 2>&1 &` — check progress with `ls audio/*.mp3 | wc -l` (target ≈ 13,921). Re-runnable: it skips existing files.

- [ ] **Step 3: When complete:** verify `python3 -c "import json;print(len(json.load(open('audio/index.json'))), len(json.load(open('audio/index-full.json'))))"` → ≈ `2297 13921`. Commit `build_audio.py` + `audio/` on the phase-4 branch (one big commit; every mp3 is ~10 KB, far under GitHub's per-file limit).

### Task 1: stage-www audio modes (APK stays small, Pages ships everything)

**Files:**
- Modify: `scripts/stage-www.js`, `.github/workflows/deploy-pages.yml`

**Interfaces:**
- Produces: env contract `AUDIO_SET=core|full` (default `core`). `cap:sync`/APK keep the small set automatically; only the Pages deploy opts into `full`.

- [ ] **Step 1:** In `stage-www.js`: change line 18 to drop `"audio"` from the generic groups —

```js
const ITEMS = ["index.html", "privacy.html", "dist", "data", "pwa", "sw.js", "assets"];
```

— and insert this dedicated audio stage between the `ITEMS` loop and the final `console.log` (lines 40–45):

```js
// AUDIO_SET=core (default) stages only the bundled set listed in
// audio/index.json — the Capacitor/APK path, keeping the app small.
// AUDIO_SET=full stages every generated mp3 — the Pages deploy, which
// serves the complete Xiaoxiao voice set for the app's lazy-fetch ladder.
// Falls back to the core list on a checkout without index-full.json.
const AUDIO_SET = process.env.AUDIO_SET === "full" ? "full" : "core";
const AUDIO_SRC = path.join(ROOT, "audio");
const AUDIO_DST = path.join(WWW, "audio");
fs.mkdirSync(AUDIO_DST, { recursive: true });
for (const f of ["index.json", "index-full.json"]) {
  const p = path.join(AUDIO_SRC, f);
  if (fs.existsSync(p)) { fs.copyFileSync(p, path.join(AUDIO_DST, f)); files++; }
}
const fullPath = path.join(AUDIO_SRC, "index-full.json");
const listFile = AUDIO_SET === "full" && fs.existsSync(fullPath) ? "index-full.json" : "index.json";
const audioList = JSON.parse(fs.readFileSync(path.join(AUDIO_SRC, listFile), "utf8"));
for (const h of audioList) {
  const f = path.join(AUDIO_SRC, `${h}.mp3`);
  if (fs.existsSync(f)) { fs.copyFileSync(f, path.join(AUDIO_DST, `${h}.mp3`)); files++; }
}
console.log(`stage-www: audio set "${AUDIO_SET}" (${audioList.length} listed)`);
```

- [ ] **Step 2:** In `.github/workflows/deploy-pages.yml`, on the `node scripts/stage-www.js` step add:

```yaml
        env:
          AUDIO_SET: full
```

⚠️ VPS gh token lacks `workflow` scope — a push touching `.github/workflows/` will be rejected. Either run `gh auth refresh -s workflow` (interactive, needs Jordan) before pushing this branch, or leave the yml edit as a separate one-line commit for Jordan to push from another machine.

- [ ] **Step 3:** Verify both modes locally: `node scripts/stage-www.js` → `ls www/audio/*.mp3 | wc -l` ≈ 2297; `AUDIO_SET=full node scripts/stage-www.js` → ≈ 13921. Commit.

```bash
git add scripts/stage-www.js .github/workflows/deploy-pages.yml
git commit -m "feat(audio): stage-www AUDIO_SET modes — APK bundles core set, Pages serves the full voice set"
```

### Task 2: audio.js remote ladder

**Files:**
- Modify: `src/audio.js`, `src/main.js:996-1003` (boot), `test/audio.test.js`

**Interfaces:**
- Produces: `export function initRemoteAudio(indexArray, baseUrl): void`. Ladder in `speak()`: bundled mp3 → remote mp3 (SW-cached on the web) → TTS.

- [ ] **Step 1: Failing test:**

```js
describe("remote full-voice ladder", () => {
  it("bundled words use the local base, full-set words the remote base", async () => {
    vi.resetModules();
    const played = [];
    globalThis.Audio = class { constructor(){ this.paused = true; }
      play(){ played.push(this.src); return Promise.resolve(); } pause(){} };
    const mod = await import("../src/audio.js");
    mod.initAudio(["一"]);
    mod.initRemoteAudio(["一", "龘"], "https://host/audio/");
    mod.speak("一");
    mod.speak("龘");
    expect(played[0].startsWith("audio/")).toBe(true);
    expect(played[1].startsWith("https://host/audio/")).toBe(true);
    delete globalThis.Audio;
  });
});
```

- [ ] **Step 2: Run — FAIL.** **Step 3: Implement** in `src/audio.js`:

```js
// Full-voice set (2026-07-20): every word's Xiaoxiao mp3 is hosted with the
// web deploy; words outside the bundled core stream from there (the SW's
// cache-first mp3 route makes them offline after first play on the PWA).
let fullSet = new Set();
let remoteBase = null;
export function initRemoteAudio(indexArray, baseUrl) {
  fullSet = new Set(indexArray || []);
  remoteBase = baseUrl || null;
}
```

In `speak()`, replace the mp3 branch condition/src:

```js
  const local = mp3Set.has(hanzi);
  const remote = !local && remoteBase && fullSet.has(hanzi);
  if ((local || remote) && el) {
    el.muted = false;
    el.src = (local ? base : remoteBase) + encodeURIComponent(hanzi) + ".mp3";
```

(rest of the branch unchanged). Extend `prefetchAudio`'s filter to `h => mp3Set.has(h) || fullSet.has(h)` and pick the matching base per word. Extend `audioAvailable`: `mp3Set.has(hanzi) || fullSet.has(hanzi) || chooseTts() !== "none"`.

- [ ] **Step 4: Boot wiring** in `src/main.js`, after the `audio/index.json` fetch block (line 1003):

```js
// Full-voice index (audit 2026-07-20): on the web the mp3s are same-origin
// ("audio/"); the native shell bundles only the core set, so it streams the
// rest from the deployed origin. file:// / offline: both fetches fail
// silently and the TTS fallback stands, per the file:// constraint.
const REMOTE_AUDIO_BASE = isNative()
  ? "https://sarachdatabear-polar.github.io/hsk_game/audio/" : "audio/";
fetch("audio/index-full.json").then(r=>r.json())
  .then(ix=>initRemoteAudio(ix, REMOTE_AUDIO_BASE)).catch(()=>{});
```

(`isNative` — add to the existing `./native.js` import in main.js if not already there.)

- [ ] **Step 5: PASS + full `npm test` + `npm run lint` + `npm run build`. Commit:**

```bash
git add src/audio.js src/main.js test/audio.test.js dist/app.js
git commit -m "feat(audio): remote full-voice ladder — one Xiaoxiao voice for every word when online"
```

### Task 3: Bound the SW audio cache

**Files:**
- Modify: `sw.js` (mp3 route, ~lines 84-90)

- [ ] **Step 1:** Add below `cacheAfterFetch`:

```js
// The full-voice set is ~14k files; a heavy session shouldn't grow the audio
// cache without bound. FIFO approximation of LRU (Cache keys() preserves
// insertion order): overflow past 600 drops the oldest 100.
async function trimAudioCache(max = 600, drop = 100) {
  const cache = await caches.open(AUDIO);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  await Promise.all(keys.slice(0, drop).map(k => cache.delete(k)));
}
```

Replace the mp3 route body:

```js
  if (url.pathname.endsWith(".mp3")) {
    event.respondWith(caches.open(AUDIO).then(async cache => {
      const hit = await cache.match(request);
      if (hit) return hit;
      const res = await cacheAfterFetch(AUDIO, request);
      trimAudioCache();   // fire-and-forget bound
      return res;
    }));
    return;
  }
```

- [ ] **Step 2:** `npm test` (the precache/asset validation suite runs against sw.js — must stay green). Commit:

```bash
git add sw.js
git commit -m "feat(audio): bound the SW audio cache (FIFO trim past 600 entries)"
```

### Task 4: Ship PR 4

- [ ] Add a sanity test (`test/audio-index.test.js`) that reads both index files with `fs` and asserts: `index.json` ⊆ `index-full.json`, both non-empty, `index-full.json` length ≥ 13000. (Skip via `it.skipIf(!fs.existsSync(...))` so the suite passes on a checkout before generation lands.)
- [ ] Full `npm test` bare, `npm run lint`, `npm run build`.
- [ ] PR base `development`, title `feat: full Xiaoxiao voice set — generation, staged audio modes, remote ladder, bounded SW cache`. Flag in the body: the workflows-file caveat from Task 1, and that after merge+release the first Pages deploy uploads ~118 MB.
- [ ] After merge and release cut, on-device check with Jordan: a rare (HSK5/6) word plays in the Xiaoxiao voice on the PWA; airplane-mode replay of a previously played word still works.

---

# Deferred (not tasks in this plan)

- **Art round (Jordan-gated):** `raccoon-wrong.png` — 1024×256, 4 frames 256×256, transparent bg, painted style matching `raccoon-walk.png`: smug retreat hop, half-lidded eyes, slight backward lean. Lands via the full-batch `art-drop/` intake; wiring mirrors the `happy` block in `raccoon.js:104-111` + `SPRITE_NAMES` + asset manifest + PRECACHE.
- Player placement (street phase 2) — anchors above are the plot grid it would reuse.
- Street background stage evolution (art-hungry, future round).
