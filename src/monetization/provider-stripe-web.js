"use strict";
import { productById } from "./products.js";
import { writePending, readPending } from "./checkout-pending.js";

// Stripe implementation of the provider seam (contract documented in
// provider.js). Every dependency is injected so all branches are covered in
// plain Vitest without a browser — same shape as provider-revenuecat-web.js.
//
// PURCHASE IS A REDIRECT, so purchase() can never resolve {ok:true}: the page
// is navigating away. It resolves {ok:false, reason:"pending"} and the return
// leg (src/ui/checkout-return.js) completes the transaction.
// A Checkout Session's success_url/cancel_url are built server-side from ONE
// pinned origin. Starting a purchase anywhere else means the buyer is returned
// to a page that cannot see the pending record, the session, or the grant.
//
// Localhost passes on purpose: the live gate and any local smoke test against
// Stripe test mode run from `npm run serve`, and gating those out would make
// this path untestable exactly when it most needs testing.
//
// A BLANK canonical origin allows everything — an unconfigured pin must not be
// read as "refuse all purchases".
const DEV_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function isReturnableOrigin(origin, canonicalOrigin) {
  const canonical = String(canonicalOrigin || "").trim().replace(/\/+$/, "");
  if (!canonical) return true;
  const current = String(origin || "").trim().replace(/\/+$/, "");
  if (!current) return false;
  if (current === canonical) return true;
  try {
    return DEV_HOSTS.has(new URL(current).hostname);
  } catch {
    return false;
  }
}

export function stripeWebProvider(opts = {}) {
  const checkoutUrl = String(opts.checkoutUrl || "").trim();
  const productIds = [...new Set(opts.productIds || [])].filter(id => productById(id));
  const store = opts.store;
  const isNative = typeof opts.isNative === "function" ? opts.isNative : () => false;
  const isFileProtocol = typeof opts.isFileProtocol === "function" ? opts.isFileProtocol : () => false;
  const ensureUserId = typeof opts.ensureUserId === "function" ? opts.ensureUserId : async () => null;
  const getAccessToken = typeof opts.getAccessToken === "function" ? opts.getAccessToken : async () => null;
  const isAnonymous = typeof opts.isAnonymous === "function" ? opts.isAnonymous : async () => true;
  const fetchEntitlements = typeof opts.fetchEntitlements === "function" ? opts.fetchEntitlements : async () => [];
  const redirect = typeof opts.redirect === "function"
    ? opts.redirect
    : (url) => { if (typeof location !== "undefined") location.assign(url); };
  const fetchImpl = opts.fetchImpl || (typeof fetch === "function" ? fetch.bind(globalThis) : null);
  const now = typeof opts.now === "function" ? opts.now : () => Date.now();
  const canonicalOrigin = opts.canonicalOrigin == null ? "" : String(opts.canonicalOrigin);
  const getOrigin = typeof opts.getOrigin === "function"
    ? opts.getOrigin
    : () => (typeof location !== "undefined" ? location.origin : "");

  function usable() {
    return !!checkoutUrl && !!fetchImpl && !isNative() && !isFileProtocol();
  }

  return {
    kind: "stripe-web",

    async available() {
      try { return usable() && productIds.length > 0; } catch { return false; }
    },

    supports(productId) { return productIds.includes(productId); },

    // True whenever this provider sells at least one entitlement-bearing
    // product (today: supporter). Entitlements live server-side and are
    // owner-readable under RLS, so Restore has something to ask. This lights
    // the account-screen Restore button, which is a NEW DEVICE's only route to
    // an entitlement it never saw bought. NOTE: if web ever sells coin-only,
    // this goes false and a returning Supporter loses Restore on this surface.
    supportsRestore() { return productIds.some(id => !!(productById(id) || {}).entitlement); },

    // Stripe exposes no client-side price API here, so the catalog's
    // displayPrice wins (main.js falls back on null).
    price() { return null; },

    async purchase(productId) {
      try {
        if (!usable() || !productIds.includes(productId)) return { ok: false, reason: "unavailable" };
        // Deliberately gated HERE and not in usable(): available(), supports()
        // and restore() must keep working on the bridge. Restore is a returning
        // Supporter's ONLY route to an entitlement this device never saw bought
        // (see supportsRestore below) — refusing it on a non-canonical origin
        // would be a worse bug than the stranded return this check prevents.
        if (!isReturnableOrigin(getOrigin(), canonicalOrigin)) return { ok: false, reason: "wrong-origin" };
        // Refuse anonymous buyers CLIENT-side too. The server refuses as well,
        // but a server-only refusal surfaces as a generic failure toast; this
        // reason lets the UI route to the sign-in sheet instead.
        if (await isAnonymous()) return { ok: false, reason: "needs-account" };
        const userId = await ensureUserId();
        if (!userId) return { ok: false, reason: "needs-account" };
        const token = await getAccessToken();
        if (!token) return { ok: false, reason: "needs-account" };

        // readPending, not a raw store.get: it applies the TTL and shape validation,
        // so a stale record can never be sent as a prior session id to expire.
        const prior = store ? (readPending(store, now()) || {}).sessionId || "" : "";
        const res = await fetchImpl(checkoutUrl, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ productId, priorSessionId: prior }),
        });
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          const error = payload && payload.error;
          if (error === "needs-account") return { ok: false, reason: "needs-account" };
          if (error === "already-owned") return { ok: false, reason: "unavailable" };
          return { ok: false, reason: "failed" };
        }
        if (!payload || !payload.url || !payload.sessionId) return { ok: false, reason: "failed" };

        // Persist BEFORE navigating — after location.assign we get no more turns.
        if (store) writePending(store, { sessionId: payload.sessionId, productId, now: now() });
        redirect(payload.url);
        return { ok: false, reason: "pending" };
      } catch {
        return { ok: false, reason: "failed" };
      }
    },

    async restore() {
      try {
        if (!usable()) return { ok: false, reason: "unavailable" };
        const userId = await ensureUserId();
        if (!userId) return { ok: false, reason: "unavailable" };
        const rows = await fetchEntitlements(userId);
        const held = new Set((rows || []).filter(id => typeof id === "string"));
        const ownedProductIds = productIds.filter(id => held.has((productById(id) || {}).entitlement));
        return { ok: true, ownedProductIds };
      } catch {
        return { ok: false, reason: "unavailable" };
      }
    },
  };
}
