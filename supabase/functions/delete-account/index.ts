// Delete-account — Deno Edge Function. Thin I/O wrapper: authorization logic
// lives in core.js (vitest-tested). This file resolves the caller's own uid
// from their verified JWT and does the service-role delete that cascades to
// every user table (profiles/progress/wallet/entitlements/ledger).
//
// CORS is REQUIRED here (unlike rc-webhook, which RevenueCat's server calls):
// this function's only caller is the browser client via supabase-js
// functions.invoke() with an Authorization header, which triggers a CORS
// preflight OPTIONS the function must answer or the real POST never fires.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authorizeDelete } from "./core.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body, status) {
  return new Response(body, { status, headers: corsHeaders });
}

Deno.serve(async (req) => {
  // Browser preflight — answer it before any auth work (it carries no token).
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return reply("service unavailable", 503);

  const auth = authorizeDelete(req.headers.get("Authorization"));
  if (!auth.ok) return reply("unauthorized", auth.status);

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  // Resolve the caller's OWN uid from their verified token — never a body value.
  const { data: userData, error: userErr } = await supabase.auth.getUser(auth.jwt);
  if (userErr || !userData || !userData.user) return reply("unauthorized", 401);

  // Service-role delete; ON DELETE CASCADE wipes this uid's rows across all
  // five user tables in one atomic Postgres operation.
  const { error: delErr } = await supabase.auth.admin.deleteUser(userData.user.id);
  if (delErr) return reply("storage error", 500);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
