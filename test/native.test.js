import { describe, it, expect, beforeEach, vi } from "vitest";
import { isNative, nextBackScreen, hapticKill, hapticWrong, keepAwake,
         syncStreakReminder, requestNotifPermission } from "../src/native.js";

beforeEach(() => { delete globalThis.window; });

// Fake Capacitor native runtime with a spyable LocalNotifications plugin.
// display is the value checkPermissions/requestPermissions report back.
function mockNative(display) {
  const calls = { cancel: 0, check: 0, request: 0, schedule: [] };
  const LN = {
    cancel: async () => { calls.cancel++; },
    checkPermissions: async () => { calls.check++; return { display }; },
    requestPermissions: async () => { calls.request++; return { display }; },
    schedule: async (opts) => { calls.schedule.push(opts); },
  };
  globalThis.window = { Capacitor: { isNativePlatform: () => true, Plugins: { LocalNotifications: LN } } };
  return calls;
}

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

describe("haptic rejection handling", () => {
  it("hapticKill guards a rejected Haptics.impact promise", () => {
    const catchSpy = { catch: vi.fn((fn) => { fn(new Error("rejected")); }) };
    globalThis.window = { Capacitor: { isNativePlatform: () => true, Plugins: { Haptics: { impact: () => catchSpy } } } };
    hapticKill();
    expect(catchSpy.catch).toHaveBeenCalled();
  });

  it("hapticWrong guards a rejected Haptics.impact promise", () => {
    const catchSpy = { catch: vi.fn((fn) => { fn(new Error("rejected")); }) };
    globalThis.window = { Capacitor: { isNativePlatform: () => true, Plugins: { Haptics: { impact: () => catchSpy } } } };
    hapticWrong();
    expect(catchSpy.catch).toHaveBeenCalled();
  });

  it("hapticKill is inert when Haptics is missing (no throw on undefined.catch)", () => {
    globalThis.window = { Capacitor: { isNativePlatform: () => true, Plugins: {} } };
    expect(() => { hapticKill(); }).not.toThrow();
  });

  it("hapticWrong is inert when Haptics is missing (no throw on undefined.catch)", () => {
    globalThis.window = { Capacitor: { isNativePlatform: () => true, Plugins: {} } };
    expect(() => { hapticWrong(); }).not.toThrow();
  });
});

describe("syncStreakReminder (background: schedules but never prompts)", () => {
  const plan = { schedule: true, hour: 19, cancel: false };

  it("schedules the reminder when permission is already granted", async () => {
    const calls = mockNative("granted");
    await syncStreakReminder(plan, "title", "body");
    expect(calls.cancel).toBe(1);
    expect(calls.schedule.length).toBe(1);
    expect(calls.schedule[0].notifications[0].id).toBe(1001);
  });

  it("NEVER calls requestPermissions from the background sync", async () => {
    const calls = mockNative("granted");
    await syncStreakReminder(plan, "t", "b");
    expect(calls.request).toBe(0);   // background must not prompt (Android 13+ suppresses it)
    expect(calls.check).toBe(1);     // it may only *check* existing permission
  });

  it("cancels but does not schedule when permission is not granted", async () => {
    const calls = mockNative("denied");
    await syncStreakReminder(plan, "t", "b");
    expect(calls.cancel).toBe(1);
    expect(calls.schedule.length).toBe(0);
    expect(calls.request).toBe(0);
  });

  it("cancels and returns without checking permission when plan says not to schedule", async () => {
    const calls = mockNative("granted");
    await syncStreakReminder({ schedule: false, hour: 19, cancel: true }, "t", "b");
    expect(calls.cancel).toBe(1);
    expect(calls.schedule.length).toBe(0);
  });

  it("is a silent no-op on web (no Capacitor)", async () => {
    globalThis.window = {};
    await expect(syncStreakReminder(plan, "t", "b")).resolves.toBeUndefined();
  });
});

describe("requestNotifPermission (foreground prompt)", () => {
  it("prompts via requestPermissions and returns the display status", async () => {
    const calls = mockNative("granted");
    const display = await requestNotifPermission();
    expect(calls.request).toBe(1);
    expect(display).toBe("granted");
  });

  it("reports denial back to the caller", async () => {
    mockNative("denied");
    expect(await requestNotifPermission()).toBe("denied");
  });

  it("is inert on web — returns 'denied' and does not throw", async () => {
    globalThis.window = {};
    await expect(requestNotifPermission()).resolves.toBe("denied");
  });
});
