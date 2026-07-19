// test/word-detail.test.js
import { describe, it, expect } from "vitest";
import { buildWordDetail } from "../src/ui/word-detail.js";

const W = { h: "现代", p: "xiàndài", e: "modern; contemporary", t: "ทันสมัย", lv: 4, f: 128, ta: 42, tt: 50, c: 1, n: 1 };
const EX = { "现代": { s: "现代生活很方便。", en: "Modern life is convenient.", th: "ชีวิตสมัยใหม่สะดวกมาก" } };

describe("buildWordDetail", () => {
  it("maps the core fields", () => {
    const vm = buildWordDetail(W, EX, "en");
    expect(vm.hanzi).toBe("现代");
    expect(vm.pinyin).toBe("xiàndài");
    expect(vm.english).toBe("modern; contemporary");
    expect(vm.thai).toBe("ทันสมัย");
    expect(vm.level).toBe(4);
    expect(vm.examLine).toEqual({ n: 42, total: 50 });
  });

  it("falls back to English gloss when Thai is empty", () => {
    const vm = buildWordDetail({ ...W, t: "" }, EX, "en");
    expect(vm.thai).toBe("modern; contemporary");
  });

  it("maps tier from c: 1 -> core, 0 -> extended", () => {
    expect(buildWordDetail({ ...W, c: 1 }, EX, "en").tier).toBe("core");
    expect(buildWordDetail({ ...W, c: 0 }, EX, "en").tier).toBe("extended");
  });

  it("returns the example {cn,tr} when present, English tr under locale en", () => {
    const vm = buildWordDetail(W, EX, "en");
    expect(vm.example).toEqual({ cn: "现代生活很方便。", tr: "Modern life is convenient." });
  });

  it("uses Thai translation under locale th when the example carries th", () => {
    expect(buildWordDetail(W, EX, "th").example.tr).toBe("ชีวิตสมัยใหม่สะดวกมาก");
  });

  it("falls back to English translation under locale th when the example has no th", () => {
    const exNoThai = { "现代": { s: "现代生活很方便。", en: "Modern life is convenient." } };
    expect(buildWordDetail(W, exNoThai, "th").example.tr).toBe("Modern life is convenient.");
  });

  it("returns null example when the word has none", () => {
    expect(buildWordDetail(W, {}, "en").example).toBeNull();
  });
});
