"use strict";
import { buildPool, coveragePct, scopeKey, meaning as meaningOf, normalizeLen, modeKey } from "./pool.js";
import { pickDistractors } from "./distractors.js";
import { killPoints } from "./scoring.js";
import { coinBurst, comboFloater, fireworkRing, perfectBonus } from "./fx.js";
import { sfx } from "./sfx.js";
import { drawCat } from "./cat.js";
import { uiScale, layout } from "./layout.js";
import { loadSprites, sprite } from "./sprites.js";
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

/* ============================== data & state ============================== */
const D = window.HSK_DATA;
const $ = s => document.querySelector(s);
const store = {
  get(k, d){ try{ const v = localStorage.getItem("nbhsk."+k); return v===null? d : JSON.parse(v);}catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem("nbhsk."+k, JSON.stringify(v)); }catch(e){} }
};
const scope = Object.assign({levels:[3], core:false, newOnly:false, topN:0, lang:"both", sessionLen:20},
                            store.get("scope", {}));
let settings = Object.assign({autoSpeak:true}, store.get("settings", {}));
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
function updateWalletChip(){ $("#home-wallet").textContent = "🪙 "+wallet.toLocaleString(); }

/* ============================== cat growth (xp/levels/accessories) ============================== */
let xp = store.get("xp", 0);
function updateLevelChip(){ const el = $("#home-level"); if(el) el.textContent = `🐱 Lv ${levelForXp(xp)}`; }
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
  $("#home-streak").textContent = info.goalMet
    ? `🔥 ${info.streak} · ✅ today`
    : `🔥 ${info.streak} · ${info.todayResolved}/${info.goal} today`;
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
    row.innerHTML = `<span class="qi">${q.done? "✅":"▫"}</span>
      <span class="qd">${q.desc}</span>
      <span class="qp">${q.progress}/${q.target}</span>
      <span class="qr">+${q.reward} 🪙</span>`;
    panel.appendChild(row);
  }
}
function updateSmartBtn(){
  const deck = smartDeck(masteryStore, pool, Date.now());
  const btn = $("#go-smart");
  btn.disabled = deck.length < 8;
  // below the 8-word minimum, show progress toward it ("6/8") so the disabled
  // button reads as "not enough yet" rather than broken
  btn.textContent = !deck.length ? "🎯 Smart Review"
    : deck.length < 8 ? `🎯 Smart Review · ${deck.length}/8`
    : `🎯 Smart Review · ${deck.length}`;
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
    `Pool: <b>${pool.length.toLocaleString()}</b> words · ~<b>${coveragePct(pool, D.manifest, scope.levels)}%</b> of exam text`
    +(scope.lang!=="en" && noThai? `<div class="warn">* ${noThai.toLocaleString()} long-tail words have no Thai yet — English shown instead.</div>`:"");
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
  $("#go-battle").textContent = `🧧 Battle · ${len}`;
  store.set("scope", scope);
  const startable = pool.length >= 8;
  $("#go-battle").disabled = $("#go-endless").disabled = $("#go-learn").disabled = !startable;
  updateSmartBtn();
}
$("#f-core").onclick = ()=>{ scope.core = !scope.core; renderScope(); };
$("#f-new").onclick  = ()=>{ scope.newOnly = !scope.newOnly; renderScope(); };
document.querySelectorAll("#topn-chips .chip").forEach(c=>c.onclick = ()=>{ scope.topN = +c.dataset.n; renderScope(); });
document.querySelectorAll("#lang-chips .chip").forEach(c=>c.onclick = ()=>{ scope.lang = c.dataset.lang; renderScope(); });
document.querySelectorAll("#len-chips .chip").forEach(c=>c.onclick = ()=>{
  if(c.dataset.len==="custom"){ lenCustomOpen = true; renderScope(); $("#len-custom").focus(); }
  else { lenCustomOpen = false; scope.sessionLen = +c.dataset.len; renderScope(); }
});
$("#len-custom").addEventListener("input", ()=>{
  scope.sessionLen = normalizeLen($("#len-custom").value);
  store.set("scope", scope);
  $("#go-battle").textContent = `🧧 Battle · ${scope.sessionLen}`;
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
  $("#fc-count").textContent = `${fc.done} done · ${fc.deck.length - fc.i} left`;
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
  B.zombie = null; B.proj = null; B.parts = []; B.flash = 0;
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
$("#hud-sfx").onclick = ()=>{ sfx.enabled = !sfx.enabled; store.set("sfx", sfx.enabled); $("#hud-sfx").textContent = sfx.enabled ? "🔔" : "🔕"; };
$("#hud-audio").onclick = ()=>{
  settings.autoSpeak = !settings.autoSpeak;
  store.set("settings", settings);
  $("#hud-audio").textContent = settings.autoSpeak? "🔊":"🔇";
};
/* home-screen sound toggle (mirrors hud-sfx; btn-sound.png art greys out when muted) */
$("#home-sound").addEventListener("click", ()=>{
  sfx.enabled = !sfx.enabled;
  store.set("sfx", sfx.enabled);
  $("#home-sound").classList.toggle("muted", !sfx.enabled);
});
$("#home-sound").classList.toggle("muted", !sfx.enabled);  // reflect stored state on load
function updateHud(){
  $("#hud-lives").textContent = "❤️".repeat(B.lives) + "🖤".repeat(Math.max(0,3-B.lives));
  $("#hud-score").textContent = B.score;
  $("#hud-combo").textContent = B.combo>=2? "×"+B.combo+" 🔥":"";
  $("#hud-left").textContent = B.mode==="round"? (B.wordsTotal-B.resolved)+" left":"∞";
  $("#hud-sfx").textContent = sfx.enabled ? "🔔" : "🔕";
  $("#hud-audio").textContent = settings.autoSpeak? "🔊":"🔇";
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
  prompt.textContent = `👑 Boss · pick the hanzi for: ${m.main}`;
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
    speak(z.w.h);                              // the sound sticks with the correct answer
    if(boss) noteAnswer(z.w.h, true);           // both stages passed
    const gy = B.h-B.L.ground;
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
    B.lives--; B.flash = 1; B.resolved++;
    scheduleNext(900);
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
  draw(t);
  requestAnimationFrame(loop);
}
// programmatic canvas backdrops — kept dark/low-contrast so the word banner stays readable
function drawBackdrop(gy){
  const w = B.w, h = B.h;
  if(shopState.backdrop==="market"){
    const g = ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0,"#2a0f3a"); g.addColorStop(1,"#4a1030");
    ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = "rgba(245,197,24,.55)";
    const dots = [[.15,.25],[.35,.15],[.6,.22],[.8,.3],[.5,.12]];
    for(const [fx,fy] of dots){ ctx.beginPath(); ctx.arc(w*fx,h*fy,3,0,7); ctx.fill(); }
  }else if(shopState.backdrop==="temple"){
    const g = ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0,"#3a1a10"); g.addColorStop(1,"#6b2a10");
    ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = "rgba(20,10,10,.55)";
    ctx.beginPath(); ctx.moveTo(w*0.7, gy+8); ctx.lineTo(w*0.82, gy-46); ctx.lineTo(w*0.94, gy+8); ctx.closePath(); ctx.fill();
  }else if(shopState.backdrop==="bamboo"){
    const g = ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0,"#0e2a26"); g.addColorStop(1,"#16332e");
    ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = "rgba(20,60,45,.6)";
    const stalks = [.2,.45,.68,.88];
    for(const fx of stalks) ctx.fillRect(w*fx-4, 0, 8, gy+10);
  }
}
function draw(t){
  ctx.clearRect(0,0,B.w,B.h);
  const gy = B.h - B.L.ground;
  drawBackdrop(gy);
  // ground line — subtle gold
  ctx.strokeStyle = "rgba(245,197,24,.35)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0,gy+12); ctx.lineTo(B.w,gy+12); ctx.stroke();
  ctx.textAlign = "center";
  // mascot (left side) — maneki sprite or cat emoji fallback
  const manekiImg = sprite("maneki");
  const hopping = B.mascotHopUntil && t < B.mascotHopUntil;   // little victory hop after a kill
  const mp = B.L.mascotPx;
  if(manekiImg){
    const bob = Math.sin(t/400)*(hopping? 9:3);
    ctx.drawImage(manekiImg, B.L.mascotX-mp/2, gy-mp+4*B.S+bob, mp, mp);
  }else{
    ctx.font = `${Math.round(36*B.S)}px serif`;
    ctx.fillText("🐱", B.L.mascotX, gy+6*B.S);
  }
  // idle coin icon (left of mascot) — coin sprite or emoji fallback
  const coinImgIdle = sprite("coin");
  if(coinImgIdle){
    ctx.drawImage(coinImgIdle, 4*B.S, gy-22*B.S, B.L.coinPx, B.L.coinPx);
  }else{
    ctx.font = `${Math.round(22*B.S)}px serif`;
    ctx.fillText("🪙", 16*B.S, gy+8*B.S);
  }
  const z = B.zombie;
  if(z){
    // word + pinyin, fixed at the center of the sky area (not following the cat)
    // boss stage 2 asks "which hanzi?", so the plate must not give it away
    const hideWord = z.boss && z.stage === "hanzi" && z.state === "walk";
    const bh = hideWord ? "？？" : z.w.h;
    const bp = hideWord ? "" : z.w.p;
    const wy = Math.round(B.h * 0.38);          // sky-area center anchor
    ctx.font = `600 ${Math.round(B.L.hanziPx)}px 'Segoe UI',sans-serif`;
    const lw = Math.max(ctx.measureText(bh).width, 64*B.S) + 28*B.S;
    const lh = (bp ? 78 : 58) * B.S;            // taller plate when pinyin shown
    ctx.fillStyle = "rgba(58,16,16,.82)";
    ctx.strokeStyle = "#f5c518"; ctx.lineWidth = 2.5;
    roundRect(B.w/2 - lw/2, wy - lh/2, lw, lh, 12*B.S); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff4e0";
    ctx.fillText(bh, B.w/2, wy + (bp ? -4*B.S : B.L.hanziPx*0.35));
    if(bp){
      ctx.font = `${Math.round(B.L.pinyinPx)}px 'Segoe UI',sans-serif`;
      ctx.fillStyle = "#f5c518";
      ctx.fillText(bp, B.w/2, wy + 24*B.S);
    }
    // cat — bosses draw bigger with a gold aura (boss param, not scale — see
    // cat.js); growth accessories ride along via the same call, kitten trails
    // as a second mini cat
    drawCat(ctx, z.x, gy + 6*B.S, t, z.state, SKIN_PALETTES[shopState.skin], z.boss ? 1.5*B.S : B.S, B.acc, !!z.boss);
    if(B.hasKitten) drawCat(ctx, z.x + B.L.catHalf, gy + 6*B.S, t + 250, z.state, SKIN_PALETTES[shopState.skin], 0.55*B.S, [], false);
  }
  // projectile — spinning coin sprite or emoji fallback
  if(B.proj){
    const coinImg = sprite("coin");
    const pc = B.L.coinPx;
    if(coinImg){
      ctx.drawImage(coinImg, B.proj.x-pc/2, B.proj.y-pc/2, pc, pc);
    }else{
      ctx.font = `${Math.round(20*B.S)}px serif`; ctx.fillText("🪙", B.proj.x, B.proj.y);
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
  // combo floaters ("×N 🔥") drifting up from a kill
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
  if(B.flash>0){ ctx.fillStyle = `rgba(90,44,80,${(0.30*B.flash).toFixed(3)})`; ctx.fillRect(0,0,B.w,B.h); }
}
function roundRect(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
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
  $("#r-wallet").textContent = `+${B.score} 🪙 banked · total ${wallet.toLocaleString()}`;
  const perfectEl = $("#r-perfect");
  if(isPerfect){ perfectEl.textContent = `🌟 Perfect! +${bonus} 🪙 bonus`; perfectEl.style.display = "block"; }
  else perfectEl.style.display = "none";
  const lu = B.levelUps || [];
  const luEl = $("#r-levelup");
  if(lu.length){
    const from = lu[0].from, to = lu[lu.length-1].to;
    const hit = MILESTONES.filter(m => m.lv > from && m.lv <= to);
    luEl.textContent = `🐱 Level up! Lv ${to}`+(hit.length? ` — unlocked: ${hit.map(m=>m.name).join(", ")}`:"");
    luEl.style.display = "block";
  }else{
    luEl.style.display = "none";
  }
  const rq = $("#r-quests");
  rq.innerHTML = "";
  for(const q of questToasts){
    const line = document.createElement("div");
    line.textContent = `🎯 Quest complete: ${q.desc} +${q.reward} 🪙`;
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
  $("#r-sub").innerHTML = `${acc}% accuracy · ${B.correct} coins · ${key}`
    + (isBest? ` · <b style="color:var(--gold)">new best!</b>` : ` · best ${prev}`);
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
    sp.className = "sp"; sp.textContent = "🔊"; sp.onclick = ()=>speak(w.h);
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
  box.innerHTML = keys.length? "" : `<div class="scorerow" style="color:var(--muted)">No scores yet — go earn some coins!</div>`;
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
  $("#shop-wallet").innerHTML = `Wallet: <b>${wallet.toLocaleString()}</b> 🪙`;
  const skinBox = $("#shop-skins"), bdBox = $("#shop-backdrops"), fxBox = $("#shop-effects"), sndBox = $("#shop-sounds"), decoBox = $("#shop-street");
  skinBox.innerHTML = ""; bdBox.innerHTML = ""; fxBox.innerHTML = ""; sndBox.innerHTML = ""; decoBox.innerHTML = "";
  for(const item of CATALOG){
    const box = item.type==="skin" ? skinBox : item.type==="backdrop" ? bdBox : item.type==="effect" ? fxBox : item.type==="soundpack" ? sndBox : decoBox;
    const owned = shopState.owned.includes(item.id);
    const equipped = shopState[item.type] === item.id;
    const row = document.createElement("div");
    row.className = "scorerow";
    const left = document.createElement("span");
    left.innerHTML = `${item.name} <span style="color:var(--muted);font-size:12px">${item.price.toLocaleString()} 🪙</span>`;
    const btn = document.createElement("button");
    if(item.type === "deco"){
      // Decos are never equipped — every owned deco just appears on the street.
      btn.className = "chip"+(owned? " on":"");
      if(owned){
        btn.textContent = "On street ✓"; btn.disabled = true;
      }else{
        btn.textContent = "Buy";
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
        btn.textContent = "Equipped"; btn.disabled = true;
      }else if(owned){
        btn.textContent = "Equip";
        btn.onclick = ()=>{ shopState = equipItem(shopState, item.id); store.set("shop", shopState); renderShop(); };
      }else{
        btn.textContent = "Buy";
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
  // night sky: dark maroon -> deep purple, consistent with the game palette
  const sky = sc.createLinearGradient(0,0,0,h);
  sky.addColorStop(0, "#1a0d2a"); sky.addColorStop(1, "#3a1030");
  sc.fillStyle = sky; sc.fillRect(0,0,w,h);
  const gy = h - 8;
  sc.strokeStyle = "rgba(245,197,24,.5)"; sc.lineWidth = 2;
  sc.beginPath(); sc.moveTo(0,gy); sc.lineTo(w,gy); sc.stroke();

  const level = levelForXp(xp);
  const pieces = streetPieces(level, shopState.owned);
  for(const p of pieces){
    const x = p.slot * w;
    if(p.kind==="building") drawStreetBuilding(sc, p.id, x, gy, h);
    else drawStreetDeco(sc, p.id, x, gy, h);
  }

  // mascot — maneki sprite or cat emoji fallback, always far left on the ground
  const mImg = sprite("maneki");
  const mp = Math.min(h*0.62, 48);
  if(mImg){
    sc.drawImage(mImg, 4, gy-mp+4, mp, mp);
  }else{
    sc.textAlign = "left";
    sc.font = `${Math.round(h*0.42)}px serif`;
    sc.fillText("🐱", 2, gy-2);
  }

  const cap = $("#street-caption");
  if(!cap) return;
  const prog = streetProgress(level);
  const nextTxt = prog.next ? `Next: Lv ${prog.next.lv} — ${prog.next.name}` : "All buildings unlocked!";
  cap.textContent = pieces.length===0
    ? `Lucky Cat Street — grows as you learn · ${nextTxt}`
    : `${prog.unlocked}/${prog.total} buildings · ${nextTxt}`;
}
// Each piece is a small, distinct dark-shape-with-gold/red-accent group,
// legible at ~72-88px tall. Buildings are silhouettes with lit windows/roof;
// decos are smaller items (lantern, awning, sign, statue, arch).
function drawStreetBuilding(c, id, x, gy, h){
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
function drawStreetDeco(c, id, x, gy, h){
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
      <span>🐱 Lucky Cat · Lv ${level}</span>
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
    list.innerHTML = `<div class="missrow" style="color:var(--muted)">Nothing needs work — go play!</div>`;
  }
  for(const w of weak){
    const row = document.createElement("div");
    row.className = "missrow";
    row.innerHTML = `<span class="hz">${w.h}</span>
      <span class="det"><span class="py">${w.p}</span> — ${w.e}${w.t? " · "+w.t:""}</span>`;
    const sp = document.createElement("button");
    sp.className = "sp"; sp.textContent = "🔊"; sp.onclick = ()=>speak(w.h);
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
