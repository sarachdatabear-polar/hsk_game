import { describe, it, expect } from "vitest";
import { processEvent } from "../supabase/functions/rc-webhook/core.js";
import { PRODUCTS, productById } from "../src/monetization/products.js";

// NOTE: this file tests core.js only — the pure event-to-grant decision
// logic. index.ts (the Deno wrapper around Supabase I/O) is intentionally
// thin and untested here; it has no branching worth a unit test beyond what
// core.js already covers, and Deno-flavored TS doesn't run under vitest.

function rcEvent(overrides) {
  return {
    api_version: "1.0",
    event: {
      id: "evt-1",
      type: "INITIAL_PURCHASE",
      app_user_id: "user-1",
      product_id: "coins_s",
      ...overrides,
    },
  };
}

describe("processEvent — grants per product", () => {
  it("coins_s grants 1000 coins, no entitlement", () => {
    const r = processEvent(rcEvent({ product_id: "coins_s" }), PRODUCTS);
    expect(r).toEqual({
      ok: true,
      grant: {
        userId: "user-1",
        productId: "coins_s",
        eventId: "evt-1",
        coins: productById("coins_s").coins,
        entitlement: null,
      },
    });
    expect(r.grant.coins).toBe(1000);
  });

  it("supporter grants 2000 coins + the supporter entitlement", () => {
    const r = processEvent(rcEvent({ product_id: "supporter" }), PRODUCTS);
    expect(r.ok).toBe(true);
    expect(r.grant.coins).toBe(2000);
    expect(r.grant.entitlement).toBe("supporter");
  });

  it.each(PRODUCTS)("grants exactly the catalog coin amount for $id", (product) => {
    const r = processEvent(rcEvent({ product_id: product.id }), PRODUCTS);
    expect(r.ok).toBe(true);
    expect(r.grant.coins).toBe(product.coins);
    expect(r.grant.entitlement).toBe(product.entitlement || null);
  });
});

describe("processEvent — accepted event types", () => {
  it("accepts INITIAL_PURCHASE", () => {
    const r = processEvent(rcEvent({ type: "INITIAL_PURCHASE" }), PRODUCTS);
    expect(r.ok).toBe(true);
  });

  it("accepts NON_RENEWING_PURCHASE (RC's type for non-subscription buys)", () => {
    const r = processEvent(rcEvent({ type: "NON_RENEWING_PURCHASE" }), PRODUCTS);
    expect(r.ok).toBe(true);
  });
});

describe("processEvent — ignored event types", () => {
  it("ignores TEST pings", () => {
    const r = processEvent(rcEvent({ type: "TEST" }), PRODUCTS);
    expect(r).toEqual({ ok: false, reason: "ignored-event-type" });
  });

  it("ignores RENEWAL (subscriptions aren't sold; also not a grant trigger)", () => {
    const r = processEvent(rcEvent({ type: "RENEWAL" }), PRODUCTS);
    expect(r).toEqual({ ok: false, reason: "ignored-event-type" });
  });

  it("ignores CANCELLATION", () => {
    const r = processEvent(rcEvent({ type: "CANCELLATION" }), PRODUCTS);
    expect(r).toEqual({ ok: false, reason: "ignored-event-type" });
  });
});

describe("processEvent — malformed / unresolvable events", () => {
  it("rejects an unknown product id", () => {
    const r = processEvent(rcEvent({ product_id: "coins_xxl" }), PRODUCTS);
    expect(r).toEqual({ ok: false, reason: "unknown-product" });
  });

  it("rejects a missing app_user_id", () => {
    const r = processEvent(rcEvent({ app_user_id: undefined }), PRODUCTS);
    expect(r).toEqual({ ok: false, reason: "missing-user" });
  });

  it("rejects a missing event id", () => {
    const r = processEvent(rcEvent({ id: undefined }), PRODUCTS);
    expect(r).toEqual({ ok: false, reason: "missing-event-id" });
  });

  it("rejects a garbage body with no event object", () => {
    expect(processEvent({ nope: true }, PRODUCTS)).toEqual({ ok: false, reason: "not-an-event" });
    expect(processEvent(null, PRODUCTS)).toEqual({ ok: false, reason: "not-an-event" });
    expect(processEvent(undefined, PRODUCTS)).toEqual({ ok: false, reason: "not-an-event" });
    expect(processEvent("garbage", PRODUCTS)).toEqual({ ok: false, reason: "not-an-event" });
    expect(processEvent({ event: null }, PRODUCTS)).toEqual({ ok: false, reason: "not-an-event" });
  });
});
