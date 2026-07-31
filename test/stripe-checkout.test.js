import { describe, it, expect } from "vitest";
import { buildSessionParams, encodeForm, parseCheckoutRequest } from "../supabase/functions/stripe-checkout/core.js";
import { productById } from "../src/monetization/products.js";

const supporter = productById("supporter");
const USER = "11111111-2222-4333-8444-555555555555";
const base = { product: supporter, userId: USER, successUrl: "https://luckycathsk.com/?session_id={CHECKOUT_SESSION_ID}", cancelUrl: "https://luckycathsk.com/" };

describe("buildSessionParams", () => {
  it("prices in THB minor units — 79฿ is 7900, not 79", () => {
    const p = buildSessionParams(base);
    expect(p["line_items[0][price_data][unit_amount]"]).toBe(7900);
    expect(p["line_items[0][price_data][currency]"]).toBe("thb");
  });

  it("derives the amount from the catalog rather than a literal", () => {
    const p = buildSessionParams({ ...base, product: { ...supporter, priceTHB: 129 } });
    expect(p["line_items[0][price_data][unit_amount]"]).toBe(12900);
  });

  it("offers PromptPay and card", () => {
    const p = buildSessionParams(base);
    expect(p["payment_method_types[0]"]).toBe("promptpay");
    expect(p["payment_method_types[1]"]).toBe("card");
  });

  it("is a one-time payment, never a subscription", () => {
    expect(buildSessionParams(base).mode).toBe("payment");
  });

  it("carries the user id and product id for the webhook", () => {
    const p = buildSessionParams(base);
    expect(p.client_reference_id).toBe(USER);
    expect(p["metadata[product_id]"]).toBe("supporter");
  });

  it("returns null for a missing product or user", () => {
    expect(buildSessionParams({ ...base, product: null })).toBeNull();
    expect(buildSessionParams({ ...base, userId: "" })).toBeNull();
  });
});

describe("parseCheckoutRequest", () => {
  it("defaults to supporter with no prior session on an empty body", () => {
    expect(parseCheckoutRequest({})).toEqual({ productId: "supporter", priorSessionId: "" });
    expect(parseCheckoutRequest(null)).toEqual({ productId: "supporter", priorSessionId: "" });
  });

  it("reads BOTH fields from ONE object — index.ts may only read the body once", () => {
    expect(parseCheckoutRequest({ productId: "coins_s", priorSessionId: "cs_prev" }))
      .toEqual({ productId: "coins_s", priorSessionId: "cs_prev" });
  });

  it("ignores non-string values", () => {
    expect(parseCheckoutRequest({ productId: 7, priorSessionId: {} }))
      .toEqual({ productId: "supporter", priorSessionId: "" });
  });
});

describe("encodeForm", () => {
  it("form-encodes nested Stripe keys without mangling brackets", () => {
    const out = encodeForm({ "metadata[product_id]": "supporter", mode: "payment" });
    expect(out).toContain("metadata%5Bproduct_id%5D=supporter");
    expect(out).toContain("mode=payment");
  });

  it("encodes the success URL placeholder intact", () => {
    const out = encodeForm({ success_url: "https://x/?session_id={CHECKOUT_SESSION_ID}" });
    expect(decodeURIComponent(out.split("=")[1])).toBe("https://x/?session_id={CHECKOUT_SESSION_ID}");
  });
});
