"use strict";
import { buildPool, coveragePct, scopeKey, meaning as meaningOf, normalizeLen, modeKey } from "./pool.js";
import { pickDistractors } from "./distractors.js";
import { killPoints } from "./scoring.js";
import { coinBurst, comboFloater, fireworkRing, feedbackEffect, perfectBonus } from "./fx.js";
import { sfx } from "./sfx.js";
import { drawCat } from "./cat.js";
import { uiScale, layout } from "./layout.js";
import { loadSprites, sprite } from "./sprites.js";
import { preload as preloadAssets } from "./assets.js";
import { recordAnswer, levelMastery } from "./mastery.js";
import { levelForXp, xpToNext, accessoriesFor, nextMilestone, MILESTONES } from "./growth.js";
import { wordWeight, smartDeck, weakWords } from "./srs.js";
import { defaultDaily, noteActivity, streakInfo } from "./daily.js";
import { defaultQuestState, noteQuestEvent, questStatus } from "./quests.js";
import { isBossSpawn, bossPoints, bossSpeedFactor } from "./boss.js";
import { initAudio, speak } from "./audio.js";
import { initNative, hapticKill, hapticWrong, keepAwake } from "./native.js";
import { CATALOG, SKIN_PALETTES, defaultShop, canAfford, buy, equipItem } from "./shop.js";
import { streetPieces, streetProgress } from "./street.js";
import { iconSvg, setIconLabel, setIconOnly, setPill } from "./icons.js";
import { t, setLocale, getLocale, detectLocale } from "./i18n.js";

/* ============================== data & state ============================== */
const D = window.HSK_DATA;
const $ = s => document.querySelector(s);
const store = {
  get(k, d){ try{ const v = localStorage.getItem("nbhsk."+k); return v===null? d : JSON.parse(v);}catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem("nbhsk."+k, JSON.stringify(v)); }catch(e){} }
};
const scope = Object.assign({levels:[3], core:false, newOnly:false, topN:0, lang:"both", sessionLen:20},
                            store.get("scope", {}));
let settings = Object.assign({autoSpeak:true, showPinyin:true}, store.get("settings", {}));
// UI language: persisted choice wins, else device language. i18n.js is pure,
// so persistence lives here (nbhsk.locale), like every other nbhsk.* key.
setLocale(store.get("locale", detectLocale()));
sfx.enabled = store.get("sfx", true);
let pool = [];            // current merged word pool
let learnDeck = null;     // override deck for "review misses"
let lenCustomOpen = false;  // "Custom" chip tapped; input visible even if value matches a preset
let battleDeckOverride = null;  // when set, next battle draws only these words (e.g. "fight misses")
let lastMode = "round";
let masteryStore = store.get("mastery", {});
function noteAnswer(hanzi, correct){
  recordAnswer(masteryStore, hanzi, correct);
  store.set("mastery", masteryStore);
}
let wallet = store.get("wallet", 0);
let shopState = Object.assign(defaultShop(), store.get("shop", {}));
function updateWalletChip(){ setPill($("#home-wallet"), "secondary-coin", wallet.toLocaleString()); }

/* ============================== cat growth (xp/levels/accessories) ============================== */
let xp = store.get("xp", 0);
function updateLevelChip(){ const el = $("#home-level"); if(el) setPill(el, "paw", `Lv ${levelForXp(xp)}`); }
function addXp(n){
  const before = levelForXp(xp);
  xp += n;
  store.set("xp", xp);
  const after = levelForXp(xp);
  if(after > before && B.on){
    B.levelUps = (B.levelUps||[]).concat({from:before, to:after});
    const acc = accessoriesFor(after);
    B.acc = acc.filter(id=>id!=="kitten");
    B.hasKitten = acc.includes("kitten");
  }
  if(after > before) renderStreet();
  updateLevelChip();
}

/* ============================== daily streak ============================== */
// local calendar date (not UTC) — a daily habit should reset at the player's
// own midnight, not UTC's.
const todayStr = () => {
  const d = new Date();
  const mm = String(d.getMonth()+1).padStart(2,"0"), dd = String(d.getDate()).padStart(2,"0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};
let daily = Object.assign(defaultDaily(), store.get("daily", {}));
daily.today = Object.assign({date:"", resolved:0}, daily.today);
function updateStreakChip(){
  const info = streakInfo(daily, todayStr());
  const el = $("#home-streak");
  el.replaceChildren(iconSvg("streak"), document.createTextNode(info.goalMet
    ? ` ${info.streak} · complete today`
    : ` ${info.streak} · ${info.todayResolved}/${info.goal} today`));
}
function noteDaily(count){
  daily = noteActivity(daily, todayStr(), count);
  store.set("daily", daily);
  updateStreakChip();
}

/* ============================== daily quests ============================== */
let questState = Object.assign(defaultQuestState(), store.get("quests", {}));
let questToasts = [];  // quests completed during the current battle, for the results screen
function questEvent(eventId, n=1){
  const r = noteQuestEvent(questState, todayStr(), eventId, n);
  questState = r.state;
  store.set("quests", questState);
  if(r.earned > 0){ wallet += r.earned; store.set("wallet", wallet); updateWalletChip(); }
  if(r.completed.length) questToasts.push(...r.completed);
  renderQuests();
}
function renderQuests(){
  const panel = $("#quest-panel");
  if(!panel) return;
  panel.innerHTML = "";
  for(const q of questStatus(questState, todayStr())){
    const row = document.createElement("div");
    row.className = "quest-row"+(q.done? " done":"");
    row.innerHTML = `<span class="qi">${q.done? t("quest.status.done") : t("quest.status.open")}</span>
      <span class="qd">${t("quest."+q.id)}</span>
      <span class="qp">${q.progress}/${q.target}</span>
      <span class="qr">${t("quest.reward", { reward: q.reward })}</span>`;
    panel.appendChild(row);
  }
}
function updateSmartBtn(){
  const deck = smartDeck(masteryStore, pool, Date.now());
  const btn = $("#go-smart");
  btn.disabled = deck.length < 8;
  // below the 8-word minimum, show progress toward it ("6/8") so the disabled
  // button reads as "not enough yet" rather than broken
  setIconLabel(btn, "target", !deck.length ? t("scope.smartReview")
    : deck.length < 8 ? t("scope.smartReviewProgress", { have: deck.length })
    : t("scope.smartReviewReady", { n: deck.length }));
}
$("#go-smart").onclick = ()=>{
  const deck = smartDeck(masteryStore, pool, Date.now());
  if(deck.length < 8) return;
  battleDeckOverride = deck;
  questEvent("review");
  startBattle("round");
};

function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

/* ============================== audio (pre-recorded mp3 first, Web Speech fallback) ============================== */
// index.json lists which words have a bundled mp3; fetch fails silently on file://
// (keeping TTS-only), which is fine per the file:// constraint.
fetch("audio/index.json").then(r=>r.json()).then(ix=>initAudio(ix)).catch(()=>initAudio([]));

/* ============================== sprite preload ============================== */
loadSprites();
preloadAssets();

/* ============================== i18n DOM binding ============================== */
// Localizes any static markup annotated with data-i18n* attributes. Dynamic
// strings (built in JS) call t() directly at render time.
function applyStaticI18n(root = document){
  root.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.getAttribute("data-i18n")); });
  root.querySelectorAll("[data-i18n-title]").forEach(el => {
    const v = t(el.getAttribute("data-i18n-title"));
    el.title = v; el.setAttribute("aria-label", v);
  });
  root.querySelectorAll("[data-i18n-ph]").forEach(el => { el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph"))); });
  document.documentElement.lang = getLocale();
}

/* ============================== screens ============================== */
let currentScreen = "home";
function show(name){
  currentScreen = name;
  document.querySelectorAll(".screen").forEach(el=>el.classList.remove("on"));
  $("#s-"+name).classList.add("on");
  if(name==="home"){ renderQuests(); renderStreet(); }
}
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click", ()=>{
  const t = b.dataset.go;
  if(t==="scope"){ renderScope(); show("scope"); }
  else if(t==="scope-learn"){ renderScope(); show("scope"); }
  else if(t==="scores"){ renderScores(); show("scores"); }
  else if(t==="progress"){ renderProgress(); show("progress"); }
  else if(t==="shop"){ renderShop(); show("shop"); }
  else { if(t==="home"){ stopBattle(); } show(t); }
}));

/* ============================== scope selector ============================== */
function renderScope(){
  const lvBox = $("#lv-chips");
  lvBox.innerHTML = "";
  for(let n=1;n<=6;n++){
    const b = document.createElement("button");
    b.className = "chip"+(scope.levels.includes(n)?" on":"");
    b.textContent = "HSK"+n;
    b.onclick = ()=>{
      const i = scope.levels.indexOf(n);
      if(i>=0){ if(scope.levels.length>1) scope.levels.splice(i,1); }
      else scope.levels.push(n);
      scope.levels.sort();
      renderScope();
    };
    lvBox.appendChild(b);
  }
  $("#f-core").classList.toggle("on", scope.core);
  $("#f-new").classList.toggle("on", scope.newOnly);
  document.querySelectorAll("#topn-chips .chip").forEach(c=>c.classList.toggle("on", +c.dataset.n===scope.topN));
  document.querySelectorAll("#lang-chips .chip").forEach(c=>c.classList.toggle("on", c.dataset.lang===scope.lang));
  pool = buildPool(D.levels, scope);
  const noThai = pool.filter(w=>!w.t).length;
  $("#readout").innerHTML =
    t("scope.readout", { count: pool.length.toLocaleString(), pct: coveragePct(pool, D.manifest, scope.levels) })
    + (scope.lang !== "en" && noThai ? `<div class="warn">${t("scope.readoutNoThai", { n: noThai.toLocaleString() })}</div>` : "");
  const len = normalizeLen(scope.sessionLen);
  scope.sessionLen = len;
  if(![20,40,100].includes(len)) lenCustomOpen = true;
  document.querySelectorAll("#len-chips .chip").forEach(c=>{
    const on = c.dataset.len==="custom" ? lenCustomOpen : (!lenCustomOpen && +c.dataset.len===len);
    c.classList.toggle("on", on);
  });
  const lenInput = $("#len-custom");
  lenInput.hidden = !lenCustomOpen;
  if(lenCustomOpen && document.activeElement !== lenInput) lenInput.value = len;
  setIconLabel($("#go-battle"), "quest", t("scope.wordQuest", { n: len }));
  store.set("scope", scope);
  const startable = pool.length >= 8;
  $("#go-battle").disabled = $("#go-endless").disabled = $("#go-learn").disabled = !startable;
  updateSmartBtn();
}
$("#f-core").onclick = ()=>{ scope.core = !scope.core; renderScope(); };
$("#f-new").onclick  = ()=>{ scope.newOnly = !scope.newOnly; renderScope(); };
document.querySelectorAll("#topn-chips .chip").forEach(c=>c.onclick = ()=>{ scope.topN = +c.dataset.n; renderScope(); });
document.querySelectorAll("#lang-chips .chip").forEach(c=>c.onclick = ()=>{ scope.lang = c.dataset.lang; renderScope(); });
function setUiLocale(l){
  setLocale(l);
  store.set("locale", getLocale());
  applyStaticI18n();
  syncUiLangChips();
  renderScope();   // refresh dynamic scope labels (Word Quest · N, readout, Smart Review)
}
function syncUiLangChips(){
  document.querySelectorAll("#ui-lang-chips .chip").forEach(c => c.classList.toggle("on", c.dataset.uilang === getLocale()));
}
document.querySelectorAll("#ui-lang-chips .chip").forEach(c => c.onclick = () => setUiLocale(c.dataset.uilang));
document.querySelectorAll("#len-chips .chip").forEach(c=>c.onclick = ()=>{
  if(c.dataset.len==="custom"){ lenCustomOpen = true; renderScope(); $("#len-custom").focus(); }
  else { lenCustomOpen = false; scope.sessionLen = +c.dataset.len; renderScope(); }
});
$("#len-custom").addEventListener("input", ()=>{
  scope.sessionLen = normalizeLen($("#len-custom").value);
  store.set("scope", scope);
  setIconLabel($("#go-battle"), "quest", t("scope.wordQuest", { n: scope.sessionLen }));
});
$("#len-custom").addEventListener("change", ()=>renderScope());  // blur/Enter: snap display to normalized value
document.querySelectorAll("#preset-chips .chip").forEach(c=>c.onclick = ()=>{
  scope.levels = c.dataset.preset.split(",").map(Number); renderScope();
});
$("#go-battle").onclick  = ()=>startBattle("round");
$("#go-endless").onclick = ()=>startBattle("endless");
$("#go-learn").onclick   = ()=>{ learnDeck = null; startLearn(); };

/* ============================== flashcards ============================== */
const fc = {deck:[], i:0, flipped:false, done:0, total:0};
function startLearn(){
  const src = learnDeck && learnDeck.length ? learnDeck : pool;
  fc.fromMisses = !!(learnDeck && learnDeck.length);  // came from a battle's "review misses"
  fc.deck = shuffle(src.slice(0, 400));       // session cap keeps it sane
  fc.i = 0; fc.done = 0; fc.total = fc.deck.length; fc.flipped = false;
  show("learn");
  renderCard();
}
function endLearn(){ show(fc.fromMisses ? "results" : "home"); }
function renderCard(){
  const w = fc.deck[fc.i];
  if(!w){ endLearn(); return; }
  $("#fc-count").textContent = t("learn.count", { done: fc.done, left: fc.deck.length - fc.i });
  const c = $("#fc-card");
  if(!fc.flipped){
    c.innerHTML = `<div class="hz">${w.h}</div><div class="py">${w.p}</div>
      <div class="hint">tap to flip · HSK${w.lv} · in ${w.ta}/${w.tt} papers</div>`;
    if(settings.autoSpeak) speak(w.h);
  }else{
    const th = w.t? `<div class="th">${w.t}</div>` : `<div class="th" style="color:var(--muted)">no Thai yet</div>`;
    c.innerHTML = `<div class="hz" style="font-size:40px">${w.h}</div><div class="py">${w.p}</div>
      <div class="mean">${w.e}${th}</div><div class="hint">tap to flip back</div>`;
  }
}
$("#fc-card").onclick = ()=>{ fc.flipped = !fc.flipped; renderCard(); };
$("#fc-spk").onclick = e=>{ e.stopPropagation(); const w=fc.deck[fc.i]; if(w) speak(w.h); };
function nextCard(keep){
  const w = fc.deck[fc.i];
  noteAnswer(w.h, !keep);        // "know it" (keep=false) = correct; "still learning" = incorrect
  if(keep) fc.deck.push(w);      // still learning → resurfaces at the end
  else { fc.done++; noteDaily(1); questEvent("learn"); addXp(1); }   // "know it" counts toward the daily goal, one tap at a time
  fc.i++; fc.flipped = false;
  if(fc.i >= fc.deck.length){ endLearn(); return; }
  renderCard();
}
$("#fc-know").onclick  = ()=>nextCard(false);
$("#fc-again").onclick = ()=>nextCard(true);

/* ============================== battle ============================== */
/* Lucky-cat pattern: side view, one cat walks in from the right toward
   the mascot; 4 meaning choices; ONE attempt per word — a wrong tap makes the
   cat wander off and costs a heart. No retrying, so random guessing is fatal. */
const cv = $("#cv"), ctx = cv.getContext("2d");
const B = {on:false};
function sizeCanvas(){
  // CSS drives the box: .cv-wrap (flex:1) fills between HUD and options, and
  // #cv fills that box exactly (no forced aspect ratio). We just read the
  // measured size, build a crisp DPR buffer from it, and derive the UI scale
  // + layout constants (see layout.js) that every battle draw uses.
  const w = cv.clientWidth, h = cv.clientHeight;
  const dpr = window.devicePixelRatio||1;
  cv.width = Math.round(w*dpr); cv.height = Math.round(h*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  B.w = w; B.h = h;
  B.S = uiScale(w,h); B.L = layout(w,h);
  if(B.speedBase) B.speed = B.speedBase * (B.w/380);
}
const cvRO = new ResizeObserver(()=>{ if(B.on) sizeCanvas(); });
cvRO.observe(cv);
window.addEventListener("resize", ()=>{ if(B.on) sizeCanvas(); });

function pickWord(){
  const deck = B.deck;
  const now = Date.now();
  const weight = w => (Math.sqrt(w.f)+1) * wordWeight(masteryStore[w.h], now);
  // frequency-weighted (mastery-modulated), avoiding the last few words
  for(let tries=0; tries<40; tries++){
    let total = 0;
    for(const w of deck) total += weight(w);
    let r = Math.random()*total;
    for(const w of deck){
      r -= weight(w);
      if(r<=0){
        if(!B.recent.includes(w.h)) { B.recent.push(w.h); if(B.recent.length>8) B.recent.shift(); return w; }
        break;
      }
    }
  }
  return deck[Math.floor(Math.random()*deck.length)];
}
function startBattle(mode){
  lastMode = mode;
  B.on = true; B.mode = mode;
  // A miss deck can be as small as 2 (only 3 lives => at most 3 misses per round);
  // distractors fall back to the full pool for small decks, so 2 is safe.
  B.deck = (battleDeckOverride && battleDeckOverride.length >= 2) ? battleDeckOverride : pool;
  battleDeckOverride = null;
  B.zombie = null; B.proj = null; B.parts = []; B.flash = 0; B.screenShake = 0; B.feedback = null;
  B.floats = []; B.mascotHopUntil = 0;
  B.score = 0; B.combo = 0; B.lives = 3;
  B.wordsTotal = mode==="round"? normalizeLen(scope.sessionLen) : Infinity;
  B.spawned = 0; B.resolved = 0; B.correct = 0; B.attempts = 0;
  B.recent = []; B.misses = []; B.missSet = new Set();
  B.nextAt = 0; B.lastT = 0; B.locked = false;
  questToasts = [];
  B.levelUps = [];
  const acc0 = accessoriesFor(levelForXp(xp));
  B.acc = acc0.filter(id=>id!=="kitten");
  B.hasKitten = acc0.includes("kitten");
  // higher scopes walk faster (difficulty by level), and speed ramps per word;
  // speedBase is px/s at the 380-wide reference, sizeCanvas() derives the
  // actual B.speed from the measured canvas width so travel time stays
  // device-independent (a wide screen doesn't give more thinking time).
  const avg = scope.levels.reduce((a,b)=>a+b,0)/scope.levels.length;
  B.speedBase = 30 * (1 + (avg-1)*0.10);
  show("battle");
  keepAwake(true);
  sizeCanvas();
  updateHud();
  $("#opts").innerHTML = "";
  requestAnimationFrame(loop);
}
function stopBattle(){ B.on = false; keepAwake(false); if(window.speechSynthesis) speechSynthesis.cancel(); }
$("#hud-quit").onclick = ()=>{ endBattle(true); };
$("#hud-sfx").onclick = ()=>{ sfx.enabled = !sfx.enabled; store.set("sfx", sfx.enabled); setIconOnly($("#hud-sfx"), sfx.enabled ? "bell" : "bell-off"); };
$("#hud-audio").onclick = ()=>{
  settings.autoSpeak = !settings.autoSpeak;
  store.set("settings", settings);
  setIconOnly($("#hud-audio"), settings.autoSpeak ? "sound" : "muted");
};
/* pinyin toggle: hides the romanization on the battle word plate (quiz mode) so
   advanced learners test pure character recall. Persisted like autoSpeak. */
$("#hud-pinyin").onclick = ()=>{
  settings.showPinyin = !settings.showPinyin;
  store.set("settings", settings);
  setIconOnly($("#hud-pinyin"), settings.showPinyin ? "pinyin" : "pinyin-off");
};
/* home-screen sound toggle mirrors hud-sfx; the button dims when muted. */
$("#home-sound").addEventListener("click", ()=>{
  sfx.enabled = !sfx.enabled;
  store.set("sfx", sfx.enabled);
  $("#home-sound").classList.toggle("muted", !sfx.enabled);
  updateHud();
});
$("#home-sound").classList.toggle("muted", !sfx.enabled);
function updateHud(){
  const lives = $("#hud-lives");
  lives.replaceChildren();
  for(let i=0;i<3;i++){
    const h = iconSvg("heart");
    h.classList.add("life-icon", i < B.lives ? "full" : "empty");
    lives.appendChild(h);
  }
  $("#hud-score").textContent = B.score;
  $("#hud-combo").textContent = B.combo>=2? "x"+B.combo:"";
  $("#hud-left").textContent = B.mode==="round"? (B.wordsTotal-B.resolved)+" left":"endless";
  setIconOnly($("#hud-sfx"), sfx.enabled ? "bell" : "bell-off");
  setIconOnly($("#hud-audio"), settings.autoSpeak ? "sound" : "muted");
  setIconOnly($("#hud-pinyin"), settings.showPinyin ? "pinyin" : "pinyin-off");
}
function pushMiss(w){ if(!B.missSet.has(w.h)){ B.missSet.add(w.h); B.misses.push(w); } }
function spawnZombie(){
  const w = pickWord();
  B.zombie = {w, x: B.w+30, state:"walk"};
  B.spawned++; B.locked = false;
  if(isBossSpawn(B.spawned)){
    B.zombie.boss = true; B.zombie.stage = "meaning";
    sfx.combo(5);   // boss-arrival sting
  }
  if(settings.autoSpeak) speak(w.h);
  renderOptions(w);
  // per-word ramp on the unscaled base, then re-derive the screen-scaled
  // speed (a plain B.speed *= 1.03 would be wiped by the next resize)
  B.speedBase *= 1.03;
  B.speed = B.speedBase * (B.w/380);
}
function renderOptions(word){
  const opts = shuffle([word, ...pickDistractors(B.deck.length >= 8 ? B.deck : pool, word)]);
  const box = $("#opts");
  box.innerHTML = "";
  for(const o of opts){
    const m = meaningOf(o, scope.lang);
    const b = document.createElement("button");
    b.innerHTML = m.main + (m.sub? `<span class="th">${m.sub}</span>`:"");
    b._w = o;
    b.onclick = ()=>answer(b, o);
    box.appendChild(b);
  }
}
// Boss stage 2: reverse question — meaning shown as a prompt, pick the hanzi.
// Reuses the same #opts grid; a prompt div spans both columns above the buttons.
function renderBossHanzi(word){
  const opts = shuffle([word, ...pickDistractors(B.deck.length >= 8 ? B.deck : pool, word)]);
  const box = $("#opts");
  box.innerHTML = "";
  const m = meaningOf(word, scope.lang);
  const prompt = document.createElement("div");
  prompt.style.cssText = "grid-column:1/-1; text-align:center; font-weight:700; color:var(--gold); padding:2px 4px 8px;";
  prompt.textContent = `Review Challenge · pick the hanzi for: ${m.main}`;
  box.appendChild(prompt);
  for(const o of opts){
    const b = document.createElement("button");
    b.innerHTML = o.h + `<span class="th">${o.p}</span>`;
    b._w = o;
    b.onclick = ()=>answer(b, o);
    box.appendChild(b);
  }
}
function lockOptions(){
  B.locked = true;
  document.querySelectorAll("#opts button").forEach(b=>b.disabled = true);
}
function revealCorrect(word){
  document.querySelectorAll("#opts button").forEach(b=>{
    if(b._w && b._w.h===word.h) b.classList.add("good");
  });
}
function answer(btn, o){
  const z = B.zombie;
  if(!z || z.state!=="walk" || B.locked) return;
  const boss = z.boss;
  const correct = o.h === z.w.h;
  if(!boss){
    B.attempts++;
    noteAnswer(z.w.h, correct);
  }else if(z.stage === "meaning"){
    B.attempts++;   // boss word counts as ONE attempt, taken on the first tap
  }
  if(correct && boss && z.stage === "meaning"){
    // stage 1 passed: no kill yet, advance to the reverse (hanzi) question.
    // Freeze the walk (not the render state, so the sprite keeps animating)
    // so the brief pause can't cost a free bite.
    z.frozen = true;
    btn.classList.add("good");
    lockOptions();
    setTimeout(()=>{
      if(!B.on || B.zombie !== z) return;   // battle moved on/ended meanwhile
      z.stage = "hanzi"; z.frozen = false;
      renderBossHanzi(z.w);
      B.locked = false;
    }, 500);
    updateHud();
    return;
  }
  if(correct){
    B.correct++; B.combo++;
    questEvent("correct");
    questEvent("combo", B.combo);
    if(boss) questEvent("boss");
    addXp(boss ? 5 : 1);   // boss final kill is worth +5 total, not +1 then +5
    // farther kill = bigger bonus (replaces the old time bonus)
    const biteX = B.L.mascotX + B.L.catHalf;
    const distFrac = Math.max(0, z.x - biteX) / (B.w - biteX);
    B.score += boss ? bossPoints(killPoints(B.combo, distFrac)) : killPoints(B.combo, distFrac);
    sfx.kill(); hapticKill(); if (B.combo >= 3) sfx.combo(B.combo);
    btn.classList.add("good");
    lockOptions();
    B.proj = {x:B.L.mascotX+16*B.S, y:B.h-B.L.ground-30*B.S};   // coin flies at the cat
    // (word audio fires once, on spawn — no replay on the answer tap)
    if(boss) noteAnswer(z.w.h, true);           // both stages passed
    const gy = B.h-B.L.ground;
    B.feedback = {...feedbackEffect("correct", z.x, gy-42*B.S), until:performance.now()+620};
    const floater = comboFloater(z.x, gy-130, B.combo);
    if(floater) B.floats.push(floater);
    // milestone combo (10, 20, ...): extra sparkle on top of the usual combo sting above
    if(B.combo>=10 && B.combo%10===0) B.parts.push(...fireworkRing(z.x, gy-16));
  }else{
    // ONE attempt per word: wrong tap = lose a heart. Skip the charge animation and
    // advance quickly — just long enough to see the correct answer flashed green.
    B.combo = 0;
    sfx.wrong(); sfx.bite(); hapticWrong();
    btn.classList.add("bad");
    lockOptions();
    revealCorrect(z.w);
    pushMiss(z.w);
    if(boss) noteAnswer(z.w.h, false);          // any miss fails the boss word
    B.lives--; B.flash = 1; B.screenShake = 1; B.resolved++;
    z.state = "wrong";
    z.wrongUntil = performance.now() + 560;
    B.feedback = {...feedbackEffect("wrong", z.x, B.h-B.L.ground-44*B.S), until:performance.now()+560};
  }
  updateHud();
}
function scheduleNext(ms){
  B.zombie = null; B.proj = null;
  B.nextAt = performance.now()+ms;
  // options stay visible (locked) so the revealed answer can sink in;
  // the next spawn's renderOptions replaces them
}
function killZombie(z){
  const gy = B.h-B.L.ground;
  B.parts.push(...coinBurst(z.x, gy-16, !!z.boss, shopState.effect));   // bosses pop a bigger, coinier burst; effect pack swaps the look
  z.state = "happy";
  B.dyingUntil = performance.now() + 250;
  B.proj = null;
  B.resolved++;
  B.mascotHopUntil = performance.now()+400;   // little victory hop for the mascot
}
function bite(timedOut){
  const z = B.zombie;
  if(timedOut){
    // boss word already counted its one attempt on the first tap (see answer());
    // only count here if it timed out before ever being tapped.
    if(!z.boss || z.stage === "meaning") B.attempts++;
    B.combo = 0; noteAnswer(z.w.h, false); pushMiss(z.w); revealCorrect(z.w); lockOptions();
  }
  sfx.bite();
  B.lives--; B.flash = 1;
  B.resolved++;
  scheduleNext(1500);   // long enough to read the revealed answer
  updateHud();
}
function loop(t){
  if(!B.on) return;
  const dt = Math.min(0.05, (t-(B.lastT||t))/1000); B.lastT = t;
  // next word (or end of round) once the field is clear
  if(!B.zombie && t >= B.nextAt){
    if(B.lives>0 && B.spawned<B.wordsTotal) spawnZombie();
    else { endBattle(false); return; }
  }
  const z = B.zombie;
  if(z){
    if(z.state==="walk"){
      if(!z.frozen){
        z.x -= B.speed*(z.boss?bossSpeedFactor:1)*dt;
        if(z.x <= B.L.mascotX+B.L.catHalf) bite(true);          // too slow — cat got there
      }
    }else if(z.state==="dash"){
      z.x -= B.speed*7*dt;
      if(z.x <= B.L.mascotX+B.L.catHalf) bite(false);         // legacy: never assigned, kept for safety
    }else if(z.state==="happy" && t >= B.dyingUntil){
      scheduleNext(200);
    }else if(z.state==="wrong"){
      z.x += 24*B.S*dt;
      if(t >= z.wrongUntil) scheduleNext(350);
    }
  }
  if(B.proj && B.zombie){
    B.proj.x += 560*B.S*dt;
    if(B.proj.x >= B.zombie.x-8) killZombie(B.zombie);
  }
  for(const p of B.parts){ p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=(p.g ?? 500)*dt; p.life-=dt; }
  B.parts = B.parts.filter(p=>p.life>0);
  for(const f of B.floats){ f.y += f.vy*dt; f.life -= dt; }
  B.floats = B.floats.filter(f=>f.life>0);
  B.flash = Math.max(0, B.flash-2.2*dt);
  B.screenShake = Math.max(0, (B.screenShake || 0)-4*dt);
  draw(t);
  requestAnimationFrame(loop);
}
// programmatic canvas backdrops — kept dark/low-contrast so the word banner stays readable
function paintBackdrop(c, w, h, gy, style, t=0){
  const pulse = t / 1000;
  if(style==="market"){
    const g = c.createLinearGradient(0,0,0,h);
    g.addColorStop(0,"#24123c"); g.addColorStop(.58,"#3d1432"); g.addColorStop(1,"#5a1d22");
    c.fillStyle = g; c.fillRect(0,0,w,h);
    c.fillStyle = "rgba(10,6,18,.24)";
    c.fillRect(0, 0, w, gy);
    c.fillStyle = "rgba(18,8,18,.55)";
    for(const [fx, bw, bh] of [[.08,.2,.24],[.34,.16,.18],[.62,.22,.22],[.86,.18,.2]]){
      c.fillRect(w*fx-bw*w/2, gy-bh*h, bw*w, bh*h);
      c.fillStyle = "rgba(245,197,24,.16)";
      for(let i=0;i<3;i++) c.fillRect(w*fx-bw*w*.34+i*bw*w*.22, gy-bh*h+12, 5, 7);
      c.fillStyle = "rgba(18,8,18,.55)";
    }
    c.strokeStyle = "rgba(193,39,45,.65)"; c.lineWidth = Math.max(1.5, w*.005);
    c.beginPath(); c.moveTo(0,h*.22); c.quadraticCurveTo(w*.5,h*.06,w,h*.2); c.stroke();
    for(const [fx,fy,r] of [[.14,.25,5],[.33,.16,4],[.58,.23,5],[.79,.29,4],[.5,.12,3]]){
      const glow = .62 + Math.sin(pulse*2 + fx*8) * .16;
      c.fillStyle = `rgba(245,197,24,${glow.toFixed(3)})`;
      c.beginPath(); c.ellipse(w*fx,h*fy + Math.sin(pulse + fx*9)*2,r,r*1.25,0,0,Math.PI*2); c.fill();
      c.fillStyle = "rgba(193,39,45,.8)";
      c.fillRect(w*fx-r*.55,h*fy-r*.95,r*1.1,r*.25);
    }
    c.fillStyle = "rgba(245,197,24,.09)";
    for(let i=0;i<14;i++){
      const x = (w*((i*.137 + pulse*.018)%1));
      const y = h*(.18 + ((i*.193 + pulse*.03)%1)*.62);
      c.beginPath(); c.arc(x,y,1.2+(i%3)*.55,0,Math.PI*2); c.fill();
    }
  }else if(style==="temple"){
    const g = c.createLinearGradient(0,0,0,h);
    g.addColorStop(0,"#271415"); g.addColorStop(.52,"#5b2412"); g.addColorStop(1,"#8b3d18");
    c.fillStyle = g; c.fillRect(0,0,w,h);
    const sunY = h*(.4 + Math.sin(pulse*.25)*.015);
    c.fillStyle = "rgba(255,214,95,.18)";
    c.beginPath(); c.arc(w*.22,sunY,w*.22,0,Math.PI*2); c.fill();
    c.fillStyle = "rgba(255,214,95,.32)";
    c.beginPath(); c.arc(w*.22,sunY,w*.16,0,Math.PI*2); c.fill();
    c.fillStyle = "rgba(255,244,224,.06)";
    for(let y=h*.28;y<gy;y+=h*.09) c.fillRect(0, y + Math.sin(pulse+y*.01)*2, w, 2);
    c.fillStyle = "rgba(20,10,10,.62)";
    drawPagodaSilhouette(c, w*.75, gy+8, Math.min(w,h)*.55);
  }else if(style==="bamboo"){
    const g = c.createLinearGradient(0,0,0,h);
    g.addColorStop(0,"#0d2928"); g.addColorStop(.62,"#14362f"); g.addColorStop(1,"#203a28");
    c.fillStyle = g; c.fillRect(0,0,w,h);
    c.fillStyle = "rgba(190,230,190,.09)";
    c.fillRect(0,h*.45,w,h*.2);
    const stalks = [.16,.31,.46,.63,.78,.9];
    for(const fx of stalks){
      const sw = Math.max(4,w*.012);
      const sway = Math.sin(pulse*.8 + fx*6) * w*.006;
      c.fillStyle = "rgba(20,80,52,.64)";
      c.fillRect(w*fx-sw/2+sway, 0, sw, gy+10);
      c.strokeStyle = "rgba(245,197,24,.18)"; c.lineWidth = 1;
      for(let y=h*.16; y<gy; y+=h*.18){ c.beginPath(); c.moveTo(w*fx-sw/2+sway,y); c.lineTo(w*fx+sw/2+sway,y); c.stroke(); }
    }
    c.fillStyle = "rgba(210,240,220,.075)";
    for(let i=0;i<5;i++){
      const y = h*(.28+i*.1);
      c.fillRect(((pulse*18+i*w*.27)%(w*1.35))-w*.35, y, w*.55, 8);
    }
  }else{
    const g = c.createLinearGradient(0,0,0,h);
    g.addColorStop(0,"#2a0f2a"); g.addColorStop(.6,"#4a1420"); g.addColorStop(1,"#6b2a1a");
    c.fillStyle = g; c.fillRect(0,0,w,h);
  }
}
function drawBackdrop(gy){
  const selected = shopState.backdrop ? `bg-${shopState.backdrop}` : "bg-quest";
  const img = sprite(selected);
  if(img) drawCoverImage(ctx, img, 0, 0, B.w, B.h);
  else if(shopState.backdrop) paintBackdrop(ctx, B.w, B.h, gy, shopState.backdrop, performance.now());
  else paintBackdrop(ctx, B.w, B.h, gy, "", performance.now());
}
function draw(t){
  ctx.clearRect(0,0,B.w,B.h);
  const gy = B.h - B.L.ground;
  const shake = B.screenShake > 0
    ? Math.sin(t * 0.08) * 5 * B.S * B.screenShake
    : 0;
  if(shake){
    ctx.save();
    ctx.translate(shake, 0);
  }
  drawBackdrop(gy);
  // ground line — subtle gold
  ctx.strokeStyle = "rgba(245,197,24,.35)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0,gy+12); ctx.lineTo(B.w,gy+12); ctx.stroke();
  ctx.textAlign = "center";
  // mascot (left side) - maneki sprite or vector fallback
  const manekiImg = sprite("maneki");
  const hopping = B.mascotHopUntil && t < B.mascotHopUntil;   // little victory hop after a kill
  const mp = B.L.mascotPx;
  if(manekiImg){
    const bob = Math.sin(t/400)*(hopping? 9:3);
    ctx.drawImage(manekiImg, B.L.mascotX-mp/2, gy-mp+4*B.S+bob, mp, mp);
  }else{
    drawCat(ctx, B.L.mascotX, gy + 6*B.S, t, "happy", null, .72*B.S, [], false);
  }
  // idle coin icon (left of mascot) - coin sprite or vector fallback
  const coinImgIdle = sprite("coin");
  if(coinImgIdle){
    ctx.drawImage(coinImgIdle, 4*B.S, gy-22*B.S, B.L.coinPx, B.L.coinPx);
  }else{
    drawCoinMark(ctx, 16*B.S, gy-10*B.S, 9*B.S);
  }
  const z = B.zombie;
  if(z){
    // word + pinyin, fixed at the center of the sky area (not following the cat)
    // boss stage 2 asks "which hanzi?", so the plate must not give it away
    const hideWord = z.boss && z.stage === "hanzi" && z.state === "walk";
    const bh = hideWord ? "？？" : z.w.h;
    // pinyin off when: boss reverse-question hides it, OR the player toggled it off
    const bp = (hideWord || !settings.showPinyin) ? "" : z.w.p;
    drawWordPlate(hideWord ? "??" : bh, bp, z.w.lv, z.boss, t);
    // cat — bosses draw bigger with a gold aura (boss param, not scale — see
    // cat.js); growth accessories ride along via the same call, kitten trails
    // as a second mini cat
    drawCat(ctx, z.x, gy + 6*B.S, t, z.state, SKIN_PALETTES[shopState.skin], z.boss ? 1.5*B.S : B.S, B.acc, !!z.boss);
    if(B.hasKitten) drawCat(ctx, z.x + B.L.catHalf, gy + 6*B.S, t + 250, z.state, SKIN_PALETTES[shopState.skin], 0.55*B.S, [], false);
  }
  // projectile - spinning coin sprite or vector fallback
  if(B.proj){
    const coinImg = sprite("coin");
    const pc = B.L.coinPx;
    if(coinImg){
      ctx.drawImage(coinImg, B.proj.x-pc/2, B.proj.y-pc/2, pc, pc);
    }else{
      drawCoinMark(ctx, B.proj.x, B.proj.y, pc*.45);
    }
  }
  // particles (kill bursts + combo fireworks) — kind picks the look
  const coinImgP = sprite("coin");
  for(const p of B.parts){
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life/0.6));
    if(p.kind==="coin"){
      if(coinImgP) ctx.drawImage(coinImgP, p.x-7, p.y-7, 14, 14);
      else { ctx.fillStyle = "#f5c518"; ctx.beginPath(); ctx.arc(p.x,p.y,3.4,0,7); ctx.fill(); }
    }else if(p.kind==="spark"){
      ctx.fillStyle = "#fff4c0"; ctx.beginPath(); ctx.arc(p.x,p.y,4.2,0,7); ctx.fill();
    }else if(p.kind==="petal"){
      ctx.fillStyle = "#f6a8c8"; ctx.beginPath(); ctx.ellipse(p.x,p.y,4.6,2.6,p.x*0.05,0,7); ctx.fill();
    }else if(p.kind==="cracker"){
      ctx.fillStyle = "#e04040"; ctx.beginPath(); ctx.arc(p.x,p.y,4.4,0,7); ctx.fill();
    }else{
      ctx.fillStyle = "#f5c518"; ctx.beginPath(); ctx.arc(p.x,p.y,3.4,0,7); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // combo floaters drifting up from a kill
  if(B.floats.length){
    ctx.font = `700 ${Math.round(B.L.floaterPx)}px 'Segoe UI',sans-serif`;
    ctx.fillStyle = "#f5c518";
    for(const f of B.floats){
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life/0.9));
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }
  // hit flash — softened dim-violet (cat wandered off, not combat damage)
  drawFeedbackLayer(t);
  if(B.flash>0){ ctx.fillStyle = `rgba(90,44,80,${(0.30*B.flash).toFixed(3)})`; ctx.fillRect(0,0,B.w,B.h); }
  if(shake) ctx.restore();
}
function drawWordPlate(hanzi, pinyin, level, boss, t){
  const wy = Math.round(B.h * 0.36);
  ctx.save();
  ctx.font = `700 ${Math.round(B.L.hanziPx)}px 'Segoe UI',sans-serif`;
  const textW = Math.max(ctx.measureText(hanzi).width, 74*B.S);
  const lw = Math.min(B.w - 24*B.S, textW + 48*B.S);
  const lh = (pinyin ? 86 : 64) * B.S;
  const x = B.w/2 - lw/2, y = wy - lh/2;
  // cream paper plaque (education-first reference): matte paper, warm-brown
  // border, corner ticks — hanzi/pinyin stay dynamic text, never baked art
  ctx.shadowColor = "rgba(60,40,20,.32)";
  ctx.shadowBlur = 12*B.S;
  ctx.shadowOffsetY = 4*B.S;
  const paper = ctx.createLinearGradient(0,y,0,y+lh);
  paper.addColorStop(0,"rgba(253,246,227,.97)");
  paper.addColorStop(1,"rgba(243,230,198,.97)");
  ctx.fillStyle = paper;
  roundRect(x,y,lw,lh,14*B.S); ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = boss ? "#D8A93A" : "#B98F55";
  ctx.lineWidth = 2.6*B.S;
  roundRect(x+1.3*B.S,y+1.3*B.S,lw-2.6*B.S,lh-2.6*B.S,13*B.S); ctx.stroke();
  ctx.strokeStyle = "rgba(231,211,166,.9)";
  ctx.lineWidth = 1.2*B.S;
  roundRect(x+6*B.S,y+6*B.S,lw-12*B.S,lh-12*B.S,9*B.S); ctx.stroke();
  // corner ticks
  ctx.strokeStyle = "#C29B5F";
  ctx.lineWidth = 1.8*B.S;
  ctx.lineCap = "round";
  const tk = 5*B.S, ti = 10*B.S;
  ctx.beginPath();
  ctx.moveTo(x+ti, y+ti+tk); ctx.lineTo(x+ti, y+ti); ctx.lineTo(x+ti+tk, y+ti);
  ctx.moveTo(x+lw-ti-tk, y+ti); ctx.lineTo(x+lw-ti, y+ti); ctx.lineTo(x+lw-ti, y+ti+tk);
  ctx.moveTo(x+ti, y+lh-ti-tk); ctx.lineTo(x+ti, y+lh-ti); ctx.lineTo(x+ti+tk, y+lh-ti);
  ctx.moveTo(x+lw-ti-tk, y+lh-ti); ctx.lineTo(x+lw-ti, y+lh-ti); ctx.lineTo(x+lw-ti, y+lh-ti-tk);
  ctx.stroke();
  ctx.fillStyle = boss ? "#7A4E0C" : "#3A2E1D";
  ctx.textAlign = "center";
  ctx.font = `700 ${Math.round(B.L.hanziPx)}px 'Segoe UI',sans-serif`;
  ctx.fillText(hanzi, B.w/2, wy + (pinyin ? -5*B.S : B.L.hanziPx*.34));
  if(pinyin){
    ctx.font = `600 ${Math.round(B.L.pinyinPx)}px 'Segoe UI',sans-serif`;
    ctx.fillStyle = "#8C5F2A";
    ctx.fillText(pinyin, B.w/2, wy + 28*B.S);
  }
  if(level){
    // dark-green level tag (reference TAG)
    ctx.font = `700 ${Math.round(10*B.S)}px 'Segoe UI',sans-serif`;
    const tagText = `HSK ${level}`;
    const tw = ctx.measureText(tagText).width + 12*B.S;
    const th = 16*B.S;
    ctx.fillStyle = "#2F6B4F";
    roundRect(x+8*B.S, y-th*.45, tw, th, th/2); ctx.fill();
    ctx.strokeStyle = "#1E4634";
    ctx.lineWidth = 1.2*B.S;
    roundRect(x+8*B.S, y-th*.45, tw, th, th/2); ctx.stroke();
    ctx.fillStyle = "#F2EDDE";
    ctx.textAlign = "left";
    ctx.fillText(tagText, x+14*B.S, y-th*.45 + th*.7);
  }
  ctx.restore();
}
function drawFeedbackLayer(t){
  const fb = B.feedback;
  if(!fb) return;
  const kind = fb.kind || fb.type;
  const total = kind === "critical" ? 750 : kind === "correct" ? 620 : 560;
  const left = fb.until - performance.now();
  if(left <= 0){ B.feedback = null; return; }
  const p = 1 - left / total;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1-p);
  const fxImg = fb.sprite ? sprite(fb.sprite) : null;
  if(fxImg){
    const size = (kind === "critical" ? 96 : 72) * B.S;
    ctx.drawImage(fxImg, fb.x - size/2, fb.y - size/2, size, size);
  }else if(kind === "correct"){
    ctx.strokeStyle = "rgba(245,197,24,.86)";
    ctx.lineWidth = Math.max(2, 4*B.S*(1-p));
    ctx.beginPath(); ctx.arc(fb.x, fb.y, (18 + 44*p)*B.S, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = "rgba(255,244,224,.95)";
    for(let i=0;i<10;i++){
      const a = i*Math.PI*2/10 + t*.004;
      const r = (14 + 42*p)*B.S;
      ctx.beginPath(); ctx.arc(fb.x+Math.cos(a)*r, fb.y+Math.sin(a)*r, 2.2*B.S, 0, Math.PI*2); ctx.fill();
    }
  }else{
    ctx.strokeStyle = "rgba(255,100,110,.65)";
    ctx.lineWidth = 3*B.S;
    ctx.beginPath(); ctx.arc(fb.x, fb.y, (18 + 26*p)*B.S, Math.PI*.15, Math.PI*1.85); ctx.stroke();
  }
  ctx.restore();
}
function roundRect(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}
function roundRectOn(c,x,y,w,h,r){
  c.beginPath();
  c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r);
  c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath();
}
function drawCoverImage(c, img, x, y, w, h){
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale, sh = h / scale;
  const sx = (img.naturalWidth - sw) / 2;
  const sy = (img.naturalHeight - sh) / 2;
  c.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}
function drawCoinMark(c, x, y, r){
  c.save();
  const g = c.createRadialGradient(x-r*.35,y-r*.35,r*.2,x,y,r);
  g.addColorStop(0,"#fff1a6"); g.addColorStop(.58,"#f5c518"); g.addColorStop(1,"#a86d00");
  c.fillStyle = g; c.beginPath(); c.arc(x,y,r,0,Math.PI*2); c.fill();
  c.strokeStyle = "#5a3c00"; c.lineWidth = Math.max(1,r*.16); c.stroke();
  c.strokeStyle = "rgba(90,60,0,.65)"; c.lineWidth = Math.max(1,r*.12);
  c.beginPath(); c.arc(x,y,r*.48,0,Math.PI*2); c.stroke();
  c.restore();
}
function drawPagodaSilhouette(c, x, baseY, s){
  c.save(); c.translate(x, baseY);
  for(let i=0;i<3;i++){
    const y = -s*(.18 + i*.19), w = s*(.46 - i*.09), h = s*.12;
    c.fillRect(-w*.32, y, w*.64, h);
    c.beginPath(); c.moveTo(-w*.58,y); c.lineTo(0,y-h*.72); c.lineTo(w*.58,y); c.closePath(); c.fill();
  }
  c.fillRect(-s*.11, -s*.18, s*.22, s*.18);
  c.restore();
}
function endBattle(quit){
  stopBattle();
  updateSmartBtn();
  if(quit){ show("home"); return; }
  noteDaily(B.resolved);
  const isPerfect = B.mode==="round" && B.resolved>0 && B.misses.length===0;
  if(isPerfect) questEvent("perfect");
  wallet += B.score;
  const bonus = isPerfect ? perfectBonus(B.score) : 0;
  if(bonus) wallet += bonus;
  store.set("wallet", wallet);
  updateWalletChip();
  $("#r-wallet").textContent = t("results.banked", { score: B.score, total: wallet.toLocaleString() });
  const perfectEl = $("#r-perfect");
  if(isPerfect){ perfectEl.textContent = t("results.perfect", { bonus }); perfectEl.style.display = "block"; }
  else perfectEl.style.display = "none";
  const lu = B.levelUps || [];
  const luEl = $("#r-levelup");
  if(lu.length){
    const from = lu[0].from, to = lu[lu.length-1].to;
    const hit = MILESTONES.filter(m => m.lv > from && m.lv <= to);
    luEl.textContent = hit.length
      ? t("results.levelUpUnlocked", { lv: to, items: hit.map(m=>m.name).join(", ") })
      : t("results.levelUp", { lv: to });
    luEl.style.display = "block";
  }else{
    luEl.style.display = "none";
  }
  const rq = $("#r-quests");
  rq.innerHTML = "";
  for(const q of questToasts){
    const line = document.createElement("div");
    line.textContent = t("results.questComplete", { desc: t("quest."+q.id), reward: q.reward });
    rq.appendChild(line);
  }
  rq.style.display = questToasts.length ? "block" : "none";
  const acc = B.attempts? Math.round(100*B.correct/B.attempts) : 0;
  $("#r-score").textContent = B.score;
  const key = scopeKey(scope)+"·"+modeKey(B.mode, B.wordsTotal);
  const best = store.get("best", {});
  const prev = best[key]? best[key].score : 0;
  const isBest = B.score > prev;
  if(isBest){ best[key] = {score:B.score, date:new Date().toISOString().slice(0,10)}; store.set("best", best); }
  $("#r-sub").innerHTML = t("results.sub", { acc, words: B.correct, key })
    + (isBest ? ` · <b style="color:var(--gold)">${t("results.bestTag")}</b>` : ` · ${t("results.bestPrev", { prev })}`);
  const list = $("#r-miss");
  list.innerHTML = "";
  $("#r-misshead").style.display = B.misses.length? "block":"none";
  list.style.display = B.misses.length? "block":"none";
  for(const w of B.misses){
    const row = document.createElement("div");
    row.className = "missrow";
    row.innerHTML = `<span class="hz">${w.h}</span>
      <span class="det"><span class="py">${w.p}</span> — ${w.e}${w.t? " · "+w.t:""}</span>`;
    const sp = document.createElement("button");
    sp.className = "sp"; sp.setAttribute("aria-label", "Play audio"); sp.replaceChildren(iconSvg("sound")); sp.onclick = ()=>speak(w.h);
    row.appendChild(sp);
    list.appendChild(row);
  }
  $("#r-review").style.display = B.misses.length? "block":"none";
  $("#r-review").onclick = ()=>{ learnDeck = B.misses.slice(); startLearn(); };
  $("#r-fight-miss").style.display = B.misses.length >= 2 ? "block" : "none";
  $("#r-fight-miss").onclick = ()=>{ battleDeckOverride = B.misses.slice(); startBattle("round"); };
  $("#r-again").onclick = ()=>startBattle(lastMode);
  show("results");
}

/* ============================== high scores ============================== */
function renderScores(){
  const best = store.get("best", {});
  const box = $("#scorelist");
  const keys = Object.keys(best).sort((a,b)=>best[b].score-best[a].score);
  box.innerHTML = keys.length ? "" : `<div class="scorerow" style="color:var(--muted)">${t("scores.empty")}</div>`;
  for(const k of keys){
    const row = document.createElement("div");
    row.className = "scorerow";
    row.innerHTML = `<span>${k}</span><span><b>${best[k].score}</b> <span style="color:var(--muted);font-size:12px">${best[k].date}</span></span>`;
    box.appendChild(row);
  }
}

/* ============================== shop ============================== */
function renderShop(){
  sfx.pack = shopState.soundpack || "default";  // keep sfx in sync with the equipped slot
  $("#shop-wallet").innerHTML = t("shop.wallet", { coins: wallet.toLocaleString() });
  const skinBox = $("#shop-skins"), bdBox = $("#shop-backdrops"), fxBox = $("#shop-effects"), sndBox = $("#shop-sounds"), decoBox = $("#shop-street");
  skinBox.innerHTML = ""; bdBox.innerHTML = ""; fxBox.innerHTML = ""; sndBox.innerHTML = ""; decoBox.innerHTML = "";
  for(const item of CATALOG){
    const box = item.type==="skin" ? skinBox : item.type==="backdrop" ? bdBox : item.type==="effect" ? fxBox : item.type==="soundpack" ? sndBox : decoBox;
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
    if(item.type === "deco"){
      // Decos are never equipped — every owned deco just appears on the street.
      btn.className = "chip"+(owned? " on":"");
      if(owned){
        btn.textContent = t("shop.onStreet"); btn.disabled = true;
      }else{
        btn.textContent = t("shop.buy");
        btn.disabled = !canAfford(wallet, item.id);
        btn.onclick = ()=>{
          const r = buy(wallet, shopState, item.id);
          if(!r.ok) return;
          wallet = r.wallet; shopState = r.shop;
          store.set("wallet", wallet); store.set("shop", shopState);
          updateWalletChip(); renderShop(); renderStreet();
        };
      }
    }else{
      btn.className = "chip"+(equipped? " on":"");
      if(equipped){
        btn.textContent = t("shop.equipped"); btn.disabled = true;
      }else if(owned){
        btn.textContent = t("shop.equip");
        btn.onclick = ()=>{ shopState = equipItem(shopState, item.id); store.set("shop", shopState); renderShop(); };
      }else{
        btn.textContent = t("shop.buy");
        btn.disabled = !canAfford(wallet, item.id);
        btn.onclick = ()=>{
          const r = buy(wallet, shopState, item.id);
          if(!r.ok) return;
          wallet = r.wallet; shopState = r.shop;
          store.set("wallet", wallet); store.set("shop", shopState);
          updateWalletChip(); renderShop();
        };
      }
    }
    row.appendChild(left); row.appendChild(btn);
    box.appendChild(row);
    renderShopPreview(preview, item, performance.now());
  }
  startShopPreviewLoop();
}

let shopPreviewRaf = 0;
function startShopPreviewLoop(){
  if(shopPreviewRaf) return;
  const tick = t => {
    shopPreviewRaf = 0;
    if(currentScreen !== "shop") return;
    document.querySelectorAll(".shop-preview").forEach(canvas => {
      if(canvas._shopItem) renderShopPreview(canvas, canvas._shopItem, t);
    });
    shopPreviewRaf = requestAnimationFrame(tick);
  };
  shopPreviewRaf = requestAnimationFrame(tick);
}

function renderShopPreview(canvas, item, t=0){
  const w = 96, h = 64;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(w*dpr); canvas.height = Math.round(h*dpr);
  canvas.style.width = w+"px"; canvas.style.height = h+"px";
  const c = canvas.getContext("2d");
  c.setTransform(dpr,0,0,dpr,0,0);
  c.clearRect(0,0,w,h);
  const bg = c.createLinearGradient(0,0,0,h);
  bg.addColorStop(0,"rgba(255,232,150,.16)"); bg.addColorStop(1,"rgba(58,16,16,.72)");
  c.fillStyle = bg; roundRectOn(c,0,0,w,h,10); c.fill();
  c.strokeStyle = "rgba(245,197,24,.28)"; c.lineWidth = 1; roundRectOn(c,.5,.5,w-1,h-1,10); c.stroke();
  if(item.type==="skin"){
    drawCat(c, w*.52, h+6, t, "walk", SKIN_PALETTES[item.id], .72, [], false);
  }else if(item.type==="backdrop"){
    const img = sprite(`bg-${item.id}`);
    if(img) drawCoverImage(c, img, 0, 0, w, h);
    else paintBackdrop(c, w, h, h-7, item.id, t);
    c.strokeStyle = "rgba(245,197,24,.55)"; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0,h-8); c.lineTo(w,h-8); c.stroke();
  }else if(item.type==="effect"){
    if(item.id==="sakura-fx"){
      c.fillStyle = "#f6a8c8";
      for(const [x,y,r] of [[18,15,0],[31,24,.9],[43,13,-.5],[24,31,.4]]){
        c.beginPath(); c.ellipse(x,y,5,2.6,r,0,Math.PI*2); c.fill();
      }
    }else{
      c.fillStyle = "#e04040"; c.beginPath(); c.arc(24,22,8,0,Math.PI*2); c.fill();
      c.fillStyle = "#fff4c0";
      for(const [x,y] of [[15,12],[38,13],[42,30],[18,32],[31,21]]){ c.beginPath(); c.arc(x,y,2.8,0,Math.PI*2); c.fill(); }
    }
  }else if(item.type==="soundpack"){
    c.strokeStyle = item.id==="bells" ? "#f5c518" : "#7fd7ff";
    c.lineWidth = 2.5; c.lineCap = "round";
    if(item.id==="bells"){
      c.fillStyle = "#f5c518"; c.beginPath(); c.arc(30,19,10,Math.PI,0); c.lineTo(42,30); c.lineTo(18,30); c.closePath(); c.fill();
      c.fillStyle = "#3a2200"; c.beginPath(); c.arc(30,30,2.6,0,Math.PI*2); c.fill();
    }else{
      c.beginPath(); c.moveTo(16,29); c.lineTo(16,14); c.lineTo(39,10); c.lineTo(39,25); c.stroke();
      c.beginPath(); c.arc(14,31,4,0,Math.PI*2); c.stroke(); c.beginPath(); c.arc(37,27,4,0,Math.PI*2); c.stroke();
    }
  }else{
    drawStreetDeco(c, item.id, w*.5, h-5, h);
  }
}

/* ============================== Lucky Cat Street (home) ============================== */
// Pure-derived from levelForXp(xp) + shopState.owned — no new storage. Redrawn
// on boot, show("home"), level-up (see addXp), and any deco purchase.
function renderStreet(){
  const scv = $("#street-cv");
  if(!scv) return;
  const w = scv.clientWidth, h = scv.clientHeight;
  if(!w || !h) return;   // hidden (display:none) — next show("home") redraws
  const dpr = window.devicePixelRatio||1;
  scv.width = Math.round(w*dpr); scv.height = Math.round(h*dpr);
  const sc = scv.getContext("2d");
  sc.setTransform(dpr,0,0,dpr,0,0);
  sc.clearRect(0,0,w,h);
  paintStreetBase(sc, w, h);
  const gy = h - 10;

  const level = levelForXp(xp);
  const pieces = streetPieces(level, shopState.owned);
  drawStreetPads(sc, w, gy, h, pieces);
  for(const p of pieces){
    const x = p.slot * w;
    if(p.kind==="building") drawStreetBuilding(sc, p.id, x, gy, h);
    else drawStreetDeco(sc, p.id, x, gy, h);
  }

  // mascot - maneki sprite or vector fallback, always far left on the ground
  const mImg = sprite("maneki");
  const mp = Math.min(h*0.62, 48);
  if(mImg){
    sc.drawImage(mImg, 4, gy-mp+4, mp, mp);
  }else{
    sc.textAlign = "left";
    sc.font = `${Math.round(h*0.42)}px serif`;
    drawCat(sc, 22, gy + 8, 0, "happy", null, .58, [], false);
  }

  const cap = $("#street-caption");
  if(!cap) return;
  const prog = streetProgress(level);
  const nextTxt = prog.next ? `Next: Lv ${prog.next.lv} — ${prog.next.name}` : "All buildings unlocked!";
  cap.textContent = pieces.length===0
    ? `Lucky Cat Street — grows as you learn · ${nextTxt}`
    : `${prog.unlocked}/${prog.total} buildings · ${nextTxt}`;
}
function paintStreetBase(c, w, h){
  const sky = c.createLinearGradient(0,0,0,h);
  sky.addColorStop(0, "#160b2a"); sky.addColorStop(.58, "#2a1232"); sky.addColorStop(1, "#5a1d18");
  c.fillStyle = sky; c.fillRect(0,0,w,h);
  c.fillStyle = "rgba(255,231,144,.86)";
  c.beginPath(); c.arc(w*.82, h*.24, h*.12, 0, Math.PI*2); c.fill();
  c.fillStyle = "rgba(245,197,24,.7)";
  for(const [fx,fy,r] of [[.16,.18,1.2],[.31,.28,1],[.46,.16,1.4],[.66,.3,1.1],[.92,.42,1]]){ c.beginPath(); c.arc(w*fx,h*fy,r,0,Math.PI*2); c.fill(); }
  c.fillStyle = "rgba(18,12,24,.58)";
  c.beginPath(); c.moveTo(0,h*.58); c.lineTo(w*.16,h*.42); c.lineTo(w*.3,h*.57); c.lineTo(w*.48,h*.37); c.lineTo(w*.72,h*.58); c.lineTo(w,h*.43); c.lineTo(w,h); c.lineTo(0,h); c.closePath(); c.fill();
  c.fillStyle = "rgba(92,31,24,.9)";
  c.fillRect(0,h*.64,w,h*.36);
  c.strokeStyle = "rgba(245,197,24,.24)"; c.lineWidth = 1;
  for(let y=h*.7;y<h;y+=h*.12){ c.beginPath(); c.moveTo(0,y); c.lineTo(w,y); c.stroke(); }
  for(let x=-w*.1;x<w;x+=w*.14){ c.beginPath(); c.moveTo(x,h); c.lineTo(x+w*.07,h*.66); c.stroke(); }
  c.strokeStyle = "rgba(245,197,24,.55)"; c.lineWidth = 2;
  c.beginPath(); c.moveTo(0,h-10); c.lineTo(w,h-10); c.stroke();
  c.fillStyle = "rgba(245,197,24,.12)";
  c.fillRect(0,h*.62,w,h*.05);
}
function drawStreetPads(c, w, gy, h, pieces){
  const occupied = new Set(pieces.map(p => p.slot.toFixed(2)));
  const slots = [.18,.34,.5,.66,.82,.10,.26,.42,.58,.74];
  for(const slot of slots){
    if(occupied.has(slot.toFixed(2))) continue;
    const x = slot*w, pw = h*.34;
    c.fillStyle = "rgba(255,214,95,.08)";
    c.beginPath(); c.ellipse(x, gy+1, pw, h*.055, 0, 0, Math.PI*2); c.fill();
    c.strokeStyle = "rgba(245,197,24,.16)"; c.lineWidth = 1;
    c.beginPath(); c.ellipse(x, gy+1, pw, h*.055, 0, 0, Math.PI*2); c.stroke();
  }
}
// Each piece is a small, distinct dark-shape-with-gold/red-accent group,
// legible at ~72-88px tall. Buildings are silhouettes with lit windows/roof;
// decos are smaller items (lantern, awning, sign, statue, arch).
function drawStreetBuildingLegacy(c, id, x, gy, h){
  const bw = h*0.5, bh = h*0.62;
  c.save(); c.translate(x, gy);
  switch(id){
    case "lantern-post":
      c.fillStyle = "#2e1030"; c.fillRect(-2, -bh, 4, bh);
      c.fillStyle = "#f5c518"; c.beginPath(); c.arc(0, -bh, bw*0.22, 0, Math.PI*2); c.fill();
      break;
    case "coin-bank":
      c.fillStyle = "#2e1030"; c.fillRect(-bw/2, -bh, bw, bh);
      c.fillStyle = "#f5c518"; c.beginPath(); c.arc(0, -bh*0.58, bw*0.18, 0, Math.PI*2); c.fill();
      c.fillStyle = "#8a2a24"; c.font = `${Math.round(bw*0.22)}px serif`; c.textAlign = "center";
      c.fillText("$", 0, -bh*0.5);
      break;
    case "tailor":
      c.fillStyle = "#2e1030"; c.fillRect(-bw/2, -bh*0.85, bw, bh*0.85);
      c.fillStyle = "#c1272d"; c.fillRect(-bw/2-4, -bh*0.85-8, bw+8, 8);
      c.fillStyle = "#f5c518";
      c.fillRect(-bw*0.18, -bh*0.55, bw*0.14, bh*0.14); c.fillRect(bw*0.04, -bh*0.55, bw*0.14, bh*0.14);
      break;
    case "kitten-cafe":
      c.fillStyle = "#2e1030"; c.fillRect(-bw/2, -bh*0.75, bw, bh*0.75);
      c.fillStyle = "#8a2a24";
      c.beginPath(); c.moveTo(-bw/2-6,-bh*0.75); c.lineTo(0,-bh); c.lineTo(bw/2+6,-bh*0.75); c.closePath(); c.fill();
      c.fillStyle = "#f5c518"; c.beginPath(); c.arc(0,-bh*0.4,bw*0.16,0,Math.PI*2); c.fill();
      break;
    case "emperor-gate":
      c.fillStyle = "#c1272d";
      c.fillRect(-bw*0.7, -bh*1.15, bw*0.16, bh*1.15);
      c.fillRect(bw*0.54, -bh*1.15, bw*0.16, bh*1.15);
      c.fillRect(-bw*0.7, -bh*1.15, bw*1.4, bh*0.14);
      c.fillStyle = "#f5c518"; c.beginPath(); c.arc(0,-bh*1.08,bw*0.12,0,Math.PI*2); c.fill();
      break;
  }
  c.restore();
}
function drawStreetDecoLegacy(c, id, x, gy, h){
  const s = h*0.32;
  c.save(); c.translate(x, gy);
  switch(id){
    case "red-lantern":
      c.strokeStyle = "#8a2a24"; c.beginPath(); c.moveTo(0,-s*1.6); c.lineTo(0,-s*1.1); c.stroke();
      c.fillStyle = "#c1272d"; c.beginPath(); c.ellipse(0,-s*0.8,s*0.32,s*0.42,0,0,Math.PI*2); c.fill();
      c.fillStyle = "#f5c518"; c.fillRect(-2,-s*0.38,4,s*0.12);
      break;
    case "noodle-stall":
      c.fillStyle = "#5a2c22"; c.fillRect(-s*0.4,-s*0.6,s*0.8,s*0.6);
      c.fillStyle = "#f5c518"; c.fillRect(-s*0.5,-s*0.78,s,s*0.16);
      break;
    case "tea-sign":
      c.strokeStyle = "#f5c518"; c.beginPath(); c.moveTo(0,-s*1.3); c.lineTo(0,-s*0.9); c.stroke();
      c.fillStyle = "#3a1a1a"; c.fillRect(-s*0.35,-s*1.3,s*0.7,s*0.32);
      c.fillStyle = "#f5c518"; c.font = `${Math.round(s*0.22)}px serif`; c.textAlign = "center";
      c.fillText("茶", 0, -s*1.06);
      break;
    case "foo-dog":
      c.fillStyle = "#2e1030"; c.beginPath(); c.ellipse(0,-s*0.3,s*0.28,s*0.4,0,0,Math.PI*2); c.fill();
      c.fillStyle = "#f5c518"; c.beginPath(); c.arc(0,-s*0.62,s*0.18,0,Math.PI*2); c.fill();
      break;
    case "golden-arch":
      c.strokeStyle = "#f5c518"; c.lineWidth = 3;
      c.beginPath(); c.arc(0,-s*0.5, s*0.9, Math.PI, 0); c.stroke();
      c.beginPath(); c.moveTo(-s*0.9,-s*0.5); c.lineTo(-s*0.9,0); c.moveTo(s*0.9,-s*0.5); c.lineTo(s*0.9,0); c.stroke();
      break;
  }
  c.restore();
}

function drawStreetBuilding(c, id, x, gy, h){
  const bw = h*0.54, bh = h*0.62;
  c.save(); c.translate(x, gy);
  c.shadowColor = "rgba(245,197,24,.32)";
  c.shadowBlur = 6;
  switch(id){
    case "lantern-post":
      c.fillStyle = "#2e1030"; roundRectOn(c,-3,-bh,6,bh,2); c.fill();
      c.strokeStyle = "#f5c518"; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(0,-bh); c.quadraticCurveTo(bw*.26,-bh*1.06,bw*.42,-bh*.86); c.stroke();
      c.fillStyle = "#c1272d"; c.beginPath(); c.ellipse(bw*.43,-bh*.74,bw*.18,bw*.23,0,0,Math.PI*2); c.fill();
      c.fillStyle = "#f5c518"; c.fillRect(bw*.34,-bh*.98,bw*.18,3); c.fillRect(bw*.36,-bh*.52,bw*.14,3);
      break;
    case "coin-bank":
      c.fillStyle = "#2e1030"; roundRectOn(c,-bw/2,-bh,bw,bh,4); c.fill();
      c.fillStyle = "#8a2a24"; c.fillRect(-bw*.55,-bh,bw*1.1,bh*.16);
      c.fillStyle = "#f5c518"; c.beginPath(); c.arc(0, -bh*.58, bw*.2, 0, Math.PI*2); c.fill();
      c.fillStyle = "#8a2a24"; c.font = `700 ${Math.round(bw*.22)}px serif`; c.textAlign = "center";
      c.fillText("$", 0, -bh*.5);
      c.fillStyle = "rgba(255,244,224,.72)"; c.fillRect(-bw*.34,-bh*.28,bw*.68,bh*.05);
      break;
    case "tailor":
      c.fillStyle = "#2e1030"; roundRectOn(c,-bw/2, -bh*.85, bw, bh*.85, 4); c.fill();
      c.fillStyle = "#c1272d"; c.fillRect(-bw/2-5, -bh*.85-9, bw+10, 9);
      c.fillStyle = "rgba(255,244,224,.18)"; c.fillRect(-bw*.42,-bh*.79,bw*.84,bh*.13);
      c.fillStyle = "#f5c518";
      c.fillRect(-bw*.18, -bh*.55, bw*.14, bh*.14); c.fillRect(bw*.04, -bh*.55, bw*.14, bh*.14);
      break;
    case "kitten-cafe":
      c.fillStyle = "#2e1030"; roundRectOn(c,-bw/2, -bh*.75, bw, bh*.75, 4); c.fill();
      c.fillStyle = "#8a2a24";
      c.beginPath(); c.moveTo(-bw/2-6,-bh*.75); c.lineTo(0,-bh); c.lineTo(bw/2+6,-bh*.75); c.closePath(); c.fill();
      c.fillStyle = "#f5c518"; c.beginPath(); c.arc(0,-bh*.4,bw*.16,0,Math.PI*2); c.fill();
      c.fillStyle = "#1a0d0d"; c.beginPath(); c.arc(-bw*.05,-bh*.43,bw*.03,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(bw*.05,-bh*.43,bw*.03,0,Math.PI*2); c.fill();
      break;
    case "emperor-gate":
      c.fillStyle = "#c1272d";
      c.fillRect(-bw*.7, -bh*1.15, bw*.16, bh*1.15);
      c.fillRect(bw*.54, -bh*1.15, bw*.16, bh*1.15);
      c.fillRect(-bw*.7, -bh*1.15, bw*1.4, bh*.14);
      c.fillStyle = "#8a2a24"; c.fillRect(-bw*.82,-bh*1.28,bw*1.64,bh*.13);
      c.fillStyle = "#f5c518"; c.beginPath(); c.arc(0,-bh*1.08,bw*.12,0,Math.PI*2); c.fill();
      break;
  }
  c.restore();
}
function drawStreetDeco(c, id, x, gy, h){
  const s = h*.32;
  c.save(); c.translate(x, gy);
  c.shadowColor = "rgba(245,197,24,.28)";
  c.shadowBlur = 5;
  switch(id){
    case "red-lantern":
      c.strokeStyle = "#8a2a24"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0,-s*1.6); c.lineTo(0,-s*1.1); c.stroke();
      c.fillStyle = "#c1272d"; c.beginPath(); c.ellipse(0,-s*.8,s*.32,s*.42,0,0,Math.PI*2); c.fill();
      c.fillStyle = "#f5c518"; c.fillRect(-2,-s*.38,4,s*.12);
      break;
    case "noodle-stall":
      c.fillStyle = "#5a2c22"; roundRectOn(c,-s*.48,-s*.62,s*.96,s*.62,3); c.fill();
      c.fillStyle = "#c1272d"; c.fillRect(-s*.56,-s*.84,s*1.12,s*.18);
      c.fillStyle = "#f5c518"; c.fillRect(-s*.56,-s*.84,s*.18,s*.18); c.fillRect(-s*.1,-s*.84,s*.18,s*.18); c.fillRect(s*.36,-s*.84,s*.2,s*.18);
      break;
    case "tea-sign":
      c.strokeStyle = "#f5c518"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0,-s*1.3); c.lineTo(0,-s*.9); c.stroke();
      c.fillStyle = "#3a1a1a"; roundRectOn(c,-s*.38,-s*1.3,s*.76,s*.32,3); c.fill();
      c.fillStyle = "#f5c518"; c.font = `700 ${Math.round(s*.22)}px serif`; c.textAlign = "center";
      c.fillText("tea", 0, -s*1.06);
      break;
    case "foo-dog":
      c.fillStyle = "#2e1030"; c.beginPath(); c.ellipse(0,-s*.3,s*.32,s*.4,0,0,Math.PI*2); c.fill();
      c.fillStyle = "#f5c518"; c.beginPath(); c.arc(0,-s*.62,s*.18,0,Math.PI*2); c.fill();
      c.fillStyle = "#1a0d0d"; c.beginPath(); c.arc(-s*.05,-s*.65,s*.025,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(s*.05,-s*.65,s*.025,0,Math.PI*2); c.fill();
      break;
    case "golden-arch":
      c.strokeStyle = "#f5c518"; c.lineWidth = 3;
      c.beginPath(); c.arc(0,-s*.5, s*.9, Math.PI, 0); c.stroke();
      c.beginPath(); c.moveTo(-s*.9,-s*.5); c.lineTo(-s*.9,0); c.moveTo(s*.9,-s*.5); c.lineTo(s*.9,0); c.stroke();
      c.fillStyle = "rgba(255,244,224,.35)"; c.beginPath(); c.arc(0,-s*.93,s*.13,0,Math.PI*2); c.fill();
      break;
  }
  c.restore();
}

/* ============================== progress ============================== */
function renderGrowthCard(){
  const card = $("#growth-card");
  if(!card) return;
  const level = levelForXp(xp);
  const prog = xpToNext(xp);
  const pct = prog.need ? Math.round(100*prog.into/prog.need) : 100;
  const nm = nextMilestone(level);
  const row = document.createElement("div");
  row.className = "scorerow";
  row.style.flexDirection = "column"; row.style.alignItems = "stretch"; row.style.gap = "6px";
  row.innerHTML = `<div style="display:flex; justify-content:space-between">
      <span>Lucky Cat · Lv ${level}</span>
      <span>${prog.into}/${prog.need} xp</span>
    </div>
    <div class="mbar"><i style="width:${pct}%"></i></div>
    <div style="color:var(--muted); font-size:12.5px">${nm? `Next: Lv ${nm.lv} — ${nm.name}` : "All milestones unlocked!"}</div>`;
  card.innerHTML = "";
  card.appendChild(row);
}
function renderProgress(){
  renderGrowthCard();
  const box = $("#progresslist");
  box.innerHTML = "";
  for(let n=1;n<=6;n++){
    const words = D.levels[String(n)];
    const m = levelMastery(masteryStore, words);
    const row = document.createElement("div");
    row.className = "scorerow";
    row.style.flexDirection = "column"; row.style.alignItems = "stretch"; row.style.gap = "6px";
    row.innerHTML = `<div style="display:flex; justify-content:space-between">
        <span>HSK${n}</span>
        <span><b>${m.pct}%</b> mastered · ${m.seen.toLocaleString()}/${words.length.toLocaleString()} seen</span>
      </div>
      <div class="mbar"><i style="width:${m.pct}%"></i></div>`;
    box.appendChild(row);
  }
  renderNeedsWork();
}
function renderNeedsWork(){
  const weak = weakWords(masteryStore, pool).slice(0, 20);
  const list = $("#needswork-list");
  list.innerHTML = "";
  if(!weak.length){
    list.innerHTML = `<div class="missrow" style="color:var(--muted)">${t("progress.nothing")}</div>`;
  }
  for(const w of weak){
    const row = document.createElement("div");
    row.className = "missrow";
    row.innerHTML = `<span class="hz">${w.h}</span>
      <span class="det"><span class="py">${w.p}</span> — ${w.e}${w.t? " · "+w.t:""}</span>`;
    const sp = document.createElement("button");
    sp.className = "sp"; sp.setAttribute("aria-label", "Play audio"); sp.replaceChildren(iconSvg("sound")); sp.onclick = ()=>speak(w.h);
    row.appendChild(sp);
    list.appendChild(row);
  }
  const showBtns = weak.length >= 2;
  $("#nw-review").style.display = showBtns ? "block" : "none";
  $("#nw-fight").style.display = showBtns ? "block" : "none";
  $("#nw-review").onclick = ()=>{ learnDeck = weak.slice(); startLearn(); };
  $("#nw-fight").onclick = ()=>{ battleDeckOverride = weak.slice(); startBattle("round"); };
}

/* ============================== boot ============================== */
pool = buildPool(D.levels, scope);
applyStaticI18n();
syncUiLangChips();
sfx.pack = shopState.soundpack || "default";
updateWalletChip();
updateSmartBtn();
updateStreakChip();
updateLevelChip();
renderQuests();
renderStreet();
if(location.hash === "#debug"){
  window.__debugTarget = ()=> B.zombie && B.zombie.w.h;
  window.__grantXp = n => { addXp(n); };
}
initNative({ getScreen: ()=>currentScreen, goHome: ()=>{ stopBattle(); show("home"); } });
// SW is at the app root so its scope covers the whole app; http(s) only (no-op on file://).
// Never on localhost: the cache-first SW would keep serving a stale shell across dev
// edits (SHELL only bumps on ship), so the dev server must always hit the real files —
// and any registration/cache left over from before this guard is torn down.
const devHost = location.hostname === "localhost" || location.hostname === "127.0.0.1";
if("serviceWorker" in navigator && location.protocol.startsWith("http")){
  if(devHost){
    navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});
    if(window.caches) caches.keys().then(ks=>ks.forEach(k=>caches.delete(k))).catch(()=>{});
  }else{
    navigator.serviceWorker.register("sw.js").catch(()=>{});
  }
}
