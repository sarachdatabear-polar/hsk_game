"use strict";
// Account/auth decisions (client-auth round, design doc 2026-07-10). Pure:
// no DOM, no network, no supabase import — cloud.js is the impure edge that
// acts on these decisions, main.js renders the view models.

export const RESEND_COOLDOWN_MS = 60000;

// Supabase-shaped session (or null) -> account state.
export function accountState(session) {
  const u = session && session.user;
  if (!u) return "local";
  return u.email && !u.is_anonymous ? "signedIn" : "guest";
}

// Display model for the Account panel. phase: "idle" | "code" (code entry
// pending). Offline is calm — explainer only, no actions, no error.
export function accountView(state, { online, phase = "idle", email = "" } = {}) {
  const v = {
    statusKey: "account.status." + state,
    statusParams: state === "signedIn" ? { email } : undefined,
    explainKey: "account.explain." + state,
    showConnect: false, showEmailForm: false, showCodeForm: false, showSignOut: false,
  };
  if (!online) { v.explainKey = "account.explain.offline"; return v; }
  if (state === "signedIn") { v.showSignOut = true; return v; }
  if (phase === "code") { v.showCodeForm = true; return v; }
  if (state === "guest") { v.showEmailForm = true; return v; }
  v.showConnect = true;   // local + online + idle
  return v;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function canSendCode(email, lastSentAt, now) {
  if (!EMAIL_RE.test(String(email || "").trim())) return { ok: false, reason: "invalid-email" };
  if (lastSentAt) {
    const waitMs = lastSentAt + RESEND_COOLDOWN_MS - now;
    if (waitMs > 0) return { ok: false, reason: "cooldown", waitMs };
  }
  return { ok: true };
}

export function codeLooksValid(code) {
  return /^\d{6}$/.test(String(code || "").trim());
}

export function profileRowFor(userId, locale) {
  return { id: userId, locale: locale === "th" ? "th" : "en" };
}

// The merge-correctness pivot: upgrading an existing (anonymous) guest sends
// the OTP via updateUser({email}) and must verify as "email_change"; a fresh
// signInWithOtp (no session) verifies as "email". Wrong type = failed verify.
export function otpVerifyType(hadGuestSession) {
  return hadGuestSession ? "email_change" : "email";
}
