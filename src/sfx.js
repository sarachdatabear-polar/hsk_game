let ctx = null;
function ac() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  return AC ? (ctx = new AC()) : null;
}
// Clamp a settings volume (0..1); anything non-finite falls back to `dflt`
// (default 1 = full volume, so a corrupt/missing stored value never goes
// silent). Shared by sfx.js's master multiplier and audio.js's voice volume.
export function clampVol(v, dflt = 1) {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.max(0, Math.min(1, n));
}
// Master SFX multiplier (settings.sfxVol, wave-2 volume controls). Applied on
// top of each pack's per-tone `vol` in the gain envelope below.
let master = 1;
export function setSfxVolume(v) { master = clampVol(v); }
function tone(freq, dur, type = "square", vol = 0.15, when = 0) {
  const a = ac(); if (!a || !sfx.enabled) return;
  const level = vol * master;
  // Fully muted: nothing to schedule. Also sidesteps WebAudio's
  // exponential-ramp-from-zero edge case (ramping FROM 0 is undefined/
  // throws in some engines) rather than relying on it degrading cleanly.
  if (level <= 0) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(level, a.currentTime + when);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + when + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + when); o.stop(a.currentTime + when + dur);
}

// Data-driven sound packs — plain data so packs are unit-testable without an
// AudioContext. kill/wrong/bite are arrays of {f,d,w,v,at} tone specs (freq,
// dur, wave, vol, when-offset; at defaults to 0). combo keeps the original
// combo-scaling formula (base = 700 + min(n,8)*60, second tone = base*mult)
// but lets each pack add a pitch offset (boff) and supply {d,w,v,at} per tone.
// `default` reproduces today's sounds exactly.
export const PACKS = {
  default: {
    kill:  [{ f: 660, d: .09, w: "square",   v: .15, at: 0   },
            { f: 880, d: .12, w: "square",   v: .15, at: .07 }],
    wrong: [{ f: 160, d: .25, w: "sawtooth", v: .18, at: 0   }],
    bite:  [{ f: 220, d: .12, w: "sawtooth", v: .2,  at: 0   },
            { f: 110, d: .3,  w: "sawtooth", v: .2,  at: .1  }],
    combo: { boff: 0, mult: 1.5,
             tones: [{ d: .08, w: "triangle", v: .12, at: 0   },
                     { d: .1,  w: "triangle", v: .12, at: .06 }] },
  },
  bells: {
    kill:  [{ f: 392, d: .35, w: "sine",     v: .12, at: 0   },
            { f: 494, d: .45, w: "triangle", v: .12, at: .08 }],
    wrong: [{ f: 175, d: .4,  w: "sine",     v: .12, at: 0   }],
    bite:  [{ f: 294, d: .4,  w: "triangle", v: .14, at: 0   },
            { f: 147, d: .6,  w: "sine",     v: .12, at: .15 }],
    combo: { boff: -250, mult: 1.5,
             tones: [{ d: .4, w: "sine",     v: .1, at: 0  },
                     { d: .5, w: "triangle", v: .1, at: .1 }] },
  },
  arcade: {
    kill:  [{ f: 1200, d: .05, w: "square", v: .18, at: 0   },
            { f: 1600, d: .07, w: "square", v: .18, at: .04 }],
    wrong: [{ f: 300, d: .08, w: "square", v: .2,  at: 0   },
            { f: 200, d: .1,  w: "square", v: .2,  at: .05 }],
    bite:  [{ f: 500, d: .06, w: "square", v: .2,  at: 0   },
            { f: 250, d: .1,  w: "square", v: .18, at: .05 }],
    combo: { boff: 150, mult: 1.5,
             tones: [{ d: .05, w: "square", v: .16, at: 0   },
                     { d: .07, w: "square", v: .16, at: .03 }] },
  },
  "lion-drum": {
    kill:  [{ f: 150, d: .18, w: "sine",     v: .22, at: 0   },
            { f: 320, d: .1,  w: "triangle", v: .16, at: .09 }],
    wrong: [{ f: 90,  d: .3,  w: "sine",     v: .2,  at: 0   }],
    bite:  [{ f: 130, d: .16, w: "sine",     v: .22, at: 0   },
            { f: 80,  d: .28, w: "sine",     v: .18, at: .1  }],
    combo: { boff: -400, mult: 1.5,
             tones: [{ d: .12, w: "sine",     v: .14, at: 0   },
                     { d: .14, w: "triangle", v: .14, at: .07 }] },
  },
};

function playSpecs(specs) { for (const s of specs) tone(s.f, s.d, s.w, s.v, s.at || 0); }

export const sfx = {
  enabled: true,
  pack: "default",
  kill()  { playSpecs((PACKS[sfx.pack] || PACKS.default).kill); },          // rising blip
  wrong() { playSpecs((PACKS[sfx.pack] || PACKS.default).wrong); },          // buzz
  bite()  { playSpecs((PACKS[sfx.pack] || PACKS.default).bite); },
  combo(n) {
    const p = (PACKS[sfx.pack] || PACKS.default).combo;
    const base = 700 + Math.min(n, 8) * 60 + p.boff;
    const freqs = [base, base * p.mult];
    p.tones.forEach((t, i) => tone(freqs[i], t.d, t.w, t.v, t.at || 0));
  },
};
