import { describe, expect, it } from "vitest";
import {
  CAT_JOURNEY_VERSION,
  JOURNEY_DURATION_MS,
  activeClaimOf,
  bondPointsOf,
  bondProgressOf,
  chooseJourneyWord,
  completeCatJourney,
  defaultCatJourney,
  goalDaysCountOf,
  journeyReturnNotificationPlan,
  journeyStatus,
  memoryRecordsOf,
  minutesUntilReturn,
  normalizeCatJourney,
  noteGoalDay,
  selectCatBackground,
  startCatJourney,
  unlockedBackgrounds,
} from "../src/cat-journey.js";

const dayAt = offset => new Date(Date.UTC(2026, 0, 1 + offset)).toISOString().slice(0, 10);

describe("Cat Journey v2 state", () => {
  it("normalizes corrupt v2 fields and duplicate claims safely", () => {
    expect(normalizeCatJourney({
      v: 2,
      selectedBackground: "not-real",
      selectedBackgroundAt: -3,
      goalHistory: {
        baselineCount: -4,
        throughDay: "2026-07-26",
        days: ["2026-07-27", "bad", "2026-07-27", "2026-07-25"],
      },
      claims: [
        { day: "2026-07-26", returnedAt: 10, storyId: "garden-leaf" },
        { day: "2026-07-26", returnedAt: 20, storyId: "duplicate" },
        { day: "bad", departedAt: 1 },
      ],
    })).toMatchObject({
      v: CAT_JOURNEY_VERSION,
      selectedBackground: "bg-home",
      selectedBackgroundAt: 0,
      goalHistory: {
        baselineCount: 0,
        throughDay: "2026-07-26",
        days: ["2026-07-27"],
      },
      claims: [{
        day: "2026-07-26",
        returnedAt: 10,
        storyId: "garden-leaf",
      }],
    });
  });

  it("losslessly migrates v1 background, bond baseline, active journey, and memories", () => {
    const migrated = normalizeCatJourney({
      v: 1,
      selectedBackground: "bg-cat-market-v1",
      goalDaysCount: 12,
      lastGoalDay: "2026-07-25",
      lastSeenBondTier: 2,
      claimedDays: ["2026-07-24", "2026-07-25"],
      activeJourney: {
        day: "2026-07-25",
        departedAt: 1_000,
        readyAt: 2_000,
      },
      memories: [{ id: "garden-leaf", day: "2026-07-24" }],
    });
    expect(migrated).toMatchObject({
      v: 2,
      selectedBackground: "bg-cat-market-v1",
      goalHistory: { baselineCount: 12, throughDay: "2026-07-25", days: [] },
      lastSeenBondTier: 2,
    });
    expect(memoryRecordsOf(migrated)).toMatchObject([
      { id: "garden-leaf", day: "2026-07-24" },
    ]);
    expect(activeClaimOf(migrated)).toMatchObject({
      day: "2026-07-25",
      departedAt: 1_000,
      readyAt: 2_000,
      returnedAt: 0,
    });
  });

  it("retains every migrated v1 memory beyond the old 120-record cap", () => {
    const memories = Array.from({ length: 140 }, (_, i) => ({
      id: `legacy-memory-${i}`,
      day: dayAt(i),
    }));
    const migrated = normalizeCatJourney({
      v: 1,
      claimedDays: memories.map(item => item.day),
      memories,
    });
    expect(memoryRecordsOf(migrated)).toHaveLength(140);
    expect(memoryRecordsOf(migrated)[139]).toMatchObject(memories[139]);
  });

  it("retains unknown legacy memory IDs as archived state", () => {
    const migrated = normalizeCatJourney({
      v: 1,
      claimedDays: ["2026-07-26"],
      memories: [{ id: "removed-pack-story", day: "2026-07-26" }],
    });
    expect(memoryRecordsOf(migrated)).toMatchObject([
      { id: "removed-pack-story", storyId: "removed-pack-story", day: "2026-07-26" },
    ]);
  });

  it("counts future completed goal dates once without rewriting the v1 baseline", () => {
    const migrated = normalizeCatJourney({
      v: 1,
      goalDaysCount: 4,
      lastGoalDay: "2026-07-26",
    });
    const first = noteGoalDay(migrated, "2026-07-27", true);
    expect(goalDaysCountOf(first)).toBe(5);
    expect(first.goalHistory).toEqual({
      baselineCount: 4,
      throughDay: "2026-07-26",
      days: ["2026-07-27"],
    });
    expect(goalDaysCountOf(noteGoalDay(first, "2026-07-27", true))).toBe(5);
    expect(goalDaysCountOf(noteGoalDay(first, "2026-07-25", true))).toBe(5);
    expect(goalDaysCountOf(noteGoalDay(first, "2026-07-28", false))).toBe(5);
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

  it("unlocks backgrounds and records deterministic selection metadata", () => {
    expect(unlockedBackgrounds(39).map(item => item.id)).toEqual(["bg-home", "bg-cat-garden-v1"]);
    const locked = selectCatBackground(defaultCatJourney(), "bg-cat-market-v1", 39, { at: 50 });
    expect(locked.selectedBackground).toBe("bg-home");
    const earned = selectCatBackground(locked, "bg-cat-market-v1", 40, {
      at: 60,
      device: "device-a",
    });
    expect(earned).toMatchObject({
      selectedBackground: "bg-cat-market-v1",
      selectedBackgroundAt: 60,
      selectedBackgroundDevice: "device-a",
    });
  });

  it("chooses the highest-priority learned word without storing mutable word copy", () => {
    const correct = chooseJourneyWord(null, { wordKey: "猫" });
    expect(correct).toEqual({ wordKey: "猫", rank: 1 });
    const recovered = chooseJourneyWord(correct, { wordKey: "学习", recovered: true });
    expect(recovered).toEqual({ wordKey: "学习", rank: 2 });
    expect(chooseJourneyWord(recovered, { wordKey: "朋友", recovered: true })).toEqual(recovered);
    expect(chooseJourneyWord(recovered, { wordKey: "记得", newlyMastered: true }))
      .toEqual({ wordKey: "记得", rank: 3 });
    expect(chooseJourneyWord(recovered, { wordKey: "  " })).toEqual(recovered);
  });

  it("starts once after the goal, waits, then records one permanent memory", () => {
    const now = 1_000_000;
    const initial = defaultCatJourney();
    expect(journeyStatus(initial, { today: "2026-07-26", goalMet: false, now })).toBe("needs-goal");
    const started = startCatJourney(initial, {
      today: "2026-07-26",
      goalMet: true,
      now,
      destinationId: "bg-home",
      wordKey: "妈妈",
    });
    expect(journeyStatus(started, { today: "2026-07-26", goalMet: true, now })).toBe("exploring");
    expect(minutesUntilReturn(started, now)).toBe(20);
    expect(activeClaimOf(started)).toMatchObject({
      day: "2026-07-26",
      destinationId: "bg-home",
      wordKey: "妈妈",
    });
    expect(startCatJourney(started, { today: "2026-07-26", goalMet: true, now })).toEqual(started);

    const readyAt = now + JOURNEY_DURATION_MS;
    expect(journeyStatus(started, { today: "2026-07-26", goalMet: true, now: readyAt })).toBe("returned");
    const completed = completeCatJourney(started, { id: "garden-leaf" }, readyAt);
    expect(activeClaimOf(completed)).toBeNull();
    expect(memoryRecordsOf(completed)).toMatchObject([{
      id: "garden-leaf",
      day: "2026-07-26",
      destinationId: "bg-home",
      wordKey: "妈妈",
    }]);
    expect(journeyStatus(completed, { today: "2026-07-26", goalMet: true, now: readyAt })).toBe("done");
    expect(completeCatJourney(completed, { id: "duplicate" }, readyAt)).toEqual(completed);
  });

  it("does not complete a journey early or without a valid reward", () => {
    const started = startCatJourney(defaultCatJourney(), {
      today: "2026-07-26", goalMet: true, now: 1_000_000,
    });
    expect(completeCatJourney(started, { id: "garden-leaf" }, 1_000_001)).toEqual(started);
    expect(completeCatJourney(started, {}, 1_000_000 + JOURNEY_DURATION_MS)).toEqual(started);
  });

  it("plans one return reminder only while a persisted journey is away", () => {
    const started = startCatJourney(defaultCatJourney(), {
      today: "2026-07-26", goalMet: true, now: 1_000_000,
    });
    expect(journeyReturnNotificationPlan(started, 1_000_001)).toEqual({
      schedule: true,
      cancel: false,
      at: 1_000_000 + JOURNEY_DURATION_MS,
    });
    expect(journeyReturnNotificationPlan(started, 1_000_000 + JOURNEY_DURATION_MS))
      .toMatchObject({ schedule: false, cancel: true });
    expect(journeyReturnNotificationPlan(defaultCatJourney(), 1_000_000))
      .toEqual({ schedule: false, cancel: true, at: 0 });
  });

  it("does not let timezone rollback rewrite or reclaim an earlier date", () => {
    const now = 1_000_000;
    const returned = completeCatJourney(
      startCatJourney(defaultCatJourney(), {
        today: "2026-07-27", goalMet: true, now,
      }),
      { id: "garden-leaf" },
      now + JOURNEY_DURATION_MS,
    );
    expect(journeyStatus(returned, {
      today: "2026-07-26", goalMet: true, now: now + JOURNEY_DURATION_MS,
    })).toBe("done");
    expect(startCatJourney(returned, {
      today: "2026-07-26", goalMet: true, now: now + JOURNEY_DURATION_MS,
    })).toEqual(returned);
  });

  it("preserves multiple valid active claims from corrupt/offline input instead of deleting data", () => {
    const state = normalizeCatJourney({
      v: 2,
      claims: [
        { day: "2026-07-26", departedAt: 10, readyAt: 20 },
        { day: "2026-07-27", departedAt: 30, readyAt: 40 },
      ],
    });
    expect(state.claims).toHaveLength(2);
    expect(activeClaimOf(state).day).toBe("2026-07-26");
    const firstDone = completeCatJourney(state, { id: "garden-leaf" }, 50);
    expect(activeClaimOf(firstDone).day).toBe("2026-07-27");
  });
});
