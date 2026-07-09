import { describe, it, expect } from "vitest";
import { toneEligible, tonePool, toneQuestion, gradeTone } from "../src/tone_gym.js";

const withAudio = new Set(["你", "好", "妈", "了", "猫"]);
const hasAudio = h => withAudio.has(h);

const w = (h, p) => ({ h, p });

describe("toneEligible", () => {
  it("accepts a single-syllable toned word with a bundled mp3", () => {
    expect(toneEligible(w("猫", "māo"), hasAudio)).toBe(true);
  });
  it("rejects a multi-syllable word", () => {
    expect(toneEligible(w("你好", "nǐ hǎo"), hasAudio)).toBe(false);
  });
  it("rejects a neutral-tone word (no marked vowel)", () => {
    expect(toneEligible(w("妈", "ma"), hasAudio)).toBe(false);
    expect(toneEligible(w("了", "le"), hasAudio)).toBe(false);
  });
  it("rejects a word with no bundled mp3, even if otherwise eligible", () => {
    expect(toneEligible(w("书", "shū"), () => false)).toBe(false);
  });
});

describe("tonePool", () => {
  const pool = [
    w("猫", "māo"),       // eligible
    w("你好", "nǐ hǎo"),  // multi-syllable
    w("妈", "ma"),        // neutral
    w("书", "shū"),       // no audio (not in withAudio)
    w("好", "hǎo"),       // eligible
  ];
  it("filters to the tone-trainable subset only", () => {
    const filtered = tonePool(pool, hasAudio);
    expect(filtered.map(x => x.h).sort()).toEqual(["好", "猫"]);
  });
  it("returns an empty array for an empty or all-ineligible pool", () => {
    expect(tonePool([], hasAudio)).toEqual([]);
    expect(tonePool([w("你好", "nǐ hǎo"), w("妈", "ma")], hasAudio)).toEqual([]);
  });
});

describe("toneQuestion", () => {
  const pool = [w("猫", "māo"), w("好", "hǎo"), w("你好", "nǐ hǎo")];
  it("returns a question whose tone matches syllableTones of the picked word", () => {
    const q = toneQuestion(pool, hasAudio, () => 0);
    expect(q).not.toBeNull();
    expect(q.word.h).toBe("猫");
    expect(q.tone).toBe(1);
  });
  it("only ever picks an eligible word, never the ineligible one", () => {
    for (const r of [0, 0.25, 0.5, 0.75, 0.99]) {
      const q = toneQuestion(pool, hasAudio, () => r);
      expect(["猫", "好"]).toContain(q.word.h);
    }
  });
  it("returns null when the pool is empty", () => {
    expect(toneQuestion([], hasAudio, () => 0)).toBeNull();
  });
  it("returns null when every word is ineligible", () => {
    expect(toneQuestion([w("你好", "nǐ hǎo"), w("妈", "ma")], hasAudio, () => 0)).toBeNull();
  });
});

describe("gradeTone", () => {
  const q = { word: w("好", "hǎo"), tone: 3 };
  it("true when the picked tone matches", () => {
    expect(gradeTone(q, 3)).toBe(true);
  });
  it("false when the picked tone does not match", () => {
    expect(gradeTone(q, 1)).toBe(false);
    expect(gradeTone(q, 2)).toBe(false);
    expect(gradeTone(q, 4)).toBe(false);
  });
  it("false (not throw) for a null question", () => {
    expect(gradeTone(null, 3)).toBe(false);
  });
});
