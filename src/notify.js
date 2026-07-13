"use strict";
// Streak-saver local notification (retention pack) — pure decision: should a
// reminder exist right now, and when? No DOM/native calls here; native.js's
// syncStreakReminder() is the impure edge that acts on this plan.
export const REMINDER_HOUR = 19;   // 7pm local

export function reminderPlan(info /* streakInfo(...) result */, hourNow) {
  // MVP: only schedule while there's still time left before the reminder
  // hour today. Once hourNow >= REMINDER_HOUR we don't reschedule for a
  // "tomorrow morning" safety window — keep the decision same-day only.
  const schedule = info.streak > 0 && !info.goalMet && hourNow < REMINDER_HOUR;
  return { schedule, hour: REMINDER_HOUR, cancel: info.goalMet };
}

export const REENGAGE_DAYS = 3;   // idle days before the "come back" nudge

// Should a lapsed-player "come back" nudge be scheduled, and how far out?
// Pure — no Date; native.js (syncReengageReminder) turns afterDays into a
// concrete fire time. Eligibility: any live streak worth returning for — the
// same cohort the streak-saver permission prompt already covers. Rescheduled
// on every app sync, so it only fires after a genuine multi-day absence.
export function reengagePlan(info /* streakInfo(...) result */) {
  return { schedule: info.streak > 0, afterDays: REENGAGE_DAYS, hour: REMINDER_HOUR, streak: info.streak };
}
