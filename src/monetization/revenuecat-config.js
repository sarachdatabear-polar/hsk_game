"use strict";
// Public, non-secret RevenueCat client configuration. Keep the Android SDK
// key blank until the Play app exists in RevenueCat; a blank key leaves the
// production purchase UI dark and preserves the browser mock/dev flow.
//
// Coin packs launch first. Add "supporter" only after its ad-removal benefit
// is implemented and the matching Play product + RevenueCat entitlement are
// ready. Store prices always come from RevenueCat, never from this file.
export const REVENUECAT_ANDROID_PUBLIC_KEY = "";
export const REVENUECAT_PRODUCT_IDS = ["coins_s", "coins_m", "coins_l", "coins_xl"];
export const REVENUECAT_RESTORABLE_PRODUCT_IDS = [];
