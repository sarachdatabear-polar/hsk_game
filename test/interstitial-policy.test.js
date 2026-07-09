import { describe, it, expect } from "vitest";
import {
  MIN_INTERSTITIAL_GAP_MS,
  canShowInterstitial,
  recordInterstitialShown,
} from "../src/monetization/interstitial-policy.js";

describe("MIN_INTERSTITIAL_GAP_MS", () => {
  it("is 180000ms (180s) per PRD §5.1", () => {
    expect(MIN_INTERSTITIAL_GAP_MS).toBe(180000);
  });
});

describe("canShowInterstitial", () => {
  it("denies a supporter even when session/cooldown would otherwise allow", () => {
    const state = {
      isSupporter: true,
      sessionIndex: 5,
      lastInterstitialAt: 0,
    };
    const result = canShowInterstitial(state, 10_000_000);
    expect(result).toEqual({ allowed: false, reason: "supporter" });
  });

  it("denies during the first-ever session (sessionIndex 1)", () => {
    const state = { isSupporter: false, sessionIndex: 1, lastInterstitialAt: null };
    const result = canShowInterstitial(state, 1000);
    expect(result).toEqual({ allowed: false, reason: "first-session" });
  });

  it("allows in session 2 when there is no prior interstitial", () => {
    const state = { isSupporter: false, sessionIndex: 2, lastInterstitialAt: null };
    const result = canShowInterstitial(state, 1000);
    expect(result).toEqual({ allowed: true, reason: "ok" });
  });

  it("denies when lastInterstitialAt is null but sessionIndex is missing (defensive first-session)", () => {
    const state = { isSupporter: false, lastInterstitialAt: null };
    const result = canShowInterstitial(state, 1000);
    expect(result).toEqual({ allowed: false, reason: "first-session" });
  });

  it("allows exactly at the 180000ms boundary (gap satisfied)", () => {
    const lastAt = 1_000_000;
    const now = lastAt + MIN_INTERSTITIAL_GAP_MS; // === MIN, gap fully elapsed
    const state = { isSupporter: false, sessionIndex: 3, lastInterstitialAt: lastAt };
    const result = canShowInterstitial(state, now);
    expect(result).toEqual({ allowed: true, reason: "ok" });
  });

  it("denies at 1ms short of the boundary (179999ms elapsed)", () => {
    const lastAt = 1_000_000;
    const now = lastAt + MIN_INTERSTITIAL_GAP_MS - 1;
    const state = { isSupporter: false, sessionIndex: 3, lastInterstitialAt: lastAt };
    const result = canShowInterstitial(state, now);
    expect(result).toEqual({ allowed: false, reason: "cooldown" });
  });

  it("allows at 1ms past the boundary (180001ms elapsed)", () => {
    const lastAt = 1_000_000;
    const now = lastAt + MIN_INTERSTITIAL_GAP_MS + 1;
    const state = { isSupporter: false, sessionIndex: 3, lastInterstitialAt: lastAt };
    const result = canShowInterstitial(state, now);
    expect(result).toEqual({ allowed: true, reason: "ok" });
  });

  it("allows when lastInterstitialAt is null and sessionIndex >= 2 (no prior ad)", () => {
    const state = { isSupporter: false, sessionIndex: 4, lastInterstitialAt: null };
    const result = canShowInterstitial(state, 999_999);
    expect(result).toEqual({ allowed: true, reason: "ok" });
  });

  it("does not throw and denies on undefined state", () => {
    expect(() => canShowInterstitial(undefined, 1000)).not.toThrow();
    const result = canShowInterstitial(undefined, 1000);
    expect(result.allowed).toBe(false);
  });

  it("does not throw and denies on empty state object", () => {
    const result = canShowInterstitial({}, 1000);
    expect(result).toEqual({ allowed: false, reason: "first-session" });
  });
});

describe("recordInterstitialShown", () => {
  it("returns a new state object with lastInterstitialAt set to now", () => {
    const original = { isSupporter: false, sessionIndex: 3, lastInterstitialAt: null };
    const updated = recordInterstitialShown(original, 555_555);
    expect(updated).toEqual({
      isSupporter: false,
      sessionIndex: 3,
      lastInterstitialAt: 555_555,
    });
  });

  it("does not mutate the original state object", () => {
    const original = { isSupporter: false, sessionIndex: 3, lastInterstitialAt: null };
    const originalCopy = { ...original };
    recordInterstitialShown(original, 555_555);
    expect(original).toEqual(originalCopy);
  });

  it("returns a different object reference than the input", () => {
    const original = { isSupporter: false, sessionIndex: 3, lastInterstitialAt: null };
    const updated = recordInterstitialShown(original, 555_555);
    expect(updated).not.toBe(original);
  });
});
