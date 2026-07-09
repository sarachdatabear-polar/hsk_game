"use strict";
// Interstitial ad gating policy — pure, SDK-independent decision logic.
// PRD §5.1 (frequency caps): min 180s between interstitials, never two in a
// row, Supporter owners never see interstitials, and a brand-new install
// sees ZERO interstitials during its first-ever session.
// PRD §5.3 (acceptance criteria) drives the deny/allow reasons below.
//
// This module knows nothing about AdMob, Capacitor, DOM, or localStorage —
// the real ad plugin calls canShowInterstitial() to decide whether it may
// request/show a fill, and records a shown ad via recordInterstitialShown().
// The `reason` string is for telemetry/debug, not user-facing copy.
// `now` is always passed in by the caller — never call Date.now() here.

export const MIN_INTERSTITIAL_GAP_MS = 180000; // 180s, PRD §5.1

// state = { isSupporter: boolean, sessionIndex: number, lastInterstitialAt: number|null }
// sessionIndex is 1-based; 1 = the user's first-ever session.
export function canShowInterstitial(state, now) {
  const s = state || {};

  if (s.isSupporter) {
    return { allowed: false, reason: "supporter" };
  }

  // Undefined/missing sessionIndex is treated as first-session (deny), to
  // fail safe rather than risk showing an ad during a brand-new install.
  const sessionIndex = s.sessionIndex;
  if (!(sessionIndex > 1)) {
    return { allowed: false, reason: "first-session" };
  }

  const lastInterstitialAt = s.lastInterstitialAt;
  if (lastInterstitialAt != null && now - lastInterstitialAt < MIN_INTERSTITIAL_GAP_MS) {
    return { allowed: false, reason: "cooldown" };
  }

  return { allowed: true, reason: "ok" };
}

export function recordInterstitialShown(state, now) {
  return { ...state, lastInterstitialAt: now };
}
