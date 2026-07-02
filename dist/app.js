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

  // src/distractors.js
  function shuffle(a, rand) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  var tok = (s) => (s || "").toLowerCase().replace(/[()]/g, "").trim().split(/[ ,;/]+/)[0];
  function pickDistractors(pool2, target, rand = Math.random) {
    const i = pool2.findIndex((w) => w.h === target.h);
    const tTok = tok(target.e);
    const ok = (w) => w.h !== target.h && tok(w.e) !== tTok && !(target.t && w.t === target.t);
    let cands = pool2.slice(Math.max(0, i - 40), i + 41).filter(ok);
    if (cands.length < 3) cands = pool2.filter(ok);
    return shuffle([...cands], rand).slice(0, 3);
  }

  // src/scoring.js
  function killPoints(combo, distFrac) {
    const distBonus = Math.round(8 * Math.max(0, Math.min(1, distFrac)));
    return Math.round((10 + distBonus) * (1 + (combo - 1) * 0.1));
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
  var sfx = {
    enabled: true,
    kill() {
      tone(660, 0.09);
      tone(880, 0.12, "square", 0.15, 0.07);
    },
    // rising blip
    wrong() {
      tone(160, 0.25, "sawtooth", 0.18);
    },
    // buzz
    bite() {
      tone(220, 0.12, "sawtooth", 0.2);
      tone(110, 0.3, "sawtooth", 0.2, 0.1);
    },
    combo(n) {
      const base2 = 700 + Math.min(n, 8) * 60;
      tone(base2, 0.08, "triangle", 0.12);
      tone(base2 * 1.5, 0.1, "triangle", 0.12, 0.06);
    }
  };

  // src/zombie.js
  function drawZombie(ctx3, x, groundY, tMs, state) {
    const speed = state === "dash" ? 3 : 1;
    const ph = tMs / (220 / speed) % (Math.PI * 2);
    const bob = Math.sin(ph) * 2.5;
    const legSwing = Math.sin(ph) * (state === "dash" ? 10 : 6);
    const dying = state === "dying";
    ctx3.save();
    ctx3.translate(x, groundY);
    if (dying) {
      ctx3.globalAlpha = 0.5;
      ctx3.rotate(0.9);
    }
    ctx3.strokeStyle = "#3f6b33";
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
    ctx3.fillStyle = "#5d4a63";
    ctx3.fillRect(-11, -40 + bob, 22, 22);
    ctx3.strokeStyle = "#7ec850";
    ctx3.lineWidth = 5;
    ctx3.beginPath();
    ctx3.moveTo(-9, -34 + bob);
    ctx3.lineTo(-24, -30 + bob + legSwing * 0.3);
    ctx3.stroke();
    ctx3.beginPath();
    ctx3.moveTo(-9, -28 + bob);
    ctx3.lineTo(-22, -24 + bob - legSwing * 0.3);
    ctx3.stroke();
    ctx3.fillStyle = "#8fce58";
    ctx3.beginPath();
    ctx3.arc(0, -48 + bob, 10, 0, 7);
    ctx3.fill();
    ctx3.fillStyle = "#1c241a";
    ctx3.beginPath();
    ctx3.arc(-4, -50 + bob, 1.8, 0, 7);
    ctx3.fill();
    ctx3.fillRect(-7, -44 + bob, 6, 1.6);
    ctx3.strokeStyle = "#3f6b33";
    ctx3.lineWidth = 2;
    ctx3.beginPath();
    ctx3.moveTo(0, -58 + bob);
    ctx3.lineTo(2, -62 + bob);
    ctx3.stroke();
    ctx3.restore();
  }

  // src/mastery.js
  function recordAnswer(store2, hanzi, correct) {
    const w = store2[hanzi] || (store2[hanzi] = { s: 0, k: 0, r: 0 });
    w.s++;
    if (correct) {
      w.k++;
      w.r++;
    } else {
      w.r = 0;
    }
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

  // src/main.js
  var D = window.HSK_DATA;
  var $ = (s) => document.querySelector(s);
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
    { levels: [3], core: false, newOnly: false, topN: 0, lang: "both" },
    store.get("scope", {})
  );
  var settings = Object.assign({ autoSpeak: true }, store.get("settings", {}));
  sfx.enabled = store.get("sfx", true);
  var pool = [];
  var learnDeck = null;
  var battleDeckOverride = null;
  var lastMode = "round";
  var masteryStore = store.get("mastery", {});
  function noteAnswer(hanzi, correct) {
    recordAnswer(masteryStore, hanzi, correct);
    store.set("mastery", masteryStore);
  }
  function shuffle2(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  fetch("audio/index.json").then((r) => r.json()).then((ix) => initAudio(ix)).catch(() => initAudio([]));
  var currentScreen = "home";
  function show(name) {
    currentScreen = name;
    document.querySelectorAll(".screen").forEach((el) => el.classList.remove("on"));
    $("#s-" + name).classList.add("on");
  }
  document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => {
    const t = b.dataset.go;
    if (t === "scope") {
      renderScope();
      show("scope");
    } else if (t === "scope-learn") {
      renderScope();
      show("scope");
    } else if (t === "scores") {
      renderScores();
      show("scores");
    } else if (t === "progress") {
      renderProgress();
      show("progress");
    } else {
      if (t === "home") {
        stopBattle();
      }
      show(t);
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
    $("#readout").innerHTML = `Pool: <b>${pool.length.toLocaleString()}</b> words \xB7 ~<b>${coveragePct(pool, D.manifest, scope.levels)}%</b> of exam text` + (scope.lang !== "en" && noThai ? `<div class="warn">* ${noThai.toLocaleString()} long-tail words have no Thai yet \u2014 English shown instead.</div>` : "");
    store.set("scope", scope);
    const startable = pool.length >= 8;
    $("#go-battle").disabled = $("#go-endless").disabled = $("#go-learn").disabled = !startable;
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
    $("#fc-count").textContent = `${fc.done} done \xB7 ${fc.deck.length - fc.i} left`;
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
    else fc.done++;
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
  var GROUND = 30;
  var BEAR_X = 52;
  function sizeCanvas() {
    const w = cv.clientWidth, h = Math.round(Math.min(window.innerHeight * 0.4, 340));
    const dpr = window.devicePixelRatio || 1;
    cv.style.height = h + "px";
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    B.w = w;
    B.h = h;
  }
  window.addEventListener("resize", () => {
    if (B.on) sizeCanvas();
  });
  function pickWord() {
    const deck = B.deck;
    for (let tries = 0; tries < 40; tries++) {
      let total = 0;
      for (const w of deck) total += Math.sqrt(w.f) + 1;
      let r = Math.random() * total;
      for (const w of deck) {
        r -= Math.sqrt(w.f) + 1;
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
    battleDeckOverride = null;
    B.zombie = null;
    B.proj = null;
    B.parts = [];
    B.flash = 0;
    B.score = 0;
    B.combo = 0;
    B.lives = 3;
    B.wordsTotal = mode === "round" ? 20 : Infinity;
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
    const avg = scope.levels.reduce((a, b) => a + b, 0) / scope.levels.length;
    B.speed = 30 * (1 + (avg - 1) * 0.1);
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
  $("#hud-quit").onclick = () => {
    endBattle(true);
  };
  $("#hud-sfx").onclick = () => {
    sfx.enabled = !sfx.enabled;
    store.set("sfx", sfx.enabled);
    $("#hud-sfx").textContent = sfx.enabled ? "\u{1F514}" : "\u{1F515}";
  };
  $("#hud-audio").onclick = () => {
    settings.autoSpeak = !settings.autoSpeak;
    store.set("settings", settings);
    $("#hud-audio").textContent = settings.autoSpeak ? "\u{1F50A}" : "\u{1F507}";
  };
  function updateHud() {
    $("#hud-lives").textContent = "\u2764\uFE0F".repeat(B.lives) + "\u{1F5A4}".repeat(Math.max(0, 3 - B.lives));
    $("#hud-score").textContent = B.score;
    $("#hud-combo").textContent = B.combo >= 2 ? "\xD7" + B.combo + " \u{1F525}" : "";
    $("#hud-left").textContent = B.mode === "round" ? B.wordsTotal - B.resolved + " left" : "\u221E";
    $("#hud-sfx").textContent = sfx.enabled ? "\u{1F514}" : "\u{1F515}";
    $("#hud-audio").textContent = settings.autoSpeak ? "\u{1F50A}" : "\u{1F507}";
  }
  function pushMiss(w) {
    if (!B.missSet.has(w.h)) {
      B.missSet.add(w.h);
      B.misses.push(w);
    }
  }
  function spawnZombie() {
    const w = pickWord();
    B.zombie = { w, x: B.w + 30, state: "walk", wob: Math.random() * 7 };
    B.spawned++;
    B.locked = false;
    if (settings.autoSpeak) speak(w.h);
    renderOptions(w);
    B.speed *= 1.03;
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
    const z = B.zombie;
    if (!z || z.state !== "walk" || B.locked) return;
    B.attempts++;
    noteAnswer(z.w.h, o.h === z.w.h);
    if (o.h === z.w.h) {
      B.correct++;
      B.combo++;
      const distFrac = Math.max(0, z.x - BEAR_X - 34) / (B.w - BEAR_X - 34);
      B.score += killPoints(B.combo, distFrac);
      sfx.kill();
      hapticKill();
      if (B.combo >= 3) sfx.combo(B.combo);
      btn.classList.add("good");
      lockOptions();
      B.proj = { x: BEAR_X + 16, y: B.h - GROUND - 30 };
      speak(z.w.h);
    } else {
      B.combo = 0;
      sfx.wrong();
      sfx.bite();
      hapticWrong();
      btn.classList.add("bad");
      lockOptions();
      revealCorrect(z.w);
      pushMiss(z.w);
      B.lives--;
      B.flash = 1;
      B.resolved++;
      scheduleNext(900);
    }
    updateHud();
  }
  function scheduleNext(ms) {
    B.zombie = null;
    B.proj = null;
    B.nextAt = performance.now() + ms;
  }
  function killZombie(z) {
    const gy = B.h - GROUND;
    for (let i = 0; i < 12; i++) B.parts.push({ x: z.x, y: gy - 16, vx: (Math.random() - 0.5) * 240, vy: -Math.random() * 200, life: 0.6 });
    z.state = "dying";
    B.dyingUntil = performance.now() + 250;
    B.proj = null;
    B.resolved++;
  }
  function bite(timedOut) {
    const z = B.zombie;
    if (timedOut) {
      B.attempts++;
      B.combo = 0;
      noteAnswer(z.w.h, false);
      pushMiss(z.w);
      revealCorrect(z.w);
      lockOptions();
    }
    sfx.bite();
    B.lives--;
    B.flash = 1;
    B.resolved++;
    scheduleNext(1500);
    updateHud();
  }
  function loop(t) {
    if (!B.on) return;
    const dt = Math.min(0.05, (t - (B.lastT || t)) / 1e3);
    B.lastT = t;
    if (!B.zombie && t >= B.nextAt) {
      if (B.lives > 0 && B.spawned < B.wordsTotal) spawnZombie();
      else {
        endBattle(false);
        return;
      }
    }
    const z = B.zombie;
    if (z) {
      if (z.state === "walk") {
        z.x -= B.speed * dt;
        if (z.x <= BEAR_X + 34) bite(true);
      } else if (z.state === "dash") {
        z.x -= B.speed * 7 * dt;
        if (z.x <= BEAR_X + 34) bite(false);
      } else if (z.state === "dying" && t >= B.dyingUntil) {
        scheduleNext(200);
      }
    }
    if (B.proj && B.zombie) {
      B.proj.x += 560 * dt;
      if (B.proj.x >= B.zombie.x - 8) killZombie(B.zombie);
    }
    for (const p of B.parts) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 500 * dt;
      p.life -= dt;
    }
    B.parts = B.parts.filter((p) => p.life > 0);
    B.flash = Math.max(0, B.flash - 2.2 * dt);
    draw(t);
    requestAnimationFrame(loop);
  }
  function draw(t) {
    ctx2.clearRect(0, 0, B.w, B.h);
    const gy = B.h - GROUND;
    ctx2.strokeStyle = "#6b5a34";
    ctx2.lineWidth = 3;
    ctx2.beginPath();
    ctx2.moveTo(0, gy + 12);
    ctx2.lineTo(B.w, gy + 12);
    ctx2.stroke();
    ctx2.textAlign = "center";
    ctx2.font = "36px serif";
    ctx2.fillText("\u{1F43B}", BEAR_X, gy + 6);
    ctx2.font = "22px serif";
    ctx2.fillText("\u{1F36F}", 16, gy + 8);
    const z = B.zombie;
    if (z) {
      const wob = Math.sin(t / 160 + z.wob) * 3;
      ctx2.font = "600 26px 'Segoe UI',sans-serif";
      const lw = Math.max(ctx2.measureText(z.w.h).width, 64) + 22;
      const cx = Math.min(Math.max(z.x, lw / 2 + 6), B.w - lw / 2 - 6);
      ctx2.fillStyle = z.state === "dash" ? "rgba(255,214,204,.97)" : "rgba(255,240,210,.97)";
      ctx2.strokeStyle = z.state === "dash" ? "#e05a4e" : "#ffb347";
      ctx2.lineWidth = 2.5;
      roundRect(cx - lw / 2, gy - 118, lw, 52, 10);
      ctx2.fill();
      ctx2.stroke();
      ctx2.fillStyle = "#1c241a";
      ctx2.fillText(z.w.h, cx, gy - 96);
      ctx2.font = "13px 'Segoe UI',sans-serif";
      ctx2.fillStyle = "#7a5b17";
      ctx2.fillText(z.w.p, cx, gy - 76);
      drawZombie(ctx2, z.x, gy + 6, t, z.state);
    }
    if (B.proj) {
      ctx2.font = "20px serif";
      ctx2.fillText("\u{1F36F}", B.proj.x, B.proj.y);
    }
    ctx2.fillStyle = "#8fce58";
    for (const p of B.parts) {
      ctx2.globalAlpha = Math.max(0, p.life / 0.6);
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, 3.4, 0, 7);
      ctx2.fill();
    }
    ctx2.globalAlpha = 1;
    if (B.flash > 0) {
      ctx2.fillStyle = `rgba(224,90,78,${(0.38 * B.flash).toFixed(3)})`;
      ctx2.fillRect(0, 0, B.w, B.h);
    }
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
  function endBattle(quit) {
    stopBattle();
    if (quit) {
      show("home");
      return;
    }
    const acc = B.attempts ? Math.round(100 * B.correct / B.attempts) : 0;
    $("#r-score").textContent = B.score;
    const key = scopeKey(scope) + "\xB7" + B.mode;
    const best = store.get("best", {});
    const prev = best[key] ? best[key].score : 0;
    const isBest = B.score > prev;
    if (isBest) {
      best[key] = { score: B.score, date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) };
      store.set("best", best);
    }
    $("#r-sub").innerHTML = `${acc}% accuracy \xB7 ${B.correct} kills \xB7 ${key}` + (isBest ? ` \xB7 <b style="color:var(--amber)">new best!</b>` : ` \xB7 best ${prev}`);
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
      sp.textContent = "\u{1F50A}";
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
    box.innerHTML = keys.length ? "" : `<div class="scorerow" style="color:var(--muted)">No scores yet \u2014 go fight some zombies!</div>`;
    for (const k of keys) {
      const row = document.createElement("div");
      row.className = "scorerow";
      row.innerHTML = `<span>${k}</span><span><b>${best[k].score}</b> <span style="color:var(--muted);font-size:12px">${best[k].date}</span></span>`;
      box.appendChild(row);
    }
  }
  function renderProgress() {
    const box = $("#progresslist");
    box.innerHTML = "";
    for (let n = 1; n <= 6; n++) {
      const words = D.levels[String(n)];
      const m = levelMastery(masteryStore, words);
      const row = document.createElement("div");
      row.className = "scorerow";
      row.innerHTML = `<span>HSK${n}</span>
      <span><b>${m.pct}%</b> mastered \xB7 ${m.seen.toLocaleString()}/${words.length.toLocaleString()} seen</span>`;
      box.appendChild(row);
    }
  }
  pool = buildPool(D.levels, scope);
  if (location.hash === "#debug") {
    window.__debugTarget = () => B.zombie && B.zombie.w.h;
  }
  initNative({ getScreen: () => currentScreen, goHome: () => {
    stopBattle();
    show("home");
  } });
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {
    });
  }
})();
