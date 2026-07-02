"use strict";
import { buildPool, coveragePct, scopeKey, meaning as meaningOf } from "./pool.js";
import { pickDistractors } from "./distractors.js";
import { killPoints } from "./scoring.js";
import { sfx } from "./sfx.js";
import { drawZombie } from "./zombie.js";
import { recordAnswer, levelMastery } from "./mastery.js";
import { initAudio, speak } from "./audio.js";

/* ============================== data & state ============================== */
const D = window.HSK_DATA;
const $ = s => document.querySelector(s);
const store = {
  get(k, d){ try{ const v = localStorage.getItem("nbhsk."+k); return v===null? d : JSON.parse(v);}catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem("nbhsk."+k, JSON.stringify(v)); }catch(e){} }
};
const scope = Object.assign({levels:[3], core:false, newOnly:false, topN:0, lang:"both"},
                            store.get("scope", {}));
let settings = Object.assign({autoSpeak:true}, store.get("settings", {}));
sfx.enabled = store.get("sfx", true);
let pool = [];            // current merged word pool
let learnDeck = null;     // override deck for "review misses"
let battleDeckOverride = null;  // when set, next battle draws only these words (e.g. "fight misses")
let lastMode = "round";
let masteryStore = store.get("mastery", {});
function noteAnswer(hanzi, correct){
  recordAnswer(masteryStore, hanzi, correct);
  store.set("mastery", masteryStore);
}

function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

/* ============================== audio (pre-recorded mp3 first, Web Speech fallback) ============================== */
// index.json lists which words have a bundled mp3; fetch fails silently on file://
// (keeping TTS-only), which is fine per the file:// constraint.
fetch("audio/index.json").then(r=>r.json()).then(ix=>initAudio(ix)).catch(()=>initAudio([]));

/* ============================== screens ============================== */
function show(name){
  document.querySelectorAll(".screen").forEach(el=>el.classList.remove("on"));
  $("#s-"+name).classList.add("on");
}
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click", ()=>{
  const t = b.dataset.go;
  if(t==="scope"){ renderScope(); show("scope"); }
  else if(t==="scope-learn"){ renderScope(); show("scope"); }
  else if(t==="scores"){ renderScores(); show("scores"); }
  else if(t==="progress"){ renderProgress(); show("progress"); }
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
  store.set("scope", scope);
  const startable = pool.length >= 8;
  $("#go-battle").disabled = $("#go-endless").disabled = $("#go-learn").disabled = !startable;
}
$("#f-core").onclick = ()=>{ scope.core = !scope.core; renderScope(); };
$("#f-new").onclick  = ()=>{ scope.newOnly = !scope.newOnly; renderScope(); };
document.querySelectorAll("#topn-chips .chip").forEach(c=>c.onclick = ()=>{ scope.topN = +c.dataset.n; renderScope(); });
document.querySelectorAll("#lang-chips .chip").forEach(c=>c.onclick = ()=>{ scope.lang = c.dataset.lang; renderScope(); });
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
  else fc.done++;
  fc.i++; fc.flipped = false;
  if(fc.i >= fc.deck.length){ endLearn(); return; }
  renderCard();
}
$("#fc-know").onclick  = ()=>nextCard(false);
$("#fc-again").onclick = ()=>nextCard(true);

/* ============================== battle ============================== */
/* Chinese-Zombie pattern: side view, one zombie walks in from the right toward
   the bear; 4 meaning choices; ONE attempt per word — a wrong tap makes the
   zombie charge and costs a heart. No retrying, so random guessing is fatal. */
const cv = $("#cv"), ctx = cv.getContext("2d");
const B = {on:false};
const GROUND = 30;   // px above canvas bottom
const BEAR_X = 52;
function sizeCanvas(){
  const w = cv.clientWidth, h = Math.round(Math.min(window.innerHeight*0.40, 340));
  const dpr = window.devicePixelRatio||1;
  cv.style.height = h+"px";
  cv.width = Math.round(w*dpr); cv.height = Math.round(h*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  B.w = w; B.h = h;
}
window.addEventListener("resize", ()=>{ if(B.on) sizeCanvas(); });

function pickWord(){
  const deck = B.deck;
  // frequency-weighted, avoiding the last few words
  for(let tries=0; tries<40; tries++){
    let total = 0;
    for(const w of deck) total += Math.sqrt(w.f)+1;
    let r = Math.random()*total;
    for(const w of deck){
      r -= Math.sqrt(w.f)+1;
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
  B.score = 0; B.combo = 0; B.lives = 3;
  B.wordsTotal = mode==="round"? 20 : Infinity;
  B.spawned = 0; B.resolved = 0; B.correct = 0; B.attempts = 0;
  B.recent = []; B.misses = []; B.missSet = new Set();
  B.nextAt = 0; B.lastT = 0; B.locked = false;
  // higher scopes walk faster (difficulty by level), and speed ramps per word
  const avg = scope.levels.reduce((a,b)=>a+b,0)/scope.levels.length;
  B.speed = 30 * (1 + (avg-1)*0.10);
  show("battle");
  sizeCanvas();
  updateHud();
  $("#opts").innerHTML = "";
  requestAnimationFrame(loop);
}
function stopBattle(){ B.on = false; if(window.speechSynthesis) speechSynthesis.cancel(); }
$("#hud-quit").onclick = ()=>{ endBattle(true); };
$("#hud-sfx").onclick = ()=>{ sfx.enabled = !sfx.enabled; store.set("sfx", sfx.enabled); $("#hud-sfx").textContent = sfx.enabled ? "🔔" : "🔕"; };
$("#hud-audio").onclick = ()=>{
  settings.autoSpeak = !settings.autoSpeak;
  store.set("settings", settings);
  $("#hud-audio").textContent = settings.autoSpeak? "🔊":"🔇";
};
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
  B.zombie = {w, x: B.w+30, state:"walk", wob:Math.random()*7};
  B.spawned++; B.locked = false;
  if(settings.autoSpeak) speak(w.h);
  renderOptions(w);
  B.speed *= 1.03;
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
  B.attempts++;
  noteAnswer(z.w.h, o.h === z.w.h);
  if(o.h === z.w.h){
    B.correct++; B.combo++;
    // farther kill = bigger bonus (replaces the old time bonus)
    const distFrac = Math.max(0, z.x - BEAR_X - 34) / (B.w - BEAR_X - 34);
    B.score += killPoints(B.combo, distFrac);
    sfx.kill(); if (B.combo >= 3) sfx.combo(B.combo);
    btn.classList.add("good");
    lockOptions();
    B.proj = {x:BEAR_X+16, y:B.h-GROUND-30};   // honey pot flies at the zombie
    speak(z.w.h);                              // the sound sticks with the kill
  }else{
    // ONE attempt per word: wrong tap = the zombie charges. No retries.
    B.combo = 0;
    sfx.wrong();
    btn.classList.add("bad");
    lockOptions();
    revealCorrect(z.w);
    pushMiss(z.w);
    z.state = "dash";
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
  const gy = B.h-GROUND;
  for(let i=0;i<12;i++) B.parts.push({x:z.x, y:gy-16, vx:(Math.random()-.5)*240, vy:-Math.random()*200, life:.6});
  z.state = "dying";
  B.dyingUntil = performance.now() + 250;
  B.proj = null;
  B.resolved++;
}
function bite(timedOut){
  const z = B.zombie;
  if(timedOut){ B.attempts++; B.combo = 0; noteAnswer(z.w.h, false); pushMiss(z.w); revealCorrect(z.w); lockOptions(); }
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
      z.x -= B.speed*dt;
      if(z.x <= BEAR_X+34) bite(true);          // too slow — zombie got there
    }else if(z.state==="dash"){
      z.x -= B.speed*7*dt;
      if(z.x <= BEAR_X+34) bite(false);         // charging after a wrong answer
    }else if(z.state==="dying" && t >= B.dyingUntil){
      scheduleNext(200);
    }
  }
  if(B.proj && B.zombie){
    B.proj.x += 560*dt;
    if(B.proj.x >= B.zombie.x-8) killZombie(B.zombie);
  }
  for(const p of B.parts){ p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=500*dt; p.life-=dt; }
  B.parts = B.parts.filter(p=>p.life>0);
  B.flash = Math.max(0, B.flash-2.2*dt);
  draw(t);
  requestAnimationFrame(loop);
}
function draw(t){
  ctx.clearRect(0,0,B.w,B.h);
  const gy = B.h-GROUND;
  // ground + bear + honey
  ctx.strokeStyle = "#6b5a34"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0,gy+12); ctx.lineTo(B.w,gy+12); ctx.stroke();
  ctx.textAlign = "center";
  ctx.font = "36px serif";
  ctx.fillText("🐻", BEAR_X, gy+6);
  ctx.font = "22px serif";
  ctx.fillText("🍯", 16, gy+8);
  const z = B.zombie;
  if(z){
    const wob = Math.sin(t/160 + z.wob)*3;
    // word label above the zombie, clamped inside the canvas
    ctx.font = "600 26px 'Segoe UI',sans-serif";
    const lw = Math.max(ctx.measureText(z.w.h).width, 64)+22;
    const cx = Math.min(Math.max(z.x, lw/2+6), B.w-lw/2-6);
    ctx.fillStyle = z.state==="dash"? "rgba(255,214,204,.97)":"rgba(255,240,210,.97)";
    ctx.strokeStyle = z.state==="dash"? "#e05a4e":"#ffb347";
    ctx.lineWidth = 2.5;
    roundRect(cx-lw/2, gy-118, lw, 52, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#1c241a";
    ctx.fillText(z.w.h, cx, gy-96);
    ctx.font = "13px 'Segoe UI',sans-serif";
    ctx.fillStyle = "#7a5b17";
    ctx.fillText(z.w.p, cx, gy-76);
    // zombie
    drawZombie(ctx, z.x, gy + 6, t, z.state);
  }
  if(B.proj){ ctx.font = "20px serif"; ctx.fillText("🍯", B.proj.x, B.proj.y); }
  // splat particles
  ctx.fillStyle = "#8fce58";
  for(const p of B.parts){ ctx.globalAlpha = Math.max(0,p.life/0.6); ctx.beginPath(); ctx.arc(p.x,p.y,3.4,0,7); ctx.fill(); }
  ctx.globalAlpha = 1;
  // hit flash
  if(B.flash>0){ ctx.fillStyle = `rgba(224,90,78,${(0.38*B.flash).toFixed(3)})`; ctx.fillRect(0,0,B.w,B.h); }
}
function roundRect(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}
function endBattle(quit){
  stopBattle();
  if(quit){ show("home"); return; }
  const acc = B.attempts? Math.round(100*B.correct/B.attempts) : 0;
  $("#r-score").textContent = B.score;
  const key = scopeKey(scope)+"·"+B.mode;
  const best = store.get("best", {});
  const prev = best[key]? best[key].score : 0;
  const isBest = B.score > prev;
  if(isBest){ best[key] = {score:B.score, date:new Date().toISOString().slice(0,10)}; store.set("best", best); }
  $("#r-sub").innerHTML = `${acc}% accuracy · ${B.correct} kills · ${key}`
    + (isBest? ` · <b style="color:var(--amber)">new best!</b>` : ` · best ${prev}`);
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
  box.innerHTML = keys.length? "" : `<div class="scorerow" style="color:var(--muted)">No scores yet — go fight some zombies!</div>`;
  for(const k of keys){
    const row = document.createElement("div");
    row.className = "scorerow";
    row.innerHTML = `<span>${k}</span><span><b>${best[k].score}</b> <span style="color:var(--muted);font-size:12px">${best[k].date}</span></span>`;
    box.appendChild(row);
  }
}

/* ============================== progress ============================== */
function renderProgress(){
  const box = $("#progresslist");
  box.innerHTML = "";
  for(let n=1;n<=6;n++){
    const words = D.levels[String(n)];
    const m = levelMastery(masteryStore, words);
    const row = document.createElement("div");
    row.className = "scorerow";
    row.innerHTML = `<span>HSK${n}</span>
      <span><b>${m.pct}%</b> mastered · ${m.seen.toLocaleString()}/${words.length.toLocaleString()} seen</span>`;
    box.appendChild(row);
  }
}

/* ============================== boot ============================== */
pool = buildPool(D.levels, scope);
if(location.hash === "#debug"){ window.__debugTarget = ()=> B.zombie && B.zombie.w.h; }
