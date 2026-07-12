// RevenueCat webhook — Deno Edge Function. Thin I/O wrapper: all grant
// decision logic lives in core.js (tested under vitest, see
// test/rc-webhook.test.js). This file only does auth, parsing, and the
// Supabase service-role writes that core.js can't do (no Deno APIs there).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { processEvent } from "./core.js";
import { PRODUCTS } from "../../../src/monetization/products.js";

Deno.serve(async (req) => {
  // RC signs webhook calls with a bearer secret we configure on their side.
  const expected = `Bearer ${Deno.env.get("RC_WEBHOOK_SECRET")}`;
  if (req.headers.get("Authorization") !== expected) {
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

  const { userId, productId, eventId, coins, entitlement } = result.grant;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  // Idempotency: event_id has a unique index (migrations/2026-07-12). A
  // 23505 conflict means this event's coins were already credited — skip the
  // wallet increment (the one non-idempotent step) but fall through to the
  // entitlement upsert, which must still run: if a previous delivery died
  // between wallet and entitlement, only a replay can finish the grant.
  // A 23503 FK violation means the user row is gone (deleted account) —
  // permanent, so ack 200: retrying can never succeed, and letting RC
  // retry-loop forever risks it disabling the whole webhook.
  let duplicate = false;
  const { error: ledgerErr } = await supabase
    .from("ledger")
    .insert({ user_id: userId, delta: coins, reason: productId, event_id: eventId });
  if (ledgerErr) {
    if (ledgerErr.code === "23503") return new Response(JSON.stringify({ ignored: "unknown-user" }), { status: 200 });
    if (ledgerErr.code !== "23505") return new Response("storage error", { status: 500 }); // real failure — let RC retry
    duplicate = true;
  }

  if (!duplicate) {
    // Atomic increment via the increment_wallet SQL function (INSERT ... ON
    // CONFLICT DO UPDATE adds under the row lock — no read-modify-write race).
    const { error: walletErr } = await supabase
      .rpc("increment_wallet", { p_user_id: userId, p_delta: coins });
    if (walletErr) return new Response("storage error", { status: 500 });
  }

  // Idempotent by PK (user_id, product_id) — safe on both first-time and
  // duplicate paths; an error 500s so RC retries until the grant is whole.
  if (entitlement) {
    const { error: entErr } = await supabase
      .from("entitlements")
      .upsert({ user_id: userId, product_id: productId }, { onConflict: "user_id,product_id" });
    if (entErr) return new Response("storage error", { status: 500 });
  }

  return new Response(JSON.stringify(duplicate ? { duplicate: true } : { ok: true }), { status: 200 });
});
