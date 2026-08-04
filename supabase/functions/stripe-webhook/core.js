"use strict";
// Stripe webhook event handling — pure, plain-ESM, no Deno APIs (house pattern:
// rc-webhook/core.js). index.ts does all I/O; this file only decides WHAT to
// grant from an already-parsed body, so it runs under both vitest and Deno.
//
// Stripe body shape: { id, type, data: { object: <CheckoutSession> } }.
// Docs: docs.stripe.com/payments/checkout/fulfill-orders

// Both types are candidates; payment_status decides. Never the event type.
//
// ⚠ The original comment here claimed PromptPay is a delayed-notification
// method that arrives "unpaid" and settles later on async_payment_succeeded.
// That is WRONG, and it was wrong in OWNER-ACTIONS too. Stripe classifies
// PromptPay-on-Checkout as a REAL-TIME payment method; the 2026-07-31 test-mode
// rehearsal measured a single checkout.session.completed already carrying
// payment_status "paid", and no async_payment_* event ever fired. Keying the
// grant off async_payment_succeeded would take the money and grant nothing.
// The both-types set stays anyway: it costs nothing, and it is what makes this
// correct if a genuinely delayed method (bank debits) is ever enabled.
const GRANTABLE_TYPES = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

function bytesFromHex(hex) {
  if (!/^[0-9a-f]{64}$/i.test(hex || "")) return null;
  return new Uint8Array(hex.match(/../g).map(byte => parseInt(byte, 16)));
}

function constantTimeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let different = 0;
  for (let i = 0; i < a.length; i++) different |= a[i] ^ b[i];
  return different === 0;
}

// Stripe signs `${timestamp}.${raw body}` with HMAC-SHA256 and sends
// `t=<unix>,v1=<hex>` in Stripe-Signature. The header may carry MULTIPLE v1
// entries during a signing-secret roll, so collect them all — an
// Object.fromEntries parse (as rc-webhook does for RC's single-signature
// header) would silently keep only the last and reject valid deliveries.
export async function verifyStripeSignature(rawBody, header, secret, nowSeconds = Math.floor(Date.now() / 1000), toleranceSeconds = 300) {
  if (typeof rawBody !== "string" || typeof header !== "string" || typeof secret !== "string" || !secret) return false;
  try {
    let timestamp = NaN;
    const candidates = [];
    for (const part of header.split(",")) {
      const [key, value] = part.trim().split("=", 2);
      if (key === "t") timestamp = Number(value);
      else if (key === "v1") candidates.push(value);
    }
    if (!Number.isInteger(timestamp) || !candidates.length) return false;
    if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false;
    const encoder = new TextEncoder();
    const key = await globalThis.crypto.subtle.importKey(
      "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const expected = new Uint8Array(await globalThis.crypto.subtle.sign(
      "HMAC", key, encoder.encode(`${timestamp}.${rawBody}`)));
    // Compare against every candidate; do not short-circuit on the first miss.
    let matched = false;
    for (const candidate of candidates) {
      if (constantTimeEqual(expected, bytesFromHex(candidate))) matched = true;
    }
    return matched;
  } catch {
    return false;
  }
}

// The session→grant decision, split out of processStripeEvent so the refund
// path (which maps a charge to a session itself, see index.ts) can reuse the
// exact same rules without going through the checkout.session.* type-gate.
//
// requirePaid defaults true (byte-identical to the pre-extraction behavior
// for the grant path). The refund path passes requirePaid:false: a
// charge.refunded event IS proof the charge settled — you cannot refund a
// charge that never took money — so re-checking checkout-time payment_status
// there would only ever risk a spurious "not-paid" if Stripe ever reflects a
// refund back onto the Session object (undocumented; the enum today is only
// paid/unpaid/no_payment_required, with no "refunded" state). That failure
// mode is silent and permanent (a 200 ack tells Stripe never to retry), so
// this path does not depend on that field at all rather than assume it's safe.
export function grantFromSession(session, catalog, { requirePaid = true } = {}) {
  const fail = reason => ({ ok: false, reason });
  if (!session || typeof session !== "object") return fail("not-an-event");
  // The ONLY safe grant trigger for the checkout.session.* path. A
  // completed-but-unpaid session is a PromptPay QR that has been shown, not
  // money that has arrived.
  if (requirePaid && session.payment_status !== "paid") return fail("not-paid");
  if (!session.id) return fail("missing-session-id");
  if (!session.client_reference_id) return fail("missing-user");
  const productId = session.metadata && session.metadata.product_id;
  const product = (catalog || []).find(p => p.id === productId) || null;
  if (!product) return fail("unknown-product");
  return {
    ok: true,
    grant: {
      userId: session.client_reference_id,
      productId: product.id,
      // Session id for BOTH: one semantic id per purchase. p_order_id must
      // equal it for the client's sync.js reconcile to match; p_event_id is
      // grant_purchase's idempotency key so the second qualifying event for
      // the same session returns "duplicate".
      eventId: session.id,
      orderId: session.id,
      coins: product.coins,
      entitlement: product.entitlement || null,
    },
  };
}

export function processStripeEvent(body, catalog) {
  const fail = reason => ({ ok: false, reason });
  if (!body || typeof body !== "object") return fail("not-an-event");
  if (!GRANTABLE_TYPES.has(body.type)) return fail("ignored-event-type");
  return grantFromSession(body.data && body.data.object, catalog);
}

// Refund handling — the mirror image of the grant path. Stripe's
// `charge.refunded` event carries a CHARGE, not a checkout session, so this
// stays a separate decision function; index.ts maps charge→session (via the
// Stripe API, since a charge carries no session id) and then reuses
// grantFromSession/PRODUCTS to figure out WHAT to revoke.
export function processStripeRefund(body) {
  const fail = reason => ({ ok: false, reason });
  if (!body || typeof body !== "object") return fail("not-an-event");
  if (body.type !== "charge.refunded") return fail("ignored-event-type");
  const charge = body.data && body.data.object;
  if (!charge || typeof charge !== "object") return fail("not-an-event");
  // Published policy (refund.html §4) only ever revokes on a FULL refund.
  // A partial-refund delivery of this same event type carries refunded:false
  // — a Stripe partial-refund charge object never has refunded:true — so
  // this check alone is what keeps a partial refund from revoking anything.
  if (charge.refunded !== true) return fail("not-fully-refunded");
  if (typeof charge.id !== "string" || !charge.id) return fail("missing-charge-id");
  if (typeof charge.payment_intent !== "string" || !charge.payment_intent) return fail("missing-payment-intent");
  return {
    ok: true,
    refund: {
      paymentIntent: charge.payment_intent,
      // Keyed to the CHARGE id, not body.id (the Stripe event id): Stripe can
      // redeliver the same event, and a fresh event id per redelivery must
      // still dedupe on ledger_event_id_uidx instead of double-revoking.
      eventId: `refund:${charge.id}`,
    },
  };
}
