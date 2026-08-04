# Wallet delta fold — kill the max() refund

**Date:** 2026-08-04 · **Status:** approved (audit findings #1 + #9, Jordan approved ranking)
**Files:** `src/merge.js`, `src/sync.js` (+ their tests). No `main.js` changes. No schema/RLS changes.

## The two bugs

1. **Spend refund (HIGH).** `mergeWallet = max(local, cloud, 0)` treats the wallet as
   monotonic; spends make it non-monotonic. No reconcile runs at cold boot
   (`visibilitychange` never fires on first paint — sync.js:31), so a signed-in player
   who spends before the session's first sync edge hits `pushDirty`'s **first-settle
   redirect** into `reconcile`, which max-folds the post-spend local wallet against the
   pre-spend cloud row: the spend is refunded while `mergeShop`'s ownership union keeps
   the item. Fires in normal play (open app → buy → background the phone).
2. **Monthly reward absorbed (MED).** `mergeAll` settles each side's stale month and
   folds `mergeWallet(local+lm.earned, cloud+cm.earned−unseen)+unseen`. A settled
   1500-coin reward is silently outcompeted whenever the other side's wallet is
   numerically ahead for unrelated reasons — violating the file's own "no fold can
   lose progress" header. (The same symmetric settle also relies on max() to mask a
   same-month double-settle: both sides +1500, max picks one.)

## Design: base snapshot + additive delta

The wallet is a counter with increments *and* decrements. The correct two-party fold is
**cloud + (local − base)** where `base` is the local value at the last point local and
cloud agreed. No per-callsite instrumentation: `base` is a snapshot, so every existing
`store.set("wallet", …)` in main.js keeps working untouched — the delta is *derived*
(`local − base`), never tracked per event.

### New state

`syncMeta` (the `nbhsk.sync` blob, additive via `defaultSyncMeta()` — precedent:
`shopSlots`/`shopPreferences`; **no migrations.js bump**) gains:

```js
walletSync: null | { uid, base, pushed }
```

- `uid` — account the snapshot belongs to. Mismatch ⇒ snapshot meaningless ⇒ legacy path.
- `base` — local wallet value at the last fold agreement.
- `pushed` — whether the cloud row is known to include `base` (the push after that
  fold succeeded).

### The fold (merge.js)

`mergeAll(local, cloud, { …, walletBase })` where `walletBase = {base, pushed} | null`.

**`walletBase === null` → legacy path, byte-identical to today** (max fold, symmetric
lm/cm settle, unseen subtract/add). This is the fold for: legacy meta, uid switch,
fresh install/reinstall (PRD §7.4 consumables-never-restore rides on this), guest
sign-in first contact, and the `baseline = mergeAll(local, null, …)` changed-detection
call (always legacy — its value stays `local + lm.earned`, same as today).

**`walletBase` present → delta path:**

```js
localSide  = num(local.wallet) + lm.earned          // lm = local stale-month settle
cloudSide  = num(cloud.wallet)                       // NOTE: no cm.earned, no unseen
cloudEff   = walletBase.pushed ? cloudSide : Math.max(cloudSide, walletBase.base)
wallet     = Math.max(0, cloudEff + (localSide - walletBase.base))
```

Why each term:

- **`lm.earned` is a genuine local earn event** → belongs in the delta. Idempotent with
  boot-time `settleMonthlyNow()` (same `settleMonthly` rule — already-settled is a no-op).
- **`cm.earned` is dropped entirely in delta mode.** The cloud's stale complete month is
  always a *copy* of some device's local state (pushes don't clear local): that device
  settles it into its own wallet at its next boot and the coins ride *its* delta. Crediting
  cm here would double-pay the common case (both sides synced during month M ⇒ boot
  settle +1500 into the delta AND cm +1500 on the cloud side). `settleMonthly(cm)` is
  still *called* — its settled `cm.state` still feeds `mergeMonthly` so a stale month
  can't win the month-wholesale pick — only its `earned` is not credited. Fixes bug #2
  in both directions: lm.earned can no longer be absorbed (it's additive), and cm's
  reward materializes exactly once on the earning device.
- **`unseen` (ledger) is dropped in delta mode.** The subtract/add dance exists only to
  protect webhook credits from the max fold; in `cloud + delta` the credit sits inside
  the cloud term exactly once. The ledger fetch, cursor advance, cursor-before-writes
  crash ordering, and the `credits` attribution for purchase-poll all stay **unchanged**
  — the fresh-cursor adopt case is a no-`walletSync` case and lands on the legacy path
  anyway.
- **`pushed:false` branch** (`max(cloudSide, base)`): our last fold's delta may be
  missing from the cloud row (that push failed). `cloud < base` is then *our* unpushed
  value, not a remote spend — taking the max preserves it until the next successful
  push heals the row. Known accepted window: a *remote* spend arriving during our
  unpushed window gets refunded once (rare: needs our failed push + remote spend +
  our reconcile before the remote's push). With `pushed:true`, `cloud < base` means a
  real remote spend and is applied faithfully — that is the fix for bug #1's
  cross-device variant.
- **`Math.max(0, …)`** — wallet floor, same clamp as today.

`mergeWallet` stays exported for the legacy path.

### Lifecycle (sync.js)

- **reconcile():** `matched = meta.walletSync && meta.walletSync.uid === uid`. Pass
  `walletBase: matched ? {base, pushed} : null` into the *cloud* mergeAll call only.
  In the merged-store-writes batch (AFTER the cursor write — its ordering rationale is
  untouched), also write `walletSync = { uid, base: merged.wallet, pushed: false }`.
  On push success, `settleDirty` stamps `pushed: true` (below). On push failure we
  return before settleDirty ⇒ `pushed` stays false ⇒ next fold takes the unpushed
  branch. Never write `walletSync` before the merged wallet lands in the store (they
  must move together; a crash between cursor write and merged writes leaves the old
  pair intact and self-heals like today).
- **settleDirty(store, expected, lastSyncAt, uid):** gains the `uid` param. When
  `"wallet" in expected`, stamp `walletSync = { uid, base: expected.wallet,
  pushed: true }`. `expected.wallet` (what the cloud row now holds), NOT the possibly
  raced-ahead store value — a mid-push earn stays in the next delta.
- **pushDirty() blind path:** on push success the existing `settleDirty(store, local, 0)`
  call picks up the stamp with `base = local.wallet` — cloud now equals local. On
  failure, `walletSync` is untouched (still accurate: cloud unchanged).
- Nothing else changes: `reconciledUid` latch, monthly-dirty redirect, mid-round
  deferral, cooldown/BYPASS sets, `rowsFromLocal`/`localFromRows`, cloud.js — all as-is.

### Scenario table (tests must cover each)

| # | Scenario | Old result | New result |
|---|---|---|---|
| 1 | Cold boot, spend 500, hide ⇒ first-settle reconcile (base=pushed cloud value) | refund (max) | `cloud−500`, item kept, **no refund** |
| 2 | Device B spent remotely; A reconciles (pushed:true, A idle) | refund of B's spend if A's stale value higher | cloud adopted (spend respected) |
| 3 | A earned 30 offline, cloud +50 from B ⇒ both kept | max loses smaller | `cloud+30` (sum) |
| 4 | Monthly settled locally at boot (+1500), cloud month stale-same | masked double via max | +1500 exactly once |
| 5 | lm.earned with other side numerically ahead (bug #9) | reward absorbed | reward additive, kept |
| 6 | Fold ok, push FAILS, then blind pushDirty | — | local pushed intact; no loss, no double |
| 7 | Fold ok, push fails, second reconcile before any push (unpushed branch) | — | `max(cloud, base)+delta` — own delta kept |
| 8 | uid switch / legacy meta / no walletSync | max | max (legacy path, byte-identical) |
| 9 | Fresh cursor + webhook credit / reinstall adopt | adopt rules | unchanged (legacy path) |
| 10 | Guest plays, signs into existing account | max | max first contact, then base adopted |
| 11 | Sign-out → guest earns → sign back into same uid (walletSync.uid matches) | max could refund/lose | `cloud + guest earnings` |
| 12 | Webhook credit lands with pushed:true delta fold | subtract/add dance | credit inside cloud term, once |
| 13 | Wallet write races the push (settleDirty keeps dirty bit) | — | base=expected.wallet; raced earn stays in next delta |

### Explicitly out of scope / accepted

- **Concurrent A/B push LWW race** (both fold from same row, second push wins): loses
  the first device's delta — *identical to today's max()*; real fix is server-side
  atomic increments. Documented, not addressed.
- **freezes** keep the max fold (same bug class, ≤2 cap, low stakes) — follow-up.
- `mergeQuests` newer-date-wins-wholesale (audit medium) — separate item, not here.
- No server/RLS/schema changes; `wallet` row shape unchanged.

## Test plan (RED first on the bug scenarios)

- `test/merge.test.js`: pure fold — every row of the scenario table expressible as a
  two-state fold; plus: legacy path byte-identity when `walletBase` absent (existing
  suite must pass **unmodified** except tests that assert the *file header* wording).
- `test/sync.test.js`: lifecycle — scenario 1 end-to-end (seed pushed base, spend,
  first-settle redirect ⇒ no refund; THE red test for bug #1), 6, 7, 8, 10, 13; the
  existing "max(200, 5000) cloud folded, not clobbered" test keeps passing as legacy
  coverage (no walletSync seeded).
- Update merge.js's header ("no fold can lose progress") to state the real invariant.
