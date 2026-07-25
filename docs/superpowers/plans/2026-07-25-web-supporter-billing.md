# Web Supporter Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sell the one-time `supporter` unlock on the web/PWA via RevenueCat Web Billing (Stripe + PromptPay), cross-platform through the existing Supabase-UUID identity.

**Architecture:** Add one new provider (`provider-revenuecat-web.js`) implementing the existing provider seam interface, plus a `getProvider()` web branch that selects it when not-native + a web key is set + not `file://`. A thin `revenuecat-web-sdk.js` adapter maps `@revenuecat/purchases-js` to a small injectable interface so the provider is fully unit-testable without a browser. The existing `rc-webhook` (store-agnostic), account/OTP flow, and purchase-poll/reconcile path are reused unchanged.

**Tech Stack:** Vanilla JS, esbuild, Vitest; `@revenuecat/purchases-js` (Web Billing SDK); existing Supabase auth + `rc-webhook`.

## Global Constraints

- Provider interface (all methods async, NEVER throw/reject; failures resolve `{ok:false, reason}`): `kind`, `available()`, `supports(id)`, `supportsRestore()`, `price(id)`, `purchase(id)`, `restore()`. — from spec §3.2, `provider.js`.
- RevenueCat App User ID **must** be the Supabase UUID; never an email or SDK-generated anon id. Reject a non-UUID identity (fail closed). — spec §3.2.
- **Construct cheaply and synchronously.** No SDK init / network in the constructor; SDK configure + product/price fetch happen inside `available()`/`ready()`. — spec §3.2, `provider.js` boot contract.
- **Degrade to mock cleanly:** on `file://`, offline, or missing web key, `available()` resolves false and the seam keeps the mock. A web-billing failure must never block boot or throw. — spec §3.2.
- Prices come from RevenueCat's localized price string, never hard-coded (`products.js` prices are mock-era display only). — spec §4.
- **Native path unchanged** — `provider-revenuecat.js` and its selection are not modified; add-only. — spec §9.
- Precache byte pin is tight (HANDOFF) — the precache/`assets:validate` size test must stay green, or the pin is adjusted deliberately in the same commit. — spec §7.
- Product under test: `supporter` (entitlement `supporter`, 2,000 coins, 79฿ / $2.99) — already in `products.js PRODUCTS`.
- Webhook is store-agnostic (grants on `INITIAL_PURCHASE`/`NON_RENEWING_PURCHASE`) — **no webhook change in this plan.**

---

### Task 1: Web billing config

**Files:**
- Modify: `src/monetization/revenuecat-config.js`
- Test: `test/revenuecat-config.test.js`

**Interfaces:**
- Consumes: `PRODUCTS` from `products.js` (has `supporter`).
- Produces: `REVENUECAT_WEB_PUBLIC_KEY: string`, `REVENUECAT_WEB_PRODUCT_IDS: string[]` (`["supporter"]`), `REVENUECAT_WEB_RESTORABLE_PRODUCT_IDS: string[]` (`["supporter"]`).

- [ ] **Step 1: Write the failing test** — append to `test/revenuecat-config.test.js`:

```js
import {
  REVENUECAT_WEB_PUBLIC_KEY,
  REVENUECAT_WEB_PRODUCT_IDS,
  REVENUECAT_WEB_RESTORABLE_PRODUCT_IDS,
} from "../src/monetization/revenuecat-config.js";

describe("revenuecat-config web billing", () => {
  it("web key is a string (blank until RC Web Billing is configured)", () => {
    expect(typeof REVENUECAT_WEB_PUBLIC_KEY).toBe("string");
  });
  it("web sells the supporter unlock only", () => {
    expect(REVENUECAT_WEB_PRODUCT_IDS).toEqual(["supporter"]);
  });
  it("every web product id exists in the catalog", () => {
    const catalogIds = new Set(PRODUCTS.map((p) => p.id));
    for (const id of REVENUECAT_WEB_PRODUCT_IDS) expect(catalogIds.has(id)).toBe(true);
  });
  it("web restorable ids are a subset of the web product ids", () => {
    for (const id of REVENUECAT_WEB_RESTORABLE_PRODUCT_IDS) {
      expect(REVENUECAT_WEB_PRODUCT_IDS).toContain(id);
    }
  });
  it("supporter is a non-consumable (has an entitlement) so it can restore", () => {
    const supporter = PRODUCTS.find((p) => p.id === "supporter");
    expect(supporter && supporter.entitlement).toBe("supporter");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/revenuecat-config.test.js`
Expected: FAIL — `REVENUECAT_WEB_PUBLIC_KEY` is not exported.

- [ ] **Step 3: Add the web exports** — append to `src/monetization/revenuecat-config.js`:

```js
// Public, non-secret RevenueCat Web Billing (Stripe) client config. Blank key
// until RC Web Billing is configured in the dashboard — a blank key leaves the
// web purchase UI dark (getProvider falls back to the mock). Web sells the
// one-time supporter unlock only; coin packs (consumables) are deferred.
export const REVENUECAT_WEB_PUBLIC_KEY = "";
export const REVENUECAT_WEB_PRODUCT_IDS = ["supporter"];
export const REVENUECAT_WEB_RESTORABLE_PRODUCT_IDS = ["supporter"];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/revenuecat-config.test.js`
Expected: PASS (all, old + new).

- [ ] **Step 5: Commit**

```bash
git add src/monetization/revenuecat-config.js test/revenuecat-config.test.js
git commit -m "feat(web-iap): web billing config (supporter, blank key = dark)"
```

---

### Task 2: The web billing provider

**Files:**
- Create: `src/monetization/provider-revenuecat-web.js`
- Test: `test/provider-revenuecat-web.test.js`

**Interfaces:**
- Consumes: `productById` from `products.js`; an injected `sdk` adapter (Task 4 supplies the real one) with this exact shape (all async, may throw):
  - `configure({ apiKey, appUserId }) -> Promise<void>`
  - `price(productId) -> Promise<string|null>` (localized formatted price)
  - `buy(productId) -> Promise<{ orderId: string }>` (throws on cancel/fail; thrown error may carry `.userCancelled === true` or `.code` where `"1"` = cancelled, `"20"` = pending)
  - `entitlements() -> Promise<string[]>` (active restorable productIds)
- Produces: `export function revenueCatWebProvider(opts) -> provider` honoring the Global-Constraints interface. `opts`: `{ sdk, apiKey, isNative, ensureUserId, productIds, restorableProductIds }`.

- [ ] **Step 1: Write the failing test** — create `test/provider-revenuecat-web.test.js`:

```js
import { describe, it, expect, vi } from "vitest";
import { revenueCatWebProvider } from "../src/monetization/provider-revenuecat-web.js";

const USER_A = "11111111-1111-4111-8111-111111111111";

function sdkWith(over = {}) {
  return {
    configure: vi.fn(async () => {}),
    price: vi.fn(async () => "฿79.00"),
    buy: vi.fn(async () => ({ orderId: "rcb_txn_1" })),
    entitlements: vi.fn(async () => []),
    ...over,
  };
}

function provider(overrides = {}) {
  const sdk = overrides.sdk || sdkWith();
  return { sdk, p: revenueCatWebProvider({
    sdk,
    apiKey: "rcb_web_key",
    isNative: () => false,
    ensureUserId: async () => USER_A,
    productIds: ["supporter"],
    restorableProductIds: ["supporter"],
    ...overrides,
  }) };
}

describe("web provider readiness", () => {
  it("kind is revenuecat-web and it constructs synchronously", () => {
    const { p } = provider();
    expect(p.kind).toBe("revenuecat-web");
    expect(typeof p.available).toBe("function");
  });

  it("configures with the Supabase UUID and reports available + price", async () => {
    const { sdk, p } = provider();
    expect(await p.available()).toBe(true);
    expect(sdk.configure).toHaveBeenCalledWith({ apiKey: "rcb_web_key", appUserId: USER_A });
    expect(p.supports("supporter")).toBe(true);
    expect(p.price("supporter")).toBe("฿79.00");
  });

  it("fails closed on native, missing key, or a non-UUID identity", async () => {
    expect(await provider({ isNative: () => true }).p.available()).toBe(false);
    expect(await provider({ apiKey: "" }).p.available()).toBe(false);
    expect(await provider({ ensureUserId: async () => "me@example.com" }).p.available()).toBe(false);
  });

  it("coalesces concurrent initialization", async () => {
    const { sdk, p } = provider();
    expect(await Promise.all([p.available(), p.available()])).toEqual([true, true]);
    expect(sdk.configure).toHaveBeenCalledTimes(1);
  });

  it("purchase returns ok + orderId on success", async () => {
    const { p } = provider();
    await p.available();
    expect(await p.purchase("supporter")).toEqual({ ok: true, orderId: "rcb_txn_1" });
  });

  it("purchase maps cancel / pending / failure to reasons", async () => {
    const cancel = provider({ sdk: sdkWith({ buy: vi.fn(async () => { throw { userCancelled: true }; }) }) });
    await cancel.p.available();
    expect(await cancel.p.purchase("supporter")).toEqual({ ok: false, reason: "cancelled" });

    const pending = provider({ sdk: sdkWith({ buy: vi.fn(async () => { throw { code: "20" }; }) }) });
    await pending.p.available();
    expect(await pending.p.purchase("supporter")).toEqual({ ok: false, reason: "pending" });

    const failed = provider({ sdk: sdkWith({ buy: vi.fn(async () => { throw new Error("boom"); }) }) });
    await failed.p.available();
    expect(await failed.p.purchase("supporter")).toEqual({ ok: false, reason: "failed" });
  });

  it("purchase is unavailable for an unknown product or when not ready", async () => {
    const { p } = provider({ apiKey: "" });
    expect(await p.purchase("supporter")).toEqual({ ok: false, reason: "unavailable" });
    const { p: p2 } = provider();
    await p2.available();
    expect(await p2.purchase("coins_s")).toEqual({ ok: false, reason: "unavailable" });
  });

  it("restore returns active restorable entitlement product ids", async () => {
    const { p } = provider({ sdk: sdkWith({ entitlements: vi.fn(async () => ["supporter", "coins_s"]) }) });
    expect(await p.restore()).toEqual({ ok: true, ownedProductIds: ["supporter"] });
  });

  it("restore fails closed when identity is unavailable", async () => {
    const { p } = provider({ apiKey: "" });
    expect(await p.restore()).toEqual({ ok: false, reason: "unavailable" });
  });

  it("supportsRestore reflects a loaded restorable product", async () => {
    const { p } = provider();
    await p.available();
    expect(p.supportsRestore()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/provider-revenuecat-web.test.js`
Expected: FAIL — module `provider-revenuecat-web.js` not found.

- [ ] **Step 3: Write the provider** — create `src/monetization/provider-revenuecat-web.js`:

```js
"use strict";
import { productById } from "./products.js";

// Matches the UUID guard in provider-revenuecat.js (kept local to avoid
// touching the native provider; both reject anything that isn't a Supabase uid).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PURCHASE_CANCELLED_ERROR = "1";
const PAYMENT_PENDING_ERROR = "20";

function failureReason(error) {
  const code = String(error && error.code != null ? error.code : "");
  if ((error && error.userCancelled) || code === PURCHASE_CANCELLED_ERROR) return "cancelled";
  if (code === PAYMENT_PENDING_ERROR) return "pending";
  return "failed";
}

// RevenueCat Web Billing implementation of the provider seam. The SDK adapter
// (revenuecat-web-sdk.js) is injectable so every branch is covered in plain
// Vitest without a browser. Mirrors provider-revenuecat.js structure.
export function revenueCatWebProvider(opts = {}) {
  const sdk = opts.sdk;
  const apiKey = String(opts.apiKey || "").trim();
  const productIds = [...new Set(opts.productIds || [])].filter(id => productById(id));
  const restorableIds = new Set((opts.restorableProductIds || []).filter(id => productIds.includes(id)));
  const ensureUserId = typeof opts.ensureUserId === "function" ? opts.ensureUserId : async () => null;
  const isNative = typeof opts.isNative === "function" ? opts.isNative : () => false;
  const prices = new Map();
  let configured = false;
  let loaded = false;
  let initTask = null;

  async function ensureIdentity() {
    // Web billing only runs off-native with a real key and a Supabase UUID.
    if (!apiKey || isNative() || !sdk) return false;
    const userId = await ensureUserId();
    if (typeof userId !== "string" || !UUID.test(userId)) return false;
    if (!configured) {
      await sdk.configure({ apiKey, appUserId: userId });
      configured = true;
    }
    return true;
  }

  async function loadPrices() {
    if (!(await ensureIdentity())) return false;
    if (!loaded) {
      for (const id of productIds) {
        const price = await sdk.price(id);
        if (typeof price === "string") prices.set(id, price);
      }
      loaded = true;
    }
    return prices.size > 0;
  }

  async function ready() {
    if (!initTask) initTask = loadPrices().catch(() => false).finally(() => { initTask = null; });
    return initTask;
  }

  return {
    kind: "revenuecat-web",
    async available() { return !!(await ready()); },
    supports(productId) { return prices.has(productId); },
    supportsRestore() { return [...restorableIds].some(id => prices.has(id)); },
    price(productId) {
      const p = prices.get(productId);
      return typeof p === "string" ? p : null;
    },
    async purchase(productId) {
      try {
        if (!productIds.includes(productId) || !(await ready())) return { ok: false, reason: "unavailable" };
        const result = await sdk.buy(productId);
        const orderId = result && result.orderId;
        return orderId ? { ok: true, orderId } : { ok: false, reason: "failed" };
      } catch (error) {
        return { ok: false, reason: failureReason(error) };
      }
    },
    async restore() {
      try {
        if (!(await ensureIdentity())) return { ok: false, reason: "unavailable" };
        const active = await sdk.entitlements();
        const ownedProductIds = [...new Set((active || []).filter(id => restorableIds.has(id)))];
        return { ok: true, ownedProductIds };
      } catch (error) {
        return { ok: false, reason: failureReason(error) };
      }
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/provider-revenuecat-web.test.js`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/monetization/provider-revenuecat-web.js test/provider-revenuecat-web.test.js
git commit -m "feat(web-iap): RevenueCat Web Billing provider (injectable, unit-tested)"
```

---

### Task 3: `getProvider()` web branch

**Files:**
- Modify: `src/monetization/provider.js`
- Test: `test/provider.test.js`

**Interfaces:**
- Consumes: `revenueCatWebProvider` (Task 2); `REVENUECAT_WEB_PUBLIC_KEY`, `REVENUECAT_WEB_PRODUCT_IDS`, `REVENUECAT_WEB_RESTORABLE_PRODUCT_IDS` (Task 1).
- Produces: `getProvider(opts)` returns the web provider when **not native + web key set + not `file://`**; native branch and mock fallback unchanged. New injectable `opts.revenuecatWeb` bag: `{ apiKey, isNative, isFileProtocol, ensureUserId, productIds, restorableProductIds, sdk }`.

- [ ] **Step 1: Write the failing test** — append to `test/provider.test.js`:

```js
// Web-billing selection. Inject a non-empty web key + not-native + not-file://.
const webOpts = (over) => ({
  revenuecat: { apiKey: "", isNative: () => false },   // keep native branch off
  revenuecatWeb: { apiKey: "rcb_web_key", isNative: () => false, isFileProtocol: () => false, sdk: {}, ...over },
});

describe("getProvider web selection", () => {
  it("web key + not native + not file:// -> revenuecat-web", () => {
    expect(getProvider(webOpts()).kind).toBe("revenuecat-web");
  });
  it("blank web key -> mock", () => {
    expect(getProvider(webOpts({ apiKey: "" })).kind).toBe("mock");
  });
  it("native takes the native branch, never web", () => {
    // Native key set + native true -> native; web opts ignored.
    const p = getProvider({
      revenuecat: { apiKey: "goog_key", isNative: () => true, sdk: {} },
      revenuecatWeb: { apiKey: "rcb_web_key", isNative: () => true, isFileProtocol: () => false, sdk: {} },
    });
    expect(p.kind).toBe("revenuecat");
  });
  it("file:// -> mock (never web)", () => {
    expect(getProvider(webOpts({ isFileProtocol: () => true })).kind).toBe("mock");
  });
  it("no opts -> mock (shipped keys are blank)", () => {
    expect(getProvider().kind).toBe("mock");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/provider.test.js`
Expected: FAIL — web opts still resolve to `mock`.

- [ ] **Step 3: Add the web branch** — edit `src/monetization/provider.js`. Add imports:

```js
import { revenueCatWebProvider } from "./provider-revenuecat-web.js";
import {
  REVENUECAT_ANDROID_PUBLIC_KEY,
  REVENUECAT_PRODUCT_IDS,
  REVENUECAT_RESTORABLE_PRODUCT_IDS,
  REVENUECAT_WEB_PUBLIC_KEY,
  REVENUECAT_WEB_PRODUCT_IDS,
  REVENUECAT_WEB_RESTORABLE_PRODUCT_IDS,
} from "./revenuecat-config.js";
```

In `getProvider(opts)`, **after** the existing native `if (...) return revenueCatProvider(...)` block and **before** `return mockProvider(opts)`, insert:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/provider.test.js test/provider-revenuecat-web.test.js`
Expected: PASS — web cases pass, all existing native/mock selection cases still pass.

- [ ] **Step 5: Commit**

```bash
git add src/monetization/provider.js test/provider.test.js
git commit -m "feat(web-iap): getProvider() web branch (not-native + key + not file://)"
```

---

### Task 4: Real `@revenuecat/purchases-js` adapter + dependency + size check

**Files:**
- Create: `src/monetization/revenuecat-web-sdk.js`
- Test: `test/revenuecat-web-sdk.test.js`
- Modify: `package.json` (dependency)

**Interfaces:**
- Produces: `export function loadWebBillingSdk() -> Promise<adapter>` where `adapter` has the exact `{ configure, price, buy, entitlements }` shape Task 2 consumes. Lazy-imports `@revenuecat/purchases-js` so it never loads at boot on unsupported contexts.

> **NOTE for implementer:** the four adapter methods are OUR stable interface; only their *internals* map to the installed SDK. `@revenuecat/purchases-js` is Offerings/Packages-based. **Verify the exact method/property names against the installed package's TypeScript types / README before finalizing** (this adapter is the real-SDK bridge — like the native Capacitor bridge it is manually sandbox-verified, not unit-tested against the real SDK). The reference below maps to the current Web SDK shape (`Purchases.configure`, `getOfferings`, `purchase`, `getCustomerInfo`); adjust names if the installed version differs.

- [ ] **Step 1: Add the dependency**

Run: `npm install @revenuecat/purchases-js`
Expected: added to `package.json` dependencies; `package-lock.json` updated.

- [ ] **Step 2: Write the smoke test** — create `test/revenuecat-web-sdk.test.js`:

```js
import { describe, it, expect } from "vitest";
import { loadWebBillingSdk } from "../src/monetization/revenuecat-web-sdk.js";

describe("revenuecat-web-sdk loader", () => {
  it("exports an async factory (real SDK lazy-loaded, not at import time)", () => {
    expect(typeof loadWebBillingSdk).toBe("function");
    // Must not throw synchronously / must not import the SDK eagerly.
    expect(() => loadWebBillingSdk).not.toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run test/revenuecat-web-sdk.test.js`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the adapter** — create `src/monetization/revenuecat-web-sdk.js`:

```js
"use strict";
// Real RevenueCat Web Billing bridge: maps @revenuecat/purchases-js to the
// { configure, price, buy, entitlements } adapter that provider-revenuecat-web.js
// consumes. Lazy-imported so the SDK never loads at boot / on file:// / native.
// This is the real-SDK edge (like native.js's Capacitor bridge): verified in a
// sandbox purchase, not unit-tested against the live SDK. Verify method names
// against the installed @revenuecat/purchases-js version.
export async function loadWebBillingSdk() {
  const { Purchases } = await import("@revenuecat/purchases-js");
  let rc = null;
  let productIdToPackage = new Map();

  async function offeringsIndex() {
    const offerings = await rc.getOfferings();
    const packages = (offerings && offerings.current && offerings.current.availablePackages) || [];
    productIdToPackage = new Map(
      packages.map(pkg => [pkg.webBillingProduct.identifier, pkg])
    );
  }

  return {
    async configure({ apiKey, appUserId }) {
      rc = Purchases.configure(apiKey, appUserId);
      await offeringsIndex();
    },
    async price(productId) {
      const pkg = productIdToPackage.get(productId);
      return pkg ? pkg.webBillingProduct.currentPrice.formattedPrice : null;
    },
    async buy(productId) {
      const pkg = productIdToPackage.get(productId);
      if (!pkg) throw new Error("no such package");
      const { operationSessionId, redemptionInfo } = await rc.purchase({ rcPackage: pkg });
      return { orderId: operationSessionId || (redemptionInfo && redemptionInfo.redeemUrl) || `web-${productId}` };
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run test/revenuecat-web-sdk.test.js`
Expected: PASS.

- [ ] **Step 6: Build + precache size check** (Global Constraint — tight pin)

Run: `npm run build && npm test`
Expected: build clean; full suite green **including the precache/`assets:validate` size test**. If the size test fails because `purchases-js` pushed the bundle past the precache byte pin, confirm the SDK is only in the lazy-imported path (not the always-loaded shell), then adjust the pin in the same commit with a one-line note. Do NOT mask the test exit code.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/monetization/revenuecat-web-sdk.js test/revenuecat-web-sdk.test.js
git commit -m "feat(web-iap): @revenuecat/purchases-js adapter (lazy) + bundle size check"
```

---

### Task 5: Web Supporter copy (i18n, EN + TH)

**Files:**
- Modify: `src/i18n.js`
- Test: whichever test enforces EN/TH key parity (`test/i18n-usage.test.js` and/or `test/i18n.test.js`)

**Interfaces:**
- Produces: i18n keys for the web Supporter offer, framed as support + cosmetic + badge + 2,000 coins + ad-free-on-mobile (spec §4). Reuse the existing IAP section's key naming; add only what is missing for the `supporter` product on web.

- [ ] **Step 1: Find the existing IAP/product i18n keys**

Run: `grep -n "supporter\|iap\.\|product\." src/i18n.js | head -40`
Expected: shows the existing `iap.*` / product-copy key block and its EN/TH structure. Match it.

- [ ] **Step 2: Write/adjust the parity test** — ensure the parity test asserts the new keys exist in both `en` and `th`. If the suite already derives keys and checks parity automatically, add an explicit presence assertion in `test/i18n.test.js`:

```js
it("web supporter offer copy exists in en + th", () => {
  for (const lang of ["en", "th"]) {
    expect(STRINGS[lang]["iap.supporter.web.title"]).toBeTruthy();
    expect(STRINGS[lang]["iap.supporter.web.blurb"]).toBeTruthy();
  }
});
```

(Adjust `STRINGS`/import and key names to the file's actual shape found in Step 1.)

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run test/i18n.test.js`
Expected: FAIL — keys missing.

- [ ] **Step 4: Add the copy** — in `src/i18n.js`, add to both `en` and `th` (match the file's existing structure/quoting):

```js
// en
"iap.supporter.web.title": "Become a Supporter",
"iap.supporter.web.blurb": "Support the project — a thank-you cosmetic, a Supporter badge, 2,000 coins, and ad-free on the mobile app. One payment, yours everywhere.",
// th
"iap.supporter.web.title": "เป็นผู้สนับสนุน",
"iap.supporter.web.blurb": "สนับสนุนโปรเจกต์ — ไอเทมขอบคุณ ตราผู้สนับสนุน เหรียญ 2,000 และไม่มีโฆษณาบนแอปมือถือ จ่ายครั้งเดียว ใช้ได้ทุกที่",
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run test/i18n.test.js test/i18n-usage.test.js`
Expected: PASS (parity holds).

- [ ] **Step 6: Commit**

```bash
git add src/i18n.js test/i18n.test.js
git commit -m "feat(web-iap): web Supporter offer copy (EN + TH)"
```

---

### Task 6: Wire the web provider into main.js + restore/email affordances (browser-verified)

**Files:**
- Modify: `src/main.js` (provider construction + post-purchase email nudge + restore entry)
- No unit test (main.js wiring is untested by design — browser-verified).

**Interfaces:**
- Consumes: `getProvider` (now with the web branch), `loadWebBillingSdk` (Task 4), existing `ensureGuest`/account panel, `iapVisible`/`renderIapSections`/`iapBuy`.

- [ ] **Step 1: Pass web opts into `getProvider`** — in `src/main.js` where `iapProvider = getProvider({...})` is built (~line 194), add a `revenuecatWeb` bag alongside the existing `revenuecat` one, sharing the same `ensureUserId`, and supply the lazy adapter. Import at top: `import { loadWebBillingSdk } from "./monetization/revenuecat-web-sdk.js";`. Because `getProvider` must construct synchronously, resolve the adapter once before first use — build the provider with a pre-resolved `sdk` by awaiting `loadWebBillingSdk()` inside the existing async boot path that already computes `iapVisible`, OR pass `sdk` as the resolved adapter. Concretely, gate on being off-native + not file:// before loading:

```js
// near the top-level IAP boot (where iapVisible(provider(), ...) is called)
async function buildProvider() {
  const base = {
    ensureUserId: async () => {
      const r = await ensureGuest(getLocale(), playerProfile.displayName || undefined);
      renderAccount();
      return r && r.ok && r.session && r.session.user ? r.session.user.id : null;
    },
    revenuecat: { /* existing native opts unchanged */ },
  };
  if (!isNative() && (typeof location === "undefined" || location.protocol !== "file:")) {
    try { base.revenuecatWeb = { sdk: await loadWebBillingSdk() }; } catch (e) { /* stay on mock */ }
  }
  return getProvider(base);
}
```

Replace the eager `getProvider({...})` memo with a memoized async `buildProvider()` result used by the existing `iapVisible(...).then(...)` boot line and by `iapBuy`. Keep the native path's opts exactly as they are today (move them verbatim into `base.revenuecat`).

- [ ] **Step 2: Post-purchase email nudge** — in the success branch of `iapBuy` (after a granted purchase), if the account state is anonymous (`accountState(session) !== "signedIn"`), show a non-blocking toast/CTA routing into the existing account panel: `toast(t("account.saveUnlock"))` and reveal the account tab. Add `account.saveUnlock` copy (EN: "Add your email to save your unlock and use it on mobile." / TH equivalent) to `i18n.js` in this commit. Never block play; never force it.

- [ ] **Step 3: Restore affordance** — ensure the IAP/settings area exposes a "Restore purchase" control on web that calls the provider's `restore()` and, on `{ok:true, ownedProductIds}`, applies the entitlement via the existing restore path (`restoreFrom` in `purchases.js`), then routes to the account panel to enter an email if anonymous. Reuse existing restore wiring if present; only add the web entry point.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 5: Browser-verify (headless Chromium, EN + TH)** — serve the built app and confirm, with the web key still blank (mock path) AND with a temporary test web key if available in sandbox:
  - With blank web key: no purchase UI leaks in prod (mock stays hidden unless `nbhsk.dev.iap`), zero console errors, boot not blocked.
  - Dev-flag on (`localStorage nbhsk.dev.iap = true`): the Supporter offer renders with the web copy; `iapBuy` runs the mock happy path; post-purchase email nudge appears for an anonymous user and routes to the account panel; "Restore purchase" invokes `restore()` without errors.

Run: `npm run serve` (separate shell) then a headless Chromium probe of the shop/IAP screen.
Expected: the above hold; 0 page errors.

- [ ] **Step 6: Full gate + commit**

Run: `npm run lint && npm test`
Expected: lint 0, full suite green.

```bash
git add src/main.js src/i18n.js
git commit -m "feat(web-iap): wire web billing provider + email-save + restore affordances"
```

---

## Self-Review

**Spec coverage:**
- §3.1 identity reuse → Task 6 Step 1 (`ensureUserId` → Supabase UUID; email nudge Step 2). ✓
- §3.2 web provider (interface, boot-cheap, fail-closed, identity guard) → Task 2. ✓
- §3.3 seam branch (not-native + key + not file://) → Task 3. ✓
- §3.4 purchase→entitlement via existing webhook/poll → Task 6 (reuses `iapBuy`/`restoreFrom`/poll; no webhook change per Global Constraints). ✓
- §4 product framing / price from RC → Task 5 copy; price via `sdk.price` (Task 2/4), never hard-coded. ✓
- §5 UI touchpoints (buy CTA via `iapVisible`, email-at-purchase, restore) → Task 6 Steps 2–3. ✓
- §6 owner config → not code; blank keys keep it dark (Task 1). ✓
- §7 testing (unit web provider, seam, gating, bundle size, sandbox) → Tasks 2/3/4; gating already covered by existing `gating.test.js` (provider-agnostic — `kind !== "mock"` shows UI), sandbox = Task 6 Step 5 + owner. ✓
- §8 risks (bundle pin, absent key, account reachable, anti-steering) → Task 4 Step 6, Task 1, Task 6 Step 5. ✓

**Placeholder scan:** No TBD/TODO. The only "verify against installed SDK" note (Task 4) is the deliberate real-bridge boundary, with a concrete reference implementation shown. i18n key names in Task 5 are marked "adjust to file's actual shape" because the exact `i18n.js` structure must be read first — Step 1 forces that read before Step 4 writes.

**Type consistency:** adapter interface `{ configure({apiKey,appUserId}), price(id)->string|null, buy(id)->{orderId}, entitlements()->string[] }` is identical across Task 2 (consumer/fake), Task 4 (real producer). `revenueCatWebProvider(opts)` signature and `kind:"revenuecat-web"` consistent across Tasks 2/3. Web config export names identical across Tasks 1/3.
