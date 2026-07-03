import { describe, it, expect } from "vitest";
import { normalizeLen, modeKey } from "../src/pool.js";

describe("normalizeLen", () => {
  it("defaults to 20 for missing or invalid input", () => {
    expect(normalizeLen(undefined)).toBe(20);
    expect(normalizeLen(null)).toBe(20);
    expect(normalizeLen("")).toBe(20);
    expect(normalizeLen("abc")).toBe(20);
    expect(normalizeLen(NaN)).toBe(20);
  });
  it("accepts valid lengths, coercing strings and rounding", () => {
    expect(normalizeLen(40)).toBe(40);
    expect(normalizeLen("100")).toBe(100);
    expect(normalizeLen(33.7)).toBe(34);
  });
  it("clamps to 5..500", () => {
    expect(normalizeLen(0)).toBe(5);
    expect(normalizeLen(4)).toBe(5);
    expect(normalizeLen(501)).toBe(500);
    expect(normalizeLen(9999)).toBe(500);
  });
});

describe("modeKey", () => {
  it("keeps legacy keys for round-of-20 and endless", () => {
    expect(modeKey("round", 20)).toBe("round");
    expect(modeKey("endless", Infinity)).toBe("endless");
  });
  it("appends length for non-default rounds", () => {
    expect(modeKey("round", 40)).toBe("round40");
    expect(modeKey("round", 100)).toBe("round100");
    expect(modeKey("round", 7)).toBe("round7");
  });
});
