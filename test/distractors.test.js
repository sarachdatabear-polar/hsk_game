import { describe, it, expect } from "vitest";
import { pickDistractors } from "../src/distractors.js";

const mk = (h, e, t, f) => ({ h, p: "x", e, t, lv: 1, f, ta: 1, tt: 1, c: 1, n: 1, fs: f });
const mk2 = (h, e, t, f) => ({ h, e, t, f });
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

  // These three use Math.random across many draws rather than firstRand, on
  // purpose: with firstRand's deterministic shuffle order, the un-fixed old
  // code happens to rotate the colliding candidate out of the top 3 anyway
  // (a shuffle-order coincidence), so a firstRand assertion would pass for
  // the wrong reason and never actually go red pre-fix. Looping over random
  // shuffles makes the collision surface regardless of draw order.
  it("compares the FULL multi-sense gloss, not just the first sense (fairness fix)", () => {
    // FLIPPED from the old "only compares the first sense" test. The displayed
    // reverse-format prompt and meaning/listen option labels both render the whole
    // gloss ("one; single"), so a candidate that matches the target's SECOND sense
    // is a player-visible ambiguity too, and must now be excluded rather than allowed.
    const sensePool = [
      mk("一", "one; single", "A", 100), // target
      mk("单", "single", "B", 90), // shares target's 2nd sense "single" -> now excluded
      mk("吃", "to eat", "C", 80),
      mk("水", "water", "D", 70),
      mk("大", "big", "E", 60)
    ];
    const t = sensePool[0];
    for (let i = 0; i < 30; i++) {
      const d = pickDistractors(sensePool, t, Math.random);
      expect(d).toHaveLength(3);
      expect(d.map(w => w.h)).not.toContain("单");
    }
  });

  // Real ±40-index-window collisions found by the fairness audit (108 in HSK1-3,
  // 956 across HSK1-6): the target's first sense doesn't overlap the candidate's
  // first sense, but a later sense on one or both sides does -- old code (first-
  // sense-only) missed these entirely.
  it("excludes a candidate whose first sense matches the target's SECOND sense (不/没)", () => {
    const notPool = [
      mk("不", "no; not so", "A", 100), // target
      mk("没", "not; haven't", "B", 90), // "not" shared with target's 2nd sense -> excluded
      mk("吃", "to eat", "C", 80),
      mk("水", "water", "D", 70),
      mk("大", "big", "E", 60)
    ];
    const t = notPool[0];
    for (let i = 0; i < 30; i++) {
      const d = pickDistractors(notPool, t, Math.random);
      expect(d).toHaveLength(3);
      expect(d.map(w => w.h)).not.toContain("没");
    }
  });

  it("excludes a candidate whose second sense matches the target's second sense (也/太)", () => {
    const alsoPool = [
      mk("也", "also; too", "A", 100), // target
      mk("太", "too; extremely", "B", 90), // "too" shared -> excluded
      mk("吃", "to eat", "C", 80),
      mk("水", "water", "D", 70),
      mk("大", "big", "E", 60)
    ];
    const t = alsoPool[0];
    for (let i = 0; i < 30; i++) {
      const d = pickDistractors(alsoPool, t, Math.random);
      expect(d).toHaveLength(3);
      expect(d.map(w => w.h)).not.toContain("太");
    }
  });

  // Guards the sense-by-sense (Cartesian) design against a regression back to a
  // flat whole-gloss token bag. A flat bag would still pass all the tests above
  // (they all collide on a real content token like "single"/"not"/"too"), but it
  // silently reintroduces real-data collisions where the ONLY shared sense is
  // entirely stopwords ("or", "and", "lit" are all in STOPWORDS): a flat bag
  // drops those tokens everywhere and never sees the match. Real collisions this
  // guards: 或/或者 ("or"), 及/以及 ("and"), 束手无策/杯弓蛇影 ("lit"). This is a
  // design guard, not a TDD bug-fix test -- it's green against the ORIGINAL
  // pre-fix (first-sense-only) code too, since first-sense-only also hits its
  // own degenerate stopword-string-equality fallback for these pairs.
  it("excludes a candidate colliding only on a stopword-only sense (或/或者)", () => {
    const orPool = [
      mk("或", "or; maybe; perhaps", "A", 100), // target
      mk("或者", "or; possibly", "B", 90), // shares bare sense "or" -> excluded
      mk("吃", "to eat", "C", 80),
      mk("水", "water", "D", 70),
      mk("大", "big", "E", 60)
    ];
    for (let i = 0; i < 30; i++) {
      const d = pickDistractors(orPool, orPool[0], Math.random);
      expect(d).toHaveLength(3);
      expect(d.map(w => w.h)).not.toContain("或者");
    }
  });

  it("widens to fullPool when a small custom deck is meaning-homogeneous", () => {
    // Simulates a "Fight weak words" deck (main.js: B.deck.length < 8 falls back
    // to pool, but >=8 custom decks are passed through as-is): all but one
    // non-target word here shares the content token "examine" with the target,
    // so the scoped-deck fallback (pool.filter(ok)) alone can't find 3 distractors.
    const target = mk("查", "to examine", "A", 100);
    const deck = [
      target,
      mk("察", "to examine carefully", "B", 90),   // shares "examine" -> excluded
      mk("核", "examine and verify", "C", 80),      // shares "examine" -> excluded
      mk("审", "to examine in detail", "D", 70),    // shares "examine" -> excluded
      mk("验", "carefully examine", "E", 60),       // shares "examine" -> excluded
      mk("视", "examine closely", "F", 50),          // shares "examine" -> excluded
      mk("勘", "examine thoroughly", "G", 40),       // shares "examine" -> excluded
      mk("水", "water", "H", 30),                    // only non-excluded word in deck
    ];
    const fullPool = [
      ...deck,
      mk("吃", "to eat", "I", 20),
      mk("睡", "to sleep", "J", 19),
      mk("大", "big", "K", 18),
      mk("狗", "dog", "L", 17),
    ];
    const d = pickDistractors(deck, target, firstRand, fullPool);
    expect(d).toHaveLength(3);
    expect(d.map(w => w.h)).not.toContain("查");
    for (const w of d) {
      expect(w.e.split(";")[0].toLowerCase()).not.toContain("examine");
    }
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

  it("excludes a distractor whose Thai first sense matches the target's", () => {
    const pool = [
      mk2("看", "to look", "ดู; มอง", 100),      // target
      mk2("望", "to gaze", "มอง, ดู", 90),        // Thai overlap -> excluded
      mk2("吃", "to eat", "กิน", 80),
      mk2("水", "water", "น้ำ", 70),
      mk2("大", "big", "ใหญ่", 60),
    ];
    const d = pickDistractors(pool, pool[0], firstRand);
    expect(d.map(w => w.h)).not.toContain("望");
  });
  it("keeps Thai-distinct candidates even when short", () => {
    const pool = [
      mk2("看", "to look", "ดู", 100),
      mk2("门", "door", "ประตู", 90),
      mk2("吃", "to eat", "กิน", 80),
      mk2("水", "water", "น้ำ", 70),
    ];
    expect(pickDistractors(pool, pool[0], firstRand)).toHaveLength(3);
  });

  // The two tests above use firstRand (deterministic shuffle), which happens to rotate
  // 望 to the end of the candidate list regardless of Thai logic -- they'd pass even
  // without sameThai. This loop uses Math.random across many draws so it actually goes
  // red without the implementation (old code only excludes exact-string Thai matches;
  // "ดู; มอง" !== "มอง, ดู" as strings, so 望 slips through the old filter).
  it("excludes Thai first-sense synonym overlap across shuffles", () => {
    const pool = [
      mk2("看", "to look", "ดู; มอง", 100),
      mk2("望", "to gaze", "มอง, ดู", 90),
      mk2("吃", "to eat", "กิน", 80),
      mk2("水", "water", "น้ำ", 70),
    ];
    for (let i = 0; i < 30; i++) {
      expect(pickDistractors(pool, pool[0], Math.random).map(w => w.h)).not.toContain("望");
    }
  });

  // Thai fairness fix (mirrors the English full-gloss fix): the game displays
  // the WHOLE Thai gloss (reverse prompt / meaning options render all of w.t
  // when scope.lang is "th"), so comparing only the first Thai sense misses
  // real collisions on later senses. Real-data example: 是 "คือ; ใช่" (is; yes)
  // vs 对 "ถูกต้อง; ใช่" (correct; yes) -- both share "ใช่" as their SECOND
  // sense, invisible to a first-sense-only comparison.
  it("compares the FULL multi-sense Thai gloss, not just the first sense (fairness fix)", () => {
    const thaiSensePool = [
      mk2("是", "to be", "คือ; ใช่", 100), // target
      mk2("对", "correct", "ถูกต้อง; ใช่", 90), // shares target's 2nd Thai sense "ใช่" -> excluded
      mk2("吃", "to eat", "กิน", 80),
      mk2("水", "water", "น้ำ", 70),
      mk2("大", "big", "ใหญ่", 60),
    ];
    const t = thaiSensePool[0];
    for (let i = 0; i < 30; i++) {
      const d = pickDistractors(thaiSensePool, t, Math.random);
      expect(d).toHaveLength(3);
      expect(d.map(w => w.h)).not.toContain("对");
    }
  });

  // Real ±40-index-window-scale collision: candidate's SECOND sense matches
  // the target's (only) sense. Real-data example: 去 "ไป" (to go) vs 走
  // "เดิน; ไป, จากไป" (to walk; to go, to leave) -- 走's second sense contains
  // the synonym "ไป", identical to 去's whole gloss. Old first-sense-only code
  // compared "ไป" against "เดิน" only and missed this entirely.
  it("excludes a candidate whose second Thai sense matches the target's first (去/走)", () => {
    const goWalkPool = [
      mk2("去", "to go", "ไป", 100), // target
      mk2("走", "to walk", "เดิน; ไป, จากไป", 90), // 2nd sense synonym "ไป" matches target -> excluded
      mk2("吃", "to eat", "กิน", 80),
      mk2("水", "water", "น้ำ", 70),
      mk2("大", "big", "ใหญ่", 60),
    ];
    const t = goWalkPool[0];
    for (let i = 0; i < 30; i++) {
      const d = pickDistractors(goWalkPool, t, Math.random);
      expect(d).toHaveLength(3);
      expect(d.map(w => w.h)).not.toContain("走");
    }
  });

  // Regression: single-sense Thai glosses (no ";") must behave exactly as
  // before -- the Cartesian generalization degenerates to the old single-pair
  // comparison when there's only one sense on each side.
  it("still excludes single-sense Thai synonym overlap (regression)", () => {
    const singleSensePool = [
      mk2("看", "to look", "ดู, มอง", 100), // target, single sense, two synonyms
      mk2("望", "to gaze", "มอง", 90), // shares synonym "มอง" -> excluded
      mk2("吃", "to eat", "กิน", 80),
      mk2("水", "water", "น้ำ", 70),
    ];
    for (let i = 0; i < 30; i++) {
      expect(
        pickDistractors(singleSensePool, singleSensePool[0], Math.random).map(w => w.h)
      ).not.toContain("望");
    }
  });

  // Regression: single-sense, non-colliding Thai glosses must still be
  // allowed as distractors of each other.
  it("still allows single-sense Thai non-colliding glosses (regression)", () => {
    const singleSenseDistinctPool = [
      mk2("看", "to look", "ดู", 100),
      mk2("门", "door", "ประตู", 90),
      mk2("吃", "to eat", "กิน", 80),
      mk2("水", "water", "น้ำ", 70),
    ];
    expect(pickDistractors(singleSenseDistinctPool, singleSenseDistinctPool[0], firstRand)).toHaveLength(3);
  });

  // BUG: the old ok() predicate only rejected candidates colliding with the
  // TARGET, never with each other, so two distractors could render the same
  // gloss to the player (real-data examples: 但/却 both "but; yet"; Thai
  // 没/没有 both "ไม่มี; ยังไม่").
  describe("mutual distractor collisions", () => {
    it("never picks two distractors that share an English gloss, even when the window puts both first under a crafted rand", () => {
      // Pool order (target excluded) is ["吃","但","却","水"]. With rand=()=>0,
      // shuffle() rotates left by 1 -> ["但","却","水","吃"]; the OLD code's
      // naive slice(0,3) would return 但+却+水, resurrecting the same "but;
      // yet" gloss twice.
      const target = mk("大", "big", "ใหญ่", 100);
      const pool = [
        target,
        mk("吃", "to eat", "กิน", 90),
        mk("但", "but; yet", "แต่", 80),
        mk("却", "but; yet", "แต่", 70),
        mk("水", "water", "น้ำ", 60),
      ];
      const d = pickDistractors(pool, target, firstRand);
      expect(d).toHaveLength(3);
      const hanzi = d.map(w => w.h);
      expect(hanzi.includes("但") && hanzi.includes("却")).toBe(false);
    });

    it("never picks two distractors that share a Thai gloss, even when the window puts both first under a crafted rand", () => {
      const target = mk2("大", "big", "ใหญ่", 100);
      const pool = [
        target,
        mk2("吃", "to eat", "กิน", 90),
        mk2("没", "not have", "ไม่มี; ยังไม่", 80),
        mk2("没有", "to not have", "ไม่มี; ยังไม่", 70),
        mk2("水", "water", "น้ำ", 60),
      ];
      const d = pickDistractors(pool, target, firstRand);
      expect(d).toHaveLength(3);
      const hanzi = d.map(w => w.h);
      expect(hanzi.includes("没") && hanzi.includes("没有")).toBe(false);
    });

    it("holds under many random shuffles: no two returned distractors ever collide", () => {
      const target = mk("大", "big", "ใหญ่", 100);
      const pool = [
        target,
        mk("吃", "to eat", "กิน", 90),
        mk("但", "but; yet", "แต่", 80),
        mk("却", "but; yet", "แต่", 70),
        mk("可是", "but; however", "แต่", 65),
        mk("水", "water", "น้ำ", 60),
        mk("大狗", "big dog", "หมาใหญ่", 55),
      ];
      for (let i = 0; i < 50; i++) {
        const d = pickDistractors(pool, target, Math.random);
        expect(d).toHaveLength(3);
        const hanzi = d.map(w => w.h);
        // at most one of the three mutually-colliding "but" synonyms
        const butCount = ["但", "却", "可是"].filter(h => hanzi.includes(h)).length;
        expect(butCount).toBeLessThanOrEqual(1);
      }
    });

    it("widens window -> pool -> fullPool when the passed deck is mutually collision-homogeneous", () => {
      // deck's only non-target candidates all share the same "but" gloss, so
      // no 3 mutually-distinct picks exist within the deck at all; the
      // function must widen out to fullPool to find fillers.
      const target = mk("大", "big", "ใหญ่", 100);
      const deck = [
        target,
        mk("但", "but; yet", "A", 90),
        mk("却", "but; yet", "B", 80),
        mk("可是", "but; however", "C", 70),
      ];
      const fullPool = [
        ...deck,
        mk("吃", "to eat", "D", 60),
        mk("水", "water", "E", 50),
        mk("狗", "dog", "F", 40),
      ];
      const d = pickDistractors(deck, target, firstRand, fullPool);
      expect(d).toHaveLength(3);
      const hanzi = d.map(w => w.h);
      const butCount = ["但", "却", "可是"].filter(h => hanzi.includes(h)).length;
      expect(butCount).toBeLessThanOrEqual(1);
    });

    it("degenerate case: only mutually-colliding candidates exist anywhere -- still returns 3", () => {
      // Even fullPool == deck here, so no non-colliding filler exists at all;
      // the function must fall back to topping up with colliding candidates
      // rather than returning fewer than 3.
      const target = mk("大", "big", "ใหญ่", 100);
      const deck = [
        target,
        mk("但", "but; yet", "A", 90),
        mk("却", "but; yet", "B", 80),
        mk("可是", "but; however", "C", 70),
      ];
      const d = pickDistractors(deck, target, firstRand, deck);
      expect(d).toHaveLength(3);
      expect(d.map(w => w.h).sort()).toEqual(["但", "却", "可是"]);
    });
  });
});
