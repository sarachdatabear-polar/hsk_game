import { describe, it, expect } from "vitest";
import {
  defaultStickers, scopeNodes, stickerDefs, scopeFacts, evaluateAwards, popToast, dropFromQueue,
  EVENT_STICKERS,
} from "../src/stickers.js";

// tiny fixture level: 4 words so Top-N nodes vanish (4 ≤ 100) and pcts are easy
const W = (h, f) => ({ h, f });
const LEVELS = { "1": [W("一", 40), W("二", 30), W("三", 20), W("四", 10)] };
const mastered = hs => Object.fromEntries(hs.map(h => [h, { s: 3, k: 3, r: 3 }]));

describe("scopeNodes / stickerDefs", () => {
  it("emits topN nodes only when the level is bigger than N, plus the full level", () => {
    const nodes = scopeNodes({ 1: 205, 2: 479, 3: 1356 });
    expect(nodes.filter(n => n.lv === 1).map(n => n.id)).toEqual(["HSK1·top100", "HSK1·all"]);
    expect(nodes.filter(n => n.lv === 2).map(n => n.id)).toEqual(["HSK2·top100", "HSK2·top300", "HSK2·all"]);
    expect(nodes.filter(n => n.lv === 3).map(n => n.id)).toEqual(["HSK3·top100", "HSK3·top300", "HSK3·top500", "HSK3·all"]);
  });
  it("defs: scope stickers for topN nodes only, 4 milestones per level, 4 events", () => {
    const defs = stickerDefs({ 1: 205, 2: 479 });
    expect(defs.filter(d => d.kind === "scope").map(d => d.id)).toEqual(["scope:HSK1·top100", "scope:HSK2·top100", "scope:HSK2·top300"]);
    expect(defs.filter(d => d.kind === "milestone").length).toBe(8);
    expect(defs.filter(d => d.kind === "event").map(d => d.event)).toEqual(EVENT_STICKERS);
  });
});

describe("scopeFacts", () => {
  it("floors percentages and ranks Top-N by frequency", () => {
    const facts = scopeFacts(LEVELS, mastered(["一", "二", "三"]));  // 3 of 4 = 75%
    expect(facts.levelPcts["1"]).toBe(75);
    expect(facts.scopePcts["HSK1·all"]).toBe(75);
    expect(facts.levelCounts["1"]).toBe(4);
  });
  it("100% requires literally every word (floor, no rounding up)", () => {
    const facts = scopeFacts(LEVELS, mastered(["一", "二", "三"]));
    expect(facts.levelPcts["1"]).toBeLessThan(100);
    const full = scopeFacts(LEVELS, mastered(["一", "二", "三", "四"]));
    expect(full.levelPcts["1"]).toBe(100);
  });
});

describe("evaluateAwards", () => {
  const defs = stickerDefs({ 1: 4 });
  const baseFacts = { scopePcts: {}, levelPcts: { "1": 0 }, sessionDone: false, bossDefeated: false, streak: 0 };

  it("awards milestone thresholds exactly (24 no, 25 yes)", () => {
    let s = evaluateAwards(defaultStickers(), defs, { ...baseFacts, levelPcts: { "1": 24 } }, "2026-07-07");
    expect(Object.keys(s.earned)).toEqual([]);
    s = evaluateAwards(s, defs, { ...baseFacts, levelPcts: { "1": 25 } }, "2026-07-08");
    expect(s.earned["ms:HSK1:25"]).toBe("2026-07-08");
    expect(s.queue).toEqual(["ms:HSK1:25"]);
  });

  it("never double-awards across repeated evaluations", () => {
    let s = evaluateAwards(defaultStickers(), defs, { ...baseFacts, sessionDone: true }, "2026-07-07");
    expect(s.queue).toEqual(["ev:welcome"]);
    s = evaluateAwards(s, defs, { ...baseFacts, sessionDone: true }, "2026-07-08");
    expect(s.queue).toEqual(["ev:welcome"]);          // unchanged
    expect(s.earned["ev:welcome"]).toBe("2026-07-07"); // original date kept
  });

  it("event stickers gate on their facts", () => {
    const s = evaluateAwards(defaultStickers(), defs,
      { ...baseFacts, sessionDone: true, bossDefeated: true, streak: 7 }, "2026-07-07");
    expect(Object.keys(s.earned).sort()).toEqual(["ev:first-boss", "ev:streak-7", "ev:welcome"]);
    expect(s.earned["ev:streak-30"]).toBeUndefined();
  });

  it("monthly-40 awards when monthlyDone >= 40, not below", () => {
    let s = evaluateAwards(defaultStickers(), defs, { ...baseFacts, monthlyDone: 39 }, "2026-07-07");
    expect(s.earned["ev:monthly-40"]).toBeUndefined();
    s = evaluateAwards(defaultStickers(), defs, { ...baseFacts, monthlyDone: 40 }, "2026-07-07");
    expect(s.earned["ev:monthly-40"]).toBe("2026-07-07");
    s = evaluateAwards(defaultStickers(), defs, { ...baseFacts, monthlyDone: 50 }, "2026-07-07");
    expect(s.earned["ev:monthly-40"]).toBe("2026-07-07");
  });

  it("does not mutate the input state", () => {
    const s0 = defaultStickers();
    const snapshot = JSON.parse(JSON.stringify(s0));
    evaluateAwards(s0, defs, { ...baseFacts, sessionDone: true }, "2026-07-07");
    expect(s0).toEqual(snapshot);
  });
});

describe("popToast", () => {
  it("pops exactly one queued sticker per call, in FIFO order", () => {
    const s0 = { earned: { a: "d", b: "d" }, queue: ["a", "b"] };
    const p1 = popToast(s0);
    expect(p1.id).toBe("a");
    expect(p1.state.queue).toEqual(["b"]);
    const p2 = popToast(p1.state);
    expect(p2.id).toBe("b");
    const p3 = popToast(p2.state);
    expect(p3.id).toBe(null);
  });
});

describe("dropFromQueue", () => {
  it("removes only the given id and keeps earned intact", () => {
    const s = { earned: { "ev:monthly-40": "2026-07-10", "ev:welcome": "2026-07-01" },
                queue: ["ev:welcome", "ev:monthly-40"] };
    const r = dropFromQueue(s, "ev:monthly-40");
    expect(r.queue).toEqual(["ev:welcome"]);
    expect(r.earned).toEqual(s.earned);
    expect(s.queue).toHaveLength(2); // no input mutation
  });
  it("is a no-op when the id is not queued", () => {
    const s = { earned: {}, queue: ["ev:welcome"] };
    expect(dropFromQueue(s, "ev:monthly-40")).toBe(s);
  });
});
