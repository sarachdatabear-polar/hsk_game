import { describe, it, expect, beforeEach } from "vitest";
import { chooseTts } from "../src/audio.js";
import { initAudio, audioAvailable } from "../src/audio.js";

beforeEach(() => { delete globalThis.window; });

describe("audioAvailable", () => {
  it("true for bundled mp3s, false otherwise when no TTS exists (node env)", () => {
    initAudio(["你好"]);
    expect(audioAvailable("你好")).toBe(true);
    expect(audioAvailable("没有")).toBe(false); // node: no speechSynthesis, no Capacitor
  });
});

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
