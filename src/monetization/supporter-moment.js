"use strict";
// Supporter-offer placement policy — pure, DOM/storage-free decision logic
// (same shape as interstitial-policy.js). Go-live plan step 7: show a quiet
// supporter line on the results screen ONLY at a peak moment (streak saved,
// review challenge won, level up), at most once per local day, never to an
// existing supporter, and never while billing is dark (supporterOn=false).
// `todayDay` is the local "YYYY-MM-DD" string callers already use for
// daily.js — never call Date here. `reason` is for tests/debug, not copy.

export function defaultSupporterMoment() {
  return { lastShownDay: "" };
}

export function shouldShowSupporterMoment(state, facts, todayDay) {
  const s = state || {};
  const f = facts || {};
  if (!f.supporterOn) return { show: false, reason: "dark" };
  if (f.isSupporter) return { show: false, reason: "supporter" };
  if (!(f.streakSaved || f.bossDefeated || f.leveledUp)) {
    return { show: false, reason: "no-moment" };
  }
  if (!todayDay) return { show: false, reason: "no-day" };
  if (s.lastShownDay === todayDay) return { show: false, reason: "shown-today" };
  return { show: true, reason: "ok" };
}

export function recordSupporterMomentShown(state, todayDay) {
  return { ...(state || {}), lastShownDay: todayDay };
}
