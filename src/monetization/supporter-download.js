"use strict";
// Pure client half of supporter self-serve download (spec 2026-08-03).
// The endpoint is JWT-verified; the server owns the entitlement gate.

export const SUPPORTER_DOWNLOAD_URL =
  "https://eqsodiufgjecoqgxdisn.supabase.co/functions/v1/supporter-download";

// 401 (no/expired session) and 403 (session on an account without the
// entitlement) share one user-facing fix: sign in to the buying account.
export function parseDownloadResponse(status, body) {
  if (status === 200 && body && typeof body.url === "string" && body.url.startsWith("https://")) {
    return { ok: true, url: body.url };
  }
  if (status === 401 || status === 403) return { ok: false, reason: "signin" };
  return { ok: false, reason: "failed" };
}
