import { describe, it, expect, beforeEach } from "vitest";
import { chooseTts } from "../src/audio.js";

beforeEach(() => { delete globalThis.window; });

describe("chooseTts", () => {
  it("returns 'native' under Capacitor", () => {
    globalThis.window = { Capacitor: { isNativePlatform: () => true, Plugins: { TextToSpeech: {} } } };
    expect(chooseTts()).toBe("native");
  });
  it("returns 'web' when speechSynthesis exists and not native", () => {
    globalThis.window = { speechSynthesis: {} };
    expect(chooseTts()).toBe("web");
  });
  it("returns 'none' when neither is available", () => {
    globalThis.window = {};
    expect(chooseTts()).toBe("none");
  });
});
