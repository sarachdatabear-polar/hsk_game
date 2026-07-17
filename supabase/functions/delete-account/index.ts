// Delete-account — Deno Edge Function. Thin I/O wrapper: authorization logic
// lives in core.js (vitest-tested). This file resolves the caller's own uid
// from their verified JWT and does the service-role delete that cascades to
// every user table (profiles/progress/wallet/entitlements/ledger).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authorizeDelete } from "./core.js";

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response("service unavailable", { status: 503 });
  }

  const auth = authorizeDelete(req.headers.get("Authorization"));
  if (!auth.ok) return new Response("unauthorized", { status: auth.status });

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  // Resolve the caller's OWN uid from their verified token — never a body value.
  const { data: userData, error: userErr } = await supabase.auth.getUser(auth.jwt);
  if (userErr || !userData || !userData.user) {
    return new Response("unauthorized", { status: 401 });
  }
  // Service-role delete; ON DELETE CASCADE wipes this uid's rows across all
  // five user tables in one atomic Postgres operation.
  const { error: delErr } = await supabase.auth.admin.deleteUser(userData.user.id);
  if (delErr) return new Response("storage error", { status: 500 });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
