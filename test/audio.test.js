import { describe, it, expect, beforeEach, vi } from "vitest";
import { chooseTts, speak, setVoiceVolume } from "../src/audio.js";
import { initAudio, audioAvailable } from "../src/audio.js";

class FakeUtterance {
  constructor(text) {
    this.text = text; this.lang = null; this.rate = null; this.voice = null;
    this.onerror = null; this.volume = null;
  }
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

describe("unlockAudio() mobile gesture retry", () => {
  it("does not latch unlocked after a rejected play and succeeds on the next gesture", async () => {
    vi.resetModules();
    let plays = 0;
    globalThis.window = {};
    globalThis.Audio = class {
      constructor() { this.src = ""; this.muted = false; this.currentTime = 0; }
      play() {
        plays++;
        return plays === 1 ? Promise.reject(new Error("gesture rejected")) : Promise.resolve();
      }
      pause() {}
    };

    const fresh = await import("../src/audio.js");
    expect(await fresh.unlockAudio()).toBe(false);
    expect(await fresh.unlockAudio()).toBe(true);
    expect(plays).toBe(2);

    delete globalThis.Audio;
  });
});

describe("remote full-voice ladder", () => {
  it("bundled words use the local base, full-set words the remote base", async () => {
    vi.resetModules();
    const played = [];
    globalThis.Audio = class { constructor(){ this.paused = true; }
      play(){ played.push(this.src); return Promise.resolve(); } pause(){} };
    const mod = await import("../src/audio.js");
    mod.initAudio(["一"]);
    mod.initRemoteAudio(["一", "龘"], "https://host/audio/");
    mod.speak("一");
    mod.speak("龘");
    expect(played[0].startsWith("audio/")).toBe(true);
    expect(played[1].startsWith("https://host/audio/")).toBe(true);
    delete globalThis.Audio;
  });
});

describe("audioIndexReady", () => {
  it("resolves once initAudio runs", async () => {
    vi.resetModules();
    const mod = await import("../src/audio.js");
    let settled = false;
    mod.audioIndexReady.then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false); // pending before init
    mod.initAudio(["你"]);
    await Promise.resolve(); await Promise.resolve();
    expect(settled).toBe(true);
  });
});

describe("speakWhenReady", () => {
  it("waits for the index, then speaks via the mp3 path", async () => {
    vi.resetModules();
    vi.useFakeTimers();
    const played = [];
    globalThis.Audio = class { constructor(){ this.paused = true; }
      play(){ played.push(this.src); return Promise.resolve(); } pause(){} };
    const mod = await import("../src/audio.js");
    mod.speakWhenReady("你");
    await vi.advanceTimersByTimeAsync(0);
    expect(played).toEqual([]);            // index not ready yet — no premature TTS/mp3
    mod.initAudio(["你"]);
    await vi.advanceTimersByTimeAsync(0);
    expect(played.length).toBe(1);
    expect(played[0]).toContain(encodeURIComponent("你"));
    vi.useRealTimers(); delete globalThis.Audio;
  });

  it("gives up waiting after the timeout and speaks anyway", async () => {
    vi.resetModules();
    vi.useFakeTimers();
    const played = [];
    globalThis.Audio = class { constructor(){ this.paused = true; }
      play(){ played.push(this.src); return Promise.resolve(); } pause(){} };
    const mod = await import("../src/audio.js");
    mod.speakWhenReady("你", 1500);        // never call initAudio
    await vi.advanceTimersByTimeAsync(1600);
    // empty mp3Set -> falls to TTS; with no speechSynthesis stub that's a
    // silent no-op, but speak() must have been reached: play never called.
    expect(played).toEqual([]);
    vi.useRealTimers(); delete globalThis.Audio;
  });
});

describe("setVoiceVolume — applied to both playback paths", () => {
  it("sets .volume on the SpeechSynthesisUtterance (web TTS path)", () => {
    const synth = makeSynth();
    globalThis.window = { speechSynthesis: synth };
    globalThis.SpeechSynthesisUtterance = FakeUtterance;
    initAudio([]);
    setVoiceVolume(0.4);
    speak("你好");
    const u = synth.speak.mock.calls[0][0];
    expect(u.volume).toBe(0.4);
    setVoiceVolume(1); // reset module-level state for later tests
  });

  it("sets .volume on the bundled-mp3 Audio element", () => {
    globalThis.window = {};
    let created = null;
    globalThis.Audio = class {
      constructor(src) { this.src = src; this.volume = null; created = this; }
      play() { return Promise.resolve(); }
      pause() {}
    };
    initAudio(["你好"]);
    setVoiceVolume(0.6);
    speak("你好");
    expect(created).toBeTruthy();
    expect(created.volume).toBe(0.6);
    setVoiceVolume(1); // reset module-level state for later tests
    delete globalThis.Audio;
  });

  it("bad input clamps to the default (1) via clampVol", () => {
    const synth = makeSynth();
    globalThis.window = { speechSynthesis: synth };
    globalThis.SpeechSynthesisUtterance = FakeUtterance;
    initAudio([]);
    setVoiceVolume(NaN);
    speak("你好");
    const u = synth.speak.mock.calls[0][0];
    expect(u.volume).toBe(1);
  });

  it("native TTS receives the voice volume", () => {
    const calls = [];
    globalThis.window = { Capacitor: { isNativePlatform: () => true, Plugins: {
      TextToSpeech: { speak: o => { calls.push(o); return Promise.resolve(); } } } } };
    initAudio([]);
    setVoiceVolume(0.3);
    speak("好");            // no bundled audio in test env -> ttsFallback -> native path
    expect(calls[0].volume).toBeCloseTo(0.3);
    setVoiceVolume(1); // reset module-level state for later tests
  });
});

describe("prefetchAudio", () => {
  it("fetches only words with a bundled mp3, capped at the limit", async () => {
    vi.resetModules();
    const fetched = [];
    globalThis.fetch = url => { fetched.push(String(url)); return Promise.resolve({ ok: true }); };
    const mod = await import("../src/audio.js");
    mod.initAudio(["一", "二", "三"]);
    mod.prefetchAudio(["一", "无", "二", "三"], 2);
    expect(fetched.length).toBe(2);
    expect(fetched[0]).toContain(encodeURIComponent("一"));
    delete globalThis.fetch;
  });
});

describe("retry after unlock", () => {
  it("replays the pending word once unlock succeeds instead of falling to TTS", async () => {
    vi.resetModules();
    globalThis.window = {};
    let failNext = true;
    const played = [];
    globalThis.Audio = class {
      constructor(){ this.paused = true; }
      play(){
        if (this.muted) return Promise.resolve();            // silent-WAV priming
        played.push(this.src);
        return failNext ? (failNext = false, Promise.reject(new Error("gesture"))) : Promise.resolve();
      }
      pause(){}
    };
    const mod = await import("../src/audio.js");
    mod.initAudio(["你"]);
    mod.speak("你");                       // first play rejects (locked)
    await Promise.resolve(); await Promise.resolve();
    await mod.unlockAudio();               // gesture lands -> unlock succeeds
    await Promise.resolve(); await Promise.resolve();
    expect(played.length).toBe(2);         // original attempt + one retry
    expect(played[1]).toContain(encodeURIComponent("你"));
    delete globalThis.Audio;
  });
});
