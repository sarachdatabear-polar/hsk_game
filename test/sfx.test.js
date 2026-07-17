import { describe, it, expect, vi } from "vitest";
import { PACKS, sfx, setSfxVolume, clampVol } from "../src/sfx.js";

const EVENT_ARRAYS = ["kill", "wrong", "bite"];

function checkSpec(spec) {
  expect(Number.isFinite(spec.f)).toBe(true);
  expect(spec.f).toBeGreaterThan(0);
  expect(Number.isFinite(spec.d)).toBe(true);
  expect(spec.d).toBeGreaterThan(0);
  expect(spec.v).toBeGreaterThan(0);
  expect(spec.v).toBeLessThanOrEqual(0.5);
  expect(typeof spec.w).toBe("string");
}

describe("sfx PACKS", () => {
  it("has default, bells, arcade, and lion-drum packs", () => {
    expect(Object.keys(PACKS).sort()).toEqual(["arcade", "bells", "default", "lion-drum"]);
  });

  it("every pack defines kill/wrong/bite/combo", () => {
    for (const name of Object.keys(PACKS)) {
      const pack = PACKS[name];
      for (const ev of EVENT_ARRAYS) {
        expect(Array.isArray(pack[ev])).toBe(true);
        expect(pack[ev].length).toBeGreaterThan(0);
      }
      expect(pack.combo).toBeTruthy();
      expect(Array.isArray(pack.combo.tones)).toBe(true);
      expect(pack.combo.tones.length).toBeGreaterThan(0);
    }
  });

  it("kill/wrong/bite specs have positive finite freq/dur and vol in (0, 0.5]", () => {
    for (const name of Object.keys(PACKS)) {
      const pack = PACKS[name];
      for (const ev of EVENT_ARRAYS) {
        for (const spec of pack[ev]) checkSpec(spec);
      }
    }
  });

  it("combo tones have positive finite dur and vol in (0, 0.5], and yield positive freqs for n=0..8", () => {
    for (const name of Object.keys(PACKS)) {
      const combo = PACKS[name].combo;
      for (const t of combo.tones) {
        expect(Number.isFinite(t.d)).toBe(true);
        expect(t.d).toBeGreaterThan(0);
        expect(t.v).toBeGreaterThan(0);
        expect(t.v).toBeLessThanOrEqual(0.5);
        expect(typeof t.w).toBe("string");
      }
      for (let n = 0; n <= 8; n++) {
        const base = 700 + Math.min(n, 8) * 60 + combo.boff;
        expect(base).toBeGreaterThan(0);
        expect(base * combo.mult).toBeGreaterThan(0);
      }
    }
  });

  it("default pack's kill/wrong/bite specs match today's exact values", () => {
    expect(PACKS.default.kill).toEqual([
      { f: 660, d: .09, w: "square", v: .15, at: 0 },
      { f: 880, d: .12, w: "square", v: .15, at: .07 },
    ]);
    expect(PACKS.default.wrong).toEqual([
      { f: 160, d: .25, w: "sawtooth", v: .18, at: 0 },
    ]);
    expect(PACKS.default.bite).toEqual([
      { f: 220, d: .12, w: "sawtooth", v: .2, at: 0 },
      { f: 110, d: .3, w: "sawtooth", v: .2, at: .1 },
    ]);
  });

  it("lion-drum pack has the full spec shape", () => {
    const p = PACKS["lion-drum"];
    expect(p).toBeTruthy();
    for (const k of ["kill", "wrong", "bite"]) {
      expect(Array.isArray(p[k])).toBe(true);
      for (const s of p[k]) {
        expect(typeof s.f).toBe("number");
        expect(typeof s.d).toBe("number");
        expect(typeof s.w).toBe("string");
        expect(typeof s.v).toBe("number");
      }
    }
    expect(Array.isArray(p.combo.tones)).toBe(true);
    expect(typeof p.combo.boff).toBe("number");
    expect(typeof p.combo.mult).toBe("number");
  });
});

describe("clampVol", () => {
  it("passes through in-range values", () => {
    expect(clampVol(0.5)).toBe(0.5);
    expect(clampVol(0)).toBe(0);
    expect(clampVol(1)).toBe(1);
  });
  it("clamps out-of-range values to 0..1", () => {
    expect(clampVol(-1)).toBe(0);
    expect(clampVol(2)).toBe(1);
  });
  it("bad input falls back to the default (1)", () => {
    expect(clampVol(NaN)).toBe(1);
    expect(clampVol(undefined)).toBe(1);
    expect(clampVol("nope")).toBe(1);
  });
  it("bad input falls back to a supplied default", () => {
    expect(clampVol(NaN, 0.7)).toBe(0.7);
  });
});

describe("setSfxVolume — master multiplier applied to the gain envelope", () => {
  class FakeGain {
    constructor() {
      this.gain = { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
    }
    connect() { return this; }
  }
  class FakeOsc {
    constructor() { this.frequency = { value: 0 }; }
    connect() { return this; }
    start() {}
    stop() {}
  }
  // sfx.js memoizes its AudioContext instance on first use (module-level
  // `ctx`), so a single fake instance/gains array is shared across both
  // assertions below rather than re-installed per `it` (a second install
  // would be ignored — `ac()` returns the cached ctx, not the new class).
  it("multiplies every tone's gain by the master volume set via setSfxVolume", () => {
    const gains = [];
    globalThis.window = {
      AudioContext: class {
        constructor() { this.currentTime = 0; this.destination = {}; }
        createGain() { const g = new FakeGain(); gains.push(g); return g; }
        createOscillator() { return new FakeOsc(); }
      },
    };
    sfx.enabled = true;
    sfx.pack = "default";

    setSfxVolume(1);
    sfx.kill(); // default pack's kill = two tones, both vol .15
    expect(gains.length).toBe(2);
    expect(gains[0].gain.setValueAtTime).toHaveBeenCalledWith(0.15, 0);

    setSfxVolume(0.5);
    sfx.kill();
    expect(gains.length).toBe(4);
    expect(gains[2].gain.setValueAtTime).toHaveBeenCalledWith(0.075, 0);

    // setSfxVolume(0) — fully muted: nothing new gets scheduled (also
    // sidesteps WebAudio's exponential-ramp-from-zero edge case). Same
    // cached ctx/gains array as above — sfx.js memoizes its AudioContext on
    // first use, so a later `it` couldn't install a fresh fake and observe
    // its own calls.
    setSfxVolume(0);
    sfx.kill();
    expect(gains.length).toBe(4); // unchanged — no gain nodes created

    setSfxVolume(1); // reset module-level state for any later test in this file
  });
});

describe("tone() resumes a suspended AudioContext (iOS PWA silent-session bug)", () => {
  // sfx.js memoizes its AudioContext on first use (module-level `ctx`), and
  // the tests above already triggered ac() against their own fake — so a
  // fresh module instance is required to observe a *first-ever* construction
  // landing in the "suspended" state. vi.resetModules() + a dynamic import
  // gives this test its own private copy of sfx.js, isolated from the
  // statically-imported bindings the rest of this file shares.
  it("tone() calls resume() before scheduling when the context starts suspended", async () => {
    vi.resetModules();
    let resumed = 0;
    const fakeCtx = {
      state: "suspended",
      resume: () => { resumed++; fakeCtx.state = "running"; return Promise.resolve(); },
      currentTime: 0,
      destination: {},
      createOscillator: () => ({ type: "", frequency: { value: 0 }, connect: o => o, start() {}, stop() {} }),
      createGain: () => ({ gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: o => o }),
    };
    globalThis.window = { AudioContext: function () { return fakeCtx; } };

    const fresh = await import("../src/sfx.js");
    fresh.sfx.enabled = true;
    fresh.setSfxVolume(1);
    fresh.sfx.kill();

    expect(resumed).toBe(1);
  });

  it("unlockSfx() reports failure so a later gesture can retry", async () => {
    vi.resetModules();
    let attempts = 0;
    const fakeCtx = {
      state: "suspended",
      resume: () => {
        attempts++;
        if (attempts === 1) return Promise.reject(new Error("gesture rejected"));
        fakeCtx.state = "running";
        return Promise.resolve();
      },
    };
    globalThis.window = { AudioContext: function () { return fakeCtx; } };

    const fresh = await import("../src/sfx.js");
    expect(await fresh.unlockSfx()).toBe(false);
    expect(await fresh.unlockSfx()).toBe(true);
    expect(attempts).toBe(2);
  });
});
