# Supabase backend

Cloud backend for Lucky Cat HSK, per the Monetization & Production PRD §6.
The game has a dark, locally tested cloud-sync and RevenueCat server-grant path.
Live project migrations, Edge Function deployment, and production smoke tests
remain operational owner actions.

## Files

- **`schema.sql`** — tables (`profiles`, `progress`, `wallet`, `entitlements`,
  `ledger`), the `updated_at` trigger, and Row-Level Security policies. Each
  column is commented with the `nbhsk.*` localStorage key it mirrors.
- **`migrations/2026-07-12-iap-golive.sql`** — idempotent purchase ledger,
  atomic `grant_purchase`, and service-role privileges required before IAP.
- **`../../supabase/functions/rc-webhook/`** — bearer + HMAC authenticated
  RevenueCat webhook that grants through `grant_purchase`.
- **`../../supabase/functions/stripe-webhook/`** — signature-verified Stripe
  webhook that grants through `grant_purchase`. See §Stripe deployment
  prerequisites below.
- **`../../supabase/functions/stripe-checkout/`** — authenticated Checkout
  Session creator called by the browser client. See §Stripe deployment
  prerequisites below.

## Apply to a project

1. Create a Supabase project (note its region — used in the privacy policy).
2. Run the schema:
   - **SQL editor:** paste `schema.sql` and run, **or**
   - **CLI:** `supabase db push` (or `psql "$DATABASE_URL" -f schema.sql`).
3. Enable the auth providers the PRD calls for: anonymous (guest), Google,
   Apple, email magic-link (§6.1).

The script is **idempotent** — tables/indexes are `if not exists`, the trigger
uses `create or replace`, and each policy is dropped-if-exists before create —
so re-running it is safe as the schema evolves. (Requires Postgres 14+, which
Supabase satisfies.)

## Design guardrails (do not violate)

- **Offline-first:** the app must stay fully playable as a guest with no
  network. These tables are a *mirror*, reconciled on foreground / sign-in /
  post-purchase — never the source of truth during play.
- **Server-authoritative money:** purchased coins and entitlements are written
  **only** by the RevenueCat webhook (service_role) — never the client. RLS
  gives users read-only access to `entitlements`/`ledger`.
- **Anti-cheat cap is server-side:** the daily earned-coin clamp
  (`wallet.earned_today`) is enforced by an Edge Function / trigger, not the
  client. A client-side clamp would stop no one (localStorage is editable) and
  is intentionally omitted.

## Not synced (local-only)

Device preferences and transient UI state stay on-device and are absent from the
schema by design: `nbhsk.settings`, `nbhsk.sfx`, `nbhsk.scope`,
`nbhsk.scopeView`, `nbhsk.formatIntros`, `nbhsk.introDone`.

## RevenueCat deployment prerequisites

1. Apply `migrations/2026-07-12-iap-golive.sql` to the live project.
2. Deploy `supabase/functions/rc-webhook` with JWT verification disabled for
   that endpoint; the function performs its own RevenueCat authentication.
3. Set `RC_WEBHOOK_SECRET` and `RC_WEBHOOK_SIGNING_SECRET` as Edge Function
   secrets. Never place either value in source control.
4. Configure the matching bearer authorization and HMAC signing secret in the
   RevenueCat webhook settings.
5. Run the grant replay, ledger RLS, and closed-track purchase smokes in
   `docs/planning/2026-07-12-coin-purchase-golive.md` before adding the public
   Android SDK key to the client config.

## Stripe deployment prerequisites

> **✅ BOTH FUNCTIONS ARE DEPLOYED AND SMOKE-TESTED (2026-07-31).** Live on
> `eqsodiufgjecoqgxdisn`, both `ACTIVE` at v1, and the JWT asymmetry is
> confirmed **from the API, not from the deploy command**:
> `stripe-checkout` `verify_jwt=true`, `stripe-webhook` `verify_jwt=false`.
> They are **inert**: no secrets are set, so both fail closed, and no client
> can reach them while `STRIPE_CHECKOUT_URL` is blank.
>
> Four things that were previously unverified are now settled:
>
> 1. **The parent-directory import bundles fine.** Both functions import
>    `../../../src/monetization/products.js`, reaching outside `supabase/` to
>    share ONE price catalog with the client (deliberate — a vendored copy
>    could drift, and a price that disagrees between the app and the Checkout
>    Session is a money bug). No function using that pattern had ever been
>    deployed: the only live function was `delete-account`, which imports
>    nothing outside its own directory, and `rc-webhook` — the assumed
>    precedent — was never deployed either. The CLI bundled it without a
>    `config.toml` or an import map; script sizes 64 kB / 63 kB.
> 2. **`--no-verify-jwt` really took.** A JWT-less `POST` to `stripe-webhook`
>    returns **503 `service unavailable`** — the *function's own* fail-closed
>    response for unset secrets (`index.ts:20`), not a gateway 401. So Stripe's
>    unauthenticated deliveries reach the function body. This is the failure
>    that would otherwise 401 every delivery *after* the buyer had paid.
>    **⚠ READ THE SCOPE OF THIS EXACTLY.** The 503 comes from the
>    missing-secrets guard at `index.ts:19-21`, which sits **before**
>    `verifyStripeSignature`. It proves the *gateway* forwards a JWT-less POST.
>    It proves **nothing** about signature verification, because that code never
>    ran. Once `STRIPE_WEBHOOK_SECRET` is set the 503 branch disappears and the
>    same probe should return **401 `unauthorized`** — the function rejecting an
>    unsigned body. **Re-run the probe after setting secrets**: 503 means a
>    secret did not take; a JSON `{"code":…,"message":…}` 401 (rather than the
>    function's plain-text `unauthorized`) means `verify_jwt` got flipped back
>    on by a re-deploy that dropped the flag.
> 3. **The CORS preflight survives the JWT-ON gateway.** `OPTIONS` on
>    `stripe-checkout` returns **200** with `access-control-allow-origin: *`
>    and the expected allow-headers/methods. The runbook flagged this as
>    expected-but-never-exercised; it is now exercised.
> 4. **A rejected JWT still carries CORS headers**, so an expired session
>    surfaces in the browser as a readable 401 rather than an opaque CORS
>    error. Note the shape though: the *gateway* answers
>    `{"code":"UNAUTHORIZED_NO_AUTH_HEADER","message":…}`, not the function's
>    `{"error":"unauthorized"}` — so `provider-stripe-web.js` finds no
>    recognised `payload.error` and falls through to `reason:"failed"`, i.e.
>    the generic failure toast rather than a route to sign-in. Acceptable (a
>    stale token IS a failure) but worth knowing when reading a support report.
>
> **What is still NOT proven:** anything involving a real Stripe key or real
> money — session creation, signature verification against a real `whsec_`,
> the `unpaid` ignore branch, the replay dedupe, and `grant_purchase`'s
> `granted`/`duplicate` branches. See `docs/OWNER-ACTIONS.md` §B.4.4.5 for the
> test-mode rehearsal that can prove most of it before verification completes.

Two functions, two opposite JWT settings — get this backwards in either
direction and it is a production incident. Stripe never sends a Supabase JWT,
so `stripe-webhook` must disable gateway JWT verification or every delivery
401s before the function runs: the purchase succeeds at Stripe, money leaves
the buyer's account, and no entitlement is ever granted — silently.
`stripe-checkout` is the opposite — it authenticates the caller itself (the
Supabase session `Authorization` header), so it deploys normally, with JWT
verification ON.

**Prerequisite — `grant_purchase` must already exist.** Both functions grant
by calling `supabase.rpc("grant_purchase", …)`
(`supabase/functions/stripe-webhook/index.ts:43`); that RPC is created by
`docs/supabase/migrations/2026-07-12-iap-golive.sql`, which does **not**
apply itself — it ships as a plain SQL file, same as `schema.sql`. If it has
not been run against the target project when the first purchase lands: the
RPC call errors, the function returns HTTP 500, Stripe retries a few times
and then gives up — the buyer's money is gone, no entitlement or coins are
ever granted, and the only trace is Stripe's webhook delivery log (nothing
in Supabase, because the RPC never got that far). This is the same
silent-failure shape as the JWT misconfiguration above, reached by a
different route, and it is just as easy to ship without noticing. Apply the
migration (SQL editor or `supabase db push`) **before** deploying either
function, and confirm it took — `select 1 from pg_proc where proname =
'grant_purchase';` in the SQL editor (or Dashboard → Database → Functions →
look for `grant_purchase`) — do not just assume a past `db push` covered it.

### stripe-webhook

Deploy with **JWT verification disabled** — Stripe sends no Supabase JWT and
the gateway would 401 before the function runs:

    supabase functions deploy stripe-webhook --no-verify-jwt

Secret: `STRIPE_WEBHOOK_SECRET` (the `whsec_…` signing secret from the Stripe
webhook endpoint). Never commit it. In the Stripe Dashboard: **Developers →
Webhooks → Add endpoint**, URL
`https://<project>.supabase.co/functions/v1/stripe-webhook`, and subscribe to
exactly `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
and `checkout.session.async_payment_failed`. The third has no dedicated grant
handler — `processStripeEvent` falls through to `"ignored-event-type"` and a
plain 200 ack (`core.js:12-15`, matched in `index.ts`) — but it is subscribed
deliberately, so a failed PromptPay payment shows up in the Stripe delivery
log instead of vanishing with no record on either side. Do not "clean up" this
subscription; it is load-bearing for observability, not dead weight.

### stripe-checkout

Deploy normally (JWT verification ON — it authenticates the caller):

    supabase functions deploy stripe-checkout

Secret: `STRIPE_SECRET_KEY` (`sk_live_…`). Never commit it.

**The return leg is pinned to one origin.** `SITE_ORIGIN` in
`stripe-checkout/index.ts` is hard-coded to `https://luckycathsk.com`, and
every Checkout Session's `successUrl`/`cancelUrl` is built from it. That is
fine for a buyer who started checkout on `luckycathsk.com` — but the
`github.io` migration bridge and the `workers.dev` host also serve the same
bundle (see `docs/OWNER-ACTIONS.md` §B3), so a buyer who starts a purchase
from either of those is paid on Stripe and then returned to
`https://luckycathsk.com/?session_id=…` — a **different origin**, with its
own separate `localStorage`. That origin has no pending-purchase record for
this checkout, so there is no toast and no immediate entitlement restore;
the buyer may even look signed out there. Nothing is lost server-side — the
grant lands against their `uid`, and the pending record still sits at the
origin they actually bought from — so it self-heals silently on their next
visit **to the origin they started the purchase on**. But the buyer's
*immediate* experience on the canonical domain is silence, and a live-gate
tester who starts a test purchase from the bridge will wrongly conclude the
feature is broken. See the live-gate note in `docs/OWNER-ACTIONS.md` §B item
4 — run the gate from `luckycathsk.com` only.

**Deploy `stripe-webhook` before or together with any catalog change.** The
webhook acks an event with `product_id` not present in its own copy of the
catalog as `{"ignored":"unknown-product"}`, HTTP 200 (`core.js`'s
`processStripeEvent` → `index.ts`'s `!result.ok` branch) — a 200 tells
Stripe delivery succeeded, so it will **not** retry. Today this is
unreachable (both functions import the same `src/monetization/products.js`
catalog), but once web coin packs land (go-live step 8) a stale
`stripe-webhook` deploy running alongside a newer `stripe-checkout` would
turn a purchase of a just-added product into a **permanent, silent** loss —
Stripe took the money, the checkout succeeded, and the ack tells Stripe
never to try again. A 500 here would at least let Stripe's retry window
bridge the redeploy gap; the current 200-on-unknown design does not, so the
deploy order is the only thing that closes it.

Same requirement as `rc-webhook` above: after deploying both, verify the
setting in the Dashboard → **Edge Functions → function → Details** — the CLI
does not prompt or warn if you deploy `stripe-webhook` without
`--no-verify-jwt`, it just silently ships a function that will 401 every real
Stripe delivery.
