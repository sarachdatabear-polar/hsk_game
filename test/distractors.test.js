import { describe, it, expect } from "vitest";
import { pickDistractors } from "../src/distractors.js";

const mk = (h, e, t, f) => ({ h, p: "x", e, t, lv: 1, f, ta: 1, tt: 1, c: 1, n: 1, fs: f });
const pool = [
  mk("目标", "to run; to jog", "วิ่ง", 100),
  mk("跑步", "to run (sport)", "วิ่งออกกำลัง", 90), // same leading token "to run" -> "to"? see impl: token = "to"? No:
  mk("吃",   "to eat",  "กิน",  80),
  mk("水",   "water",   "น้ำ",  70),
  mk("大",   "big",     "ใหญ่", 60),
  mk("同义", "sprint",  "วิ่ง", 50)                 // same thai gloss as target -> excluded
];
const target = pool[0];
const firstRand = () => 0; // deterministic "shuffle"

describe("pickDistractors", () => {
  it("returns 3 words, never the target", () => {
    const d = pickDistractors(pool, target, firstRand);
    expect(d).toHaveLength(3);
    expect(d.map(w => w.h)).not.toContain("目标");
  });
  it("excludes same thai gloss", () => {
    for (let i = 0; i < 20; i++) {
      const d = pickDistractors(pool, target, Math.random);
      expect(d.map(w => w.h)).not.toContain("同义");
    }
  });
  it("excludes same leading english token after stripping parens", () => {
    // target leading token is "to" only if impl splits naively — the impl must
    // skip filler words? No: Phase-1 rule is literal first token. "to run; to jog"
    // -> "to". "to eat" also starts "to". Verify the documented Phase-1 behavior:
    for (let i = 0; i < 20; i++) {
      const d = pickDistractors(pool, target, Math.random);
      expect(d.map(w => w.h)).not.toContain("跑步");
      expect(d.map(w => w.h)).not.toContain("吃");
    }
  });
});
