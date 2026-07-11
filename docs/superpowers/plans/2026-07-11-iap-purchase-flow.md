# IAP Purchase Flow v1 (Mock Provider) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Purchasable coin packs + Supporter unlock in the shop, driven by a mock billing provider behind a swap-ready interface, shipped dark behind a dev flag.

**Architecture:** Three pure modules in `src/monetization/` (catalog, grant/entitlement logic, provider seam) following the `interstitial-policy.js` house pattern; `main.js` owns persistence (`nbhsk.ent`, `nbhsk.wallet`) and DOM wiring. The mock provider is the only impure edge and follows `cloud.js`'s never-throw contract with injected storage.

**Tech Stack:** Vanilla JS ES modules, esbuild bundle, vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-11-iap-purchase-flow-design.md` (approved 2026-07-11).

## Global Constraints

- Work happens in the **game repo** (`/root/work/HSK/game`), branch `feat/iap-purchase-v1` cut from `development`. Never stage `game/` from the root repo.
- Pure modules (`products.js`, `purchases.js`) must not touch DOM, localStorage, or `Date.now()` — `now` is always passed in (house pattern: `src/monetization/interstitial-policy.js`).
- Provider contract: all methods async, **never throw/reject** — failures resolve `{ok:false, reason}` (same contract as `src/cloud.js`).
- Prices live **only** in `src/monetization/products.js`, exactly per PRD §7.1: supporter 79฿/$2.99, coins_s 29฿/$0.99/1000, coins_m 99฿/$2.99/3500, coins_l 169฿/$4.99/6500, coins_xl 329฿/$9.99/15000. Supporter also grants 2,000 coins.
- Every new i18n key gets an `en` **and** `th` entry (enforced by `test/i18n-usage.test.js`).
- All IAP UI renders only when `iapEnabled()` (localStorage `nbhsk.dev.iap`). Production default: invisible.
- `nbhsk.ent` is deliberately **not** added to `SYNC_KEYS` (entitlements become server-authoritative in the RevenueCat slice).
- Run `npm test` bare — never piped through `tail`/`grep` (exit code must gate commits).
- Ship step bumps `SHELL` in `sw.js` (`v61` → `v62`).

---

### Task 0: Branch setup

**Files:** none (git only)

- [ ] **Step 1: Cut the feature branch**

```bash
cd /root/work/HSK/game
git checkout development && git pull --ff-only origin development
git checkout -b feat/iap-purchase-v1
```

- [ ] **Step 2: Verify clean baseline**

Run: `npm test`
Expected: all tests pass (~350). If not, STOP and report — do not build on a red baseline.

---

### Task 1: Product catalog (`products.js`)

**Files:**
- Create: `src/monetization/products.js`
- Test: `test/products.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `PRODUCTS` (array of `{id, coins, priceTHB, priceUSD, entitlement?}`), `productById(id) -> product|null`, `displayPrice(product, locale) -> string`. `entitlement: "supporter"` marks the one non-consumable; coin packs have no `entitlement` field.

- [ ] **Step 1: Write the failing test**

Create `test/products.test.js`:

```js
import { describe, it, expect } from "vitest";
import { PRODUCTS, productById, displayPrice } from "../src/monetization/products.js";

describe("PRODUCTS catalog (PRD §7.1)", () => {
  it("has exactly the 5 v1 products with unique ids", () => {
    expect(PRODUCTS.map(p => p.id).sort()).toEqual(
      ["coins_l", "coins_m", "coins_s", "coins_xl", "supporter"]
    );
  });

  it("prices and coin grants match the PRD exactly", () => {
    const byId = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));
    expect(byId.supporter).toMatchObject({ coins: 2000, priceTHB: 79, priceUSD: 2.99 });
    expect(byId.coins_s).toMatchObject({ coins: 1000, priceTHB: 29, priceUSD: 0.99 });
    expect(byId.coins_m).toMatchObject({ coins: 3500, priceTHB: 99, priceUSD: 2.99 });
    expect(byId.coins_l).toMatchObject({ coins: 6500, priceTHB: 169, priceUSD: 4.99 });
    expect(byId.coins_xl).toMatchObject({ coins: 15000, priceTHB: 329, priceUSD: 9.99 });
  });

  it("supporter is the only entitlement product", () => {
    expect(PRODUCTS.filter(p => p.entitlement).map(p => p.id)).toEqual(["supporter"]);
    expect(PRODUCTS.find(p => p.id === "supporter").entitlement).toBe("supporter");
  });

  it("every product grants a positive whole number of coins", () => {
    for (const p of PRODUCTS) {
      expect(Number.isInteger(p.coins), `${p.id} coins`).toBe(true);
      expect(p.coins).toBeGreaterThan(0);
    }
  });
});

describe("productById", () => {
  it("finds a product by id", () => {
    expect(productById("coins_m").coins).toBe(3500);
  });
  it("returns null for unknown ids", () => {
    expect(productById("nope")).toBeNull();
  });
});

describe("displayPrice", () => {
  it("shows baht for th", () => {
    expect(displayPrice(productById("supporter"), "th")).toBe("79฿");
  });
  it("shows dollars for any other locale", () => {
    expect(displayPrice(productById("coins_s"), "en")).toBe("$0.99");
    expect(displayPrice(productById("coins_m"), "en")).toBe("$2.99");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/products.test.js`
Expected: FAIL — cannot resolve `../src/monetization/products.js`.

- [ ] **Step 3: Write the implementation**

Create `src/monetization/products.js`:

```js
"use strict";
// IAP product catalog — PRD §7.1. Pure data, SDK-independent (house pattern:
// interstitial-policy.js). `entitlement: "supporter"` marks the one
// non-consumable; coin packs are consumables and never restore.
//
// Prices here are MOCK-ERA DISPLAY ONLY: real stores return localized price
// strings and those must win once the RevenueCat provider lands. Nothing
// outside this file may hard-code a price.

export const PRODUCTS = [
  { id: "supporter", coins: 2000,  entitlement: "supporter", priceTHB: 79,  priceUSD: 2.99 },
  { id: "coins_s",   coins: 1000,  priceTHB: 29,  priceUSD: 0.99 },
  { id: "coins_m",   coins: 3500,  priceTHB: 99,  priceUSD: 2.99 },
  { id: "coins_l",   coins: 6500,  priceTHB: 169, priceUSD: 4.99 },
  { id: "coins_xl",  coins: 15000, priceTHB: 329, priceUSD: 9.99 },
];

export function productById(id) {
  return PRODUCTS.find(p => p.id === id) || null;
}

export function displayPrice(product, locale) {
  return locale === "th" ? `${product.priceTHB}฿` : `$${product.priceUSD.toFixed(2)}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/products.test.js`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/monetization/products.js test/products.test.js
git commit -m "feat(iap): product catalog per PRD §7.1"
```

---

### Task 2: Grant/entitlement logic (`purchases.js`)

**Files:**
- Create: `src/monetization/purchases.js`
- Test: `test/purchases.test.js`

**Interfaces:**
- Consumes: `productById`, `PRODUCTS` from `./products.js` (Task 1).
- Produces: `defaultEnt() -> {supporter:false, orders:[]}`, `isSupporter(ent) -> boolean`, `applyPurchase(wallet:number, ent, productId, orderId, now) -> {ok, wallet, ent, reason?}`, `restoreFrom(ent, ownedProductIds) -> ent`. `orders` entries are `{orderId, productId, at}`.

- [ ] **Step 1: Write the failing test**

Create `test/purchases.test.js`:

```js
import { describe, it, expect } from "vitest";
import {
  defaultEnt, isSupporter, applyPurchase, restoreFrom,
} from "../src/monetization/purchases.js";

describe("defaultEnt / isSupporter", () => {
  it("defaults to non-supporter with no orders", () => {
    expect(defaultEnt()).toEqual({ supporter: false, orders: [] });
  });
  it("isSupporter is null-safe", () => {
    expect(isSupporter(null)).toBe(false);
    expect(isSupporter(undefined)).toBe(false);
    expect(isSupporter({ supporter: true, orders: [] })).toBe(true);
  });
});

describe("applyPurchase", () => {
  it("credits a coin pack and logs the order", () => {
    const r = applyPurchase(100, defaultEnt(), "coins_s", "o-1", 5000);
    expect(r.ok).toBe(true);
    expect(r.wallet).toBe(1100);
    expect(r.ent.supporter).toBe(false);
    expect(r.ent.orders).toEqual([{ orderId: "o-1", productId: "coins_s", at: 5000 }]);
  });

  it("supporter sets the flag AND credits 2,000 coins", () => {
    const r = applyPurchase(0, defaultEnt(), "supporter", "o-2", 6000);
    expect(r.ok).toBe(true);
    expect(r.wallet).toBe(2000);
    expect(r.ent.supporter).toBe(true);
  });

  it("a replayed orderId never double-credits (idempotent, PRD §7.4)", () => {
    const first = applyPurchase(0, defaultEnt(), "coins_m", "o-3", 1);
    const replay = applyPurchase(first.wallet, first.ent, "coins_m", "o-3", 2);
    expect(replay).toEqual({ ok: false, wallet: 3500, ent: first.ent, reason: "duplicate" });
  });

  it("rejects unknown products without touching state", () => {
    const ent = defaultEnt();
    const r = applyPurchase(50, ent, "coins_xxl", "o-4", 1);
    expect(r).toEqual({ ok: false, wallet: 50, ent, reason: "unknown-product" });
  });

  it("rejects buying supporter twice", () => {
    const owned = applyPurchase(0, defaultEnt(), "supporter", "o-5", 1).ent;
    const r = applyPurchase(9, owned, "supporter", "o-6", 2);
    expect(r).toEqual({ ok: false, wallet: 9, ent: owned, reason: "already-owned" });
  });

  it("treats a null/missing ent as defaultEnt", () => {
    const r = applyPurchase(0, null, "coins_s", "o-7", 1);
    expect(r.ok).toBe(true);
    expect(r.wallet).toBe(1000);
  });
});

describe("restoreFrom", () => {
  it("re-derives supporter from a restored non-consumable", () => {
    const r = restoreFrom(defaultEnt(), ["supporter"]);
    expect(r.supporter).toBe(true);
  });
  it("coin packs never restore anything", () => {
    const r = restoreFrom(defaultEnt(), ["coins_s", "coins_xl"]);
    expect(r.supporter).toBe(false);
  });
  it("never un-sets an existing supporter flag", () => {
    const ent = { supporter: true, orders: [] };
    expect(restoreFrom(ent, []).supporter).toBe(true);
  });
  it("is null-safe on both arguments", () => {
    expect(restoreFrom(null, null)).toEqual({ supporter: false, orders: [] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/purchases.test.js`
Expected: FAIL — cannot resolve `../src/monetization/purchases.js`.

- [ ] **Step 3: Write the implementation**

Create `src/monetization/purchases.js`:

```js
"use strict";
// Purchase grant/entitlement logic — pure, SDK-independent (house pattern:
// interstitial-policy.js). Caller owns persistence (nbhsk.ent, nbhsk.wallet).
//
// Idempotent by orderId ON PURPOSE: this mirrors PRD §7.4's idempotent-
// webhook acceptance criterion ("coin packs credit the correct amount once,
// even if the app is killed mid-purchase") so the same logic survives the
// move to server-side grants in the RevenueCat slice.
import { productById, PRODUCTS } from "./products.js";

export function defaultEnt() {
  return { supporter: false, orders: [] };
}

export function isSupporter(ent) {
  return !!(ent && ent.supporter);
}

// wallet: number of coins. Every not-ok result echoes state back unchanged.
export function applyPurchase(wallet, ent, productId, orderId, now) {
  const e = ent || defaultEnt();
  const fail = reason => ({ ok: false, wallet, ent: e, reason });
  const p = productById(productId);
  if (!p) return fail("unknown-product");
  if ((e.orders || []).some(o => o.orderId === orderId)) return fail("duplicate");
  if (p.entitlement === "supporter" && e.supporter) return fail("already-owned");
  return {
    ok: true,
    wallet: wallet + p.coins,
    ent: {
      supporter: e.supporter || p.entitlement === "supporter",
      orders: [...(e.orders || []), { orderId, productId, at: now }],
    },
  };
}

// Restore re-derives non-consumable entitlements from the store's owned
// list. Coin packs are consumables and never restore (store rules) — only
// the supporter flag comes back, never coins.
export function restoreFrom(ent, ownedProductIds) {
  const e = ent || defaultEnt();
  const owned = ownedProductIds || [];
  return {
    ...e,
    orders: e.orders || [],
    supporter: e.supporter ||
      PRODUCTS.some(p => p.entitlement === "supporter" && owned.includes(p.id)),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/purchases.test.js`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/monetization/purchases.js test/purchases.test.js
git commit -m "feat(iap): idempotent grant/entitlement logic"
```

---

### Task 3: Provider seam + mock provider

**Files:**
- Create: `src/monetization/provider.js`
- Create: `src/monetization/provider-mock.js`
- Test: `test/provider-mock.test.js`

**Interfaces:**
- Consumes: `productById` from `./products.js` (Task 1).
- Produces: `getProvider(opts)` from `provider.js`; `mockProvider(opts)` + `MOCK_DELAY_MS` from `provider-mock.js`. `opts = {get(key, def), set(key, val), delayMs?}` — caller's storage accessors. Provider methods: `available() -> true`, `purchase(productId) -> {ok:true, orderId} | {ok:false, reason:"cancelled"|"failed"|"unavailable"}`, `restore() -> {ok:true, ownedProductIds} | {ok:false, reason}`. Storage keys used (unprefixed — caller's `store` adds `nbhsk.`): `dev.iapOwned` (string[]), `dev.iapFail` ("cancelled"|"failed", one-shot), `dev.iapSeq` (number).

- [ ] **Step 1: Write the failing test**

Create `test/provider-mock.test.js`:

```js
import { describe, it, expect } from "vitest";
import { mockProvider } from "../src/monetization/provider-mock.js";
import { getProvider } from "../src/monetization/provider.js";

// In-memory stand-in for main.js's `store` (get(k,def)/set(k,v)).
function memStore(init = {}) {
  const m = { ...init };
  return { get: (k, d) => (k in m ? m[k] : d), set: (k, v) => { m[k] = v; }, m };
}
const fast = s => mockProvider({ get: s.get, set: s.set, delayMs: 0 });

describe("mock provider", () => {
  it("is available", async () => {
    expect(await fast(memStore()).available()).toBe(true);
  });

  it("purchase resolves ok with an orderId", async () => {
    const r = await fast(memStore()).purchase("coins_s");
    expect(r.ok).toBe(true);
    expect(r.orderId).toMatch(/coins_s/);
  });

  it("orderIds are unique across purchases AND provider instances (persisted seq)", async () => {
    const s = memStore();
    const a = await fast(s).purchase("coins_s");
    const b = await fast(s).purchase("coins_s"); // fresh instance, same store = reload
    expect(a.orderId).not.toBe(b.orderId);
  });

  it("buying supporter records it for restore; coin packs are not recorded", async () => {
    const s = memStore();
    const p = fast(s);
    await p.purchase("supporter");
    await p.purchase("coins_m");
    expect((await p.restore()).ownedProductIds).toEqual(["supporter"]);
  });

  it("restore on a fresh store returns an empty owned list", async () => {
    const r = await fast(memStore()).restore();
    expect(r).toEqual({ ok: true, ownedProductIds: [] });
  });

  it("dev.iapFail forces the next purchase to fail, one-shot", async () => {
    const s = memStore({ "dev.iapFail": "cancelled" });
    const p = fast(s);
    expect(await p.purchase("coins_s")).toEqual({ ok: false, reason: "cancelled" });
    expect((await p.purchase("coins_s")).ok).toBe(true); // flag consumed
  });

  it("supports the 'failed' forced reason too", async () => {
    const s = memStore({ "dev.iapFail": "failed" });
    expect(await fast(s).purchase("coins_s")).toEqual({ ok: false, reason: "failed" });
  });

  it("unknown product resolves failed (never throws)", async () => {
    expect(await fast(memStore()).purchase("nope")).toEqual({ ok: false, reason: "failed" });
  });
});

describe("getProvider", () => {
  it("returns the mock in v1 (same interface)", async () => {
    const s = memStore();
    const p = getProvider({ get: s.get, set: s.set, delayMs: 0 });
    expect(await p.available()).toBe(true);
    expect((await p.purchase("coins_s")).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/provider-mock.test.js`
Expected: FAIL — cannot resolve the provider modules.

- [ ] **Step 3: Write the implementations**

Create `src/monetization/provider-mock.js`:

```js
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
```

Create `src/monetization/provider.js`:

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/provider-mock.test.js`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/monetization/provider.js src/monetization/provider-mock.js test/provider-mock.test.js
git commit -m "feat(iap): provider seam + mock provider with forced-failure hooks"
```

---

### Task 4: i18n strings (en + th) + catalog-coverage test

**Files:**
- Modify: `src/i18n.js` (both `STRINGS.en` and `STRINGS.th`)
- Modify: `test/i18n-usage.test.js` (add a PRODUCTS coverage block)

**Interfaces:**
- Consumes: `PRODUCTS` from `src/monetization/products.js` (Task 1).
- Produces: the i18n keys listed below, used verbatim by Task 5's UI code.

- [ ] **Step 1: Write the failing test**

In `test/i18n-usage.test.js`, add to the imports at the top:

```js
import { PRODUCTS } from "../src/monetization/products.js";
```

and append this describe block at the end of the file:

```js
describe("IAP products have display-name keys in both locales", () => {
  for (const p of PRODUCTS) {
    it(`"item.${p.id}" exists in EN and TH`, () => {
      expect("item." + p.id in STRINGS.en, `item.${p.id} missing from STRINGS.en`).toBe(true);
      expect("item." + p.id in STRINGS.th, `item.${p.id} missing from STRINGS.th`).toBe(true);
    });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/i18n-usage.test.js`
Expected: FAIL — 5 × `item.<id> missing from STRINGS.en`.

- [ ] **Step 3: Add the strings**

In `src/i18n.js`, inside `STRINGS.en` (after the existing `"shop.owned-count"` entry), add:

```js
    // iap (IAP purchase flow v1 — mock provider; spec 2026-07-11)
    "shop.getCoins": "Get Coins",
    "shop.supporterTitle": "Supporter",
    "shop.supporterDesc": "Remove ads forever · +2,000 coins · Supporter badge",
    "shop.supporterOwned": "Thank you for supporting Lucky Cat! ♥",
    "iap.amount": "{coins} coins",
    "iap.pending": "Processing…",
    "iap.failed": "Purchase failed — nothing was charged. Try again.",
    "iap.success": "+{coins} coins added!",
    "iap.supporterThanks": "You're a Supporter now — thank you! ♥",
    "iap.restore": "Restore Purchases",
    "iap.restored": "Supporter restored ♥",
    "iap.nothingToRestore": "Nothing to restore",
    "iap.restoreFailed": "Restore failed — check your connection and try again.",
    "account.supporterChip": "Supporter ♥",
    "item.supporter": "Supporter Pack",
    "item.coins_s": "Coin Pouch",
    "item.coins_m": "Coin Stack",
    "item.coins_l": "Coin Chest",
    "item.coins_xl": "Coin Vault",
```

In `STRINGS.th`, at the matching position (after the Thai `"shop.owned-count"`), add:

```js
    // iap (IAP purchase flow v1 — mock provider; spec 2026-07-11)
    "shop.getCoins": "เติมเหรียญ",
    "shop.supporterTitle": "ผู้สนับสนุน",
    "shop.supporterDesc": "ปิดโฆษณาถาวร · รับ 2,000 เหรียญ · แบดจ์ผู้สนับสนุน",
    "shop.supporterOwned": "ขอบคุณที่สนับสนุน Lucky Cat! ♥",
    "iap.amount": "{coins} เหรียญ",
    "iap.pending": "กำลังดำเนินการ…",
    "iap.failed": "การซื้อไม่สำเร็จ — ยังไม่มีการเรียกเก็บเงิน ลองใหม่อีกครั้ง",
    "iap.success": "เพิ่มเหรียญแล้ว +{coins}!",
    "iap.supporterThanks": "คุณเป็นผู้สนับสนุนแล้ว — ขอบคุณ! ♥",
    "iap.restore": "กู้คืนการซื้อ",
    "iap.restored": "กู้คืนสถานะผู้สนับสนุนแล้ว ♥",
    "iap.nothingToRestore": "ไม่มีรายการให้กู้คืน",
    "iap.restoreFailed": "กู้คืนไม่สำเร็จ — ตรวจสอบการเชื่อมต่อแล้วลองใหม่",
    "account.supporterChip": "ผู้สนับสนุน ♥",
    "item.supporter": "แพ็กผู้สนับสนุน",
    "item.coins_s": "ถุงเหรียญ",
    "item.coins_m": "กองเหรียญ",
    "item.coins_l": "หีบเหรียญ",
    "item.coins_xl": "คลังเหรียญ",
```

- [ ] **Step 4: Run the full i18n suite**

Run: `npx vitest run test/i18n-usage.test.js test/i18n.test.js`
Expected: PASS. (The literal-`t()` scan will also pick up the `iap.*` keys once Task 5 lands; they already resolve in both locales.)

- [ ] **Step 5: Commit**

```bash
git add src/i18n.js test/i18n-usage.test.js
git commit -m "feat(iap): en/th strings for coin packs, Supporter, restore"
```

---

### Task 5: Shop + Account UI wiring (`index.html`, `main.js`)

`main.js` wiring is untested by design (repo convention) — correctness here is carried by the pure modules underneath plus Task 6's manual verification.

**Files:**
- Modify: `index.html` (shop screen, after the `#shop-wallet` readout, ~line 1296)
- Modify: `src/main.js` (imports ~line 40; state init near `let wallet` ~line 99; `renderShop()` ~line 2420; `renderAccount()` ~line 423)

**Interfaces:**
- Consumes: everything produced by Tasks 1–4 — `PRODUCTS`, `productById`, `displayPrice`; `defaultEnt`, `isSupporter`, `applyPurchase`, `restoreFrom`; `getProvider`; the `iap.*`/`shop.*`/`item.*`/`account.supporterChip` keys.
- Produces: `iapEnabled()`, `renderIapSections()`, `iapBuy(p, btn)`, `onRestorePurchases()` inside `main.js`; DOM ids `#shop-coins-sect`, `#shop-coins`, `#shop-supporter-sect`, `#shop-supporter`.

- [ ] **Step 1: Add the (hidden) shop sections to `index.html`**

Directly after `<div class="readout" id="shop-wallet"></div>` (before the `shop.daily` sect):

```html
    <!-- IAP (mock-provider v1): ships dark — unhidden by renderIapSections()
         only when the nbhsk.dev.iap flag is set. -->
    <div class="sect" id="shop-coins-sect" data-i18n="shop.getCoins" hidden>Get Coins</div>
    <div class="scorelist" id="shop-coins" hidden></div>
    <div class="sect" id="shop-supporter-sect" data-i18n="shop.supporterTitle" hidden>Supporter</div>
    <div class="scorelist" id="shop-supporter" hidden></div>
```

- [ ] **Step 2: Wire state + provider in `main.js`**

Add to the module imports (near the other `./` imports around line 40):

```js
import { PRODUCTS, productById, displayPrice } from "./monetization/products.js";
import { defaultEnt, isSupporter, applyPurchase, restoreFrom } from "./monetization/purchases.js";
import { getProvider } from "./monetization/provider.js";
```

Directly below `let wallet = store.get("wallet", 0);` (~line 99), add:

```js
// IAP (mock-provider v1). ent is local-only on purpose — NOT in SYNC_KEYS;
// entitlements become server-authoritative in the RevenueCat slice.
let ent = Object.assign(defaultEnt(), store.get("ent", {}));
// Dark-ship flag: localStorage.setItem("nbhsk.dev.iap", "true") + reload.
// When RevenueCat lands this becomes "native platform && provider available".
const iapEnabled = () => !!store.get("dev.iap", false);
let iapProvider = null;
function provider(){
  if(!iapProvider) iapProvider = getProvider({ get: (k,d)=>store.get(k,d), set: (k,v)=>store.set(k,v) });
  return iapProvider;
}
```

- [ ] **Step 3: Render the IAP sections from `renderShop()`**

Add `renderIapSections();` as the last line of `renderShop()` (after `startShopPreviewLoop();`), then add below `makeShopRow`'s closing brace:

```js
/* --------------------------- IAP (mock v1) --------------------------- */
function renderIapSections(){
  const on = iapEnabled();
  for(const id of ["shop-coins-sect", "shop-coins", "shop-supporter-sect", "shop-supporter"]){
    const el = document.getElementById(id);
    if(el) el.hidden = !on;
  }
  if(!on) return;
  const coinsBox = $("#shop-coins"), supporterBox = $("#shop-supporter");
  coinsBox.innerHTML = ""; supporterBox.innerHTML = "";
  for(const p of PRODUCTS.filter(p => !p.entitlement)) coinsBox.appendChild(makeIapRow(p));
  supporterBox.appendChild(makeSupporterCard());
}

function makeIapRow(p){
  const row = document.createElement("div");
  row.className = "scorerow shoprow";
  const copy = document.createElement("span");
  copy.className = "shop-copy";
  copy.innerHTML = `<b>${t("item." + p.id)}</b><small>${t("iap.amount", { coins: p.coins.toLocaleString() })}</small>`;
  const btn = document.createElement("button");
  btn.className = "chip buy-chip";
  btn.textContent = displayPrice(p, getLocale());
  btn.onclick = () => iapBuy(p, btn);
  row.appendChild(copy); row.appendChild(btn);
  return row;
}

function makeSupporterCard(){
  const owned = isSupporter(ent);
  const row = document.createElement("div");
  row.className = "scorerow shoprow";
  const copy = document.createElement("span");
  copy.className = "shop-copy";
  copy.innerHTML = owned
    ? `<b>${t("shop.supporterTitle")} ♥</b><small>${t("shop.supporterOwned")}</small>`
    : `<b>${t("shop.supporterTitle")}</b><small>${t("shop.supporterDesc")}</small>`;
  row.appendChild(copy);
  if(!owned){
    const btn = document.createElement("button");
    btn.className = "chip buy-chip";
    btn.textContent = displayPrice(productById("supporter"), getLocale());
    btn.onclick = () => iapBuy(productById("supporter"), btn);
    row.appendChild(btn);
  }
  return row;
}

// Buy flow: pending -> provider -> applyPurchase -> persist -> celebrate.
// The disabled button is the double-tap guard; applyPurchase's orderId
// idempotency is the backstop. Cancelled is silent (user changed their
// mind); failed/unavailable gets a toast.
async function iapBuy(p, btn){
  if(btn.disabled) return;
  btn.disabled = true;
  const label = btn.textContent;
  btn.textContent = t("iap.pending");
  const r = await provider().purchase(p.id);
  if(!r.ok){
    btn.textContent = label; btn.disabled = false;
    if(r.reason !== "cancelled") toast(t("iap.failed"));
    return;
  }
  const g = applyPurchase(wallet, ent, p.id, r.orderId, Date.now());
  if(g.ok){
    wallet = g.wallet; ent = g.ent;
    store.set("wallet", wallet); store.set("ent", ent);
    pushDirty(store, "purchase");
    updateWalletChip();
    toast(p.entitlement ? t("iap.supporterThanks") : t("iap.success", { coins: p.coins.toLocaleString() }));
  }
  renderShop();   // duplicate/already-owned fall through to the owned state
}
```

- [ ] **Step 4: Restore Purchases + Supporter chip in the Account panel**

In `renderAccount()` (src/main.js:423), immediately before the final `if(v.showSignOut)` line, add:

```js
  if(isSupporter(ent)){
    const chip = document.createElement("p");
    chip.className = "account-explain";
    chip.textContent = t("account.supporterChip");
    p.appendChild(chip);
  }
```

and at the very end of `renderAccount()` (after the `showSignOut` line):

```js
  // IAP v1: restore is device-local (mock provider); Apple will require
  // this button once real billing lands, so the UI slot exists now.
  if(iapEnabled()) p.appendChild(accountBtn(t("iap.restore"), onRestorePurchases));
```

Then add this handler next to the other account handlers (after `onAccountSignOut`):

```js
async function onRestorePurchases(){
  const r = await provider().restore();
  if(!r.ok){ toast(t("iap.restoreFailed")); return; }
  ent = restoreFrom(ent, r.ownedProductIds);
  store.set("ent", ent);
  toast(isSupporter(ent) ? t("iap.restored") : t("iap.nothingToRestore"));
  renderAccount();
}
```

(`accountBtn` already disables itself while the async handler runs.)

- [ ] **Step 5: Full test run + build**

Run: `npm test`
Expected: PASS — including `test/i18n-usage.test.js`, whose literal-`t()` scan now sees every `iap.*` key in both locales.

Run: `npm run build`
Expected: esbuild writes `dist/app.js` with no errors.

- [ ] **Step 6: Commit**

```bash
git add index.html src/main.js
git commit -m "feat(iap): shop Get Coins + Supporter sections, Account restore (dark behind nbhsk.dev.iap)"
```

---

### Task 6: Manual verification, SHELL bump, wrap-up

**Files:**
- Modify: `sw.js:5` (`SHELL`)

- [ ] **Step 1: Manual verification in the browser**

```bash
npm run serve   # http://localhost:8000
```

In the browser console: `localStorage.setItem("nbhsk.dev.iap", "true")`, reload, then verify each:

1. Shop shows **Get Coins** (4 packs, prices `$0.99–$9.99`; switch language to Thai → `29฿–329฿` and Thai copy) and a **Supporter** card at `79฿/$2.99`.
2. Buy Coin Pouch → button shows "Processing…" ~0.6s → toast "+1,000 coins added!" → wallet readout and home chip increase by exactly 1,000.
3. Reload → wallet keeps the credited coins (`nbhsk.wallet`), `nbhsk.ent` has the order.
4. Buy Supporter → thank-you toast, wallet +2,000, card flips to owned/no button; More → Account shows "Supporter ♥".
5. `localStorage.setItem("nbhsk.dev.iapFail", JSON.stringify("failed"))` → next buy shows the failure toast, wallet unchanged, button re-enabled; the buy after that succeeds. Repeat with `"cancelled"` → silent re-enable, no toast.
6. `localStorage.removeItem("nbhsk.ent")` + reload → Supporter card is buyable again; Account → **Restore Purchases** → "Supporter restored ♥", card owned again, **no coins re-credited**.
7. `localStorage.removeItem("nbhsk.dev.iap")` + reload → shop and Account show zero IAP UI (production view).

If any check fails: STOP, diagnose with superpowers:systematic-debugging, fix, re-run `npm test`, and repeat this step before continuing.

- [ ] **Step 2: Bump the service-worker shell version**

In `sw.js` line 5: `const SHELL = "nbhsk-shell-v61";` → `"nbhsk-shell-v62"`.

- [ ] **Step 3: Final test run + build + commit**

```bash
npm test && npm run build
git add sw.js
git commit -m "chore(pwa): bump SHELL to v62 — IAP mock purchase flow (dark)"
```

Expected: tests PASS before the commit is made.

- [ ] **Step 4: Finish the branch**

Use superpowers:finishing-a-development-branch — expected outcome: PR from `feat/iap-purchase-v1` into `development` for Jordan's review, matching the project's PR workflow.

---

## Self-Review Notes

- **Spec coverage:** catalog (T1), idempotent grants/restore/isSupporter (T2), provider seam + mock with forced failures (T3), en/th copy incl. deferred paywall keys (T4), shop sections + buy flow + owned states + Account restore + chip + dark flag (T5), manual matrix + SHELL bump (T6). The spec's "known interaction" (wallet_guard clamp) requires no code in this slice — it's recorded in the spec as a RevenueCat-slice prerequisite.
- **Type consistency:** `applyPurchase(wallet, ent, productId, orderId, now)` and `{ok, wallet, ent, reason?}` used identically in T2 tests and T5 wiring; provider `opts.get/set` signatures match `store.get/set`; `dev.iapSeq` persistence guarantees orderId uniqueness across reloads so idempotency never false-positives.
- **No placeholders:** every code step contains complete code; every run step has an expected outcome.
