import { describe, it, expect, beforeEach, vi } from "vitest";
import { chooseTts, speak } from "../src/audio.js";
import { initAudio, audioAvailable } from "../src/audio.js";

class FakeUtterance {
  constructor(text) { this.text = text; this.lang = null; this.rate = null; this.voice = null; this.onerror = null; }
}

function makeSynth({ speaking = false, pending = false } = {}) {
  return { speaking, pending, cancel: vi.fn(), speak: vi.fn(), getVoices: () => [] };
}

beforeEach(() => {
  delete globalThis.window;
  delete globalThis.SpeechSynthesisUtterance;
});

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

describe("speak() cancel-then-speak race guard", () => {
  it("does not call speechSynthesis.cancel() when nothing is speaking or pending", () => {
    const synth = makeSynth();
    globalThis.window = { speechSynthesis: synth };
    globalThis.SpeechSynthesisUtterance = FakeUtterance;
    initAudio([]);
    speak("你好");
    expect(synth.cancel).not.toHaveBeenCalled();
  });

  it("calls speechSynthesis.cancel() when speaking", () => {
    const synth = makeSynth({ speaking: true });
    globalThis.window = { speechSynthesis: synth };
    globalThis.SpeechSynthesisUtterance = FakeUtterance;
    initAudio([]);
    speak("你好");
    expect(synth.cancel).toHaveBeenCalledTimes(1);
  });

  it("calls speechSynthesis.cancel() when pending", () => {
    const synth = makeSynth({ pending: true });
    globalThis.window = { speechSynthesis: synth };
    globalThis.SpeechSynthesisUtterance = FakeUtterance;
    initAudio([]);
    speak("你好");
    expect(synth.cancel).toHaveBeenCalledTimes(1);
  });

  it("speaks synchronously when nothing needed cancelling", () => {
    const synth = makeSynth();
    globalThis.window = { speechSynthesis: synth };
    globalThis.SpeechSynthesisUtterance = FakeUtterance;
    initAudio([]);
    speak("你好");
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });

  it("defers the follow-up speak() by a tick after a cancel", async () => {
    const synth = makeSynth({ speaking: true });
    globalThis.window = { speechSynthesis: synth };
    globalThis.SpeechSynthesisUtterance = FakeUtterance;
    initAudio([]);
    speak("你好");
    expect(synth.speak).not.toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 0));
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });
});

describe("speak() utterance error retry", () => {
  it("retries exactly once on error, then gives up silently", () => {
    const synth = makeSynth();
    globalThis.window = { speechSynthesis: synth };
    globalThis.SpeechSynthesisUtterance = FakeUtterance;
    initAudio([]);

    speak("你好");
    expect(synth.speak).toHaveBeenCalledTimes(1);
    const first = synth.speak.mock.calls[0][0];
    expect(typeof first.onerror).toBe("function");

    first.onerror(new Event("error"));
    expect(synth.speak).toHaveBeenCalledTimes(2);
    const second = synth.speak.mock.calls[1][0];
    expect(second.onerror).toBeFalsy();

    // a second error must not trigger another retry
    if (second.onerror) second.onerror(new Event("error"));
    expect(synth.speak).toHaveBeenCalledTimes(2);
  });
});
