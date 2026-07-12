"use strict";
// IAP visibility rule (go-live plan §4 T1): a real billing backend shows the
// purchase UI on its own; the mock only shows behind the dev flag.
export async function iapVisible(provider, devFlag) {
  if (devFlag) return true;
  if (!provider || provider.kind === "mock") return false;
  return !!(await provider.available());
}
