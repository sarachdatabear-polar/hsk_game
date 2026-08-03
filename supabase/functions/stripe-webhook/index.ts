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
import { processStripeEvent, verifyStripeSignature } from "./core.js";
import { deliverSupporterGift } from "../_shared/supporter-email/service.js";
import { PRODUCTS } from "../../../src/monetization/products.js";

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
