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

export function processStripeEvent(body, catalog) {
  const fail = reason => ({ ok: false, reason });
  if (!body || typeof body !== "object") return fail("not-an-event");
  if (!GRANTABLE_TYPES.has(body.type)) return fail("ignored-event-type");
  const session = body.data && body.data.object;
  if (!session || typeof session !== "object") return fail("not-an-event");
  // The ONLY safe grant trigger. A completed-but-unpaid session is a PromptPay
  // QR that has been shown, not money that has arrived.
  if (session.payment_status !== "paid") return fail("not-paid");
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
