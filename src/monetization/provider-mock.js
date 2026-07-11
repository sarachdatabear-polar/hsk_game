"use strict";
// Mock IAP provider — the dev/browser stand-in behind getProvider()
// (provider.js). Same contract the RevenueCat provider must honor: all
// methods async and NEVER throw/reject (cloud.js precedent) — failures
// resolve {ok:false, reason}. Storage is injected (get/set from main.js's
// `store`) so this module stays storage-free and unit-testable.
//
// Dev keys (all under the caller's nbhsk.* namespace):
//   dev.iapOwned - string[] of purchased non-consumable productIds (restore)
//   dev.iapFail  - "cancelled" | "failed": next purchase resolves that way,
//                  then the flag clears (one-shot)
//   dev.iapSeq   - persisted counter so orderIds stay unique across reloads
//                  (a reused orderId would trip applyPurchase's idempotency)
import { productById } from "./products.js";

export const MOCK_DELAY_MS = 600;

export function mockProvider(opts) {
  const { get, set } = opts;
  const delayMs = opts.delayMs == null ? MOCK_DELAY_MS : opts.delayMs;
  const wait = () => new Promise(res => setTimeout(res, delayMs));
  return {
    async available() { return true; },
    async purchase(productId) {
      await wait();
      const p = productById(productId);
      if (!p) return { ok: false, reason: "failed" };
      const forced = get("dev.iapFail", "");
      if (forced === "cancelled" || forced === "failed") {
        set("dev.iapFail", "");
        return { ok: false, reason: forced };
      }
      const seq = (Number(get("dev.iapSeq", 0)) || 0) + 1;
      set("dev.iapSeq", seq);
      if (p.entitlement) {
        const owned = get("dev.iapOwned", []);
        if (!owned.includes(productId)) set("dev.iapOwned", [...owned, productId]);
      }
      return { ok: true, orderId: `mock-${seq}-${productId}` };
    },
    async restore() {
      await wait();
      return { ok: true, ownedProductIds: get("dev.iapOwned", []) };
    },
  };
}
