import { describe, it, expect, beforeEach, vi } from "vitest";
import { isNative, nextBackScreen, hapticKill, hapticWrong, keepAwake,
         syncStreakReminder, syncReengageReminder, reengageFireAt,
         requestNotifPermission, __resetNativeForTests } from "../src/native.js";

beforeEach(() => { delete globalThis.window; __resetNativeForTests(); });

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

describe("keepAwake bridge lifecycle", () => {
  const flush = () => new Promise(resolve => setTimeout(resolve, 0));

  it("retries the same desired state after a late plugin registration", async () => {
    globalThis.window = { Capacitor:{ isNativePlatform:()=>true, Plugins:{} } };
    keepAwake(true);
    const calls = [];
    window.Capacitor.Plugins.KeepAwake = {
      keepAwake: async()=>{ calls.push("on"); }, allowSleep:async()=>{ calls.push("off"); },
    };
    keepAwake(true);
    await flush();
    expect(calls).toEqual(["on"]);
  });

  it("serializes a rapid on/off pair and ends in the requested state", async () => {
    const calls = [];
    globalThis.window = { Capacitor:{ isNativePlatform:()=>true, Plugins:{ KeepAwake:{
      keepAwake:async()=>{ calls.push("on"); }, allowSleep:async()=>{ calls.push("off"); },
    } } } };
    keepAwake(true);
    keepAwake(false);
    await flush();
    expect(calls).toEqual(["on", "off"]);
  });

  it("swallows a plugin rejection and permits a later retry", async () => {
    let fail = true, calls = 0;
    globalThis.window = { Capacitor:{ isNativePlatform:()=>true, Plugins:{ KeepAwake:{
      keepAwake:async()=>{ calls++; if(fail) throw new Error("bridge"); }, allowSleep:async()=>{},
    } } } };
    keepAwake(true);
    await flush();
    fail = false;
    keepAwake(true);
    await flush();
    expect(calls).toBe(2);
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

describe("re-engagement reminder timing", () => {
  const plan = { schedule:true, afterDays:3, hour:19, streak:5 };

  it("never fires before three full idle days and stays at 19:00 local", () => {
    for(const hour of [0, 12, 23]){
      const now = new Date(2026, 6, 15, hour, 30);
      const at = reengageFireAt(now, plan);
      expect(at.getTime() - now.getTime()).toBeGreaterThanOrEqual(72 * 3600000);
      expect(at.getHours()).toBe(19);
      expect(at.getMinutes()).toBe(0);
    }
  });

  it("schedules id 1002 at the computed time without prompting", async () => {
    const calls = mockNative("granted");
    const now = new Date(2026, 6, 15, 23, 30);
    await syncReengageReminder(plan, "title", "body", now);
    expect(calls.request).toBe(0);
    expect(calls.schedule[0].notifications[0].id).toBe(1002);
    expect(calls.schedule[0].notifications[0].schedule.at.getTime())
      .toBe(reengageFireAt(now, plan).getTime());
  });
});
