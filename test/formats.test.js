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
  it("streak 5+ gets tone recall", () => {
    expect(formatFor(word, rec(5), caps)).toBe("tone");
    expect(formatFor(word, rec(9), caps)).toBe("tone");
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
