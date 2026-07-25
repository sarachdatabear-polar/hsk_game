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
