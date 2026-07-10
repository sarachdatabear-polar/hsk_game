"use strict";
// Impure cloud edge (client-auth round). Mirrors native.js in spirit: tiny
// surface, lazy client, offline-guarded, NEVER throws/rejects — cloud failure
// must never break gameplay. Nothing here runs at module eval; the client is
// created on first use from the Account screen, so boot and file:// stay
// network-pure. supabase-js persists its session under its own
// sb-eqsodiufgjecoqgxdisn-auth-token localStorage key — the ONE sanctioned
// exception to the nbhsk.* namespace (the SDK owns that key's lifecycle).
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_KEY } from "./cloud-config.js";
import { profileRowFor, otpVerifyType } from "./account.js";

let client = null;
export function __setClientForTests(c) { client = c; }

function getClient() {
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    // detectSessionInUrl MUST stay false: no URL parsing on file://.
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return client;
}

function offline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

// supabase-js resolves fetch-level failures as {error} (AuthRetryableFetchError,
// status 0/5xx) rather than throwing — without this check a network outage
// during verify would read as "wrong code" to the player.
function isNetworkAuthError(error) {
  return !!error && (error.status === 0 || error.status >= 500 ||
    String(error.name || "").includes("Retryable"));
}

async function currentSession() {
  const { data } = await getClient().auth.getSession();
  return (data && data.session) || null;
}

export async function getSession() {
  if (offline()) return { ok: false, reason: "offline" };
  try { return { ok: true, session: await currentSession() }; }
  catch (e) { return { ok: false, reason: "network" }; }
}

export async function ensureGuest(locale) {
  if (offline()) return { ok: false, reason: "offline" };
  try {
    let session = await currentSession();
    if (!session) {
      const { data, error } = await getClient().auth.signInAnonymously();
      if (error || !data || !data.session) return { ok: false, reason: "network" };
      session = data.session;
    }
    await upsertProfile(profileRowFor(session.user.id, locale));
    return { ok: true, session };
  } catch (e) { return { ok: false, reason: "network" }; }
}

export async function sendCode(email) {
  if (offline()) return { ok: false, reason: "offline" };
  try {
    const hadGuest = !!(await currentSession());
    const verifyType = otpVerifyType(hadGuest);
    const { error } = hadGuest
      ? await getClient().auth.updateUser({ email })
      : await getClient().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    return error ? { ok: false, reason: "network" } : { ok: true, verifyType };
  } catch (e) { return { ok: false, reason: "network" }; }
}

export async function verifyCode(email, code, verifyType, locale) {
  if (offline()) return { ok: false, reason: "offline" };
  try {
    const { data, error } = await getClient().auth.verifyOtp({ email, token: code, type: verifyType });
    if (error) return { ok: false, reason: isNetworkAuthError(error) ? "network" : "bad-code" };
    if (!data || !data.session) return { ok: false, reason: "bad-code" };
    await upsertProfile(profileRowFor(data.session.user.id, locale));
    return { ok: true, session: data.session };
  } catch (e) { return { ok: false, reason: "network" }; }
}

export async function upsertProfile(row) {
  if (offline()) return { ok: false };
  try {
    const { error } = await getClient().from("profiles").upsert(row);
    return { ok: !error };
  } catch (e) { return { ok: false }; }
}

export async function signOut() {
  // Local-scope sign-out; local gameplay state is untouched by design.
  try { await getClient().auth.signOut({ scope: "local" }); } catch (e) { /* ignore */ }
  return { ok: true };
}
