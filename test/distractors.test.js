import { describe, it, expect } from "vitest";
import { pickDistractors } from "../src/distractors.js";

const mk = (h, e, t, f) => ({ h, p: "x", e, t, lv: 1, f, ta: 1, tt: 1, c: 1, n: 1, fs: f });
const pool = [
  mk("目标", "to run; to jog", "วิ่ง", 100),
  mk("跑步", "to run (sport)", "วิ่งออกกำลัง", 90), // same content token "run" as target -> still excluded (genuinely same meaning)
  mk("吃",   "to eat",  "กิน",  80),
  mk("水",   "water",   "น้ำ",  70),
  mk("大",   "big",     "ใหญ่", 60),
  mk("狗",   "dog",     "หมา",  55),
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

  // Was "excludes same leading english token after stripping parens": that test encoded the
  // bug where comparing only the first raw token ("to") excluded EVERY verb as a distractor.
  // Updated: "跑步"/"to run (sport)" shares the real content token "run" with the target
  // ("to run; to jog") and is still correctly excluded, but "吃"/"to eat" shares no content
  // token with "run" and must now be allowed to appear as a distractor.
  it("excludes genuinely same-meaning glosses but allows different verbs", () => {
    let sawChi = false;
    for (let i = 0; i < 30; i++) {
      const d = pickDistractors(pool, target, Math.random);
      expect(d.map(w => w.h)).not.toContain("跑步");
      if (d.map(w => w.h).includes("吃")) sawChi = true;
    }
    expect(sawChi).toBe(true);
  });

  it("allows different verbs as distractors (to eat / to sleep)", () => {
    const verbPool = [
      mk("跑步", "to run; to jog", "A", 100), // target
      mk("吃", "to eat", "B", 90),
      mk("睡", "to sleep", "C", 80),
      mk("水", "water", "D", 70)
    ];
    const t = verbPool[0];
    const d = pickDistractors(verbPool, t, firstRand);
    expect(d).toHaveLength(3);
    expect(d.map(w => w.h).sort()).toEqual(["吃", "水", "睡"]);
  });

  it('excludes "to go to" as a distractor for "to go" (shared content token)', () => {
    const goPool = [
      mk("去", "to go", "A", 100), // target
      mk("去到", "to go to", "B", 90), // shares content token "go" -> excluded
      mk("吃", "to eat", "C", 80),
      mk("水", "water", "D", 70),
      mk("大", "big", "E", 60)
    ];
    const t = goPool[0];
    const d = pickDistractors(goPool, t, firstRand);
    expect(d).toHaveLength(3);
    const hanzi = d.map(w => w.h);
    expect(hanzi).not.toContain("去到");
    expect(hanzi.sort()).toEqual(["吃", "大", "水"]);
  });

  it('allows "surname Wang" as a distractor for "surname Li"', () => {
    const surnamePool = [
      mk("李", "surname Li", "A", 100), // target
      mk("王", "surname Wang", "B", 90),
      mk("吃", "to eat", "C", 80),
      mk("水", "water", "D", 70)
    ];
    const t = surnamePool[0];
    const d = pickDistractors(surnamePool, t, firstRand);
    expect(d).toHaveLength(3);
    expect(d.map(w => w.h)).toContain("王");
  });

  it("only compares the first sense of a multi-sense gloss", () => {
    // target's first sense is "one" (before the ";"); its second sense "single" must not
    // be used for comparison, so a word glossed plainly "single" is still a valid distractor.
    const sensePool = [
      mk("一", "one; single", "A", 100), // target
      mk("单", "single", "B", 90),
      mk("吃", "to eat", "C", 80),
      mk("水", "water", "D", 70)
    ];
    const t = sensePool[0];
    const d = pickDistractors(sensePool, t, firstRand);
    expect(d).toHaveLength(3);
    expect(d.map(w => w.h)).toContain("单");
  });

  it("ignores parenthesized text so \"Liao (a surname)\" matches \"surname Liao\"", () => {
    const liaoPool = [
      mk("廖", "Liao (a surname)", "A", 100), // target
      mk("廖2", "surname Liao", "B", 90), // same person -> excluded
      mk("吃", "to eat", "C", 80),
      mk("水", "water", "D", 70),
      mk("大", "big", "E", 60)
    ];
    const t = liaoPool[0];
    const d = pickDistractors(liaoPool, t, firstRand);
    expect(d).toHaveLength(3);
    const hanzi = d.map(w => w.h);
    expect(hanzi).not.toContain("廖2");
    expect(hanzi.sort()).toEqual(["吃", "大", "水"]);
  });
});
