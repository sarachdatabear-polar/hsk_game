import { describe, it, expect } from "vitest";
import { landmarkStage, constructionSprite } from "../src/street-construction.js";

describe("landmarkStage", () => {
  it("is finished at or above the unlock level", () => {
    expect(landmarkStage(20, "tailor")).toBe(3);
    expect(landmarkStage(25, "tailor")).toBe(3);
    expect(landmarkStage(99, "emperor-gate")).toBe(3);
  });
  it("buckets progress between the previous milestone and this one", () => {
    // tailor: prev=coin-bank(10), this=20, span=10.
    expect(landmarkStage(12, "tailor")).toBe(0);   // ratio .2  < 1/3
    expect(landmarkStage(14, "tailor")).toBe(1);   // ratio .4  ≥ 1/3 (scaffold)
    expect(landmarkStage(17, "tailor")).toBe(2);   // ratio .7  ≥ 2/3 (half-built)
    expect(landmarkStage(19, "tailor")).toBe(2);   // ratio .9  < 1   (still half-built)
  });
  it("measures the first landmark from level 0", () => {
    // lantern-post: prev=0, this=5, span=5.
    expect(landmarkStage(1, "lantern-post")).toBe(0);  // ratio .2
    expect(landmarkStage(2, "lantern-post")).toBe(1);  // ratio .4
    expect(landmarkStage(4, "lantern-post")).toBe(2);  // ratio .8
    expect(landmarkStage(5, "lantern-post")).toBe(3);
  });
  it("returns 0 for an unknown landmark id", () => {
    expect(landmarkStage(50, "nope")).toBe(0);
  });
});

describe("constructionSprite", () => {
  it("returns null at stage 0 (not shown yet)", () => {
    expect(constructionSprite("tailor", 0)).toBeNull();
  });
  it("returns the stage art for 1 and 2", () => {
    expect(constructionSprite("tailor", 1)).toBe("landmark-tailor-stage1");
    expect(constructionSprite("tailor", 2)).toBe("landmark-tailor-stage2");
  });
  it("returns the finished art at stage 3", () => {
    expect(constructionSprite("tailor", 3)).toBe("landmark-tailor");
  });
});
