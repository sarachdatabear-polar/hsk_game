"use strict";
// Runtime loader for the separately-built web-billing bundle (dist/webbilling.js).
// The heavy RevenueCat Web SDK lives in that bundle, NOT in dist/app.js, so the
// precached shell stays lean. Injects the script once (only reached off-native and
// not on file:// — the getProvider web branch already gates that), then returns the
// { configure, price, buy, entitlements } adapter built there.
const SCRIPT_PATH = "dist/webbilling.js";

function injectScript(src) {
  return new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("webbilling bundle failed to load"));
    document.head.appendChild(el);
  });
}

export async function loadWebBillingSdk(opts = {}) {
  const inject = opts.injectScript || injectScript;
  const scope = opts.scope || (typeof self !== "undefined" ? self : globalThis);
  const ready = () => scope.__luckyWebBilling && typeof scope.__luckyWebBilling.create === "function";
  if (!ready()) await inject(opts.src || SCRIPT_PATH);
  if (!ready()) throw new Error("webbilling bundle did not initialize");
  return scope.__luckyWebBilling.create();
}
