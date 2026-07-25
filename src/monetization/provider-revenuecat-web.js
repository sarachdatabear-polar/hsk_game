"use strict";
import { productById } from "./products.js";

// Matches the UUID guard in provider-revenuecat.js (kept local to avoid
// touching the native provider; both reject anything that isn't a Supabase uid).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PURCHASE_CANCELLED_ERROR = "1";
const PAYMENT_PENDING_ERROR = "20";

function failureReason(error) {
  const code = String(error && error.code != null ? error.code : "");
  if ((error && error.userCancelled) || code === PURCHASE_CANCELLED_ERROR) return "cancelled";
  if (code === PAYMENT_PENDING_ERROR) return "pending";
  return "failed";
}

// RevenueCat Web Billing implementation of the provider seam. The SDK adapter
// (revenuecat-web-sdk.js) is injectable so every branch is covered in plain
// Vitest without a browser. Mirrors provider-revenuecat.js structure.
export function revenueCatWebProvider(opts = {}) {
  const sdk = opts.sdk;
  const apiKey = String(opts.apiKey || "").trim();
  const productIds = [...new Set(opts.productIds || [])].filter(id => productById(id));
  const restorableIds = new Set((opts.restorableProductIds || []).filter(id => productIds.includes(id)));
  const ensureUserId = typeof opts.ensureUserId === "function" ? opts.ensureUserId : async () => null;
  const isNative = typeof opts.isNative === "function" ? opts.isNative : () => false;
  const prices = new Map();
  let configured = false;
  let loaded = false;
  let initTask = null;

  async function ensureIdentity() {
    // Web billing only runs off-native with a real key and a Supabase UUID.
    if (!apiKey || isNative() || !sdk) return false;
    const userId = await ensureUserId();
    if (typeof userId !== "string" || !UUID.test(userId)) return false;
    if (!configured) {
      await sdk.configure({ apiKey, appUserId: userId });
      configured = true;
    }
    return true;
  }

  async function loadPrices() {
    if (!(await ensureIdentity())) return false;
    if (!loaded) {
      for (const id of productIds) {
        const price = await sdk.price(id);
        if (typeof price === "string") prices.set(id, price);
      }
      loaded = true;
    }
    return prices.size > 0;
  }

  async function ready() {
    if (!initTask) initTask = loadPrices().catch(() => false).finally(() => { initTask = null; });
    return initTask;
  }

  return {
    kind: "revenuecat-web",
    async available() { return !!(await ready()); },
    supports(productId) { return prices.has(productId); },
    supportsRestore() { return [...restorableIds].some(id => prices.has(id)); },
    price(productId) {
      const p = prices.get(productId);
      return typeof p === "string" ? p : null;
    },
    async purchase(productId) {
      try {
        if (!productIds.includes(productId) || !(await ready())) return { ok: false, reason: "unavailable" };
        const result = await sdk.buy(productId);
        const orderId = result && result.orderId;
        return orderId ? { ok: true, orderId } : { ok: false, reason: "failed" };
      } catch (error) {
        return { ok: false, reason: failureReason(error) };
      }
    },
    async restore() {
      try {
        if (!(await ensureIdentity())) return { ok: false, reason: "unavailable" };
        const active = await sdk.entitlements();
        const ownedProductIds = [...new Set((active || []).filter(id => restorableIds.has(id)))];
        return { ok: true, ownedProductIds };
      } catch (error) {
        return { ok: false, reason: failureReason(error) };
      }
    },
  };
}
