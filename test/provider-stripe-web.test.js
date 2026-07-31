import { describe, it, expect, vi } from "vitest";
import { stripeWebProvider } from "../src/monetization/provider-stripe-web.js";

function fakeStore() {
  const map = new Map();
  return { map, get: (k, d) => (map.has(k) ? map.get(k) : d), set: (k, v) => map.set(k, v), remove: k => map.delete(k) };
}

const UID = "11111111-2222-4333-8444-555555555555";

function make(over = {}) {
  return stripeWebProvider({
    checkoutUrl: "https://fn.example/stripe-checkout",
    productIds: ["supporter"],
    store: fakeStore(),
    isNative: () => false,
    isFileProtocol: () => false,
    ensureUserId: async () => UID,
    getAccessToken: async () => "jwt-token",
    isAnonymous: async () => false,
    fetchEntitlements: async () => ["supporter"],
    redirect: vi.fn(),
    fetchImpl: async () => ({ ok: true, json: async () => ({ url: "https://stripe/pay", sessionId: "cs_1" }) }),
    ...over,
  });
}

describe("stripeWebProvider", () => {
  it("identifies itself and supports the configured product", async () => {
    const p = make();
    expect(p.kind).toBe("stripe-web");
    expect(p.supports("supporter")).toBe(true);
    expect(p.supports("coins_s")).toBe(false);
  });

  it("is available off-native with a checkout url", async () => {
    expect(await make().available()).toBe(true);
  });

  it("is unavailable on native and on file://", async () => {
    expect(await make({ isNative: () => true }).available()).toBe(false);
    expect(await make({ isFileProtocol: () => true }).available()).toBe(false);
  });

  it("is unavailable with no checkout url (ships dark)", async () => {
    expect(await make({ checkoutUrl: "" }).available()).toBe(false);
  });

  it("returns null from price() so the catalog display price wins", () => {
    expect(make().price("supporter")).toBeNull();
  });

  it("purchase writes the pending record and redirects", async () => {
    const redirect = vi.fn();
    const store = fakeStore();
    const p = make({ redirect, store });
    const r = await p.purchase("supporter");
    expect(r).toEqual({ ok: false, reason: "pending" });
    expect(redirect).toHaveBeenCalledWith("https://stripe/pay");
    expect(store.get("checkout", null).sessionId).toBe("cs_1");
  });

  it("refuses an anonymous buyer with a routable reason, and does not redirect", async () => {
    const redirect = vi.fn();
    const r = await make({ isAnonymous: async () => true, redirect }).purchase("supporter");
    expect(r).toEqual({ ok: false, reason: "needs-account" });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("maps the server's needs-account refusal to the same reason", async () => {
    const p = make({ fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({ error: "needs-account" }) }) });
    expect(await p.purchase("supporter")).toEqual({ ok: false, reason: "needs-account" });
  });

  it("returns failed when the network throws, and persists nothing", async () => {
    const store = fakeStore();
    const p = make({ store, fetchImpl: async () => { throw new Error("offline"); } });
    expect(await p.purchase("supporter")).toEqual({ ok: false, reason: "failed" });
    expect(store.get("checkout", null)).toBeNull();
  });

  it("returns unavailable for an unsupported product", async () => {
    expect(await make().purchase("coins_s")).toEqual({ ok: false, reason: "unavailable" });
  });

  it("supportsRestore is true so the account Restore button is reachable", () => {
    expect(make().supportsRestore()).toBe(true);
  });

  it("restore reads the entitlements table and maps rows to product ids", async () => {
    expect(await make().restore()).toEqual({ ok: true, ownedProductIds: ["supporter"] });
  });

  it("restore reports unavailable when the user cannot be resolved", async () => {
    const p = make({ ensureUserId: async () => null });
    expect(await p.restore()).toEqual({ ok: false, reason: "unavailable" });
  });

  it("never throws from any method", async () => {
    const boom = () => { throw new Error("x"); };
    const p = make({ ensureUserId: boom, fetchEntitlements: boom, getAccessToken: boom });
    await expect(p.available()).resolves.toBeDefined();
    await expect(p.purchase("supporter")).resolves.toBeDefined();
    await expect(p.restore()).resolves.toBeDefined();
  });
});
