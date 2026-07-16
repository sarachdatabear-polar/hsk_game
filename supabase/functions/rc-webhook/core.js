"use strict";
// RevenueCat webhook event handling — pure, plain-ESM, no Deno APIs (house
// pattern: purchases.js). Deno wrapper (index.ts) does all the I/O (auth
// header check, JSON parsing, Supabase writes); this file only decides WHAT
// to grant from an already-parsed webhook body, which makes it runnable
// under plain vitest AND under Deno without a build step.
//
// RC webhook body shape: { api_version, event: { id, type, app_user_id,
// product_id, ... } }. Docs: revenuecat.com/docs/integrations/webhooks.
//
// `catalog` is passed in (not imported here) so the caller controls the
// source of truth — index.ts imports PRODUCTS from
// ../../../src/monetization/products.js and passes it through, keeping
// price/coins defined in exactly one file.

// RC sends one-time purchases as INITIAL_PURCHASE (first buy) or
// NON_RENEWING_PURCHASE (repeat consumable buys, e.g. a second coin pack).
// Everything else (RENEWAL, CANCELLATION, TEST, ...) is not a grant trigger.
const GRANTABLE_TYPES = new Set(["INITIAL_PURCHASE", "NON_RENEWING_PURCHASE"]);

// Fail closed when deployment configuration is incomplete. Without the
// explicit non-empty check, an unset secret would accept the literal header
// "Bearer undefined".
export function authorizeWebhook(header, secret) {
  return typeof secret === "string" && secret.length > 0 && header === `Bearer ${secret}`;
}

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

// RevenueCat signs `${timestamp}.${raw request body}` with HMAC-SHA256 and
// sends `t=<unix>,v1=<hex>` in X-RevenueCat-Webhook-Signature. Verify the raw
// bytes before JSON parsing and reject stale/replayed deliveries.
export async function verifyWebhookSignature(rawBody, header, secret, nowSeconds = Math.floor(Date.now() / 1000), toleranceSeconds = 300) {
  if (typeof rawBody !== "string" || typeof header !== "string" || typeof secret !== "string" || !secret) return false;
  try {
    const fields = Object.fromEntries(header.split(",").map(part => part.trim().split("=", 2)));
    const timestamp = Number(fields.t);
    const received = bytesFromHex(fields.v1);
    if (!Number.isInteger(timestamp) || !received || Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false;
    const encoder = new TextEncoder();
    const key = await globalThis.crypto.subtle.importKey(
      "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = new Uint8Array(await globalThis.crypto.subtle.sign(
      "HMAC", key, encoder.encode(`${timestamp}.${rawBody}`)));
    return constantTimeEqual(signature, received);
  } catch {
    return false;
  }
}

export function processEvent(body, catalog) {
  const fail = reason => ({ ok: false, reason });
  const event = body && typeof body === "object" ? body.event : null;
  if (!event || typeof event !== "object") return fail("not-an-event");
  if (!GRANTABLE_TYPES.has(event.type)) return fail("ignored-event-type"); // includes TEST
  const product = (catalog || []).find(p => p.id === event.product_id) || null;
  if (!product) return fail("unknown-product");
  if (!event.app_user_id) return fail("missing-user");
  if (!event.id) return fail("missing-event-id");
  if (!event.transaction_id) return fail("missing-transaction-id");
  return {
    ok: true,
    grant: {
      userId: event.app_user_id,
      productId: event.product_id,
      eventId: event.id,
      orderId: event.transaction_id,
      coins: product.coins,
      entitlement: product.entitlement || null,
    },
  };
}
