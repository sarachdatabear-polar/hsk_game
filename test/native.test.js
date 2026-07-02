import { describe, it, expect, beforeEach } from "vitest";
import { isNative, nextBackScreen, hapticKill, keepAwake } from "../src/native.js";

beforeEach(() => { delete globalThis.window; });

describe("nextBackScreen", () => {
  it("sub-screens go back to home", () => {
    for (const s of ["scope", "learn", "scores", "progress", "howto"])
      expect(nextBackScreen(s)).toBe("home");
  });
  it("battle and results go back to home", () => {
    expect(nextBackScreen("battle")).toBe("home");
    expect(nextBackScreen("results")).toBe("home");
  });
  it("home returns null (exit app)", () => {
    expect(nextBackScreen("home")).toBe(null);
  });
  it("unknown screen falls back to home", () => {
    expect(nextBackScreen("whatever")).toBe("home");
  });
});

describe("web runtime is inert", () => {
  it("isNative() is false with no Capacitor", () => {
    globalThis.window = {};
    expect(isNative()).toBe(false);
  });
  it("haptics/keepAwake are silent no-ops on web", () => {
    globalThis.window = {};
    expect(() => { hapticKill(); keepAwake(true); keepAwake(false); }).not.toThrow();
  });
});
