import { describe, it, expect, vi } from "vitest";
import { isReturnableOrigin, stripeWebProvider } from "../src/monetization/provider-stripe-web.js";

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

// P0-4: the checkout's return leg is pinned to ONE origin server-side, so a
// purchase started anywhere else strands the buyer on a host that cannot see
// the grant. Refuse before any money moves.
const CANON = "https://luckycathsk.com";

describe("isReturnableOrigin", () => {
  it("accepts the canonical origin and ignores a trailing slash on either side", () => {
    expect(isReturnableOrigin(CANON, CANON)).toBe(true);
    expect(isReturnableOrigin(`${CANON}/`, CANON)).toBe(true);
    expect(isReturnableOrigin(CANON, `${CANON}/`)).toBe(true);
  });

  it("rejects the hosts that serve this same bundle from another origin", () => {
    expect(isReturnableOrigin("https://sarachdatabear-polar.github.io", CANON)).toBe(false);
    expect(isReturnableOrigin("https://lucky-cat-hsk.sarach-northbear.workers.dev", CANON)).toBe(false);
  });

  it("rejects a lookalike host rather than matching on a substring", () => {
    expect(isReturnableOrigin("https://luckycathsk.com.evil.test", CANON)).toBe(false);
    expect(isReturnableOrigin("https://www.luckycathsk.com", CANON)).toBe(false);
    // Same host, wrong scheme — the return leg is https-only.
    expect(isReturnableOrigin("http://luckycathsk.com", CANON)).toBe(false);
  });

  it("allows localhost so the live gate can be rehearsed against Stripe test mode", () => {
    expect(isReturnableOrigin("http://localhost:8000", CANON)).toBe(true);
    expect(isReturnableOrigin("http://127.0.0.1:8000", CANON)).toBe(true);
  });

  it("allows everything when no canonical origin is configured", () => {
    expect(isReturnableOrigin("https://anywhere.test", "")).toBe(true);
    expect(isReturnableOrigin("https://anywhere.test", null)).toBe(true);
  });

  it("rejects an unusable current origin when a pin IS configured", () => {
    expect(isReturnableOrigin("", CANON)).toBe(false);
    expect(isReturnableOrigin("not a url", CANON)).toBe(false);
  });
});

describe("stripeWebProvider origin gate", () => {
  it("refuses to start a purchase from a non-canonical origin, before any fetch", async () => {
    const fetchImpl = vi.fn();
    const redirect = vi.fn();
    const store = fakeStore();
    const p = make({
      canonicalOrigin: CANON,
      getOrigin: () => "https://sarachdatabear-polar.github.io",
      fetchImpl, redirect, store,
    });
    const r = await p.purchase("supporter");
    expect(r).toEqual({ ok: false, reason: "wrong-origin" });
    // No checkout session created, no navigation, no pending record left behind.
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
    expect(store.map.size).toBe(0);
  });

  it("still starts a purchase from the canonical origin", async () => {
    const redirect = vi.fn();
    const p = make({ canonicalOrigin: CANON, getOrigin: () => CANON, redirect });
    const r = await p.purchase("supporter");
    expect(r).toEqual({ ok: false, reason: "pending" });
    expect(redirect).toHaveBeenCalledWith("https://stripe/pay");
  });

  // FLIPPED DELIBERATELY (audit finding, monetization P0): available() used to
  // stay true off-origin so the supporter offer rendered right up to the
  // purchase tap, where it alone refused. That let a visitor on the
  // github.io bridge sign up, verify OTP by email, and only dead-end at the
  // last step — now that billing is LIVE, the offer must not render there at
  // all. available() folds isReturnableOrigin in so the shop/results
  // placements go dark exactly like an unconfigured provider (see
  // gating.js's iapVisible). supports() and restore() are UNCHANGED — restore
  // stays reachable off-origin on purpose, it's a returning Supporter's only
  // route to an entitlement this device never saw bought (see usable()'s doc
  // and purchase()'s own origin check, kept as defense in depth).
  it("goes unavailable (offer hidden) on a non-canonical origin, but keeps restore working — a returning Supporter's only recovery route", async () => {
    const p = make({
      canonicalOrigin: CANON,
      getOrigin: () => "https://sarachdatabear-polar.github.io",
    });
    await expect(p.available()).resolves.toBe(false);
    expect(p.supports("supporter")).toBe(true);
    await expect(p.restore()).resolves.toEqual({ ok: true, ownedProductIds: ["supporter"] });
  });

  it("stays available on the canonical origin when a pin IS configured", async () => {
    const p = make({ canonicalOrigin: CANON, getOrigin: () => CANON });
    await expect(p.available()).resolves.toBe(true);
  });

  it("stays available when no canonical origin is configured (blank pin allows all)", async () => {
    const p = make({ canonicalOrigin: "", getOrigin: () => "https://sarachdatabear-polar.github.io" });
    await expect(p.available()).resolves.toBe(true);
  });

  it("stays available on localhost even with a pin configured — the live gate must be rehearsable", async () => {
    const p = make({ canonicalOrigin: CANON, getOrigin: () => "http://localhost:8000" });
    await expect(p.available()).resolves.toBe(true);
  });

  it("available() still honors the native/file/checkout-url guards on the canonical origin", async () => {
    await expect(make({ canonicalOrigin: CANON, getOrigin: () => CANON, isNative: () => true }).available())
      .resolves.toBe(false);
    await expect(make({ canonicalOrigin: CANON, getOrigin: () => CANON, checkoutUrl: "" }).available())
      .resolves.toBe(false);
  });
});
