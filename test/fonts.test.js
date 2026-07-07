import { describe, it, expect } from "vitest";
import { HANZI_STACK, LATIN_STACK, fontString } from "../src/fonts.js";

describe("fonts", () => {
  it("HANZI_STACK leads with the bundled hanzi face and has serif fallback", () => {
    expect(HANZI_STACK.startsWith("'LC Hanzi'")).toBe(true);
    expect(HANZI_STACK).toContain("Noto Serif SC");
    expect(HANZI_STACK.endsWith("serif")).toBe(true);
  });

  it("LATIN_STACK leads with the bundled latin face, then thai, then sans-serif fallback", () => {
    expect(LATIN_STACK.startsWith("'LC Latin'")).toBe(true);
    expect(LATIN_STACK).toContain("'LC Thai'");
    expect(LATIN_STACK.endsWith("sans-serif")).toBe(true);
  });

  describe("fontString", () => {
    it("formats weight, rounded px, and stack", () => {
      expect(fontString(700, 24, LATIN_STACK)).toBe(`700 24px ${LATIN_STACK}`);
    });

    it("rounds fractional px", () => {
      expect(fontString(600, 23.4, HANZI_STACK)).toBe(`600 23px ${HANZI_STACK}`);
      expect(fontString(600, 23.5, HANZI_STACK)).toBe(`600 24px ${HANZI_STACK}`);
      expect(fontString(600, 23.6, HANZI_STACK)).toBe(`600 24px ${HANZI_STACK}`);
    });

    it("accepts numeric or string weight", () => {
      expect(fontString("700", 10, LATIN_STACK)).toBe(`700 10px ${LATIN_STACK}`);
    });
  });
});
