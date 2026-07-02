import { describe, it, expect } from "vitest";
import { killPoints } from "../src/scoring.js";

describe("killPoints", () => {
  it("base kill, no combo, point-blank", () => {
    expect(killPoints(1, 0)).toBe(10);
  });
  it("full-distance bonus adds 8", () => {
    expect(killPoints(1, 1)).toBe(18);
  });
  it("combo multiplies by 1 + (combo-1)*0.1", () => {
    expect(killPoints(3, 0)).toBe(12);   // 10 * 1.2
    expect(killPoints(3, 1)).toBe(22);   // 18 * 1.2 = 21.6 -> 22
  });
  it("clamps distFrac outside 0..1", () => {
    expect(killPoints(1, 1.5)).toBe(18);   // clamped to 1
    expect(killPoints(1, -0.5)).toBe(10);  // clamped to 0
  });
});
