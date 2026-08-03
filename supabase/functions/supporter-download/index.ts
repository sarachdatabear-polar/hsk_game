// Supporter self-serve download — Deno Edge Function. Issues a fresh 7-day
// signed URL for the six-guide ZIP to a signed-in caller who owns the
// 'supporter' entitlement. Spec: docs/superpowers/specs/
// 2026-08-03-supporter-selfserve-download-and-delivery-webhook-design.md
//
// Deploy with JWT verification ON (default): the gateway rejects unsigned
// calls before this code runs. CORS is REQUIRED — the browser sends an
// Authorization header, which forces a preflight (same as stripe-checkout).
// The server is the real gate: the client shows the button on local
// supporter state, but only a caller whose ACCOUNT owns the entitlement
// gets a URL. Anonymous sessions simply fail the entitlement check (an
// anonymous uid can never hold a purchase — grants require the account
// flow), so they get 403 like any other non-supporter.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  SUPPORTER_BUCKET,
  SUPPORTER_OBJECT,
  SIGNED_URL_SECONDS,
} from "../_shared/supporter-email/core.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: unknown, status: number) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return reply("service unavailable", 503);

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return reply({ error: "unauthorized" }, 401);

  // Resolve the caller from their OWN verified token — never from the body.
  const asCaller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await asCaller.auth.getUser();
  const user = userData && userData.user;
  if (userError || !user) return reply({ error: "unauthorized" }, 401);

  const service = createClient(supabaseUrl, serviceRoleKey);
  const { data: ent, error: entError } = await service
    .from("entitlements")
    .select("product_id")
    .eq("user_id", user.id)
    .eq("product_id", "supporter")
    .maybeSingle();
  if (entError) return reply("storage error", 500);
  if (!ent) return reply({ error: "not_supporter" }, 403);

  const signed = await service.storage
    .from(SUPPORTER_BUCKET)
    .createSignedUrl(SUPPORTER_OBJECT, SIGNED_URL_SECONDS);
  const url = signed.data && signed.data.signedUrl;
  if (signed.error || !url) return reply({ error: "unavailable" }, 500);
  return reply({ url }, 200);
});
