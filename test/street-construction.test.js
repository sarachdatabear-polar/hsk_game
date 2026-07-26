import { describe, it, expect } from "vitest";
import { landmarkStage, constructionSprite } from "../src/street-construction.js";

describe("landmarkStage (stored)", () => {
  it("returns the stored stage for a landmark", () => {
    expect(landmarkStage({ "tailor": 2 }, "tailor")).toBe(2);
    expect(landmarkStage({ "coin-bank": 3 }, "coin-bank")).toBe(3);
  });
  it("is 0 for an unbuilt or unknown landmark", () => {
    expect(landmarkStage({}, "tailor")).toBe(0);
    expect(landmarkStage({ "tailor": 1 }, "nope")).toBe(0);
  });
  it("clamps garbage to 0-3", () => {
    expect(landmarkStage({ "tailor": 9 }, "tailor")).toBe(3);
    expect(landmarkStage(null, "tailor")).toBe(0);
    expect(landmarkStage({ "tailor": -2 }, "tailor")).toBe(0);
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
