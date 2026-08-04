// Stripe webhook — Deno Edge Function. Thin I/O wrapper: all grant decision
// logic lives in core.js (vitest-tested, see test/stripe-webhook.test.js).
//
// ⚠ DEPLOY WITH JWT VERIFICATION DISABLED (--no-verify-jwt). Stripe sends no
// Supabase JWT; the platform gateway would 401 before this function runs.
// Same requirement as rc-webhook — see docs/supabase/README.md.
//
// No CORS here: the caller is Stripe's server, not a browser. (Contrast
// stripe-checkout, which IS browser-called and needs a preflight handler.)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { grantFromSession, processStripeEvent, processStripeRefund, verifyStripeSignature } from "./core.js";
import { deliverSupporterGift } from "../_shared/supporter-email/service.js";
import { PRODUCTS } from "../../../src/monetization/products.js";

// Pin the API version — the account default drifts under you otherwise.
// Same rationale/value as stripe-checkout/index.ts; kept as its own const
// here rather than a shared import because this function has no other
// dependency on that module and Deno-imports across function directories are
// avoided elsewhere in this codebase too.
const STRIPE_API_VERSION = "2025-08-27.basil";

Deno.serve(async (req) => {
  const signingSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  // Fail closed: an unset secret must never be treated as "no signature needed".
  if (!signingSecret || !supabaseUrl || !serviceRoleKey) {
    return new Response("service unavailable", { status: 503 });
  }

  let body, rawBody;
  try {
    rawBody = await req.text();
    if (!await verifyStripeSignature(rawBody, req.headers.get("Stripe-Signature"), signingSecret)) {
      return new Response("unauthorized", { status: 401 });
    }
    body = JSON.parse(rawBody);
  } catch {
    return new Response("bad request", { status: 400 });
  }

  // `body &&` guards a validly-signed scalar/null JSON body (e.g. `"null"`)
  // reaching `.type` on a non-object — processStripeEvent below already
  // handles that shape gracefully via its own not-an-event check, and this
  // keeps the refund branch equally forgiving instead of throwing past the
  // try/catch above.
  if (body && body.type === "charge.refunded") {
    const parsed = processStripeRefund(body);
    if (!parsed.ok) {
      // Ignorable (wrong type already excluded by the outer check, partial
      // refund, missing fields): 200 so Stripe does not retry.
      return new Response(JSON.stringify({ ignored: parsed.reason }), { status: 200 });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    // Config error, not a payload problem — Stripe should retry once the key
    // is set, so this fails with 503 like the other function-level guards
    // above, not a 200 ack. The key already exists project-wide (stripe-checkout).
    if (!stripeKey) return new Response("service unavailable", { status: 503 });

    // Charges carry no checkout session id, and our Checkout Sessions set no
    // payment_intent metadata — this lookup is the ONLY way to map a
    // refunded charge back to the session (and therefore the user/product)
    // that created it.
    const sessionRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions?payment_intent=${encodeURIComponent(parsed.refund.paymentIntent)}&limit=1`,
      { headers: { Authorization: `Bearer ${stripeKey}`, "Stripe-Version": STRIPE_API_VERSION } },
    ).catch(() => null);
    if (!sessionRes || !sessionRes.ok) return new Response("stripe error", { status: 500 }); // transient — let Stripe retry

    const sessionList = await sessionRes.json();
    const session = sessionList && Array.isArray(sessionList.data) ? sessionList.data[0] : null;
    // No session found is DEFINITIVE, not transient: this charge was never a
    // checkout-session purchase of ours, so there is nothing to revoke.
    if (!session) return new Response(JSON.stringify({ ignored: "no-session" }), { status: 200 });

    // requirePaid:false — see grantFromSession's own comment (core.js): the
    // charge.refunded event we're handling IS the payment proof, so the
    // checkout-time payment_status gate would only ever risk a silent,
    // permanent false negative here, never a real one.
    const derived = grantFromSession(session, PRODUCTS, { requirePaid: false });
    if (!derived.ok) return new Response(JSON.stringify({ ignored: derived.reason }), { status: 200 });

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase.rpc("revoke_purchase", {
      p_user_id: derived.grant.userId,
      p_delta: derived.grant.coins,
      p_reason: `refund:${derived.grant.productId}`,
      p_event_id: parsed.refund.eventId,
      // NOT derived.grant.orderId bare: the original grant already wrote a
      // ledger row with order_id = that session id, and ledger_order_id_uidx
      // (schema.sql) uniquely indexes order_id too, not just event_id. An
      // unprefixed reuse here would collide on THAT index instead of the
      // intended event_id dedupe, so the debit would silently roll back into
      // the 'duplicate' branch on the very first refund — see the migration
      // header comment. The refund: prefix keeps the row traceable to its
      // original purchase while landing in its own uidx slot.
      p_order_id: `refund:${derived.grant.orderId}`,
      p_entitlement: derived.grant.entitlement,
    });
    if (error) return new Response("storage error", { status: 500 }); // real failure — let Stripe retry

    switch (data) {
      case "revoked": return new Response(JSON.stringify({ ok: true }), { status: 200 });
      case "duplicate": return new Response(JSON.stringify({ duplicate: true }), { status: 200 });
      // Deleted account: permanent, so ack — retrying can never succeed.
      case "unknown-user": return new Response(JSON.stringify({ ignored: "unknown-user" }), { status: 200 });
      default: return new Response("storage error", { status: 500 });
    }
  }

  const result = processStripeEvent(body, PRODUCTS);
  if (!result.ok) {
    // Stripe retries non-2xx. Ignorable events (wrong type, unpaid, unknown
    // product) are not delivery failures — ack 200 so Stripe stops retrying.
    return new Response(JSON.stringify({ ignored: result.reason }), { status: 200 });
  }

  const { userId, productId, eventId, orderId, coins, entitlement } = result.grant;
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase.rpc("grant_purchase", {
    p_user_id: userId,
    p_delta: coins,
    p_reason: productId,
    p_event_id: eventId,
    p_order_id: orderId,
    p_entitlement: entitlement,
    // entitlements.source (2026-08-04-entitlement-source.sql) — without this
    // every grant here would default to 'revenuecat' and mislabel Stripe
    // Supporter purchases as RC-originated.
    p_source: "stripe",
  });
  if (error) return new Response("storage error", { status: 500 }); // real failure — let Stripe retry

  // The grant is already server-confirmed at this point. Deliver from BOTH
  // `granted` and `duplicate`: a retry after an email/provider outage sees a
  // duplicate purchase grant, then resumes the separate idempotent delivery
  // row instead of silently stranding the buyer. Resend also receives a stable
  // order-based idempotency key, so retries cannot send the same gift twice.
  if ((data === "granted" || data === "duplicate") && entitlement === "supporter") {
    const delivery = await deliverSupporterGift({
      supabase,
      apiKey: Deno.env.get("RESEND_API_KEY"),
      from: Deno.env.get("SUPPORTER_EMAIL_FROM"),
      userId,
      orderId,
    });
    if (!delivery.ok) return new Response("delivery error", { status: 500 });
  }

  switch (data) {
    case "granted": return new Response(JSON.stringify({ ok: true }), { status: 200 });
    case "duplicate": return new Response(JSON.stringify({ duplicate: true }), { status: 200 });
    // Deleted account: permanent, so ack — retrying can never succeed.
    case "unknown-user": return new Response(JSON.stringify({ ignored: "unknown-user" }), { status: 200 });
    default: return new Response("storage error", { status: 500 });
  }
});
