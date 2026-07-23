import { describe, it, expect } from "vitest";
import {
  defaultStreetProject, makeStreetProject, normalizeStreetProject,
  projectStage, streetProjectProgress, remainingBucket,
} from "../src/street-project.js";

const item = { id: "koi-pond", type: "deco", price: 6000 };

describe("Street Project state", () => {
  it("has a versioned empty default", () => {
    expect(defaultStreetProject()).toEqual({ v: 1, itemId: "", plotId: "" });
  });

  it("creates a normalized project without mutating inputs", () => {
    expect(makeStreetProject("koi-pond", "plot-medium-02"))
      .toEqual({ v: 1, itemId: "koi-pond", plotId: "plot-medium-02" });
  });

  it("clears malformed and already-owned projects", () => {
    expect(normalizeStreetProject(null)).toEqual(defaultStreetProject());
    expect(normalizeStreetProject({ itemId: 7, plotId: [] })).toEqual(defaultStreetProject());
    expect(normalizeStreetProject({ itemId: "koi-pond", plotId: "plot-medium-02" }, ["koi-pond"]))
      .toEqual(defaultStreetProject());
  });

  it("upgrades legacy-shaped valid state to the current version", () => {
    expect(normalizeStreetProject({ v: 99, itemId: "koi-pond", plotId: "plot-medium-02" }))
      .toEqual({ v: 1, itemId: "koi-pond", plotId: "plot-medium-02" });
  });
});

describe("Street Project progress", () => {
  it("uses wallet progress without spending or escrow", () => {
    expect(streetProjectProgress(makeStreetProject(item.id), item, 1250, 1750)).toMatchObject({
      active: true, price: 6000, before: 1250, after: 1750,
      gained: 500, remaining: 4250, beforePct: 20, pct: 29,
      ready: false, crossedReady: false,
    });
  });

  it("caps progress at 100% and detects becoming ready", () => {
    expect(streetProjectProgress(makeStreetProject(item.id), item, 5900, 6200)).toMatchObject({
      gained: 300, remaining: 0, beforePct: 98, pct: 100,
      ready: true, crossedReady: true, stage: 3,
    });
  });

  it("does not report negative session earnings when wallet fell", () => {
    expect(streetProjectProgress(makeStreetProject(item.id), item, 3000, 2500)).toMatchObject({
      gained: 0, remaining: 3500, beforePct: 50, pct: 41,
    });
  });

  it("returns an inactive result for the wrong item or a non-decoration", () => {
    expect(streetProjectProgress(makeStreetProject("tea-sign"), item, 0, 100)).toMatchObject({ active: false });
    expect(streetProjectProgress(makeStreetProject("skin"), { id: "skin", type: "skin", price: 100 }, 0, 100))
      .toMatchObject({ active: false });
  });

  it("moves through blueprint, scaffolding, almost-ready, and ready stages", () => {
    expect([0, 1999, 2000, 3999, 4000, 5999, 6000].map(n => projectStage(n, 6000)))
      .toEqual([0, 0, 1, 1, 2, 2, 3]);
  });

  it("buckets remaining coins without exposing exact wallet analytics", () => {
    expect([0, 499, 500, 1999, 2000, 4999, 5000].map(remainingBucket))
      .toEqual(["ready", "<500", "500-1999", "500-1999", "2000-4999", "2000-4999", "5000+"]);
  });
});
