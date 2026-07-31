# Web billing via Stripe — PromptPay-first for Thailand

**Date:** 2026-07-31
**Owner:** Jordan
**Status:** DRAFT — revised after Fable review, awaiting owner approval
**Supersedes:** go-live plan step 6 (RevenueCat Web Billing + PromptPay), which is
**not achievable** — see "Why this exists".

---

## Why this exists

The locked go-live plan assumed the 79฿ Supporter would be sold on web through
RevenueCat Web Billing with PromptPay as the Thai payment method. Verified against
vendor docs on 2026-07-31, **that is impossible**:

- **RC Web Billing supports only credit card, Apple Pay, and Google Pay**, and
  RevenueCat — not the merchant — controls which payment methods are shown.
- **RC + own-Stripe import** (external purchases) explicitly excludes *"asynchronous
  payment methods that settle off-session — bank debits, bank transfers, and cash
  vouchers."*

Jordan's decision (2026-07-31): **keep the PromptPay QR as the primary method for Thai
buyers.** Web billing therefore moves to Stripe directly; RevenueCat stays for Android
only. This splits along the native/web boundary `provider.js` already draws — **one
billing path per platform, not two competing on web.**

Independent Stripe constraints (`docs.stripe.com/payments/promptpay`): the account must
be **Thailand-based**, the customer must be **in Thailand**, currency is **THB only**.
PromptPay cannot serve international buyers — cards stay enabled for them. Statement
descriptor is fixed at `STRIPE PAYMENTS (THAILAND) LTD`.

## Scope

**In:** the single `supporter` product — 79฿, one-time, on web. Note it grants **both**
`coins: 2000` **and** `entitlement: "supporter"` (`src/monetization/products.js:11`);
delivering only one of the two is the failure this spec exists to prevent.

**Out:** the four coin packs on web (locked plan sequences those as step 8, after the
placement sprint); subscriptions; any change to the Android/RevenueCat path.

## Decisions taken

1. **Approach A — hosted Stripe Checkout**, not embedded Elements and not a Payment
   Link. Embedded adds a Stripe.js bundle and client code for a once-per-user payment.
   A Payment Link takes the user id from the *client*, which cannot enforce decision 2.
2. **Buying requires a signed-in, non-anonymous account.** Anonymous Supabase users have
   UUIDs and could technically pay, but a cleared browser loses the purchase with no
   restore path and no support handle. Enforced on **both** sides — see "Anonymous
   users" below; enforcing server-side only produces a generic failure toast.
3. **The idempotency key is the Checkout Session id, used for both `p_event_id` and
   `p_order_id`.** *(Rationale corrected after review — the original claim that an
   event-id key would double-grant was **false**.)* The migration creates **two**
   partial unique indexes, `ledger_event_id_uidx` **and** `ledger_order_id_uidx`
   (`docs/supabase/migrations/2026-07-12-iap-golive.sql:17-21`), and `grant_purchase`
   catches *any* `unique_violation` as `duplicate`. So an event-id key would also be
   safe — the second qualifying event would collide on `order_id`. The session id is
   chosen because it is **one semantic id for one purchase**, and because
   `p_order_id` must equal the session id anyway for the client's reconcile to match.
   Nothing assumes the two columns are distinct; they are independent nullable text
   columns with independent partial indexes.
4. **Grant only when `payment_status === "paid"`.** PromptPay is a delayed-notification
   method: `checkout.session.completed` can arrive with `payment_status: "unpaid"`.

## Architecture

### New — two edge functions

Both follow the house pure-core/thin-IO split (pure `core.js` runnable under vitest and
Deno; `index.ts` does all I/O).

- **`supabase/functions/stripe-checkout/`** — `core.js` builds Checkout Session params.
  `index.ts` verifies the Supabase JWT, derives the user id **from the token**, rejects
  anonymous tokens, refuses if the entitlement is already held, expires any prior
  session, calls Stripe, returns `{url, sessionId}`.
  **IO shell mirrors `supabase/functions/delete-account/index.ts:6-25`, NOT
  `rc-webhook`** — it is browser-called, so it needs explicit `corsHeaders` and an
  `OPTIONS` handler. (`delete-account`'s own comment warns that `rc-webhook` is not the
  model for browser-called functions.)
- **`supabase/functions/stripe-webhook/`** — `core.js` verifies the Stripe signature and
  decides the grant. `index.ts` calls the **same `grant_purchase` RPC** as `rc-webhook`.
  **Must be deployed with JWT verification DISABLED** — Stripe sends no Supabase JWT and
  the platform gateway would 401 before the function runs
  (`docs/supabase/README.md:54` documents this for `rc-webhook`).

### New — client

- **`src/monetization/provider-stripe-web.js`** — implements the provider interface in
  `provider.js`, including **`restore()` and `supportsRestore() → true`** (see
  "Entitlement delivery").
- **`src/monetization/stripe-config.js`** — publishable key (safe to commit) and the
  function URL, mirroring `revenuecat-config.js`. A blank key is a pure no-op, so this
  ships dark exactly as the RevenueCat path does.
- **`src/ui/checkout-return.js`** — owns the return leg: read `?session_id=`,
  `history.replaceState` it away, drive the poll, then deliver the entitlement, then
  fire `purchase_success`. Per AGENTS.md this is the new feature's own wiring module;
  `main.js` only mounts it. It is *not* fully pure — reading `location.search` is
  inherently the wiring half — so the pure pending-record logic (expiry, clear-on-credit)
  lives in a separate testable module it calls.

### Modified

- **`provider.js`** — select the Stripe provider when off-native, not `file://`, and
  configured. **State the precedence explicitly**: Stripe wins over RC-web on web.
- **`main.js`** — mount `checkout-return.js`; retire or re-point two landmines:
  - **`ensureWebBilling` (`main.js:229-249`)** swaps the provider to RC-web **on
    shop-open** whenever `REVENUECAT_WEB_PUBLIC_KEY` is non-blank, silently replacing
    the boot-selected Stripe provider if both keys ever coexist.
  - **`webSupporterConfigured` (`main.js:487-489`)** keys the supporter-moment
    placement to the RC web key.

  Both currently work only because the RC web key ships blank. Leaving them is a
  landmine for the follow-up dead-code removal.
- **`nbhsk.checkout`** goes through `src/storage.js`'s `createStore` per AGENTS.md, and
  is **local-only — deliberately not in `SYNC_KEYS`**.

### Reused unchanged

`grant_purchase`, `purchase-poll.js`, `products.js`, `sync.js`'s ledger-cursor
reconcile.

## Data flow

1. User taps Buy → `provider-stripe-web.purchase("supporter")`
2. Client calls `stripe-checkout` with its JWT → `{url, sessionId}`
3. Client writes `nbhsk.checkout = {sessionId, productId, startedAt}`, then redirects
4. Stripe renders the PromptPay QR *and* the card form
5. Stripe fires `checkout.session.completed` (possibly `unpaid`), then
   `async_payment_succeeded` or `async_payment_failed`
6. `stripe-webhook` grants **only** on `payment_status === "paid"`, with
   `p_event_id = p_order_id = session.id`
7. Stripe returns the user to `https://luckycathsk.com/?session_id=…`
8. `checkout-return.js` runs `pollForCredit({ orderId: sessionId })` → **then delivers
   the entitlement** → then fires `purchase_success`

### Entitlement delivery — the half the first draft missed

`pollForCredit` delivers the **coins** and nothing else. Supporter *status* rides `ent`,
which is local-only and **not** in `SYNC_KEYS` (`main.js:186-188`, `merge.js:13-18`);
reconcile never touches it. In the native flow `ent` is set by calling `prov.restore()`
after a credited entitlement purchase (`main.js:3910-3917`) — **and that code is
unreachable here**, because `purchase()` returns `{ok:false, reason:"pending"}` and
`iapBuy` exits at `main.js:3863-3871` before the page navigates away.

Without this section, the buyer pays 79฿, receives 2,000 coins, and **never gets ad
removal, the badge, or the supporter card state on any device.**

The fix, and it is cheap: `entitlements` is owner-readable under RLS
(`docs/supabase/schema.sql:149-152`), so:

- `provider-stripe-web.restore()` = a Supabase select over `entitlements` mapping rows
  to `ownedProductIds`; `supportsRestore()` returns **true**, which also lights the
  account-screen Restore button (`main.js:862-863`) and gives a **new device** a path to
  its entitlement.
- `checkout-return.js`, after the poll credits, calls `restore()` → `restoreFrom` →
  `store.set("ent", …)` → `renderAccount()`, mirroring `main.js:3910-3917`.

### The durable pending record

`pollForCredit` gives up after 3 tries × 2s — fine for cards, **not** for PromptPay,
which can confirm after the user is back, or after they close the tab. `nbhsk.checkout`
is therefore **durable**: re-checked on boot and on shop open, cleared when credited or
after 24h (matching Stripe's default session expiry).

This also covers the redirect's worst failure: on an **installed iOS PWA**, navigating
out to Stripe can land the user in Safari and never return them to the PWA shell. They
may never see the success URL; the pending record means the grant still lands next time
they open the app. **This is what makes approach A safe despite the redirect.**

The existing machinery is more robust here than first credited: `sync.js`'s
`expectedOrderId` → `fetchLedgerOrder` path (`sync.js:188-196`) already handles the
webhook-landed-first-and-cursor-already-moved case, and `"purchase"` bypasses the sync
cooldown (`sync.js:24`), so boot-time re-checks actually run.

## Anonymous users

The client mints **anonymous** sessions on demand — `ensureIapUserId` calls `ensureGuest`
(`main.js:209-215`) — and `iapOn` shows the supporter card to everyone once a real
provider is available (`main.js:4244`, `gating.js`). Server-side refusal alone would
surface as a generic `iap.failed` toast.

- **Client:** `purchase()` detects the anonymous state and returns a distinct reason
  (`"needs-account"`), and `iapBuy` routes to the account screen with an explanatory
  toast rather than the generic failure toast. **SHIPPED.**
- **DEFERRED to a follow-up task, not built here:** rendering a *sign in to buy* STATE on
  the shop card itself, before the tap. The tap-time routing above covers the flow; the
  card state is polish. When it is built, use the **synchronous**
  `accountState(accountUI.session)` already used elsewhere in `main.js` — NOT
  `provider.isAnonymous()`, which is async. An earlier draft of this spec deferred the
  card state on the grounds that it would need an async check at render time; that
  reasoning was wrong and should not be recycled as a reason to keep deferring it.
- **Server:** a Supabase anonymous JWT is a **valid** JWT. `index.ts` must check the
  `is_anonymous` claim / email presence explicitly — verifying the signature is not
  enough.

## Failure modes

| Failure | Behaviour |
|---|---|
| Abandons at Stripe | Pending record expires at 24h, silently. Never charged |
| PromptPay QR expires | `async_payment_failed` → ack, no grant. Not charged |
| Webhook lands **before** user returns | Common. `fetchLedgerOrder` path handles it |
| Webhook lands after the poll window | Pending record catches it on next boot |
| Pays, then clears storage | **Coins** re-fold via reconcile; the **entitlement** returns via `restore()` on sign-in — not via reconcile, which never touches `ent` |
| Duplicate delivery / both events qualify | `duplicate` via either unique index |
| Deleted account | `grant_purchase` → `unknown-user` → ack 200 |
| Bad signature / unset secrets | 401 / 503, fail-closed, mirroring `rc-webhook` |
| `file://` or native | Provider not selected at all |
| Offline at checkout creation | `{ok:false, reason:"failed"}`; nothing persisted |

### Guards added deliberately

- **`stripe-checkout` refuses when the entitlement is already held**, and **expires any
  session recorded in `nbhsk.checkout`** before creating a new one. The refusal alone
  checks only at creation time: two sessions created before either is paid (two tabs, or
  abandon-then-retry inside the QR window) have **different** session ids, so both would
  grant and **both would charge** — the ledger dedupe cannot help, and only the
  entitlement upsert's `on conflict do nothing` swallows the second.
- **THB is a two-decimal currency in Stripe: 79฿ is `7900`, not `79`.** Explicitly
  tested; a 100× pricing error either way is otherwise easy to ship.
- **Pin `Stripe-Version`** on every REST call, or the account-default version drifts.
- **`Stripe-Signature` can carry multiple `v1` entries** during a secret roll. An
  `Object.fromEntries`-style parse — as `rc-webhook/core.js:46` does for RC's
  single-signature header — silently keeps only the last. Mirror the *scheme*, not the
  parser.

### Out of scope, manual runbook

**Refunds.** PromptPay refunds require the customer's bank account number, which Stripe
requests by email; revoking access is a manual `entitlements` delete. No
`charge.refunded` handler for a 79฿ one-time until volume justifies it.

## Price display

The Stripe provider has no client-side price API, so `price()` returns `null` and the
UI falls back to catalog `displayPrice` (`main.js:3797`) — which shows **$2.99** for
non-Thai locales while checkout charges **79฿** (PromptPay, or card in THB). Accepted
for launch; revisit if international conversion matters.

## Secrets

`STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are Supabase function secrets, **never
git**. The publishable key may be committed, exactly as the RevenueCat public SDK key
may be.

## Testing

House pattern: pure modules under vitest; `main.js` wiring untested by design.

- **`test/stripe-webhook.test.js`** — signature valid / tampered / stale / missing
  secret / **multiple `v1` entries**; `completed`+paid → grant, `completed`+unpaid →
  ignore, `async_payment_succeeded` → grant, `async_payment_failed` → ignore, unknown
  product → ignore, missing session id → ignore.
- **`test/stripe-checkout.test.js`** — session params (THB, **`7900`**, `promptpay` +
  `card`), user id from the token not the body, **anonymous token refused**, refusal
  when the entitlement is held, prior session expired.
- **`test/provider-stripe-web.test.js`** — `supports`, `available`, **`restore`**,
  `supportsRestore`, `purchase` writes the pending record and returns `pending`,
  `purchase` returns `needs-account` when anonymous, guards on `file://` and native,
  never throws.
- **`test/checkout-pending.test.js`** — 24h expiry, cleared on credit, survives reload,
  re-checked on boot.

**No schema migration.** No new tables, and `nbhsk.checkout` is a new local-only key —
absent means "no pending purchase", so there is no old shape to migrate. (AGENTS.md
requires migrations for *changed* stored shapes.)

**Release gate:** `sw.js` SHELL bump, since this ships user-facing UI.

**Analytics:** `purchase_start` fires in `iapBuy` (`main.js:3821`) but `purchase_success`
(`main.js:3895`) sits in the branch the redirect never reaches — `checkout-return.js`
must own it, or the funnel silently breaks across the redirect.

**Live gate (owner, once Stripe is verified):** one real PromptPay checkout, one card
checkout, one abandon, and a duplicate webhook replayed via the Stripe CLI. This replaces
the original step-6 gate.

## Consequence: dead code

With web Stripe-only, `provider-revenuecat-web.js`, `revenuecat-web-sdk.js`, and the
`webbilling-entry.js` separate bundle (which exists to keep the ~849 KB RC Web SDK out of
the precached `dist/app.js`) become unreachable. Removal is a **follow-up**, not part of
this build — but it means this path **simplifies** the codebase rather than adding a
second billing stack.

---

## Review record

Reviewed by Fable (2026-07-31) against the codebase. Findings folded in: the missing
entitlement-delivery path (HIGH — would have shipped a buyer who pays and gets coins but
never Supporter status), the absent client-side story for the sign-in requirement, the
**factually wrong** idempotency rationale (two unique indexes exist, so either key is
safe), JWT-verification-disabled deployment, CORS via the `delete-account` precedent,
`Stripe-Version` pinning, multi-`v1` signature parsing, the unnamed return module, the
`ensureWebBilling`/`webSupporterConfigured` landmines, concurrent-session double-charge,
the SHELL bump, the analytics funnel break, and the `price()` display mismatch.
