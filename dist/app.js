"use strict";
(() => {
  // src/pool.js
  function buildPool(levels, scope2) {
    const map = /* @__PURE__ */ new Map();
    for (const lv of scope2.levels) {
      for (const w of levels[String(lv)]) {
        const prev = map.get(w.h);
        if (!prev) {
          map.set(w.h, { ...w, fs: w.f });
        } else {
          prev.fs += w.f;
          if (w.f > prev.f) {
            prev.f = w.f;
            prev.ta = w.ta;
            prev.tt = w.tt;
          }
          if (w.lv < prev.lv) {
            prev.lv = w.lv;
            prev.p = w.p;
            prev.n = w.n;
          }
          if (!prev.t && w.t) prev.t = w.t;
          if (!prev.e && w.e) prev.e = w.e;
          prev.c = Math.max(prev.c, w.c);
        }
      }
    }
    let arr = [...map.values()];
    if (scope2.core) arr = arr.filter((w) => w.c === 1);
    if (scope2.newOnly) arr = arr.filter((w) => w.n === 1);
    arr.sort((a, b) => b.f - a.f);
    if (scope2.topN > 0) arr = arr.slice(0, scope2.topN);
    return arr;
  }
  function coveragePct(pool2, manifest, levelsSelected) {
    let denom = 0;
    for (const lv of levelsSelected) denom += manifest.levels[String(lv)].freq_total;
    if (!denom) return 0;
    const num = pool2.reduce((s, w) => s + w.fs, 0);
    return Math.min(99, Math.round(100 * num / denom));
  }
  function scopeKey(scope2) {
    return "HSK" + scope2.levels.join("+") + (scope2.core ? "\xB7HY" : "") + (scope2.newOnly ? "\xB7NEW" : "") + (scope2.topN ? "\xB7top" + scope2.topN : "");
  }
  function meaning(w, lang) {
    if (lang === "en") return { main: w.e, sub: "" };
    if (lang === "th") return w.t ? { main: w.t, sub: "" } : { main: w.e + " *", sub: "" };
    return { main: w.e, sub: w.t || "" };
  }
  function normalizeLen(v) {
    if (v === null || v === void 0 || v === "") return 20;
    const n = Math.round(Number(v));
    if (!Number.isFinite(n)) return 20;
    return Math.min(500, Math.max(5, n));
  }
  function modeKey(mode, len) {
    return mode === "round" && len !== 20 ? "round" + len : mode;
  }
  function scopeSummary(scope2) {
    const levels = [...scope2.levels].sort((a, b) => a - b);
    let levelLabel = "";
    if (levels.length === 1) {
      levelLabel = "HSK" + levels[0];
    } else if (levels.length > 1) {
      const isRun = levels.every((n, i) => i === 0 || n === levels[i - 1] + 1);
      levelLabel = isRun ? `HSK${levels[0]}\u2013${levels[levels.length - 1]}` : "HSK" + levels.join("+");
    }
    return {
      levelLabel,
      core: !!scope2.core,
      newOnly: !!scope2.newOnly,
      sessionLen: normalizeLen(scope2.sessionLen)
    };
  }

  // src/distractors.js
  function shuffle(a, rand) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  var STOPWORDS = /* @__PURE__ */ new Set([
    "to",
    "a",
    "an",
    "the",
    "of",
    "in",
    "on",
    "at",
    "for",
    "and",
    "or",
    "sth",
    "sb",
    "one's",
    "etc",
    "be",
    "is",
    "it",
    "with",
    "up",
    "out",
    "surname",
    "variant",
    "used",
    "form",
    "particle",
    "classifier",
    "prefix",
    "suffix",
    "abbr",
    "lit",
    "fig"
  ]);
  var firstSense = (s) => (s || "").split(";")[0];
  var contentTokens = (s) => firstSense(s).replace(/\([^)]*\)/g, "").toLowerCase().split(/[^a-z']+/).filter(Boolean).filter((t2) => !STOPWORDS.has(t2));
  function sameMeaning(a, b) {
    const ta = contentTokens(a);
    const tb = contentTokens(b);
    if (ta.length === 0 && tb.length === 0) {
      return firstSense(a).trim().toLowerCase() === firstSense(b).trim().toLowerCase();
    }
    return ta.some((t2) => tb.includes(t2));
  }
  function pickDistractors(pool2, target, rand = Math.random) {
    const i = pool2.findIndex((w) => w.h === target.h);
    const ok = (w) => w.h !== target.h && !sameMeaning(w.e, target.e) && !(target.t && w.t === target.t);
    let cands = pool2.slice(Math.max(0, i - 40), i + 41).filter(ok);
    if (cands.length < 3) cands = pool2.filter(ok);
    return shuffle([...cands], rand).slice(0, 3);
  }

  // src/scoring.js
  function killPoints(combo, distFrac) {
    const distBonus = Math.round(8 * Math.max(0, Math.min(1, distFrac)));
    return Math.round((10 + distBonus) * (1 + (combo - 1) * 0.1));
  }

  // src/fx.js
  function coinBurst(x, y, boss, style) {
    const count = boss ? 28 : 12;
    const coins = boss ? 12 : 5;
    const vyMax = boss ? 260 : 200;
    if (style === "sakura-fx") {
      const specs2 = [];
      for (let i = 0; i < count; i++) {
        specs2.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 280,
          // ±140, narrower than the default burst
          vy: -Math.random() * vyMax,
          life: 0.9 + Math.random() * 0.4,
          // 0.9 - 1.3, lingers a bit
          kind: "petal",
          g: 120
          // slow fall
        });
      }
      return specs2;
    }
    if (style === "firecracker-fx") {
      const extra = 6;
      const specs2 = [];
      for (let i = 0; i < count + extra; i++) {
        specs2.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 480 * 1.3,
          vy: -Math.random() * vyMax * 1.3,
          life: 0.6 + Math.random() * 0.3,
          kind: i < coins ? "cracker" : "spark"
        });
      }
      return specs2;
    }
    const specs = [];
    for (let i = 0; i < count; i++) {
      specs.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 480,
        // ±240
        vy: -Math.random() * vyMax,
        life: 0.6 + Math.random() * 0.3,
        // 0.6 - 0.9
        kind: i < coins ? "coin" : "dot"
      });
    }
    return specs;
  }
  function comboFloater(x, y, combo) {
    if (combo < 3) return null;
    return { x, y, text: `x${combo}`, life: 0.9, vy: -60 };
  }
  function fireworkRing(x, y) {
    const n = 16, speed = 170;
    const specs = [];
    for (let i = 0; i < n; i++) {
      const angle = i * (Math.PI * 2 / n);
      specs.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8,
        kind: "spark"
      });
    }
    return specs;
  }
  function feedbackEffect(kind, x, y) {
    if (kind === "wrong") return { kind: "wrong", x, y, life: 0.55, sprite: "fx-wrong", orb: "vfx-orb-red" };
    if (kind === "critical") return { kind: "critical", x, y, life: 0.75, sprite: "fx-critical", orb: "vfx-orb-gold" };
    if (kind === "streak") return { kind: "streak", x, y, life: 0.75, sprite: null, orb: "vfx-orb-blue" };
    return { kind: "correct", x, y, life: 0.6, sprite: "fx-correct", orb: "vfx-orb-green" };
  }
  function perfectBonus(score) {
    return Math.min(500, Math.round(score * 0.25));
  }

  // src/sfx.js
  var ctx = null;
  function ac() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    return AC ? ctx = new AC() : null;
  }
  function tone(freq, dur, type = "square", vol = 0.15, when = 0) {
    const a = ac();
    if (!a || !sfx.enabled) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, a.currentTime + when);
    g.gain.exponentialRampToValueAtTime(1e-3, a.currentTime + when + dur);
    o.connect(g).connect(a.destination);
    o.start(a.currentTime + when);
    o.stop(a.currentTime + when + dur);
  }
  var PACKS = {
    default: {
      kill: [
        { f: 660, d: 0.09, w: "square", v: 0.15, at: 0 },
        { f: 880, d: 0.12, w: "square", v: 0.15, at: 0.07 }
      ],
      wrong: [{ f: 160, d: 0.25, w: "sawtooth", v: 0.18, at: 0 }],
      bite: [
        { f: 220, d: 0.12, w: "sawtooth", v: 0.2, at: 0 },
        { f: 110, d: 0.3, w: "sawtooth", v: 0.2, at: 0.1 }
      ],
      combo: {
        boff: 0,
        mult: 1.5,
        tones: [
          { d: 0.08, w: "triangle", v: 0.12, at: 0 },
          { d: 0.1, w: "triangle", v: 0.12, at: 0.06 }
        ]
      }
    },
    bells: {
      kill: [
        { f: 392, d: 0.35, w: "sine", v: 0.12, at: 0 },
        { f: 494, d: 0.45, w: "triangle", v: 0.12, at: 0.08 }
      ],
      wrong: [{ f: 175, d: 0.4, w: "sine", v: 0.12, at: 0 }],
      bite: [
        { f: 294, d: 0.4, w: "triangle", v: 0.14, at: 0 },
        { f: 147, d: 0.6, w: "sine", v: 0.12, at: 0.15 }
      ],
      combo: {
        boff: -250,
        mult: 1.5,
        tones: [
          { d: 0.4, w: "sine", v: 0.1, at: 0 },
          { d: 0.5, w: "triangle", v: 0.1, at: 0.1 }
        ]
      }
    },
    arcade: {
      kill: [
        { f: 1200, d: 0.05, w: "square", v: 0.18, at: 0 },
        { f: 1600, d: 0.07, w: "square", v: 0.18, at: 0.04 }
      ],
      wrong: [
        { f: 300, d: 0.08, w: "square", v: 0.2, at: 0 },
        { f: 200, d: 0.1, w: "square", v: 0.2, at: 0.05 }
      ],
      bite: [
        { f: 500, d: 0.06, w: "square", v: 0.2, at: 0 },
        { f: 250, d: 0.1, w: "square", v: 0.18, at: 0.05 }
      ],
      combo: {
        boff: 150,
        mult: 1.5,
        tones: [
          { d: 0.05, w: "square", v: 0.16, at: 0 },
          { d: 0.07, w: "square", v: 0.16, at: 0.03 }
        ]
      }
    }
  };
  function playSpecs(specs) {
    for (const s of specs) tone(s.f, s.d, s.w, s.v, s.at || 0);
  }
  var sfx = {
    enabled: true,
    pack: "default",
    kill() {
      playSpecs((PACKS[sfx.pack] || PACKS.default).kill);
    },
    // rising blip
    wrong() {
      playSpecs((PACKS[sfx.pack] || PACKS.default).wrong);
    },
    // buzz
    bite() {
      playSpecs((PACKS[sfx.pack] || PACKS.default).bite);
    },
    combo(n) {
      const p = (PACKS[sfx.pack] || PACKS.default).combo;
      const base2 = 700 + Math.min(n, 8) * 60 + p.boff;
      const freqs = [base2, base2 * p.mult];
      p.tones.forEach((t2, i) => tone(freqs[i], t2.d, t2.w, t2.v, t2.at || 0));
    }
  };

  // src/sprites.js
  var REGISTRY = {};
  var SPRITE_NAMES = [
    "cat-walk",
    "cat-happy",
    "cat-midnight-walk",
    "cat-midnight-happy",
    "cat-sakura-walk",
    "cat-sakura-happy",
    "cat-jade-walk",
    "cat-jade-happy",
    "cat-gold-walk",
    "cat-gold-happy",
    "cat-boss-walk",
    "cat-boss-happy",
    "maneki",
    "coin",
    "bg-quest",
    "bg-battle",
    "bg-market",
    "bg-temple",
    "bg-bamboo",
    "fx-correct",
    "fx-wrong",
    "fx-critical",
    "fx-level-up",
    "vfx-orb-green",
    "vfx-orb-red",
    "vfx-orb-blue",
    "vfx-orb-gold",
    "ui-word-plaque"
  ];
  var SVG_SPRITES = /* @__PURE__ */ new Set([
    "fx-correct",
    "fx-wrong",
    "fx-critical",
    "fx-level-up",
    "vfx-orb-green",
    "vfx-orb-red",
    "vfx-orb-blue",
    "vfx-orb-gold",
    "ui-word-plaque"
  ]);
  function loadSprites() {
    for (const name of SPRITE_NAMES) {
      const img2 = new Image();
      img2.src = "assets/" + name + (SVG_SPRITES.has(name) ? ".svg" : ".png");
      REGISTRY[name] = img2;
    }
  }
  function sprite(name) {
    const img2 = REGISTRY[name];
    if (!img2) return null;
    if (!img2.complete || !img2.naturalWidth) return null;
    return img2;
  }

  // src/cat.js
  var DEFAULT_PALETTE = { body: "#e07830", head: "#f09040", ear: "#f09040", inner: "#f5a0b0", leg: "#c87340" };
  function drawCat(ctx3, x, groundY, tMs, state, palette, scale = 1, accessories = [], boss = false) {
    const pal = palette || DEFAULT_PALETTE;
    const ph = tMs / 220 % (Math.PI * 2);
    const bob = Math.sin(ph) * 2.5;
    const legSwing = Math.sin(ph) * 6;
    const happy = state === "happy";
    if (boss) {
      ctx3.fillStyle = "rgba(245,197,24,.18)";
      ctx3.beginPath();
      ctx3.arc(x, groundY - 28 * (scale / 1.5), 42 * (scale / 1.5), 0, Math.PI * 2);
      ctx3.fill();
    }
    if (scale !== 1) {
      ctx3.save();
      ctx3.translate(x, groundY);
      ctx3.scale(scale, scale);
      ctx3.translate(-x, -groundY);
    }
    let drawn = false;
    const baseSprite = boss ? "cat-boss" : pal.sprite || "cat";
    if (state === "walk") {
      let img2 = sprite(`${baseSprite}-walk`);
      let tint = "none";
      if (!img2) {
        img2 = sprite("cat-walk");
        tint = pal.filter || "none";
      }
      if (img2) {
        const frame = Math.floor(tMs / 110) % 6;
        ctx3.filter = tint;
        ctx3.drawImage(img2, frame * 256, 0, 256, 256, x - 32, groundY - 64, 64, 64);
        ctx3.filter = "none";
        drawn = true;
      }
    }
    if (!drawn && happy) {
      let img2 = sprite(`${baseSprite}-happy`);
      let tint = "none";
      if (!img2) {
        img2 = sprite("cat-happy");
        tint = pal.filter || "none";
      }
      if (img2) {
        const frame = Math.floor(tMs / 80) % 4;
        ctx3.filter = tint;
        ctx3.drawImage(img2, frame * 256, 0, 256, 256, x - 32, groundY - 64, 64, 64);
        ctx3.filter = "none";
        drawn = true;
      }
    }
    if (!drawn) {
      ctx3.save();
      ctx3.translate(x, groundY);
      if (happy) {
        ctx3.rotate(-0.25);
        ctx3.globalAlpha = 0.85;
        ctx3.fillStyle = "#f5c518";
        const sparkOffsets = [[-18, -60], [18, -60], [0, -72], [-22, -42], [22, -42]];
        for (const [sx, sy] of sparkOffsets) {
          ctx3.beginPath();
          ctx3.arc(sx, sy + bob, 2.5, 0, 7);
          ctx3.fill();
        }
      }
      ctx3.strokeStyle = pal.leg;
      ctx3.lineWidth = 6;
      ctx3.lineCap = "round";
      ctx3.beginPath();
      ctx3.moveTo(-5, -20);
      ctx3.lineTo(-5 + legSwing * 0.4, 0);
      ctx3.stroke();
      ctx3.beginPath();
      ctx3.moveTo(5, -20);
      ctx3.lineTo(5 - legSwing * 0.4, 0);
      ctx3.stroke();
      ctx3.fillStyle = pal.body;
      ctx3.fillRect(-11, -40 + bob, 22, 22);
      ctx3.strokeStyle = pal.body;
      ctx3.lineWidth = 5;
      ctx3.beginPath();
      ctx3.moveTo(-9, -34 + bob);
      ctx3.lineTo(-24, -30 + bob + legSwing * 0.3);
      ctx3.stroke();
      ctx3.beginPath();
      ctx3.moveTo(-9, -28 + bob);
      ctx3.lineTo(-22, -24 + bob - legSwing * 0.3);
      ctx3.stroke();
      ctx3.fillStyle = pal.head;
      ctx3.beginPath();
      ctx3.arc(0, -48 + bob, 10, 0, 7);
      ctx3.fill();
      ctx3.fillStyle = pal.ear;
      ctx3.beginPath();
      ctx3.moveTo(-8, -56 + bob);
      ctx3.lineTo(-13, -65 + bob);
      ctx3.lineTo(-2, -58 + bob);
      ctx3.closePath();
      ctx3.fill();
      ctx3.beginPath();
      ctx3.moveTo(8, -56 + bob);
      ctx3.lineTo(13, -65 + bob);
      ctx3.lineTo(2, -58 + bob);
      ctx3.closePath();
      ctx3.fill();
      ctx3.fillStyle = pal.inner;
      ctx3.beginPath();
      ctx3.moveTo(-7, -57 + bob);
      ctx3.lineTo(-11, -63 + bob);
      ctx3.lineTo(-3, -59 + bob);
      ctx3.closePath();
      ctx3.fill();
      ctx3.beginPath();
      ctx3.moveTo(7, -57 + bob);
      ctx3.lineTo(11, -63 + bob);
      ctx3.lineTo(3, -59 + bob);
      ctx3.closePath();
      ctx3.fill();
      ctx3.fillStyle = "#1c1008";
      ctx3.beginPath();
      ctx3.arc(-4, -50 + bob, 1.8, 0, 7);
      ctx3.fill();
      ctx3.beginPath();
      ctx3.arc(4, -50 + bob, 1.8, 0, 7);
      ctx3.fill();
      ctx3.fillStyle = "#e05a78";
      ctx3.beginPath();
      ctx3.arc(0, -47 + bob, 1.2, 0, 7);
      ctx3.fill();
      ctx3.strokeStyle = "#1c1008";
      ctx3.lineWidth = 0.8;
      ctx3.beginPath();
      ctx3.moveTo(-4, -47 + bob);
      ctx3.lineTo(-14, -45 + bob);
      ctx3.stroke();
      ctx3.beginPath();
      ctx3.moveTo(-4, -47 + bob);
      ctx3.lineTo(-14, -48 + bob);
      ctx3.stroke();
      ctx3.beginPath();
      ctx3.moveTo(4, -47 + bob);
      ctx3.lineTo(14, -45 + bob);
      ctx3.stroke();
      ctx3.beginPath();
      ctx3.moveTo(4, -47 + bob);
      ctx3.lineTo(14, -48 + bob);
      ctx3.stroke();
      ctx3.restore();
    }
    if (accessories && accessories.length) {
      drawAccessories(ctx3, x, groundY, bob, accessories, boss);
    }
    if (scale !== 1) ctx3.restore();
  }
  function roundedRect(ctx3, x, y, w, h, r) {
    ctx3.beginPath();
    ctx3.moveTo(x + r, y);
    ctx3.arcTo(x + w, y, x + w, y + h, r);
    ctx3.arcTo(x + w, y + h, x, y + h, r);
    ctx3.arcTo(x, y + h, x, y, r);
    ctx3.arcTo(x, y, x + w, y, r);
    ctx3.closePath();
  }
  function drawAccessories(ctx3, x, groundY, bob, accessories, boss) {
    const acc = new Set(accessories);
    const y = groundY;
    if (acc.has("emperor") && !boss) {
      ctx3.fillStyle = "rgba(245,197,24,.12)";
      ctx3.beginPath();
      ctx3.arc(x, y - 40, 36, 0, Math.PI * 2);
      ctx3.fill();
    }
    if (acc.has("outfit")) {
      ctx3.fillStyle = "#b3262a";
      ctx3.fillRect(x - 11, y - 40 + bob, 22, 16);
      ctx3.strokeStyle = "#f5c518";
      ctx3.lineWidth = 1.6;
      ctx3.beginPath();
      ctx3.moveTo(x - 11, y - 32 + bob);
      ctx3.lineTo(x + 11, y - 32 + bob);
      ctx3.stroke();
    }
    if (acc.has("coin")) {
      ctx3.fillStyle = "#f5c518";
      ctx3.beginPath();
      ctx3.arc(x, y - 32 + bob, 5, 0, Math.PI * 2);
      ctx3.fill();
      ctx3.strokeStyle = "#b8860b";
      ctx3.lineWidth = 1.2;
      ctx3.beginPath();
      ctx3.arc(x, y - 32 + bob, 5, 0, Math.PI * 2);
      ctx3.stroke();
    }
    if (acc.has("scarf")) {
      ctx3.fillStyle = "#d43a2f";
      roundedRect(ctx3, x - 10, y - 48 + bob, 20, 5, 2.5);
      ctx3.fill();
      ctx3.beginPath();
      ctx3.moveTo(x + 8, y - 46 + bob);
      ctx3.lineTo(x + 13, y - 40 + bob);
      ctx3.lineTo(x + 6, y - 42 + bob);
      ctx3.closePath();
      ctx3.fill();
    }
    if (acc.has("emperor")) {
      ctx3.fillStyle = "#f5c518";
      ctx3.beginPath();
      ctx3.moveTo(x - 9, y - 58 + bob);
      ctx3.lineTo(x - 6, y - 68 + bob);
      ctx3.lineTo(x - 3, y - 58 + bob);
      ctx3.closePath();
      ctx3.fill();
      ctx3.beginPath();
      ctx3.moveTo(x - 3, y - 58 + bob);
      ctx3.lineTo(x, y - 70 + bob);
      ctx3.lineTo(x + 3, y - 58 + bob);
      ctx3.closePath();
      ctx3.fill();
      ctx3.beginPath();
      ctx3.moveTo(x + 3, y - 58 + bob);
      ctx3.lineTo(x + 6, y - 68 + bob);
      ctx3.lineTo(x + 9, y - 58 + bob);
      ctx3.closePath();
      ctx3.fill();
    }
  }

  // src/raccoon.js
  var FUR = "#A39D93";
  var FUR_DARK = "#6B655D";
  var OUTFIT = "#3A3F47";
  var OUTLINE = "#846043";
  var HEADBAND = "#7A94A8";
  var HEADBAND_BOSS = "#54677A";
  var NOSE = "#E88FA0";
  var EYE_LIGHT = "#F5F1E8";
  var INK = "#3A2E1D";
  var RACCOON_HEIGHT = 74;
  function raccoonBob(tMs, state) {
    if (state === "happy") {
      const settle = Math.min(1, tMs / 600);
      const wobble = Math.sin(tMs / 90) * 1.4 * (1 - settle);
      return { bob: 8 * settle + wobble, legSwing: 0 };
    }
    if (state === "wrong") {
      const ph2 = tMs / 150 % (Math.PI * 2);
      const hop = Math.abs(Math.sin(ph2)) * 4.5;
      return { bob: -hop, legSwing: Math.sin(ph2) * 4 };
    }
    const ph = tMs / 220 % (Math.PI * 2);
    return { bob: Math.sin(ph) * 2.5, legSwing: Math.sin(ph) * 6 };
  }
  function drawRaccoon(ctx3, x, groundY, tMs, state, scale = 1, boss = false) {
    const { bob, legSwing } = raccoonBob(tMs, state);
    const happy = state === "happy";
    const wrong = state === "wrong";
    if (boss) {
      ctx3.save();
      ctx3.fillStyle = "rgba(245,197,24,.18)";
      ctx3.beginPath();
      ctx3.arc(x, groundY - 28 * (scale / 1.5), 42 * (scale / 1.5), 0, Math.PI * 2);
      ctx3.fill();
      ctx3.restore();
    }
    ctx3.save();
    if (scale !== 1) {
      ctx3.translate(x, groundY);
      ctx3.scale(scale, scale);
      ctx3.translate(-x, -groundY);
    }
    ctx3.save();
    ctx3.translate(x, groundY);
    if (happy) {
      ctx3.rotate(0.18);
    } else if (wrong) {
      ctx3.rotate(-0.08);
    }
    const headband = boss ? HEADBAND_BOSS : HEADBAND;
    ctx3.strokeStyle = FUR_DARK;
    ctx3.lineWidth = 7;
    ctx3.lineCap = "round";
    ctx3.beginPath();
    ctx3.moveTo(8, -18 + bob);
    ctx3.quadraticCurveTo(25, -34 + bob, 15, -58 + bob);
    ctx3.stroke();
    ctx3.strokeStyle = "#E4DFD4";
    ctx3.lineWidth = 2.6;
    for (const p of [[10.5, -24], [16, -34], [18.5, -45]]) {
      ctx3.beginPath();
      ctx3.moveTo(p[0] - 2.6, p[1] + 1.6 + bob);
      ctx3.lineTo(p[0] + 2.6, p[1] - 1.6 + bob);
      ctx3.stroke();
    }
    ctx3.strokeStyle = FUR_DARK;
    ctx3.lineWidth = 6;
    ctx3.lineCap = "round";
    ctx3.beginPath();
    ctx3.moveTo(-5, -20);
    ctx3.lineTo(-5 - legSwing * 0.4, 0);
    ctx3.stroke();
    ctx3.beginPath();
    ctx3.moveTo(5, -20);
    ctx3.lineTo(5 + legSwing * 0.4, 0);
    ctx3.stroke();
    ctx3.fillStyle = OUTFIT;
    ctx3.fillRect(-11, -40 + bob, 22, 22);
    ctx3.strokeStyle = OUTLINE;
    ctx3.lineWidth = 1.4;
    ctx3.strokeRect(-11, -40 + bob, 22, 22);
    ctx3.strokeStyle = OUTLINE;
    ctx3.lineWidth = 3;
    ctx3.lineCap = "round";
    ctx3.beginPath();
    ctx3.moveTo(-7, -41 + bob);
    ctx3.lineTo(9, -18 + bob);
    ctx3.stroke();
    ctx3.strokeStyle = FUR;
    ctx3.lineWidth = 5;
    ctx3.lineCap = "round";
    ctx3.beginPath();
    ctx3.moveTo(-9, -34 + bob);
    ctx3.lineTo(-15, -26 + bob + legSwing * 0.2);
    ctx3.stroke();
    ctx3.beginPath();
    ctx3.moveTo(9, -34 + bob);
    ctx3.lineTo(15, -26 + bob - legSwing * 0.2);
    ctx3.stroke();
    ctx3.fillStyle = FUR;
    ctx3.beginPath();
    ctx3.arc(0, -49 + bob, 11, 0, Math.PI * 2);
    ctx3.fill();
    ctx3.fillStyle = FUR_DARK;
    ctx3.beginPath();
    ctx3.moveTo(-9, -57 + bob);
    ctx3.lineTo(-13, -66 + bob);
    ctx3.lineTo(-3, -59 + bob);
    ctx3.closePath();
    ctx3.fill();
    ctx3.beginPath();
    ctx3.moveTo(9, -57 + bob);
    ctx3.lineTo(13, -66 + bob);
    ctx3.lineTo(3, -59 + bob);
    ctx3.closePath();
    ctx3.fill();
    ctx3.fillStyle = headband;
    ctx3.fillRect(-11, -55 + bob, 22, 5);
    ctx3.beginPath();
    ctx3.moveTo(11, -55 + bob);
    ctx3.lineTo(17, -51 + bob);
    ctx3.lineTo(11, -50 + bob);
    ctx3.closePath();
    ctx3.fill();
    ctx3.beginPath();
    ctx3.moveTo(11, -52 + bob);
    ctx3.lineTo(16, -47 + bob);
    ctx3.lineTo(10, -47 + bob);
    ctx3.closePath();
    ctx3.fill();
    ctx3.fillStyle = FUR_DARK;
    ctx3.beginPath();
    ctx3.ellipse(-4, -50 + bob, 3.6, 2.6, -0.15, 0, Math.PI * 2);
    ctx3.fill();
    ctx3.beginPath();
    ctx3.ellipse(4, -50 + bob, 3.6, 2.6, 0.15, 0, Math.PI * 2);
    ctx3.fill();
    if (happy) {
      ctx3.strokeStyle = EYE_LIGHT;
      ctx3.lineWidth = 1.4;
      ctx3.lineCap = "round";
      ctx3.beginPath();
      ctx3.arc(-4, -49 + bob, 2, Math.PI * 0.15, Math.PI * 0.85);
      ctx3.stroke();
      ctx3.beginPath();
      ctx3.arc(4, -49 + bob, 2, Math.PI * 0.15, Math.PI * 0.85);
      ctx3.stroke();
    } else {
      ctx3.fillStyle = EYE_LIGHT;
      ctx3.beginPath();
      ctx3.ellipse(-4, -50 + bob, 2, 1.5, 0, 0, Math.PI * 2);
      ctx3.fill();
      ctx3.beginPath();
      ctx3.ellipse(4, -50 + bob, 2, 1.5, 0, 0, Math.PI * 2);
      ctx3.fill();
      ctx3.fillStyle = INK;
      if (wrong) {
        ctx3.fillRect(-5.4, -50 + bob, 2.8, 1.1);
        ctx3.fillRect(2.6, -50 + bob, 2.8, 1.1);
      } else {
        ctx3.beginPath();
        ctx3.arc(-4, -50 + bob, 1, 0, Math.PI * 2);
        ctx3.fill();
        ctx3.beginPath();
        ctx3.arc(4, -50 + bob, 1, 0, Math.PI * 2);
        ctx3.fill();
      }
    }
    ctx3.fillStyle = NOSE;
    ctx3.beginPath();
    ctx3.arc(0, -46 + bob, 1.4, 0, Math.PI * 2);
    ctx3.fill();
    ctx3.restore();
    ctx3.restore();
  }
  function roundedRect2(ctx3, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx3.beginPath();
    ctx3.moveTo(x + r, y);
    ctx3.arcTo(x + w, y, x + w, y + h, r);
    ctx3.arcTo(x + w, y + h, x, y + h, r);
    ctx3.arcTo(x, y + h, x, y, r);
    ctx3.arcTo(x, y, x + w, y, r);
    ctx3.closePath();
  }
  function drawHpBar(ctx3, x, y, w, frac, scale = 1) {
    const f = Math.max(0, Math.min(1, frac));
    const h = 6 * scale;
    const bw = Math.max(1, 1.2 * scale);
    ctx3.save();
    ctx3.fillStyle = "#FBF5E8";
    roundedRect2(ctx3, x - w / 2, y, w, h, h / 2);
    ctx3.fill();
    ctx3.strokeStyle = "#846043";
    ctx3.lineWidth = bw;
    roundedRect2(ctx3, x - w / 2, y, w, h, h / 2);
    ctx3.stroke();
    if (f > 0) {
      const pad = Math.min(scale, w / 2, h / 2);
      const innerW = Math.max(0, (w - pad * 2) * f);
      const innerH = Math.max(0, h - pad * 2);
      ctx3.fillStyle = "#28723B";
      roundedRect2(ctx3, x - w / 2 + pad, y + pad, innerW, innerH, innerH / 2);
      ctx3.fill();
    }
    ctx3.restore();
  }

  // src/layout.js
  function uiScale(w, h) {
    const s = Math.min(h / 480, w / 380);
    return Math.max(0.7, Math.min(1.8, s));
  }
  function layout(w, h) {
    const S = uiScale(w, h);
    return {
      S,
      ground: 30 * S,
      mascotX: 52 * S,
      catHalf: 34 * S,
      // 60 (not 44): at a 390 CSS-px-wide viewport the battle canvas measures
      // ~366px after screen padding, giving S ~0.96 (width-bound, see uiScale) —
      // 44*0.96 ~ 42px fails the PRD §10 "Hanzi >= 56 CSS px at 390-wide" floor;
      // 60*0.96 ~ 58px clears it.
      hanziPx: 60 * S,
      pinyinPx: 18 * S,
      floaterPx: 20 * S,
      mascotPx: 48 * S,
      coinPx: 20 * S
    };
  }

  // src/nineslice.js
  function nineSliceRects(sw, sh, si, dx, dy, dw, dh, di) {
    const d = Math.min(di, dw / 2, dh / 2);
    const sxs = [0, si, sw - si];
    const sws = [si, sw - 2 * si, si];
    const dxs = [dx, dx + d, dx + dw - d];
    const dws = [d, dw - 2 * d, d];
    const sys = [0, si, sh - si];
    const shs = [si, sh - 2 * si, si];
    const dys = [dy, dy + d, dy + dh - d];
    const dhs = [d, dh - 2 * d, d];
    const rects = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        rects.push({
          sx: sxs[col],
          sy: sys[row],
          sw: sws[col],
          sh: shs[row],
          dx: dxs[col],
          dy: dys[row],
          dw: dws[col],
          dh: dhs[row]
        });
      }
    }
    return rects;
  }

  // assets/asset-manifest.json
  var asset_manifest_default = {
    project: "Lucky Cat HSK",
    milestone: "PRD v5 A2 \u2014 style-locked regeneration",
    theme: "Lucky Cat Learning Journey",
    version: 3,
    status_values: ["planned", "concept", "review", "approved", "integrated", "rejected"],
    types: ["sprite-sheet", "character", "background", "ui-surface", "icon-sprite", "effect", "decor"],
    assets: [
      { id: "cat-walk", file: "cat-walk.png", type: "sprite-sheet", status: "integrated", priority: "P0", w: 1536, h: 256, frames: 6, frameWidth: 256, frameHeight: 256, anchor: "bottom-center", fallback: "canvas:drawCat" },
      { id: "cat-happy", file: "cat-happy.png", type: "sprite-sheet", status: "integrated", priority: "P0", w: 1024, h: 256, frames: 4, frameWidth: 256, frameHeight: 256, anchor: "bottom-center", fallback: "canvas:drawCat" },
      { id: "cat-study", file: "cat-study.png", type: "character", status: "integrated", priority: "P0", w: 512, h: 512, anchor: "center", fallback: "canvas:drawCat" },
      { id: "cat-guide", file: "cat-guide.png", type: "character", status: "integrated", priority: "P1", w: 512, h: 512, anchor: "center", fallback: "canvas:drawCat" },
      { id: "cat-celebrate", file: "cat-celebrate.png", type: "character", status: "integrated", priority: "P1", w: 512, h: 512, anchor: "center", fallback: "canvas:drawCat" },
      { id: "cat-thinking", file: "cat-thinking.png", type: "character", status: "integrated", priority: "P1", w: 512, h: 512, anchor: "center", fallback: "canvas:drawCat" },
      { id: "cat-portrait", file: "cat-portrait.png", type: "character", status: "integrated", priority: "P0", w: 512, h: 512, anchor: "center", fallback: "canvas:drawCat" },
      { id: "maneki", file: "maneki.png", type: "character", status: "integrated", priority: "P1", w: 512, h: 512, anchor: "bottom-center", fallback: "canvas:maneki-vector" },
      { id: "bg-home", file: "bg-home.webp", type: "background", status: "integrated", priority: "P0", w: 1080, h: 1920, fallback: "css:#s-home" },
      { id: "bg-quest", file: "bg-quest.png", type: "background", status: "integrated", priority: "P0", w: 1024, h: 512, fallback: "css:#s-battle" },
      { id: "bg-flashcards", file: "bg-flashcards.webp", type: "background", status: "integrated", priority: "P0", w: 1080, h: 1920, fallback: "css:#s-learn" },
      { id: "bg-results", file: "bg-results.webp", type: "background", status: "integrated", priority: "P1", w: 1080, h: 1920, fallback: "css:.screen.festive" },
      { id: "bg-progress", file: "bg-progress.webp", type: "background", status: "integrated", priority: "P1", w: 1080, h: 1920, fallback: "css:#s-progress" },
      { id: "bg-collection", file: "bg-collection.webp", type: "background", status: "integrated", priority: "P2", w: 1080, h: 1920, fallback: "css:#s-shop" },
      { id: "ui-card-paper", file: "ui-card-paper.svg", type: "ui-surface", status: "integrated", priority: "P0", w: 360, h: 240, slice: [36, 36, 36, 36], scale: 2, fallback: "css:.card,.word-card,.flash-card" },
      { id: "ui-card-soft", file: "ui-card-soft.svg", type: "ui-surface", status: "integrated", priority: "P0", w: 360, h: 220, slice: [32, 32, 32, 32], scale: 2, fallback: "css:.readout" },
      { id: "ui-button-primary", file: "ui-button-primary.svg", type: "ui-surface", status: "integrated", priority: "P0", w: 380, h: 98, slice: [32, 32, 34, 32], scale: 2, fallback: "css:.big.primary" },
      { id: "ui-button-secondary", file: "ui-button-secondary.svg", type: "ui-surface", status: "integrated", priority: "P0", w: 380, h: 98, slice: [32, 32, 34, 32], scale: 2, fallback: "css:.big" },
      { id: "ui-button-neutral", file: "ui-button-neutral.svg", type: "ui-surface", status: "integrated", priority: "P0", w: 380, h: 98, slice: [32, 32, 34, 32], scale: 2, states: ["default", "disabled"], fallback: "css:#opts button" },
      { id: "ui-tab", file: "ui-tab.svg", type: "ui-surface", status: "integrated", priority: "P1", w: 180, h: 72, slice: [22, 24, 20, 24], scale: 2, fallback: "css:.chip" },
      { id: "ui-tag", file: "ui-tag.svg", type: "ui-surface", status: "integrated", priority: "P0", w: 150, h: 64, slice: [18, 18, 18, 18], scale: 2, fallback: "css:.chip.on" },
      { id: "ui-badge-mastery", file: "ui-badge-mastery.svg", type: "ui-surface", status: "approved", priority: "P1", w: 120, h: 120, slice: null, fallback: "css:.hud-round" },
      { id: "ui-progress-track", file: "ui-progress-track.svg", type: "ui-surface", status: "integrated", priority: "P0", w: 400, h: 44, slice: [22, 22, 22, 22], scale: 8, fallback: "css:.mbar" },
      { id: "ui-progress-fill", file: "ui-progress-fill.svg", type: "ui-surface", status: "integrated", priority: "P0", w: 400, h: 44, slice: [16, 16, 16, 16], scale: 8, fallback: "css:.mbar i" },
      { id: "ui-stamp-correct", file: "ui-stamp-correct.svg", type: "ui-surface", status: "approved", priority: "P1", w: 120, h: 120, slice: null, fallback: "canvas:feedbackEffect" },
      { id: "ui-divider", file: "ui-divider.svg", type: "ui-surface", status: "approved", priority: "P2", w: 240, h: 24, slice: null, fallback: "css:.sect" },
      { id: "ui-button-danger", file: "ui-button-danger.svg", type: "ui-surface", status: "integrated", priority: "P0", w: 380, h: 98, slice: [32, 32, 34, 32], scale: 2, fallback: "css:.big.danger" },
      { id: "ui-button-start", file: "ui-button-start.svg", type: "ui-surface", status: "integrated", priority: "P0", w: 380, h: 98, slice: [32, 32, 34, 32], scale: 2, fallback: "css:#go-battle" },
      { id: "ui-panel", file: "ui-panel.svg", type: "ui-surface", status: "integrated", priority: "P0", w: 560, h: 200, slice: [34, 34, 34, 34], scale: 2, fallback: "css:#quest-panel" },
      { id: "ui-icon-tile", file: "ui-icon-tile.svg", type: "ui-surface", status: "integrated", priority: "P0", w: 96, h: 96, slice: [30, 30, 30, 30], scale: 2, fallback: "css:.icon-btn" },
      { id: "ui-word-plaque", file: "ui-word-plaque.svg", type: "ui-surface", status: "integrated", priority: "P1", w: 560, h: 320, slice: null, fallback: "canvas:drawWordPlate" },
      { id: "ui-icons", file: "ui-icons.svg", type: "icon-sprite", status: "integrated", priority: "P0", w: null, h: null, fallback: "svg:inline" },
      { id: "fx-correct", file: "fx-correct.svg", type: "effect", status: "integrated", priority: "P0", w: 120, h: 120, anchor: "center", fallback: "canvas:coinBurst" },
      { id: "fx-wrong", file: "fx-wrong.svg", type: "effect", status: "integrated", priority: "P0", w: 120, h: 120, anchor: "center", fallback: "canvas:feedbackEffect" },
      { id: "fx-critical", file: "fx-critical.svg", type: "effect", status: "integrated", priority: "P0", w: 120, h: 120, anchor: "center", fallback: "canvas:feedbackEffect" },
      { id: "fx-perfect", file: "fx-perfect.svg", type: "effect", status: "approved", priority: "P0", w: 120, h: 120, anchor: "center", fallback: "canvas:perfectBonus" },
      { id: "fx-retry", file: "fx-retry.svg", type: "effect", status: "approved", priority: "P0", w: 120, h: 120, anchor: "center", fallback: "canvas:feedbackEffect" },
      { id: "fx-mastery", file: "fx-mastery.svg", type: "effect", status: "approved", priority: "P1", w: 120, h: 120, anchor: "center", fallback: "canvas:fireworkRing" },
      { id: "fx-level-up", file: "fx-level-up.svg", type: "effect", status: "integrated", priority: "P1", w: 120, h: 120, anchor: "center", fallback: "canvas:fireworkRing" },
      { id: "fx-daily-goal", file: "fx-daily-goal.svg", type: "effect", status: "approved", priority: "P1", w: 120, h: 120, anchor: "center", fallback: "canvas:comboFloater" },
      { id: "vfx-orb-green", file: "vfx-orb-green.svg", type: "effect", status: "integrated", priority: "P1", w: 220, h: 220, anchor: "center", fallback: "canvas:feedbackEffect" },
      { id: "vfx-orb-red", file: "vfx-orb-red.svg", type: "effect", status: "integrated", priority: "P1", w: 220, h: 220, anchor: "center", fallback: "canvas:feedbackEffect" },
      { id: "vfx-orb-blue", file: "vfx-orb-blue.svg", type: "effect", status: "integrated", priority: "P1", w: 220, h: 220, anchor: "center", fallback: "canvas:feedbackEffect" },
      { id: "vfx-orb-gold", file: "vfx-orb-gold.svg", type: "effect", status: "integrated", priority: "P1", w: 220, h: 220, anchor: "center", fallback: "canvas:feedbackEffect" },
      { id: "cat-midnight-walk", file: "cat-midnight-walk.png", type: "sprite-sheet", status: "integrated", priority: "P1", w: 1536, h: 256, frames: 6, frameWidth: 256, frameHeight: 256, anchor: "bottom-center", fallback: "canvas:drawCat+SKIN_PALETTES" },
      { id: "cat-midnight-happy", file: "cat-midnight-happy.png", type: "sprite-sheet", status: "integrated", priority: "P1", w: 1024, h: 256, frames: 4, frameWidth: 256, frameHeight: 256, anchor: "bottom-center", fallback: "canvas:drawCat+SKIN_PALETTES" },
      { id: "cat-sakura-walk", file: "cat-sakura-walk.png", type: "sprite-sheet", status: "integrated", priority: "P1", w: 1536, h: 256, frames: 6, frameWidth: 256, frameHeight: 256, anchor: "bottom-center", fallback: "canvas:drawCat+SKIN_PALETTES" },
      { id: "cat-sakura-happy", file: "cat-sakura-happy.png", type: "sprite-sheet", status: "integrated", priority: "P1", w: 1024, h: 256, frames: 4, frameWidth: 256, frameHeight: 256, anchor: "bottom-center", fallback: "canvas:drawCat+SKIN_PALETTES" },
      { id: "cat-jade-walk", file: "cat-jade-walk.png", type: "sprite-sheet", status: "integrated", priority: "P1", w: 1536, h: 256, frames: 6, frameWidth: 256, frameHeight: 256, anchor: "bottom-center", fallback: "canvas:drawCat+SKIN_PALETTES" },
      { id: "cat-jade-happy", file: "cat-jade-happy.png", type: "sprite-sheet", status: "integrated", priority: "P1", w: 1024, h: 256, frames: 4, frameWidth: 256, frameHeight: 256, anchor: "bottom-center", fallback: "canvas:drawCat+SKIN_PALETTES" },
      { id: "cat-gold-walk", file: "cat-gold-walk.png", type: "sprite-sheet", status: "integrated", priority: "P1", w: 1536, h: 256, frames: 6, frameWidth: 256, frameHeight: 256, anchor: "bottom-center", fallback: "canvas:drawCat+SKIN_PALETTES" },
      { id: "cat-gold-happy", file: "cat-gold-happy.png", type: "sprite-sheet", status: "integrated", priority: "P1", w: 1024, h: 256, frames: 4, frameWidth: 256, frameHeight: 256, anchor: "bottom-center", fallback: "canvas:drawCat+SKIN_PALETTES" },
      { id: "cat-boss-walk", file: "cat-boss-walk.png", type: "sprite-sheet", status: "integrated", priority: "P1", w: 1536, h: 256, frames: 6, frameWidth: 256, frameHeight: 256, anchor: "bottom-center", fallback: "canvas:drawCat+boss" },
      { id: "cat-boss-happy", file: "cat-boss-happy.png", type: "sprite-sheet", status: "integrated", priority: "P1", w: 1024, h: 256, frames: 4, frameWidth: 256, frameHeight: 256, anchor: "bottom-center", fallback: "canvas:drawCat+boss" },
      { id: "bg-battle", file: "bg-battle.png", type: "background", status: "integrated", priority: "P0", w: 1024, h: 512, fallback: "css:#cv gradient", note: "legacy night-festival art with baked-in text \u2014 P0 regeneration per GENERATION-PROMPTS-v5" },
      { id: "bg-market", file: "bg-market.png", type: "background", status: "integrated", priority: "P0", w: 1024, h: 512, fallback: "css:#cv gradient", note: "vector placeholder \u2014 regenerate per GENERATION-PROMPTS-v5" },
      { id: "bg-temple", file: "bg-temple.png", type: "background", status: "integrated", priority: "P0", w: 1024, h: 512, fallback: "css:#cv gradient", note: "vector placeholder \u2014 regenerate per GENERATION-PROMPTS-v5" },
      { id: "bg-bamboo", file: "bg-bamboo.png", type: "background", status: "integrated", priority: "P0", w: 1024, h: 512, fallback: "css:#cv gradient", note: "vector placeholder \u2014 regenerate per GENERATION-PROMPTS-v5" },
      { id: "lantern", file: "lantern.png", type: "decor", status: "integrated", priority: "P2", w: 256, h: 384, fallback: "css:none (decor)" },
      { id: "cloud", file: "cloud.png", type: "decor", status: "integrated", priority: "P2", w: 512, h: 256, fallback: "css:none (decor)" },
      { id: "coin", file: "coin.png", type: "decor", status: "integrated", priority: "P2", w: 128, h: 128, fallback: "canvas:coin-vector" },
      { id: "raccoon-walk", file: "raccoon-walk.png", type: "sprite-sheet", status: "planned", priority: "P0", w: 1536, h: 256, frames: 6, frameWidth: 256, frameHeight: 256, anchor: "bottom-center", fallback: "canvas:drawRaccoon" },
      { id: "raccoon-happy", file: "raccoon-happy.png", type: "sprite-sheet", status: "planned", priority: "P0", w: 1024, h: 256, frames: 4, frameWidth: 256, frameHeight: 256, anchor: "bottom-center", fallback: "canvas:drawRaccoon" }
    ],
    required_icons: [
      "home",
      "flashcards",
      "audio",
      "muted",
      "progress",
      "streak",
      "pencil",
      "check",
      "back",
      "close",
      "pause",
      "play",
      "learn",
      "quest",
      "review",
      "collection",
      "settings",
      "calendar",
      "focus-heart",
      "star",
      "mastery",
      "book",
      "headphones",
      "retry",
      "next",
      "previous",
      "secondary-coin",
      "street",
      "quests",
      "more"
    ],
    planned_icons: []
  };

  // src/assets.js
  var LOADABLE = /* @__PURE__ */ new Set(["approved", "integrated"]);
  var FRAME_TYPES = /* @__PURE__ */ new Set(["ui-surface", "ui-frame"]);
  function createAssets(m, opts = {}) {
    const makeImage = opts.makeImage || (() => typeof Image === "undefined" ? null : new Image());
    const rootEl = () => opts.root || (typeof document === "undefined" ? null : document.documentElement);
    const REGISTRY3 = {};
    for (const asset of m.assets) REGISTRY3[asset.id] = asset;
    const images = /* @__PURE__ */ new Map();
    const frames = /* @__PURE__ */ new Map();
    const key = (id, state) => state === "default" ? id : `${id}:${state}`;
    const stateFile = (asset, state) => state === "default" ? asset.file : asset.file.replace(/(\.png|\.svg)$/, `-${state}$1`);
    function frameShorthand(asset, state) {
      if (!Array.isArray(asset.slice) || asset.slice.length !== 4) return null;
      const scale = asset.scale || 1;
      const widths = asset.slice.map((n) => `${Math.round(n / scale)}px`).join(" ");
      return `url("assets/${stateFile(asset, state)}") ${asset.slice.join(" ")} fill / ${widths} stretch`;
    }
    function load(id, state = "default") {
      const asset = REGISTRY3[id];
      if (!asset || !/\.(png|svg)$/.test(asset.file) || !LOADABLE.has(asset.status)) return;
      if (asset.file === "ui-icons.svg") return;
      const imageKey = key(id, state);
      if (images.has(imageKey)) return;
      const image = makeImage();
      if (!image) return;
      image.onload = () => {
        if (!FRAME_TYPES.has(asset.type)) return;
        const css = frameShorthand(asset, state);
        if (!css) return;
        frames.set(imageKey, css);
        const el = rootEl();
        if (el) {
          el.style.setProperty(`--f-${imageKey.replace(":", "-")}`, css);
          if (el.classList) el.classList.add(`has-${imageKey.replace(":", "-")}`);
        }
      };
      image.src = `assets/${stateFile(asset, state)}`;
      images.set(imageKey, image);
    }
    function preload2() {
      for (const asset of m.assets) {
        if (asset.priority !== "P0") continue;
        load(asset.id);
        for (const state of asset.states || []) {
          if (state !== "default") load(asset.id, state);
        }
      }
    }
    function img2(id) {
      if (!REGISTRY3[id]) return null;
      load(id);
      const image = images.get(id);
      return image && image.complete && image.naturalWidth ? image : null;
    }
    function frameCSS2(id, state = "default") {
      return frames.get(key(id, state)) || "none";
    }
    return { REGISTRY: REGISTRY3, preload: preload2, frameCSS: frameCSS2, img: img2 };
  }
  var assets = createAssets(asset_manifest_default);
  var REGISTRY2 = assets.REGISTRY;
  var preload = assets.preload;
  var frameCSS = assets.frameCSS;
  var img = assets.img;

  // src/mastery.js
  function recordAnswer(store2, hanzi, correct, now = Date.now()) {
    const w = store2[hanzi] || (store2[hanzi] = { s: 0, k: 0, r: 0 });
    w.s++;
    if (correct) {
      w.k++;
      w.r++;
    } else {
      w.r = 0;
    }
    w.ls = now;
  }
  var wordStreak = (store2, hanzi) => store2[hanzi] ? store2[hanzi].r : 0;
  var isMastered = (store2, hanzi) => wordStreak(store2, hanzi) >= 3;
  function levelMastery(store2, levelWords) {
    let seen = 0, mastered = 0;
    for (const w of levelWords) {
      if (store2[w.h]) seen++;
      if (isMastered(store2, w.h)) mastered++;
    }
    return { seen, mastered, pct: levelWords.length ? Math.round(100 * mastered / levelWords.length) : 0 };
  }

  // src/growth.js
  function xpForLevel(n) {
    return 25 * (n - 1) * n / 2;
  }
  function levelForXp(xp2) {
    const x = Math.max(0, xp2);
    let n = Math.floor((1 + Math.sqrt(1 + 8 * x / 25)) / 2);
    if (n < 1) n = 1;
    while (xpForLevel(n + 1) <= x) n++;
    while (n > 1 && xpForLevel(n) > x) n--;
    return n;
  }
  function xpToNext(xp2) {
    const level = levelForXp(xp2);
    const base2 = xpForLevel(level);
    const need = xpForLevel(level + 1) - base2;
    return { level, into: Math.max(0, xp2) - base2, need };
  }
  var MILESTONES = [
    { lv: 5, id: "scarf", name: "Red scarf" },
    { lv: 10, id: "coin", name: "Gold coin charm" },
    { lv: 20, id: "outfit", name: "Chinese outfit" },
    { lv: 30, id: "kitten", name: "Kitten follower" },
    { lv: 50, id: "emperor", name: "Emperor crown" }
  ];
  function accessoriesFor(level) {
    return MILESTONES.filter((m) => m.lv <= level).map((m) => m.id);
  }
  function nextMilestone(level) {
    return MILESTONES.find((m) => m.lv > level) || null;
  }

  // src/srs.js
  var DAY = 864e5;
  function dueInterval(streak) {
    if (streak >= 6) return 14 * DAY;
    if (streak === 5) return 7 * DAY;
    if (streak === 4) return 3 * DAY;
    return DAY;
  }
  var seenOf = (rec) => rec && rec.s || 0;
  var streakOf = (rec) => rec && rec.r || 0;
  var isWeak = (rec) => !!rec && streakOf(rec) <= 1 && seenOf(rec) >= 2;
  var isMasteredRec = (rec) => streakOf(rec) >= 3;
  var isDue = (rec, now) => isMasteredRec(rec) && (rec.ls == null || now - rec.ls >= dueInterval(rec.r));
  function wordWeight(rec, now = Date.now()) {
    if (!rec) return 1;
    if (isWeak(rec)) return 3;
    if (isMasteredRec(rec)) return isDue(rec, now) ? 2 : 0.3;
    return 1;
  }
  function weakWords(store2, pool2) {
    return pool2.filter((w) => isWeak(store2[w.h])).sort((a, b) => {
      const ra = store2[a.h], rb = store2[b.h];
      const ratioA = ra.s ? ra.k / ra.s : 0, ratioB = rb.s ? rb.k / rb.s : 0;
      return ratioA !== ratioB ? ratioA - ratioB : rb.s - ra.s;
    });
  }
  function dueWords(store2, pool2, now = Date.now()) {
    return pool2.filter((w) => isDue(store2[w.h], now));
  }
  function smartDeck(store2, pool2, now = Date.now()) {
    const weak = weakWords(store2, pool2);
    const seen = new Set(weak.map((w) => w.h));
    const deck = weak.slice();
    for (const w of dueWords(store2, pool2, now)) {
      if (!seen.has(w.h)) {
        seen.add(w.h);
        deck.push(w);
      }
    }
    return deck;
  }

  // src/daily.js
  var GOAL = 20;
  var DAY_MS = 864e5;
  function defaultDaily() {
    return { last: "", streak: 0, today: { date: "", resolved: 0 } };
  }
  function isYesterday(a, b) {
    if (!a || !b) return false;
    const da = /* @__PURE__ */ new Date(a + "T00:00:00Z");
    const db = /* @__PURE__ */ new Date(b + "T00:00:00Z");
    if (isNaN(da) || isNaN(db)) return false;
    return db.getTime() - da.getTime() === DAY_MS;
  }
  function noteActivity(daily2, dateStr, count) {
    const before = daily2.today.date === dateStr ? daily2.today.resolved : 0;
    const resolved = before + count;
    const today = { date: dateStr, resolved };
    let { last, streak } = daily2;
    const crossedNow = before < GOAL && resolved >= GOAL;
    if (crossedNow && last !== dateStr) {
      streak = isYesterday(last, dateStr) ? streak + 1 : 1;
      last = dateStr;
    }
    return { last, streak, today };
  }
  function streakInfo(daily2, dateStr) {
    const todayResolved = daily2.today.date === dateStr ? daily2.today.resolved : 0;
    const chainAlive = daily2.last === dateStr || isYesterday(daily2.last, dateStr);
    return {
      streak: chainAlive ? daily2.streak : 0,
      todayResolved,
      goal: GOAL,
      goalMet: todayResolved >= GOAL
    };
  }

  // src/quests.js
  var QUEST_POOL = [
    { id: "correct30", desc: "Answer 30 words correctly", target: 30, reward: 150 },
    { id: "combo5", desc: "Reach a \xD75 learning streak", target: 5, reward: 100 },
    { id: "boss1", desc: "Complete a Review Challenge", target: 1, reward: 150 },
    { id: "perfect1", desc: "Finish a round with no misses", target: 1, reward: 250 },
    { id: "review1", desc: "Play a Smart Review round", target: 1, reward: 100 },
    { id: "learn20", desc: "Mark 20 flashcards as known", target: 20, reward: 100 }
  ];
  var EVENT_QUEST = {
    correct: "correct30",
    combo: "combo5",
    boss: "boss1",
    perfect: "perfect1",
    review: "review1",
    learn: "learn20"
  };
  var HIGH_WATER = /* @__PURE__ */ new Set(["combo5"]);
  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = h * 31 + s.charCodeAt(i) | 0;
    return Math.abs(h);
  }
  var STEPS = [1, 2, 4, 5];
  function questsForDate(dateStr) {
    const n = QUEST_POOL.length;
    const h = hashStr(dateStr);
    const start = h % n;
    const step = STEPS[Math.floor(h / n) % STEPS.length];
    const idxs = [];
    let cur = start;
    for (let i = 0; i < 3; i++) {
      idxs.push(cur);
      cur = (cur + step) % n;
    }
    return idxs.map((i) => QUEST_POOL[i]);
  }
  function defaultQuestState() {
    return { date: "", progress: {}, done: [] };
  }
  function noteQuestEvent(state, dateStr, eventId, n = 1) {
    const rollover = state.date !== dateStr;
    let progress = rollover ? {} : { ...state.progress };
    let done = rollover ? [] : state.done.slice();
    let earned = 0;
    const completed = [];
    const questId = EVENT_QUEST[eventId];
    const quest = questId && questsForDate(dateStr).find((q) => q.id === questId);
    if (quest) {
      const before = progress[quest.id] || 0;
      const raw = HIGH_WATER.has(quest.id) ? Math.max(before, n) : before + n;
      progress[quest.id] = Math.min(raw, quest.target);
      if (progress[quest.id] >= quest.target && !done.includes(quest.id)) {
        done.push(quest.id);
        earned += quest.reward;
        completed.push(quest);
      }
    }
    return { state: { date: dateStr, progress, done }, earned, completed };
  }
  function questStatus(state, dateStr) {
    const sameDay = state.date === dateStr;
    return questsForDate(dateStr).map((q) => ({
      ...q,
      progress: sameDay ? state.progress[q.id] || 0 : 0,
      done: sameDay ? state.done.includes(q.id) : false
    }));
  }

  // src/boss.js
  var BOSS_EVERY = 10;
  var bossSpeedFactor = 0.85;
  function isBossSpawn(spawnIndex) {
    return spawnIndex > 0 && spawnIndex % BOSS_EVERY === 0;
  }
  function bossPoints(basePoints) {
    return basePoints * 5;
  }

  // src/native.js
  function isNative() {
    return !!(typeof window !== "undefined" && window.Capacitor && typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform());
  }
  function plugins() {
    return typeof window !== "undefined" && window.Capacitor && window.Capacitor.Plugins || {};
  }
  function nextBackScreen(currentScreen2) {
    return currentScreen2 === "home" ? null : "home";
  }
  function hapticKill() {
    if (isNative()) plugins().Haptics?.impact({ style: "LIGHT" });
  }
  function hapticWrong() {
    if (isNative()) plugins().Haptics?.impact({ style: "MEDIUM" });
  }
  var awakeOn = false;
  function keepAwake(on) {
    if (!isNative() || on === awakeOn) return;
    awakeOn = on;
    const ka = plugins().KeepAwake;
    if (ka) on ? ka.keepAwake() : ka.allowSleep();
  }
  function initNative({ getScreen, goHome }) {
    if (typeof window === "undefined" || !window.Capacitor) return;
    let tries = 0;
    const tick = () => {
      const P = plugins();
      if (isNative() && P.App && typeof P.App.addListener === "function") {
        P.StatusBar?.setBackgroundColor({ color: "#141a14" });
        P.StatusBar?.setStyle({ style: "DARK" });
        P.App.addListener("backButton", () => {
          const dest = nextBackScreen(getScreen());
          if (dest === null) P.App.exitApp();
          else goHome();
        });
        return;
      }
      if (++tries < 25) setTimeout(tick, 100);
    };
    tick();
  }

  // src/audio.js
  var mp3Set = /* @__PURE__ */ new Set();
  var base = "audio/";
  var zhVoice = null;
  var current = null;
  function initAudio(indexArray, baseUrl = "audio/") {
    mp3Set = new Set(indexArray || []);
    base = baseUrl;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const pick = () => {
        const vs = speechSynthesis.getVoices();
        zhVoice = vs.find((v) => /zh[-_]CN/i.test(v.lang)) || vs.find((v) => /^zh/i.test(v.lang)) || null;
      };
      pick();
      speechSynthesis.onvoiceschanged = pick;
    }
  }
  function chooseTts() {
    if (isNative() && window.Capacitor.Plugins && window.Capacitor.Plugins.TextToSpeech) return "native";
    if (typeof window !== "undefined" && window.speechSynthesis) return "web";
    return "none";
  }
  function speak(hanzi) {
    if (!hanzi) return;
    if (current) {
      current.pause();
      current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) speechSynthesis.cancel();
    if (mp3Set.has(hanzi)) {
      current = new Audio(base + encodeURIComponent(hanzi) + ".mp3");
      current.play().catch(() => ttsFallback(hanzi));
      return;
    }
    ttsFallback(hanzi);
  }
  function ttsFallback(hanzi) {
    const mode = chooseTts();
    if (mode === "native") {
      window.Capacitor.Plugins.TextToSpeech.speak({ text: hanzi, lang: "zh-CN", rate: 1 }).catch(() => {
      });
    } else if (mode === "web") {
      const u = new SpeechSynthesisUtterance(hanzi);
      u.lang = "zh-CN";
      u.rate = 0.85;
      if (zhVoice) u.voice = zhVoice;
      speechSynthesis.speak(u);
    }
  }

  // src/shop.js
  var CATALOG = [
    { id: "midnight", name: "Midnight", price: 500, type: "skin" },
    { id: "sakura", name: "Sakura", price: 1500, type: "skin" },
    { id: "jade", name: "Jade", price: 2500, type: "skin" },
    { id: "gold", name: "Gold", price: 5e3, type: "skin" },
    { id: "market", name: "Night Market", price: 1e3, type: "backdrop" },
    { id: "temple", name: "Temple Dawn", price: 2e3, type: "backdrop" },
    { id: "bamboo", name: "Bamboo", price: 3e3, type: "backdrop" },
    { id: "sakura-fx", name: "Sakura Petals", price: 2e3, type: "effect" },
    { id: "firecracker-fx", name: "Firecrackers", price: 3500, type: "effect" },
    { id: "bells", name: "Temple Bells", price: 2500, type: "soundpack" },
    { id: "arcade", name: "Arcade", price: 4e3, type: "soundpack" },
    { id: "red-lantern", name: "Red Lantern", price: 800, type: "deco" },
    { id: "noodle-stall", name: "Noodle Stall", price: 1500, type: "deco" },
    { id: "tea-sign", name: "Tea Sign", price: 2200, type: "deco" },
    { id: "foo-dog", name: "Foo Dog", price: 3e3, type: "deco" },
    { id: "golden-arch", name: "Golden Arch", price: 5e3, type: "deco" }
  ];
  var SKIN_PALETTES = {
    midnight: {
      sprite: "cat-midnight",
      body: "#2a2a30",
      head: "#35353c",
      ear: "#35353c",
      inner: "#6a6a78",
      leg: "#1c1c22",
      filter: "grayscale(1) brightness(.5)"
    },
    sakura: {
      sprite: "cat-sakura",
      body: "#f6c6d8",
      head: "#fbdce8",
      ear: "#fbdce8",
      inner: "#e8608a",
      leg: "#e0a0b8",
      filter: "hue-rotate(300deg) saturate(.75) brightness(1.15)"
    },
    jade: {
      sprite: "cat-jade",
      body: "#2f9e5a",
      head: "#3fbf70",
      ear: "#3fbf70",
      inner: "#eec94a",
      leg: "#1f7040",
      filter: "hue-rotate(85deg) saturate(.8)"
    },
    gold: {
      sprite: "cat-gold",
      body: "#e3a80e",
      head: "#ffd75e",
      ear: "#ffd75e",
      inner: "#fff4e0",
      leg: "#9c6b00",
      filter: "saturate(1.6) brightness(1.25) contrast(1.05)"
    }
  };
  function byId(id) {
    return CATALOG.find((it) => it.id === id);
  }
  function defaultShop() {
    return { owned: [], skin: "", backdrop: "", effect: "", soundpack: "" };
  }
  function canAfford(wallet2, id) {
    const item = byId(id);
    return !!item && wallet2 >= item.price;
  }
  function buy(wallet2, shop, id) {
    const item = byId(id);
    if (!item) return { ok: false, wallet: wallet2, shop };
    if (shop.owned.includes(id)) return { ok: false, wallet: wallet2, shop };
    if (wallet2 < item.price) return { ok: false, wallet: wallet2, shop };
    return {
      ok: true,
      wallet: wallet2 - item.price,
      shop: { ...shop, owned: [...shop.owned, id] }
    };
  }
  function equipItem(shop, id, type) {
    if (!id) return type === "skin" || type === "backdrop" || type === "effect" || type === "soundpack" ? { ...shop, [type]: "" } : shop;
    const item = byId(id);
    if (!item || !shop.owned.includes(id)) return shop;
    if (item.type === "deco") return shop;
    return { ...shop, [item.type]: id };
  }

  // src/street.js
  var BUILDINGS = [
    { lv: 5, id: "lantern-post", name: "Lantern Post" },
    { lv: 10, id: "coin-bank", name: "Coin Bank" },
    { lv: 20, id: "tailor", name: "Tailor Shop" },
    { lv: 30, id: "kitten-cafe", name: "Kitten Caf\xE9" },
    { lv: 50, id: "emperor-gate", name: "Emperor's Gate" }
  ];
  var DECO_IDS = ["red-lantern", "noodle-stall", "tea-sign", "foo-dog", "golden-arch"];
  var BUILDING_SLOTS = [0.18, 0.34, 0.5, 0.66, 0.82];
  var DECO_SLOTS = [0.1, 0.26, 0.42, 0.58, 0.74];
  function streetPieces(level, owned) {
    const pieces = [];
    BUILDINGS.forEach((b, i) => {
      if (level >= b.lv) pieces.push({ id: b.id, kind: "building", slot: BUILDING_SLOTS[i] });
    });
    DECO_IDS.forEach((id, i) => {
      if (owned.includes(id)) pieces.push({ id, kind: "deco", slot: DECO_SLOTS[i] });
    });
    return pieces.sort((a, b) => a.slot - b.slot);
  }
  function streetProgress(level) {
    const total = BUILDINGS.length;
    const unlocked = BUILDINGS.filter((b) => b.lv <= level).length;
    const nextB = BUILDINGS.find((b) => b.lv > level) || null;
    const next = nextB ? { lv: nextB.lv, name: nextB.name } : null;
    return { unlocked, total, next };
  }

  // src/icons.js
  var ICON_HREF = "assets/ui-icons.svg";
  function iconSvg(id) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("asset-icon");
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", `${ICON_HREF}#${id}`);
    svg.appendChild(use);
    return svg;
  }
  function setIconLabel(el, icon, label) {
    el.replaceChildren();
    const wrap = document.createElement("span");
    wrap.className = "icon-text";
    if (icon) wrap.appendChild(iconSvg(icon));
    const text = document.createElement("span");
    text.textContent = label;
    wrap.appendChild(text);
    el.appendChild(wrap);
  }
  function setPill(el, icon, text) {
    el.replaceChildren(iconSvg(icon), document.createTextNode(` ${text}`));
  }

  // src/i18n.js
  var STRINGS = {
    en: {
      // home
      "home.smart": "Smart Review",
      "home.flashcards": "Flashcards",
      "home.shop": "Shop",
      "home.best": "Best Sessions",
      "home.progress": "Progress",
      "home.howto": "How to play",
      "home.sound": "Sound effects",
      "home.settings": "Settings",
      "home.streakTitle": "Study Streak",
      "home.streakDays": "{n} days",
      "home.start": "START",
      "home.startHint": "Need at least 8 words in scope to start \u2014 widen it below.",
      "home.scopeWords": "{n} words",
      // bottom nav (M2)
      "nav.home": "Home",
      "nav.street": "Street",
      "nav.progress": "Progress",
      "nav.quests": "Quests",
      "nav.more": "More",
      "street.title": "Lucky Cat Street",
      "quests.title": "Daily Quests",
      // scope
      "scope.title": "Choose your words",
      "scope.levels": "Levels",
      "scope.filters": "Filters",
      "scope.highYield": "High-yield only",
      "scope.newOnly": "New words only",
      "scope.topN": "Top-N by frequency",
      "scope.all": "All",
      "scope.meaningLang": "Meaning language",
      "scope.english": "English",
      "scope.both": "Both",
      "scope.sessionLen": "Session length",
      "scope.custom": "Custom",
      "scope.customPh": "5\u2013500",
      "scope.endless": "Endless",
      "scope.cards": "Cards",
      "scope.wordQuest": "Word Quest \xB7 {n}",
      "scope.smartReview": "Smart Review",
      "scope.smartReviewProgress": "Smart Review \xB7 {have}/8",
      "scope.smartReviewReady": "Smart Review \xB7 {n}",
      "scope.readout": "Pool: <b>{count}</b> words \xB7 ~<b>{pct}%</b> of exam text",
      "scope.readoutNoThai": "* {n} long-tail words have no Thai yet \u2014 English shown instead.",
      // learn / flashcards
      "learn.exit": "Exit",
      "learn.stillLearning": "Still learning",
      "learn.knowIt": "Know it",
      "learn.count": "{done} done \xB7 {left} left",
      // results
      "results.roundOver": "Round over",
      "results.missed": "Words you missed",
      "results.reviewWords": "Review Words",
      "results.practiceMissed": "Practice Missed Words",
      "results.playAgain": "Play again",
      "results.home": "Home",
      "results.banked": "+{score} coins banked \xB7 total {total}",
      "results.perfect": "Perfect round! +{bonus} coin bonus",
      "results.levelUp": "Level up! Lv {lv}",
      "results.levelUpUnlocked": "Level up! Lv {lv} \u2014 unlocked: {items}",
      "results.sub": "{acc}% accuracy \xB7 {words} words \xB7 {key}",
      "results.bestTag": "Best session!",
      "results.bestPrev": "best {prev}",
      "results.questComplete": "Quest complete: {desc} +{reward} coins",
      // quests (keyed by quest id from quests.js QUEST_POOL)
      "quest.status.done": "Done",
      "quest.status.open": "Open",
      "quest.reward": "+{reward} coins",
      "quest.correct30": "Answer 30 words correctly",
      "quest.combo5": "Reach a \xD75 learning streak",
      "quest.boss1": "Complete a Review Challenge",
      "quest.perfect1": "Finish a round with no misses",
      "quest.review1": "Play a Smart Review round",
      "quest.learn20": "Mark 20 flashcards as known",
      // scores / progress
      "scores.title": "Best Sessions",
      "scores.empty": "No sessions yet \u2014 complete a Word Quest.",
      "progress.title": "Progress",
      "progress.needsWork": "Needs work",
      "progress.reviewThese": "Review these",
      "progress.practiceThese": "Practice These",
      "progress.nothing": "Nothing needs work \u2014 go play!",
      // shop / collection
      "shop.title": "Collection",
      "shop.skins": "Cat skins",
      "shop.backdrops": "Quest backdrops",
      "shop.effects": "Effects",
      "shop.sounds": "Sounds",
      "shop.street": "Street decorations",
      "shop.wallet": "Wallet: <b>{coins}</b> coins",
      "shop.buy": "Buy",
      "shop.equip": "Equip",
      "shop.equipped": "Equipped",
      "shop.onStreet": "On street",
      "shop.coins": "{coins} coins",
      // howto
      "howto.title": "How to play",
      "howto.oneShot": "You get one shot per word.",
      // battle HUD + pause overlay (M4)
      "battle.round": "Round {label}",
      "battle.pause": "Pause",
      "battle.paused": "Paused",
      "battle.resume": "Resume",
      "battle.quit": "Quit",
      "battle.wordAudio": "Word audio",
      "battle.pinyin": "Pinyin",
      "battle.on": "On",
      "battle.off": "Off",
      "battle.canvasLabel": "Battle scene. Press Enter or Space to replay the word's audio.",
      "battle.bossPrompt": "Review Challenge \xB7 pick the hanzi for: {meaning}",
      // common
      "common.back": "\u2190 Home",
      "common.backMore": "\u2190 More",
      "common.language": "Language"
    },
    th: {
      // home
      "home.smart": "\u0E17\u0E1A\u0E17\u0E27\u0E19\u0E2D\u0E31\u0E08\u0E09\u0E23\u0E34\u0E22\u0E30",
      "home.flashcards": "\u0E1A\u0E31\u0E15\u0E23\u0E04\u0E33",
      "home.shop": "\u0E23\u0E49\u0E32\u0E19\u0E04\u0E49\u0E32",
      "home.best": "\u0E2A\u0E16\u0E34\u0E15\u0E34\u0E14\u0E35\u0E17\u0E35\u0E48\u0E2A\u0E38\u0E14",
      "home.progress": "\u0E04\u0E27\u0E32\u0E21\u0E04\u0E37\u0E1A\u0E2B\u0E19\u0E49\u0E32",
      "home.howto": "\u0E27\u0E34\u0E18\u0E35\u0E40\u0E25\u0E48\u0E19",
      "home.sound": "\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E1B\u0E23\u0E30\u0E01\u0E2D\u0E1A",
      "home.settings": "\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32",
      "home.streakTitle": "\u0E40\u0E23\u0E35\u0E22\u0E19\u0E15\u0E48\u0E2D\u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07",
      "home.streakDays": "{n} \u0E27\u0E31\u0E19",
      "home.start": "\u0E40\u0E23\u0E34\u0E48\u0E21",
      "home.startHint": "\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E04\u0E33\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 8 \u0E04\u0E33\u0E43\u0E19\u0E02\u0E2D\u0E1A\u0E40\u0E02\u0E15\u0E08\u0E36\u0E07\u0E08\u0E30\u0E40\u0E23\u0E34\u0E48\u0E21\u0E44\u0E14\u0E49 \u2014 \u0E02\u0E22\u0E32\u0E22\u0E02\u0E2D\u0E1A\u0E40\u0E02\u0E15\u0E14\u0E49\u0E32\u0E19\u0E25\u0E48\u0E32\u0E07",
      "home.scopeWords": "{n} \u0E04\u0E33",
      // bottom nav (M2)
      "nav.home": "\u0E2B\u0E19\u0E49\u0E32\u0E2B\u0E25\u0E31\u0E01",
      "nav.street": "\u0E16\u0E19\u0E19",
      "nav.progress": "\u0E04\u0E27\u0E32\u0E21\u0E04\u0E37\u0E1A\u0E2B\u0E19\u0E49\u0E32",
      "nav.quests": "\u0E40\u0E04\u0E27\u0E2A\u0E15\u0E4C",
      "nav.more": "\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E15\u0E34\u0E21",
      "street.title": "\u0E16\u0E19\u0E19\u0E19\u0E33\u0E42\u0E0A\u0E04",
      "quests.title": "\u0E40\u0E04\u0E27\u0E2A\u0E15\u0E4C\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E27\u0E31\u0E19",
      // scope
      "scope.title": "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E04\u0E33\u0E28\u0E31\u0E1E\u0E17\u0E4C",
      "scope.levels": "\u0E23\u0E30\u0E14\u0E31\u0E1A",
      "scope.filters": "\u0E15\u0E31\u0E27\u0E01\u0E23\u0E2D\u0E07",
      "scope.highYield": "\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E04\u0E33\u0E2D\u0E2D\u0E01\u0E1A\u0E48\u0E2D\u0E22",
      "scope.newOnly": "\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E04\u0E33\u0E43\u0E2B\u0E21\u0E48",
      "scope.topN": "\u0E08\u0E31\u0E14\u0E2D\u0E31\u0E19\u0E14\u0E31\u0E1A\u0E15\u0E32\u0E21\u0E04\u0E27\u0E32\u0E21\u0E16\u0E35\u0E48",
      "scope.all": "\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14",
      "scope.meaningLang": "\u0E20\u0E32\u0E29\u0E32\u0E02\u0E2D\u0E07\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E21\u0E32\u0E22",
      "scope.english": "\u0E2D\u0E31\u0E07\u0E01\u0E24\u0E29",
      "scope.both": "\u0E17\u0E31\u0E49\u0E07\u0E2A\u0E2D\u0E07",
      "scope.sessionLen": "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E04\u0E33\u0E15\u0E48\u0E2D\u0E23\u0E2D\u0E1A",
      "scope.custom": "\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E40\u0E2D\u0E07",
      "scope.customPh": "5\u2013500",
      "scope.endless": "\u0E44\u0E21\u0E48\u0E08\u0E33\u0E01\u0E31\u0E14",
      "scope.cards": "\u0E1A\u0E31\u0E15\u0E23\u0E04\u0E33",
      "scope.wordQuest": "\u0E40\u0E04\u0E27\u0E2A\u0E15\u0E4C\u0E04\u0E33\u0E28\u0E31\u0E1E\u0E17\u0E4C \xB7 {n}",
      "scope.smartReview": "\u0E17\u0E1A\u0E17\u0E27\u0E19\u0E2D\u0E31\u0E08\u0E09\u0E23\u0E34\u0E22\u0E30",
      "scope.smartReviewProgress": "\u0E17\u0E1A\u0E17\u0E27\u0E19\u0E2D\u0E31\u0E08\u0E09\u0E23\u0E34\u0E22\u0E30 \xB7 {have}/8",
      "scope.smartReviewReady": "\u0E17\u0E1A\u0E17\u0E27\u0E19\u0E2D\u0E31\u0E08\u0E09\u0E23\u0E34\u0E22\u0E30 \xB7 {n}",
      "scope.readout": "\u0E04\u0E25\u0E31\u0E07\u0E04\u0E33: <b>{count}</b> \u0E04\u0E33 \xB7 ~<b>{pct}%</b> \u0E02\u0E2D\u0E07\u0E02\u0E49\u0E2D\u0E2A\u0E2D\u0E1A",
      "scope.readoutNoThai": "* \u0E21\u0E35 {n} \u0E04\u0E33\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22 \u2014 \u0E41\u0E2A\u0E14\u0E07\u0E20\u0E32\u0E29\u0E32\u0E2D\u0E31\u0E07\u0E01\u0E24\u0E29\u0E41\u0E17\u0E19",
      // learn / flashcards
      "learn.exit": "\u0E2D\u0E2D\u0E01",
      "learn.stillLearning": "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E41\u0E21\u0E48\u0E19",
      "learn.knowIt": "\u0E23\u0E39\u0E49\u0E41\u0E25\u0E49\u0E27",
      "learn.count": "\u0E17\u0E33\u0E41\u0E25\u0E49\u0E27 {done} \xB7 \u0E40\u0E2B\u0E25\u0E37\u0E2D {left}",
      // results
      "results.roundOver": "\u0E08\u0E1A\u0E23\u0E2D\u0E1A",
      "results.missed": "\u0E04\u0E33\u0E17\u0E35\u0E48\u0E15\u0E2D\u0E1A\u0E1C\u0E34\u0E14",
      "results.reviewWords": "\u0E17\u0E1A\u0E17\u0E27\u0E19\u0E04\u0E33",
      "results.practiceMissed": "\u0E1D\u0E36\u0E01\u0E04\u0E33\u0E17\u0E35\u0E48\u0E1C\u0E34\u0E14",
      "results.playAgain": "\u0E40\u0E25\u0E48\u0E19\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07",
      "results.home": "\u0E2B\u0E19\u0E49\u0E32\u0E2B\u0E25\u0E31\u0E01",
      "results.banked": "+{score} \u0E40\u0E2B\u0E23\u0E35\u0E22\u0E0D \xB7 \u0E23\u0E27\u0E21 {total}",
      "results.perfect": "\u0E23\u0E2D\u0E1A\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C\u0E41\u0E1A\u0E1A! \u0E42\u0E1A\u0E19\u0E31\u0E2A +{bonus} \u0E40\u0E2B\u0E23\u0E35\u0E22\u0E0D",
      "results.levelUp": "\u0E40\u0E25\u0E37\u0E48\u0E2D\u0E19\u0E23\u0E30\u0E14\u0E31\u0E1A! Lv {lv}",
      "results.levelUpUnlocked": "\u0E40\u0E25\u0E37\u0E48\u0E2D\u0E19\u0E23\u0E30\u0E14\u0E31\u0E1A! Lv {lv} \u2014 \u0E1B\u0E25\u0E14\u0E25\u0E47\u0E2D\u0E01: {items}",
      "results.sub": "\u0E41\u0E21\u0E48\u0E19\u0E22\u0E33 {acc}% \xB7 {words} \u0E04\u0E33 \xB7 {key}",
      "results.bestTag": "\u0E2A\u0E16\u0E34\u0E15\u0E34\u0E43\u0E2B\u0E21\u0E48!",
      "results.bestPrev": "\u0E14\u0E35\u0E17\u0E35\u0E48\u0E2A\u0E38\u0E14 {prev}",
      "results.questComplete": "\u0E40\u0E04\u0E27\u0E2A\u0E15\u0E4C\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08: {desc} +{reward} \u0E40\u0E2B\u0E23\u0E35\u0E22\u0E0D",
      // quests
      "quest.status.done": "\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08",
      "quest.status.open": "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E40\u0E2A\u0E23\u0E47\u0E08",
      "quest.reward": "+{reward} \u0E40\u0E2B\u0E23\u0E35\u0E22\u0E0D",
      "quest.correct30": "\u0E15\u0E2D\u0E1A\u0E16\u0E39\u0E01 30 \u0E04\u0E33",
      "quest.combo5": "\u0E17\u0E33\u0E04\u0E2D\u0E21\u0E42\u0E1A\u0E40\u0E23\u0E35\u0E22\u0E19\u0E23\u0E39\u0E49 \xD75",
      "quest.boss1": "\u0E1C\u0E48\u0E32\u0E19\u0E14\u0E48\u0E32\u0E19\u0E17\u0E1A\u0E17\u0E27\u0E19",
      "quest.perfect1": "\u0E08\u0E1A\u0E23\u0E2D\u0E1A\u0E42\u0E14\u0E22\u0E44\u0E21\u0E48\u0E15\u0E2D\u0E1A\u0E1C\u0E34\u0E14",
      "quest.review1": "\u0E40\u0E25\u0E48\u0E19\u0E23\u0E2D\u0E1A\u0E17\u0E1A\u0E17\u0E27\u0E19\u0E2D\u0E31\u0E08\u0E09\u0E23\u0E34\u0E22\u0E30",
      "quest.learn20": "\u0E17\u0E33\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E2B\u0E21\u0E32\u0E22\u0E23\u0E39\u0E49\u0E41\u0E25\u0E49\u0E27 20 \u0E1A\u0E31\u0E15\u0E23",
      // scores / progress
      "scores.title": "\u0E2A\u0E16\u0E34\u0E15\u0E34\u0E14\u0E35\u0E17\u0E35\u0E48\u0E2A\u0E38\u0E14",
      "scores.empty": "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E16\u0E34\u0E15\u0E34 \u2014 \u0E40\u0E25\u0E48\u0E19\u0E40\u0E04\u0E27\u0E2A\u0E15\u0E4C\u0E04\u0E33\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E01\u0E48\u0E2D\u0E19",
      "progress.title": "\u0E04\u0E27\u0E32\u0E21\u0E04\u0E37\u0E1A\u0E2B\u0E19\u0E49\u0E32",
      "progress.needsWork": "\u0E15\u0E49\u0E2D\u0E07\u0E1D\u0E36\u0E01\u0E40\u0E1E\u0E34\u0E48\u0E21",
      "progress.reviewThese": "\u0E17\u0E1A\u0E17\u0E27\u0E19\u0E04\u0E33\u0E40\u0E2B\u0E25\u0E48\u0E32\u0E19\u0E35\u0E49",
      "progress.practiceThese": "\u0E1D\u0E36\u0E01\u0E04\u0E33\u0E40\u0E2B\u0E25\u0E48\u0E32\u0E19\u0E35\u0E49",
      "progress.nothing": "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E04\u0E33\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E1D\u0E36\u0E01 \u2014 \u0E44\u0E1B\u0E40\u0E25\u0E48\u0E19\u0E01\u0E31\u0E19\u0E40\u0E25\u0E22!",
      // shop / collection
      "shop.title": "\u0E04\u0E2D\u0E25\u0E40\u0E25\u0E01\u0E0A\u0E31\u0E19",
      "shop.skins": "\u0E2A\u0E01\u0E34\u0E19\u0E41\u0E21\u0E27",
      "shop.backdrops": "\u0E09\u0E32\u0E01\u0E2B\u0E25\u0E31\u0E07",
      "shop.effects": "\u0E40\u0E2D\u0E1F\u0E40\u0E1F\u0E01\u0E15\u0E4C",
      "shop.sounds": "\u0E40\u0E2A\u0E35\u0E22\u0E07",
      "shop.street": "\u0E02\u0E2D\u0E07\u0E15\u0E01\u0E41\u0E15\u0E48\u0E07\u0E16\u0E19\u0E19",
      "shop.wallet": "\u0E01\u0E23\u0E30\u0E40\u0E1B\u0E4B\u0E32\u0E40\u0E07\u0E34\u0E19: <b>{coins}</b> \u0E40\u0E2B\u0E23\u0E35\u0E22\u0E0D",
      "shop.buy": "\u0E0B\u0E37\u0E49\u0E2D",
      "shop.equip": "\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19",
      "shop.equipped": "\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E2D\u0E22\u0E39\u0E48",
      "shop.onStreet": "\u0E2D\u0E22\u0E39\u0E48\u0E1A\u0E19\u0E16\u0E19\u0E19",
      "shop.coins": "{coins} \u0E40\u0E2B\u0E23\u0E35\u0E22\u0E0D",
      // howto
      "howto.title": "\u0E27\u0E34\u0E18\u0E35\u0E40\u0E25\u0E48\u0E19",
      "howto.oneShot": "\u0E15\u0E2D\u0E1A\u0E44\u0E14\u0E49\u0E04\u0E23\u0E31\u0E49\u0E07\u0E40\u0E14\u0E35\u0E22\u0E27\u0E15\u0E48\u0E2D\u0E04\u0E33",
      // battle HUD + pause overlay (M4)
      "battle.round": "\u0E23\u0E2D\u0E1A {label}",
      "battle.pause": "\u0E2B\u0E22\u0E38\u0E14\u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27",
      "battle.paused": "\u0E2B\u0E22\u0E38\u0E14\u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27",
      "battle.resume": "\u0E40\u0E25\u0E48\u0E19\u0E15\u0E48\u0E2D",
      "battle.quit": "\u0E2D\u0E2D\u0E01",
      "battle.wordAudio": "\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E04\u0E33\u0E28\u0E31\u0E1E\u0E17\u0E4C",
      "battle.pinyin": "\u0E1E\u0E34\u0E19\u0E2D\u0E34\u0E19",
      "battle.on": "\u0E40\u0E1B\u0E34\u0E14",
      "battle.off": "\u0E1B\u0E34\u0E14",
      "battle.canvasLabel": "\u0E09\u0E32\u0E01\u0E15\u0E48\u0E2D\u0E2A\u0E39\u0E49 \u0E01\u0E14 Enter \u0E2B\u0E23\u0E37\u0E2D Space \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E1F\u0E31\u0E07\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E04\u0E33\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07",
      "battle.bossPrompt": "\u0E14\u0E48\u0E32\u0E19\u0E17\u0E1A\u0E17\u0E27\u0E19 \xB7 \u0E40\u0E25\u0E37\u0E2D\u0E01\u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23\u0E08\u0E35\u0E19\u0E02\u0E2D\u0E07\u0E04\u0E33\u0E27\u0E48\u0E32: {meaning}",
      // common
      "common.back": "\u2190 \u0E2B\u0E19\u0E49\u0E32\u0E2B\u0E25\u0E31\u0E01",
      "common.backMore": "\u2190 \u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E15\u0E34\u0E21",
      "common.language": "\u0E20\u0E32\u0E29\u0E32"
    }
  };
  var locale = "en";
  function detectLocale(nav = typeof navigator !== "undefined" ? navigator : {}) {
    return /^th/i.test(nav && nav.language ? nav.language : "") ? "th" : "en";
  }
  function setLocale(l) {
    if (STRINGS[l]) locale = l;
  }
  function getLocale() {
    return locale;
  }
  function t(key, params) {
    const table = STRINGS[locale] || STRINGS.en;
    let s = key in table ? table[key] : key in STRINGS.en ? STRINGS.en[key] : key;
    if (params) for (const k in params) s = s.split(`{${k}}`).join(String(params[k]));
    return s;
  }

  // src/fonts.js
  var HANZI_STACK = "'LC Hanzi','Noto Serif SC','Segoe UI',serif";
  var LATIN_STACK = "'LC Latin','LC Thai','Segoe UI',sans-serif";
  function fontString(weight, px, stack) {
    return `${weight} ${Math.round(px)}px ${stack}`;
  }

  // src/nav.js
  var TABS = ["home", "street", "progress", "quests", "more"];
  var MORE_SUBSCREENS = ["scores", "howto"];
  var NAV_VISIBLE = /* @__PURE__ */ new Set([...TABS, ...MORE_SUBSCREENS, "shop"]);
  function navVisibleOn(screen) {
    return NAV_VISIBLE.has(screen);
  }
  function activeTabFor(screen) {
    if (!navVisibleOn(screen)) return null;
    if (TABS.includes(screen)) return screen;
    if (MORE_SUBSCREENS.includes(screen)) return "more";
    if (screen === "shop") return "home";
    return null;
  }

  // src/hud.js
  function roundLabel(mode, spawned, total) {
    if (mode === "endless") {
      return `${Math.max(0, spawned)} \xB7 \u221E`;
    }
    const current2 = Math.min(Math.max(1, spawned), total);
    return `${current2}/${total}`;
  }
  function comboMultiplier(combo) {
    return combo >= 2 ? `x${combo}` : "";
  }
  function comboFires(combo) {
    return Math.max(0, Math.min(6, combo));
  }

  // src/main.js
  var D = window.HSK_DATA;
  var $ = (s) => document.querySelector(s);
  var REDUCED_MOTION = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function fxDuration(ms) {
    return REDUCED_MOTION ? Math.round(ms / 2) : ms;
  }
  function fxUntil(ms) {
    return performance.now() + fxDuration(ms);
  }
  var store = {
    get(k, d) {
      try {
        const v = localStorage.getItem("nbhsk." + k);
        return v === null ? d : JSON.parse(v);
      } catch (e) {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem("nbhsk." + k, JSON.stringify(v));
      } catch (e) {
      }
    }
  };
  var scope = Object.assign(
    { levels: [3], core: false, newOnly: false, topN: 0, lang: "both", sessionLen: 20 },
    store.get("scope", {})
  );
  var settings = Object.assign({ autoSpeak: true, showPinyin: true }, store.get("settings", {}));
  setLocale(store.get("locale", detectLocale()));
  sfx.enabled = store.get("sfx", true);
  var pool = [];
  var learnDeck = null;
  var lenCustomOpen = false;
  var battleDeckOverride = null;
  var lastMode = "round";
  var masteryStore = store.get("mastery", {});
  function noteAnswer(hanzi, correct) {
    recordAnswer(masteryStore, hanzi, correct);
    store.set("mastery", masteryStore);
  }
  var wallet = store.get("wallet", 0);
  var shopState = Object.assign(defaultShop(), store.get("shop", {}));
  function updateWalletChip() {
    setPill($("#home-wallet"), "secondary-coin", wallet.toLocaleString());
  }
  var xp = store.get("xp", 0);
  function updateLevelChip() {
    const el = $("#home-level");
    if (!el) return;
    const lv = levelForXp(xp);
    const prog = xpToNext(xp);
    const pct = prog.need ? Math.round(100 * prog.into / prog.need) : 100;
    const txt = el.querySelector(".level-text");
    const bar = el.querySelector(".xp-bar i");
    if (txt) txt.textContent = `Lv ${lv}`;
    if (bar) bar.style.width = pct + "%";
  }
  function addXp(n) {
    const before = levelForXp(xp);
    xp += n;
    store.set("xp", xp);
    const after = levelForXp(xp);
    if (after > before && B.on) {
      B.levelUps = (B.levelUps || []).concat({ from: before, to: after });
      const acc = accessoriesFor(after);
      B.acc = acc.filter((id) => id !== "kitten");
      B.hasKitten = acc.includes("kitten");
    }
    if (after > before) renderStreet();
    updateLevelChip();
  }
  var todayStr = () => {
    const d = /* @__PURE__ */ new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0"), dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  };
  var daily = Object.assign(defaultDaily(), store.get("daily", {}));
  daily.today = Object.assign({ date: "", resolved: 0 }, daily.today);
  function updateStreakChip() {
    const el = $("#home-streak");
    if (!el) return;
    const info = streakInfo(daily, todayStr());
    const title = el.querySelector(".streak-title");
    const count = el.querySelector(".streak-count");
    const bar = el.querySelector(".streak-bar i");
    if (title) title.textContent = t("home.streakTitle");
    if (count) count.textContent = t("home.streakDays", { n: info.streak });
    if (bar) bar.style.width = Math.min(100, Math.round(100 * info.todayResolved / info.goal)) + "%";
    el.classList.toggle("goal-met", info.goalMet);
  }
  function noteDaily(count) {
    daily = noteActivity(daily, todayStr(), count);
    store.set("daily", daily);
    updateStreakChip();
  }
  var questState = Object.assign(defaultQuestState(), store.get("quests", {}));
  var questToasts = [];
  function questEvent(eventId, n = 1) {
    const r = noteQuestEvent(questState, todayStr(), eventId, n);
    questState = r.state;
    store.set("quests", questState);
    if (r.earned > 0) {
      wallet += r.earned;
      store.set("wallet", wallet);
      updateWalletChip();
    }
    if (r.completed.length) questToasts.push(...r.completed);
    renderQuests();
  }
  function renderQuests() {
    const panel = $("#quest-panel");
    if (!panel) return;
    panel.innerHTML = "";
    for (const q of questStatus(questState, todayStr())) {
      const row = document.createElement("div");
      row.className = "quest-row" + (q.done ? " done" : "");
      row.innerHTML = `<span class="qi">${q.done ? t("quest.status.done") : t("quest.status.open")}</span>
      <span class="qd">${t("quest." + q.id)}</span>
      <span class="qp">${q.progress}/${q.target}</span>
      <span class="qr">${t("quest.reward", { reward: q.reward })}</span>`;
      panel.appendChild(row);
    }
  }
  function updateSmartBtn() {
    const deck = smartDeck(masteryStore, pool, Date.now());
    const btn = $("#go-smart");
    btn.disabled = deck.length < 8;
    setIconLabel(btn, "target", !deck.length ? t("scope.smartReview") : deck.length < 8 ? t("scope.smartReviewProgress", { have: deck.length }) : t("scope.smartReviewReady", { n: deck.length }));
  }
  $("#go-smart").onclick = () => {
    const deck = smartDeck(masteryStore, pool, Date.now());
    if (deck.length < 8) return;
    battleDeckOverride = deck;
    questEvent("review");
    startBattle("round");
  };
  function scopeChipLabel() {
    const s = scopeSummary(scope);
    const bits = [s.levelLabel];
    if (s.core) bits.push(t("scope.highYield"));
    if (s.newOnly) bits.push(t("scope.newOnly"));
    bits.push(t("home.scopeWords", { n: s.sessionLen }));
    return bits.join(" \xB7 ");
  }
  function renderHome() {
    updateLevelChip();
    updateWalletChip();
    updateStreakChip();
    updateSmartBtn();
    const startable = pool.length >= 8;
    const startBtn = $("#home-start");
    const hint = $("#home-start-hint");
    if (startBtn) startBtn.disabled = !startable;
    if (hint) hint.hidden = startable;
    const chip = $("#home-scope-chip");
    if (chip) chip.textContent = scopeChipLabel();
  }
  $("#home-start").onclick = () => {
    if (pool.length >= 8) startBattle("round");
  };
  function shuffle2(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  fetch("audio/index.json").then((r) => r.json()).then((ix) => initAudio(ix)).catch(() => initAudio([]));
  loadSprites();
  preload();
  if (document.fonts && document.fonts.load) {
    document.fonts.load("900 40px 'LC Hanzi'").catch(() => {
    });
  }
  function applyStaticI18n(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    root.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const v = t(el.getAttribute("data-i18n-title"));
      el.title = v;
      el.setAttribute("aria-label", v);
    });
    root.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph")));
    });
    document.documentElement.lang = getLocale();
  }
  var currentScreen = "home";
  function updateNav(name) {
    const nav = $("#bottom-nav");
    if (!nav) return;
    const visible = navVisibleOn(name);
    nav.style.display = visible ? "flex" : "none";
    const active = activeTabFor(name);
    nav.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === active));
  }
  function show(name) {
    currentScreen = name;
    document.querySelectorAll(".screen").forEach((el) => el.classList.remove("on"));
    $("#s-" + name).classList.add("on");
    updateNav(name);
    if (name === "home") {
      renderHome();
    }
    if (name === "street") {
      renderStreet();
    }
    if (name === "quests") {
      renderQuests();
    }
  }
  document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => {
    const t2 = b.dataset.go;
    if (t2 === "scope") {
      renderScope();
      show("scope");
    } else if (t2 === "scope-learn") {
      renderScope();
      show("scope");
    } else if (t2 === "scores") {
      renderScores();
      show("scores");
    } else if (t2 === "progress") {
      renderProgress();
      show("progress");
    } else if (t2 === "shop") {
      renderShop();
      show("shop");
    } else {
      if (t2 === "home") {
        stopBattle();
      }
      show(t2);
    }
  }));
  function renderScope() {
    const lvBox = $("#lv-chips");
    lvBox.innerHTML = "";
    for (let n = 1; n <= 6; n++) {
      const b = document.createElement("button");
      b.className = "chip" + (scope.levels.includes(n) ? " on" : "");
      b.textContent = "HSK" + n;
      b.onclick = () => {
        const i = scope.levels.indexOf(n);
        if (i >= 0) {
          if (scope.levels.length > 1) scope.levels.splice(i, 1);
        } else scope.levels.push(n);
        scope.levels.sort();
        renderScope();
      };
      lvBox.appendChild(b);
    }
    $("#f-core").classList.toggle("on", scope.core);
    $("#f-new").classList.toggle("on", scope.newOnly);
    document.querySelectorAll("#topn-chips .chip").forEach((c) => c.classList.toggle("on", +c.dataset.n === scope.topN));
    document.querySelectorAll("#lang-chips .chip").forEach((c) => c.classList.toggle("on", c.dataset.lang === scope.lang));
    pool = buildPool(D.levels, scope);
    const noThai = pool.filter((w) => !w.t).length;
    $("#readout").innerHTML = t("scope.readout", { count: pool.length.toLocaleString(), pct: coveragePct(pool, D.manifest, scope.levels) }) + (scope.lang !== "en" && noThai ? `<div class="warn">${t("scope.readoutNoThai", { n: noThai.toLocaleString() })}</div>` : "");
    const len = normalizeLen(scope.sessionLen);
    scope.sessionLen = len;
    if (![20, 40, 100].includes(len)) lenCustomOpen = true;
    document.querySelectorAll("#len-chips .chip").forEach((c) => {
      const on = c.dataset.len === "custom" ? lenCustomOpen : !lenCustomOpen && +c.dataset.len === len;
      c.classList.toggle("on", on);
    });
    const lenInput = $("#len-custom");
    lenInput.hidden = !lenCustomOpen;
    if (lenCustomOpen && document.activeElement !== lenInput) lenInput.value = len;
    setIconLabel($("#go-battle"), "quest", t("scope.wordQuest", { n: len }));
    store.set("scope", scope);
    const startable = pool.length >= 8;
    $("#go-battle").disabled = $("#go-endless").disabled = $("#go-learn").disabled = !startable;
    updateSmartBtn();
  }
  $("#f-core").onclick = () => {
    scope.core = !scope.core;
    renderScope();
  };
  $("#f-new").onclick = () => {
    scope.newOnly = !scope.newOnly;
    renderScope();
  };
  document.querySelectorAll("#topn-chips .chip").forEach((c) => c.onclick = () => {
    scope.topN = +c.dataset.n;
    renderScope();
  });
  document.querySelectorAll("#lang-chips .chip").forEach((c) => c.onclick = () => {
    scope.lang = c.dataset.lang;
    renderScope();
  });
  function setUiLocale(l) {
    setLocale(l);
    store.set("locale", getLocale());
    applyStaticI18n();
    syncUiLangChips();
    renderScope();
  }
  function syncUiLangChips() {
    document.querySelectorAll("#ui-lang-chips .chip").forEach((c) => c.classList.toggle("on", c.dataset.uilang === getLocale()));
  }
  document.querySelectorAll("#ui-lang-chips .chip").forEach((c) => c.onclick = () => setUiLocale(c.dataset.uilang));
  document.querySelectorAll("#len-chips .chip").forEach((c) => c.onclick = () => {
    if (c.dataset.len === "custom") {
      lenCustomOpen = true;
      renderScope();
      $("#len-custom").focus();
    } else {
      lenCustomOpen = false;
      scope.sessionLen = +c.dataset.len;
      renderScope();
    }
  });
  $("#len-custom").addEventListener("input", () => {
    scope.sessionLen = normalizeLen($("#len-custom").value);
    store.set("scope", scope);
    setIconLabel($("#go-battle"), "quest", t("scope.wordQuest", { n: scope.sessionLen }));
  });
  $("#len-custom").addEventListener("change", () => renderScope());
  document.querySelectorAll("#preset-chips .chip").forEach((c) => c.onclick = () => {
    scope.levels = c.dataset.preset.split(",").map(Number);
    renderScope();
  });
  $("#go-battle").onclick = () => startBattle("round");
  $("#go-endless").onclick = () => startBattle("endless");
  $("#go-learn").onclick = () => {
    learnDeck = null;
    startLearn();
  };
  var fc = { deck: [], i: 0, flipped: false, done: 0, total: 0 };
  function startLearn() {
    const src = learnDeck && learnDeck.length ? learnDeck : pool;
    fc.fromMisses = !!(learnDeck && learnDeck.length);
    fc.deck = shuffle2(src.slice(0, 400));
    fc.i = 0;
    fc.done = 0;
    fc.total = fc.deck.length;
    fc.flipped = false;
    show("learn");
    renderCard();
  }
  function endLearn() {
    show(fc.fromMisses ? "results" : "home");
  }
  function renderCard() {
    const w = fc.deck[fc.i];
    if (!w) {
      endLearn();
      return;
    }
    $("#fc-count").textContent = t("learn.count", { done: fc.done, left: fc.deck.length - fc.i });
    const c = $("#fc-card");
    if (!fc.flipped) {
      c.innerHTML = `<div class="hz">${w.h}</div><div class="py">${w.p}</div>
      <div class="hint">tap to flip \xB7 HSK${w.lv} \xB7 in ${w.ta}/${w.tt} papers</div>`;
      if (settings.autoSpeak) speak(w.h);
    } else {
      const th = w.t ? `<div class="th">${w.t}</div>` : `<div class="th" style="color:var(--muted)">no Thai yet</div>`;
      c.innerHTML = `<div class="hz" style="font-size:40px">${w.h}</div><div class="py">${w.p}</div>
      <div class="mean">${w.e}${th}</div><div class="hint">tap to flip back</div>`;
    }
  }
  $("#fc-card").onclick = () => {
    fc.flipped = !fc.flipped;
    renderCard();
  };
  $("#fc-spk").onclick = (e) => {
    e.stopPropagation();
    const w = fc.deck[fc.i];
    if (w) speak(w.h);
  };
  function nextCard(keep) {
    const w = fc.deck[fc.i];
    noteAnswer(w.h, !keep);
    if (keep) fc.deck.push(w);
    else {
      fc.done++;
      noteDaily(1);
      questEvent("learn");
      addXp(1);
    }
    fc.i++;
    fc.flipped = false;
    if (fc.i >= fc.deck.length) {
      endLearn();
      return;
    }
    renderCard();
  }
  $("#fc-know").onclick = () => nextCard(false);
  $("#fc-again").onclick = () => nextCard(true);
  var cv = $("#cv");
  var ctx2 = cv.getContext("2d");
  var B = { on: false };
  function sizeCanvas() {
    const w = cv.clientWidth, h = cv.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    B.w = w;
    B.h = h;
    B.S = uiScale(w, h);
    B.L = layout(w, h);
    if (B.speedBase) B.speed = B.speedBase * (B.w / 380);
  }
  var cvRO = new ResizeObserver(() => {
    if (B.on) sizeCanvas();
  });
  cvRO.observe(cv);
  window.addEventListener("resize", () => {
    if (B.on) sizeCanvas();
  });
  function replayCurrentWord() {
    if (B.paused || !B.zombie) return;
    speak(B.zombie.w.h);
  }
  cv.addEventListener("click", (e) => {
    const r = B.plaqueRect;
    if (!r) return;
    const box = cv.getBoundingClientRect();
    const x = e.clientX - box.left, y = e.clientY - box.top;
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) replayCurrentWord();
  });
  cv.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
    e.preventDefault();
    replayCurrentWord();
  });
  function pickWord() {
    const deck = B.deck;
    const now = Date.now();
    const weight = (w) => (Math.sqrt(w.f) + 1) * wordWeight(masteryStore[w.h], now);
    for (let tries = 0; tries < 40; tries++) {
      let total = 0;
      for (const w of deck) total += weight(w);
      let r = Math.random() * total;
      for (const w of deck) {
        r -= weight(w);
        if (r <= 0) {
          if (!B.recent.includes(w.h)) {
            B.recent.push(w.h);
            if (B.recent.length > 8) B.recent.shift();
            return w;
          }
          break;
        }
      }
    }
    return deck[Math.floor(Math.random() * deck.length)];
  }
  function startBattle(mode) {
    lastMode = mode;
    B.on = true;
    B.mode = mode;
    B.deck = battleDeckOverride && battleDeckOverride.length >= 2 ? battleDeckOverride : pool;
    B.customDeck = !!(battleDeckOverride && battleDeckOverride.length >= 2);
    battleDeckOverride = null;
    B.zombie = null;
    B.proj = null;
    B.parts = [];
    B.flash = 0;
    B.screenShake = 0;
    B.feedback = null;
    B.floats = [];
    B.mascotHopUntil = 0;
    B.score = 0;
    B.combo = 0;
    B.lives = 3;
    B.wordsTotal = mode === "round" ? normalizeLen(scope.sessionLen) : Infinity;
    B.spawned = 0;
    B.resolved = 0;
    B.correct = 0;
    B.attempts = 0;
    B.recent = [];
    B.misses = [];
    B.missSet = /* @__PURE__ */ new Set();
    B.nextAt = 0;
    B.lastT = 0;
    B.locked = false;
    B.bossStageAt = 0;
    B.paused = false;
    B.pausedAt = 0;
    $("#pause-overlay").classList.remove("on");
    questToasts = [];
    B.levelUps = [];
    const acc0 = accessoriesFor(levelForXp(xp));
    B.acc = acc0.filter((id) => id !== "kitten");
    B.hasKitten = acc0.includes("kitten");
    const avg = scope.levels.reduce((a, b) => a + b, 0) / scope.levels.length;
    B.speedBase = 30 * (1 + (avg - 1) * 0.1);
    show("battle");
    keepAwake(true);
    sizeCanvas();
    updateHud();
    $("#opts").innerHTML = "";
    requestAnimationFrame(loop);
  }
  function stopBattle() {
    B.on = false;
    keepAwake(false);
    if (window.speechSynthesis) speechSynthesis.cancel();
  }
  function syncSoundToggles() {
    $("#more-sound").classList.toggle("muted", !sfx.enabled);
  }
  function toggleSfx() {
    sfx.enabled = !sfx.enabled;
    store.set("sfx", sfx.enabled);
    syncSoundToggles();
    updateHud();
  }
  $("#more-sound").addEventListener("click", toggleSfx);
  syncSoundToggles();
  function updateHud() {
    if (!B.on) return;
    const lives = $("#hud-lives");
    lives.replaceChildren();
    for (let i = 0; i < 3; i++) {
      const h = iconSvg("heart");
      h.classList.add("life-icon", i < B.lives ? "full" : "empty");
      lives.appendChild(h);
    }
    $("#hud-score").textContent = B.score;
    $("#hud-round").textContent = t("battle.round", { label: roundLabel(B.mode, B.spawned, B.wordsTotal) });
    updateComboStrip();
  }
  function updateComboStrip() {
    const strip = $("#combo-strip");
    if (!strip) return;
    const show2 = B.combo >= 2;
    strip.classList.toggle("hidden", !show2);
    if (!show2) return;
    $("#combo-count").textContent = B.combo;
    $("#combo-badge").textContent = comboMultiplier(B.combo);
    const lit = comboFires(B.combo);
    const fires = $("#combo-fires");
    fires.replaceChildren();
    for (let i = 0; i < 6; i++) {
      const f = iconSvg("streak");
      f.classList.add("combo-fire", i < lit ? "lit" : "unlit");
      fires.appendChild(f);
    }
  }
  var PAUSE_TOGGLES = [
    { icon: "bell", iconOff: "bell-off", labelKey: "home.sound", isOn: () => sfx.enabled, toggle: () => toggleSfx() },
    {
      icon: "sound",
      iconOff: "muted",
      labelKey: "battle.wordAudio",
      isOn: () => settings.autoSpeak,
      toggle: () => {
        settings.autoSpeak = !settings.autoSpeak;
        store.set("settings", settings);
      }
    },
    {
      icon: "pinyin",
      iconOff: "pinyin-off",
      labelKey: "battle.pinyin",
      isOn: () => settings.showPinyin,
      toggle: () => {
        settings.showPinyin = !settings.showPinyin;
        store.set("settings", settings);
      }
    }
  ];
  function renderPauseToggles() {
    const box = $("#pause-toggles");
    box.innerHTML = "";
    for (const cfg of PAUSE_TOGGLES) {
      const on = cfg.isOn();
      const btn = document.createElement("button");
      btn.className = "pause-toggle" + (on ? " on" : "");
      const left = document.createElement("span");
      left.className = "icon-text";
      left.appendChild(iconSvg(on ? cfg.icon : cfg.iconOff));
      const label = document.createElement("span");
      label.textContent = t(cfg.labelKey);
      left.appendChild(label);
      const state = document.createElement("span");
      state.className = "pt-state";
      state.textContent = on ? t("battle.on") : t("battle.off");
      btn.appendChild(left);
      btn.appendChild(state);
      btn.onclick = () => {
        cfg.toggle();
        renderPauseToggles();
      };
      box.appendChild(btn);
    }
  }
  function pauseBattle() {
    if (!B.on || B.paused) return;
    B.paused = true;
    B.pausedAt = performance.now();
    keepAwake(false);
    renderPauseToggles();
    $("#pause-overlay").classList.add("on");
  }
  function resumeBattle() {
    if (!B.on || !B.paused) return;
    const shift = performance.now() - B.pausedAt;
    B.nextAt += shift;
    if (B.dyingUntil) B.dyingUntil += shift;
    if (B.mascotHopUntil) B.mascotHopUntil += shift;
    if (B.feedback) B.feedback.until += shift;
    if (B.zombie && B.zombie.wrongUntil) B.zombie.wrongUntil += shift;
    if (B.zombie && B.zombie.happyAt) B.zombie.happyAt += shift;
    if (B.bossStageAt) B.bossStageAt += shift;
    B.paused = false;
    keepAwake(true);
    $("#pause-overlay").classList.remove("on");
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && B.on && !B.paused) pauseBattle();
  });
  $("#hud-pause").onclick = () => pauseBattle();
  $("#pause-resume").onclick = () => resumeBattle();
  $("#pause-quit").onclick = () => {
    $("#pause-overlay").classList.remove("on");
    endBattle(true);
  };
  function pushMiss(w) {
    if (!B.missSet.has(w.h)) {
      B.missSet.add(w.h);
      B.misses.push(w);
    }
  }
  function spawnZombie() {
    const w = pickWord();
    B.zombie = { w, x: B.w + 30, state: "walk", hp: 1 };
    B.spawned++;
    B.locked = false;
    if (isBossSpawn(B.spawned)) {
      B.zombie.boss = true;
      B.zombie.stage = "meaning";
      sfx.combo(5);
    }
    if (settings.autoSpeak) speak(w.h);
    renderOptions(w);
    updateHud();
    B.speedBase *= 1.03;
    B.speed = B.speedBase * (B.w / 380);
  }
  function renderOptions(word) {
    const opts = shuffle2([word, ...pickDistractors(B.deck.length >= 8 ? B.deck : pool, word)]);
    const box = $("#opts");
    box.innerHTML = "";
    for (const o of opts) {
      const m = meaning(o, scope.lang);
      const b = document.createElement("button");
      b.innerHTML = m.main + (m.sub ? `<span class="th">${m.sub}</span>` : "");
      b._w = o;
      b.onclick = () => answer(b, o);
      box.appendChild(b);
    }
  }
  function renderBossHanzi(word) {
    const opts = shuffle2([word, ...pickDistractors(B.deck.length >= 8 ? B.deck : pool, word)]);
    const box = $("#opts");
    box.innerHTML = "";
    const m = meaning(word, scope.lang);
    const prompt = document.createElement("div");
    prompt.className = "boss-prompt";
    prompt.textContent = t("battle.bossPrompt", { meaning: m.main });
    box.appendChild(prompt);
    for (const o of opts) {
      const b = document.createElement("button");
      b.innerHTML = o.h + `<span class="th">${o.p}</span>`;
      b._w = o;
      b.onclick = () => answer(b, o);
      box.appendChild(b);
    }
  }
  function lockOptions() {
    B.locked = true;
    document.querySelectorAll("#opts button").forEach((b) => b.disabled = true);
  }
  function revealCorrect(word) {
    document.querySelectorAll("#opts button").forEach((b) => {
      if (b._w && b._w.h === word.h) b.classList.add("good");
    });
  }
  function answer(btn, o) {
    if (B.paused) return;
    const z = B.zombie;
    if (!z || z.state !== "walk" || B.locked) return;
    const boss = z.boss;
    const correct = o.h === z.w.h;
    if (!boss) {
      B.attempts++;
      noteAnswer(z.w.h, correct);
    } else if (z.stage === "meaning") {
      B.attempts++;
    }
    if (correct && boss && z.stage === "meaning") {
      z.frozen = true;
      z.hp = 0.5;
      btn.classList.add("good");
      lockOptions();
      B.bossStageAt = performance.now() + 500;
      updateHud();
      return;
    }
    z.revealed = true;
    if (correct) {
      z.frozen = true;
      B.correct++;
      B.combo++;
      questEvent("correct");
      questEvent("combo", B.combo);
      if (boss) questEvent("boss");
      addXp(boss ? 5 : 1);
      const biteX = B.L.mascotX + B.L.catHalf;
      const distFrac = Math.max(0, z.x - biteX) / (B.w - biteX);
      B.score += boss ? bossPoints(killPoints(B.combo, distFrac)) : killPoints(B.combo, distFrac);
      sfx.kill();
      hapticKill();
      if (B.combo >= 3) sfx.combo(B.combo);
      btn.classList.add("good");
      lockOptions();
      B.proj = { x: B.L.mascotX + 16 * B.S, y: B.h - B.L.ground - 30 * B.S };
      if (boss) noteAnswer(z.w.h, true);
      const gy = B.h - B.L.ground;
      B.feedback = { ...feedbackEffect("correct", z.x, gy - 42 * B.S), until: fxUntil(620) };
      const floater = comboFloater(z.x, gy - 130, B.combo);
      if (floater) B.floats.push(floater);
      if (B.combo >= 10 && B.combo % 10 === 0) {
        B.parts.push(...fireworkRing(z.x, gy - 16));
        B.feedback = { ...feedbackEffect("critical", z.x, gy - 42 * B.S), until: fxUntil(750) };
      }
    } else {
      B.combo = 0;
      sfx.wrong();
      sfx.bite();
      hapticWrong();
      btn.classList.add("bad");
      lockOptions();
      revealCorrect(z.w);
      pushMiss(z.w);
      if (boss) noteAnswer(z.w.h, false);
      B.lives--;
      B.flash = 1;
      B.screenShake = REDUCED_MOTION ? 0 : 1;
      B.resolved++;
      z.state = "wrong";
      z.wrongUntil = performance.now() + 560;
      B.feedback = { ...feedbackEffect("wrong", z.x, B.h - B.L.ground - 44 * B.S), until: fxUntil(560) };
    }
    updateHud();
  }
  function scheduleNext(ms) {
    B.zombie = null;
    B.proj = null;
    B.nextAt = performance.now() + ms;
  }
  function killZombie(z) {
    const gy = B.h - B.L.ground;
    B.parts.push(...coinBurst(z.x, gy - 16, !!z.boss, shopState.effect));
    z.state = "happy";
    z.happyAt = performance.now();
    z.hpAtKill = z.hp;
    B.dyingUntil = performance.now() + 250;
    B.proj = null;
    B.resolved++;
    B.mascotHopUntil = performance.now() + 400;
  }
  function bite(timedOut) {
    const z = B.zombie;
    if (timedOut) {
      if (!z.boss || z.stage === "meaning") B.attempts++;
      B.combo = 0;
      noteAnswer(z.w.h, false);
      pushMiss(z.w);
      revealCorrect(z.w);
      lockOptions();
      z.revealed = true;
    }
    sfx.bite();
    B.lives--;
    B.flash = 1;
    B.resolved++;
    scheduleNext(1500);
    updateHud();
  }
  function loop(t2) {
    if (!B.on) return;
    if (B.paused) {
      B.lastT = t2;
      requestAnimationFrame(loop);
      return;
    }
    const dt = Math.min(0.05, (t2 - (B.lastT || t2)) / 1e3);
    B.lastT = t2;
    if (B.bossStageAt && t2 >= B.bossStageAt) {
      B.bossStageAt = 0;
      const bz = B.zombie;
      if (bz && bz.frozen && bz.stage === "meaning") {
        bz.stage = "hanzi";
        bz.frozen = false;
        renderBossHanzi(bz.w);
        B.locked = false;
      }
    }
    if (!B.zombie && t2 >= B.nextAt) {
      if (B.lives > 0 && B.spawned < B.wordsTotal) spawnZombie();
      else {
        endBattle(false);
        return;
      }
    }
    const z = B.zombie;
    if (z) {
      if (z.state === "walk") {
        if (!z.frozen) {
          z.x -= B.speed * (z.boss ? bossSpeedFactor : 1) * dt;
          if (z.x <= B.L.mascotX + B.L.catHalf) bite(true);
        }
      } else if (z.state === "dash") {
        z.x -= B.speed * 7 * dt;
        if (z.x <= B.L.mascotX + B.L.catHalf) bite(false);
      } else if (z.state === "happy" && t2 >= B.dyingUntil) {
        scheduleNext(200);
      } else if (z.state === "wrong") {
        z.x += 24 * B.S * dt;
        if (t2 >= z.wrongUntil) scheduleNext(350);
      }
    }
    if (B.proj && B.zombie) {
      B.proj.x += 560 * B.S * dt;
      if (B.proj.x >= B.zombie.x - 8) killZombie(B.zombie);
    }
    for (const p of B.parts) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.g ?? 500) * dt;
      p.life -= dt;
    }
    B.parts = B.parts.filter((p) => p.life > 0);
    for (const f of B.floats) {
      f.y += f.vy * dt;
      f.life -= dt;
    }
    B.floats = B.floats.filter((f) => f.life > 0);
    B.flash = Math.max(0, B.flash - 2.2 * dt);
    B.screenShake = Math.max(0, (B.screenShake || 0) - 4 * dt);
    draw(t2);
    requestAnimationFrame(loop);
  }
  function paintBackdrop(c, w, h, gy, style, t2 = 0) {
    const pulse = t2 / 1e3;
    if (style === "market") {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#24123c");
      g.addColorStop(0.58, "#3d1432");
      g.addColorStop(1, "#5a1d22");
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
      c.fillStyle = "rgba(10,6,18,.24)";
      c.fillRect(0, 0, w, gy);
      c.fillStyle = "rgba(18,8,18,.55)";
      for (const [fx, bw, bh] of [[0.08, 0.2, 0.24], [0.34, 0.16, 0.18], [0.62, 0.22, 0.22], [0.86, 0.18, 0.2]]) {
        c.fillRect(w * fx - bw * w / 2, gy - bh * h, bw * w, bh * h);
        c.fillStyle = "rgba(245,197,24,.16)";
        for (let i = 0; i < 3; i++) c.fillRect(w * fx - bw * w * 0.34 + i * bw * w * 0.22, gy - bh * h + 12, 5, 7);
        c.fillStyle = "rgba(18,8,18,.55)";
      }
      c.strokeStyle = "rgba(193,39,45,.65)";
      c.lineWidth = Math.max(1.5, w * 5e-3);
      c.beginPath();
      c.moveTo(0, h * 0.22);
      c.quadraticCurveTo(w * 0.5, h * 0.06, w, h * 0.2);
      c.stroke();
      for (const [fx, fy, r] of [[0.14, 0.25, 5], [0.33, 0.16, 4], [0.58, 0.23, 5], [0.79, 0.29, 4], [0.5, 0.12, 3]]) {
        const glow = 0.62 + Math.sin(pulse * 2 + fx * 8) * 0.16;
        c.fillStyle = `rgba(245,197,24,${glow.toFixed(3)})`;
        c.beginPath();
        c.ellipse(w * fx, h * fy + Math.sin(pulse + fx * 9) * 2, r, r * 1.25, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "rgba(193,39,45,.8)";
        c.fillRect(w * fx - r * 0.55, h * fy - r * 0.95, r * 1.1, r * 0.25);
      }
      c.fillStyle = "rgba(245,197,24,.09)";
      for (let i = 0; i < 14; i++) {
        const x = w * ((i * 0.137 + pulse * 0.018) % 1);
        const y = h * (0.18 + (i * 0.193 + pulse * 0.03) % 1 * 0.62);
        c.beginPath();
        c.arc(x, y, 1.2 + i % 3 * 0.55, 0, Math.PI * 2);
        c.fill();
      }
    } else if (style === "temple") {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#271415");
      g.addColorStop(0.52, "#5b2412");
      g.addColorStop(1, "#8b3d18");
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
      const sunY = h * (0.4 + Math.sin(pulse * 0.25) * 0.015);
      c.fillStyle = "rgba(255,214,95,.18)";
      c.beginPath();
      c.arc(w * 0.22, sunY, w * 0.22, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "rgba(255,214,95,.32)";
      c.beginPath();
      c.arc(w * 0.22, sunY, w * 0.16, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "rgba(255,244,224,.06)";
      for (let y = h * 0.28; y < gy; y += h * 0.09) c.fillRect(0, y + Math.sin(pulse + y * 0.01) * 2, w, 2);
      c.fillStyle = "rgba(20,10,10,.62)";
      drawPagodaSilhouette(c, w * 0.75, gy + 8, Math.min(w, h) * 0.55);
    } else if (style === "bamboo") {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#0d2928");
      g.addColorStop(0.62, "#14362f");
      g.addColorStop(1, "#203a28");
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
      c.fillStyle = "rgba(190,230,190,.09)";
      c.fillRect(0, h * 0.45, w, h * 0.2);
      const stalks = [0.16, 0.31, 0.46, 0.63, 0.78, 0.9];
      for (const fx of stalks) {
        const sw = Math.max(4, w * 0.012);
        const sway = Math.sin(pulse * 0.8 + fx * 6) * w * 6e-3;
        c.fillStyle = "rgba(20,80,52,.64)";
        c.fillRect(w * fx - sw / 2 + sway, 0, sw, gy + 10);
        c.strokeStyle = "rgba(245,197,24,.18)";
        c.lineWidth = 1;
        for (let y = h * 0.16; y < gy; y += h * 0.18) {
          c.beginPath();
          c.moveTo(w * fx - sw / 2 + sway, y);
          c.lineTo(w * fx + sw / 2 + sway, y);
          c.stroke();
        }
      }
      c.fillStyle = "rgba(210,240,220,.075)";
      for (let i = 0; i < 5; i++) {
        const y = h * (0.28 + i * 0.1);
        c.fillRect((pulse * 18 + i * w * 0.27) % (w * 1.35) - w * 0.35, y, w * 0.55, 8);
      }
    } else {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#2a0f2a");
      g.addColorStop(0.6, "#4a1420");
      g.addColorStop(1, "#6b2a1a");
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }
  }
  function drawBackdrop(gy) {
    const selected = shopState.backdrop ? `bg-${shopState.backdrop}` : "bg-quest";
    const img2 = sprite(selected);
    if (img2) drawCoverImage(ctx2, img2, 0, 0, B.w, B.h);
    else if (shopState.backdrop) paintBackdrop(ctx2, B.w, B.h, gy, shopState.backdrop, performance.now());
    else paintBackdrop(ctx2, B.w, B.h, gy, "", performance.now());
  }
  function draw(t2) {
    ctx2.clearRect(0, 0, B.w, B.h);
    const gy = B.h - B.L.ground;
    const shake = B.screenShake > 0 ? Math.sin(t2 * 0.08) * 5 * B.S * B.screenShake : 0;
    if (shake) {
      ctx2.save();
      ctx2.translate(shake, 0);
    }
    drawBackdrop(gy);
    ctx2.strokeStyle = "rgba(245,197,24,.35)";
    ctx2.lineWidth = 3;
    ctx2.beginPath();
    ctx2.moveTo(0, gy + 12);
    ctx2.lineTo(B.w, gy + 12);
    ctx2.stroke();
    ctx2.textAlign = "center";
    const hopping = B.mascotHopUntil && t2 < B.mascotHopUntil;
    const playerState = hopping ? "happy" : "walk";
    drawCat(ctx2, B.L.mascotX, gy + 6 * B.S, t2, playerState, SKIN_PALETTES[shopState.skin], 0.9 * B.S, B.acc, false);
    if (B.hasKitten) drawCat(ctx2, B.L.mascotX - B.L.catHalf, gy + 6 * B.S, t2 + 250, playerState, SKIN_PALETTES[shopState.skin], 0.5 * B.S, [], false);
    const coinImgIdle = sprite("coin");
    if (coinImgIdle) {
      ctx2.drawImage(coinImgIdle, 4 * B.S, gy - 22 * B.S, B.L.coinPx, B.L.coinPx);
    } else {
      drawCoinMark(ctx2, 16 * B.S, gy - 10 * B.S, 9 * B.S);
    }
    const z = B.zombie;
    if (z) {
      const hideWord = z.boss && z.stage === "hanzi" && z.state === "walk";
      drawWordPlate(z, hideWord, t2);
      const rScale = z.boss ? 1.5 * B.S : B.S;
      drawRaccoon(ctx2, z.x, gy + 6 * B.S, z.state === "happy" ? t2 - z.happyAt : t2, z.state, rScale, !!z.boss);
      let hpFrac = z.hp;
      if (z.state === "happy" && B.dyingUntil) {
        const remain = Math.max(0, B.dyingUntil - t2);
        hpFrac = (z.hpAtKill ?? z.hp) * (remain / 250);
      }
      drawHpBar(ctx2, z.x, gy + 6 * B.S - RACCOON_HEIGHT * rScale, 46 * B.S, hpFrac, B.S);
    } else {
      B.plaqueRect = null;
    }
    if (B.proj) {
      const coinImg = sprite("coin");
      const pc = B.L.coinPx;
      if (coinImg) {
        ctx2.drawImage(coinImg, B.proj.x - pc / 2, B.proj.y - pc / 2, pc, pc);
      } else {
        drawCoinMark(ctx2, B.proj.x, B.proj.y, pc * 0.45);
      }
    }
    const coinImgP = sprite("coin");
    for (const p of B.parts) {
      ctx2.globalAlpha = Math.max(0, Math.min(1, p.life / 0.6));
      if (p.kind === "coin") {
        if (coinImgP) ctx2.drawImage(coinImgP, p.x - 7, p.y - 7, 14, 14);
        else {
          ctx2.fillStyle = "#f5c518";
          ctx2.beginPath();
          ctx2.arc(p.x, p.y, 3.4, 0, 7);
          ctx2.fill();
        }
      } else if (p.kind === "spark") {
        ctx2.fillStyle = "#fff4c0";
        ctx2.beginPath();
        ctx2.arc(p.x, p.y, 4.2, 0, 7);
        ctx2.fill();
      } else if (p.kind === "petal") {
        ctx2.fillStyle = "#f6a8c8";
        ctx2.beginPath();
        ctx2.ellipse(p.x, p.y, 4.6, 2.6, p.x * 0.05, 0, 7);
        ctx2.fill();
      } else if (p.kind === "cracker") {
        ctx2.fillStyle = "#e04040";
        ctx2.beginPath();
        ctx2.arc(p.x, p.y, 4.4, 0, 7);
        ctx2.fill();
      } else {
        ctx2.fillStyle = "#f5c518";
        ctx2.beginPath();
        ctx2.arc(p.x, p.y, 3.4, 0, 7);
        ctx2.fill();
      }
    }
    ctx2.globalAlpha = 1;
    if (B.floats.length) {
      ctx2.font = fontString(700, B.L.floaterPx, LATIN_STACK);
      ctx2.fillStyle = "#f5c518";
      for (const f of B.floats) {
        ctx2.globalAlpha = Math.max(0, Math.min(1, f.life / 0.9));
        ctx2.fillText(f.text, f.x, f.y);
      }
      ctx2.globalAlpha = 1;
    }
    drawFeedbackLayer(t2);
    if (B.flash > 0) {
      ctx2.fillStyle = `rgba(90,44,80,${(0.3 * B.flash).toFixed(3)})`;
      ctx2.fillRect(0, 0, B.w, B.h);
    }
    if (shake) ctx2.restore();
  }
  function drawWordPlate(z, hideWord, t2) {
    const w = z.w, boss = z.boss, level = w.lv;
    const hanzi = hideWord ? "\uFF1F\uFF1F" : w.h;
    const pinyin = hideWord || !settings.showPinyin ? "" : w.p;
    const revealed = !!z.revealed;
    const showSub = scope.lang === "both";
    const wy = Math.round(B.h * 0.36);
    ctx2.save();
    ctx2.font = fontString(700, B.L.hanziPx, HANZI_STACK);
    const textW = Math.max(ctx2.measureText(hanzi).width, 74 * B.S);
    const spkR = 12 * B.S;
    const lw = Math.min(B.w - 24 * B.S, textW + 56 * B.S + spkR * 2.2);
    const padV = 10 * B.S;
    const pinyinH = pinyin ? 22 * B.S : 0;
    const hanziH = B.L.hanziPx * 1.05;
    const transH = (showSub ? 40 : 24) * B.S;
    const lh = padV * 2 + pinyinH + hanziH + transH;
    const x = B.w / 2 - lw / 2, y = wy - lh / 2;
    const plaqueImg = sprite("ui-word-plaque");
    if (plaqueImg) {
      const di = Math.min(20 * B.S, lw / 3, lh / 3);
      for (const r of nineSliceRects(560, 320, 48, x, y, lw, lh, di)) {
        ctx2.drawImage(plaqueImg, r.sx, r.sy, r.sw, r.sh, r.dx, r.dy, r.dw, r.dh);
      }
    } else {
      ctx2.shadowColor = "rgba(60,40,20,.32)";
      ctx2.shadowBlur = 12 * B.S;
      ctx2.shadowOffsetY = 4 * B.S;
      const paper = ctx2.createLinearGradient(0, y, 0, y + lh);
      paper.addColorStop(0, "rgba(253,246,227,.97)");
      paper.addColorStop(1, "rgba(243,230,198,.97)");
      ctx2.fillStyle = paper;
      roundRect(x, y, lw, lh, 14 * B.S);
      ctx2.fill();
      ctx2.shadowBlur = 0;
      ctx2.shadowOffsetY = 0;
      ctx2.strokeStyle = boss ? "#D8A93A" : "#B98F55";
      ctx2.lineWidth = 2.6 * B.S;
      roundRect(x + 1.3 * B.S, y + 1.3 * B.S, lw - 2.6 * B.S, lh - 2.6 * B.S, 13 * B.S);
      ctx2.stroke();
      ctx2.strokeStyle = "rgba(231,211,166,.9)";
      ctx2.lineWidth = 1.2 * B.S;
      roundRect(x + 6 * B.S, y + 6 * B.S, lw - 12 * B.S, lh - 12 * B.S, 9 * B.S);
      ctx2.stroke();
      ctx2.strokeStyle = "#C29B5F";
      ctx2.lineWidth = 1.8 * B.S;
      ctx2.lineCap = "round";
      const tk = 5 * B.S, ti = 10 * B.S;
      ctx2.beginPath();
      ctx2.moveTo(x + ti, y + ti + tk);
      ctx2.lineTo(x + ti, y + ti);
      ctx2.lineTo(x + ti + tk, y + ti);
      ctx2.moveTo(x + lw - ti - tk, y + ti);
      ctx2.lineTo(x + lw - ti, y + ti);
      ctx2.lineTo(x + lw - ti, y + ti + tk);
      ctx2.moveTo(x + ti, y + lh - ti - tk);
      ctx2.lineTo(x + ti, y + lh - ti);
      ctx2.lineTo(x + ti + tk, y + lh - ti);
      ctx2.moveTo(x + lw - ti - tk, y + lh - ti);
      ctx2.lineTo(x + lw - ti, y + lh - ti);
      ctx2.lineTo(x + lw - ti, y + lh - ti - tk);
      ctx2.stroke();
    }
    ctx2.textAlign = "center";
    ctx2.textBaseline = "middle";
    let cy = y + padV;
    if (pinyin) {
      ctx2.font = fontString(600, B.L.pinyinPx, LATIN_STACK);
      ctx2.fillStyle = "#8C5F2A";
      ctx2.fillText(pinyin, B.w / 2, cy + pinyinH / 2);
      cy += pinyinH;
    }
    ctx2.font = fontString(700, B.L.hanziPx, HANZI_STACK);
    ctx2.fillStyle = boss ? "#7A4E0C" : "#3A2E1D";
    ctx2.fillText(hanzi, B.w / 2, cy + hanziH / 2);
    cy += hanziH;
    const midY = cy + (showSub ? transH * 0.32 : transH / 2);
    if (revealed) {
      const m = meaning(w, scope.lang);
      ctx2.font = fontString(700, 15 * B.S, LATIN_STACK);
      ctx2.fillStyle = "#2F6B4F";
      ctx2.fillText(m.main, B.w / 2, midY);
      if (showSub && m.sub) {
        ctx2.font = fontString(600, 13 * B.S, LATIN_STACK);
        ctx2.fillStyle = "#5C7A68";
        ctx2.fillText(m.sub, B.w / 2, cy + transH * 0.74);
      }
    } else {
      ctx2.strokeStyle = "rgba(140,95,42,.32)";
      ctx2.lineWidth = Math.max(1.4, 2 * B.S);
      ctx2.setLineDash([4 * B.S, 4 * B.S]);
      ctx2.beginPath();
      ctx2.moveTo(B.w / 2 - 44 * B.S, midY);
      ctx2.lineTo(B.w / 2 + 44 * B.S, midY);
      ctx2.stroke();
      if (showSub) {
        const y2 = cy + transH * 0.74;
        ctx2.beginPath();
        ctx2.moveTo(B.w / 2 - 30 * B.S, y2);
        ctx2.lineTo(B.w / 2 + 30 * B.S, y2);
        ctx2.stroke();
      }
      ctx2.setLineDash([]);
    }
    ctx2.textBaseline = "alphabetic";
    if (level) {
      ctx2.font = fontString(700, 10 * B.S, LATIN_STACK);
      const tagText = `HSK ${level}`;
      const tw = ctx2.measureText(tagText).width + 12 * B.S;
      const th = 16 * B.S;
      ctx2.fillStyle = "#2F6B4F";
      roundRect(x + 8 * B.S, y - th * 0.45, tw, th, th / 2);
      ctx2.fill();
      ctx2.strokeStyle = "#1E4634";
      ctx2.lineWidth = 1.2 * B.S;
      roundRect(x + 8 * B.S, y - th * 0.45, tw, th, th / 2);
      ctx2.stroke();
      ctx2.fillStyle = "#F2EDDE";
      ctx2.textAlign = "left";
      ctx2.fillText(tagText, x + 14 * B.S, y - th * 0.45 + th * 0.7);
    }
    drawSpeakerIcon(ctx2, x + lw - spkR - 10 * B.S, y + lh / 2, spkR, boss ? "#7A4E0C" : "#8C5F2A");
    B.plaqueRect = { x, y, w: lw, h: lh };
    ctx2.restore();
  }
  function drawSpeakerIcon(c, cx, cy, r, color) {
    c.save();
    c.translate(cx, cy);
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(-r * 0.9, -r * 0.35);
    c.lineTo(-r * 0.3, -r * 0.35);
    c.lineTo(r * 0.35, -r * 0.85);
    c.lineTo(r * 0.35, r * 0.85);
    c.lineTo(-r * 0.3, r * 0.35);
    c.lineTo(-r * 0.9, r * 0.35);
    c.closePath();
    c.fill();
    c.strokeStyle = color;
    c.lineWidth = Math.max(1.2, r * 0.16);
    c.lineCap = "round";
    c.beginPath();
    c.arc(r * 0.05, 0, r * 0.62, -Math.PI * 0.32, Math.PI * 0.32);
    c.stroke();
    c.beginPath();
    c.arc(r * 0.05, 0, r * 0.98, -Math.PI * 0.34, Math.PI * 0.34);
    c.stroke();
    c.restore();
  }
  function drawFeedbackLayer(t2) {
    const fb = B.feedback;
    if (!fb) return;
    const kind = fb.kind || fb.type;
    const total = fxDuration(kind === "critical" || kind === "streak" ? 750 : kind === "correct" ? 620 : 560);
    const left = fb.until - performance.now();
    if (left <= 0) {
      B.feedback = null;
      return;
    }
    const p = 1 - left / total;
    ctx2.save();
    ctx2.globalAlpha = Math.max(0, 1 - p);
    const orbImg = fb.orb ? sprite(fb.orb) : null;
    if (orbImg) {
      const os = (kind === "streak" || kind === "critical" ? 110 : 84) * B.S * (0.6 + 0.5 * Math.min(1, p * 2.4));
      ctx2.drawImage(orbImg, fb.x - os / 2, fb.y - os / 2, os, os);
    }
    const fxImg = fb.sprite ? sprite(fb.sprite) : null;
    if (fxImg) {
      const size = (kind === "critical" ? 96 : 72) * B.S;
      ctx2.drawImage(fxImg, fb.x - size / 2, fb.y - size / 2, size, size);
    } else if (kind === "correct" || kind === "streak" && !orbImg) {
      ctx2.strokeStyle = "rgba(245,197,24,.86)";
      ctx2.lineWidth = Math.max(2, 4 * B.S * (1 - p));
      ctx2.beginPath();
      ctx2.arc(fb.x, fb.y, (18 + 44 * p) * B.S, 0, Math.PI * 2);
      ctx2.stroke();
      ctx2.fillStyle = "rgba(255,244,224,.95)";
      for (let i = 0; i < 10; i++) {
        const a = i * Math.PI * 2 / 10 + t2 * 4e-3;
        const r = (14 + 42 * p) * B.S;
        ctx2.beginPath();
        ctx2.arc(fb.x + Math.cos(a) * r, fb.y + Math.sin(a) * r, 2.2 * B.S, 0, Math.PI * 2);
        ctx2.fill();
      }
    } else {
      ctx2.strokeStyle = "rgba(255,100,110,.65)";
      ctx2.lineWidth = 3 * B.S;
      ctx2.beginPath();
      ctx2.arc(fb.x, fb.y, (18 + 26 * p) * B.S, Math.PI * 0.15, Math.PI * 1.85);
      ctx2.stroke();
    }
    if (kind === "critical") {
      const tx = Math.min(Math.max(fb.x, 74 * B.S), B.w - 74 * B.S);
      const scale = 0.55 + 0.45 * Math.min(1, p * 6);
      ctx2.save();
      ctx2.translate(tx, fb.y);
      ctx2.scale(scale, scale);
      ctx2.textAlign = "center";
      ctx2.textBaseline = "middle";
      ctx2.font = fontString(800, 22 * B.S, LATIN_STACK);
      ctx2.lineJoin = "round";
      ctx2.strokeStyle = "#FBF5E8";
      ctx2.lineWidth = 4 * B.S;
      ctx2.strokeText("CRITICAL!", 0, 0);
      ctx2.fillStyle = "#7A4E0C";
      ctx2.fillText("CRITICAL!", 0, 0);
      ctx2.restore();
    }
    ctx2.restore();
  }
  function roundRect(x, y, w, h, r) {
    ctx2.beginPath();
    ctx2.moveTo(x + r, y);
    ctx2.arcTo(x + w, y, x + w, y + h, r);
    ctx2.arcTo(x + w, y + h, x, y + h, r);
    ctx2.arcTo(x, y + h, x, y, r);
    ctx2.arcTo(x, y, x + w, y, r);
    ctx2.closePath();
  }
  function roundRectOn(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function drawCoverImage(c, img2, x, y, w, h) {
    const scale = Math.max(w / img2.naturalWidth, h / img2.naturalHeight);
    const sw = w / scale, sh = h / scale;
    const sx = (img2.naturalWidth - sw) / 2;
    const sy = (img2.naturalHeight - sh) / 2;
    c.drawImage(img2, sx, sy, sw, sh, x, y, w, h);
  }
  function drawCoinMark(c, x, y, r) {
    c.save();
    const g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.2, x, y, r);
    g.addColorStop(0, "#fff1a6");
    g.addColorStop(0.58, "#f5c518");
    g.addColorStop(1, "#a86d00");
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#5a3c00";
    c.lineWidth = Math.max(1, r * 0.16);
    c.stroke();
    c.strokeStyle = "rgba(90,60,0,.65)";
    c.lineWidth = Math.max(1, r * 0.12);
    c.beginPath();
    c.arc(x, y, r * 0.48, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }
  function drawPagodaSilhouette(c, x, baseY, s) {
    c.save();
    c.translate(x, baseY);
    for (let i = 0; i < 3; i++) {
      const y = -s * (0.18 + i * 0.19), w = s * (0.46 - i * 0.09), h = s * 0.12;
      c.fillRect(-w * 0.32, y, w * 0.64, h);
      c.beginPath();
      c.moveTo(-w * 0.58, y);
      c.lineTo(0, y - h * 0.72);
      c.lineTo(w * 0.58, y);
      c.closePath();
      c.fill();
    }
    c.fillRect(-s * 0.11, -s * 0.18, s * 0.22, s * 0.18);
    c.restore();
  }
  function endBattle(quit) {
    stopBattle();
    updateSmartBtn();
    if (quit) {
      if (B.resolved > 0) noteDaily(B.resolved);
      if (B.score > 0) {
        wallet += B.score;
        store.set("wallet", wallet);
        updateWalletChip();
      }
      show("home");
      return;
    }
    noteDaily(B.resolved);
    const isPerfect = B.mode === "round" && B.resolved > 0 && B.misses.length === 0 && !B.customDeck;
    if (isPerfect) questEvent("perfect");
    wallet += B.score;
    const bonus = isPerfect ? perfectBonus(B.score) : 0;
    if (bonus) wallet += bonus;
    store.set("wallet", wallet);
    updateWalletChip();
    $("#r-wallet").textContent = t("results.banked", { score: B.score, total: wallet.toLocaleString() });
    const perfectEl = $("#r-perfect");
    if (isPerfect) {
      perfectEl.textContent = t("results.perfect", { bonus });
      perfectEl.style.display = "block";
    } else perfectEl.style.display = "none";
    const lu = B.levelUps || [];
    const luEl = $("#r-levelup");
    if (lu.length) {
      const from = lu[0].from, to = lu[lu.length - 1].to;
      const hit = MILESTONES.filter((m) => m.lv > from && m.lv <= to);
      luEl.textContent = hit.length ? t("results.levelUpUnlocked", { lv: to, items: hit.map((m) => m.name).join(", ") }) : t("results.levelUp", { lv: to });
      luEl.style.display = "block";
    } else {
      luEl.style.display = "none";
    }
    const rq = $("#r-quests");
    rq.innerHTML = "";
    for (const q of questToasts) {
      const line = document.createElement("div");
      line.textContent = t("results.questComplete", { desc: t("quest." + q.id), reward: q.reward });
      rq.appendChild(line);
    }
    rq.style.display = questToasts.length ? "block" : "none";
    const acc = B.attempts ? Math.round(100 * B.correct / B.attempts) : 0;
    $("#r-score").textContent = B.score;
    const key = scopeKey(scope) + "\xB7" + modeKey(B.mode, B.wordsTotal);
    if (B.customDeck) {
      $("#r-sub").innerHTML = t("results.sub", { acc, words: B.correct, key });
    } else {
      const best = store.get("best", {});
      const prev = best[key] ? best[key].score : 0;
      const isBest = B.score > prev;
      if (isBest) {
        best[key] = { score: B.score, date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) };
        store.set("best", best);
      }
      $("#r-sub").innerHTML = t("results.sub", { acc, words: B.correct, key }) + (isBest ? ` \xB7 <b style="color:var(--lc-brown)">${t("results.bestTag")}</b>` : ` \xB7 ${t("results.bestPrev", { prev })}`);
    }
    const list = $("#r-miss");
    list.innerHTML = "";
    $("#r-misshead").style.display = B.misses.length ? "block" : "none";
    list.style.display = B.misses.length ? "block" : "none";
    for (const w of B.misses) {
      const row = document.createElement("div");
      row.className = "missrow";
      row.innerHTML = `<span class="hz">${w.h}</span>
      <span class="det"><span class="py">${w.p}</span> \u2014 ${w.e}${w.t ? " \xB7 " + w.t : ""}</span>`;
      const sp = document.createElement("button");
      sp.className = "sp";
      sp.setAttribute("aria-label", "Play audio");
      sp.replaceChildren(iconSvg("sound"));
      sp.onclick = () => speak(w.h);
      row.appendChild(sp);
      list.appendChild(row);
    }
    $("#r-review").style.display = B.misses.length ? "block" : "none";
    $("#r-review").onclick = () => {
      learnDeck = B.misses.slice();
      startLearn();
    };
    $("#r-fight-miss").style.display = B.misses.length >= 2 ? "block" : "none";
    $("#r-fight-miss").onclick = () => {
      battleDeckOverride = B.misses.slice();
      startBattle("round");
    };
    $("#r-again").onclick = () => startBattle(lastMode);
    show("results");
  }
  function renderScores() {
    const best = store.get("best", {});
    const box = $("#scorelist");
    const keys = Object.keys(best).sort((a, b) => best[b].score - best[a].score);
    box.innerHTML = keys.length ? "" : `<div class="scorerow" style="color:var(--muted)">${t("scores.empty")}</div>`;
    for (const k of keys) {
      const row = document.createElement("div");
      row.className = "scorerow";
      row.innerHTML = `<span>${k}</span><span><b>${best[k].score}</b> <span style="color:var(--muted);font-size:12px">${best[k].date}</span></span>`;
      box.appendChild(row);
    }
  }
  function renderShop() {
    sfx.pack = shopState.soundpack || "default";
    $("#shop-wallet").innerHTML = t("shop.wallet", { coins: wallet.toLocaleString() });
    const skinBox = $("#shop-skins"), bdBox = $("#shop-backdrops"), fxBox = $("#shop-effects"), sndBox = $("#shop-sounds"), decoBox = $("#shop-street");
    skinBox.innerHTML = "";
    bdBox.innerHTML = "";
    fxBox.innerHTML = "";
    sndBox.innerHTML = "";
    decoBox.innerHTML = "";
    for (const item of CATALOG) {
      const box = item.type === "skin" ? skinBox : item.type === "backdrop" ? bdBox : item.type === "effect" ? fxBox : item.type === "soundpack" ? sndBox : decoBox;
      const owned = shopState.owned.includes(item.id);
      const equipped = shopState[item.type] === item.id;
      const row = document.createElement("div");
      row.className = "scorerow shoprow";
      const left = document.createElement("span");
      left.innerHTML = `${item.name} <span style="color:var(--muted);font-size:12px">${t("shop.coins", { coins: item.price.toLocaleString() })}</span>`;
      left.className = "shop-left";
      const preview = document.createElement("canvas");
      preview.className = "shop-preview";
      preview.setAttribute("aria-hidden", "true");
      preview._shopItem = item;
      const copy = document.createElement("span");
      copy.className = "shop-copy";
      copy.innerHTML = `<b>${item.name}</b><small>${t("shop.coins", { coins: item.price.toLocaleString() })}</small>`;
      left.replaceChildren(preview, copy);
      const btn = document.createElement("button");
      if (item.type === "deco") {
        btn.className = "chip" + (owned ? " on" : "");
        if (owned) {
          btn.textContent = t("shop.onStreet");
          btn.disabled = true;
        } else {
          btn.textContent = t("shop.buy");
          btn.disabled = !canAfford(wallet, item.id);
          btn.onclick = () => {
            const r = buy(wallet, shopState, item.id);
            if (!r.ok) return;
            wallet = r.wallet;
            shopState = r.shop;
            store.set("wallet", wallet);
            store.set("shop", shopState);
            updateWalletChip();
            renderShop();
            renderStreet();
          };
        }
      } else {
        btn.className = "chip" + (equipped ? " on" : "");
        if (equipped) {
          btn.textContent = t("shop.equipped");
          btn.disabled = true;
        } else if (owned) {
          btn.textContent = t("shop.equip");
          btn.onclick = () => {
            shopState = equipItem(shopState, item.id);
            store.set("shop", shopState);
            renderShop();
          };
        } else {
          btn.textContent = t("shop.buy");
          btn.disabled = !canAfford(wallet, item.id);
          btn.onclick = () => {
            const r = buy(wallet, shopState, item.id);
            if (!r.ok) return;
            wallet = r.wallet;
            shopState = r.shop;
            store.set("wallet", wallet);
            store.set("shop", shopState);
            updateWalletChip();
            renderShop();
          };
        }
      }
      row.appendChild(left);
      row.appendChild(btn);
      box.appendChild(row);
      renderShopPreview(preview, item, performance.now());
    }
    startShopPreviewLoop();
  }
  var shopPreviewRaf = 0;
  function startShopPreviewLoop() {
    if (shopPreviewRaf) return;
    const tick = (t2) => {
      shopPreviewRaf = 0;
      if (currentScreen !== "shop") return;
      document.querySelectorAll(".shop-preview").forEach((canvas) => {
        if (canvas._shopItem) renderShopPreview(canvas, canvas._shopItem, t2);
      });
      shopPreviewRaf = requestAnimationFrame(tick);
    };
    shopPreviewRaf = requestAnimationFrame(tick);
  }
  function renderShopPreview(canvas, item, t2 = 0) {
    const w = 96, h = 64;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    const c = canvas.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    const bg = c.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "rgba(255,232,150,.16)");
    bg.addColorStop(1, "rgba(58,16,16,.72)");
    c.fillStyle = bg;
    roundRectOn(c, 0, 0, w, h, 10);
    c.fill();
    c.strokeStyle = "rgba(245,197,24,.28)";
    c.lineWidth = 1;
    roundRectOn(c, 0.5, 0.5, w - 1, h - 1, 10);
    c.stroke();
    if (item.type === "skin") {
      drawCat(c, w * 0.52, h + 6, t2, "walk", SKIN_PALETTES[item.id], 0.72, [], false);
    } else if (item.type === "backdrop") {
      const img2 = sprite(`bg-${item.id}`);
      if (img2) drawCoverImage(c, img2, 0, 0, w, h);
      else paintBackdrop(c, w, h, h - 7, item.id, t2);
      c.strokeStyle = "rgba(245,197,24,.55)";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(0, h - 8);
      c.lineTo(w, h - 8);
      c.stroke();
    } else if (item.type === "effect") {
      if (item.id === "sakura-fx") {
        c.fillStyle = "#f6a8c8";
        for (const [x, y, r] of [[18, 15, 0], [31, 24, 0.9], [43, 13, -0.5], [24, 31, 0.4]]) {
          c.beginPath();
          c.ellipse(x, y, 5, 2.6, r, 0, Math.PI * 2);
          c.fill();
        }
      } else {
        c.fillStyle = "#e04040";
        c.beginPath();
        c.arc(24, 22, 8, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#fff4c0";
        for (const [x, y] of [[15, 12], [38, 13], [42, 30], [18, 32], [31, 21]]) {
          c.beginPath();
          c.arc(x, y, 2.8, 0, Math.PI * 2);
          c.fill();
        }
      }
    } else if (item.type === "soundpack") {
      c.strokeStyle = item.id === "bells" ? "#f5c518" : "#7fd7ff";
      c.lineWidth = 2.5;
      c.lineCap = "round";
      if (item.id === "bells") {
        c.fillStyle = "#f5c518";
        c.beginPath();
        c.arc(30, 19, 10, Math.PI, 0);
        c.lineTo(42, 30);
        c.lineTo(18, 30);
        c.closePath();
        c.fill();
        c.fillStyle = "#3a2200";
        c.beginPath();
        c.arc(30, 30, 2.6, 0, Math.PI * 2);
        c.fill();
      } else {
        c.beginPath();
        c.moveTo(16, 29);
        c.lineTo(16, 14);
        c.lineTo(39, 10);
        c.lineTo(39, 25);
        c.stroke();
        c.beginPath();
        c.arc(14, 31, 4, 0, Math.PI * 2);
        c.stroke();
        c.beginPath();
        c.arc(37, 27, 4, 0, Math.PI * 2);
        c.stroke();
      }
    } else {
      drawStreetDeco(c, item.id, w * 0.5, h - 5, h);
    }
  }
  function renderStreet() {
    const scv = $("#street-cv");
    if (!scv) return;
    const w = scv.clientWidth, h = scv.clientHeight;
    if (!w || !h) return;
    const dpr = window.devicePixelRatio || 1;
    scv.width = Math.round(w * dpr);
    scv.height = Math.round(h * dpr);
    const sc = scv.getContext("2d");
    sc.setTransform(dpr, 0, 0, dpr, 0, 0);
    sc.clearRect(0, 0, w, h);
    paintStreetBase(sc, w, h);
    const gy = h - 10;
    const level = levelForXp(xp);
    const pieces = streetPieces(level, shopState.owned);
    drawStreetPads(sc, w, gy, h, pieces);
    for (const p of pieces) {
      const x = p.slot * w;
      if (p.kind === "building") drawStreetBuilding(sc, p.id, x, gy, h);
      else drawStreetDeco(sc, p.id, x, gy, h);
    }
    const mImg = sprite("maneki");
    const mp = Math.min(h * 0.62, 48);
    if (mImg) {
      sc.drawImage(mImg, 4, gy - mp + 4, mp, mp);
    } else {
      sc.textAlign = "left";
      sc.font = `${Math.round(h * 0.42)}px serif`;
      drawCat(sc, 22, gy + 8, 0, "happy", null, 0.58, [], false);
    }
    const cap = $("#street-caption");
    if (!cap) return;
    const prog = streetProgress(level);
    const nextTxt = prog.next ? `Next: Lv ${prog.next.lv} \u2014 ${prog.next.name}` : "All buildings unlocked!";
    cap.textContent = pieces.length === 0 ? `Lucky Cat Street \u2014 grows as you learn \xB7 ${nextTxt}` : `${prog.unlocked}/${prog.total} buildings \xB7 ${nextTxt}`;
  }
  function paintStreetBase(c, w, h) {
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#160b2a");
    sky.addColorStop(0.58, "#2a1232");
    sky.addColorStop(1, "#5a1d18");
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);
    c.fillStyle = "rgba(255,231,144,.86)";
    c.beginPath();
    c.arc(w * 0.82, h * 0.24, h * 0.12, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "rgba(245,197,24,.7)";
    for (const [fx, fy, r] of [[0.16, 0.18, 1.2], [0.31, 0.28, 1], [0.46, 0.16, 1.4], [0.66, 0.3, 1.1], [0.92, 0.42, 1]]) {
      c.beginPath();
      c.arc(w * fx, h * fy, r, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = "rgba(18,12,24,.58)";
    c.beginPath();
    c.moveTo(0, h * 0.58);
    c.lineTo(w * 0.16, h * 0.42);
    c.lineTo(w * 0.3, h * 0.57);
    c.lineTo(w * 0.48, h * 0.37);
    c.lineTo(w * 0.72, h * 0.58);
    c.lineTo(w, h * 0.43);
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.closePath();
    c.fill();
    c.fillStyle = "rgba(92,31,24,.9)";
    c.fillRect(0, h * 0.64, w, h * 0.36);
    c.strokeStyle = "rgba(245,197,24,.24)";
    c.lineWidth = 1;
    for (let y = h * 0.7; y < h; y += h * 0.12) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y);
      c.stroke();
    }
    for (let x = -w * 0.1; x < w; x += w * 0.14) {
      c.beginPath();
      c.moveTo(x, h);
      c.lineTo(x + w * 0.07, h * 0.66);
      c.stroke();
    }
    c.strokeStyle = "rgba(245,197,24,.55)";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, h - 10);
    c.lineTo(w, h - 10);
    c.stroke();
    c.fillStyle = "rgba(245,197,24,.12)";
    c.fillRect(0, h * 0.62, w, h * 0.05);
  }
  function drawStreetPads(c, w, gy, h, pieces) {
    const occupied = new Set(pieces.map((p) => p.slot.toFixed(2)));
    const slots = [0.18, 0.34, 0.5, 0.66, 0.82, 0.1, 0.26, 0.42, 0.58, 0.74];
    for (const slot of slots) {
      if (occupied.has(slot.toFixed(2))) continue;
      const x = slot * w, pw = h * 0.34;
      c.fillStyle = "rgba(255,214,95,.08)";
      c.beginPath();
      c.ellipse(x, gy + 1, pw, h * 0.055, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "rgba(245,197,24,.16)";
      c.lineWidth = 1;
      c.beginPath();
      c.ellipse(x, gy + 1, pw, h * 0.055, 0, 0, Math.PI * 2);
      c.stroke();
    }
  }
  function drawStreetBuilding(c, id, x, gy, h) {
    const bw = h * 0.54, bh = h * 0.62;
    c.save();
    c.translate(x, gy);
    c.shadowColor = "rgba(245,197,24,.32)";
    c.shadowBlur = 6;
    switch (id) {
      case "lantern-post":
        c.fillStyle = "#2e1030";
        roundRectOn(c, -3, -bh, 6, bh, 2);
        c.fill();
        c.strokeStyle = "#f5c518";
        c.lineWidth = 1.6;
        c.beginPath();
        c.moveTo(0, -bh);
        c.quadraticCurveTo(bw * 0.26, -bh * 1.06, bw * 0.42, -bh * 0.86);
        c.stroke();
        c.fillStyle = "#c1272d";
        c.beginPath();
        c.ellipse(bw * 0.43, -bh * 0.74, bw * 0.18, bw * 0.23, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#f5c518";
        c.fillRect(bw * 0.34, -bh * 0.98, bw * 0.18, 3);
        c.fillRect(bw * 0.36, -bh * 0.52, bw * 0.14, 3);
        break;
      case "coin-bank":
        c.fillStyle = "#2e1030";
        roundRectOn(c, -bw / 2, -bh, bw, bh, 4);
        c.fill();
        c.fillStyle = "#8a2a24";
        c.fillRect(-bw * 0.55, -bh, bw * 1.1, bh * 0.16);
        c.fillStyle = "#f5c518";
        c.beginPath();
        c.arc(0, -bh * 0.58, bw * 0.2, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#8a2a24";
        c.font = `700 ${Math.round(bw * 0.22)}px serif`;
        c.textAlign = "center";
        c.fillText("$", 0, -bh * 0.5);
        c.fillStyle = "rgba(255,244,224,.72)";
        c.fillRect(-bw * 0.34, -bh * 0.28, bw * 0.68, bh * 0.05);
        break;
      case "tailor":
        c.fillStyle = "#2e1030";
        roundRectOn(c, -bw / 2, -bh * 0.85, bw, bh * 0.85, 4);
        c.fill();
        c.fillStyle = "#c1272d";
        c.fillRect(-bw / 2 - 5, -bh * 0.85 - 9, bw + 10, 9);
        c.fillStyle = "rgba(255,244,224,.18)";
        c.fillRect(-bw * 0.42, -bh * 0.79, bw * 0.84, bh * 0.13);
        c.fillStyle = "#f5c518";
        c.fillRect(-bw * 0.18, -bh * 0.55, bw * 0.14, bh * 0.14);
        c.fillRect(bw * 0.04, -bh * 0.55, bw * 0.14, bh * 0.14);
        break;
      case "kitten-cafe":
        c.fillStyle = "#2e1030";
        roundRectOn(c, -bw / 2, -bh * 0.75, bw, bh * 0.75, 4);
        c.fill();
        c.fillStyle = "#8a2a24";
        c.beginPath();
        c.moveTo(-bw / 2 - 6, -bh * 0.75);
        c.lineTo(0, -bh);
        c.lineTo(bw / 2 + 6, -bh * 0.75);
        c.closePath();
        c.fill();
        c.fillStyle = "#f5c518";
        c.beginPath();
        c.arc(0, -bh * 0.4, bw * 0.16, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#1a0d0d";
        c.beginPath();
        c.arc(-bw * 0.05, -bh * 0.43, bw * 0.03, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.arc(bw * 0.05, -bh * 0.43, bw * 0.03, 0, Math.PI * 2);
        c.fill();
        break;
      case "emperor-gate":
        c.fillStyle = "#c1272d";
        c.fillRect(-bw * 0.7, -bh * 1.15, bw * 0.16, bh * 1.15);
        c.fillRect(bw * 0.54, -bh * 1.15, bw * 0.16, bh * 1.15);
        c.fillRect(-bw * 0.7, -bh * 1.15, bw * 1.4, bh * 0.14);
        c.fillStyle = "#8a2a24";
        c.fillRect(-bw * 0.82, -bh * 1.28, bw * 1.64, bh * 0.13);
        c.fillStyle = "#f5c518";
        c.beginPath();
        c.arc(0, -bh * 1.08, bw * 0.12, 0, Math.PI * 2);
        c.fill();
        break;
    }
    c.restore();
  }
  function drawStreetDeco(c, id, x, gy, h) {
    const s = h * 0.32;
    c.save();
    c.translate(x, gy);
    c.shadowColor = "rgba(245,197,24,.28)";
    c.shadowBlur = 5;
    switch (id) {
      case "red-lantern":
        c.strokeStyle = "#8a2a24";
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(0, -s * 1.6);
        c.lineTo(0, -s * 1.1);
        c.stroke();
        c.fillStyle = "#c1272d";
        c.beginPath();
        c.ellipse(0, -s * 0.8, s * 0.32, s * 0.42, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#f5c518";
        c.fillRect(-2, -s * 0.38, 4, s * 0.12);
        break;
      case "noodle-stall":
        c.fillStyle = "#5a2c22";
        roundRectOn(c, -s * 0.48, -s * 0.62, s * 0.96, s * 0.62, 3);
        c.fill();
        c.fillStyle = "#c1272d";
        c.fillRect(-s * 0.56, -s * 0.84, s * 1.12, s * 0.18);
        c.fillStyle = "#f5c518";
        c.fillRect(-s * 0.56, -s * 0.84, s * 0.18, s * 0.18);
        c.fillRect(-s * 0.1, -s * 0.84, s * 0.18, s * 0.18);
        c.fillRect(s * 0.36, -s * 0.84, s * 0.2, s * 0.18);
        break;
      case "tea-sign":
        c.strokeStyle = "#f5c518";
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(0, -s * 1.3);
        c.lineTo(0, -s * 0.9);
        c.stroke();
        c.fillStyle = "#3a1a1a";
        roundRectOn(c, -s * 0.38, -s * 1.3, s * 0.76, s * 0.32, 3);
        c.fill();
        c.fillStyle = "#f5c518";
        c.font = `700 ${Math.round(s * 0.22)}px serif`;
        c.textAlign = "center";
        c.fillText("tea", 0, -s * 1.06);
        break;
      case "foo-dog":
        c.fillStyle = "#2e1030";
        c.beginPath();
        c.ellipse(0, -s * 0.3, s * 0.32, s * 0.4, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#f5c518";
        c.beginPath();
        c.arc(0, -s * 0.62, s * 0.18, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#1a0d0d";
        c.beginPath();
        c.arc(-s * 0.05, -s * 0.65, s * 0.025, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.arc(s * 0.05, -s * 0.65, s * 0.025, 0, Math.PI * 2);
        c.fill();
        break;
      case "golden-arch":
        c.strokeStyle = "#f5c518";
        c.lineWidth = 3;
        c.beginPath();
        c.arc(0, -s * 0.5, s * 0.9, Math.PI, 0);
        c.stroke();
        c.beginPath();
        c.moveTo(-s * 0.9, -s * 0.5);
        c.lineTo(-s * 0.9, 0);
        c.moveTo(s * 0.9, -s * 0.5);
        c.lineTo(s * 0.9, 0);
        c.stroke();
        c.fillStyle = "rgba(255,244,224,.35)";
        c.beginPath();
        c.arc(0, -s * 0.93, s * 0.13, 0, Math.PI * 2);
        c.fill();
        break;
    }
    c.restore();
  }
  function renderGrowthCard() {
    const card = $("#growth-card");
    if (!card) return;
    const level = levelForXp(xp);
    const prog = xpToNext(xp);
    const pct = prog.need ? Math.round(100 * prog.into / prog.need) : 100;
    const nm = nextMilestone(level);
    const row = document.createElement("div");
    row.className = "scorerow";
    row.style.flexDirection = "column";
    row.style.alignItems = "stretch";
    row.style.gap = "6px";
    row.innerHTML = `<div style="display:flex; justify-content:space-between">
      <span>Lucky Cat \xB7 Lv ${level}</span>
      <span>${prog.into}/${prog.need} xp</span>
    </div>
    <div class="mbar"><i style="width:${pct}%"></i></div>
    <div style="color:var(--muted); font-size:12.5px">${nm ? `Next: Lv ${nm.lv} \u2014 ${nm.name}` : "All milestones unlocked!"}</div>`;
    card.innerHTML = "";
    card.appendChild(row);
  }
  function renderProgress() {
    renderGrowthCard();
    const box = $("#progresslist");
    box.innerHTML = "";
    for (let n = 1; n <= 6; n++) {
      const words = D.levels[String(n)];
      const m = levelMastery(masteryStore, words);
      const row = document.createElement("div");
      row.className = "scorerow";
      row.style.flexDirection = "column";
      row.style.alignItems = "stretch";
      row.style.gap = "6px";
      row.innerHTML = `<div style="display:flex; justify-content:space-between">
        <span>HSK${n}</span>
        <span><b>${m.pct}%</b> mastered \xB7 ${m.seen.toLocaleString()}/${words.length.toLocaleString()} seen</span>
      </div>
      <div class="mbar"><i style="width:${m.pct}%"></i></div>`;
      box.appendChild(row);
    }
    renderNeedsWork();
  }
  function renderNeedsWork() {
    const weak = weakWords(masteryStore, pool).slice(0, 20);
    const list = $("#needswork-list");
    list.innerHTML = "";
    if (!weak.length) {
      list.innerHTML = `<div class="missrow" style="color:var(--muted)">${t("progress.nothing")}</div>`;
    }
    for (const w of weak) {
      const row = document.createElement("div");
      row.className = "missrow";
      row.innerHTML = `<span class="hz">${w.h}</span>
      <span class="det"><span class="py">${w.p}</span> \u2014 ${w.e}${w.t ? " \xB7 " + w.t : ""}</span>`;
      const sp = document.createElement("button");
      sp.className = "sp";
      sp.setAttribute("aria-label", "Play audio");
      sp.replaceChildren(iconSvg("sound"));
      sp.onclick = () => speak(w.h);
      row.appendChild(sp);
      list.appendChild(row);
    }
    const showBtns = weak.length >= 2;
    $("#nw-review").style.display = showBtns ? "block" : "none";
    $("#nw-fight").style.display = showBtns ? "block" : "none";
    $("#nw-review").onclick = () => {
      learnDeck = weak.slice();
      startLearn();
    };
    $("#nw-fight").onclick = () => {
      battleDeckOverride = weak.slice();
      startBattle("round");
    };
  }
  pool = buildPool(D.levels, scope);
  applyStaticI18n();
  syncUiLangChips();
  sfx.pack = shopState.soundpack || "default";
  renderHome();
  renderQuests();
  renderStreet();
  updateNav(currentScreen);
  if (location.hash === "#debug") {
    window.__debugTarget = () => B.zombie && B.zombie.w.h;
    window.__grantXp = (n) => {
      addXp(n);
    };
  }
  initNative({ getScreen: () => currentScreen, goHome: () => {
    stopBattle();
    show("home");
  } });
  var devHost = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    if (devHost) {
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {
      });
      if (window.caches) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k))).catch(() => {
      });
    } else {
      navigator.serviceWorker.register("sw.js").catch(() => {
      });
    }
  }
})();
