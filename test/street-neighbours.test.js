import { describe, it, expect } from "vitest";
import {
  NEIGHBOURS, residentNeighbours, newlyMovedIn, newlyMovedInByBuild, neighbourPose,
} from "../src/street-neighbours.js";

describe("NEIGHBOURS", () => {
  it("binds the three residents to their landmarks", () => {
    expect(NEIGHBOURS.map(n => n.id)).toEqual(["tiao", "pang", "wen"]);
    const byId = Object.fromEntries(NEIGHBOURS.map(n => [n.id, n]));
    expect(byId.tiao.landmarkId).toBe("coin-bank");
    expect(byId.tiao.unlock).toBe(10);
    expect(byId.pang.landmarkId).toBe("tailor");
    expect(byId.pang.unlock).toBe(20);
    expect(byId.wen.landmarkId).toBe("kitten-cafe");
    expect(byId.wen.unlock).toBe(30);
  });
});

describe("residentNeighbours", () => {
  it("returns only neighbours whose building is finished", () => {
    expect(residentNeighbours(9)).toEqual([]);
    expect(residentNeighbours(10)).toEqual(["tiao"]);
    expect(residentNeighbours(20)).toEqual(["tiao", "pang"]);
    expect(residentNeighbours(30)).toEqual(["tiao", "pang", "wen"]);
  });
});

describe("newlyMovedIn", () => {
  it("returns residents not yet recorded as met", () => {
    expect(newlyMovedIn(20, [])).toEqual(["tiao", "pang"]);
    expect(newlyMovedIn(20, ["tiao"])).toEqual(["pang"]);
    expect(newlyMovedIn(20, ["tiao", "pang"])).toEqual([]);
  });
  it("ignores unknown ids already in met", () => {
    expect(newlyMovedIn(10, ["ghost"])).toEqual(["tiao"]);
  });
});

describe("neighbourPose", () => {
  it("pins to a calm idle at the anchor under reduced motion", () => {
    expect(neighbourPose(12345, 0.5, true)).toEqual({ x: 0.5, facing: 1, sprite: "idle" });
  });
  it("idles at the anchor during the rest window", () => {
    const p = neighbourPose(0, 0.5, false);
    expect(p.sprite).toBe("idle");
    expect(p.x).toBeCloseTo(0.5, 5);
  });
  it("walks with an alternating passing cycle during the walk window", () => {
    // walk window starts at 16000ms; sprite alternates every 200ms.
    const a = neighbourPose(16000, 0.5, false);
    const b = neighbourPose(16200, 0.5, false);
    expect(a.sprite === "walk-a" || a.sprite === "walk-b").toBe(true);
    expect(b.sprite).not.toBe(a.sprite);
  });
  it("is deterministic for a given time", () => {
    expect(neighbourPose(16000, 0.5, false)).toEqual(neighbourPose(16000, 0.5, false));
  });
  it("walks back during the return window with facing:-1", () => {
    // return window is [20000, 24000); at 22000 should be mid-return.
    const p = neighbourPose(22000, 0.5, false);
    expect(p.facing).toBe(-1);
    expect(p.sprite === "walk-a" || p.sprite === "walk-b").toBe(true);
    expect(p.x).toBeGreaterThan(0.5);
    expect(p.x).toBeLessThan(0.56);
  });
  it("maintains continuity at walk-out to return boundary", () => {
    // at 19999 (end of walk-out) and 20000 (start of return), x should both be ~0.56.
    const atEnd = neighbourPose(19999, 0.5, false);
    const atStart = neighbourPose(20000, 0.5, false);
    expect(atEnd.x).toBeCloseTo(0.56, 2);
    expect(atStart.x).toBeCloseTo(0.56, 2);
  });
  it("wraps to idle at anchor after full cycle", () => {
    const idle = neighbourPose(0, 0.5, false);
    const wrapped = neighbourPose(24000, 0.5, false);
    expect(wrapped).toEqual(idle);
  });
});

describe("newlyMovedInByBuild", () => {
  it("returns neighbours whose landmark is finished and not yet met", () => {
    expect(newlyMovedInByBuild({ "coin-bank": 3 }, [])).toEqual(["tiao"]);
    expect(newlyMovedInByBuild({ "coin-bank": 3, "tailor": 3 }, ["tiao"])).toEqual(["pang"]);
  });
  it("ignores unfinished landmarks and already-met neighbours", () => {
    expect(newlyMovedInByBuild({ "coin-bank": 2 }, [])).toEqual([]);
    expect(newlyMovedInByBuild({ "kitten-cafe": 3 }, ["wen"])).toEqual([]);
    expect(newlyMovedInByBuild({}, [])).toEqual([]);
  });
});
