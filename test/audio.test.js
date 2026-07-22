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

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
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

  it.each(["canceled", "interrupted"])("does not retry a Web Speech '%s' interruption", (error) => {
    const synth = makeSynth();
    globalThis.window = { speechSynthesis: synth };
    globalThis.SpeechSynthesisUtterance = FakeUtterance;
    initAudio([]);

    speak("你好");
    expect(synth.speak).toHaveBeenCalledTimes(1);
    synth.speak.mock.calls[0][0].onerror({ error });
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });
});

describe("speak() request invalidation", () => {
  it("does not invoke stale TTS when an older unlocked MP3 play rejects", async () => {
    vi.resetModules();
    const synth = makeSynth();
    const attempts = [];
    globalThis.window = { speechSynthesis: synth };
    globalThis.SpeechSynthesisUtterance = FakeUtterance;
    globalThis.Audio = class {
      constructor() { this.src = ""; this.muted = false; this.currentTime = 0; this.paused = true; }
      play() {
        if (this.muted) return Promise.resolve();
        this.paused = false;
        const d = deferred();
        attempts.push({ src: this.src, ...d });
        return d.promise;
      }
      pause() { this.paused = true; }
    };

    try {
      const mod = await import("../src/audio.js");
      mod.initAudio(["旧", "新"]);
      await mod.unlockAudio();
      synth.speak.mockClear(); // ignore the silent Web Speech gesture primer

      mod.speak("旧");
      mod.speak("新");
      expect(attempts).toHaveLength(2);

      attempts[1].resolve();
      attempts[0].reject(new Error("old request rejected late"));
      await Promise.resolve(); await Promise.resolve();

      expect(synth.speak).not.toHaveBeenCalled();
      expect(attempts.map(a => a.src)).toEqual([
        expect.stringContaining(encodeURIComponent("旧")),
        expect.stringContaining(encodeURIComponent("新")),
      ]);
    } finally {
      delete globalThis.Audio;
    }
  });

  it("does not queue a stale MP3 retry when an older locked play rejects", async () => {
    vi.resetModules();
    const oldPlay = deferred();
    const played = [];
    globalThis.window = {};
    globalThis.Audio = class {
      constructor() { this.src = ""; this.muted = false; this.currentTime = 0; this.paused = true; }
      play() {
        if (this.muted) return Promise.resolve();
        this.paused = false;
        played.push(this.src);
        return this.src.includes(encodeURIComponent("旧")) ? oldPlay.promise : Promise.resolve();
      }
      pause() { this.paused = true; }
    };

    try {
      const mod = await import("../src/audio.js");
      mod.initAudio(["旧", "新"]);
      mod.speak("旧");
      mod.speak("新");
      oldPlay.reject(new Error("old request rejected late"));
      await Promise.resolve(); await Promise.resolve();

      await mod.unlockAudio();
      await Promise.resolve(); await Promise.resolve();
      expect(played).toHaveLength(2);
      expect(played[0]).toContain(encodeURIComponent("旧"));
      expect(played[1]).toContain(encodeURIComponent("新"));
    } finally {
      delete globalThis.Audio;
    }
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

  it("resetAudioUnlock makes the next gesture prime the media element again", async () => {
    vi.resetModules();
    let plays = 0;
    globalThis.window = {};
    globalThis.Audio = class {
      constructor() { this.src = ""; this.muted = false; this.currentTime = 0; }
      play() { plays++; return Promise.resolve(); }
      pause() {}
    };

    try {
      const fresh = await import("../src/audio.js");
      expect(await fresh.unlockAudio()).toBe(true);
      expect(await fresh.unlockAudio()).toBe(true);
      expect(plays).toBe(1);

      fresh.resetAudioUnlock();
      expect(await fresh.unlockAudio()).toBe(true);
      expect(plays).toBe(2);
    } finally {
      delete globalThis.Audio;
    }
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

  it("resolves remoteAudioIndexReady only when initRemoteAudio runs", async () => {
    vi.resetModules();
    const mod = await import("../src/audio.js");
    let settled = false;
    mod.remoteAudioIndexReady.then(() => { settled = true; });
    mod.initAudio([]);
    await Promise.resolve(); await Promise.resolve();
    expect(settled).toBe(false);

    mod.initRemoteAudio([], "https://host/audio/");
    await Promise.resolve(); await Promise.resolve();
    expect(settled).toBe(true);
  });
});

describe("speakWhenReady", () => {
  it("waits for the indexes, then speaks via the mp3 path", async () => {
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
    mod.initRemoteAudio([], "https://host/audio/");
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

  it("waits for both core and remote indexes before choosing the playback path", async () => {
    vi.resetModules();
    vi.useFakeTimers();
    const played = [];
    globalThis.window = {};
    globalThis.Audio = class { constructor(){ this.paused = true; }
      play(){ played.push(this.src); return Promise.resolve(); } pause(){} };

    try {
      const mod = await import("../src/audio.js");
      mod.speakWhenReady("龘", 1500);
      mod.initAudio([]);
      await vi.advanceTimersByTimeAsync(0);
      expect(played).toEqual([]);

      mod.initRemoteAudio(["龘"], "https://host/audio/");
      await vi.advanceTimersByTimeAsync(0);
      expect(played).toEqual([
        expect.stringContaining(`https://host/audio/${encodeURIComponent("龘")}.mp3`),
      ]);
    } finally {
      vi.useRealTimers();
      delete globalThis.Audio;
    }
  });
});

describe("stopAudio", () => {
  it("invalidates a delayed speakWhenReady request", async () => {
    vi.resetModules();
    vi.useFakeTimers();
    const played = [];
    globalThis.window = {};
    globalThis.Audio = class { constructor(){ this.paused = true; this.currentTime = 0; }
      play(){ played.push(this.src); return Promise.resolve(); } pause(){ this.paused = true; } };

    try {
      const mod = await import("../src/audio.js");
      mod.speakWhenReady("你", 1500);
      mod.stopAudio();
      mod.initAudio(["你"]);
      mod.initRemoteAudio(["你"], "https://host/audio/");
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(1600);
      expect(played).toEqual([]);
    } finally {
      vi.useRealTimers();
      delete globalThis.Audio;
    }
  });

  it("stops MP3, Web Speech, and native TTS playback when present", async () => {
    vi.resetModules();
    const synth = makeSynth();
    const nativeStop = vi.fn(() => Promise.resolve());
    let created;
    globalThis.window = {
      speechSynthesis: synth,
      Capacitor: {
        isNativePlatform: () => true,
        Plugins: { TextToSpeech: { stop: nativeStop } },
      },
    };
    globalThis.SpeechSynthesisUtterance = FakeUtterance;
    globalThis.Audio = class {
      constructor() {
        created = this;
        this.paused = true;
        this.currentTime = 0;
        this.pause = vi.fn(() => { this.paused = true; });
      }
      play() { this.paused = false; return Promise.resolve(); }
    };

    try {
      const mod = await import("../src/audio.js");
      mod.initAudio(["你"]);
      mod.speak("你");
      created.currentTime = 12;
      synth.cancel.mockClear();

      mod.stopAudio();
      await Promise.resolve();
      expect(created.pause).toHaveBeenCalledTimes(1);
      expect(created.currentTime).toBe(0);
      expect(synth.cancel).toHaveBeenCalledTimes(1);
      expect(nativeStop).toHaveBeenCalledTimes(1);
    } finally {
      delete globalThis.Audio;
    }
  });
});

describe("preferAmbientAudioSession", () => {
  it("sets navigator.audioSession.type to ambient when the API is available", async () => {
    vi.resetModules();
    const audioSession = { type: "auto" };
    vi.stubGlobal("navigator", { audioSession });
    try {
      const mod = await import("../src/audio.js");
      mod.preferAmbientAudioSession();
      expect(audioSession.type).toBe("ambient");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("is a no-op when navigator.audioSession is unavailable", async () => {
    vi.resetModules();
    vi.stubGlobal("navigator", {});
    try {
      const mod = await import("../src/audio.js");
      expect(() => mod.preferAmbientAudioSession()).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
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
