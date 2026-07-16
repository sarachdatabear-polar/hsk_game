"use strict";
// Provider seam: the ONLY place a billing backend is chosen. Production uses
// RevenueCat only on native with a non-empty public SDK key; browser, file://,
// and not-yet-configured builds keep the mock behind the explicit dev flag.
//
// Interface (all async, never throw/reject):
//   kind: "mock" | "revenuecat"
//   available() -> boolean — a REAL provider's available() reflects
//                  SDK/platform readiness; the mock's always stays true
//                  (the dev flag, not available(), decides mock visibility —
//                  see gating.js)
//   supports(productId) -> boolean (only store-loaded products render)
//   supportsRestore() -> boolean
//   price(productId) -> localized store price string | null
//   purchase(productId) -> {ok:true, orderId}
//                        | {ok:false, reason:"cancelled"|"pending"|"failed"|"unavailable"}
//   restore() -> {ok:true, ownedProductIds} | {ok:false, reason}
//
// getProvider() is called eagerly at boot (main.js computes iapVisible then)
// and MUST construct cheaply and synchronously — put SDK init / platform
// readiness in available(), never in construction, or app boot stalls on it.
import { mockProvider } from "./provider-mock.js";
import { revenueCatProvider } from "./provider-revenuecat.js";
import { isNative } from "../native.js";
import {
  REVENUECAT_ANDROID_PUBLIC_KEY,
  REVENUECAT_PRODUCT_IDS,
  REVENUECAT_RESTORABLE_PRODUCT_IDS,
} from "./revenuecat-config.js";

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
  return mockProvider(opts);
}
