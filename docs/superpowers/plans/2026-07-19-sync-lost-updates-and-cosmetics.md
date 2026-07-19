# Sync Lost-Updates + Review-Sweep Cosmetics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the two cross-device sync lost-update hazards found in the 2026-07-19 review sweep (coarse `shop` dirty bit reverting newer cloud equips; `pushDirty` blind cloud overwrite before the session's first reconcile) and fix three low-risk cosmetics (endless HUD bar, `iapBuy` double render, review-challenge cadence drift trap).

**Architecture:** Both sync fixes live entirely in the pure `src/merge.js` / `src/sync.js` seam — no schema migration, no new `nbhsk.*` key. Fix 1 adds a slot-level *baseline* (`meta.shopSlots`, stamped into the existing `sync` meta on every successful push) so `reconcile` can tell a real local re-dress from an unrelated owned/tier write. Fix 2 adds a session-scoped `sessionReconciled` latch: the first non-monthly `pushDirty` of a session redirects through `reconcile` (exactly like the existing `monthly-dirty` redirect) so cloud state is folded in before anything overwrites the cloud row. Cosmetics are surgical edits to `main.js`/`quest-session.js`.

**Tech Stack:** Vanilla JS ES modules, vitest, esbuild. Repo: `/root/work/HSK/game` (branch off `development`).

## Global Constraints

- **NO `sw.js` SHELL version bump** — release cut is the owner's gate.
- **Never mask the test exit code** — run `npm test` bare, never piped to `tail`/`grep`, when gating a commit.
- All persistence goes through `src/storage.js`'s store — never touch `localStorage` directly.
- `main.js` is frozen at its current scope — the `main.js` edits here modify existing wiring only, no new feature wiring.
- After changing `src/`, run `npm run build` and **commit the `dist/app.js` churn** (it is tracked).
- `npm run lint` must be clean before pushing; CI runs lint + test + build.
- The `sync` meta key is local-only (not in `SYNC_KEYS`) — adding the optional `shopSlots` field with a `defaultSyncMeta()` default follows the same additive pattern `lastLedgerAt` used; **no migration needed** (verify `MIGRATIONS` in `src/migrations.js` stays untouched).

**Deliberately excluded** (decided during planning): the SW RUNTIME/AUDIO per-release cache drop (intentional v80 unification — owner product call); the walker x-jump on mid-word resize (unreproduced, purely visual, lives in untested canvas code); `main.js`'s inline boss stage flip (behavior correct; only the *cadence constant* is a drift risk and Task 5 fixes that).

## Baseline (verified 2026-07-19)

`development`, suite 9,193 green (9,198 once PR #141 merges — either base is fine; this plan touches none of #141's lines), lint 0, build reproducible.

---

### Task 0: Branch + commit this plan

**Files:**
- Create: `docs/superpowers/plans/2026-07-19-sync-lost-updates-and-cosmetics.md` (this file)

- [ ] **Step 1:** `cd /root/work/HSK/game && git checkout development && git pull && git checkout -b fix/sync-lost-updates-cosmetics`
- [ ] **Step 2:** `git add docs/superpowers/plans/2026-07-19-sync-lost-updates-and-cosmetics.md && git commit -m "docs(plan): sync lost-updates + review-sweep cosmetics"`

---

### Task 1: `slotsOf` helper in merge.js

**Files:**
- Modify: `src/merge.js` (add export near `mergeShop`, ~line 66; extend `defaultSyncMeta` at line 14)
- Test: `test/merge.test.js`

**Interfaces:**
- Produces: `slotsOf(shop) -> { skin, backdrop, effect, soundpack }` (normalized via `defaultShop()`, tolerates null/undefined). `defaultSyncMeta()` now returns `{ dirty: {}, lastSyncAt: 0, lastLedgerAt: "", shopSlots: null }`. Task 2 consumes both.

- [ ] **Step 1: Write the failing tests** — append to `test/merge.test.js` (match its existing import style; add `slotsOf` to the `../src/merge.js` import):

```js
describe("slotsOf", () => {
  it("extracts exactly the four equip slots", () => {
    const s = slotsOf({ owned: ["a"], skin: "skin-red", backdrop: "market",
                        effect: "sparkle", soundpack: "retro", tiers: { a: 2 } });
    expect(s).toEqual({ skin: "skin-red", backdrop: "market", effect: "sparkle", soundpack: "retro" });
  });
  it("normalizes null/undefined through defaultShop", () => {
    expect(slotsOf(null)).toEqual(slotsOf(undefined));
    expect(slotsOf(null)).toEqual(slotsOf(defaultShop()));
    expect(Object.keys(slotsOf(null)).sort()).toEqual(["backdrop", "effect", "skin", "soundpack"]);
  });
});

describe("defaultSyncMeta shopSlots", () => {
  it("defaults shopSlots to null (pre-upgrade metas adopt it via Object.assign)", () => {
    expect(defaultSyncMeta().shopSlots).toBeNull();
  });
});
```

(`defaultShop` is already exported from `src/shop.js`; import it in the test if the file doesn't already.)

- [ ] **Step 2:** `npm test -- test/merge.test.js` → expect FAIL (`slotsOf` not exported).
- [ ] **Step 3: Implement** in `src/merge.js` — change line 14 and add the helper directly above `mergeShop`:

```js
export function defaultSyncMeta() { return { dirty: {}, lastSyncAt: 0, lastLedgerAt: "", shopSlots: null }; }
```

```js
// The four equipped-cosmetic slots, normalized through defaultShop so null/
// partial shop states compare stably. sync.js diffs these against the
// last-synced baseline (meta.shopSlots) to detect a REAL local re-dress.
export function slotsOf(shop) {
  const s = Object.assign(defaultShop(), shop || {});
  return { skin: s.skin, backdrop: s.backdrop, effect: s.effect, soundpack: s.soundpack };
}
```

- [ ] **Step 4:** `grep -rn "defaultSyncMeta" test/` — if any test asserts the exact meta shape, extend its expectation with `shopSlots: null`.
- [ ] **Step 5:** `npm test -- test/merge.test.js test/sync.test.js` → expect PASS.
- [ ] **Step 6:** `git add src/merge.js test/merge.test.js && git commit -m "feat(merge): slotsOf helper + shopSlots baseline field in sync meta"`

---

### Task 2: Baseline-aware slot dirtiness in reconcile (fixes the equip lost-update)

**Files:**
- Modify: `src/sync.js` (import at line 7; `settleDirty` at lines 80-88; `shopDirty` computation at line 168)
- Test: `test/sync.test.js`

**Interfaces:**
- Consumes: `slotsOf` from Task 1.
- Produces: `reconcile` now passes `shopDirty=true` into `mergeAll` **only** when the coarse dirty bit is set AND local slots differ from `meta.shopSlots` (or no baseline exists — legacy fallback). Every successful `settleDirty` stamps `meta.shopSlots` with the just-pushed slots. `mergeShop`'s signature is unchanged.

- [ ] **Step 1: Write the failing tests** — append to `test/sync.test.js` inside the `reconcile` describe block, following the file's existing `fakeClient`/`memStore`/`__setClientForTests` pattern (copy the `progressRow` scaffold from the test at ~line 390; `shop` rides the row's `cosmetics` field):

```js
describe("slot-baseline shop dirtiness (review 2026-07-19)", () => {
  const LOCAL_SHOP = { owned: ["skin-base", "deco-noodle"], skin: "skin-base",
                       backdrop: "market", effect: "", soundpack: "", tiers: {} };
  const CLOUD_SHOP = { owned: ["skin-base"], skin: "skin-base",
                       backdrop: "temple", effect: "", soundpack: "", tiers: {} };
  const cloudRows = () => ({ session: SESSION,
    progressRow: { user_id: "u1", xp: 0, mastery: {},
      daily: { last: "", streak: 0, today: { date: "", resolved: 0 }, restWeek: "", restDay: "" },
      quests: {}, monthly: {}, best: {}, cosmetics: CLOUD_SHOP, stickers: { earned: {} } },
    walletRow: { user_id: "u1", coins: 0, freezes: 0 } });

  it("an unrelated owned/tier write does NOT revert a newer cloud equip", async () => {
    const { client } = fakeClient(cloudRows());
    __setClientForTests(client);
    // dirty.shop is set (the deco purchase wrote the shop key), but the local
    // slots still equal the last-synced baseline -> cloud outfit must win.
    const store = memStore({ shop: LOCAL_SHOP,
      sync: { dirty: { shop: true }, lastSyncAt: 0, lastLedgerAt: "",
              shopSlots: { skin: "skin-base", backdrop: "market", effect: "", soundpack: "" } } });
    const r = await reconcile(store, "sign-in");
    expect(r.ok).toBe(true);
    expect(store.get("shop", null).backdrop).toBe("temple");      // cloud equip adopted
    expect(store.get("shop", null).owned).toContain("deco-noodle"); // purchase still merged
  });

  it("a real local re-dress (slots differ from baseline) still wins the slot fold", async () => {
    const { client } = fakeClient(cloudRows());
    __setClientForTests(client);
    const store = memStore({ shop: LOCAL_SHOP,   // local backdrop: market
      sync: { dirty: { shop: true }, lastSyncAt: 0, lastLedgerAt: "",
              shopSlots: { skin: "skin-base", backdrop: "beach", effect: "", soundpack: "" } } });
    const r = await reconcile(store, "sign-in");
    expect(r.ok).toBe(true);
    expect(store.get("shop", null).backdrop).toBe("market");      // local re-dress kept
  });

  it("no baseline yet (legacy meta) falls back to the plain dirty bit", async () => {
    const { client } = fakeClient(cloudRows());
    __setClientForTests(client);
    const store = memStore({ shop: LOCAL_SHOP,
      sync: { dirty: { shop: true }, lastSyncAt: 0, lastLedgerAt: "" } });   // no shopSlots
    const r = await reconcile(store, "sign-in");
    expect(r.ok).toBe(true);
    expect(store.get("shop", null).backdrop).toBe("market");      // pre-fix behavior preserved
  });

  it("a successful reconcile stamps the merged slots as the new baseline", async () => {
    const { client } = fakeClient(cloudRows());
    __setClientForTests(client);
    const store = memStore({ shop: LOCAL_SHOP,
      sync: { dirty: { shop: true }, lastSyncAt: 0, lastLedgerAt: "",
              shopSlots: { skin: "skin-base", backdrop: "market", effect: "", soundpack: "" } } });
    await reconcile(store, "sign-in");
    expect(store.get("sync", {}).shopSlots)
      .toEqual({ skin: "skin-base", backdrop: "temple", effect: "", soundpack: "" });
  });
});
```

- [ ] **Step 2:** `npm test -- test/sync.test.js` → expect the first and fourth new tests to FAIL (cloud equip currently reverted; no baseline stamped).
- [ ] **Step 3: Implement** in `src/sync.js`:

Line 7 import:
```js
import { mergeAll, defaultSyncMeta, slotsOf } from "./merge.js";
```

Replace line 168 (`const shopDirty = !!(meta.dirty && meta.dirty.shop);`) with:
```js
    // Slot-level dirtiness (review 2026-07-19): the per-key dirty bit marks
    // the WHOLE shop key dirty on any owned/tier mutation, so a device that
    // only bought a deco would LWW its stale equips over a newer cloud
    // outfit. Only a real local re-dress — slots differing from the
    // last-synced baseline stamped by settleDirty — wins the slot fold. A
    // missing baseline (legacy meta / never synced) keeps the old plain
    // dirty-bit behavior, which also preserves "an unsynced re-dress isn't
    // undone by an old cloud row" for fresh installs.
    const slotsBaseline = meta.shopSlots || null;
    const shopDirty = !!(meta.dirty && meta.dirty.shop) &&
      (!slotsBaseline || !eq(slotsOf(local.shop), slotsBaseline));
```

In `settleDirty` (lines 80-88), add the stamp before the `lastSyncAt` line:
```js
  // Baseline for the slot-level shop dirtiness above: after a successful
  // push the cloud row holds exactly `expected.shop`, so its slots become
  // the reference a future reconcile diffs against.
  if ("shop" in expected) meta.shopSlots = slotsOf(expected.shop);
```

- [ ] **Step 4:** `npm test -- test/sync.test.js test/merge.test.js` → expect PASS (including all pre-existing reconcile tests — they run with no `shopSlots` baseline and land on the legacy-fallback path).
- [ ] **Step 5:** `npm test` (full suite, bare) → expect all green.
- [ ] **Step 6:** `git add src/sync.js test/sync.test.js && git commit -m "fix(sync): slot-baseline shop dirtiness — unrelated purchases no longer revert cross-device equips"`

---

### Task 3: First-settle redirect in pushDirty (fixes the blind cloud overwrite)

**Files:**
- Modify: `src/sync.js` (module state at ~line 21; `BYPASS_COOLDOWN` at line 19; `reconcile` after line 219; `pushDirty` after the monthly redirect at line 257)
- Test: `test/sync.test.js` (two existing tests updated, three added)

**Interfaces:**
- Consumes: nothing new.
- Produces: `pushDirty(store, reason, now, midRound)` — first non-monthly dirty push of a session returns `reconcile(store, "first-settle", now)` (or `{ ok:false, reason:"mid-round" }` if `midRound`); after any reconcile that reached its merged store-writes, pushes are plain as before. New test hook `__setSessionReconciledForTests(v = true)`; `__resetForTests()` also resets the latch. `main.js` needs **no change**: `pushEdge` already rehydrates when the result carries `changed`/`localChanged` (the monthly redirect uses the identical contract).

- [ ] **Step 1: Update the two existing plain-path tests** (they intentionally exercise the *post-reconcile* plain push): in `test/sync.test.js`, the tests at ~line 379 ("clears dirty…") and ~line 389 ("non-monthly dirty push stays on the plain path…") each get, right after their `memStore(...)` line:

```js
    __setSessionReconciledForTests();   // a reconcile already ran this session
```

Add `__setSessionReconciledForTests` to the file's `../src/sync.js` import at line 3. Also update the second test's title/comment to say the blind push is only legal *after* the session's first reconcile.

- [ ] **Step 2: Write the failing tests** — append to the `pushDirty` describe block:

```js
  it("first non-monthly push of a session redirects through reconcile (no blind overwrite)", async () => {
    const { client, calls } = fakeClient({ session: SESSION,
      progressRow: { user_id: "u1", xp: 0, mastery: {},
        daily: { last: "", streak: 0, today: { date: "", resolved: 0 }, restWeek: "", restDay: "" },
        quests: {}, monthly: {}, best: {}, cosmetics: {}, stickers: { earned: {} } },
      walletRow: { user_id: "u1", coins: 5000, freezes: 0 } });
    __setClientForTests(client);
    const store = memStore({ wallet: 200, sync: { dirty: { wallet: true }, lastSyncAt: 0 } });
    const r = await pushDirty(store, "hide");
    expect(r.ok).toBe(true);
    expect("changed" in r).toBe(true);                     // reconcile contract, not plain push
    const pushedWallet = calls.upserts.find(u => u.table === "wallet").row;
    expect(pushedWallet.coins).toBe(5000);                 // max(200, 5000) — cloud folded, not clobbered
    expect(store.get("wallet", 0)).toBe(5000);
  });

  it("after a successful reconcile the same session, pushes are plain again", async () => {
    const { client, calls } = fakeClient({ session: SESSION,
      progressRow: null, walletRow: { user_id: "u1", coins: 5000, freezes: 0 } });
    __setClientForTests(client);
    const store = memStore({ wallet: 200, sync: { dirty: { wallet: true }, lastSyncAt: 0 } });
    await reconcile(store, "sign-in");                     // latches the session
    store.set("wallet", 6000);                             // post-reconcile local earn
    const before = calls.upserts.length;
    const r = await pushDirty(store, "hide");
    expect(r.ok).toBe(true);
    expect("changed" in r).toBe(false);                    // plain push path
    expect(calls.upserts.length).toBe(before + 2);
  });

  it("first-settle respects midRound: defers wholesale, dirty intact", async () => {
    const { client, calls } = fakeClient({ session: SESSION, progressRow: null, walletRow: null });
    __setClientForTests(client);
    const store = memStore({ wallet: 200, sync: { dirty: { wallet: true }, lastSyncAt: 0 } });
    const r = await pushDirty(store, "hide", undefined, true);   // midRound
    expect(r).toEqual({ ok: false, reason: "mid-round" });
    expect(calls.upserts.length).toBe(0);
    expect(store.get("sync", {}).dirty).toEqual({ wallet: true });
  });
```

(If `fakeClient` rejects `progressRow: null`, use the empty-row scaffold from Step 1's neighbor test instead — mirror whatever the file already does for "no cloud progress row".)

- [ ] **Step 3:** `npm test -- test/sync.test.js` → expect the three new tests to FAIL (first currently blind-pushes 200) and the two updated ones to FAIL on the missing import → then implement.
- [ ] **Step 4: Implement** in `src/sync.js`:

Line 19 — add the bypass reason (and extend the comment above it with one line: `"first-settle" is pushDirty's first-push-of-session redirect — same must-run rationale as monthly-dirty`):
```js
const BYPASS_COOLDOWN = new Set(["sign-in", "monthly-dirty", "purchase", "first-settle"]);
```

Lines 21-22 — session latch + hooks:
```js
let inFlight = false;
// Latched once a reconcile has folded cloud state into this session's local
// store (set at the merged store-writes, so even a failed FINAL push counts —
// the clobber hazard is gone once cloud is merged in). Until then, pushDirty
// must not blind-overwrite the cloud row (review 2026-07-19): a purchase or
// hide edge can fire before any reconcile on a cold boot (visibilitychange
// only fires on a foreground TRANSITION, never on first paint).
let sessionReconciled = false;
export function __resetForTests() { inFlight = false; sessionReconciled = false; }
export function __setSessionReconciledForTests(v = true) { sessionReconciled = v; }
```

In `reconcile`, immediately after line 219's `for (const k of Object.keys(merged)) store.set(k, merged[k]);`:
```js
    sessionReconciled = true;
```

In `pushDirty`, directly after the monthly redirect block (line 257), before the `inFlight` check:
```js
  // First push of the session: no reconcile has folded cloud state in yet,
  // so a blind push could overwrite cloud-only progress (another device's
  // sync, a webhook wallet credit). Redirect through reconcile — same shape
  // as the monthly redirect above, including the mid-round deferral.
  if (!sessionReconciled) {
    if (midRound) return { ok: false, reason: "mid-round" };
    return reconcile(store, "first-settle", now);
  }
```

- [ ] **Step 5:** `npm test -- test/sync.test.js` → expect PASS. Then `npm test` (full, bare) → all green. (`test/sync.test.js`'s `beforeEach` already calls `__resetForTests()`, which now also clears the latch between tests.)
- [ ] **Step 6:** `git add src/sync.js test/sync.test.js && git commit -m "fix(sync): first pushDirty of a session settles through reconcile before any cloud overwrite"`

---

### Task 4: Endless-mode HUD — hide the meaningless progress track

**Files:**
- Modify: `src/main.js:1755-1761` (`updateHud`)

**Interfaces:** none (untested DOM wiring by design).

Context: in endless mode `q.target` is `Infinity`, so `roundProgress` correctly reads 0 (documented in `src/hud.js:20-26`) — but the empty green track still renders for the whole session and reads as broken. The count label already shows `N · ∞`; the track carries no information in endless.

- [ ] **Step 1: Implement** — in `updateHud` (src/main.js:1755), the current body is:

```js
function updateHud(){
  if(!B.on) return;   // toggleSfx can fire from the More screen, outside battle
  const q = B.quest.view();
  $("#hud-review").textContent = t("battle.reviewPouch", { n: q.reviewPouch });
  const label = q.endless ? `${q.learned} · ∞` : `${q.learned}/${q.target}`;
  $("#hud-progress-fill").style.width = (roundProgress(q.learned, q.target) * 100) + "%";
  $("#hud-progress-count").textContent = t("battle.learnedProgress", { label });
  updateComboStrip();
}
```

Insert after the `label` line:
```js
  // Endless has no session length: roundProgress reads 0 by design (hud.js),
  // so the track would sit empty all session and read as broken — hide it
  // and let the "N · ∞" count carry the state. Idempotent per update.
  $("#hud-progress").querySelector(".hud-progress-track").style.display = q.endless ? "none" : "";
```

- [ ] **Step 2: Verify visually** — `npm run build`, then with Playwright chromium (executablePath pattern from `scripts/responsive-sweep.mjs`) start an endless battle and a round battle; assert the track is hidden in endless, visible with a growing fill in round mode, 0 console errors. A throwaway probe script is fine (don't commit it).
- [ ] **Step 3:** `npm test` (bare) + `npm run lint` → green.
- [ ] **Step 4:** `git add src/main.js && git commit -m "fix(hud): hide the round-progress track in endless mode (bar has no meaning without a session length)"` (dist churn is committed in Task 6's rebuild — or include it here if you build now; either way dist must match src by Task 6.)

---

### Task 5: Unify the review-challenge cadence constant

**Files:**
- Modify: `src/quest-session.js:3` (imports) and `:126`

**Interfaces:**
- Consumes: `isReviewChallenge` from `src/boss.js` (`plannedIndex > 0 && plannedIndex % REVIEW_CHALLENGE_EVERY === 0`).

Context: `boss.js` exports the tested cadence API but `quest-session.js:126` hardcodes `planned % 10 === 0` — tuning `REVIEW_CHALLENGE_EVERY` in `boss.js` would silently not change gameplay. At line 126 `planned` was just incremented (`planned++` at line 120) so it is always ≥ 1, making `isReviewChallenge(planned)` exactly equivalent today.

- [ ] **Step 1: Implement** — line 3:
```js
import { wordWeight } from "./srs.js";
import { isReviewChallenge } from "./boss.js";
```
Line 126:
```js
      reviewChallenge: isReviewChallenge(planned),
```

- [ ] **Step 2:** `npm test -- test/quest-session.test.js test/boss.test.js` → expect PASS unchanged (behavior-identical refactor; the existing cadence test at quest-session.test.js:121 is the guard).
- [ ] **Step 3:** `git add src/quest-session.js && git commit -m "refactor(quest-session): source review-challenge cadence from boss.js instead of a literal 10"`

---

### Task 6: Single-render iapBuy + final gate

**Files:**
- Modify: `src/main.js:3369-3486` (`iapBuy`)
- Modify: `dist/app.js` (rebuild)

**Interfaces:** none.

Context: every branch inside `iapBuy`'s `try` calls `renderShop()` before its `return`, and the `finally` (which runs even after `return`) calls `renderShop()` again — so every purchase resolution renders the shop twice. The `finally` render is the correct final one (it runs after `iapPending = null`). Money-path tests cover provider selection, not render counts — this is behavior-identical.

- [ ] **Step 1: Implement** — delete exactly these four `renderShop();` lines inside `iapBuy`, keeping every `iapPending = null`, toast, analytics, and `return` as-is:
  1. Mock-fail branch (after `if(r.reason !== "cancelled") toast(t("iap.failed"));`).
  2. Mock-success fallthrough (`renderShop();   // duplicate/already-owned fall through to the owned state` — move that comment onto the `finally`'s render).
  3. Real-provider fail branch (after the `purchase_fail` analytics tracks).
  4. End of the poll path (the bare `renderShop();` just before `}catch(e){`).

  The `finally` block stays:
```js
  }finally{
    iapPending = null;
    renderShop();   // single render point for every outcome, incl. duplicate/already-owned fallthrough
  }
```

- [ ] **Step 2:** `npm test` (bare) + `npm run lint` → green. `npm run build` → commit dist churn.
- [ ] **Step 3:** `git add src/main.js dist/app.js && git commit -m "refactor(shop): single renderShop point in iapBuy (finally already re-rendered every path)"`
- [ ] **Step 4: Full gate** — `npm test` (bare, full suite: expect baseline + Task 1-3's new tests, all green), `npm run lint` (0), `npm run build` (no further dist churn, `git status` clean).
- [ ] **Step 5:** Push the branch and open a PR against `development` titled `fix(sync): slot-baseline equips + first-settle push guard, + review-sweep cosmetics`, PR body summarizing the two sync semantics changes (they alter tested cloud-write behavior — call that out explicitly for the owner's review) and the three cosmetics. **Do not merge** — owner gate.

---

## Self-Review (done at planning time)

- **Coverage:** finding "coarse shop dirty bit" → Tasks 1-2; "blind pre-reconcile push" → Task 3; endless bar → Task 4; cadence drift → Task 5; double render → Task 6. Excluded items are listed with reasons in Global Constraints.
- **Type consistency:** `slotsOf` (Tasks 1→2), `__setSessionReconciledForTests` (Task 3 steps 1→4), `meta.shopSlots` (Tasks 1→2) match across tasks. `mergeShop`/`pushDirty` public signatures unchanged.
- **Contract notes for reviewers:** `pushEdge` in `main.js` already handles a reconcile-shaped result (`"changed" in r` → rehydrate), so Task 3 needs no `main.js` change; Task 3's redirect deliberately mirrors the existing monthly-dirty redirect including mid-round deferral semantics.
