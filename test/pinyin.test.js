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

import { syllables, syllableTones, letters, gradeTyped } from "../src/pinyin.js";

describe("syllables / syllableTones / letters (v6 phase 2 typed)", () => {
  it("splits space-separated pinyin", () => {
    expect(syllables("nǐ hǎo")).toEqual(["nǐ", "hǎo"]);
    expect(syllables("shuǐ")).toEqual(["shuǐ"]);
    expect(syllables("")).toEqual([]);
  });
  it("tone per syllable, 0 for neutral", () => {
    expect(syllableTones("nǐ hǎo")).toEqual([3, 3]);
    expect(syllableTones("shén me")).toEqual([2, 0]);
    expect(syllableTones("ma")).toEqual([0]);
  });
  it("letters strips tones, lowercases, drops separators", () => {
    expect(letters("nǐ hǎo")).toEqual("nihao");
    expect(letters("Xī'ān")).toEqual("xian");
  });
  it("letters maps ü by the uu argument", () => {
    expect(letters("nǚ", "v")).toEqual("nv");
    expect(letters("nǚ", "u")).toEqual("nu");
  });
  it('letters keeps ü for display labels (uu = "ü")', () => {
    expect(letters("nǚ", "ü")).toEqual("nü");
    expect(letters("lǜsè", "ü")).toEqual("lüse");
  });
});

describe("gradeTyped", () => {
  it("full pass", () => {
    expect(gradeTyped("nǐ hǎo", "nihao", [3, 3])).toEqual({ ok: true, lettersOk: true, tonesOk: true });
  });
  it("ignores case, spaces and apostrophes in typed letters", () => {
    expect(gradeTyped("nǐ hǎo", " Ni Hao ", [3, 3]).ok).toBe(true);
  });
  it("wrong tones — lettersOk survives for kind feedback", () => {
    expect(gradeTyped("nǐ hǎo", "nihao", [3, 2])).toEqual({ ok: false, lettersOk: true, tonesOk: false });
  });
  it("wrong letters — tonesOk survives", () => {
    expect(gradeTyped("nǐ hǎo", "lihao", [3, 3])).toEqual({ ok: false, lettersOk: false, tonesOk: true });
  });
  it("neutral syllables need no tone choice", () => {
    expect(gradeTyped("shén me", "shenme", [2]).ok).toBe(true);
    expect(gradeTyped("ma", "ma", []).ok).toBe(true);
  });
  it("ü accepts v and u — but v for a plain u is wrong", () => {
    expect(gradeTyped("nǚ", "nv", [3]).ok).toBe(true);
    expect(gradeTyped("nǚ", "nu", [3]).ok).toBe(true);
    expect(gradeTyped("lù", "lv", [4]).ok).toBe(false);
  });
  it("missing or extra tone choices fail tonesOk", () => {
    expect(gradeTyped("nǐ hǎo", "nihao", [3]).tonesOk).toBe(false);
    expect(gradeTyped("ma", "ma", [1]).tonesOk).toBe(false);
  });
});
