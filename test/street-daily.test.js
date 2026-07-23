import { describe, it, expect } from "vitest";
import { isNewDay, dailyGift } from "../src/street-daily.js";
import { SKIN_PALETTES } from "../src/shop.js";

describe("street daily surprise", () => {
  it("detects a new day only for a valid, different key", () => {
    expect(isNewDay(null, "2026-07-23")).toBe(true);
    expect(isNewDay("2026-07-22", "2026-07-23")).toBe(true);
    expect(isNewDay("2026-07-23", "2026-07-23")).toBe(false);
    expect(isNewDay("2026-07-23", "")).toBe(false);
  });

  it("is deterministic for a given day and valid in shape", () => {
    const g1 = dailyGift("2026-07-23");
    const g2 = dailyGift("2026-07-23");
    expect(g1).toEqual(g2);                       // reload-stable
    expect(g1.coins).toBeGreaterThan(0);
    expect(typeof g1.keepsake).toBe("boolean");
    expect(Object.keys(SKIN_PALETTES)).toContain(g1.neighbour);
  });

  it("varies across days", () => {
    const days = ["2026-07-20", "2026-07-21", "2026-07-22", "2026-07-23", "2026-07-24"];
    const coinSet = new Set(days.map(d => dailyGift(d).coins));
    expect(coinSet.size).toBeGreaterThan(1);      // not a constant
  });
});
