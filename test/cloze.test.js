import { describe, it, expect } from "vitest";
import { clozeFor, clozeOptions } from "../src/cloze.js";

const CLOZE = {
  "苹果": { s: "我想吃苹果。", en: "I want to eat an apple.", th: "ฉันอยากกินแอปเปิ้ล", d: ["商店", "学生", "猫"] },
  "一": { s: "零在一前面。", en: "Zero comes before one.", th: "ศูนย์อยู่หน้าหนึ่ง", d: ["去", "吗", "坐"] },
};
const byHanzi = {
  "苹果": { h: "苹果", p: "píng guǒ" },
  "商店": { h: "商店", p: "shāng diàn" },
  "学生": { h: "学生", p: "xué sheng" },
  "猫": { h: "猫", p: "māo" },
};
const w = h => ({ h, p: byHanzi[h] ? byHanzi[h].p : "" });

describe("clozeFor — blank the target", () => {
  it("replaces the single target occurrence with ___", () => {
    const c = clozeFor(w("苹果"), CLOZE);
    expect(c.text).toBe("我想吃___。");
    expect(c.en).toBe("I want to eat an apple.");
    expect(c.th).toBe("ฉันอยากกินแอปเปิ้ล");
    expect(c.distractors).toEqual(["商店", "学生", "猫"]);
  });
  it("returns null for a word with no sentence entry", () => {
    expect(clozeFor(w("水"), CLOZE)).toBeNull();
    expect(clozeFor(w("苹果"), {})).toBeNull();
    expect(clozeFor(w("苹果"), undefined)).toBeNull();
  });
});

describe("clozeOptions — target + baked distractors", () => {
  const entry = clozeFor(w("苹果"), CLOZE);
  it("builds 4 options, exactly one correct = the target", () => {
    const opts = clozeOptions(w("苹果"), entry, byHanzi, () => 0);
    expect(opts).toHaveLength(4);
    const correct = opts.filter(o => o.correct);
    expect(correct).toHaveLength(1);
    expect(correct[0].label).toBe("苹果");
    expect(correct[0].sub).toBe("píng guǒ");
  });
  it("uses the baked distractors verbatim — never invents", () => {
    const opts = clozeOptions(w("苹果"), entry, byHanzi, () => 0);
    const labels = opts.map(o => o.label).sort();
    expect(labels).toEqual(["商店", "学生", "猫", "苹果"].sort());
  });
  it("pinyin subs come from the full-data lookup", () => {
    const opts = clozeOptions(w("苹果"), entry, byHanzi, () => 0);
    expect(opts.find(o => o.label === "商店").sub).toBe("shāng diàn");
    expect(opts.find(o => o.label === "猫").sub).toBe("māo");
  });
  it("distractor missing from the lookup gets an empty sub, not a crash", () => {
    const c = { distractors: ["未知"] };
    const opts = clozeOptions(w("苹果"), c, byHanzi, () => 0);
    expect(opts.find(o => o.label === "未知").sub).toBe("");
  });
  it("accepts a raw data entry (d field) as well as a clozeFor result", () => {
    const opts = clozeOptions(w("一"), CLOZE["一"], byHanzi, () => 0);
    expect(opts).toHaveLength(4);
    expect(opts.filter(o => o.correct).map(o => o.label)).toEqual(["一"]);
  });
  it("empty distractor list yields the target only (defensive fallback)", () => {
    const opts = clozeOptions(w("苹果"), { d: [] }, byHanzi, () => 0);
    expect(opts).toHaveLength(1);
    expect(opts[0].correct).toBe(true);
  });
});
