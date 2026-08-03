# Supporter self-serve download + Resend delivery webhook — design

**Date:** 2026-08-03 · **Status:** approved by owner (chat) · **Priority:** pre-marketing gate

## Why

The first real sale (2026-08-03) exposed two gaps:

1. A buyer whose guide email is lost/expired has no recovery path except
   replying to the email. The link in the email lasts 7 days.
2. `supporter_deliveries.status = 'sent'` means "Resend accepted", not
   "delivered" — a post-acceptance bounce/failure is invisible until the buyer
   complains. Owner rule: "if something is down I should know."

Both must close before any marketing push.

## Owner decisions (locked)

- Download button appears in **both** places: shop supporter card (owned
  state becomes thank-you + download) and the account panel next to the
  "Supporter ♥" line.
- Tapping it does a **direct download** (fresh signed URL, browser starts
  immediately) — no email leg.
- Webhook failure handling: flip the row **and email an alert to
  support@luckycathsk.com**. No auto-retry (bounces don't benefit; buyer
  self-serves via the button).

## Component 1 — `supporter-download` edge function

New `supabase/functions/supporter-download/` — **JWT-verified** (unlike the
webhooks, which deploy `--no-verify-jwt`): Supabase's gateway rejects
unauthenticated calls before our code runs.

- Input: POST, no body needed; the caller's identity comes from the JWT.
- Logic: service-role client checks `entitlements` for
  `(user_id = caller, product_id = 'supporter')`. If absent → 403
  `{ error: "not_supporter" }`. If present → create a **7-day signed URL**
  for the existing object
  `Lucky_Cat_HSK_Supporter_Gift_HSK1-6_PDFs.zip` in the private
  `supporter-assets` bucket (same call the email leg uses) → 200
  `{ url }`.
- No rate limiting beyond gateway defaults: the URL is time-boxed, the
  bucket private, and the caller must hold a paid entitlement.
- CORS: same permissive OPTIONS/headers pattern as `stripe-checkout`
  (called from the browser on luckycathsk.com and file:// wrappers).

## Component 2 — client wiring

- New `src/ui/supporter-download.js` factory (house pattern:
  `createSupporterDownload({ $, getSession, t, toast, fnUrl })` or similar
  decided at plan time): calls the function with the session's access
  token, on `{ url }` opens it (`location.assign` — triggers the browser
  download), on failure shows a toast. Pure decision logic (button
  visibility: signed-in supporter only) lives in a small pure helper with
  unit tests.
- **Shop supporter card, owned state** (`main.js` ~4070 `const owned =
  isSupporter(ent)`): owned card shows thank-you copy + the download
  button.
- **Account panel** (`main.js` ~971 `if(isSupporter(ent))` block): the
  existing "Supporter ♥" line gains the same button underneath.
- Visibility rule: the button renders wherever local supporter state is
  true (`isSupporter(ent)` — both host sites already gate on it). The
  server is the real gate: tapping without a valid signed-in session, or
  without the server-side entitlement, gets a 401/403 → toast pointing at
  the account panel sign-in. Keep this dumb: no new auth UI.
- i18n: new EN+TH strings (button label, generic failure toast,
  not-signed-in toast). TH strings tagged `TH-REVIEW`, added to the
  reviewer sheet at next regen.
- `main.js` is frozen for NEW screens, but both touch-points are existing
  feature wiring — additive edits at the two cited sites, heavy lifting in
  the new `src/ui/` module.

## Component 3 — `resend-webhook` edge function + migration

New `supabase/functions/resend-webhook/`, deployed `--no-verify-jwt`
(Resend calls it; auth = svix signature, fail closed like `stripe-webhook`).

- Verify svix headers (`svix-id`, `svix-timestamp`, `svix-signature`)
  against `RESEND_WEBHOOK_SECRET` (new Supabase secret). Bad/absent
  signature → 401. Timestamp tolerance ±5 min.
- Handle event types (everything else → 200 no-op):
  - `email.delivered` → matching row `status = 'delivered'`.
  - `email.bounced`, `email.failed` → matching row `status = 'failed'`
    (existing claim RPC already re-claims `failed` rows), record the
    reason in the existing error column, and send **one alert email** via
    the Resend API (same `RESEND_API_KEY`) to `support@luckycathsk.com`
    with order id, buyer-email domain (not the full address), and reason.
  - Row matching is by `provider_message_id` (`data.email_id`). No row
    matched → 200 no-op (e.g. the alert emails themselves, pre-check
    sends). **Guard against alert loops:** alerts are sent to support@
    from the same account, so their own webhook events must match no row
    and no-op — assert this shape in tests.
  - Never move a row backwards: `delivered` is terminal; a late
    `email.delivered` after a manual reset must not resurrect a
    re-claimed row (transition guard in SQL `where status = 'sent'` /
    equivalent).
- Migration `2026-08-03-supporter-delivery-status.sql`: widen the status
  check to `('pending','sending','sent','failed','delivered')` (drop +
  re-add constraint, additive, idempotent). Update `docs/supabase/schema.sql`
  revision block to match.
- Response is always fast 2xx on handled/no-op paths so Resend doesn't
  retry-spam; 5xx only on genuine internal errors (Resend retries those).

## Testing

House pattern — pure logic unit-tested, wiring untested by design:

- Webhook: pure `handleResendEvent(event, row)` (or similar) in
  `_shared/` covering: delivered transition, bounce → failed + alert
  payload, unknown event no-op, unmatched message no-op, alert-loop
  no-op, backwards-transition guard, svix verification (bad sig, stale
  timestamp).
- Download: pure visibility helper + request/response shape tests
  (403 not supporter, 200 url).
- i18n tests pick up the new keys automatically (EN+TH parity suite).

## Rollout

1. Build + tests green + lint on `development`.
2. Apply migration (staged script — prod DB writes are owner-run via `!`
   if the classifier blocks them, per §B.0 precedent).
3. Deploy `supporter-download` (JWT ON) and `resend-webhook`
   (`--no-verify-jwt`).
4. **Owner (2 min):** in the Resend account that sends the guides (the
   `mail.luckycathsk.com` one — NOT the auth-SMTP account), add a webhook
   endpoint → the `resend-webhook` function URL, events: delivered,
   bounced, failed → hand me the signing secret (file drop, not chat) →
   I set `RESEND_WEBHOOK_SECRET`.
5. Verify: synthetic svix-signed event against the live function
   (delivered + bounced paths); real check = next purchase flips its row
   to `delivered`.
6. Release cut: SHELL v150→v151, sw-precache pin, suite re-run after
   bump, merge development→main, watch Actions, live-verify.

## Out of scope (YAGNI)

- Auth-OTP email delivery tracking (different Resend account; separate
  concern).
- Auto-retry on failure; resend-email button; download rate limiting.
- Client-side storage RLS for the bucket (function keeps the bucket
  sealed).
- Coin-pack surfaces; nothing here touches pricing or the catalog tests.
