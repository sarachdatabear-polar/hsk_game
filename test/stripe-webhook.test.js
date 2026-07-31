import { describe, it, expect } from "vitest";
import { verifyStripeSignature, processStripeEvent } from "../supabase/functions/stripe-webhook/core.js";
import { PRODUCTS } from "../src/monetization/products.js";

function session(overrides = {}) {
  return {
    id: "cs_test_123",
    payment_status: "paid",
    client_reference_id: "11111111-2222-4333-8444-555555555555",
    metadata: { product_id: "supporter" },
    ...overrides,
  };
}

function evt(type, sessionOverrides = {}) {
  return { id: "evt_1", type, data: { object: session(sessionOverrides) } };
}

async function sign(payload, secret, timestamp) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`${timestamp}.${payload}`)));
  return [...mac].map(b => b.toString(16).padStart(2, "0")).join("");
}

describe("processStripeEvent", () => {
  it("grants on checkout.session.completed when paid", () => {
    const r = processStripeEvent(evt("checkout.session.completed"), PRODUCTS);
    expect(r.ok).toBe(true);
    expect(r.grant).toEqual({
      userId: "11111111-2222-4333-8444-555555555555",
      productId: "supporter",
      eventId: "cs_test_123",
      orderId: "cs_test_123",
      coins: 2000,
      entitlement: "supporter",
    });
  });

  it("uses the SESSION id, not the event id, for both idempotency and attribution", () => {
    const r = processStripeEvent(evt("checkout.session.completed"), PRODUCTS);
    expect(r.grant.eventId).toBe("cs_test_123");
    expect(r.grant.orderId).toBe("cs_test_123");
    expect(r.grant.eventId).not.toBe("evt_1");
  });

  it("grants on async_payment_succeeded when paid", () => {
    expect(processStripeEvent(evt("checkout.session.async_payment_succeeded"), PRODUCTS).ok).toBe(true);
  });

  it("ignores completed when payment_status is unpaid (PromptPay not yet confirmed)", () => {
    const r = processStripeEvent(evt("checkout.session.completed", { payment_status: "unpaid" }), PRODUCTS);
    expect(r).toEqual({ ok: false, reason: "not-paid" });
  });

  it("ignores async_payment_failed", () => {
    const r = processStripeEvent(evt("checkout.session.async_payment_failed", { payment_status: "unpaid" }), PRODUCTS);
    expect(r.ok).toBe(false);
  });

  it("ignores unrelated event types", () => {
    expect(processStripeEvent(evt("payment_intent.created"), PRODUCTS)).toEqual({ ok: false, reason: "ignored-event-type" });
  });

  it("rejects an unknown product", () => {
    const r = processStripeEvent(evt("checkout.session.completed", { metadata: { product_id: "nope" } }), PRODUCTS);
    expect(r).toEqual({ ok: false, reason: "unknown-product" });
  });

  it("rejects a missing user", () => {
    const r = processStripeEvent(evt("checkout.session.completed", { client_reference_id: null }), PRODUCTS);
    expect(r).toEqual({ ok: false, reason: "missing-user" });
  });

  it("rejects a missing session id", () => {
    const r = processStripeEvent(evt("checkout.session.completed", { id: "" }), PRODUCTS);
    expect(r).toEqual({ ok: false, reason: "missing-session-id" });
  });

  it("rejects a malformed body", () => {
    expect(processStripeEvent(null, PRODUCTS).ok).toBe(false);
    expect(processStripeEvent({ type: "checkout.session.completed" }, PRODUCTS).ok).toBe(false);
  });
});

describe("verifyStripeSignature", () => {
  const secret = "whsec_test";
  const body = '{"id":"evt_1"}';

  it("accepts a valid signature", async () => {
    const t = 1_700_000_000;
    const header = `t=${t},v1=${await sign(body, secret, t)}`;
    expect(await verifyStripeSignature(body, header, secret, t)).toBe(true);
  });

  it("accepts when ONE OF SEVERAL v1 entries matches (secret roll)", async () => {
    const t = 1_700_000_000;
    const good = await sign(body, secret, t);
    const header = `t=${t},v1=${"0".repeat(64)},v1=${good}`;
    expect(await verifyStripeSignature(body, header, secret, t)).toBe(true);
  });

  it("rejects a tampered body", async () => {
    const t = 1_700_000_000;
    const header = `t=${t},v1=${await sign(body, secret, t)}`;
    expect(await verifyStripeSignature('{"id":"evt_2"}', header, secret, t)).toBe(false);
  });

  it("rejects a stale timestamp", async () => {
    const t = 1_700_000_000;
    const header = `t=${t},v1=${await sign(body, secret, t)}`;
    expect(await verifyStripeSignature(body, header, secret, t + 400)).toBe(false);
  });

  it("rejects when the secret is unset", async () => {
    expect(await verifyStripeSignature(body, "t=1,v1=aa", "", 1)).toBe(false);
  });

  it("rejects a malformed header", async () => {
    expect(await verifyStripeSignature(body, "garbage", secret, 1)).toBe(false);
  });
});
