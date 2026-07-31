# Stripe PromptPay Web Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sell the 79฿ one-time Supporter on web through Stripe Checkout with PromptPay QR as the primary Thai payment method, delivering both the 2,000 coins **and** the `supporter` entitlement.

**Architecture:** Two Supabase edge functions (`stripe-checkout` creates a hosted Checkout Session from a verified JWT; `stripe-webhook` grants via the existing `grant_purchase` RPC). On the client, a new provider slots into the existing `provider.js` seam and a new wiring module owns the redirect-return leg. RevenueCat is untouched and keeps serving Android.

**Tech Stack:** Vanilla JS ES modules, Vitest, Deno edge functions, Stripe REST API (form-encoded, no SDK), Supabase (Postgres + RLS + auth).

**Spec:** `docs/superpowers/specs/2026-07-31-stripe-promptpay-web-billing-design.md`

## Global Constraints

- Branch: `development` in `/root/work/HSK/game`. Never stage `game/` from the parent repo.
- **Never hard-code a price outside `src/monetization/products.js`** — that file's own header says so. `supporter` is `{ id: "supporter", coins: 2000, entitlement: "supporter", priceTHB: 79, priceUSD: 2.99 }` at `products.js:11`.
- **THB is a two-decimal currency in Stripe: 79฿ is `unit_amount: 7900`.** Derive it as `priceTHB * 100`, never a literal.
- Edge functions follow the house split: pure `core.js` (plain ESM, no Deno APIs, vitest-tested) + thin `index.ts` (all I/O, untested — Deno TS does not run under vitest).
- **`main.js` is frozen at its current scope** (AGENTS.md). New wiring goes in its own module that `main.js` only mounts.
- All `nbhsk.*` access goes through `src/storage.js`'s `createStore`. `nbhsk.checkout` is **local-only — do NOT add it to `SYNC_KEYS`** in `merge.js`.
- Providers must **never throw** — the seam contract in `provider.js` requires every method to resolve.
- Lint before pushing: `npm run lint`. Never pipe `npm test` to `tail`/`grep` when gating a commit.
- Stripe secret key and webhook signing secret are **Supabase function secrets, never git**. The publishable key may be committed.
- Ship dark: a blank key in `stripe-config.js` must be a pure no-op, exactly as `REVENUECAT_WEB_PUBLIC_KEY` is today.

---

### Task 1: `stripe-webhook` edge function

**Files:**
- Create: `supabase/functions/stripe-webhook/core.js`
- Create: `supabase/functions/stripe-webhook/index.ts`
- Test: `test/stripe-webhook.test.js`

**Interfaces:**
- Consumes: `PRODUCTS` from `src/monetization/products.js`; the `grant_purchase` RPC from `docs/supabase/migrations/2026-07-12-iap-golive.sql`.
- Produces: `verifyStripeSignature(rawBody, header, secret, nowSeconds?, toleranceSeconds?) -> Promise<boolean>` and `processStripeEvent(body, catalog) -> {ok:true, grant:{userId, productId, eventId, orderId, coins, entitlement}} | {ok:false, reason:string}`.

- [ ] **Step 1: Write the failing test**

Create `test/stripe-webhook.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/stripe-webhook.test.js`
Expected: FAIL — cannot resolve `../supabase/functions/stripe-webhook/core.js`.

- [ ] **Step 3: Write the implementation**

Create `supabase/functions/stripe-webhook/core.js`:

```js
"use strict";
// Stripe webhook event handling — pure, plain-ESM, no Deno APIs (house pattern:
// rc-webhook/core.js). index.ts does all I/O; this file only decides WHAT to
// grant from an already-parsed body, so it runs under both vitest and Deno.
//
// Stripe body shape: { id, type, data: { object: <CheckoutSession> } }.
// Docs: docs.stripe.com/payments/checkout/fulfill-orders

// PromptPay is a DELAYED-NOTIFICATION method: checkout.session.completed can
// arrive with payment_status "unpaid", and the money only lands later on
// async_payment_succeeded. Both types are candidates; payment_status decides.
const GRANTABLE_TYPES = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

function bytesFromHex(hex) {
  if (!/^[0-9a-f]{64}$/i.test(hex || "")) return null;
  return new Uint8Array(hex.match(/../g).map(byte => parseInt(byte, 16)));
}

function constantTimeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let different = 0;
  for (let i = 0; i < a.length; i++) different |= a[i] ^ b[i];
  return different === 0;
}

// Stripe signs `${timestamp}.${raw body}` with HMAC-SHA256 and sends
// `t=<unix>,v1=<hex>` in Stripe-Signature. The header may carry MULTIPLE v1
// entries during a signing-secret roll, so collect them all — an
// Object.fromEntries parse (as rc-webhook does for RC's single-signature
// header) would silently keep only the last and reject valid deliveries.
export async function verifyStripeSignature(rawBody, header, secret, nowSeconds = Math.floor(Date.now() / 1000), toleranceSeconds = 300) {
  if (typeof rawBody !== "string" || typeof header !== "string" || typeof secret !== "string" || !secret) return false;
  try {
    let timestamp = NaN;
    const candidates = [];
    for (const part of header.split(",")) {
      const [key, value] = part.trim().split("=", 2);
      if (key === "t") timestamp = Number(value);
      else if (key === "v1") candidates.push(value);
    }
    if (!Number.isInteger(timestamp) || !candidates.length) return false;
    if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false;
    const encoder = new TextEncoder();
    const key = await globalThis.crypto.subtle.importKey(
      "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const expected = new Uint8Array(await globalThis.crypto.subtle.sign(
      "HMAC", key, encoder.encode(`${timestamp}.${rawBody}`)));
    // Compare against every candidate; do not short-circuit on the first miss.
    let matched = false;
    for (const candidate of candidates) {
      if (constantTimeEqual(expected, bytesFromHex(candidate))) matched = true;
    }
    return matched;
  } catch {
    return false;
  }
}

export function processStripeEvent(body, catalog) {
  const fail = reason => ({ ok: false, reason });
  if (!body || typeof body !== "object") return fail("not-an-event");
  if (!GRANTABLE_TYPES.has(body.type)) return fail("ignored-event-type");
  const session = body.data && body.data.object;
  if (!session || typeof session !== "object") return fail("not-an-event");
  // The ONLY safe grant trigger. A completed-but-unpaid session is a PromptPay
  // QR that has been shown, not money that has arrived.
  if (session.payment_status !== "paid") return fail("not-paid");
  if (!session.id) return fail("missing-session-id");
  if (!session.client_reference_id) return fail("missing-user");
  const productId = session.metadata && session.metadata.product_id;
  const product = (catalog || []).find(p => p.id === productId) || null;
  if (!product) return fail("unknown-product");
  return {
    ok: true,
    grant: {
      userId: session.client_reference_id,
      productId: product.id,
      // Session id for BOTH: one semantic id per purchase. p_order_id must
      // equal it for the client's sync.js reconcile to match; p_event_id is
      // grant_purchase's idempotency key so the second qualifying event for
      // the same session returns "duplicate".
      eventId: session.id,
      orderId: session.id,
      coins: product.coins,
      entitlement: product.entitlement || null,
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/stripe-webhook.test.js`
Expected: PASS, 16 tests.

- [ ] **Step 5: Write the Deno wrapper**

Create `supabase/functions/stripe-webhook/index.ts`:

```ts
// Stripe webhook — Deno Edge Function. Thin I/O wrapper: all grant decision
// logic lives in core.js (vitest-tested, see test/stripe-webhook.test.js).
//
// ⚠ DEPLOY WITH JWT VERIFICATION DISABLED (--no-verify-jwt). Stripe sends no
// Supabase JWT; the platform gateway would 401 before this function runs.
// Same requirement as rc-webhook — see docs/supabase/README.md.
//
// No CORS here: the caller is Stripe's server, not a browser. (Contrast
// stripe-checkout, which IS browser-called and needs a preflight handler.)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { processStripeEvent, verifyStripeSignature } from "./core.js";
import { PRODUCTS } from "../../../src/monetization/products.js";

Deno.serve(async (req) => {
  const signingSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  // Fail closed: an unset secret must never be treated as "no signature needed".
  if (!signingSecret || !supabaseUrl || !serviceRoleKey) {
    return new Response("service unavailable", { status: 503 });
  }

  let body, rawBody;
  try {
    rawBody = await req.text();
    if (!await verifyStripeSignature(rawBody, req.headers.get("Stripe-Signature"), signingSecret)) {
      return new Response("unauthorized", { status: 401 });
    }
    body = JSON.parse(rawBody);
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const result = processStripeEvent(body, PRODUCTS);
  if (!result.ok) {
    // Stripe retries non-2xx. Ignorable events (wrong type, unpaid, unknown
    // product) are not delivery failures — ack 200 so Stripe stops retrying.
    return new Response(JSON.stringify({ ignored: result.reason }), { status: 200 });
  }

  const { userId, productId, eventId, orderId, coins, entitlement } = result.grant;
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase.rpc("grant_purchase", {
    p_user_id: userId,
    p_delta: coins,
    p_reason: productId,
    p_event_id: eventId,
    p_order_id: orderId,
    p_entitlement: entitlement,
  });
  if (error) return new Response("storage error", { status: 500 }); // real failure — let Stripe retry

  switch (data) {
    case "granted": return new Response(JSON.stringify({ ok: true }), { status: 200 });
    case "duplicate": return new Response(JSON.stringify({ duplicate: true }), { status: 200 });
    // Deleted account: permanent, so ack — retrying can never succeed.
    case "unknown-user": return new Response(JSON.stringify({ ignored: "unknown-user" }), { status: 200 });
    default: return new Response("storage error", { status: 500 });
  }
});
```

- [ ] **Step 6: Run the full suite and lint**

Run: `npm test` then `npm run lint`
Expected: both exit 0. Capture the exit codes directly — do not pipe to `tail`.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/stripe-webhook test/stripe-webhook.test.js
git commit -m "feat(billing): stripe-webhook edge function

Mirrors rc-webhook's pure-core/thin-IO split and calls the same
grant_purchase RPC. Grants only on payment_status \"paid\" (PromptPay is a
delayed-notification method, so completed can arrive unpaid), and keys
idempotency on the Checkout Session id so the second qualifying event for
one session returns duplicate. Signature parser collects every v1 entry —
Stripe sends several during a secret roll."
```

---

### Task 2: `stripe-checkout` edge function

**Files:**
- Create: `supabase/functions/stripe-checkout/core.js`
- Create: `supabase/functions/stripe-checkout/index.ts`
- Test: `test/stripe-checkout.test.js`

**Interfaces:**
- Consumes: `productById` from `src/monetization/products.js`.
- Produces: `buildSessionParams({ product, userId, successUrl, cancelUrl }) -> object` (flat Stripe form keys) and `encodeForm(params) -> string`.

- [ ] **Step 1: Write the failing test**

Create `test/stripe-checkout.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/stripe-checkout.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `supabase/functions/stripe-checkout/core.js`:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/stripe-checkout.test.js`
Expected: PASS, 11 tests.

- [ ] **Step 5: Write the Deno wrapper**

Create `supabase/functions/stripe-checkout/index.ts`:

```ts
// Stripe Checkout Session creation — Deno Edge Function. Thin I/O wrapper;
// param construction lives in core.js (vitest-tested).
//
// CORS is REQUIRED here — this function's only caller is the browser client
// with an Authorization header, which triggers a preflight OPTIONS the
// function must answer or the real POST never fires. Modelled on
// delete-account/index.ts, NOT rc-webhook (which Stripe's server calls).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildSessionParams, encodeForm, parseCheckoutRequest } from "./core.js";
import { productById } from "../../../src/monetization/products.js";

// Pin the API version — the account default drifts under you otherwise.
const STRIPE_API_VERSION = "2025-08-27.basil";
const SITE_ORIGIN = "https://luckycathsk.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body, status) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!stripeKey || !supabaseUrl || !anonKey) return reply("service unavailable", 503);

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return reply({ error: "unauthorized" }, 401);

  // Resolve the caller from their OWN verified token — never from the body.
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData && userData.user;
  if (userError || !user) return reply({ error: "unauthorized" }, 401);

  // A Supabase ANONYMOUS session is a perfectly valid JWT. Verifying the
  // signature is not enough — an anonymous buyer has no restore path and no
  // support handle, so refuse explicitly (spec decision 2).
  if (user.is_anonymous || !user.email) return reply({ error: "needs-account" }, 403);

  // ONE read of the body. Request.clone() throws TypeError "unusable" once the
  // body has been consumed (WHATWG Fetch, which Deno implements), so a second
  // `await req.clone().json()` inside a try/catch would silently swallow the
  // throw and leave the field permanently empty. Parsing is delegated to
  // core.js so it is unit-testable and this hazard cannot reappear.
  let parsed = { productId: "supporter", priorSessionId: "" };
  try { parsed = parseCheckoutRequest(await req.json()); } catch { /* empty body is fine */ }
  const product = productById(parsed.productId);
  if (!product || !product.entitlement) return reply({ error: "unknown-product" }, 400);

  // Already a Supporter: refuse rather than charge twice. entitlements is
  // owner-readable under RLS, so the caller's own token can check this.
  const { data: owned } = await supabase
    .from("entitlements").select("product_id")
    .eq("user_id", user.id).eq("product_id", product.entitlement).maybeSingle();
  if (owned) return reply({ error: "already-owned" }, 409);

  // Expire any session this device left open. Two live sessions have
  // DIFFERENT ids, so the ledger dedupe cannot stop them both charging.
  //
  // ⚠ THIS NARROWS THE HOLE, IT DOES NOT CLOSE IT. It depends on the client
  // voluntarily reporting its own prior session id, so two independent tabs or
  // two devices with no shared client state still produce two live sessions.
  // Real protection lives in the webhook's idempotent grant; this is a
  // courtesy that stops the common single-device retry from double-charging.
  if (parsed.priorSessionId) {
    await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(parsed.priorSessionId)}/expire`, {
      method: "POST",
      headers: { Authorization: `Bearer ${stripeKey}`, "Stripe-Version": STRIPE_API_VERSION },
    }).catch(() => {});   // best-effort: an already-expired session 400s harmlessly
  }

  const params = buildSessionParams({
    product,
    userId: user.id,
    successUrl: `${SITE_ORIGIN}/?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${SITE_ORIGIN}/`,
  });
  if (!params) return reply({ error: "bad-request" }, 400);

  const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      "Stripe-Version": STRIPE_API_VERSION,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: encodeForm(params),
  });
  if (!stripeRes.ok) return reply({ error: "stripe-error" }, 502);
  const session = await stripeRes.json();
  if (!session || !session.id || !session.url) return reply({ error: "stripe-error" }, 502);
  return reply({ url: session.url, sessionId: session.id }, 200);
});
```

- [ ] **Step 6: Run the full suite and lint**

Run: `npm test` then `npm run lint`
Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/stripe-checkout test/stripe-checkout.test.js
git commit -m "feat(billing): stripe-checkout edge function

Creates a hosted Checkout Session with PromptPay first and card as fallback.
Derives the user id from the caller's own verified JWT and refuses anonymous
sessions explicitly -- a Supabase anon JWT is still a valid JWT. Refuses when
the entitlement is already held, and expires the session this device last
recorded, which NARROWS the concurrent double-charge window without closing
it: it relies on the client reporting its own prior session id, so two tabs
or two devices still create two live sessions. Real protection is the
webhook's idempotent grant. The body is read EXACTLY ONCE and parsed by
core.js's parseCheckoutRequest -- req.clone() throws once the body is
consumed, and a try/catch around it swallows the throw silently. CORS shell
follows delete-account, not rc-webhook. Stripe API version pinned."
```

---

### Task 3: pending-checkout record (pure module)

**Files:**
- Create: `src/monetization/checkout-pending.js`
- Test: `test/checkout-pending.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `PENDING_TTL_MS` (number), `writePending(store, {sessionId, productId, now}) -> void`, `readPending(store, now) -> {sessionId, productId, startedAt} | null`, `clearPending(store) -> void`.

- [ ] **Step 1: Write the failing test**

Create `test/checkout-pending.test.js`:

```js
import { describe, it, expect } from "vitest";
import { PENDING_TTL_MS, writePending, readPending, clearPending } from "../src/monetization/checkout-pending.js";

function fakeStore() {
  const map = new Map();
  return {
    map,
    get: (k, d) => (map.has(k) ? map.get(k) : d),
    set: (k, v) => map.set(k, v),
    remove: k => map.delete(k),
  };
}

const T0 = 1_800_000_000_000;

describe("checkout-pending", () => {
  it("round-trips a pending record", () => {
    const s = fakeStore();
    writePending(s, { sessionId: "cs_1", productId: "supporter", now: T0 });
    expect(readPending(s, T0 + 1000)).toEqual({ sessionId: "cs_1", productId: "supporter", startedAt: T0 });
  });

  it("stores under the local-only key `checkout`", () => {
    const s = fakeStore();
    writePending(s, { sessionId: "cs_1", productId: "supporter", now: T0 });
    expect(s.map.has("checkout")).toBe(true);
  });

  it("expires after 24h so an abandoned checkout never lingers", () => {
    const s = fakeStore();
    writePending(s, { sessionId: "cs_1", productId: "supporter", now: T0 });
    expect(readPending(s, T0 + PENDING_TTL_MS - 1)).not.toBeNull();
    expect(readPending(s, T0 + PENDING_TTL_MS + 1)).toBeNull();
  });

  it("removes the key when it expires rather than re-reading it forever", () => {
    const s = fakeStore();
    writePending(s, { sessionId: "cs_1", productId: "supporter", now: T0 });
    readPending(s, T0 + PENDING_TTL_MS + 1);
    expect(s.map.has("checkout")).toBe(false);
  });

  it("clears on demand", () => {
    const s = fakeStore();
    writePending(s, { sessionId: "cs_1", productId: "supporter", now: T0 });
    clearPending(s);
    expect(readPending(s, T0)).toBeNull();
  });

  it("returns null for absent, malformed, or incomplete records", () => {
    const s = fakeStore();
    expect(readPending(s, T0)).toBeNull();
    s.set("checkout", "not-an-object");
    expect(readPending(s, T0)).toBeNull();
    s.set("checkout", { productId: "supporter", startedAt: T0 });
    expect(readPending(s, T0)).toBeNull();
  });

  it("ignores a write with no session id", () => {
    const s = fakeStore();
    writePending(s, { sessionId: "", productId: "supporter", now: T0 });
    expect(readPending(s, T0)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/checkout-pending.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/monetization/checkout-pending.js`:

```js
"use strict";
// The durable record of an in-flight Stripe Checkout.
//
// WHY DURABLE: purchase-poll.js gives up after 3 tries x 2s. That is fine for
// a card, but PromptPay can confirm AFTER the buyer is already back — or after
// they have closed the tab. It also covers the redirect's worst failure: on an
// installed iOS PWA, navigating out to Stripe can land the buyer in Safari and
// never return them to the PWA shell, so they may never see the success URL at
// all. Re-checking this record on boot means the grant still lands.
//
// LOCAL-ONLY BY DESIGN: `checkout` is deliberately NOT in merge.js's SYNC_KEYS.
// An in-flight checkout is device-scoped confirmation UX; the grant itself is
// server-side against the user id, and any other device learns of the coins
// through its ordinary reconcile. Syncing this would be actively wrong.
const KEY = "checkout";

// Matches Stripe's default Checkout Session expiry.
export const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

export function writePending(store, { sessionId, productId, now }) {
  if (typeof sessionId !== "string" || !sessionId) return;
  store.set(KEY, { sessionId, productId, startedAt: Number(now) || 0 });
}

export function readPending(store, now = Date.now()) {
  const raw = store.get(KEY, null);
  if (!raw || typeof raw !== "object" || typeof raw.sessionId !== "string" || !raw.sessionId) return null;
  const startedAt = Number(raw.startedAt) || 0;
  // Drop it rather than leave a tombstone we re-read on every boot.
  if (now - startedAt > PENDING_TTL_MS) { clearPending(store); return null; }
  return { sessionId: raw.sessionId, productId: raw.productId, startedAt };
}

export function clearPending(store) {
  if (typeof store.remove === "function") store.remove(KEY);
  else store.set(KEY, null);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/checkout-pending.test.js`
Expected: PASS, 7 tests.

- [ ] **Step 5: Confirm the key is NOT synced**

Run: `grep -n "checkout" src/merge.js`
Expected: no output. If `checkout` appears in `BASE_SYNC_KEYS`, remove it — an in-flight checkout must not sync.

- [ ] **Step 6: Commit**

```bash
git add src/monetization/checkout-pending.js test/checkout-pending.test.js
git commit -m "feat(billing): durable pending-checkout record

Local-only nbhsk.checkout with a 24h TTL matching Stripe's session expiry.
purchase-poll gives up after 6s, but PromptPay can confirm after the buyer is
back or has closed the tab -- and on an installed iOS PWA the redirect can
land them in Safari and never return them, so they may never see the success
URL. Re-checking this on boot is what makes the redirect safe."
```

---

### Task 4: `stripe-config.js` + `provider-stripe-web.js`

**Files:**
- Create: `src/monetization/stripe-config.js`
- Create: `src/monetization/provider-stripe-web.js`
- Test: `test/provider-stripe-web.test.js`

**Interfaces:**
- Consumes: `productById`, `displayPrice` from `products.js`; `writePending`, `readPending` from `checkout-pending.js`.
- Produces: `stripeWebProvider(opts) -> provider` with `kind: "stripe-web"` and the full seam contract from `provider.js`; `STRIPE_PUBLISHABLE_KEY`, `STRIPE_CHECKOUT_URL`, `STRIPE_WEB_PRODUCT_IDS` from `stripe-config.js`.

**Provider contract reminder (from `provider.js`):** all methods async, **never throw**. `purchase` resolves `{ok:true, orderId}` or `{ok:false, reason:"cancelled"|"pending"|"failed"|"unavailable"}`. This provider adds `"needs-account"` as a reason so the UI can route to sign-in rather than show a generic failure.

- [ ] **Step 1: Write the failing test**

Create `test/provider-stripe-web.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/provider-stripe-web.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the config module**

Create `src/monetization/stripe-config.js`:

```js
"use strict";
// Stripe web-billing configuration. Mirrors revenuecat-config.js.
//
// SHIPPED DARK: a blank checkout URL makes the provider unavailable, which
// makes iapVisible() false, which hides the whole purchase surface. Filling
// this in is the go-live switch — same contract as REVENUECAT_WEB_PUBLIC_KEY.
//
// The publishable key is safe to commit (it is public by design). The SECRET
// key and the webhook signing secret are Supabase function secrets and must
// never appear in this repo.
export const STRIPE_PUBLISHABLE_KEY = "";

// Supabase edge function endpoint, e.g.
// https://<project>.supabase.co/functions/v1/stripe-checkout
export const STRIPE_CHECKOUT_URL = "";

// Web sells the Supporter only this milestone. Coin packs on web are go-live
// step 8, sequenced after the placement sprint.
export const STRIPE_WEB_PRODUCT_IDS = ["supporter"];
```

- [ ] **Step 4: Write the provider**

Create `src/monetization/provider-stripe-web.js`:

```js
"use strict";
import { productById } from "./products.js";
import { writePending, readPending } from "./checkout-pending.js";

// Stripe implementation of the provider seam (contract documented in
// provider.js). Every dependency is injected so all branches are covered in
// plain Vitest without a browser — same shape as provider-revenuecat-web.js.
//
// PURCHASE IS A REDIRECT, so purchase() can never resolve {ok:true}: the page
// is navigating away. It resolves {ok:false, reason:"pending"} and the return
// leg (src/ui/checkout-return.js) completes the transaction.
export function stripeWebProvider(opts = {}) {
  const checkoutUrl = String(opts.checkoutUrl || "").trim();
  const productIds = [...new Set(opts.productIds || [])].filter(id => productById(id));
  const store = opts.store;
  const isNative = typeof opts.isNative === "function" ? opts.isNative : () => false;
  const isFileProtocol = typeof opts.isFileProtocol === "function" ? opts.isFileProtocol : () => false;
  const ensureUserId = typeof opts.ensureUserId === "function" ? opts.ensureUserId : async () => null;
  const getAccessToken = typeof opts.getAccessToken === "function" ? opts.getAccessToken : async () => null;
  const isAnonymous = typeof opts.isAnonymous === "function" ? opts.isAnonymous : async () => true;
  const fetchEntitlements = typeof opts.fetchEntitlements === "function" ? opts.fetchEntitlements : async () => [];
  const redirect = typeof opts.redirect === "function"
    ? opts.redirect
    : (url) => { if (typeof location !== "undefined") location.assign(url); };
  const fetchImpl = opts.fetchImpl || (typeof fetch === "function" ? fetch.bind(globalThis) : null);
  const now = typeof opts.now === "function" ? opts.now : () => Date.now();

  function usable() {
    return !!checkoutUrl && !!fetchImpl && !isNative() && !isFileProtocol();
  }

  return {
    kind: "stripe-web",

    async available() {
      try { return usable() && productIds.length > 0; } catch { return false; }
    },

    supports(productId) { return productIds.includes(productId); },

    // True whenever this provider sells at least one entitlement-bearing
    // product (today: supporter). Entitlements live server-side and are
    // owner-readable under RLS, so Restore has something to ask. This lights
    // the account-screen Restore button, which is a NEW DEVICE's only route to
    // an entitlement it never saw bought. NOTE: if web ever sells coin-only,
    // this goes false and a returning Supporter loses Restore on this surface.
    supportsRestore() { return productIds.some(id => !!(productById(id) || {}).entitlement); },

    // Stripe exposes no client-side price API here, so the catalog's
    // displayPrice wins (main.js falls back on null).
    price() { return null; },

    async purchase(productId) {
      try {
        if (!usable() || !productIds.includes(productId)) return { ok: false, reason: "unavailable" };
        // Refuse anonymous buyers CLIENT-side too. The server refuses as well,
        // but a server-only refusal surfaces as a generic failure toast; this
        // reason lets the UI route to the sign-in sheet instead.
        if (await isAnonymous()) return { ok: false, reason: "needs-account" };
        const userId = await ensureUserId();
        if (!userId) return { ok: false, reason: "needs-account" };
        const token = await getAccessToken();
        if (!token) return { ok: false, reason: "needs-account" };

        // readPending, not a raw store.get: it applies the TTL and shape validation,
        // so a stale record can never be sent as a prior session id to expire.
        const prior = store ? (readPending(store, now()) || {}).sessionId || "" : "";
        const res = await fetchImpl(checkoutUrl, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ productId, priorSessionId: prior }),
        });
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          const error = payload && payload.error;
          if (error === "needs-account") return { ok: false, reason: "needs-account" };
          if (error === "already-owned") return { ok: false, reason: "unavailable" };
          return { ok: false, reason: "failed" };
        }
        if (!payload || !payload.url || !payload.sessionId) return { ok: false, reason: "failed" };

        // Persist BEFORE navigating — after location.assign we get no more turns.
        if (store) writePending(store, { sessionId: payload.sessionId, productId, now: now() });
        redirect(payload.url);
        return { ok: false, reason: "pending" };
      } catch {
        return { ok: false, reason: "failed" };
      }
    },

    async restore() {
      try {
        if (!usable()) return { ok: false, reason: "unavailable" };
        const userId = await ensureUserId();
        if (!userId) return { ok: false, reason: "unavailable" };
        const rows = await fetchEntitlements(userId);
        const held = new Set((rows || []).filter(id => typeof id === "string"));
        const ownedProductIds = productIds.filter(id => held.has((productById(id) || {}).entitlement));
        return { ok: true, ownedProductIds };
      } catch {
        return { ok: false, reason: "unavailable" };
      }
    },
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run test/provider-stripe-web.test.js`
Expected: PASS, 24 tests.

- [ ] **Step 6: Run the full suite and lint**

Run: `npm test` then `npm run lint`
Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/monetization/stripe-config.js src/monetization/provider-stripe-web.js test/provider-stripe-web.test.js
git commit -m "feat(billing): stripe web provider with entitlement restore

Implements the provider.js seam. purchase() is a redirect so it resolves
{ok:false, reason:\"pending\"} and persists the session id before navigating.
Adds a needs-account reason so an anonymous buyer routes to sign-in rather
than a generic failure toast. restore() reads the RLS-readable entitlements
table -- the only route by which a new device learns it owns Supporter.
Ships dark: a blank checkout URL makes the provider unavailable."
```

---

### Task 5: provider selection precedence

**Files:**
- Modify: `src/monetization/provider.js`
- Test: `test/provider.test.js` (extend the existing file)

**Interfaces:**
- Consumes: `stripeWebProvider` from Task 4; `STRIPE_CHECKOUT_URL`, `STRIPE_WEB_PRODUCT_IDS` from `stripe-config.js`.
- Produces: `getProvider(opts)` now returns the Stripe provider on web when configured.

- [ ] **Step 1: Write the failing test**

Append to `test/provider.test.js`:

```js
import { stripeWebProvider } from "../src/monetization/provider-stripe-web.js";

describe("provider selection — stripe web", () => {
  const stripeOpts = {
    stripe: { checkoutUrl: "https://fn/stripe-checkout", isNative: () => false, isFileProtocol: () => false },
  };

  it("selects stripe-web on web when a checkout url is configured", () => {
    expect(getProvider(stripeOpts).kind).toBe("stripe-web");
  });

  it("prefers stripe-web over revenuecat-web when both are configured", () => {
    const p = getProvider({ ...stripeOpts, revenuecatWeb: { apiKey: "rcb_x", sdk: {}, isNative: () => false } });
    expect(p.kind).toBe("stripe-web");
  });

  it("falls back to mock when the stripe checkout url is blank (shipped dark)", () => {
    expect(getProvider({ stripe: { checkoutUrl: "", isNative: () => false } }).kind).toBe("mock");
  });

  it("never selects stripe-web on native — RevenueCat owns Android", () => {
    const p = getProvider({ stripe: { checkoutUrl: "https://fn/x", isNative: () => true } });
    expect(p.kind).not.toBe("stripe-web");
  });

  it("never selects stripe-web on file://", () => {
    const p = getProvider({ stripe: { checkoutUrl: "https://fn/x", isNative: () => false, isFileProtocol: () => true } });
    expect(p.kind).not.toBe("stripe-web");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/provider.test.js`
Expected: FAIL — `kind` is `"mock"`, not `"stripe-web"`.

- [ ] **Step 3: Modify `provider.js`**

Add the import beside the existing provider imports:

```js
import { stripeWebProvider } from "./provider-stripe-web.js";
import { STRIPE_CHECKOUT_URL, STRIPE_WEB_PRODUCT_IDS } from "./stripe-config.js";
```

Insert this block **after** the native RevenueCat branch and **before** the `revenuecatWeb` branch, so Stripe wins on web:

```js
  // PRECEDENCE: on web, Stripe beats RevenueCat Web Billing. RC Web Billing
  // cannot surface PromptPay (it offers card/Apple Pay/Google Pay only, and
  // RevenueCat — not the merchant — controls that list), and PromptPay is the
  // primary method for Thai buyers. Native is untouched: RevenueCat still owns
  // Android above.
  const stripe = opts.stripe || {};
  const checkoutUrl = stripe.checkoutUrl == null ? STRIPE_CHECKOUT_URL : stripe.checkoutUrl;
  const stripeIsNative = stripe.isNative || isNative;
  const stripeIsFile = stripe.isFileProtocol
    || (() => typeof location !== "undefined" && location.protocol === "file:");
  if (String(checkoutUrl || "").trim() && !stripeIsNative() && !stripeIsFile()) {
    return stripeWebProvider({
      checkoutUrl,
      productIds: stripe.productIds || STRIPE_WEB_PRODUCT_IDS,
      store: stripe.store || (opts.get && opts.set ? { get: opts.get, set: opts.set, remove: opts.remove } : null),
      isNative: stripeIsNative,
      isFileProtocol: stripeIsFile,
      ensureUserId: opts.ensureUserId,
      getAccessToken: stripe.getAccessToken,
      isAnonymous: stripe.isAnonymous,
      fetchEntitlements: stripe.fetchEntitlements,
    });
  }
```

Also update the interface comment at the top of the file: `kind: "mock" | "revenuecat" | "revenuecat-web" | "stripe-web"`, and note the new `"needs-account"` purchase reason.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/provider.test.js`
Expected: PASS.

- [ ] **Step 5: Run the full suite and lint**

Run: `npm test` then `npm run lint`
Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/monetization/provider.js test/provider.test.js
git commit -m "feat(billing): select the stripe provider on web, ahead of RC web

Stripe wins over RevenueCat Web Billing on web because RC cannot surface
PromptPay. Native is untouched -- RevenueCat still owns Android. Blank
checkout URL still falls through to mock, so this ships dark."
```

---

### Task 6: the return leg

**Files:**
- Create: `src/ui/checkout-return.js`
- Test: `test/checkout-return.test.js`

**Interfaces:**
- Consumes: `readPending`, `clearPending` from `checkout-pending.js`; `pollForCredit` from `purchase-poll.js`; `restoreFrom` from `purchases.js`.
- Produces: `resolvePendingCheckout({ store, provider, reconcile, sleep, now, onCredited, onEntitlement, track }) -> Promise<{resolved:boolean, credited:boolean, delta:number}>`.

**Why this exists:** `pollForCredit` delivers the **coins only**. Supporter *status* rides `ent`, which is local-only and never touched by reconcile; the native flow sets it via `prov.restore()` at `main.js:3910-3917`, and that code is unreachable in a redirect flow. Without this module the buyer pays 79฿, gets 2,000 coins, and never gets ad removal or the badge.

- [ ] **Step 1: Write the failing test**

Create `test/checkout-return.test.js`:

```js
import { describe, it, expect, vi } from "vitest";
import { resolvePendingCheckout } from "../src/ui/checkout-return.js";
import { writePending, readPending } from "../src/monetization/checkout-pending.js";

function fakeStore() {
  const map = new Map();
  return { map, get: (k, d) => (map.has(k) ? map.get(k) : d), set: (k, v) => map.set(k, v), remove: k => map.delete(k) };
}
const T0 = 1_800_000_000_000;

function setup(over = {}) {
  const store = over.store || fakeStore();
  writePending(store, { sessionId: "cs_1", productId: "supporter", now: T0 });
  return {
    store,
    provider: { restore: vi.fn(async () => ({ ok: true, ownedProductIds: ["supporter"] })) },
    reconcile: vi.fn(async () => ({ ok: true, credits: [{ orderId: "cs_1", delta: 2000 }] })),
    sleep: async () => {},
    now: () => T0 + 1000,
    onCredited: vi.fn(),
    onEntitlement: vi.fn(),
    track: vi.fn(),
    ...over,
  };
}

describe("resolvePendingCheckout", () => {
  it("does nothing when there is no pending checkout", async () => {
    const s = setup({ store: fakeStore() });
    s.store.remove("checkout");
    const r = await resolvePendingCheckout(s);
    expect(r.resolved).toBe(false);
    expect(s.reconcile).not.toHaveBeenCalled();
  });

  it("credits the coins and clears the record", async () => {
    const s = setup();
    const r = await resolvePendingCheckout(s);
    expect(r).toEqual({ resolved: true, credited: true, delta: 2000 });
    expect(s.onCredited).toHaveBeenCalledWith(2000);
    expect(readPending(s.store, T0 + 1000)).toBeNull();
  });

  it("ALSO delivers the entitlement — coins alone are not Supporter", async () => {
    const s = setup();
    await resolvePendingCheckout(s);
    expect(s.provider.restore).toHaveBeenCalled();
    expect(s.onEntitlement).toHaveBeenCalledWith(["supporter"]);
  });

  it("keeps the pending record when the credit has not landed yet", async () => {
    const s = setup({ reconcile: async () => ({ ok: true, credits: [] }) });
    const r = await resolvePendingCheckout(s);
    expect(r).toEqual({ resolved: true, credited: false, delta: 0 });
    expect(readPending(s.store, T0 + 1000)).not.toBeNull();
    expect(s.onEntitlement).not.toHaveBeenCalled();
  });

  it("fires purchase_success only once the credit lands", async () => {
    const s = setup();
    await resolvePendingCheckout(s);
    expect(s.track).toHaveBeenCalledWith("purchase_success", { product: "supporter" });

    const pendingOnly = setup({ reconcile: async () => ({ ok: true, credits: [] }) });
    await resolvePendingCheckout(pendingOnly);
    expect(pendingOnly.track).not.toHaveBeenCalled();
  });

  it("still clears and credits when restore fails — coins must not be held hostage", async () => {
    const s = setup({ provider: { restore: async () => ({ ok: false, reason: "unavailable" }) } });
    const r = await resolvePendingCheckout(s);
    expect(r.credited).toBe(true);
    expect(s.onEntitlement).not.toHaveBeenCalled();
    expect(readPending(s.store, T0 + 1000)).toBeNull();
  });

  it("never throws when the provider or reconcile explodes", async () => {
    const s = setup({ reconcile: async () => { throw new Error("offline"); } });
    await expect(resolvePendingCheckout(s)).resolves.toEqual({ resolved: true, credited: false, delta: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/checkout-return.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/ui/checkout-return.js`:

```js
"use strict";
// Completes a Stripe checkout after the redirect returns (or on any later
// boot, if the buyer never came back).
//
// TWO HALVES, AND THE SECOND IS EASY TO MISS: pollForCredit delivers the
// COINS via sync.js's ledger reconcile. Supporter STATUS rides `ent`, which is
// local-only, absent from SYNC_KEYS, and never touched by reconcile. The
// native flow sets it by calling prov.restore() after a credited entitlement
// purchase (main.js:3910-3917) — unreachable here, because purchase() returns
// "pending" and iapBuy exits before the page navigates away. Deliver both, or
// the buyer pays 79฿, receives 2,000 coins, and is never a Supporter.
import { readPending, clearPending } from "../monetization/checkout-pending.js";
import { pollForCredit } from "../monetization/purchase-poll.js";

export async function resolvePendingCheckout({
  store, provider, reconcile, sleep, now = Date.now,
  onCredited, onEntitlement, track,
}) {
  const idle = { resolved: false, credited: false, delta: 0 };
  let pending;
  try { pending = readPending(store, now()); } catch { return idle; }
  if (!pending) return idle;

  let credited = false;
  let delta = 0;
  try {
    const result = await pollForCredit({ reconcile, orderId: pending.sessionId, sleep });
    credited = !!(result && result.credited);
    delta = Number(result && result.delta) || 0;
  } catch {
    // Offline or a mid-flight sync fault is "no credit seen THIS time", not a
    // failure: the record survives and the next boot re-checks it.
    return { resolved: true, credited: false, delta: 0 };
  }

  // Not yet paid, or a PromptPay QR still unconfirmed. Keep the record.
  if (!credited) return { resolved: true, credited: false, delta: 0 };

  if (typeof onCredited === "function") onCredited(delta);

  // Entitlement half. A restore failure must NOT hold the coins hostage or
  // resurrect the pending record — the money landed either way, and the
  // account-screen Restore button remains a manual second chance.
  try {
    const restored = provider && typeof provider.restore === "function" ? await provider.restore() : null;
    if (restored && restored.ok && typeof onEntitlement === "function") {
      onEntitlement(restored.ownedProductIds || []);
    }
  } catch { /* leave it to the Restore button */ }

  try { clearPending(store); } catch { /* nothing else to do */ }
  // The funnel breaks across the redirect otherwise: purchase_start fires in
  // iapBuy (main.js:3821) but purchase_success (main.js:3895) sits in the
  // branch a redirect never reaches.
  if (typeof track === "function") track("purchase_success", { product: pending.productId });
  return { resolved: true, credited: true, delta };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/checkout-return.test.js`
Expected: PASS, 7 tests.

- [ ] **Step 5: Run the full suite and lint**

Run: `npm test` then `npm run lint`
Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/ui/checkout-return.js test/checkout-return.test.js
git commit -m "feat(billing): complete the checkout on return, entitlement included

pollForCredit delivers supporter's 2,000 coins; supporter STATUS rides `ent`,
which is local-only and never touched by reconcile. The native path sets it
via prov.restore(), which a redirect flow never reaches -- so this module
does both, or the buyer pays and never gets ad removal or the badge. Also
owns purchase_success, which otherwise breaks across the redirect."
```

---

### Task 7: mount the return leg and retire the RC-web landmines

**Files:**
- Modify: `src/main.js` (mount point near boot; `ensureWebBilling` at `229-249`; `webSupporterConfigured` at `487-489`)

**Interfaces:**
- Consumes: `resolvePendingCheckout` from Task 6; `getProvider` from Task 5.
- Produces: nothing new — wiring only. `main.js` wiring is untested by design (AGENTS.md).

- [ ] **Step 1: Wire the Stripe dependencies into `provider()`**

In `src/main.js`, extend the existing `provider()` factory (currently at `217-221`) so the Stripe branch receives what it needs. Keep `ensureIapUserId` exactly as it is:

```js
function provider(){
  if(!iapProvider) iapProvider = getProvider({
    get: (k,d)=>store.get(k,d),
    set: (k,v)=>store.set(k,v),
    remove: (k)=>store.remove(k),
    ensureUserId: ensureIapUserId,
    stripe: {
      store: { get:(k,d)=>store.get(k,d), set:(k,v)=>store.set(k,v), remove:(k)=>store.remove(k) },
      getAccessToken: async () => {
        const s = accountUI.session;
        return (s && s.access_token) || null;
      },
      // A Supabase anonymous session is a valid session — treat "no email" as
      // anonymous, matching the server-side check in stripe-checkout.
      isAnonymous: async () => {
        const u = accountUI.session && accountUI.session.user;
        return !u || !!u.is_anonymous || !u.email;
      },
      fetchEntitlements: async () => {
        const rows = await listEntitlements();      // see Step 2
        return rows;
      },
    },
  });
  return iapProvider;
}
```

- [ ] **Step 2: Add the entitlements read beside the other cloud calls**

In `src/cloud.js`, add an owner-scoped select. `entitlements` is READ-ONLY for the owner under RLS (`docs/supabase/schema.sql:149-152`), so the user's own token is sufficient — no service role:

```js
// Entitlements are service_role-write / owner-read (schema.sql:149-152). This
// is how a device that never saw the purchase happen learns it owns Supporter.
export async function listEntitlements() {
  try {
    const { data, error } = await getClient()
      .from("entitlements").select("product_id");
    if (error || !Array.isArray(data)) return [];
    return data.map(row => row.product_id).filter(id => typeof id === "string");
  } catch (e) { return []; }
}
```

Import it in `main.js` alongside the existing `cloud.js` imports.

- [ ] **Step 3: Mount the return leg at boot**

Add near the other boot-time calls in `src/main.js`, after the store and provider exist:

```js
// Stripe checkout return. Runs at boot (not only on the success URL) because
// an installed iOS PWA can lose the redirect to Safari and never come back,
// and because PromptPay can confirm long after the tab closed.
async function resumeCheckout(){
  const url = new URL(location.href);
  if(url.searchParams.has("session_id")){
    url.searchParams.delete("session_id");
    history.replaceState({}, "", url.toString());   // don't leave it in the address bar
  }
  await resolvePendingCheckout({
    store,
    provider: provider(),
    // EXACT adapter shape already used at main.js:3874 — sync.js's signature is
    // reconcile(store, reason, now, expectedOrderId), but pollForCredit calls
    // reconcile(reason, orderId), so the store and `now` are bound here.
    reconcile: (reason, orderId) => reconcile(store, reason, undefined, orderId),
    sleep: ms => new Promise(res => setTimeout(res, ms)),
    onCredited: () => {
      // Same rehydrate syncEdge relies on: reconcile wrote ALL merged
      // SYNC_KEYS back to the store, not just wallet (main.js:3879-3881).
      rehydrateFromStore();
      updateWalletChip();
      renderIapSections();
    },
    onEntitlement: (owned) => {
      ent = restoreFrom(ent, owned);
      store.set("ent", ent);
      renderAccount();
      renderIapSections();
    },
    track: (name, props) => analytics.track(name, props),
  });
}
resumeCheckout();
```

Call `resumeCheckout()` again on shop-open, beside the existing `ensureWebBilling()` call site.

**Identifiers verified against `src/main.js`** — use these exact names, not plausible-looking alternatives: `analytics.track` (not a bare `track`), `updateWalletChip()` at `:259` (there is no `renderWallet`), `show(name)` at `:1318` (there is no `go`), `toast(msg)` at `:356`, `rehydrateFromStore()`, `renderAccount()` at `:782`, `renderIapSections()` at `:3730`.

- [ ] **Step 4: Retire the two RC-web landmines**

`ensureWebBilling` (`main.js:229-249`) swaps `iapProvider` to RC-web **on shop-open** whenever `REVENUECAT_WEB_PUBLIC_KEY` is non-blank — which would silently replace the boot-selected Stripe provider if both keys were ever filled in. Guard it:

```js
async function ensureWebBilling(){
  if(webBillingLoaded) return;
  // Stripe owns web billing now (it is the only path that can surface
  // PromptPay). If a Stripe provider is already selected, never swap it out
  // from under the shop — this is the landmine the design called out.
  if(iapProvider && iapProvider.kind === "stripe-web") return;
  const eligible = REVENUECAT_WEB_PUBLIC_KEY.trim() && !isNative()
    && (typeof location === "undefined" || location.protocol !== "file:");
  ...unchanged...
}
```

`webSupporterConfigured` (`main.js:487-489`) keys the supporter-moment placement to the RC web key. Re-point it at Stripe:

```js
// Web supporter placement follows whichever web billing path is configured.
// Stripe is the live one; the RC-web term stays until that path is deleted.
const webSupporterConfigured = () =>
  (!!STRIPE_CHECKOUT_URL.trim() || !!REVENUECAT_WEB_PUBLIC_KEY.trim())
  && !isNative()
  && (typeof location === "undefined" || location.protocol !== "file:");
```

Import `STRIPE_CHECKOUT_URL` from `./monetization/stripe-config.js`.

- [ ] **Step 5: Build and run the full suite**

Run: `npm run build` then `npm test` then `npm run lint`
Expected: all three exit 0. `main.js` has no unit tests by design, so the suite count should be unchanged from Task 6.

- [ ] **Step 6: Commit**

```bash
git add src/main.js src/cloud.js
git commit -m "feat(billing): mount the checkout return and retire the RC-web landmines

Wires Stripe's injected dependencies through provider(), adds an owner-scoped
listEntitlements() read (entitlements is service_role-write / owner-read), and
resumes a pending checkout at boot as well as on shop-open -- an installed iOS
PWA can lose the redirect to Safari and never return.

Guards ensureWebBilling so shop-open can no longer swap a selected Stripe
provider for RC-web, and re-points webSupporterConfigured at the Stripe key."
```

---

### Task 8: "sign in to buy" state

**Files:**
- Modify: `src/main.js` (the `iapBuy` failure branch and the row renderer)
- Modify: `src/i18n.js` (two locales)
- Test: `test/i18n-usage.test.js` covers key usage automatically

**Interfaces:**
- Consumes: the `"needs-account"` reason produced by Task 4.
- Produces: nothing new.

- [ ] **Step 1: Add the strings to both locales**

In `src/i18n.js`, add to the `en` block beside the other `iap.*` keys:

```js
    "iap.needsAccount": "Sign in to buy",
    "iap.needsAccountBody": "Create a free account so your purchase follows you to any device.",
```

And to the `th` block, in the same relative position. Mark both `TH-REVIEW` per the house convention for machine-drafted Thai:

```js
    "iap.needsAccount": "เข้าสู่ระบบเพื่อซื้อ",                      // TH-REVIEW
    "iap.needsAccountBody": "สร้างบัญชีฟรี เพื่อให้การซื้อของคุณติดตามไปได้ทุกอุปกรณ์",   // TH-REVIEW
```

- [ ] **Step 2: Route the reason to the sign-in sheet**

In `src/main.js`'s `iapBuy`, add a branch before the generic failure toast:

```js
  if(r.reason === "needs-account"){
    analytics.track("purchase_fail", { product: p.id, reason: "needs-account" });
    toast(t("iap.needsAccountBody"));
    show("account");               // the existing account screen owns email OTP
    return;
  }
```

Place it beside the existing `r.reason === "cancelled"` branch at `main.js:3870`, which
is the pattern this mirrors (`analytics.track("purchase_fail", …)` then return). The
navigation function is `show(name)` (`main.js:1318`) — there is no `go()`.

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: exit 0. `test/i18n-usage.test.js` verifies every `data-i18n` key resolves in both locales — if it fails, the new keys are missing from one locale.

- [ ] **Step 4: Run lint and build**

Run: `npm run lint` then `npm run build`
Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/main.js src/i18n.js
git commit -m "feat(billing): route anonymous buyers to sign-in instead of a failure toast

The server refuses anonymous checkout, but a server-only refusal surfaces as
a generic iap.failed toast to someone who just tried to pay. The provider's
needs-account reason now opens the account screen. Thai strings marked
TH-REVIEW."
```

---

### Task 9: deployment docs and release gate

**Files:**
- Modify: `docs/supabase/README.md`
- Modify: `docs/OWNER-ACTIONS.md`
- Modify: `sw.js` (SHELL bump) and `test/sw-precache.test.js` (the coupled pin)

**Interfaces:** none — documentation and release ritual.

- [ ] **Step 1: Document the two functions**

Add to `docs/supabase/README.md`, beside the existing `rc-webhook` entry:

```markdown
### stripe-webhook

Deploy with **JWT verification disabled** — Stripe sends no Supabase JWT and the
gateway would 401 before the function runs:

    supabase functions deploy stripe-webhook --no-verify-jwt

Secret: `STRIPE_WEBHOOK_SECRET` (the `whsec_…` signing secret from the Stripe
webhook endpoint). Point the Stripe endpoint at
`https://<project>.supabase.co/functions/v1/stripe-webhook` and subscribe to
exactly `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
and `checkout.session.async_payment_failed`.

### stripe-checkout

Deploy normally (JWT verification ON — it authenticates the caller):

    supabase functions deploy stripe-checkout

Secret: `STRIPE_SECRET_KEY` (`sk_live_…`). Never commit it.
```

- [ ] **Step 2: Add the owner steps**

Add a subsection to `docs/OWNER-ACTIONS.md` under §B replacing the old step-6 text: create the Thailand-based Stripe account, complete verification, enable **PromptPay** in Dashboard → Payment methods, create the webhook endpoint and copy its signing secret, set both Supabase secrets, then fill `STRIPE_CHECKOUT_URL` and `STRIPE_PUBLISHABLE_KEY` in `src/monetization/stripe-config.js` and ship. Note the live gate: one real PromptPay checkout, one card checkout, one abandon, and a replayed webhook via `stripe listen`/`stripe events resend` to prove the dedupe.

- [ ] **Step 3: Bump SHELL**

This ships user-facing UI, so installed PWAs must fetch the new shell. In `sw.js` change `const CACHE_VERSION = "v136";` to `"v137"`, and in `test/sw-precache.test.js` change the coupled assertion `expect(swSrc).toContain('const CACHE_VERSION = "v136"')` to `"v137"`. **Both in the same commit** — they are coupled, and the suite must be re-run *after* the bump.

- [ ] **Step 4: Run the full gate AFTER the bump**

Run each separately and capture the exit code directly — never pipe to `tail`:

```bash
npm test;      echo "TEST_EXIT=$?"
npm run lint;  echo "LINT_EXIT=$?"
npm run build; echo "BUILD_EXIT=$?"
git status --short          # expect no unexpected dist drift
```

Expected: all three exit 0.

- [ ] **Step 5: Commit**

```bash
git add docs/supabase/README.md docs/OWNER-ACTIONS.md sw.js test/sw-precache.test.js
git commit -m "docs(billing): stripe deployment steps; SHELL v136 -> v137

stripe-webhook deploys with --no-verify-jwt (Stripe sends no Supabase JWT);
stripe-checkout deploys normally since it authenticates its caller. Records
the owner steps that replace go-live step 6 and the live gate, including a
replayed webhook to prove the session-id dedupe."
```

---

## Self-review

**Spec coverage.** Every section maps to a task: the two edge functions (1, 2), entitlement delivery via `restore()` (4, 6), the anonymous-user story client- and server-side (2, 4, 8), the durable pending record (3), provider precedence (5), the `ensureWebBilling`/`webSupporterConfigured` landmines (7), the named return module (6, 7), `Stripe-Version` pinning and multi-`v1` parsing (1, 2), concurrent-session expiry (2), THB minor units (2), CORS via the `delete-account` precedent (2), JWT-verification-disabled deployment (9), the analytics funnel (6), the SHELL bump (9). `price()` returning null is implemented in Task 4 and the display consequence is recorded in the spec. Refunds are explicitly out of scope with a manual runbook.

**Type consistency.** `writePending`/`readPending`/`clearPending` keep identical signatures across Tasks 3, 4, and 6. `resolvePendingCheckout` is defined in Task 6 and called with matching keys in Task 7. `restore()` returns `{ok, ownedProductIds}` in Task 4 and is consumed with that shape in Task 6, then passed to the existing `restoreFrom(ent, ownedProductIds)` in Task 7. `buildSessionParams`/`encodeForm` are defined and consumed only within Task 2. The `"needs-account"` reason is produced in Task 4 and consumed in Task 8.

**Identifier verification.** Every `main.js` symbol the plan calls was checked against the
file rather than assumed. Three first-draft names were wrong and are corrected above:
`renderWallet` → `updateWalletChip` (`:259`), `go` → `show` (`:1318`), and a bare `track`
→ `analytics.track` (`:144`). The reconcile adapter is copied verbatim from the existing
call site at `:3874` — `reconcile(store, reason, undefined, orderId)` — because `sync.js`
takes `(store, reason, now, expectedOrderId)` while `pollForCredit` calls
`reconcile(reason, orderId)`. The analytics payload key is `product`, matching
`purchase_start` at `:3821`, not `productId`.

**Known gap, deliberate.** `index.ts` files in Tasks 1 and 2 carry real logic (JWT resolution, the already-owned check, prior-session expiry) that vitest cannot reach, matching the house decision that Deno wrappers stay untested. The live gate in Task 9 is what covers them — it is not optional.
