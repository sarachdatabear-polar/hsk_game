import { describe, it, expect } from "vitest";
import {
  defaultSupporterMoment,
  shouldShowSupporterMoment,
  recordSupporterMomentShown,
} from "../src/monetization/supporter-moment.js";

const DAY = "2026-07-29";
const NEXT = "2026-07-30";
// A fully-qualifying baseline; each test flips ONE thing off it.
const OK = { streakSaved: false, bossDefeated: true, leveledUp: false, isSupporter: false, supporterOn: true };

describe("defaultSupporterMoment", () => {
  it("starts with no last-shown day", () => {
    expect(defaultSupporterMoment()).toEqual({ lastShownDay: "" });
  });
});

describe("shouldShowSupporterMoment", () => {
  it("shows when billing is on, not a supporter, a moment happened, not shown today", () => {
    expect(shouldShowSupporterMoment(defaultSupporterMoment(), OK, DAY))
      .toEqual({ show: true, reason: "ok" });
  });
  it("each moment qualifies alone", () => {
    for (const key of ["streakSaved", "bossDefeated", "leveledUp"]) {
      const facts = { ...OK, streakSaved: false, bossDefeated: false, leveledUp: false, [key]: true };
      expect(shouldShowSupporterMoment(defaultSupporterMoment(), facts, DAY).show).toBe(true);
    }
  });
  it("denies when no moment happened", () => {
    const facts = { ...OK, streakSaved: false, bossDefeated: false, leveledUp: false };
    expect(shouldShowSupporterMoment(defaultSupporterMoment(), facts, DAY))
      .toEqual({ show: false, reason: "no-moment" });
  });
  it("denies a supporter even on a qualifying moment", () => {
    expect(shouldShowSupporterMoment(defaultSupporterMoment(), { ...OK, isSupporter: true }, DAY))
      .toEqual({ show: false, reason: "supporter" });
  });
  it("denies when billing is dark (supporterOn false)", () => {
    expect(shouldShowSupporterMoment(defaultSupporterMoment(), { ...OK, supporterOn: false }, DAY))
      .toEqual({ show: false, reason: "dark" });
  });
  it("denies a second show the same day, allows the next day", () => {
    const shown = recordSupporterMomentShown(defaultSupporterMoment(), DAY);
    expect(shouldShowSupporterMoment(shown, OK, DAY)).toEqual({ show: false, reason: "shown-today" });
    expect(shouldShowSupporterMoment(shown, OK, NEXT).show).toBe(true);
  });
  it("fails safe on missing state/facts/day", () => {
    expect(shouldShowSupporterMoment(null, OK, "").show).toBe(false);
    expect(shouldShowSupporterMoment(null, null, DAY).show).toBe(false);
    expect(shouldShowSupporterMoment(undefined, OK, DAY).show).toBe(true); // state absent = never shown
  });
});

describe("recordSupporterMomentShown", () => {
  it("returns a NEW state stamped with the day (no mutation)", () => {
    const s = defaultSupporterMoment();
    const r = recordSupporterMomentShown(s, DAY);
    expect(r).toEqual({ lastShownDay: DAY });
    expect(s).toEqual({ lastShownDay: "" });
  });
});
