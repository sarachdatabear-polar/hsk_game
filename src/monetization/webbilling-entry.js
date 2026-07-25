"use strict";
// Built as a SEPARATE bundle (dist/webbilling.js) so the ~849KB RevenueCat Web
// SDK stays OUT of the always-precached dist/app.js. revenuecat-web-sdk.js injects
// this script at runtime (shop-open, off-native, not file://) and reads the
// factory off self.__luckyWebBilling.create. Adapter internals verified against
// @revenuecat/purchases-js@1.48.1 (see the git history of revenuecat-web-sdk.js).
import { Purchases, ErrorCode, PurchasesError } from "@revenuecat/purchases-js";

export function createWebBillingAdapter() {
  let rc = null;
  let productIdToPackage = new Map();

  async function offeringsIndex() {
    const offerings = await rc.getOfferings();
    const packages = (offerings && offerings.current && offerings.current.availablePackages) || [];
    productIdToPackage = new Map(
      packages.map(pkg => [pkg.webBillingProduct.identifier, pkg])
    );
  }

  function normalizeError(error) {
    if (!(error instanceof PurchasesError)) return error;
    const normalized = new Error(error.message || "purchase failed");
    normalized.code = String(error.errorCode);
    normalized.userCancelled = error.errorCode === ErrorCode.UserCancelledError;
    return normalized;
  }

  return {
    async configure({ apiKey, appUserId }) {
      rc = Purchases.configure({ apiKey, appUserId });
      await offeringsIndex();
    },
    async price(productId) {
      const pkg = productIdToPackage.get(productId);
      return pkg ? pkg.webBillingProduct.price.formattedPrice : null;
    },
    async buy(productId) {
      const pkg = productIdToPackage.get(productId);
      if (!pkg) throw new Error("no such package");
      try {
        const { operationSessionId, redemptionInfo } = await rc.purchase({ rcPackage: pkg });
        return { orderId: operationSessionId || (redemptionInfo && redemptionInfo.redeemUrl) || `web-${productId}` };
      } catch (error) {
        throw normalizeError(error);
      }
    },
    async entitlements() {
      const info = await rc.getCustomerInfo();
      const active = (info && info.entitlements && info.entitlements.active) || {};
      return Object.values(active)
        .filter(e => e && e.isActive)
        .map(e => e.productIdentifier)
        .filter(Boolean);
    },
  };
}

// Expose the factory for the main bundle's runtime loader.
const g = (typeof self !== "undefined" ? self : globalThis);
g.__luckyWebBilling = g.__luckyWebBilling || {};
g.__luckyWebBilling.create = createWebBillingAdapter;
