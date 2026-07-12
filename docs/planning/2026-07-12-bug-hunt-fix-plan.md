# Bug-Hunt Fix Round (2026-07-12) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 10 verified findings from the 2026-07-12 four-domain bug hunt (1 P0 data-loss, 2 P1, 6 P2, 1 P3) in one release round.

**Architecture:** Pure-module fixes (merge.js, sync.js, audio.js, sfx.js, native.js, i18n.js) get TDD unit tests; `main.js` wiring fixes (untested by design) get code + probe verification via the responsive sweep and manual trigger sequences. One branch, one PR, SHELL v65→v66 at release.

**Tech Stack:** Vanilla JS ES modules, vitest, esbuild. Repo: `game/` (separate git repo, branch off `development`).

## How the findings were produced

Four parallel auditor agents swept (1) game-rules modules, (2) meta-game/economy + cloud merge, (3) `main.js` wiring, (4) platform/audio/i18n/sw. Game-rules came back **clean** (empirical scan of every reachable scope found no distractor shortfall, SRS math, or mastery bugs). Every finding below was then re-verified against source by the lead before entering this plan. Suite was green at 1,711 throughout — these are latent bugs tests don't reach.

## Global Constraints

- Run all commands inside `game/`. Branch: `fix/bug-hunt-2026-07-12` off `development`.
- **Never pipe `npm test` through tail/grep when gating a commit** — the masked exit code has bitten us before. Run bare, read the real exit.
- After any `src/` change: `npm run build` (deployed app uses `dist/app.js`).
- New/changed TH strings get tagged for the native-review queue (house convention).
- At release: bump `SHELL` in `sw.js` v65→v66; release per ritual (merge development→main, watch Actions, live-verify).
- `main.js` stays untested by design — do not add unit tests for it; verify via the probe sequences given in each task.

---

### Task 1 — P0: cloud merge silently discards a completed-but-unclaimed monthly reward (1,500 coins)

**Files:**
- Modify: `src/merge.js:8` (import), `src/merge.js:101-108` (add helper below `mergeMonthly`), `src/merge.js:149-165` (`mergeAll` wallet line)
- Test: `test/merge.test.js`

**Why:** `mergeMonthly` resolves cross-month conflicts "newer wins wholesale" (`merge.js:104`), discarding an older side with `done >= 40 && !claimed`. Daily-quest coins are credited to `wallet` immediately so the max-fold keeps them, but the monthly 1,500 exists *only inside the monthly object* until claimed/settled — discarding it destroys the reward. `main.js:356-362` already guards this exact hazard on the local path (`settleMonthlyNow()` before every monthly write); the reconcile path has no equivalent. This violates merge.js's own header contract: "no fold can lose progress in either direction."

**Interfaces:**
- Produces: `staleMonthlyOwed(a, b) -> number` (0 or `MONTHLY_REWARD`), exported from `src/merge.js`; consumed by `mergeAll` and by Task 2's test assertions.

- [ ] **Step 1: failing tests** — append to `test/merge.test.js`:

```js
import { staleMonthlyOwed, mergeAll } from "../src/merge.js";   // extend existing import

describe("merge: stale monthly settle (P0 2026-07-12)", () => {
  const juneDone = { month: "2026-06", done: 40, claimed: false };
  const july     = { month: "2026-07", done: 0,  claimed: false };
  it("owes the reward when the discarded older month is complete and unclaimed", () =>
    expect(staleMonthlyOwed(july, juneDone)).toBe(1500));
  it("order-independent: stale side may be local or cloud", () =>
    expect(staleMonthlyOwed(juneDone, july)).toBe(1500));
  it("owes nothing when already claimed, incomplete, same month, or missing side", () => {
    expect(staleMonthlyOwed(july, { ...juneDone, claimed: true })).toBe(0);
    expect(staleMonthlyOwed(july, { ...juneDone, done: 39 })).toBe(0);
    expect(staleMonthlyOwed(juneDone, juneDone)).toBe(0);
    expect(staleMonthlyOwed(july, null)).toBe(0);           // null -> defaultMonthly month ""
  });
  it("mergeAll credits the owed reward into the merged wallet", () => {
    const local = { monthly: july, wallet: 200 };
    const cloud = { monthly: juneDone, wallet: 100 };
    const m = mergeAll(local, cloud);
    expect(m.wallet).toBe(200 + 1500);
    expect(m.monthly.month).toBe("2026-07");
  });
  it("mergeAll(local, null) baseline owes nothing", () =>
    expect(mergeAll({ monthly: juneDone, wallet: 50 }, null).wallet).toBe(50));
});
```

- [ ] **Step 2:** `npm test -- merge` → expect FAIL (`staleMonthlyOwed` not exported).
- [ ] **Step 3: implementation** — in `src/merge.js`:

```js
// line 8 — add MONTHLY_REWARD to the existing quests.js import
import { defaultQuestState, defaultMonthly, MONTHLY_TARGET, MONTHLY_REWARD } from "./quests.js";

// below mergeMonthly — coins owed for the month a cross-month merge discards.
// A completed-but-unclaimed month is unrealized wallet value (unlike daily
// quests, which credit the wallet immediately) — settle it before it's lost.
// Mirrors main.js's local-path settleMonthlyNow() guard. Idempotent: after
// one merge the stale month no longer exists on either side.
export function staleMonthlyOwed(a, b) {
  const A = Object.assign(defaultMonthly(), a || {});
  const B = Object.assign(defaultMonthly(), b || {});
  if (A.month === B.month) return 0;
  const stale = A.month > B.month ? B : A;
  return stale.done >= MONTHLY_TARGET && !stale.claimed ? MONTHLY_REWARD : 0;
}
```

and in `mergeAll` change the wallet line to:

```js
    wallet: mergeWallet(l.wallet, c.wallet) + staleMonthlyOwed(l.monthly, c.monthly),
```

- [ ] **Step 4:** `npm test` (full, bare) → all green.
- [ ] **Step 5:** commit `fix(sync): settle a stale completed-unclaimed monthly into the merged wallet — cross-month merge was destroying the 1500-coin reward`

**Idempotency note (reviewer):** double-pay cannot happen. A device holding a stale month locally settles it at boot (`settleMonthlyNow()` runs before any reconcile), so the merge-settle only fires when the stale month arrives from the cloud; after one merge the stale month is gone from both sides, and cross-device wallet folding stays max-never-sum.

---

### Task 2 — P0 companion: `pushDirty` blind-overwrites a stale cloud monthly without settling it

**Files:**
- Modify: `src/sync.js:69-75` (cooldown bypass), `src/sync.js:100-118` (`pushDirty`)
- Test: `test/sync.test.js`

**Why:** `pushDirty` (`sync.js:100`) uploads `rowsFromLocal(localSnapshot)` with no merge. If a device enters a new month and pushes dirty state before any reconcile has merged the cloud's June-unclaimed row, the same 1,500 coins are clobbered via a second path. Monthly is the *only* synced key whose cloud side can hold unrealized value, so it is the one key that must never blind-push.

- [ ] **Step 1: failing test** — extend `test/sync.test.js` using its existing fake-store/fetch harness:

```js
it("pushDirty routes through reconcile when monthly is dirty (stale-month settle path)", async () => {
  // store: dirty = { monthly: true }, local monthly 2026-07, cloud row holds
  // 2026-06 done:40 claimed:false, cloud wallet 100, local wallet 200.
  // Expect: resulting pushed wallet row = 1700 (200 max-fold + 1500 settle),
  // NOT a blind overwrite with 200.
  // Build with the same mocked getSession/fetchSyncRows/pushSyncRows fakes the
  // file already uses for reconcile tests.
});
```

- [ ] **Step 2:** run → FAIL (pushed wallet is 200).
- [ ] **Step 3: implementation** — in `src/sync.js`:

```js
// reconcile cooldown check (line ~73): bypass for both privileged reasons
const BYPASS_COOLDOWN = new Set(["sign-in", "monthly-dirty"]);
if (!BYPASS_COOLDOWN.has(reason) && now - meta.lastSyncAt < MIN_SYNC_GAP_MS) { ... }

// pushDirty, right after the empty-dirty early return:
// monthly is the one key whose CLOUD side can hold unrealized coin value
// (a completed-unclaimed month) — never blind-push it; merge instead.
if (meta.dirty.monthly) return reconcile(store, "monthly-dirty");
```

- [ ] **Step 4:** `npm test` bare → green.
- [ ] **Step 5:** commit `fix(sync): monthly-dirty pushes go through reconcile — blind push could clobber an unclaimed month on the cloud side`

---

### Task 3 — P1: Android hardware back (and nav-home) during battle discards the round's earned coins/score/daily progress

**Files:**
- Modify: `src/main.js:838`, `src/main.js:3573`

**Why:** Both exits call bare `stopBattle()`; the sanctioned exit (`#pause-quit`, `main.js:1513`) calls `endBattle(true)`, which banks partial progress (`noteDaily`, wallet credit, sticker/monthly-badge evaluation, `introPhase` closure — `main.js:2526-2557`) and itself ends with `show("home")`.

- [ ] **Step 1: implementation**

`main.js:3573`:
```js
initNative({ getScreen: ()=>currentScreen, goHome: ()=>{ if(B.on){ endBattle(true); } else { stopBattle(); show("home"); } } });
```

`main.js:838` (inside the nav handler):
```js
    if(tab==="home"){
      if(B.on){ endBattle(true); return; }   // banks partial round + shows home itself
      stopBattle();   // intro abandonment handled in show()
    }
```
(`endBattle(true)` already handles `introPhase`; the `stopBattle()` fallback keeps the current speech-cancel behavior for non-battle states.)

- [ ] **Step 2: verify** — `npm run build`; probe: start a round, answer 2 correctly, trigger `data-go="home"`; confirm wallet chip increased by the round score and daily progress advanced. Repeat via the Capacitor back path if an emulator is at hand (else note for Jordan's device pass).
- [ ] **Step 3:** `npm test` bare → green (no unit change expected). Commit `fix(battle): hardware-back / nav-home banks partial round via endBattle(true) — bare stopBattle() discarded earned score`

---

### Task 4 — P1: native (Android) TTS ignores the Pronunciation volume slider

**Files:**
- Modify: `src/audio.js:81`
- Test: `test/audio.test.js`

**Why:** `voiceVol` is applied to the mp3 element and to Web Speech, but the Capacitor `TextToSpeech.speak()` call passes no `volume` — every word outside the top-2,000 bundled mp3s plays at full volume on the APK regardless of the new wave-2 slider.

- [ ] **Step 1: failing test** — in `test/audio.test.js`, using its fake-Capacitor pattern:

```js
it("native TTS receives the voice volume", async () => {
  const calls = [];
  globalThis.window = { Capacitor: { isNativePlatform: () => true, Plugins: {
    TextToSpeech: { speak: o => { calls.push(o); return Promise.resolve(); } } } } };
  setVoiceVolume(0.3);
  speak("好");            // no bundled audio in test env -> ttsFallback -> native path
  expect(calls[0].volume).toBeCloseTo(0.3);
});
```
(Adapt setup to the file's existing native-mode fixtures; restore `setVoiceVolume(1)` after.)

- [ ] **Step 2:** run → FAIL (`volume` undefined).
- [ ] **Step 3:** `audio.js:81`:
```js
window.Capacitor.Plugins.TextToSpeech.speak({ text: hanzi, lang: "zh-CN", rate: 1.0, volume: voiceVol }).catch(() => {});
```
- [ ] **Step 4:** `npm test` bare → green. Commit `fix(audio): native TTS respects the Pronunciation volume slider`

---

### Task 5 — P2 (Jordan's queued nit): pause panel shows two rows both labelled "Sound effects"

**Files:**
- Modify: `src/i18n.js:310` (EN `settings.sfxVol`), `src/i18n.js:650` (TH `settings.sfxVol`)

**Why:** The bell mute-toggle row uses `home.sound` ("Sound effects", `i18n.js:25`) and the new wave-2 volume slider row uses `settings.sfxVol` — also "Sound effects" (`i18n.js:310`). Two different controls, identical EN label, same panel.

- [ ] **Step 1:** EN `settings.sfxVol`: `"Sound effects"` → `"SFX volume"` (mirrors the sibling "Pronunciation" slider naming). TH `settings.sfxVol`: `"เสียงเอฟเฟกต์"` → `"ระดับเสียงเอฟเฟกต์"`, **tagged for the native-TH review queue**.
- [ ] **Step 2:** `npm test` bare → green (i18n parity gates). `npm run build`. Commit `fix(i18n): pause-panel SFX volume slider no longer shares the mute toggle's label`

**Related, decision-gated (see Decisions below):** dragging the slider to 0 leaves the bell toggle showing "On" while `tone()` no-ops — not fixed here.

---

### Task 6 — P2: AudioContext can be born suspended and is never resumed → SFX permanently silent (iOS PWA)

**Files:**
- Modify: `src/sfx.js:1-6` (`ac()`), `src/sfx.js` `tone()`
- Test: `test/sfx.test.js`

**Why:** `ac()` memoizes the context forever; nothing calls `.resume()`. First-ever `tone()` can fire from the rAF timeout path (`bite()`), outside any gesture — on WebKit that context starts `"suspended"` and every later tone is silently inaudible for the session.

- [ ] **Step 1: failing test** — in `test/sfx.test.js`:

```js
it("tone() resumes a suspended AudioContext before scheduling", () => {
  let resumed = 0;
  const fakeCtx = { state: "suspended", resume: () => { resumed++; fakeCtx.state = "running"; return Promise.resolve(); },
    currentTime: 0, destination: {},
    createOscillator: () => ({ type: "", frequency: { value: 0 }, connect: o => o, start(){}, stop(){} }),
    createGain: () => ({ gain: { setValueAtTime(){}, exponentialRampToValueAtTime(){} }, connect: o => o }) };
  globalThis.window = { AudioContext: function(){ return fakeCtx; } };
  sfx.enabled = true; setSfxVolume(1);
  sfx.kill();
  expect(resumed).toBe(1);
});
```
(Match the file's existing fake-AudioContext helpers where they exist; reset module state per its conventions.)

- [ ] **Step 2:** run → FAIL. 
- [ ] **Step 3:** in `tone()`, after `const a = ac(); if(!a || !sfx.enabled) return;`:
```js
  // WebKit can hand back a suspended context when first constructed outside a
  // user gesture (e.g. first SFX = a word timing out in the rAF loop). resume()
  // is async — this tone may still be lost, but the session unmutes.
  if (a.state === "suspended" && a.resume) a.resume().catch(() => {});
```
- [ ] **Step 4:** `npm test` bare → green. Commit `fix(sfx): resume a suspended AudioContext — iOS PWA could stay silent for the whole session`

---

### Task 7 — P2: pause during the lunge/bump juice window skips the animation on resume

**Files:**
- Modify: `src/main.js:1478-1493` (`resumeBattle`)

**Why:** `resumeBattle()` shifts every absolute deadline listed in the invariant comment at `main.js:1411-1418` — but wave-2's `B.lungeAt` (set `main.js:1778`) and `B.bumpAt` (`main.js:1816`/`1867`) were never added, so pausing mid-flourish fast-forwards the lunge/bump/hurt-squash (and the heart-pop echo keyed off `bumpAt`).

- [ ] **Step 1:** add to the shift block:
```js
  if(B.lungeAt) B.lungeAt += shift;
  if(B.bumpAt) B.bumpAt += shift;
```
Also extend the invariant comment at `main.js:1411-1418` to list both.
- [ ] **Step 2:** `npm run build`; probe: answer correctly, pause within ~300ms, wait 2s, resume → lunge completes instead of snapping to neutral. `npm test` bare → green. Commit `fix(battle): resume shifts lungeAt/bumpAt — pausing mid-juice skipped the animation`

---

### Task 8 — P2: canvas Enter/Space skip isn't gated on pause and corrupts the reveal deadline

**Files:**
- Modify: `src/main.js:1268-1274`

- [ ] **Step 1:** add the same guard `replayCurrentWord()` uses, first line of the keydown handler body (after the key filter):
```js
  if(B.paused) return;   // overlay is up — same guard as replayCurrentWord/answer
```
- [ ] **Step 2:** `npm run build`; `npm test` bare → green. Commit `fix(battle): keyboard reveal-skip ignores input while paused — could truncate the reveal window via B.nextAt`

---

### Task 9 — P2: `startBattle()` has no re-entrancy guard — double-tap runs two rAF loops all round

**Files:**
- Modify: `src/main.js:1308` (top of `startBattle`)

- [ ] **Step 1:**
```js
function startBattle(opts){
  if(B.on) return;   // re-entrancy guard: a double-tapped start button must not schedule a second rAF loop
  ...
```
- [ ] **Step 2:** `npm run build`; `npm test` bare → green. Commit `fix(battle): startBattle re-entrancy guard — double-tap doubled the rAF loop for the whole round`

---

### Task 10 — P3: haptics fire-and-forget without `.catch()`

**Files:**
- Modify: `src/native.js:18-19`
- Test: `test/native.test.js`

**Why:** Every other call in native.js is documented "must never throw" and guarded; `Haptics.impact()`'s promise is not — unsupported/denied haptics spam `unhandledrejection` on every kill/wrong.

- [ ] **Step 1: failing test** — in `test/native.test.js`, mock `Haptics.impact` to return a rejected promise; assert calling `hapticKill()` produces no unhandled rejection (attach a `process.on("unhandledRejection")` probe or assert the returned/internal promise is caught per the file's async-test conventions).
- [ ] **Step 2:**
```js
export function hapticKill()  { if (isNative()) plugins().Haptics?.impact({ style: "LIGHT" }).catch(() => {}); }
export function hapticWrong() { if (isNative()) plugins().Haptics?.impact({ style: "MEDIUM" }).catch(() => {}); }
```
- [ ] **Step 3:** `npm test` bare → green. Commit `fix(native): guard haptics promise like every other native call`

---

### Task 11 — Release gate

- [ ] Full suite bare: `npm test` → 1,711+ green, true exit 0.
- [ ] `npm run build`; responsive sweep (`scripts/responsive-sweep.mjs`, chromium path) → all viewports pass.
- [ ] Probe checklist: Task 3 (partial-round banking), Task 7 (pause-mid-lunge), Task 5 (pause panel labels EN+TH screenshots).
- [ ] PR `fix/bug-hunt-2026-07-12` → development; body lists all 10 findings with severity + the two decision items.
- [ ] **On Jordan's merge+release go:** bump `SHELL` v65→v66 in `sw.js`, release per ritual, live-verify.

---

## Decisions Jordan owns (not implemented in this plan)

1. **Soft-intro "free" miss still resets the word's SRS/mastery streak** (`main.js:1737-1739` runs `noteAnswer` before `introFree` is consulted). The UI sells the first-ever attempt of a new format as risk-free, but a fumble still resets the streak and flags the word into Needs work/Smart Review. **Recommendation:** skip the *incorrect* record when `introFree` (a free-intro fumble is format confusion, not word knowledge; correct answers keep recording). Counter-view: SRS wants ground truth regardless of UI forgiveness. One-line fix either way once called.
2. **Mute-state mismatch:** SFX slider at 0 leaves the bell toggle showing "On" while nothing plays (`tone()` early-returns at level ≤ 0). Options: (a) leave as-is (volume and mute are independent, like every OS), (b) bell icon reflects "effectively muted" when `sfxVol == 0`. Recommendation: (a) — with Task 5's label fix the two rows are no longer confusable.
