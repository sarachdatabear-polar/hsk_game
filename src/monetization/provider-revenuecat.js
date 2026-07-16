"use strict";
import { productById } from "./products.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PURCHASE_CANCELLED_ERROR = "1";
const PAYMENT_PENDING_ERROR = "20";

function failureReason(error) {
  const code = String(error && error.code != null ? error.code : "");
  if ((error && error.userCancelled) || code === PURCHASE_CANCELLED_ERROR) return "cancelled";
  if (code === PAYMENT_PENDING_ERROR) return "pending";
  return "failed";
}

// RevenueCat implementation of the provider seam. Dependencies are injectable
// so every bridge edge can be covered in plain Vitest without a device.
export function revenueCatProvider(opts = {}) {
  let sdk = opts.sdk || null;
  const apiKey = String(opts.apiKey || "").trim();
  const productIds = [...new Set(opts.productIds || [])].filter(id => productById(id));
  const restorableIds = new Set((opts.restorableProductIds || []).filter(id => productIds.includes(id)));
  const ensureUserId = typeof opts.ensureUserId === "function" ? opts.ensureUserId : async () => null;
  const isNative = typeof opts.isNative === "function" ? opts.isNative : () => false;
  const products = new Map();
  let configuredUserId = null;
  let initTask = null;

  async function ensureSdk() {
    if (!sdk) sdk = (await import("@revenuecat/purchases-capacitor")).Purchases;
    return sdk;
  }

  async function ensureIdentity() {
    if (!apiKey || !isNative()) return false;
    await ensureSdk();
    const userId = await ensureUserId();
    // The webhook grants through a UUID-typed Supabase RPC. Never let the SDK
    // create a $RCAnonymousID or accept an email/guessable identifier here.
    if (typeof userId !== "string" || !UUID.test(userId)) return false;
    if (!configuredUserId) {
      await sdk.configure({ apiKey, appUserID: userId });
      configuredUserId = userId;
    } else if (configuredUserId !== userId) {
      await sdk.logIn({ appUserID: userId });
      configuredUserId = userId;
      products.clear();
    }
    return true;
  }

  async function loadProducts() {
    if (!(await ensureIdentity())) return false;
    if (products.size) return true;
    const result = await sdk.getProducts({
      productIdentifiers: productIds,
      type: "NON_SUBSCRIPTION",
    });
    for (const product of (result && result.products) || []) {
      if (productIds.includes(product.identifier)) products.set(product.identifier, product);
    }
    return products.size > 0;
  }

  // Coalesce boot/render races into one configure + product request.
  async function ready() {
    if (!initTask) initTask = loadProducts().catch(() => false).finally(() => { initTask = null; });
    return initTask;
  }

  return {
    kind: "revenuecat",
    async available() { return !!(await ready()); },
    supports(productId) { return products.has(productId); },
    supportsRestore() { return [...restorableIds].some(id => products.has(id)); },
    price(productId) {
      const p = products.get(productId);
      return p && typeof p.priceString === "string" ? p.priceString : null;
    },
    async purchase(productId) {
      try {
        if (!productIds.includes(productId) || !(await ready())) return { ok: false, reason: "unavailable" };
        const product = products.get(productId);
        if (!product) return { ok: false, reason: "unavailable" };
        const result = await sdk.purchaseStoreProduct({ product });
        const orderId = result && result.transaction && result.transaction.transactionIdentifier;
        return orderId ? { ok: true, orderId } : { ok: false, reason: "failed" };
      } catch (error) {
        return { ok: false, reason: failureReason(error) };
      }
    },
    async restore() {
      try {
        if (!(await ensureIdentity())) return { ok: false, reason: "unavailable" };
        const result = await sdk.restorePurchases();
        const active = result && result.customerInfo && result.customerInfo.entitlements
          ? result.customerInfo.entitlements.active || {} : {};
        const ownedProductIds = [...new Set(Object.values(active)
          .filter(info => info && info.isActive && restorableIds.has(info.productIdentifier))
          .map(info => info.productIdentifier))];
        return { ok: true, ownedProductIds };
      } catch (error) {
        return { ok: false, reason: failureReason(error) };
      }
    },
  };
}
