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

Two functions, two opposite JWT settings — get this backwards in either
direction and it is a production incident. Stripe never sends a Supabase JWT,
so `stripe-webhook` must disable gateway JWT verification or every delivery
401s before the function runs: the purchase succeeds at Stripe, money leaves
the buyer's account, and no entitlement is ever granted — silently.
`stripe-checkout` is the opposite — it authenticates the caller itself (the
Supabase session `Authorization` header), so it deploys normally, with JWT
verification ON.

### stripe-webhook

Deploy with **JWT verification disabled** — Stripe sends no Supabase JWT and
the gateway would 401 before the function runs:

    supabase functions deploy stripe-webhook --no-verify-jwt

Secret: `STRIPE_WEBHOOK_SECRET` (the `whsec_…` signing secret from the Stripe
webhook endpoint). Point the Stripe endpoint at
`https://<project>.supabase.co/functions/v1/stripe-webhook` and subscribe to
exactly `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
and `checkout.session.async_payment_failed`.

### stripe-checkout

Deploy normally (JWT verification ON — it authenticates the caller):

    supabase functions deploy stripe-checkout

Secret: `STRIPE_SECRET_KEY` (`sk_live_…`). Never commit it.

Same requirement as `rc-webhook` above: after deploying both, verify the
setting in the Dashboard → **Edge Functions → function → Details** — the CLI
does not prompt or warn if you deploy `stripe-webhook` without
`--no-verify-jwt`, it just silently ships a function that will 401 every real
Stripe delivery.
