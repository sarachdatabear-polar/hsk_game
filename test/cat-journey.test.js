import { describe, expect, it } from "vitest";
import {
  JOURNEY_DURATION_MS,
  bondPointsOf,
  bondProgressOf,
  completeCatJourney,
  defaultCatJourney,
  journeyStatus,
  minutesUntilReturn,
  normalizeCatJourney,
  noteGoalDay,
  selectCatBackground,
  startCatJourney,
  unlockedBackgrounds,
} from "../src/cat-journey.js";

describe("Cat Journey state", () => {
  it("normalizes corrupt and duplicate persisted fields safely", () => {
    expect(normalizeCatJourney({
      selectedBackground: "not-real",
      goalDaysCount: -4,
      claimedDays: ["2026-07-26", "bad", "2026-07-26"],
      memories: [
        { id: "garden-leaf", day: "2026-07-26" },
        { id: "duplicate", day: "2026-07-26" },
      ],
    })).toMatchObject({
      selectedBackground: "bg-home",
      goalDaysCount: 0,
      claimedDays: ["2026-07-26"],
      memories: [{ id: "garden-leaf", day: "2026-07-26" }],
    });
  });

  it("counts a completed daily goal once and never rewinds on an older date", () => {
    const first = noteGoalDay(defaultCatJourney(), "2026-07-26", true);
    expect(first.goalDaysCount).toBe(1);
    expect(noteGoalDay(first, "2026-07-26", true).goalDaysCount).toBe(1);
    expect(noteGoalDay(first, "2026-07-25", true).goalDaysCount).toBe(1);
    expect(noteGoalDay(first, "2026-07-27", false).goalDaysCount).toBe(1);
  });

  it("derives monotonic bond points and tier progress from learning", () => {
    expect(bondPointsOf({ masteredWords: 12, totalXp: 350, dailyGoalDays: 4 })).toBe(23);
    expect(bondProgressOf(23)).toMatchObject({
      current: { id: "curious-paws", points: 15 },
      next: { id: "neighborhood-explorer", points: 40 },
      into: 8,
      need: 25,
      pct: 32,
    });
    expect(bondProgressOf(999).next).toBeNull();
  });

  it("unlocks and selects backgrounds only at earned thresholds", () => {
    expect(unlockedBackgrounds(39).map(item => item.id)).toEqual(["bg-home", "bg-cat-garden-v1"]);
    const locked = selectCatBackground(defaultCatJourney(), "bg-cat-market-v1", 39);
    expect(locked.selectedBackground).toBe("bg-home");
    const earned = selectCatBackground(locked, "bg-cat-market-v1", 40);
    expect(earned.selectedBackground).toBe("bg-cat-market-v1");
  });

  it("starts once after the goal, waits, then records one deterministic memory", () => {
    const now = 1_000_000;
    const initial = defaultCatJourney();
    expect(journeyStatus(initial, { today: "2026-07-26", goalMet: false, now })).toBe("needs-goal");
    const started = startCatJourney(initial, { today: "2026-07-26", goalMet: true, now });
    expect(journeyStatus(started, { today: "2026-07-26", goalMet: true, now })).toBe("exploring");
    expect(minutesUntilReturn(started, now)).toBe(20);
    expect(started.claimedDays).toEqual(["2026-07-26"]);
    expect(startCatJourney(started, { today: "2026-07-26", goalMet: true, now })).toEqual(started);

    const readyAt = now + JOURNEY_DURATION_MS;
    expect(journeyStatus(started, { today: "2026-07-26", goalMet: true, now: readyAt })).toBe("returned");
    const completed = completeCatJourney(started, { id: "garden-leaf" }, readyAt);
    expect(completed.activeJourney).toBeNull();
    expect(completed.memories).toEqual([{ id: "garden-leaf", day: "2026-07-26" }]);
    expect(journeyStatus(completed, { today: "2026-07-26", goalMet: true, now: readyAt })).toBe("done");
  });

  it("does not complete a journey early", () => {
    const started = startCatJourney(defaultCatJourney(), {
      today: "2026-07-26", goalMet: true, now: 1_000_000,
    });
    expect(completeCatJourney(started, { id: "garden-leaf" }, 1_000_001)).toEqual(started);
  });
});
