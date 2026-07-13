import { describe, it, expect } from "vitest";
import { reminderPlan, reengagePlan, REMINDER_HOUR, REENGAGE_DAYS } from "../src/notify.js";

describe("reminderPlan", () => {
  const info = (streak, goalMet) => ({ streak, goalMet, todayResolved: 0, goal: 20, restNote: false });
  it("schedules when a live streak has not met goal and the hour is before the reminder", () => {
    expect(reminderPlan(info(5, false), 10)).toEqual({ schedule: true, hour: REMINDER_HOUR, cancel: false });
  });
  it("never schedules with no streak to save", () => {
    expect(reminderPlan(info(0, false), 10).schedule).toBe(false);
  });
  it("cancels once the goal is met", () => {
    const p = reminderPlan(info(5, true), 10);
    expect(p.schedule).toBe(false);
    expect(p.cancel).toBe(true);
  });
  it("does not schedule after the reminder hour has passed", () => {
    expect(reminderPlan(info(5, false), REMINDER_HOUR).schedule).toBe(false);
  });
});

describe("reengagePlan", () => {
  const info = (streak) => ({ streak, todayResolved: 0, goal: 20, goalMet: false, restNote: false });

  it("schedules a nudge when the player has a live streak", () => {
    expect(reengagePlan(info(5))).toEqual({ schedule: true, afterDays: REENGAGE_DAYS, hour: REMINDER_HOUR, streak: 5 });
  });

  it("does not schedule when there is no streak", () => {
    expect(reengagePlan(info(0)).schedule).toBe(false);
  });

  it("carries the current streak count through for the message", () => {
    expect(reengagePlan(info(12)).streak).toBe(12);
  });

  it("REENGAGE_DAYS is 3", () => {
    expect(REENGAGE_DAYS).toBe(3);
  });
});
