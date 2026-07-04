import { describe, it, expect } from "vitest";
import { isBossSpawn, bossPoints, bossSpeedFactor, nextBossStage, BOSS_STAGES, BOSS_EVERY } from "../src/boss.js";

describe("isBossSpawn", () => {
  it("true on positive multiples of 10", () => {
    expect(isBossSpawn(10)).toBe(true);
    expect(isBossSpawn(20)).toBe(true);
  });
  it("false on non-multiples, and on 0", () => {
    expect(isBossSpawn(1)).toBe(false);
    expect(isBossSpawn(9)).toBe(false);
    expect(isBossSpawn(11)).toBe(false);
    expect(isBossSpawn(0)).toBe(false);
  });
  it("BOSS_EVERY is 10", () => {
    expect(BOSS_EVERY).toBe(10);
  });
});

describe("bossPoints", () => {
  it("multiplies base points by 5", () => {
    expect(bossPoints(10)).toBe(50);
    expect(bossPoints(0)).toBe(0);
    expect(bossPoints(13)).toBe(65);
  });
});

describe("boss stage machine", () => {
  it("meaning -> hanzi -> dead", () => {
    expect(nextBossStage("meaning")).toBe("hanzi");
    expect(nextBossStage("hanzi")).toBe("dead");
  });
  it("dead stays dead (idempotent past the end)", () => {
    expect(nextBossStage("dead")).toBe("dead");
  });
  it("BOSS_STAGES lists the two answerable stages, in order", () => {
    expect(BOSS_STAGES).toEqual(["meaning", "hanzi"]);
  });
});

describe("bossSpeedFactor", () => {
  it("slows the boss down (0 < factor < 1), ~15% slower", () => {
    expect(bossSpeedFactor).toBeGreaterThan(0);
    expect(bossSpeedFactor).toBeLessThan(1);
    expect(bossSpeedFactor).toBeCloseTo(0.85);
  });
});
