# Coin Purchase Go-Live ("user can buy coins") — Design + Plan

**Status: AWAITING JORDAN'S REVIEW** — design decisions + prerequisite chores below are his; no implementation until his go.

**Goal:** Take the already-shipped-dark IAP slice live so a real user can buy coin packs (and Supporter) with real money on the Android app.

## 1. What already exists (don't rebuild)

PR #82 (2026-07-11) shipped a complete mock IAP slice, dark behind the `nbhsk.dev.iap` flag:

- `src/monetization/products.js` — catalog at PRD §7.1 prices (Coins S/M/L/XL: 29/99/169/329฿ → 1,000/3,500/6,500/15,000 coins; Supporter 79฿). Mock-era display prices; store-localized strings must win once a real provider lands (file's own contract).
- `src/monetization/purchases.js` — `applyPurchase` (idempotent by orderId, mirrors PRD §7.4), `restoreFrom` (Supporter only; consumables never restore).
- `src/monetization/provider.js` — the seam: `available()/purchase()/restore()`, currently always returns `provider-mock.js`.
- `main.js` — full shop UI ("Get Coins" + Supporter sections, `iapBuy` flow with pending-state buttons, celebrate toast), Restore Purchases button in Account, all gated by `iapEnabled()` = the dev flag (`main.js:120`).
- i18n complete EN+TH (`iap.*`, `shop.getCoins`); unit tests for all three pure modules.
- Supabase schema (`docs/supabase/schema.sql`) already has `wallet` (anti-cheat `wallet_guard`), `entitlements`, and append-only `ledger` — with the header rule "purchased coins + entitlements are SERVER-authoritative: written only by service_role."

**The go-live slice is therefore narrow:** a real billing provider behind the existing seam, server-side grants, availability-based (not dev-flag) UI gating, and store-side chores.

## 2. Approaches considered

- **A (recommended): RevenueCat via `@revenuecat/purchases-capacitor`** — exactly what PRD §7.2 specifies: one SDK over Play Billing (+ StoreKit later), server receipt validation, entitlement state, Restore, and a webhook we point at a Supabase Edge Function for server-side coin grants. Free tier covers us far past launch.
- **B: direct Play Billing plugin, no RevenueCat** — one less vendor, but we'd own receipt validation, cross-platform re-work for iOS, and webhook infra ourselves. Contradicts the PRD; rejected.
- **C: web payments (Stripe) for the PWA** — out of scope: store policy risk inside the wrapped app, and the PWA audience keeps the earn-only economy. IAP is native-only; the web build simply never shows "Get Coins."

## 3. The one real design problem: server grants vs the max-fold wallet

Purchased coins are granted server-side (webhook adds to the `wallet` row + `ledger`). But client sync folds wallets with **max-never-sum** (`mergeWallet`). Failure case: local wallet 5,000 (not yet pushed; cloud has 4,000) → user buys 1,000 → webhook sets cloud to 5,000 → client reconciles: `max(5000, 5000) = 5000` — **the purchased pack evaporates**.

**Design: a client ledger cursor.** Purchased coins ride the `ledger` table, not the max fold:

- Client keeps `lastLedgerAt` in the `nbhsk.sync` meta.
- `reconcile()` additionally fetches `ledger` rows for this user with `created_at > lastLedgerAt` (event_id-tagged, i.e. webhook-granted purchase rows only), sums their `delta` into `unseenPurchased`, and folds the wallet as: **subtract `unseenPurchased` from the cloud contribution before the max fold, then add it back once after** — `mergeWallet(local, cloud − unseenPurchased) + unseenPurchased`. Adding it naively *after* a plain max (this doc's earlier wording) double-counts for a client that already pushed its earned coins into the cloud wallet the webhook then incremented; subtracting first neutralizes the cloud side's purchase component so the max only compares the two sides' shared, already-synced history, and the floor-at-0 clamp in `mergeWallet` absorbs a spent-down cloud wallet going negative after the subtraction. The cursor advances to the max fetched `created_at` **before** the merged keys are written to the store (crash lands on the self-healing side, not an unhealable double-credit) — regardless of whether the push that follows succeeds.
- **Fresh-cursor exception (adopt, don't credit):** when `lastLedgerAt` is `""` — a brand-new device or a post-wipe reinstall with no reconcile history of its own — the subtract-then-add fold is skipped: `unseenPurchased` is forced to `0` and the wallet just adopts `max(local, cloud)` wholesale. The ledger is still fetched and the cursor still advances (so a stale-but-nonzero cursor exists going forward), but nothing is credited on top. Rationale: the cloud wallet already contains every settled purchase for a device with no prior state, so subtract-then-add here would let a *spent-down* cloud wallet float back up by the unseen purchase sum — e.g. buy 1,000 → spend to 300 → push → wipe → restore would give `max(0, 300−1000→clamp 0)+1000 = 1000`, minting 700 coins that were already spent, repeatably on every further wipe, and in violation of PRD §7.4 (consumables never restore). Accepted cost: a fresh device cannot heal the webhook's lost-increment crash window (that heal is the webhook's own atomic-grant responsibility, not reconcile's).
- The webhook writes the grant to `ledger` + increments `wallet.coins`; the incremented cloud wallet keeps single-device users correct even without the cursor, while the cursor keeps multi-device/max-fold users correct.
- `applyPurchase`'s local self-grant becomes **mock-provider-only** (dev flag). With a real provider, the client never self-grants: `iapBuy` → provider purchase OK → show `iap.pending` → `reconcile("purchase")` poll (3 tries, ~2s apart) until the new ledger row lands → success toast with the credited amount. Timeout → "purchase is processing — coins arrive shortly" toast (idempotent webhook guarantees eventual delivery; next sync picks it up).

## 4. Phasing

### Phase 0 — Jordan's prerequisite chores (everything below is blocked on these)
1. **Play Console account ($25)** + app created. *Note: new personal accounts must run closed testing with 12 testers opted in for 14 continuous days before production (PRD §8.1) — start this clock early.*
2. **RevenueCat account**, Android app configured, public SDK key + webhook auth secret to hand off (same pattern as the Supabase token file).
3. **Register the 5 products** in Play Console (ids: `supporter`, `coins_s/m/l/xl`); hand-set TH (+ ID/VN/PH) prices per PRD §7.3; link Play ↔ RevenueCat.
4. Decisions in §6 answered.

### Phase 1 — unblocked now (no SDK, no store account needed)
- **T1. Availability gating:** `iapEnabled()` becomes `provider.available() || devFlag`. Mock provider's `available()` returns the dev flag; the future RC provider returns true only on native with the SDK initialized. Web/PWA: sections stay hidden. (Pure change + tests; UI untouched.)
- **T2. Webhook Edge Function (`supabase/functions/rc-webhook`):** verifies the RC auth header, maps event → `{app_user_id, product_id, event_id}`, idempotent insert into `ledger` (unique on `event_id`) + `wallet.coins += pack.coins` + `entitlements` upsert for Supporter — service_role, per the schema's authority rule. RevenueCat's webhook payload is publicly documented and stable; testable today with curl fixtures against the live project. Coin amounts resolved server-side from a mirror of the catalog (single source: generate from `products.js` at build time, or duplicate with a unit test pinning them equal).
- **T3. Ledger-cursor reconcile** (§3): pure fold + `sync.js` fetch, fully unit-testable against fixtures. Touches the same file as bug-fix Task 2 — sequence this round **after** the bug-hunt round merges.
- **T4. Client purchase UX rewire:** `iapBuy` splits mock path (self-grant, unchanged) vs real path (pending → reconcile-poll → toast). Testable now by faking a provider whose `purchase()` resolves while a fake backend inserts a ledger row.

### Phase 2 — gated on Phase 0 (SDK in hand)

**T5 pre-un-dark gates (from Phase-1 reviews — MUST clear before real purchases go live; all are dormant/unreachable while the provider is mock-only):**
- **Ledger event_id migration applied to live Supabase** (`docs/supabase/migrations/2026-07-12-iap-golive.sql`). Downgraded from a fleet-outage gate to a feature-enablement prereq once the Phase-1 client degrades gracefully on a missing column (sync.js), but the ledger cursor can't credit anything until the column exists.
- **`grant_purchase` service_role EXECUTE smoke test:** after applying the migration, call `grant_purchase` once with the service key and confirm it does NOT return `permission denied` (the `revoke ... from public/anon/authenticated` must leave service_role's grant intact, else every coin grant silently 500s forever).
- **`pollForCredit` credit-signal scoping:** the poll currently detects a credit by "local wallet increased at all," which (a) can mis-toast a concurrent gameplay earning as the purchase delta and (b) on a first purchase where `local ≥ cloud+pack` the fresh-cursor adopt eats the pack (poll sees no increase → "processing" toast, cursor advances, credit lost). Fix by threading the purchase's own ledger-row delta out of `reconcile` so the poll credits the specific row; or force a non-fresh-cursor sync before enabling purchase.
- **Ledger-read reliability before un-dark:** verify the deployed RLS actually grants the client `SELECT` on its own `ledger` rows. A non-missing-column ledger *read* failure (e.g. RLS-denied) while a purchase increment is already in the cloud wallet can double-credit that pack via the graceful-degradation path (cycle-1 adopts the cloud purchase, cursor frozen, cycle-2 re-credits it) — real arithmetic, but unreachable while the provider is mock-only (no ledger rows exist). No clean client-side fix (a degraded read can't tell an earned-coin gap from a purchase gap); the mitigation is operational — confirm the ledger read path is healthy before un-darking.
- **Defensive `try/finally` around `iapBuy`'s real-path awaits:** a real RC SDK that throws (vs. the pure-JS seam contract of never-reject) would leave `iapPending` stuck and lock all IAP buttons for the session; add `finally { iapPending = null; }` when the live provider lands.

- **T5. `provider-revenuecat.js`** behind the seam: `available()` (native + configured), `purchase(productId)` mapping RC results to `{ok, orderId}` / `{ok:false, reason:"cancelled"|"failed"|"unavailable"}` (never throws — seam contract), `restore()` → owned non-consumable ids. Store-localized price strings from RC offerings **replace** `displayPrice`'s mock prices (products.js contract).
- **T6. `npm run cap:sync`**, sandbox E2E on the closed track (license testers): buy each pack once, kill-app-mid-purchase replay (PRD §7.4 idempotency), Restore on a wiped device, price display shows ฿ exactly per catalog.
- **T7. Un-dark + release:** availability gate goes live for Android builds, SHELL bump, release ritual. Web remains earn-only.

### Acceptance (PRD §7.4, unchanged)
Coin packs credit exactly once, server-side, even if the app dies mid-purchase; Supporter survives reinstall via Restore + cloud entitlement; TH shows 79/29/99/169/329฿.

## 5. Test strategy

Phase 1 is all pure/unit-testable: gating fold, webhook handler (Deno test or fixture-driven), ledger-cursor fold (extend `test/merge.test.js`/`test/sync.test.js`), purchase-UX state machine (extract the poll loop into a pure helper — house pattern: logic out of main.js). Phase 2's provider gets a contract test faking the RC plugin module; the real-money path is the closed-track E2E in T6.

## 6. Decisions Jordan owns

1. **Ship Supporter in the same slice, or coin packs first?** Supporter's headline is "remove ads" — but ads aren't live yet (AdMob approval still pending). Recommendation: **coin packs only** in the first live cut; Supporter un-darks when ads land, so we never sell an ad-removal that removes nothing. (Catalog/UI already handle both; it's one filter.)
2. **Purchases require sign-in?** Server-side grants key on `app_user_id`. Anonymous Supabase users work (RC app_user_id = Supabase uid), but a reinstall without sign-in orphans purchased coins. Recommendation: allow guest purchase (RC restore still covers Supporter), and show a one-line "sign in to protect your coins across devices" nudge on the Get Coins shelf.
3. **Phase 0 timing** — when to buy the Play Console account and start the 14-day closed-testing clock.
4. Go/no-go on the §3 ledger-cursor design (it amends the cloud-save PRD §6.3 merge rules; one-paragraph PRD amendment at release, same as the per-key-folds precedent).

## 7. Suggested execution order

1. Bug-hunt fix round (separate plan, same date) — includes sync.js changes T3 depends on.
2. Phase 1 (T1–T4) as one PR round with per-task review gates — can start on Jordan's design approval, no money spent.
3. Phase 0 chores in parallel (Jordan).
4. Phase 2 (T5–T7) once keys/products exist.
