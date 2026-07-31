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

  // The supporter product's id and entitlement name are the SAME string, so the
  // test above passes under a correct mapping AND under an inverted one. This
  // case discriminates: coins_s has no `entitlement`, so a correct
  // held.has(product.entitlement) yields [], while an inverted held.has(id)
  // would wrongly yield ["coins_s"].
  it("does not treat a product id as an entitlement name", async () => {
    const p = make({ productIds: ["coins_s"], fetchEntitlements: async () => ["coins_s"] });
    expect(await p.restore()).toEqual({ ok: true, ownedProductIds: [] });
  });

  it("supportsRestore is false when no configured product carries an entitlement", () => {
    expect(make({ productIds: ["coins_s"] }).supportsRestore()).toBe(false);
  });

  it("maps the server's already-owned refusal to unavailable", async () => {
    const p = make({ fetchImpl: async () => ({ ok: false, status: 409, json: async () => ({ error: "already-owned" }) }) });
    expect(await p.purchase("supporter")).toEqual({ ok: false, reason: "unavailable" });
  });

  it("returns failed on a malformed success payload", async () => {
    const p = make({ fetchImpl: async () => ({ ok: true, json: async () => ({ url: "https://stripe/pay" }) }) });
    expect(await p.purchase("supporter")).toEqual({ ok: false, reason: "failed" });
  });

  it("sends the prior session id so the server can expire it", async () => {
    const store = fakeStore();
    store.set("checkout", { sessionId: "cs_prev", productId: "supporter", startedAt: Date.now() });
    let sentBody = null;
    const p = make({ store, fetchImpl: async (_url, opts) => {
      sentBody = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ url: "https://stripe/pay", sessionId: "cs_new" }) };
    } });
    await p.purchase("supporter");
    expect(sentBody).toEqual({ productId: "supporter", priorSessionId: "cs_prev" });
  });

  it("available() resolves false rather than throwing when a guard throws", async () => {
    const p = make({ isNative: () => { throw new Error("x"); } });
    await expect(p.available()).resolves.toBe(false);
  });

  it("restore reports unavailable when the user cannot be resolved", async () => {
    const p = make({ ensureUserId: async () => null });
    expect(await p.restore()).toEqual({ ok: false, reason: "unavailable" });
  });

  // ONE THROW SITE PER TEST, and assert the DOCUMENTED SHAPE, not definedness.
  // A single test that booms every dependency at once is worthless here: with
  // ensureUserId also throwing it fires FIRST inside both purchase() and
  // restore(), so getAccessToken's and fetchEntitlements' catches are never
  // reached and stay dead. And `.resolves.toBeDefined()` passes for any resolved
  // value — it proves "did not reject", not "returned the contract's shape".
  it("purchase resolves {failed} when ensureUserId throws", async () => {
    const p = make({ ensureUserId: () => { throw new Error("x"); } });
    expect(await p.purchase("supporter")).toEqual({ ok: false, reason: "failed" });
  });

  it("purchase resolves {failed} when getAccessToken throws", async () => {
    const p = make({ getAccessToken: () => { throw new Error("x"); } });
    expect(await p.purchase("supporter")).toEqual({ ok: false, reason: "failed" });
  });

  it("restore resolves {unavailable} when ensureUserId throws", async () => {
    const p = make({ ensureUserId: () => { throw new Error("x"); } });
    expect(await p.restore()).toEqual({ ok: false, reason: "unavailable" });
  });

  it("restore resolves {unavailable} when fetchEntitlements throws", async () => {
    const p = make({ fetchEntitlements: () => { throw new Error("x"); } });
    expect(await p.restore()).toEqual({ ok: false, reason: "unavailable" });
  });

  // Discriminates readPending from a raw store.get: an ancient startedAt is past
  // the TTL, so readPending returns null and the prior id must be empty. A raw
  // store.get would send "cs_stale".
  it("ignores an EXPIRED pending record rather than sending a stale prior id", async () => {
    const store = fakeStore();
    store.set("checkout", { sessionId: "cs_stale", productId: "supporter", startedAt: 1 });
    let sentBody = null;
    const p = make({ store, fetchImpl: async (_url, opts) => {
      sentBody = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ url: "https://stripe/pay", sessionId: "cs_new" }) };
    } });
    await p.purchase("supporter");
    expect(sentBody.priorSessionId).toBe("");
  });
});
