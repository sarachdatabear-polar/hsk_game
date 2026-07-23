import { describe, it, expect } from "vitest";
import {
  STREET_RESIDENT_CYCLE_MS, streetResidentPose, streetResidentRoute,
} from "../src/street-resident.js";

describe("streetResidentRoute", () => {
  it("walks beside the active project first and a distant decoration second", () => {
    expect(streetResidentRoute({
      project: { x: .4, activity: "build" },
      decorations: [
        { x: .42, activity: "food" },
        { x: .78, activity: "water" },
      ],
    })).toEqual({
      home: { x: .09, activity: "wave" },
      primary: { x: .5, activity: "build" },
      secondary: { x: .68, activity: "water" },
    });
  });

  it("uses decorations when there is no project and safe defaults on an empty street", () => {
    expect(streetResidentRoute({ decorations: [{ x: .2, activity: "light" }] }).primary)
      .toEqual({ x: .3, activity: "light" });
    expect(streetResidentRoute()).toEqual({
      home: { x: .09, activity: "wave" },
      primary: { x: .36, activity: "wave" },
      secondary: { x: .72, activity: "rest" },
    });
  });

  it("clamps hostile positions inside the Street", () => {
    const route = streetResidentRoute({ project: { x: 99 } });
    expect(route.primary.x).toBeGreaterThanOrEqual(.09);
    expect(route.primary.x).toBeLessThanOrEqual(.91);
  });
});

describe("streetResidentPose", () => {
  const route = {
    home: { x: .1, activity: "wave" },
    primary: { x: .5, activity: "build" },
    secondary: { x: .8, activity: "water" },
  };

  it("walks, works, visits, and returns home over one deterministic cycle", () => {
    expect(streetResidentPose(0, route)).toMatchObject({ x: .1, state: "walk", facing: 1 });
    expect(streetResidentPose(2250, route)).toMatchObject({ x: .3, state: "walk", facing: 1 });
    expect(streetResidentPose(5000, route)).toMatchObject({ x: .5, state: "happy", activity: "build" });
    expect(streetResidentPose(9500, route)).toMatchObject({ x: .65, state: "walk", facing: 1 });
    expect(streetResidentPose(12000, route)).toMatchObject({ x: .8, state: "happy", activity: "water", facing: -1 });
    expect(streetResidentPose(16250, route)).toMatchObject({ x: .45, state: "walk", facing: -1 });
    expect(streetResidentPose(STREET_RESIDENT_CYCLE_MS, route))
      .toEqual(streetResidentPose(0, route));
  });

  it("renders a static happy home pose for reduced motion", () => {
    expect(streetResidentPose(9000, route, true))
      .toEqual({ x: .1, state: "happy", activity: "wave", facing: 1 });
  });

  it("normalizes negative and non-numeric timestamps", () => {
    expect(streetResidentPose("nope", route)).toEqual(streetResidentPose(0, route));
    expect(streetResidentPose(-1, route).x).toBeCloseTo(.1);
  });
});
