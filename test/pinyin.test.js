import { describe, it, expect } from "vitest";
import { toneSlots, retone, toneVariants } from "../src/pinyin.js";

describe("toneSlots", () => {
  it("reads tones off the marked vowels", () => {
    expect(toneSlots("nǐ hǎo").map(s => s.tone)).toEqual([3, 3]);
    expect(toneSlots("nǐ hǎo").map(s => s.vowel)).toEqual(["i", "a"]);
  });
  it("neutral syllables contribute no slot", () => {
    expect(toneSlots("ma")).toEqual([]);          // 吗-style all-neutral
    expect(toneSlots("xièxie").length).toBe(1);   // second syllable neutral
  });
  it("handles ü and erhua", () => {
    expect(toneSlots("lǜ")).toEqual([{ i: 1, vowel: "ü", tone: 4 }]);
    expect(toneSlots("yīhuìr").map(s => s.tone)).toEqual([1, 4]);
  });
});

describe("retone", () => {
  it("roundtrips: reapplying the original tones is identity", () => {
    for (const p of ["nǐ hǎo", "lǜ", "yīhuìr", "xiǎng", "xièxie"]) {
      expect(retone(p, toneSlots(p).map(s => s.tone))).toBe(p);
    }
  });
  it("re-marks the same vowel positions", () => {
    expect(retone("nǐ hǎo", [2, 4])).toBe("ní hào");
    expect(retone("lǜ", [3])).toBe("lǚ");
  });
});

describe("toneVariants", () => {
  const firstRand = () => 0;
  it("single tone slot yields exactly the 3 other tones", () => {
    expect(new Set(toneVariants("mā", firstRand))).toEqual(new Set(["má", "mǎ", "mà"]));
  });
  it("variants are distinct from the original and each other", () => {
    for (let i = 0; i < 20; i++) {
      const v = toneVariants("nǐ hǎo", Math.random);
      expect(v).toHaveLength(3);
      expect(new Set(v).size).toBe(3);
      expect(v).not.toContain("nǐ hǎo");
    }
  });
  it("returns null when there are no tone marks", () => {
    expect(toneVariants("ma", firstRand)).toBeNull();
  });
});
