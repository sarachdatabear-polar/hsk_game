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
  it("returns the mock while RevenueCat is not configured (same interface)", async () => {
    const s = memStore();
    const p = getProvider({ get: s.get, set: s.set, delayMs: 0 });
    expect(await p.available()).toBe(true);
    expect((await p.purchase("coins_s")).ok).toBe(true);
  });

  // Load-bearing for gating.js: iapVisible() hides the mock behind the dev
  // flag by checking kind === "mock", not available(). If this drifts, the
  // mock reads as a real provider and un-darks the purchase UI in prod.
  it("is tagged kind: \"mock\" (gating.js relies on this)", () => {
    const s = memStore();
    expect(getProvider({ get: s.get, set: s.set, delayMs: 0 }).kind).toBe("mock");
  });

  it("selects RevenueCat only for a configured native build", () => {
    const s = memStore();
    const p = getProvider({
      get: s.get, set: s.set, ensureUserId: async () => "11111111-1111-4111-8111-111111111111",
      revenuecat: { apiKey: "public", isNative: () => true, sdk: {}, productIds: ["coins_s"] },
    });
    expect(p.kind).toBe("revenuecat");
  });

  it("keeps the mock on web even when a key is present", () => {
    const s = memStore();
    const p = getProvider({ get: s.get, set: s.set, revenuecat: { apiKey: "public", isNative: () => false } });
    expect(p.kind).toBe("mock");
  });
});
