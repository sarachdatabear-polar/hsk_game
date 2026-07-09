import { describe, it, expect } from "vitest";
import { formatFor, FORMATS } from "../src/formats.js";

const mk = (h, p, e, t) => ({ h, p, e, t, lv: 1, f: 50 });
const word = mk("你好", "nǐ hǎo", "hello", "สวัสดี");
const deck = [
  word,
  mk("谢谢", "xièxie", "thanks", "ขอบคุณ"),
  mk("水", "shuǐ", "water", "น้ำ"),
  mk("大", "dà", "big", "ใหญ่"),
  mk("狗", "gǒu", "dog", "หมา"),
  mk("吃", "chī", "to eat", "กิน"),
  mk("猫", "māo", "cat", "แมว"),
  mk("茶", "chá", "tea", "ชา"),
];
const rec = r => ({ s: r + 1, k: r, r, ls: 0 });
const caps = { audio: true };
const firstRand = () => 0;

describe("formatFor — the mastery ladder", () => {
  it("unseen and streak 0 get meaning-MC", () => {
    expect(formatFor(word, undefined, caps)).toBe("meaning");
    expect(formatFor(word, rec(0), caps)).toBe("meaning");
  });
  it("streak 1-2 get listening", () => {
    expect(formatFor(word, rec(1), caps)).toBe("listen");
    expect(formatFor(word, rec(2), caps)).toBe("listen");
  });
  it("streak 3-4 get reverse recall", () => {
    expect(formatFor(word, rec(3), caps)).toBe("reverse");
    expect(formatFor(word, rec(4), caps)).toBe("reverse");
  });
  it("streak 5-6 get tone recall", () => {
    expect(formatFor(word, rec(5), caps)).toBe("tone");
    expect(formatFor(word, rec(6), caps)).toBe("tone");
  });
  it("streak 7-8 with a cloze sentence get cloze recall", () => {
    const capsCloze = { audio: true, cloze: w => w.h === "你好" };
    expect(formatFor(word, rec(7), capsCloze)).toBe("cloze");
    expect(formatFor(word, rec(8), capsCloze)).toBe("cloze");
  });
  it("streak 7-8 fall back to typed when the word has no sentence", () => {
    const noSentence = { audio: true, cloze: () => false };
    expect(formatFor(word, rec(7), noSentence)).toBe("typed");
    expect(formatFor(word, rec(8), noSentence)).toBe("typed");
  });
  it("a partial caps object (no cloze fn) reads as no-sentence → typed, not a crash", () => {
    expect(formatFor(word, rec(7), caps)).toBe("typed");
    expect(formatFor(word, rec(8), caps)).toBe("typed");
  });
  it("streak 9+ always gets typed recall, even with a cloze sentence", () => {
    const capsCloze = { audio: true, cloze: () => true };
    expect(formatFor(word, rec(9), capsCloze)).toBe("typed");
    expect(formatFor(word, rec(12), capsCloze)).toBe("typed");
  });
  it("typed works for all-neutral words too (no tone fallback needed)", () => {
    expect(formatFor(mk("吗", "ma", "question particle", "ไหม"), rec(9), caps)).toBe("typed");
  });
  it("listen downgrades to meaning without audio", () => {
    expect(formatFor(word, rec(1), { audio: false })).toBe("meaning");
    expect(formatFor(word, rec(3), { audio: false })).toBe("reverse");
  });
  it("tone falls back to meaning for markless pinyin", () => {
    const neutral = mk("吗", "ma", "question particle", "ไหม");
    expect(formatFor(neutral, rec(5), caps)).toBe("meaning");
  });
});

describe("FORMATS registry", () => {
  it("meaning/listen options are meanings; one correct", () => {
    for (const f of ["meaning", "listen"]) {
      const opts = FORMATS[f].buildOptions(word, deck, "en", firstRand);
      expect(opts).toHaveLength(4);
      expect(opts.filter(o => o.correct)).toHaveLength(1);
      expect(opts.find(o => o.correct).label).toBe("hello");
    }
  });
  it("reverse options are hanzi with pinyin subs", () => {
    const opts = FORMATS.reverse.buildOptions(word, deck, "en", firstRand);
    expect(opts.find(o => o.correct)).toEqual(
      expect.objectContaining({ label: "你好", sub: "nǐ hǎo" }));
  });
  it("tone options are 4 distinct re-tonings incl. the real one", () => {
    const opts = FORMATS.tone.buildOptions(word, deck, "en", Math.random);
    expect(opts).toHaveLength(4);
    expect(new Set(opts.map(o => o.label)).size).toBe(4);
    expect(opts.find(o => o.correct).label).toBe("nǐ hǎo");
  });
  it("plaque flags follow the spec table", () => {
    expect(FORMATS.meaning.plaque).toEqual({ hz: true, py: true });
    expect(FORMATS.listen.plaque).toEqual({ icon: true });
    expect(FORMATS.reverse.plaque).toEqual({ mask: true });
    expect(FORMATS.tone.plaque).toEqual({ hz: true });
  });
  it("audio policy: listen always, tone/reverse never, meaning per setting", () => {
    expect(FORMATS.listen.audio).toBe("always");
    expect(FORMATS.meaning.audio).toBe("setting");
    expect(FORMATS.reverse.audio).toBe("never");
    expect(FORMATS.tone.audio).toBe("never");
  });
});

describe("FORMATS.typed registry shape", () => {
  it("is an input format: hanzi plaque, no audio, soft-intro, no options", () => {
    expect(FORMATS.typed.input).toBe(true);
    expect(FORMATS.typed.plaque).toEqual({ hz: true });
    expect(FORMATS.typed.audio).toBe("never");
    expect(FORMATS.typed.intro).toBe("battle.introTyped");
    expect(FORMATS.typed.buildOptions).toBeUndefined();
  });
});

describe("FORMATS.cloze registry shape", () => {
  it("masks the plaque, never speaks, has a soft-intro and a sentence prompt", () => {
    expect(FORMATS.cloze.plaque).toEqual({ mask: true });
    expect(FORMATS.cloze.audio).toBe("never");
    expect(FORMATS.cloze.intro).toBe("battle.introCloze");
    expect(FORMATS.cloze.prompt).toBe("cloze");
  });
  it("buildOptions delegates to clozeOptions (target + baked distractors)", () => {
    const byHanzi = { "你好": word, "谢谢": deck[1], "水": deck[2], "大": deck[3] };
    const entry = { d: ["谢谢", "水", "大"] };
    const opts = FORMATS.cloze.buildOptions(word, entry, byHanzi, firstRand);
    expect(opts).toHaveLength(4);
    expect(opts.filter(o => o.correct)).toHaveLength(1);
    expect(opts.find(o => o.correct)).toEqual(
      expect.objectContaining({ label: "你好", sub: "nǐ hǎo" }));
  });
});
