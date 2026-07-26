import { describe, it, expect } from "vitest";
import {
  BRICK_STAGE_COST, landmarkUnlockLevel, landmarkBuildCost,
  landmarkBuildable, bricksForRound, advanceLandmark,
} from "../src/bricks.js";

describe("cost model", () => {
  it("stage costs are 8/12/16 to enter stages 1/2/3", () => {
    expect(BRICK_STAGE_COST).toEqual([8, 12, 16]);
    expect(landmarkBuildCost(0)).toBe(8);
    expect(landmarkBuildCost(1)).toBe(12);
    expect(landmarkBuildCost(2)).toBe(16);
    expect(landmarkBuildCost(3)).toBeNull(); // already finished
  });
  it("maps unlock levels from BUILDINGS", () => {
    expect(landmarkUnlockLevel("coin-bank")).toBe(10);
    expect(landmarkUnlockLevel("emperor-gate")).toBe(50);
    expect(landmarkUnlockLevel("nope")).toBe(Infinity);
  });
});

describe("bricksForRound", () => {
  it("gives 2 per mastered word plus 1 for a completed round", () => {
    expect(bricksForRound({ mastered: 3, completed: true })).toBe(7);
    expect(bricksForRound({ mastered: 0, completed: true })).toBe(1);
    expect(bricksForRound({ mastered: 2, completed: false })).toBe(4);
    expect(bricksForRound({})).toBe(0);
    expect(bricksForRound({ mastered: -5, completed: false })).toBe(0); // clamps
  });
});

describe("landmarkBuildable", () => {
  it("is buildable only at/above unlock level and below stage 3", () => {
    expect(landmarkBuildable(10, "coin-bank", {})).toBe(true);          // level ok, stage 0
    expect(landmarkBuildable(9, "coin-bank", {})).toBe(false);          // below unlock
    expect(landmarkBuildable(99, "coin-bank", { "coin-bank": 3 })).toBe(false); // finished
  });
});

describe("advanceLandmark", () => {
  it("spends the stage cost and advances one stage, without mutating inputs", () => {
    const before = { "coin-bank": 0 };
    const res = advanceLandmark(before, "coin-bank", 20, 10);
    expect(res.ok).toBe(true);
    expect(res.reachedStage).toBe(1);
    expect(res.bricks).toBe(12);                 // 20 - 8
    expect(res.builtStages).toEqual({ "coin-bank": 1 });
    expect(before).toEqual({ "coin-bank": 0 });  // original untouched
  });
  it("refuses when too few bricks", () => {
    const before = { "coin-bank": 0 };
    const res = advanceLandmark(before, "coin-bank", 5, 10);
    expect(res.ok).toBe(false);
    expect(res.bricks).toBe(5);
    expect(res.builtStages).toBe(before);        // same reference on failure
  });
  it("refuses when below unlock level or already finished", () => {
    expect(advanceLandmark({}, "coin-bank", 99, 9).ok).toBe(false);
    expect(advanceLandmark({ "coin-bank": 3 }, "coin-bank", 99, 99).ok).toBe(false);
  });
});
