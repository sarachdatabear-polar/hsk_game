import { describe, it, expect } from "vitest";
import { xpForLevel, levelForXp, xpToNext, accessoriesFor, nextMilestone, MILESTONES } from "../src/growth.js";

describe("growth", () => {
  it("xpForLevel matches the known curve values", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(25);
    expect(xpForLevel(3)).toBe(75);
    expect(xpForLevel(5)).toBe(250);
    expect(xpForLevel(10)).toBe(1125);
    expect(xpForLevel(50)).toBe(30625);
  });

  it("levelForXp inverts xpForLevel exactly at thresholds", () => {
    for (const n of [1, 2, 3, 5, 10, 20, 30, 50]) {
      expect(levelForXp(xpForLevel(n))).toBe(n);
    }
  });

  it("levelForXp stays at the lower level just below a threshold", () => {
    expect(levelForXp(xpForLevel(10) - 1)).toBe(9);
    expect(levelForXp(xpForLevel(5) - 1)).toBe(4);
  });

  it("levelForXp advances right at a threshold", () => {
    expect(levelForXp(xpForLevel(10))).toBe(10);
  });

  it("levelForXp(0) is level 1, and negative xp clamps to level 1", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(-5)).toBe(1);
  });

  it("levelForXp is monotonic non-decreasing as xp grows", () => {
    let prevLevel = levelForXp(0);
    for (let xp = 0; xp <= 31000; xp += 37) {
      const lvl = levelForXp(xp);
      expect(lvl).toBeGreaterThanOrEqual(prevLevel);
      prevLevel = lvl;
    }
  });

  it("xpToNext reports progress within the current level", () => {
    expect(xpToNext(0)).toEqual({ level: 1, into: 0, need: 25 });
    expect(xpToNext(10)).toEqual({ level: 1, into: 10, need: 25 });
    expect(xpToNext(25)).toEqual({ level: 2, into: 0, need: 50 });
    const p = xpToNext(100);
    expect(p.level).toBe(3);
    expect(p.into).toBe(100 - xpForLevel(3));
    expect(p.need).toBe(xpForLevel(4) - xpForLevel(3));
  });

  it("accessoriesFor returns milestone ids at/under the given level", () => {
    expect(accessoriesFor(1)).toEqual([]);
    expect(accessoriesFor(5)).toEqual(["scarf"]);
    expect(accessoriesFor(10)).toEqual(["scarf", "coin"]);
    expect(accessoriesFor(49)).toEqual(["scarf", "coin", "outfit", "kitten"]);
    expect(accessoriesFor(50)).toEqual(["scarf", "coin", "outfit", "kitten", "emperor"]);
  });

  it("nextMilestone finds the first unmet milestone, or null past the last", () => {
    expect(nextMilestone(1)).toEqual({ lv: 5, id: "scarf", name: "Red scarf" });
    expect(nextMilestone(5)).toEqual({ lv: 10, id: "coin", name: "Gold coin charm" });
    expect(nextMilestone(49)).toEqual({ lv: 50, id: "emperor", name: "Emperor crown" });
    expect(nextMilestone(50)).toBeNull();
    expect(nextMilestone(100)).toBeNull();
  });

  it("MILESTONES stays in ascending level order", () => {
    for (let i = 1; i < MILESTONES.length; i++) {
      expect(MILESTONES[i].lv).toBeGreaterThan(MILESTONES[i - 1].lv);
    }
  });
});
