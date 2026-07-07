import { describe, it, expect } from "vitest";
import { STAR_THRESHOLDS, starsFor, journeyNodes, currentNodeId } from "../src/journey.js";

describe("starsFor", () => {
  it("maps coverage pct to 0-3 stars at 50/80/100 (PRD B3)", () => {
    expect(STAR_THRESHOLDS).toEqual([50, 80, 100]);
    expect(starsFor(0)).toBe(0);
    expect(starsFor(49)).toBe(0);
    expect(starsFor(50)).toBe(1);
    expect(starsFor(79)).toBe(1);
    expect(starsFor(80)).toBe(2);
    expect(starsFor(99)).toBe(2);
    expect(starsFor(100)).toBe(3);
  });
});

describe("journeyNodes", () => {
  const counts = { 1: 205, 2: 479 };
  it("one node per sub-scope in path order, with pct and stars attached", () => {
    const nodes = journeyNodes(counts, { "HSK1·top100": 100, "HSK1·all": 60, "HSK2·top100": 30 });
    expect(nodes.map(n => n.id)).toEqual(["HSK1·top100", "HSK1·all", "HSK2·top100", "HSK2·top300", "HSK2·all"]);
    expect(nodes[0]).toEqual({ id: "HSK1·top100", lv: 1, topN: 100, pct: 100, stars: 3 });
    expect(nodes[1].stars).toBe(1);
    expect(nodes[3].pct).toBe(0);   // missing pct reads 0
    expect(nodes[3].stars).toBe(0);
  });
});

describe("currentNodeId", () => {
  const mk = stars => stars.map((s, i) => ({ id: "n" + i, stars: s }));
  it("is the first node below two stars (the 'you are here' marker)", () => {
    expect(currentNodeId(mk([3, 2, 1, 0]))).toBe("n2");
    expect(currentNodeId(mk([0, 0]))).toBe("n0");
    expect(currentNodeId(mk([2, 3, 2]))).toBe(null);   // everything ★★+ — journey complete
    expect(currentNodeId([])).toBe(null);
  });
});
