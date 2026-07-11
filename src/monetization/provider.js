"use strict";
// Provider seam: the ONLY place a billing backend is chosen. v1 always
// returns the mock; the RevenueCat provider (future slice, Capacitor plugin
// via the native.js pattern) slots in here behind the same interface
// without touching any call site.
//
// Interface (all async, never throw/reject):
//   available() -> boolean
//   purchase(productId) -> {ok:true, orderId}
//                        | {ok:false, reason:"cancelled"|"failed"|"unavailable"}
//   restore() -> {ok:true, ownedProductIds} | {ok:false, reason}
import { mockProvider } from "./provider-mock.js";

export function getProvider(opts) {
  return mockProvider(opts);
}
