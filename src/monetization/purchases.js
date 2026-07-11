"use strict";
// Purchase grant/entitlement logic — pure, SDK-independent (house pattern:
// interstitial-policy.js). Caller owns persistence (nbhsk.ent, nbhsk.wallet).
//
// Idempotent by orderId ON PURPOSE: this mirrors PRD §7.4's idempotent-
// webhook acceptance criterion ("coin packs credit the correct amount once,
// even if the app is killed mid-purchase") so the same logic survives the
// move to server-side grants in the RevenueCat slice.
import { productById, PRODUCTS } from "./products.js";

export function defaultEnt() {
  return { supporter: false, orders: [] };
}

export function isSupporter(ent) {
  return !!(ent && ent.supporter);
}

// wallet: number of coins. Every not-ok result echoes state back unchanged.
export function applyPurchase(wallet, ent, productId, orderId, now) {
  const e = ent || defaultEnt();
  const fail = reason => ({ ok: false, wallet, ent: e, reason });
  const p = productById(productId);
  if (!p) return fail("unknown-product");
  if ((e.orders || []).some(o => o.orderId === orderId)) return fail("duplicate");
  if (p.entitlement === "supporter" && e.supporter) return fail("already-owned");
  return {
    ok: true,
    wallet: wallet + p.coins,
    ent: {
      supporter: e.supporter || p.entitlement === "supporter",
      orders: [...(e.orders || []), { orderId, productId, at: now }],
    },
  };
}

// Restore re-derives non-consumable entitlements from the store's owned
// list. Coin packs are consumables and never restore (store rules) — only
// the supporter flag comes back, never coins.
export function restoreFrom(ent, ownedProductIds) {
  const e = ent || defaultEnt();
  const owned = ownedProductIds || [];
  return {
    ...e,
    orders: e.orders || [],
    supporter: e.supporter ||
      PRODUCTS.some(p => p.entitlement === "supporter" && owned.includes(p.id)),
  };
}
