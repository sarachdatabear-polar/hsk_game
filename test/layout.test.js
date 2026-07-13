import { describe, it, expect } from "vitest";
import { uiScale, layout, lanternTrailLayout, lanternTrailBackdrop, lanternApproachScale } from "../src/layout.js";

describe("uiScale", () => {
  it("reference size (380x480) gives S=1", () => {
    expect(uiScale(380, 480)).toBe(1);
  });
  it("clamps tiny canvases to the 0.7 floor", () => {
    expect(uiScale(100, 100)).toBe(0.7);
  });
  it("clamps huge canvases to the 1.8 ceiling", () => {
    expect(uiScale(2000, 2000)).toBe(1.8);
  });
  it("scales proportionally within the clamp range", () => {
    expect(uiScale(570, 720)).toBe(1.5);   // 1.5x reference, still inside [0.7, 1.8]
  });
  it("uses the smaller of the two ratios (narrow-but-tall canvas)", () => {
    expect(uiScale(380, 960)).toBe(1);     // width ratio (1) is the binding constraint
    expect(uiScale(760, 480)).toBe(1);     // height ratio (1) is the binding constraint
  });
});

describe("layout", () => {
  it("exposes S matching uiScale", () => {
    expect(layout(380, 480).S).toBe(uiScale(380, 480));
    expect(layout(570, 720).S).toBe(uiScale(570, 720));
  });
  it("derived fields scale linearly with S at the reference size", () => {
    const L = layout(380, 480);
    expect(L.ground).toBe(30);
    expect(L.mascotX).toBe(52);
    expect(L.catHalf).toBeCloseTo(40.8);   // 34 * mascotS=1.2
    expect(L.hanziPx).toBe(64);   // 64 * textS=1
    expect(L.pinyinPx).toBe(18);   // 18 * textS=1
    expect(L.floaterPx).toBe(20);
    expect(L.coinPx).toBe(20);
  });
  it("fields scale proportionally to S away from the reference size", () => {
    const base = layout(380, 480);
    const bigger = layout(570, 720);   // S=1.5, within the clamp range
    expect(bigger.ground).toBeCloseTo(base.ground * 1.5);
    expect(bigger.mascotX).toBeCloseTo(base.mascotX * 1.5);
    // catHalf and hanziPx scale with mascotS and textS respectively, not S
  });
});

describe("textS / mascotS (battle-mobile-fit)", () => {
  it("textS is width-driven at phone sizes (not dragged down by a short canvas)", () => {
    // 360x640 viewport -> canvas ~336x278: old S bottomed out at 0.7 (hanzi 42px)
    const L = layout(336, 278);
    expect(L.textS).toBeCloseTo(336 / 380, 5);
    expect(L.hanziPx).toBeGreaterThanOrEqual(56);   // 64 * 336/380 = 56.59
  });
  it("textS has a height guard so the plaque can't outgrow very short canvases", () => {
    expect(layout(380, 130).textS).toBe(0.75);      // min(1, 0.5) -> clamped to floor
  });
  it("textS clamps to [0.75, 1.8]", () => {
    expect(layout(100, 100).textS).toBe(0.75);
    expect(layout(2000, 2000).textS).toBe(1.8);
  });
  it("hanziPx and pinyinPx derive from textS", () => {
    const L = layout(380, 480);                     // textS = 1
    expect(L.hanziPx).toBe(64);
    expect(L.pinyinPx).toBe(18);
  });
  it("mascotS boosts the scene scale 1.2x with a 0.85 floor", () => {
    expect(layout(380, 480).mascotS).toBeCloseTo(1.2, 5);        // S=1
    expect(layout(336, 278).mascotS).toBeCloseTo(0.85 * 1.2, 5); // S=0.7 -> floored
    expect(layout(2000, 2000).mascotS).toBe(2.1);                // ceiling
  });
  it("catHalf follows mascotS so the bite threshold matches the bigger sprite", () => {
    expect(layout(380, 480).catHalf).toBeCloseTo(34 * 1.2, 5);
  });
  it("mascotPx is gone (was dead — draw loop never read it)", () => {
    expect(layout(380, 480).mascotPx).toBeUndefined();
  });
});

describe("lanternTrailLayout", () => {
  it("places three lantern nodes across the left half of the path", () => {
    const trail = lanternTrailLayout(380, 480, 0, 30);
    expect(trail.nodes.map(node => node.x)).toEqual([
      expect.closeTo(60.8, 5),
      expect.closeTo(117.8, 5),
      expect.closeTo(174.8, 5),
    ]);
    expect(trail.nodes.map(node => node.lit)).toEqual([false, false, false]);
    expect(trail.catX).toBeCloseTo(60.8, 5);
  });

  it("lights route nodes and moves the cat as words are learned", () => {
    const trail = lanternTrailLayout(380, 480, 3, 30);
    expect(trail.step).toBe(3);
    expect(trail.nodes.map(node => node.lit)).toEqual([true, true, false]);
    expect(trail.catX).toBeCloseTo(129.2, 5);
  });

  it("holds the landmark pose at five learned before starting the next segment", () => {
    expect(lanternTrailLayout(380, 480, 5, 30).catX).toBeCloseTo(174.8, 5);
    expect(lanternTrailLayout(380, 480, 5, 30).nodes.every(node => node.lit)).toBe(true);
    expect(lanternTrailLayout(380, 480, 6, 30).step).toBe(1);
  });

  it("starts the next encounter at a fresh unlit segment after a landmark", () => {
    const trail = lanternTrailLayout(380, 480, 5, 30, { startNextSegment:true });
    expect(trail.step).toBe(0);
    expect(trail.catX).toBeCloseTo(60.8, 5);
    expect(trail.nodes.every(node => !node.lit)).toBe(true);
  });
});

describe("lanternTrailBackdrop", () => {
  it("rotates the existing world art at each 20-word chapter", () => {
    expect([0, 1, 2, 3, 4, 5].map(chapter => lanternTrailBackdrop(chapter))).toEqual([
      "bg-quest",
      "bg-temple",
      "bg-bamboo",
      "bg-lantern-festival",
      "bg-dragon-gate",
      "bg-quest",
    ]);
  });

  it("respects a backdrop the player equipped", () => {
    expect(lanternTrailBackdrop(3, "market")).toBe("bg-market");
  });
});

describe("lanternApproachScale", () => {
  it("preserves prompt time as the cat advances along the trail", () => {
    expect(lanternApproachScale(400, 200, 100)).toBeCloseTo(2 / 3, 5);
    expect(lanternApproachScale(400, 100, 100)).toBe(1);
  });
});
