# Cloud-Save Reconcile (P3) — Design

_Approved by Jordan 2026-07-10 (brainstorm: 5 pre-design questions + 4 design sections,
each approved individually). Facts base: `2026-07-10-cloud-save-predesign-notes.md`.
Next step: implementation plan, then an SDD round on `feat/cloud-save`._

## Goal

Signed-in (or cloud-connected guest) players get their progress mirrored to Supabase and
reconciled across devices/installs. Offline-first stays absolute: localStorage remains the
source of truth during play; the cloud is a mirror reconciled at the edges. Cloud failure
must never break gameplay (the `cloud.js` contract, inherited).

## Decisions (from the brainstorm)

1. **Wallet scope:** wallet + freezes sync this round. The PRD §3.3 anti-cheat daily-earn
   clamp ships now as a **Postgres trigger** on `wallet` (no Edge Function).
2. **Cadence: edge-based only.** Full reconcile on sign-in / app-foreground / back-online;
   fire-and-forget push on app-hide and post-purchase. No network traffic during play.
3. **Guest sync: any session syncs.** One rule — a cloud session exists → the engine runs,
   anonymous or email alike. Boot stays network-pure (a session only exists if the player
   tapped Connect; sync never creates one).
4. **Restore UX: silent reconcile.** Fresh installs adopt cloud state naturally (empty
   local loses every fold). A "Progress restored" toast confirms when a sign-in merge
   changed anything. No restore dialog.
5. **Schema shape:** `nbhsk.monthly` → `progress.monthly jsonb`; `nbhsk.freezes` →
   `wallet.freezes integer` (economy stays on one row, under the trigger's eye).
6. **Architecture:** new pure `src/merge.js` (fold functions, fully unit-tested, zero I/O)
   + new impure `src/sync.js` orchestrator in `cloud.js`'s never-throws spirit; `main.js`
   only wires edges and the dirty hook at the `store.set` chokepoint.

## 1. Schema revision (apply BEFORE client work; Jordan's approval given 2026-07-10)

One idempotent `schema.sql` revision:

1. `alter table public.progress add column if not exists monthly jsonb not null default '{}'::jsonb;`
2. `alter table public.wallet add column if not exists freezes integer not null default 0;`
3. `progress.best` default `'[]'::jsonb` → `'{}'::jsonb` + `update` of any existing
   `'[]'` rows (code writes a keyed object — `src/main.js` best handling).
4. **Anti-cheat trigger** (BEFORE INSERT OR UPDATE on `wallet`):
   - Only **positive** coin deltas count as earnings; spending is never penalized.
   - `earned_today` rolls over when `earned_today_date < current_date`.
   - Daily cap **25,000 coins** — above any legit hardcore day (~15–20k with ad
     doublers; whole catalog ≈ 40k), eats tampered jumps.
   - Edge-based sync means an offline stretch legitimately syncs several days of
     earnings at once → UPDATE allowance = `25000 × greatest(1, days since row's
     updated_at)`.
   - INSERT (first-ever sync, where a long-time offline player legitimately brings a
     large balance and account age proves nothing) clamps `coins` to a lifetime-plausible
     ceiling of **100,000** — far above any legit first sync (catalog ≈ 40k), far below
     a tampered value.
   - `freezes` clamped to 0–2 on both paths.
5. RLS unchanged — existing `progress_self` / `wallet_self` policies cover new columns.

Trigger scenarios (clamp, rollover, multi-day allowance, freeze cap) are exercised via
mgmt-API SQL at apply time and recorded in the revision commit.

## 2. Merge rules — `src/merge.js` (pure, one fold per key + `mergeAll`)

All rules are additive-safe: no rule can destroy progress in either direction.

| Key | Rule |
|---|---|
| `nbhsk.mastery` | Per-hanzi: one side only → take it; both → counts `s`,`k` = max, streak `r` from the side with newer `ls`, `ls` = max |
| `nbhsk.xp` | `max` |
| `nbhsk.daily` | Newer-`last` side wins the blob; **streak** = max of each side's streak or the combined chain when the two calendars connect. Exact function pinned test-first against `daily.js` rest-day/freeze semantics during implementation |
| `nbhsk.quests` | Same date → per-quest progress max + `done` union; different dates → newer date wins |
| `nbhsk.monthly` | Same month → `done` = max, `claimed` = OR; different month → newer month wins |
| `nbhsk.wallet` | `max(local, cloud)`; server trigger is the guard. Accepted PRD-sanctioned quirk (§6.3): spend-on-A + earn-on-B can resurrect spent coins; self-corrects economically, bounded by the daily cap |
| `nbhsk.freezes` | `max`, clamp 0–2 (same quirk, bounded by the cap) |
| `nbhsk.shop` | `owned` set-union; `tiers` per-id max; equipped slots (skin/backdrop/effect/soundpack) = **dirty-bit LWW**: local wins iff locally changed since last successful sync, else cloud (fresh install adopts the cloud outfit) |
| `nbhsk.stickers` | `earned` union, earliest date per id; announcement `queue` is **local-only** — cloud-merged stickers land in the album silently, never re-announce |
| `nbhsk.best` | Per-`scopeKey·mode` `max(score)`, keeping the winning side's date |
| `nbhsk.locale` | Not in merge.js — already synced via `profiles.locale` (client-auth round) |

Local-only keys stay local (unchanged): `settings, sfx, scope, scopeView, formatIntros,
introDone`.

**New local key `nbhsk.sync`:** persisted per-key dirty flags (set at the `store.set`
chokepoint so a mid-session kill doesn't forget unpushed changes) + `lastSyncAt`.

## 3. Sync engine — `src/sync.js` + `main.js` edges

`sync.js` contract = `cloud.js` contract: lazy client, offline-guarded, never
throws/rejects, cloud failure invisible to gameplay.

- **`reconcile(reason)`** — pull `progress` + `wallet` rows → `mergeAll` with local →
  write merged to localStorage → upsert both rows → clear dirty flags, stamp
  `lastSyncAt`. Single-flight (concurrent calls ignored); skipped when `lastSyncAt`
  < 30s old. Failure: dirty flags kept, `{ok:false}`, no user-visible error.
- **`pushDirty(reason)`** — fire-and-forget upsert of local state, no pull (for
  short-time-budget edges). A stale device pushing low values self-heals: the next
  reconcile anywhere max-merges the high values back.

Edges (in `main.js`):

| Edge | Call |
|---|---|
| Sign-in / guest-connect success | `reconcile('sign-in')` + "Progress restored" toast if the merge changed anything |
| `visibilitychange` → visible | `reconcile('foreground')` (new branch beside the existing hidden logic at `src/main.js` visibility handler) |
| `online` event | `reconcile('online')` |
| `visibilitychange` → hidden | `pushDirty('hide')` (beside existing pause code) |
| Shop / freeze purchase | `pushDirty('purchase')` — insurance on paid-inventory moments |

**Safety rule:** reconcile never interrupts an active round — network + merge may run,
but re-hydrating in-memory state (wallet HUD, xp, mastery) defers to the results screen.
Otherwise a changed merge re-hydrates the synced keys and re-renders, like a reload.

**Guest→email upgrade** needs no special code: same-uid upgrade finds its cloud row
already warm (guests sync); the returning-user OTP fallback (session flips to the
existing account's uid) folds the device's guest progress into that account via the
same `reconcile('sign-in')`. The abandoned anon row joins the orphan-cleanup pile.

## 4. UX & i18n

- Silent everywhere except: "Progress restored" toast (sign-in merges that changed
  state) and a passive "Last synced …" line on the Account screen (with a never-synced
  state). ~3 new i18n strings → tagged for the TH native-review queue.
- No new screens, no dialogs, no layout shifts (sweep should stay 10/10 untouched).

## 5. Testing

- **`merge.js`** (bulk of the round's tests): per-rule cases + fold properties —
  `merge(a,a) = a`, empty-side identity, order-independence where applicable.
- **`sync.js`**: mocked client via the existing `__setClientForTests` pattern —
  offline, network-fail, single-flight, rate-limit, dirty-flag lifecycle.
- **Trigger**: mgmt-API SQL scenarios at apply time (see §1).
- **Live E2E probes pre-merge** (like the client-auth round): play → sync → wipe
  local → sign in → verify restore; and a two-state upgrade-merge probe.
- Responsive sweep ×2 as usual.

## 6. Rollout

1. Apply the schema revision live (approval given — §1).
2. SDD round on `feat/cloud-save` off `development` (design → plan → tasked
   implementation with review gates, per house process).
3. At release: SHELL v54 → v55; PRD §6.3 one-line amendment — per-key fold rules
   (this doc §2) supersede "last-write-wins per field".

## Non-goals

No realtime sync; no simultaneous-multi-device play support beyond self-healing
max-merges; no server-side merge logic; leagues/friends stay queued (Duolingo notes);
local-only keys stay local.
