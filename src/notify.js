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
