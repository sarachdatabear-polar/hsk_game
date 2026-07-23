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
      home: { x: .12, focusX: .28, activity: "rest" },
      primary: { x: .49, focusX: .4, activity: "build" },
      secondary: { x: .69, focusX: .78, activity: "water" },
    });
  });

  it("uses decorations when there is no project and safe defaults on an empty street", () => {
    expect(streetResidentRoute({ decorations: [{ x: .2, activity: "light" }] }).primary)
      .toEqual({ x: .29, focusX: .2, activity: "light" });
    expect(streetResidentRoute()).toEqual({
      home: { x: .12, focusX: .28, activity: "rest" },
      primary: { x: .38, focusX: .48, activity: "admire" },
      secondary: { x: .72, focusX: .82, activity: "rest" },
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
    home: { x: .1, focusX: .2, activity: "rest" },
    primary: { x: .5, focusX: .4, activity: "build" },
    secondary: { x: .8, focusX: .9, activity: "water" },
  };

  it("toddles, works, visits, and returns home over one gentle deterministic cycle", () => {
    expect(streetResidentPose(0, route)).toMatchObject({ x: .1, state: "walk", facing: 1 });
    expect(streetResidentPose(2000, route)).toMatchObject({ x: .1625, state: "walk", facing: 1 });
    expect(streetResidentPose(4000, route)).toMatchObject({ x: .3, state: "walk", facing: 1 });
    expect(streetResidentPose(10000, route)).toMatchObject({
      x: .5, state: "happy", activity: "build", activityX: .4, facing: -1,
    });
    expect(streetResidentPose(16500, route)).toMatchObject({ x: .65, state: "walk", facing: 1 });
    expect(streetResidentPose(22000, route)).toMatchObject({
      x: .8, state: "happy", activity: "water", activityX: .9, facing: 1,
    });
    expect(streetResidentPose(28500, route)).toMatchObject({ x: .45, state: "walk", facing: -1 });
    expect(streetResidentPose(STREET_RESIDENT_CYCLE_MS, route))
      .toEqual(streetResidentPose(0, route));
  });

  it("renders a static happy home pose for reduced motion", () => {
    expect(streetResidentPose(9000, route, true))
      .toEqual({ x: .1, state: "happy", activity: "rest", activityX: .2, facing: 1 });
  });

  it("normalizes negative and non-numeric timestamps", () => {
    expect(streetResidentPose("nope", route)).toEqual(streetResidentPose(0, route));
    expect(streetResidentPose(-1, route).x).toBeCloseTo(.1);
  });
});
