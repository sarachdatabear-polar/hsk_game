import { describe, it, expect } from "vitest";
import { exampleFor } from "../src/examples.js";

const CLOZE = {
  "苹果": { s: "我想吃苹果。", en: "I want to eat an apple.", th: "ฉันอยากกินแอปเปิ้ล", d: ["商店", "学生", "猫"] },
  "一": { s: "零在一前面。", en: "Zero comes before one.", th: "", d: ["去", "吗", "坐"] },
  "谢谢": { s: "谢谢你的帮助。", en: "Thanks for your help.", d: ["再见", "对不起", "不客气"] },
};
const w = h => ({ h });

describe("exampleFor — flashcard-back example sentence", () => {
  it("returns cn + english translation for locale 'en'", () => {
    expect(exampleFor(w("苹果"), CLOZE, "en")).toEqual({
      cn: "我想吃苹果。",
      tr: "I want to eat an apple.",
    });
  });

  it("returns cn + Thai translation for locale 'th' when Thai is present", () => {
    expect(exampleFor(w("苹果"), CLOZE, "th")).toEqual({
      cn: "我想吃苹果。",
      tr: "ฉันอยากกินแอปเปิ้ล",
    });
  });

  it("falls back to english when locale 'th' but Thai is an empty string", () => {
    expect(exampleFor(w("一"), CLOZE, "th")).toEqual({
      cn: "零在一前面。",
      tr: "Zero comes before one.",
    });
  });

  it("falls back to english when locale 'th' but Thai is missing entirely", () => {
    expect(exampleFor(w("谢谢"), CLOZE, "th")).toEqual({
      cn: "谢谢你的帮助。",
      tr: "Thanks for your help.",
    });
  });

  it("returns null when the word has no cloze entry", () => {
    expect(exampleFor(w("水"), CLOZE, "en")).toBeNull();
    expect(exampleFor(w("苹果"), {}, "en")).toBeNull();
    expect(exampleFor(w("苹果"), undefined, "en")).toBeNull();
  });
});
