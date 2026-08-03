# Supabase backend

Cloud backend for Lucky Cat HSK, per the Monetization & Production PRD §6.
The game has a dark, locally tested cloud-sync and RevenueCat server-grant path.
Live project migrations, Edge Function deployment, and production smoke tests
remain operational owner actions.

## Files

- **`schema.sql`** — tables (`profiles`, `progress`, `wallet`, `entitlements`,
  `ledger`, `supporter_deliveries`), the `updated_at` trigger, the private
  `supporter-assets` bucket, and Row-Level Security policies. Each
  column is commented with the `nbhsk.*` localStorage key it mirrors.
- **`migrations/2026-07-12-iap-golive.sql`** — idempotent purchase ledger,
  atomic `grant_purchase`, and service-role privileges required before IAP.
- **`migrations/2026-08-02-supporter-email-delivery.sql`** — permanent
  order-level delivery idempotency, service-only claim/finish RPCs, and the
  private Storage bucket used for the six-PDF ZIP.
- **`migrations/2026-08-03-supporter-delivery-status.sql`** — widens
  `supporter_deliveries.status` to add `'delivered'`, so `resend-webhook` can
  record real delivery truth past `sent`. Additive + idempotent.
- **`../../supabase/functions/_shared/supporter-email/`** — localized
  transactional email, Resend transport, private signed-asset attachment, and
  retry orchestration shared by both purchase webhooks.
- **`../../supabase/functions/_shared/resend-webhook/`** — pure svix
  signature verification and Resend event classification for
  `resend-webhook` (vitest-tested, see `test/resend-webhook.test.js`).
- **`../../supabase/functions/rc-webhook/`** — bearer + HMAC authenticated
  RevenueCat webhook that grants through `grant_purchase`.
- **`../../supabase/functions/stripe-webhook/`** — signature-verified Stripe
  webhook that grants through `grant_purchase`. See §Stripe deployment
  prerequisites below.
- **`../../supabase/functions/stripe-checkout/`** — authenticated Checkout
  Session creator called by the browser client. See §Stripe deployment
  prerequisites below.
- **`../../supabase/functions/supporter-download/`** — JWT-verified endpoint
  that issues a fresh signed URL for the six-guide ZIP to a signed-in
  Supporter, for self-serve re-download. See §Supporter self-serve download
  deployment prerequisites below.
- **`../../supabase/functions/resend-webhook/`** — svix-signature-verified
  Resend delivery webhook that moves `supporter_deliveries` rows past `sent`
  to `delivered`/`failed` and alerts on failure. See §Supporter self-serve
  download deployment prerequisites below.

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

## Automatic Supporter gift delivery prerequisites

The Stripe and RevenueCat webhooks send the six-guide ZIP only **after**
`grant_purchase` confirms the Supporter entitlement. Delivery is separately
idempotent: `supporter_deliveries.order_id` prevents permanent duplicates and
Resend receives `Idempotency-Key: supporter-gift/<order-id>` for transport
retries. A delivery failure returns HTTP 500 so the payment provider retries;
a duplicate grant resumes the unfinished delivery without re-crediting coins.

Complete these in order before advertising automatic delivery:

1. Create a Resend account and verify a sending subdomain such as
   `mail.luckycathsk.com`. Using a subdomain avoids disturbing Cloudflare Email
   Routing's existing inbound MX/SPF configuration on the apex domain.
2. Apply `migrations/2026-08-02-supporter-email-delivery.sql` to the live
   Supabase project. Confirm both RPCs exist and the `supporter-assets` bucket
   is **private**.
3. In Supabase Dashboard → Storage → `supporter-assets`, upload the root-repo
   artifact with this exact object name:

       Lucky_Cat_HSK_Supporter_Gift_HSK1-6_PDFs.zip

   Source file:

       ../product/supporter-pack/Lucky_Cat_HSK_Supporter_Gift_HSK1-6_PDFs.zip

   The Edge Function signs a ten-minute URL and gives it to Resend as the
   attachment source. The bucket must not be made public. The migration sets a
   25 MiB object limit for the approximately 18.8 MB redesigned ZIP.
4. Set both Edge Function secrets (never commit their values):

       supabase secrets set RESEND_API_KEY=re_... SUPPORTER_EMAIL_FROM='Lucky Cat HSK <support@mail.luckycathsk.com>'

5. Re-deploy **both** purchase webhooks with JWT verification disabled:

       supabase functions deploy stripe-webhook --no-verify-jwt
       supabase functions deploy rc-webhook --no-verify-jwt

6. Run one test purchase using a verified Lucky Cat email. Gate success on all
   of these: entitlement + 2,000 coins granted, one email received, ZIP opens
   with exactly six PDFs, and the database row reads `status='sent'`:

       select order_id, status, attempts, provider_message_id, last_error, sent_at
       from public.supporter_deliveries
       order by created_at desc
       limit 10;

7. Replay the same Stripe/RevenueCat event. It must return success without a
   second email; the row remains `sent` and its attempt count does not grow.

Do not flip the Supporter product live if `RESEND_API_KEY`, the verified sender,
the private object, or either delivery RPC is missing. The code fails closed
and payment webhooks retry, but configuration should be proven before a buyer
is allowed to pay.

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

## Supporter self-serve download deployment prerequisites

Two more functions, opposite JWT settings again — same rule as the Stripe
pair above: get this backwards and either a real Resend delivery 401s before
`resend-webhook`'s own code ever runs, or `supporter-download` accepts calls
from anyone with no Supabase session at all.

**Migration first.** `migrations/2026-08-03-supporter-delivery-status.sql`
widens `supporter_deliveries.status` to accept `'delivered'` in addition to
`pending`/`sending`/`sent`/`failed`. Apply it (SQL editor or `supabase db
push`) **before** deploying `resend-webhook` — its `deliver` branch updates a
row to that new value and errors against an unmigrated table.

### supporter-download

Deploy normally (JWT verification ON — it authenticates the caller itself,
same pattern as `stripe-checkout`):

    npx supabase@latest functions deploy supporter-download --project-ref eqsodiufgjecoqgxdisn

No new secret — it reuses `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY`, already set for the other functions. It resolves
the caller from their **own** verified bearer token (never the request
body), checks `entitlements` for `product_id = 'supporter'` server-side, and
only then signs a fresh URL for the guide ZIP. The client's "owned" state
that shows the in-game download button is cosmetic; the server is the real
gate — an anonymous session simply fails the entitlement check like any
other non-supporter (403 `not_supporter`).

### resend-webhook

> **⚠ DEPLOY WITH `--no-verify-jwt` — DO NOT MISS THIS FLAG.** Resend sends
> svix signature headers, not a Supabase JWT. Forgetting the flag means the
> gateway 401s every real Resend delivery before the function's own svix
> check ever runs — the exact same failure shape as `stripe-webhook` above,
> and just as silent: delivery-status rows simply stop advancing past `sent`,
> with nothing in the Supabase logs to explain why.

    npx supabase@latest functions deploy resend-webhook --project-ref eqsodiufgjecoqgxdisn --no-verify-jwt

New secret: `RESEND_WEBHOOK_SECRET` — the svix signing secret (`whsec_…`)
from the Resend dashboard webhook (see `docs/OWNER-ACTIONS.md` §B.1 for the
owner-side steps that produce it). Never commit it. The function fails
closed on a missing secret — an unset `RESEND_WEBHOOK_SECRET`,
`SUPABASE_URL`, or `SUPABASE_SERVICE_ROLE_KEY` returns 503
`service unavailable`, the same guard shape as `stripe-webhook`.

It also reuses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (already set
for the other functions); the failure-alert leg additionally reuses
`RESEND_API_KEY` and `SUPPORTER_EMAIL_FROM`, both already set per the
Automatic Supporter gift delivery prerequisites above. If either of those
two is unset, the row still flips to `failed` correctly — the alert is
best-effort and only ever adds `alerted: false` to the response, it never
turns the row-flip itself into a failure.

**⚠ Create the webhook in the right Resend account.** `resend-webhook`
subscribes to the **guides** Resend account — the one that verified
`mail.luckycathsk.com` and sends the six-PDF ZIP (§Automatic Supporter gift
delivery prerequisites above) — **not** the separate auth-SMTP Resend
account (the `send.luckycathsk.com` sender, once that SMTP flip lands) used
for sign-in emails. The two accounts have separate logins, separate API
keys, and separate webhook lists; adding the webhook to the wrong one
produces silence with no error on either side. See
`docs/OWNER-ACTIONS.md` §B.1.

### Verify

Deno TS cannot run under vitest and `eslint.config.mjs` ignores
`supabase/`, so this manual gate is the only verification either function
gets before it faces real traffic. This documents exactly what the code
returns — see `supabase/functions/resend-webhook/index.ts` and
`supabase/functions/_shared/resend-webhook/core.js` for the logic being
exercised — not a generic "should 401."

**(a) Unsigned POST to `resend-webhook` → 401.** No svix headers at all
means `verifySvixSignature` fails immediately (missing `id`/`timestamp`/
`signature`), before any database call is made:

    curl -i -X POST "https://eqsodiufgjecoqgxdisn.supabase.co/functions/v1/resend-webhook" \
      -H "Content-Type: application/json" -d '{}'

Three possible results, same three-way read as the `stripe-webhook` probe
above:

- **`401` plain-text `unauthorized`** — pass. This is the *function's own*
  rejection: the gateway forwarded the unsigned POST (proving
  `--no-verify-jwt` took) and the svix check then failed it.
- **`503 service unavailable`** — `RESEND_WEBHOOK_SECRET` (or
  `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`) is not set yet, or did not
  take. Run this probe again **after** the owner's §B.1 step lands the
  secret, not before.
- **JSON `{"code":…,"message":…}` 401** (not the plain-text shape above) —
  the *gateway* answered, meaning the deploy dropped `--no-verify-jwt`.
  Re-deploy with the flag and re-probe.

**(b) Synthetic svix-signed `email.delivered` for a fake message id → 200
`{"ok":true}`.** The deliver path runs `update … where provider_message_id =
<id> and status = 'sent'` and only checks for a database *error*, not for
rows actually matched — so a message id that matches nothing still returns
success. This is deliberate (Resend must not be told to retry a
well-formed, correctly-signed event just because our id happens to be
stale), but it means `{"ok":true}` here is **not** proof any row moved; only
a real purchase's `provider_message_id` proves that.

    SECRET="whsec_<the RESEND_WEBHOOK_SECRET value>"
    SECRET_HEX=$(printf '%s' "${SECRET#whsec_}" | base64 -d | xxd -p -c 256)
    ID="msg_verify_1"; TS=$(date +%s)
    PAYLOAD='{"type":"email.delivered","data":{"email_id":"re_does-not-exist"}}'
    SIG=$(printf '%s' "${ID}.${TS}.${PAYLOAD}" \
      | openssl dgst -sha256 -mac hmac -macopt hexkey:"$SECRET_HEX" -binary | base64)
    curl -i -X POST "https://eqsodiufgjecoqgxdisn.supabase.co/functions/v1/resend-webhook" \
      -H "svix-id: $ID" -H "svix-timestamp: $TS" -H "svix-signature: v1,$SIG" \
      -H "Content-Type: application/json" -d "$PAYLOAD"

**(c) Synthetic svix-signed `email.bounced` for a fake message id → 200
`{"ignored":"no-matching-row"}`.** Unlike the deliver path, the fail path
`.select()`s the row it just tried to update; a fake id matches nothing, so
`data[0]` is `undefined` and the function reports the no-match explicitly
instead of silently swallowing it — that asymmetry between (b) and (c) is
in the code, not a bug in this verify script. Re-run the same recipe as (b)
with a different payload — **regenerate `TS` too, not just `SIG`**: the
verifier rejects anything outside a 300-second tolerance, so reusing an old
timestamp from a copy-pasted (b) run 401s and reads as a broken signature
rather than the stale clock it actually is:

    ID="msg_verify_2"; TS=$(date +%s)
    PAYLOAD='{"type":"email.bounced","data":{"email_id":"re_does-not-exist","bounce":{"message":"test"}}}'
    SIG=$(printf '%s' "${ID}.${TS}.${PAYLOAD}" \
      | openssl dgst -sha256 -mac hmac -macopt hexkey:"$SECRET_HEX" -binary | base64)
    curl -i -X POST "https://eqsodiufgjecoqgxdisn.supabase.co/functions/v1/resend-webhook" \
      -H "svix-id: $ID" -H "svix-timestamp: $TS" -H "svix-signature: v1,$SIG" \
      -H "Content-Type: application/json" -d "$PAYLOAD"

(`SECRET_HEX` is the same value computed in (b) — reuse the shell session
rather than recomputing it.)

**(d) `supporter-download` without a token → gateway 401.** JWT verification
is ON, so a request with no `Authorization` header never reaches the
function body at all — same gateway rejection already documented for
`stripe-checkout` above:

    curl -i -X POST "https://eqsodiufgjecoqgxdisn.supabase.co/functions/v1/supporter-download"

Expect `401` with the *gateway's* JSON body
(`{"code":"UNAUTHORIZED_NO_AUTH_HEADER",…}`), not the function's own
`{"error":"unauthorized"}` shape (`index.ts:43`). Seeing the function's shape
instead means JWT verification did not actually take — re-check Dashboard →
**Edge Functions → function → Details**, the same trap called out for
`stripe-webhook` above.
