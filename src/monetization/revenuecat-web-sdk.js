"use strict";
// Real RevenueCat Web Billing bridge: maps @revenuecat/purchases-js to the
// { configure, price, buy, entitlements } adapter that provider-revenuecat-web.js
// consumes. Lazy-imported so the SDK never loads at boot / on file:// / native.
// This is the real-SDK edge (like native.js's Capacitor bridge): verified in a
// sandbox purchase, not unit-tested against the live SDK.
//
// Verified against installed @revenuecat/purchases-js@1.48.1
// (node_modules/@revenuecat/purchases-js/dist/Purchases.es.d.ts):
//   - Purchases.configure() takes a single { apiKey, appUserId } config object;
//     the legacy (apiKey, appUserId) positional overload still exists but is
//     @deprecated, so the object form is used here.
//   - Package.webBillingProduct.currentPrice is @deprecated in favor of
//     Package.webBillingProduct.price (same { formattedPrice } shape).
//   - Purchase errors are a PurchasesError with a numeric `errorCode`
//     (ErrorCode enum), not the `{ code, userCancelled }` shape that
//     provider-revenuecat-web.js's failureReason() checks for (that shape
//     matches the native Capacitor SDK, not this one) — normalized below so
//     cancelled/pending purchases are still classified correctly upstream.
export async function loadWebBillingSdk() {
  const { Purchases, ErrorCode, PurchasesError } = await import("@revenuecat/purchases-js");
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
