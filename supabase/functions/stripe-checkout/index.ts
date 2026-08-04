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
    customerEmail: user.email,
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
