// src/analytics/transport.js
// Raw-fetch transport to Supabase PostgREST. Never throws.
// Uses ONLY the anon key (no user JWT) so every insert runs as the `anon`
// role and events stay de-identified even for signed-in players.
// `Prefer: return=minimal` is REQUIRED: the events table has no SELECT
// policy, so a returned row (PostgREST default) would fail RLS.

export async function send(events, { url, key, fetchImpl }) {
  if (!events || !events.length) return { ok: true, status: 0 };
  try {
    const res = await fetchImpl(`${url}/rest/v1/events`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(events),
    });
    return { ok: !!res.ok, status: res.status || 0 };
  } catch {
    return { ok: false, status: 0 };
  }
}
