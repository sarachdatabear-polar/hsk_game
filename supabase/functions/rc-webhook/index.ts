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
  // conflict means this event was already granted — ack without touching
  // the wallet again, so a replayed webhook never double-credits.
  const { error: ledgerErr } = await supabase
    .from("ledger")
    .insert({ user_id: userId, delta: coins, reason: productId, event_id: eventId });
  if (ledgerErr) {
    if (ledgerErr.code === "23505") return new Response(JSON.stringify({ duplicate: true }), { status: 200 });
    return new Response("storage error", { status: 500 }); // real failure — let RC retry
  }

  // Read-modify-write, not a single atomic statement. Safe here because (a)
  // RC serializes retries of the SAME event, so no two writers race for one
  // grant, and (b) the ledger event_id uniqueness above already guards the
  // double-credit case — this step only decides the new total.
  const { data: wallet, error: readErr } = await supabase
    .from("wallet").select("coins").eq("user_id", userId).maybeSingle();
  if (readErr) return new Response("storage error", { status: 500 });

  const { error: walletErr } = await supabase
    .from("wallet")
    .upsert({ user_id: userId, coins: (wallet?.coins ?? 0) + coins }, { onConflict: "user_id" });
  if (walletErr) return new Response("storage error", { status: 500 });

  if (entitlement) {
    const { error: entErr } = await supabase
      .from("entitlements")
      .upsert({ user_id: userId, product_id: productId }, { onConflict: "user_id,product_id" });
    if (entErr) return new Response("storage error", { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
