// Resend delivery webhook — Deno Edge Function. Thin I/O wrapper: all
// decision logic lives in _shared/resend-webhook/core.js (vitest-tested,
// see test/resend-webhook.test.js).
//
// ⚠ DEPLOY WITH JWT VERIFICATION DISABLED (--no-verify-jwt). Resend sends
// svix headers, not a Supabase JWT. Auth = svix signature, fail closed.
// No CORS: the caller is Resend's server, not a browser.
//
// Delivery truth (spec 2026-08-03): 'sent' only means "Resend accepted".
// email.delivered  -> row 'sent' -> 'delivered' (terminal).
// email.bounced/failed -> row 'sent' -> 'failed' (re-claimable) + one
// alert email to support@. Rows are matched by provider_message_id; both
// updates are gated on status='sent' so a manually reset / re-claimed /
// already-delivered row is never moved backwards. Unmatched events no-op
// 200 — that INCLUDES the alert emails themselves (same Resend account),
// which is what breaks the alert-about-alert loop.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  verifySvixSignature,
  classifyResendEvent,
  buildDeliveryAlert,
} from "../_shared/resend-webhook/core.js";
import { RESEND_ENDPOINT } from "../_shared/supporter-email/core.js";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  // Fail closed: an unset secret must never mean "no signature needed".
  if (!secret || !supabaseUrl || !serviceRoleKey) {
    return new Response("service unavailable", { status: 503 });
  }

  const payload = await req.text();
  const verified = await verifySvixSignature({
    payload,
    id: req.headers.get("svix-id"),
    timestamp: req.headers.get("svix-timestamp"),
    signature: req.headers.get("svix-signature"),
    secret,
  });
  if (!verified) return new Response("unauthorized", { status: 401 });

  let event;
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const c = classifyResendEvent(event);
  if (c.action === "ignore") return json({ ignored: c.reason });

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  if (c.action === "deliver") {
    const { error } = await supabase
      .from("supporter_deliveries")
      .update({ status: "delivered" })
      .eq("provider_message_id", c.emailId)
      .eq("status", "sent");
    if (error) return new Response("storage error", { status: 500 }); // Resend retries
    return json({ ok: true });
  }

  // c.action === "fail"
  const { data, error } = await supabase
    .from("supporter_deliveries")
    .update({ status: "failed", last_error: c.reason })
    .eq("provider_message_id", c.emailId)
    .eq("status", "sent")
    .select("order_id, user_id");
  if (error) return new Response("storage error", { status: 500 }); // Resend retries
  const row = data && data[0];
  if (!row) return json({ ignored: "no-matching-row" });

  // Alert is best-effort: the row flip above is the durable record, so an
  // alert failure must not 5xx (Resend would retry and re-flip a row the
  // owner may already be acting on).
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("SUPPORTER_EMAIL_FROM");
  let alerted = false;
  if (apiKey && from) {
    let buyerDomain = "unknown";
    try {
      const u = await supabase.auth.admin.getUserById(row.user_id);
      const email = u.data && u.data.user && u.data.user.email;
      if (email && email.includes("@")) buyerDomain = email.split("@").pop() as string;
    } catch { /* domain stays "unknown" */ }
    try {
      const r = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(
          buildDeliveryAlert({ from, orderId: row.order_id, buyerDomain, reason: c.reason }),
        ),
      });
      alerted = r.ok;
    } catch { /* alerted stays false */ }
  }
  return json({ ok: true, alerted });
});
