// RevenueCat webhook — Deno Edge Function. Thin I/O wrapper: all grant
// decision logic lives in core.js (tested under vitest, see
// test/rc-webhook.test.js). This file only does auth, parsing, and the
// Supabase service-role writes that core.js can't do (no Deno APIs there).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authorizeWebhook, processEvent } from "./core.js";
import { PRODUCTS } from "../../../src/monetization/products.js";

Deno.serve(async (req) => {
  // RC signs webhook calls with a bearer secret we configure on their side.
  const webhookSecret = Deno.env.get("RC_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!webhookSecret || !supabaseUrl || !serviceRoleKey) {
    return new Response("service unavailable", { status: 503 });
  }
  if (!authorizeWebhook(req.headers.get("Authorization"), webhookSecret)) {
    return new Response("unauthorized", { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const result = processEvent(body, PRODUCTS);
  if (!result.ok) {
    // RC retries any non-2xx response. Ignorable events (wrong type, TEST
    // pings, unknown product, ...) are not delivery failures — ack 200 so
    // RC stops retrying them instead of looping forever.
    return new Response(JSON.stringify({ ignored: result.reason }), { status: 200 });
  }

  const { userId, productId, eventId, orderId, coins, entitlement } = result.grant;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // grant_purchase (docs/supabase/migrations/2026-07-12-iap-golive.sql) does
  // the ledger insert, wallet increment, and entitlement upsert as ONE
  // plpgsql function body — a single implicit transaction, all-or-nothing.
  // That atomicity is load-bearing (I1 fix): a visible ledger row now always
  // implies its wallet increment already committed alongside it, which is
  // exactly what T3's ledger-cursor reconcile needs to be safe. Doing this
  // as three separate awaits (ledger insert, then rpc increment, then
  // entitlement upsert) left a window where a mid-flight reconcile could
  // see the ledger row without the balance it represents, credit itself,
  // advance its cursor past the row, and double-credit permanently once the
  // increment landed a moment later.
  const { data, error } = await supabase.rpc("grant_purchase", {
    p_user_id: userId,
    p_delta: coins,
    p_reason: productId,
    p_event_id: eventId,
    p_order_id: orderId,
    p_entitlement: entitlement,
  });
  if (error) return new Response("storage error", { status: 500 }); // real failure — let RC retry

  switch (data) {
    case "granted": return new Response(JSON.stringify({ ok: true }), { status: 200 });
    case "duplicate": return new Response(JSON.stringify({ duplicate: true }), { status: 200 });
    // Deleted account: permanent, so ack 200 — retrying can never succeed,
    // and letting RC retry-loop forever risks it disabling the webhook.
    case "unknown-user": return new Response(JSON.stringify({ ignored: "unknown-user" }), { status: 200 });
    // Should be unreachable (grant_purchase only ever returns the three
    // values above); treat defensively as a transient failure so RC retries
    // rather than silently swallowing a grant.
    default: return new Response("storage error", { status: 500 });
  }
});
