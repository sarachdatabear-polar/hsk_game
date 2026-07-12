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

export function processEvent(body, catalog) {
  const fail = reason => ({ ok: false, reason });
  const event = body && typeof body === "object" ? body.event : null;
  if (!event || typeof event !== "object") return fail("not-an-event");
  if (!GRANTABLE_TYPES.has(event.type)) return fail("ignored-event-type"); // includes TEST
  const product = (catalog || []).find(p => p.id === event.product_id) || null;
  if (!product) return fail("unknown-product");
  if (!event.app_user_id) return fail("missing-user");
  if (!event.id) return fail("missing-event-id");
  return {
    ok: true,
    grant: {
      userId: event.app_user_id,
      productId: event.product_id,
      eventId: event.id,
      coins: product.coins,
      entitlement: product.entitlement || null,
    },
  };
}
