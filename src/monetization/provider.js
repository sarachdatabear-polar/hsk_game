"use strict";
// Provider seam: the ONLY place a billing backend is chosen. Production uses
// RevenueCat only on native with a non-empty public SDK key; browser, file://,
// and not-yet-configured builds keep the mock behind the explicit dev flag.
//
// Interface (all async, never throw/reject):
//   kind: "mock" | "revenuecat" | "revenuecat-web" | "stripe-web"
//   available() -> boolean — a REAL provider's available() reflects
//                  SDK/platform readiness; the mock's always stays true
//                  (the dev flag, not available(), decides mock visibility —
//                  see gating.js)
//   supports(productId) -> boolean (only store-loaded products render)
//   supportsRestore() -> boolean
//   price(productId) -> localized store price string | null
//   purchase(productId) -> {ok:true, orderId}
//                        | {ok:false, reason:"cancelled"|"pending"|"failed"|"unavailable"|"needs-account"}
//   restore() -> {ok:true, ownedProductIds} | {ok:false, reason}
//
// getProvider() is called eagerly at boot (main.js computes iapVisible then)
// and MUST construct cheaply and synchronously — put SDK init / platform
// readiness in available(), never in construction, or app boot stalls on it.
import { mockProvider } from "./provider-mock.js";
import { revenueCatProvider } from "./provider-revenuecat.js";
import { revenueCatWebProvider } from "./provider-revenuecat-web.js";
import { stripeWebProvider } from "./provider-stripe-web.js";
import { isNative } from "../native.js";
import {
  REVENUECAT_ANDROID_PUBLIC_KEY,
  REVENUECAT_PRODUCT_IDS,
  REVENUECAT_RESTORABLE_PRODUCT_IDS,
  REVENUECAT_WEB_PUBLIC_KEY,
  REVENUECAT_WEB_PRODUCT_IDS,
  REVENUECAT_WEB_RESTORABLE_PRODUCT_IDS,
} from "./revenuecat-config.js";
import { STRIPE_CHECKOUT_URL, STRIPE_WEB_PRODUCT_IDS } from "./stripe-config.js";

export function getProvider(opts = {}) {
  const rc = opts.revenuecat || {};
  const apiKey = rc.apiKey == null ? REVENUECAT_ANDROID_PUBLIC_KEY : rc.apiKey;
  const nativeCheck = rc.isNative || isNative;
  if (String(apiKey || "").trim() && nativeCheck()) {
    return revenueCatProvider({
      apiKey,
      isNative: nativeCheck,
      ensureUserId: opts.ensureUserId,
      productIds: rc.productIds || REVENUECAT_PRODUCT_IDS,
      restorableProductIds: rc.restorableProductIds || REVENUECAT_RESTORABLE_PRODUCT_IDS,
      sdk: rc.sdk,
    });
  }
  // PRECEDENCE: on web, Stripe beats RevenueCat Web Billing. RC Web Billing
  // cannot surface PromptPay (it offers card/Apple Pay/Google Pay only, and
  // RevenueCat — not the merchant — controls that list), and PromptPay is the
  // primary method for Thai buyers. THIS ordering is load-bearing: both
  // branches share the same web/non-native/non-file gates, so whichever comes
  // first wins.
  //
  // Native safety, however, does NOT come from sitting below the RevenueCat
  // branch — it comes from this branch's own `!stripeIsNative()` gate. Both
  // default to the same `isNative` import, so Android is protected even if the
  // order were reversed. Don't remove that gate on the belief that position
  // alone protects native.
  const stripe = opts.stripe || {};
  const checkoutUrl = stripe.checkoutUrl == null ? STRIPE_CHECKOUT_URL : stripe.checkoutUrl;
  const stripeIsNative = stripe.isNative || isNative;
  const stripeIsFile = stripe.isFileProtocol
    || (() => typeof location !== "undefined" && location.protocol === "file:");
  if (String(checkoutUrl || "").trim() && !stripeIsNative() && !stripeIsFile()) {
    return stripeWebProvider({
      checkoutUrl,
      productIds: stripe.productIds || STRIPE_WEB_PRODUCT_IDS,
      store: stripe.store || (opts.get && opts.set ? { get: opts.get, set: opts.set, remove: opts.remove } : null),
      isNative: stripeIsNative,
      isFileProtocol: stripeIsFile,
      ensureUserId: opts.ensureUserId,
      getAccessToken: stripe.getAccessToken,
      isAnonymous: stripe.isAnonymous,
      fetchEntitlements: stripe.fetchEntitlements,
    });
  }
  const rcw = opts.revenuecatWeb || {};
  const webKey = rcw.apiKey == null ? REVENUECAT_WEB_PUBLIC_KEY : rcw.apiKey;
  const webIsNative = rcw.isNative || isNative;
  const isFileProtocol = rcw.isFileProtocol
    || (() => typeof location !== "undefined" && location.protocol === "file:");
  if (String(webKey || "").trim() && !webIsNative() && !isFileProtocol()) {
    return revenueCatWebProvider({
      apiKey: webKey,
      isNative: webIsNative,
      ensureUserId: opts.ensureUserId,
      productIds: rcw.productIds || REVENUECAT_WEB_PRODUCT_IDS,
      restorableProductIds: rcw.restorableProductIds || REVENUECAT_WEB_RESTORABLE_PRODUCT_IDS,
      sdk: rcw.sdk,
    });
  }
  return mockProvider(opts);
}
