"use strict";
// Checkout Session parameter construction — pure, plain-ESM, no Deno APIs
// (house pattern: rc-webhook/core.js). index.ts does auth and the HTTP call.
//
// We build form params by hand rather than pulling the Stripe SDK into Deno:
// one POST to /v1/checkout/sessions is not worth a dependency, and a pure
// param builder is unit-testable where an SDK call is not.

// Stripe amounts are in the currency's MINOR unit. THB has two decimals, so
// 79฿ is 7900. Getting this wrong is a 100x pricing error in either
// direction, which is why it has its own test.
const THB_MINOR_UNITS = 100;

export function buildSessionParams({ product, userId, successUrl, cancelUrl }) {
  if (!product || !product.id || !Number.isFinite(product.priceTHB)) return null;
  if (typeof userId !== "string" || !userId) return null;
  return {
    mode: "payment",
    // PromptPay first so the QR is the default tab for Thai buyers; card is
    // the fallback and the only option for customers outside Thailand.
    "payment_method_types[0]": "promptpay",
    "payment_method_types[1]": "card",
    "line_items[0][quantity]": 1,
    "line_items[0][price_data][currency]": "thb",
    "line_items[0][price_data][unit_amount]": Math.round(product.priceTHB * THB_MINOR_UNITS),
    "line_items[0][price_data][product_data][name]": "Lucky Cat HSK Supporter",
    // client_reference_id is what the webhook reads back as the Supabase uid.
    client_reference_id: userId,
    "metadata[product_id]": product.id,
    success_url: successUrl,
    cancel_url: cancelUrl,
  };
}

export function encodeForm(params) {
  return Object.entries(params || {})
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
}

// Request-body parsing lives here, not in index.ts, so it is unit-testable.
// index.ts reads the body EXACTLY ONCE and hands the object here — a second
// read via req.clone() throws TypeError "unusable" per WHATWG Fetch, and a
// try/catch around it swallows the throw silently.
export function parseCheckoutRequest(body) {
  const b = body && typeof body === "object" ? body : {};
  return {
    productId: typeof b.productId === "string" && b.productId ? b.productId : "supporter",
    priorSessionId: typeof b.priorSessionId === "string" ? b.priorSessionId : "",
  };
}
