import { describe, it, expect, vi } from "vitest";
import { revenueCatProvider } from "../src/monetization/provider-revenuecat.js";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";

function product(identifier, priceString = "$0.99") {
  return { identifier, priceString };
}

function sdkWith(products = [product("coins_s")]) {
  return {
    configure: vi.fn(async () => {}),
    logIn: vi.fn(async () => ({ customerInfo: {}, created: false })),
    getProducts: vi.fn(async () => ({ products })),
    purchaseStoreProduct: vi.fn(async ({ product: p }) => ({
      productIdentifier: p.identifier,
      customerInfo: {},
      transaction: { transactionIdentifier: `GPA.${p.identifier}` },
    })),
    restorePurchases: vi.fn(async () => ({
      customerInfo: { entitlements: { active: {} } },
    })),
  };
}

function provider(overrides = {}) {
  const sdk = overrides.sdk || sdkWith();
  return { sdk, p: revenueCatProvider({
    sdk,
    apiKey: "goog_public_key",
    isNative: () => true,
    ensureUserId: async () => USER_A,
    productIds: ["coins_s"],
    restorableProductIds: [],
    ...overrides,
  }) };
}

describe("RevenueCat provider readiness", () => {
  it("configures with a stable Supabase UUID and loads non-subscription products", async () => {
    const { sdk, p } = provider();
    expect(await p.available()).toBe(true);
    expect(sdk.configure).toHaveBeenCalledWith({ apiKey: "goog_public_key", appUserID: USER_A });
    expect(sdk.getProducts).toHaveBeenCalledWith({
      productIdentifiers: ["coins_s"], type: "NON_SUBSCRIPTION",
    });
    expect(p.supports("coins_s")).toBe(true);
    expect(p.price("coins_s")).toBe("$0.99");
  });

  it("fails closed for web, missing key, or a non-UUID identity", async () => {
    expect(await provider({ isNative: () => false }).p.available()).toBe(false);
    expect(await provider({ apiKey: "" }).p.available()).toBe(false);
    expect(await provider({ ensureUserId: async () => "email@example.com" }).p.available()).toBe(false);
  });

  it("coalesces concurrent initialization", async () => {
    const { sdk, p } = provider();
    expect(await Promise.all([p.available(), p.available()])).toEqual([true, true]);
    expect(sdk.configure).toHaveBeenCalledTimes(1);
    expect(sdk.getProducts).toHaveBeenCalledTimes(1);
  });

  it("logs in again and reloads products when the Supabase user changes", async () => {
    let userId = USER_A;
    const { sdk, p } = provider({ ensureUserId: async () => userId });
    await p.available();
    userId = USER_B;
    await p.purchase("coins_s");
    expect(sdk.logIn).toHaveBeenCalledWith({ appUserID: USER_B });
    expect(sdk.getProducts).toHaveBeenCalledTimes(2);
  });
});

describe("RevenueCat provider purchase and restore", () => {
  it("returns the exact native store transaction id", async () => {
    const { p } = provider();
    expect(await p.purchase("coins_s")).toEqual({ ok: true, orderId: "GPA.coins_s" });
  });

  it.each([
    [{ code: "1" }, "cancelled"],
    [{ userCancelled: true }, "cancelled"],
    [{ code: "20" }, "pending"],
    [new Error("bridge fault"), "failed"],
  ])("maps SDK rejection %# without throwing", async (error, reason) => {
    const sdk = sdkWith();
    sdk.purchaseStoreProduct.mockRejectedValue(error);
    expect(await provider({ sdk }).p.purchase("coins_s")).toEqual({ ok: false, reason });
  });

  it("does not attempt an unknown or unloaded product", async () => {
    const { sdk, p } = provider();
    expect(await p.purchase("supporter")).toEqual({ ok: false, reason: "unavailable" });
    expect(sdk.purchaseStoreProduct).not.toHaveBeenCalled();
  });

  it("restores only configured active non-consumable products", async () => {
    const sdk = sdkWith([product("supporter", "$2.99"), product("coins_s")]);
    sdk.restorePurchases.mockResolvedValue({ customerInfo: { entitlements: { active: {
      supporter: { isActive: true, productIdentifier: "supporter" },
      stale: { isActive: false, productIdentifier: "stale" },
    } } } });
    const { p } = provider({ sdk, productIds: ["supporter", "coins_s"], restorableProductIds: ["supporter"] });
    await p.available();
    expect(p.supportsRestore()).toBe(true);
    expect(await p.restore()).toEqual({ ok: true, ownedProductIds: ["supporter"] });
  });
});
