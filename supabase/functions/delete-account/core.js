// delete-account Edge Function — pure authorization slice (vitest-tested,
// mirrors rc-webhook/core.js). Validates the caller's Authorization header.
// The uid is resolved from the VERIFIED token in index.ts, never from the
// request body, so a user can only ever delete themselves.
export function authorizeDelete(authHeader) {
  const m = /^Bearer\s+(.+)$/.exec(String(authHeader || ""));
  if (!m || !m[1].trim()) return { ok: false, status: 401 };
  return { ok: true, jwt: m[1].trim() };
}
