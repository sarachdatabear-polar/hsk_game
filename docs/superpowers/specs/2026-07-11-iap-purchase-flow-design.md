# IAP Purchase Flow v1 — Design

**Date:** 2026-07-11
**Status:** Approved (Jordan, 2026-07-11)
**Parent PRD:** `docs/prd/PRD-monetization-and-production.md` §7 (IAP Specification)

## Goal

Build the complete in-app purchase flow — purchasable coin packs + the Supporter
unlock — behind a provider interface, with a **mock provider** so the whole flow is
buildable and testable in the browser today. Real billing (RevenueCat wrapping
Play Billing/StoreKit) slots in later by swapping one file; everything else ships
now, dark, fully unit-tested.

**Explicit v1 scope decisions (Jordan):**
- Mock provider first; no RevenueCat SDK in this slice.
- **Local grant now, server later:** a completed purchase credits the local wallet
  directly. The server-side grant path (Supabase `entitlements`/`ledger`, Edge
  Function webhook) is *designed for* (idempotent order handling) but not built.
- Supporter is in scope alongside coin packs.

## Non-goals (this slice)

- RevenueCat / Play Billing / StoreKit integration (future slice).
- Supabase Edge Function, `entitlements`/`ledger` writes, receipt validation.
- The Supporter thank-you **skin** (blocked on art; ships with the next art batch —
  v1 grants entitlement + coins + a Supporter chip).
- Ads/AdMob (separate work; this slice only *feeds* `isSupporter` to the existing
  `interstitial-policy.js`).
- Subscriptions (v2 per PRD).

## Architecture

Three new files in `src/monetization/` following the `interstitial-policy.js`
house pattern (pure, SDK-independent, no DOM/localStorage/Date.now), plus a
provider seam. `main.js` owns persistence and DOM wiring, as everywhere else.

### `src/monetization/products.js` — catalog (pure data)

| id | type | THB | USD | grants |
|---|---|---|---|---|
| `supporter` | non-consumable | 79 | 2.99 | `supporter` entitlement + 2,000 coins |
| `coins_s` | consumable | 29 | 0.99 | 1,000 coins |
| `coins_m` | consumable | 99 | 2.99 | 3,500 coins |
| `coins_l` | consumable | 169 | 4.99 | 6,500 coins |
| `coins_xl` | consumable | 329 | 9.99 | 15,000 coins |

- Exports `PRODUCTS`, `productById(id)`, `displayPrice(product, locale)`
  (`th` → `79฿`, otherwise `$2.99`).
- `displayPrice` is a **mock-era convenience only**: real stores return localized
  price strings and those must win. Nothing outside this file may hard-code prices.

### `src/monetization/purchases.js` — grant/entitlement logic (pure)

- `defaultEnt()` → `{ supporter: false, orders: [] }`;
  `orders` = `[{ orderId, productId, at }]`, a local receipt log.
- `applyPurchase(wallet, ent, productId, orderId, now)` →
  `{ ok, wallet, ent, reason? }`:
  - unknown product → `{ ok:false, reason:"unknown-product" }`, state unchanged;
  - `orderId` already in `ent.orders` → `{ ok:false, reason:"duplicate" }`, state
    unchanged — **idempotent by orderId**, deliberately mirroring the PRD §7.4
    idempotent-webhook criterion so this logic survives the server migration;
  - `supporter` while already supporter → `{ ok:false, reason:"already-owned" }`;
  - otherwise credits `product.coins`, appends the order, sets `supporter:true`
    for the supporter product.
- `restoreFrom(ent, ownedProductIds)` → new ent with `supporter` re-derived.
  Non-consumables only; coin packs never restore (store rules).
- `isSupporter(ent)` — the exact flag `interstitial-policy.js` §state consumes.

### Provider seam — `src/monetization/provider.js` + `provider-mock.js`

Interface (all async, **never throw/reject** — same contract as `cloud.js`):

```js
{ available(), purchase(productId), restore() }
// purchase → { ok:true, orderId } | { ok:false, reason:"cancelled"|"failed"|"unavailable" }
// restore  → { ok:true, ownedProductIds } | { ok:false, reason }
```

- `getProvider(opts)` returns the mock in v1. The future
  `provider-revenuecat.js` implements the same interface via the `native.js`
  Capacitor-plugin pattern (`plugins().Purchases`, web no-op guards) — the swap is
  the only place real billing enters.
- **Mock behavior:** ~600 ms simulated delay; generates unique orderIds
  (`mock-<counter>-<productId>`); remembers purchased non-consumables so
  `restore()` works. Persistence of the mock's own memory is injected by the
  caller (get/set callbacks from `main.js`'s `store`, key `nbhsk.dev.iapOwned`) —
  the module itself stays storage-free and testable.
- **Forcing failure paths:** `nbhsk.dev.iapFail = "cancelled" | "failed"` makes
  the next `purchase()` resolve that way, so pending/cancel/error UI is
  exercisable by hand.

## Feature flag — ships dark

- `iapEnabled()` in `main.js`: true iff `localStorage["nbhsk.dev.iap"]` is set
  (JSON truthy via `store`). All IAP UI (shop sections, Restore button) renders
  only when enabled.
- Production players see **zero change**. Testing = set the flag in the console
  and reload.
- When RevenueCat lands, the flag's definition becomes "native platform AND
  provider `available()`" — the render sites don't change.

## UI & data flow (`main.js` + `index.html`)

- **Shop screen:** two new sections near the wallet readout
  (`index.html` `#shop-wallet` area): `#shop-coins` — "Get Coins", 4 pack rows
  (name, coin amount, price button) — and `#shop-supporter` — one Supporter card
  with a short benefits list (no ads*, +2,000 coins, Supporter chip; *ads note is
  forward-looking copy) and price button. Rendered in `renderShop()` like the
  existing sections; rows come from `PRODUCTS`, not `shop.js`'s `CATALOG`
  (real-money items must not enter `buy()`'s coin-deduction flow).
- **Buy flow:** tap → button disabled + pending label → `provider.purchase(id)` →
  - `ok`: `applyPurchase(...)` → `store.set("wallet", …)`, `store.set("ent", …)`,
    `pushDirty(store, "purchase")`, `updateWalletChip()`, success toast +
    existing celebration fx; re-render shop.
  - `cancelled`: silent re-enable (user changed their mind; no error).
  - `failed`/`unavailable`: error toast (`iap.failed`), re-enable.
  - `applyPurchase` not-ok (`duplicate`/`already-owned`): no credit; show the
    owned state. Button-disable during pending is the first double-tap guard;
    orderId idempotency is the backstop.
- **Supporter owned:** card flips to a "Thank you ♥" owned state (no buy button);
  a Supporter chip also shows in the Account panel.
- **Restore Purchases:** button in the Account panel (More → Account), using the
  panel's existing async-button + status-line pattern (`accountView` precedent).
  → `provider.restore()` → `restoreFrom(...)` → persist ent → status text with
  the result ("Supporter restored" / "Nothing to restore" / error).
- **Persistence:** new localStorage key **`nbhsk.ent`** (via `store`); wallet
  stays `nbhsk.wallet`. `nbhsk.ent` is deliberately **not** cloud-synced —
  entitlements become server-authoritative in the RevenueCat slice.

## i18n

All new copy as `en`/`th` key pairs in `src/i18n.js`: `shop.getCoins`,
`shop.supporter*` (title, benefits, owned/thank-you), `iap.pending`, `iap.failed`,
`iap.restore*` (button, restored, nothing, failed), `item.coins_s`…`item.coins_xl`.
The i18n plan (2026-07-06, line 738) explicitly deferred paywall/Supporter copy to
this work. Existing `test/i18n-usage.test.js` coverage rules apply — every key in
both locales.

## Known interaction — recorded as a hard prerequisite for the RevenueCat slice

Cloud sync (`pushSyncRows`) pushes the `wallet` row, and the server's
`wallet_guard()` trigger clamps implausible earned-coin jumps
(`docs/supabase/schema.sql`). Mock-purchased coins are local, dev-flagged, and
never hit real users — acceptable now. **But the RevenueCat slice must route
purchased coins through the server ledger (webhook → `wallet`/`ledger`) before
the IAP UI opens to production**, or legitimate purchases would be clamped as
cheating. This is a blocking checklist item for that future slice, not this one.

## Testing

Unit (vitest, house style — pure modules, no mocks needed):
- `test/products.test.js` — unique ids, positive coin amounts, prices exactly
  match PRD §7.1, `displayPrice` th/en.
- `test/purchases.test.js` — grant per product; supporter sets flag + credits
  2,000; **replayed orderId does not double-credit**; unknown product;
  already-owned; `restoreFrom` non-consumables only; `isSupporter`.
- `test/provider-mock.test.js` — result shapes, unique orderIds, restore
  round-trip via injected get/set, forced cancel/fail, never rejects.
- i18n usage tests pick up the new keys automatically.

Manual (browser, flag on): buy each pack → wallet math; reload → persists; buy
Supporter → chip + owned state; Restore after clearing ent; forced cancel/fail
paths. Screenshotable on the VPS Playwright harness for the audit artifact.

Ship checklist: `npm test` (never piped through tail/grep) → `npm run build` →
**bump `SHELL` in `sw.js`** (shop markup changes ship in the shell even though
the feature is dark).

## Future slice (out of scope, interface already fits)

`provider-revenuecat.js` (Capacitor plugin via `native.js` pattern) +
Play Console/App Store products + RevenueCat webhook → Supabase Edge Function
writing `entitlements`/`ledger`/`wallet` + reconcile on foreground/sign-in/
post-purchase + flag flips to "native + available". Restore button and all UI
built here carry over unchanged.
