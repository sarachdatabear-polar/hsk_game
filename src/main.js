"use strict";
import { buildPool, coveragePct, scopeKey, meaning as meaningOf, normalizeLen, modeKey, scopeSummary } from "./pool.js";
import { formatFor, FORMATS } from "./formats.js";
import { gradeTyped, syllables, syllableTones, letters } from "./pinyin.js";
import { clozeFor } from "./cloze.js";
import { tonePool, toneQuestion, gradeTone } from "./tone_gym.js";
import { killPoints } from "./scoring.js";
import { coinBurst, comboFloater, fireworkRing, feedbackEffect, perfectBonus } from "./fx.js";
import { sfx } from "./sfx.js";
import { drawCat } from "./cat.js";
import { drawRaccoon, drawHpBar, RACCOON_HEIGHT } from "./raccoon.js";
import { uiScale, layout } from "./layout.js";
import { loadSprites, sprite } from "./sprites.js";
import { nineSliceRects } from "./nineslice.js";
import { preload as preloadAssets } from "./assets.js";
import { recordAnswer, levelMastery } from "./mastery.js";
import { levelForXp, xpToNext, accessoriesFor, nextMilestone, MILESTONES } from "./growth.js";
import { wordWeight, smartDeck, weakWords } from "./srs.js";
import { defaultDaily, noteActivity, streakInfo } from "./daily.js";
import { defaultQuestState, noteQuestEvent, questStatus } from "./quests.js";
import { isBossSpawn, bossPoints, bossSpeedFactor } from "./boss.js";
import { initAudio, speak, audioAvailable, hasMp3 } from "./audio.js";
import { initNative, hapticKill, hapticWrong, keepAwake } from "./native.js";
import { CATALOG, SKIN_PALETTES, defaultShop, canAfford, buy, equipItem, seasonStatus, upgradePrice, unownedDailyStock } from "./shop.js";
import { BUILDINGS, streetPieces, streetProgress, streetMetrics } from "./street.js";
import { iconSvg, setIconLabel, setPill } from "./icons.js";
import { t, setLocale, getLocale, detectLocale } from "./i18n.js";
import { HANZI_STACK, LATIN_STACK, fontString } from "./fonts.js";
import { navVisibleOn, activeTabFor } from "./nav.js";
import { roundLabel, comboMultiplier, comboFires } from "./hud.js";
import { comboGlowTier, plaqueBounce, countUpValue } from "./juice.js";
import { isFirstRun, introDeck } from "./firstrun.js";
import { defaultStickers, stickerDefs, scopeFacts, evaluateAwards, popToast } from "./stickers.js";
import { journeyNodes, currentNodeId } from "./journey.js";

/* ============================== data & state ============================== */
const D = window.HSK_DATA;
// v6 phase 3: cloze sentence data + baked distractors, loaded via a <script>
// tag before dist/app.js. Undefined on file:// if the tag is missing → the
// cloze format never triggers (caps.cloze returns false for every word).
const CLOZE = window.HSK_CLOZE || {};
// hanzi → full record, over the WHOLE dataset (not the scoped pool). Cloze
// distractors may be words outside a top-N scope, so their pinyin subs must
// resolve here. Built once at boot.
const BY_HANZI = {};
for (const lv of Object.values(D.levels)) for (const w of lv) BY_HANZI[w.h] = w;
const $ = s => document.querySelector(s);
// Accessibility (§11): read once at boot. When set, feedback-stamp effects
// (drawFeedbackLayer) get half the on-screen duration and the hit-flash
// screen shake is skipped outright (see the wrong-answer branch in answer()).
const REDUCED_MOTION = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
function fxDuration(ms){ return REDUCED_MOTION ? Math.round(ms/2) : ms; }
function fxUntil(ms){ return performance.now() + fxDuration(ms); }
const store = {
  get(k, d){ try{ const v = localStorage.getItem("nbhsk."+k); return v===null? d : JSON.parse(v);}catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem("nbhsk."+k, JSON.stringify(v)); }catch(e){} }
};
const scope = Object.assign({levels:[3], core:false, newOnly:false, topN:0, lang:"both", sessionLen:20},
                            store.get("scope", {}));
let settings = Object.assign({autoSpeak:true, showPinyin:true}, store.get("settings", {}));
let formatIntros = store.get("formatIntros", {});   // v6: which formats have had their soft-intro
// UI language: persisted choice wins, else device language. i18n.js is pure,
// so persistence lives here (nbhsk.locale), like every other nbhsk.* key.
setLocale(store.get("locale", detectLocale()));
sfx.enabled = store.get("sfx", true);
let pool = [];            // current merged word pool
let learnDeck = null;     // override deck for "review misses"
let lenCustomOpen = false;  // "Custom" chip tapped; input visible even if value matches a preset
let battleDeckOverride = null;  // when set, next battle draws only these words (e.g. "fight misses")
let smartDeckNext = false;   // next battle's override is a smart-review deck (earns the perfect bonus)
let lastMode = "round";
// A4 first-run intro: null when not in the intro, else "learn" -> "battle".
// introWords carries the same 6 words from warm-up into the battle.
let introPhase = null;
let introWords = [];
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
// #home-level is the whole status capsule (avatar + level text + XP bar, M3);
// fill its children directly rather than replacing them like setPill does.
function updateLevelChip(){
  const el = $("#home-level");
  if(!el) return;
  const lv = levelForXp(xp);
  const prog = xpToNext(xp);
  const pct = prog.need ? Math.round(100*prog.into/prog.need) : 100;
  const txt = el.querySelector(".level-text");
  const bar = el.querySelector(".xp-bar i");
  if(txt) txt.textContent = `Lv ${lv}`;
  if(bar) bar.style.width = pct + "%";
}
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
// #home-streak is the cream streak plaque (M3): fire icon + title, day count +
// a ✓ that only shows once today's goal is met, and a green→gold bar for
// today's progress toward that goal. Fill children in place, like updateLevelChip.
function updateStreakChip(){
  const el = $("#home-streak");
  if(!el) return;
  const info = streakInfo(daily, todayStr());
  const title = el.querySelector(".streak-title");
  const count = el.querySelector(".streak-count");
  const bar = el.querySelector(".streak-bar i");
  if(title) title.textContent = t("home.streakTitle");
  if(count) count.textContent = t("home.streakDays", { n: info.streak });
  if(bar) bar.style.width = Math.min(100, Math.round(100*info.todayResolved/info.goal)) + "%";
  const note = el.querySelector("#streak-note");
  if(note){
    note.hidden = !info.restNote;
    if(info.restNote) note.textContent = t("streak.restUsed", { n: info.streak });
  }
  el.classList.toggle("goal-met", info.goalMet);
}
function noteDaily(count){
  daily = noteActivity(daily, todayStr(), count);
  store.set("daily", daily);
  updateStreakChip();
}

/* ============================== daily quests ============================== */
let questState = Object.assign(defaultQuestState(), store.get("quests", {}));
let questToasts = [];  // quests completed during the current battle, for the results screen

/* ============================== sticker album (B2) ============================== */
// earn-only — never purchasable. Persisted immediately on every award so a
// sticker earned mid-session survives reload (PRD B2 acceptance).
// null-safe: Object.assign ignores null/undefined sources, and a stored
// literal null (bad write/manual edit) must not crash module eval.
const st0 = Object.assign(defaultStickers(), store.get("stickers", {}) || {});
let stickerState = {
  earned: Object.assign({}, st0.earned),
  queue: Array.isArray(st0.queue) ? st0.queue.slice() : [],
};
const STICKER_LEVEL_COUNTS = Object.fromEntries(Object.entries(D.levels).map(([k, v]) => [k, v.length]));
const STICKER_DEFS = stickerDefs(STICKER_LEVEL_COUNTS);

function stickerLabel(def){
  if(def.kind === "scope") return t("sticker.scopeName", { lv: def.lv, n: def.topN });
  if(def.kind === "milestone") return t("sticker.msName", { lv: def.lv, pct: def.pct });
  if(def.event === "welcome") return t("sticker.welcomeName");
  if(def.event === "first-boss") return t("sticker.bossName");
  if(def.event === "streak-7") return t("sticker.streak7Name");
  return t("sticker.streak30Name");
}
function stickerHint(def){
  if(def.kind === "scope") return t("sticker.scopeHint", { lv: def.lv, n: def.topN });
  if(def.kind === "milestone") return t("sticker.msHint", { lv: def.lv, pct: def.pct });
  if(def.event === "welcome") return t("sticker.welcomeHint");
  if(def.event === "first-boss") return t("sticker.bossHint");
  if(def.event === "streak-7") return t("sticker.streak7Hint");
  return t("sticker.streak30Hint");
}
function stickerIcon(def){
  if(def.kind === "scope") return "paw";
  if(def.kind === "milestone") return "star";
  if(def.event === "first-boss") return "target";
  if(def.event === "welcome") return "cards";
  return "streak";
}
function renderAlbum(){
  const box = $("#album-list");
  box.innerHTML = "";
  const tile = def => {
    const earned = !!stickerState.earned[def.id];
    const el = document.createElement("div");
    el.className = `sticker kind-${def.kind}` + (earned ? "" : " locked");
    el.appendChild(iconSvg(stickerIcon(def)));
    const name = document.createElement("b"); name.textContent = stickerLabel(def);
    el.appendChild(name);
    const hint = document.createElement("small");
    hint.textContent = earned ? stickerState.earned[def.id] : stickerHint(def);
    el.appendChild(hint);
    return el;
  };
  for(let lv = 1; lv <= 6; lv++){
    const defs = STICKER_DEFS.filter(d => d.lv === lv);
    if(!defs.length) continue;
    const head = document.createElement("div");
    head.className = "sect"; head.textContent = `HSK${lv}`;
    box.appendChild(head);
    const grid = document.createElement("div"); grid.className = "album-grid";
    defs.forEach(d => grid.appendChild(tile(d)));
    box.appendChild(grid);
  }
  const evHead = document.createElement("div");
  evHead.className = "sect"; evHead.textContent = t("album.events");
  box.appendChild(evHead);
  const evGrid = document.createElement("div"); evGrid.className = "album-grid";
  STICKER_DEFS.filter(d => d.kind === "event").forEach(d => evGrid.appendChild(tile(d)));
  box.appendChild(evGrid);
}
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
    : deck.length < 8 ? t("scope.smartReviewProgress", { have: deck.length, min: 8 })
    : t("scope.smartReviewReady", { n: deck.length }));
}
$("#go-smart").onclick = ()=>{
  const deck = smartDeck(masteryStore, pool, Date.now());
  if(deck.length < 8) return;
  battleDeckOverride = deck;
  smartDeckNext = true;
  questEvent("review");
  startBattle("round");
};

/* ============================== home screen (M3) ============================== */
// Builds the scope chip's label from pool.js's pure scopeSummary() — localizes
// the filter words here so scopeSummary itself stays i18n-free.
function scopeChipLabel(){
  const s = scopeSummary(scope);
  const bits = [s.levelLabel];
  if(s.core) bits.push(t("scope.highYield"));
  if(s.newOnly) bits.push(t("scope.newOnly"));
  bits.push(t("home.scopeWords", { n: s.sessionLen }));
  return bits.join(" · ");
}
// Refreshes every home-screen dynamic bit: called at boot and every time we
// navigate back to home (show("home")), so a scope change made on the scope
// screen (which rebuilds `pool`) is reflected the moment the player returns.
function renderHome(){
  updateLevelChip();
  updateWalletChip();
  updateStreakChip();
  updateSmartBtn();
  const startable = pool.length >= 8;
  const startBtn = $("#home-start");
  const hint = $("#home-start-hint");
  if(startBtn) startBtn.disabled = !startable;
  if(hint) hint.hidden = startable;
  const chip = $("#home-scope-chip");
  if(chip) chip.textContent = scopeChipLabel();
  // v6p3 Tone Trainer: hidden/greyed when the scoped pool has no MP3-backed
  // eligible words (e.g. file:// where audio/index.json can't be fetched) —
  // TTS-only tone training would be misleading, so we hide rather than mislead.
  const tonesBtn = $("#home-tones-btn");
  if(tonesBtn){
    const enabled = tonePool(pool, hasMp3).length > 0;
    tonesBtn.disabled = !enabled;
    tonesBtn.title = enabled ? "" : t("home.tonesDisabledHint");
    tonesBtn.setAttribute("aria-label", enabled ? t("home.tones") : t("home.tones") + " — " + t("home.tonesDisabledHint"));
  }
}
// A4: START launches the smart choice — Smart Review when >=8 weak/due words,
// else a normal round over the configured scope. The scope chip next to it
// keeps the full picker one tap away.
$("#home-start").onclick = ()=>{
  if(pool.length < 8) return;
  const deck = smartDeck(masteryStore, pool, Date.now());
  if(deck.length >= 8){
    battleDeckOverride = deck;
    smartDeckNext = true;
    questEvent("review");
  }
  startBattle("round");
};

/* ============================== first run (A4) ============================== */
function renderWelcome(){
  const lang = getLocale();
  document.querySelectorAll("#welcome-lang-chips .chip").forEach(b=>
    b.classList.toggle("on", b.dataset.wlang === lang));
  const lv = scope.levels[0] || 3;
  document.querySelectorAll("#welcome-level-chips .chip").forEach(b=>
    b.classList.toggle("on", Number(b.dataset.wlv) === lv));
}
document.querySelectorAll("#welcome-lang-chips .chip").forEach(b=>
  b.addEventListener("click", ()=>{ setUiLocale(b.dataset.wlang); renderWelcome(); }));
document.querySelectorAll("#welcome-level-chips .chip").forEach(b=>
  b.addEventListener("click", ()=>{
    scope.levels = [Number(b.dataset.wlv)];
    store.set("scope", scope);
    pool = buildPool(D.levels, scope);
    renderWelcome();
  }));
$("#welcome-start").onclick = ()=>{
  introWords = introDeck(pool, 6);
  if(introWords.length < 2){ store.set("introDone", true); show("home"); return; }
  introPhase = "learn";
  learnDeck = introWords.slice();
  startLearn();
};

function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

/* ============================== audio (pre-recorded mp3 first, Web Speech fallback) ============================== */
// index.json lists which words have a bundled mp3; fetch fails silently on file://
// (keeping TTS-only), which is fine per the file:// constraint.
fetch("audio/index.json").then(r=>r.json()).then(ix=>initAudio(ix)).catch(()=>initAudio([]))
  // mp3Set fills in asynchronously here, AFTER the synchronous boot renderHome()
  // has already run with an empty set — refresh Home so the Tone Trainer entry
  // gate (which reads hasMp3) reflects real audio availability, not the default.
  .finally(()=>{ if(currentScreen === "home") renderHome(); });

/* ============================== sprite preload ============================== */
loadSprites();
preloadAssets();

/* ============================== font preload (guarded, non-blocking) ============================== */
if (document.fonts && document.fonts.load) { document.fonts.load("900 40px 'LC Hanzi'").catch(()=>{}); }

/* ============================== i18n DOM binding ============================== */
// Localizes any static markup annotated with data-i18n* attributes. Dynamic
// strings (built in JS) call t() directly at render time.
function applyStaticI18n(root = document){
  root.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.getAttribute("data-i18n")); });
  // data-i18n-html: for keys whose value embeds <b> markup (howto.* — see
  // i18n.js) — same innerHTML route scope.readout/shop.wallet already use for
  // dynamic strings, just routed through the static walker instead of a
  // per-call-site innerHTML assignment.
  root.querySelectorAll("[data-i18n-html]").forEach(el => { el.innerHTML = t(el.getAttribute("data-i18n-html")); });
  root.querySelectorAll("[data-i18n-title]").forEach(el => {
    const v = t(el.getAttribute("data-i18n-title"));
    el.title = v; el.setAttribute("aria-label", v);
  });
  root.querySelectorAll("[data-i18n-ph]").forEach(el => { el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph"))); });
  document.documentElement.lang = getLocale();
}
// Localized display name for a shop/street id (t("item."+id) / t("building."+id)),
// falling back to the English name when the key is missing — t() returns the
// key string itself when unresolved (see i18n.js), so compare against that.
function tOr(key, fallback){
  const v = t(key);
  return v === key ? fallback : v;
}

/* ============================== screens ============================== */
let currentScreen = "home";
function updateNav(name){
  const nav = $("#bottom-nav");
  if(!nav) return;
  const visible = navVisibleOn(name);
  nav.style.display = visible ? "flex" : "none";
  const active = activeTabFor(name);
  nav.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active", b.dataset.tab===active));
}
function show(name){
  // A4: ANY route home mid-intro (learn Exit, Android hardware back via
  // initNative's goHome, future shortcuts) abandons the intro for good —
  // never hijack a later session, never re-show welcome. endBattle's own
  // intro completion runs before its show() calls, so this is a no-op there.
  if(name === "home" && introPhase){ introPhase = null; store.set("introDone", true); }
  currentScreen = name;
  document.querySelectorAll(".screen").forEach(el=>el.classList.remove("on"));
  $("#s-"+name).classList.add("on");
  updateNav(name);
  if(name==="home"){ renderHome(); }
  if(name==="street"){ renderStreet(); }
  if(name==="quests"){ renderQuests(); }
}
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click", ()=>{
  const tab = b.dataset.go;
  if(tab==="scope"){ renderScope(); applyScopeView(); show("scope"); }
  else if(tab==="scope-learn"){ renderScope(); applyScopeView(); show("scope"); }
  else if(tab==="scores"){ renderScores(); show("scores"); }
  else if(tab==="progress"){ renderProgress(); show("progress"); }
  else if(tab==="shop"){ renderShop(); show("shop"); }
  else if(tab==="album"){ renderAlbum(); show("album"); }
  else if(tab==="tones"){ startToneRound(); show("tones"); }
  else {
    if(tab==="home"){ stopBattle(); }   // intro abandonment handled in show()
    show(tab);
  }
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
/* ============================== journey map (B3) ============================== */
// Optional suggested-order view over the same sub-scopes as the picker and
// the sticker album (shared scopeNodes/scopeFacts — always consistent).
// No hard gating: every node starts its scope immediately.
let scopeView = store.get("scopeView", "picker");
function applyScopeView(){
  $("#picker-pane").hidden = scopeView !== "picker";
  $("#journey-pane").hidden = scopeView !== "journey";
  document.querySelectorAll("#scope-view-tabs .chip").forEach(c =>
    c.classList.toggle("on", c.dataset.view === scopeView));
  if(scopeView === "journey") renderJourney();
}
document.querySelectorAll("#scope-view-tabs .chip").forEach(b =>
  b.addEventListener("click", ()=>{
    scopeView = b.dataset.view;
    store.set("scopeView", scopeView);
    applyScopeView();
  }));
function nodeLabel(n){
  return n.topN ? t("journey.nodeTop", { lv: n.lv, n: n.topN }) : t("journey.nodeAll", { lv: n.lv });
}
function playJourneyNode(n){
  scope.levels = [n.lv];
  scope.topN = n.topN;
  scope.core = false;
  scope.newOnly = false;
  renderScope();          // rebuilds pool + persists scope
  if(pool.length >= 8) startBattle("round");
}
function renderJourney(){
  const facts = scopeFacts(D.levels, masteryStore);
  const nodes = journeyNodes(STICKER_LEVEL_COUNTS, facts.scopePcts);
  const hereId = currentNodeId(nodes);
  const box = $("#journey-list");
  box.innerHTML = "";
  for(const n of nodes){
    const row = document.createElement("button");
    row.className = "j-node" + (n.stars >= 3 ? " done" : "");
    const dot = document.createElement("span");
    dot.className = "j-dot";
    dot.textContent = n.stars >= 3 ? "✓" : `${n.pct}%`;
    row.appendChild(dot);
    const copy = document.createElement("span");
    copy.className = "j-copy";
    const name = document.createElement("b");
    name.textContent = nodeLabel(n);
    copy.appendChild(name);
    const stars = document.createElement("span");
    stars.className = "j-stars";
    stars.innerHTML = "★".repeat(n.stars) + `<span class="off">${"★".repeat(3 - n.stars)}</span>`;
    copy.appendChild(stars);
    if(n.id === hereId){
      const here = document.createElement("span");
      here.className = "j-here";
      here.appendChild(iconSvg("paw"));
      const hl = document.createElement("span");
      hl.textContent = t("journey.youAreHere");
      here.appendChild(hl);
      copy.appendChild(here);
    }
    row.appendChild(copy);
    const play = document.createElement("span");
    play.className = "j-play";
    play.textContent = t("journey.play");
    row.appendChild(play);
    row.onclick = ()=> playJourneyNode(n);
    box.appendChild(row);
  }
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
function endLearn(){
  if(introPhase === "learn"){
    // A4: warm-up done — straight into a short battle over the same 6 words
    // (normal rules, standard distractors; no fake difficulty).
    introPhase = "battle";
    battleDeckOverride = introWords.slice();
    startBattle("round");
    return;
  }
  show(fc.fromMisses ? "results" : "home");
}
function renderCard(){
  const w = fc.deck[fc.i];
  if(!w){ endLearn(); return; }
  $("#fc-count").textContent = t("learn.count", { done: fc.done, left: fc.deck.length - fc.i });
  const c = $("#fc-card");
  if(!fc.flipped){
    c.innerHTML = `<div class="hz">${w.h}</div><div class="py">${w.p}</div>
      <div class="hint">${t("learn.hintFront", { lv: w.lv, ta: w.ta, tt: w.tt })}</div>`;
    if(settings.autoSpeak) speak(w.h);
  }else{
    const th = w.t? `<div class="th">${w.t}</div>` : `<div class="th" style="color:var(--muted)">${t("fc.noThai")}</div>`;
    c.innerHTML = `<div class="hz" style="font-size:40px">${w.h}</div><div class="py">${w.p}</div>
      <div class="mean">${w.e}${th}</div><div class="hint">${t("learn.hintBack")}</div>`;
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

/* ============================== tone trainer (v6p3) ============================== */
// Standalone tone-*discrimination* minigame (design spec 2026-07-09): hear a
// single-syllable word, tap the tone 1-4. Distinct from the battle `tone`
// ladder rung (visual pinyin recall). Light rewards only — counts toward
// daily activity + a little XP/coin, but never touches mastery/SRS (tone
// accuracy != meaning recall), mirroring `B` (battle state) but far simpler.
const TG = {pool:[], q:null, i:0, len:10, score:0, streak:0, bestStreak:0, locked:false, advanceTimer:null, ended:false};
function startToneRound(){
  // Kill any auto-advance timer still pending from a previous round (the player
  // can tap Home mid-reveal, then re-enter — without this, the orphan timer's
  // currentScreen guard would pass against the NEW round, skipping a question
  // or double-firing endToneRound. See the guarded setTimeout in answerTone.
  clearTimeout(TG.advanceTimer); TG.advanceTimer = null;
  TG.pool = tonePool(pool, hasMp3);
  TG.i = 0; TG.score = 0; TG.streak = 0; TG.bestStreak = 0; TG.q = null; TG.locked = false; TG.ended = false;
  nextToneQuestion();
}
function nextToneQuestion(){
  if(TG.i >= TG.len){ endToneRound(); return; }
  TG.i++;
  TG.q = toneQuestion(TG.pool, hasMp3, Math.random);
  if(!TG.q){ endToneRound(); return; }   // pool ran out/empty — end early rather than crash
  TG.locked = false;
  renderToneQuestion();
  speak(TG.q.word.h);
}
function renderToneQuestion(){
  const prog = $("#tones-progress");
  if(prog) prog.textContent = t("tones.progress", { i: TG.i, n: TG.len });
  const reveal = $("#tones-reveal");
  if(reveal) reveal.innerHTML = "";
  const box = $("#tones-options");
  box.innerHTML = "";
  for(let k=1;k<=4;k++){
    const b = document.createElement("button");
    b.className = "chip tone-chip";
    b.textContent = t("tones.tone"+k);
    b.setAttribute("aria-label", t("tones.toneAria", { n: k }));
    b._correct = k === TG.q.tone;
    b.onclick = ()=>answerTone(k, b);
    box.appendChild(b);
  }
}
function answerTone(picked, btn){
  if(TG.locked || !TG.q) return;
  TG.locked = true;
  const q = TG.q;
  const ok = gradeTone(q, picked);
  document.querySelectorAll("#tones-options button").forEach(b=>{
    b.disabled = true;
    if(b._correct) b.classList.add("good");
  });
  if(!ok) btn.classList.add("bad");
  if(ok){ TG.score++; TG.streak++; TG.bestStreak = Math.max(TG.bestStreak, TG.streak); sfx.kill(); }
  else { TG.streak = 0; sfx.wrong(); }
  const reveal = $("#tones-reveal");
  if(reveal) reveal.innerHTML = `<div class="boss-prompt"><span class="hz">${q.word.h}</span><span class="py">${q.word.p}</span></div>`;
  // Guard the deferred advance only (not nextToneQuestion itself, which the
  // very first call needs to run while currentScreen is still "home" — see
  // the [data-go] "tones" route): without this, tapping Home during the
  // reveal window lets the timer fire nextToneQuestion() on the hidden
  // screen, playing audio over Home (and crediting rewards early on the
  // last question).
  TG.advanceTimer = setTimeout(()=>{ TG.advanceTimer = null; if(currentScreen === "tones") nextToneQuestion(); }, fxDuration(900));
}
// Light rewards (design spec §3): +1 coin and +1 XP per correct answer,
// counted toward the daily streak — deliberately NOT recordAnswer/mastery.
function endToneRound(){
  if(TG.ended) return;   // idempotent — rewards must credit exactly once per round
  TG.ended = true;
  clearTimeout(TG.advanceTimer); TG.advanceTimer = null;
  const box = $("#tones-options");
  if(box) box.innerHTML = "";
  const prog = $("#tones-progress");
  if(prog) prog.textContent = "";
  wallet += TG.score;
  store.set("wallet", wallet);
  updateWalletChip();
  addXp(TG.score);
  noteDaily(TG.score);
  const reveal = $("#tones-reveal");
  if(!reveal) return;
  reveal.innerHTML = "";
  const done = document.createElement("div");
  done.className = "boss-prompt";
  done.textContent = t("tones.roundDone");
  reveal.appendChild(done);
  const scoreLine = document.createElement("p");
  scoreLine.className = "sub";
  scoreLine.textContent = t("tones.score", { score: TG.score, total: TG.len });
  reveal.appendChild(scoreLine);
  const streakLine = document.createElement("p");
  streakLine.className = "sub";
  streakLine.textContent = t("tones.bestStreak", { n: TG.bestStreak });
  reveal.appendChild(streakLine);
  if(TG.score > 0){
    const rewardLine = document.createElement("p");
    rewardLine.className = "sub";
    rewardLine.textContent = t("tones.reward", { coins: TG.score, xp: TG.score });
    reveal.appendChild(rewardLine);
  }
  const again = document.createElement("button");
  again.className = "big primary";
  again.id = "tones-again";
  again.textContent = t("tones.again");
  again.onclick = ()=>startToneRound();
  reveal.appendChild(again);
}
$("#tones-replay").onclick = ()=>{ if(TG.q) speak(TG.q.word.h); };   // never locked — replay is always allowed

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

// Plaque speaker affordance (M6, §11 accessibility): the plaque itself is the
// tap target (not just a small icon) — B.plaqueRect is set every draw() frame
// from drawWordPlate(); null whenever no word is on screen. Mouse/touch via
// click, keyboard via Enter/Space on the now-focusable canvas (tabindex below).
// Shared gate for the plaque-replay affordance (click/keyboard/icon): once a
// word resolves, replay is always fine; while it's still live, formats whose
// audio would hand the answer away (tone, reverse) must not speak it.
function canReplayAudio(z){
  if(!z) return false;
  const live = z.state === "walk" && !z.revealed;
  const forbidden = FORMATS[z.format || "meaning"].audio === "never";
  return !(live && forbidden);
}
function replayCurrentWord(){
  if(B.paused || !B.zombie) return;
  if(!canReplayAudio(B.zombie)) return;
  speak(B.zombie.w.h);
}
cv.addEventListener("click", e=>{
  const r = B.plaqueRect;
  if(!r) return;
  const box = cv.getBoundingClientRect();
  const x = e.clientX - box.left, y = e.clientY - box.top;
  if(x>=r.x && x<=r.x+r.w && y>=r.y && y<=r.y+r.h) replayCurrentWord();
});
cv.addEventListener("keydown", e=>{
  if(e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
  e.preventDefault();
  replayCurrentWord();
});

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
  // miss/weak-word decks are a small custom slice of the pool, not a real round —
  // endBattle() must not let them set high scores or earn the perfect bonus.
  B.customDeck = !!(battleDeckOverride && battleDeckOverride.length >= 2);
  battleDeckOverride = null;
  B.smartRound = B.customDeck && smartDeckNext;   // full-rules smart review (owner: perfect bonus yes, best-score no)
  smartDeckNext = false;
  B.zombie = null; B.proj = null; B.parts = []; B.flash = 0; B.screenShake = 0; B.feedback = null;
  B.hitFlash = null; B.plaqueHitAt = 0;
  B.bossDefeated = false;   // session fact for the first-boss sticker (B2)
  B.floats = []; B.mascotHopUntil = 0;
  B.score = 0; B.combo = 0; B.lives = 3;
  B.wordsTotal = mode==="round"? normalizeLen(scope.sessionLen) : Infinity;
  // A4 intro battle: exactly the 6 warm-up words, not a full session
  if(introPhase === "battle") B.wordsTotal = B.deck.length;
  B.spawned = 0; B.resolved = 0; B.correct = 0; B.attempts = 0;
  B.recent = []; B.misses = []; B.missSet = new Set();
  B.nextAt = 0; B.lastT = 0; B.locked = false; B.bossStageAt = 0;
  B.paused = false; B.pausedAt = 0;
  $("#pause-overlay").classList.remove("on");
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
/* More-screen sound toggle mirrors the old hud-sfx (dims when muted); both stay
   in sync via the same nbhsk.sfx store key. The old home-screen sound icon was
   removed in M3 — #more-sound is now the single toggle outside battle. The
   sfx row inside the pause overlay (below) reuses this same function. */
function syncSoundToggles(){
  $("#more-sound").classList.toggle("muted", !sfx.enabled);
}
function toggleSfx(){
  sfx.enabled = !sfx.enabled;
  store.set("sfx", sfx.enabled);
  syncSoundToggles();
  updateHud();
}
$("#more-sound").addEventListener("click", toggleSfx);
syncSoundToggles();
function updateHud(){
  if(!B.on) return;   // toggleSfx can fire from the More screen, outside battle
  const lives = $("#hud-lives");
  lives.replaceChildren();
  for(let i=0;i<3;i++){
    const h = iconSvg("heart");
    h.classList.add("life-icon", i < B.lives ? "full" : "empty");
    lives.appendChild(h);
  }
  $("#hud-score").textContent = B.score;
  $("#hud-round").textContent = t("battle.round", { label: roundLabel(B.mode, B.spawned, B.wordsTotal) });
  updateComboStrip();
}
// Combo strip (M6, §6.2 item 5): COMBO N · fire row · xN badge. Replaces the
// old #hud-combo pill inside the score chip. Hidden entirely below a 2-combo
// so a fresh round (or one after a miss) doesn't show empty chrome.
function updateComboStrip(){
  const strip = $("#combo-strip");
  if(!strip) return;
  const show = B.combo >= 2;
  strip.classList.toggle("hidden", !show);
  if(!show) return;
  $("#combo-count").textContent = B.combo;
  // escalating warm glow at 5/10/15 (A3); classes are additive tiers
  const tier = comboGlowTier(B.combo);
  for(let g=1; g<=3; g++) strip.classList.toggle("glow-"+g, tier===g);
  const badge = $("#combo-badge");
  const label = comboMultiplier(B.combo);
  if(badge.textContent !== label && label && !REDUCED_MOTION){
    badge.classList.remove("pop");
    void badge.offsetWidth;   // restart the keyframe
    badge.classList.add("pop");
  }
  badge.textContent = label;
  const lit = comboFires(B.combo);
  const fires = $("#combo-fires");
  fires.replaceChildren();
  for(let i=0;i<6;i++){
    const f = iconSvg("streak");
    f.classList.add("combo-fire", i < lit ? "lit" : "unlit");
    fires.appendChild(f);
  }
}
/* ============================== pause overlay (M4) ==============================
   B.paused freezes the rAF loop's motion/spawn/expiry logic (loop() below) and
   blocks answer() taps, but keeps requestAnimationFrame alive so resuming is a
   plain unpause rather than a re-bootstrap. Every absolute performance.now()
   deadline the battle loop reads must be shifted forward by the pause duration
   on resume, or it "expires" while the player was looking at the overlay:
   B.nextAt, B.dyingUntil, B.mascotHopUntil, B.feedback.until, B.zombie.wrongUntil,
   B.hitFlash.until, B.plaqueHitAt. */
const PAUSE_TOGGLES = [
  { icon:"bell", iconOff:"bell-off", labelKey:"home.sound", isOn:()=>sfx.enabled, toggle:()=>toggleSfx() },
  { icon:"sound", iconOff:"muted", labelKey:"battle.wordAudio", isOn:()=>settings.autoSpeak,
    toggle:()=>{ settings.autoSpeak = !settings.autoSpeak; store.set("settings", settings); } },
  { icon:"pinyin", iconOff:"pinyin-off", labelKey:"battle.pinyin", isOn:()=>settings.showPinyin,
    toggle:()=>{ settings.showPinyin = !settings.showPinyin; store.set("settings", settings); } },
];
function renderPauseToggles(){
  const box = $("#pause-toggles");
  box.innerHTML = "";
  for(const cfg of PAUSE_TOGGLES){
    const on = cfg.isOn();
    const btn = document.createElement("button");
    btn.className = "pause-toggle"+(on? " on":"");
    const left = document.createElement("span");
    left.className = "icon-text";
    left.appendChild(iconSvg(on? cfg.icon : cfg.iconOff));
    const label = document.createElement("span");
    label.textContent = t(cfg.labelKey);
    left.appendChild(label);
    const state = document.createElement("span");
    state.className = "pt-state";
    state.textContent = on ? t("battle.on") : t("battle.off");
    btn.appendChild(left);
    btn.appendChild(state);
    // state changes (e.g. muting sfx) don't need the deadline shift below —
    // only the pause/resume clock does — so just re-render in place.
    btn.onclick = ()=>{ cfg.toggle(); renderPauseToggles(); };
    box.appendChild(btn);
  }
}
function pauseBattle(){
  if(!B.on || B.paused) return;
  B.paused = true;
  B.pausedAt = performance.now();
  keepAwake(false);   // nothing moves while paused — let the screen sleep
  renderPauseToggles();
  $("#pause-overlay").classList.add("on");
}
function resumeBattle(){
  if(!B.on || !B.paused) return;
  const shift = performance.now() - B.pausedAt;
  B.nextAt += shift;
  if(B.dyingUntil) B.dyingUntil += shift;
  if(B.mascotHopUntil) B.mascotHopUntil += shift;
  if(B.feedback) B.feedback.until += shift;
  if(B.zombie && B.zombie.wrongUntil) B.zombie.wrongUntil += shift;
  if(B.zombie && B.zombie.happyAt) B.zombie.happyAt += shift;
  if(B.bossStageAt) B.bossStageAt += shift;
  if(B.hitFlash) B.hitFlash.until += shift;
  if(B.plaqueHitAt) B.plaqueHitAt += shift;
  B.paused = false;
  keepAwake(true);
  $("#pause-overlay").classList.remove("on");
}
// Auto-pause (never auto-resume) when the tab/app is backgrounded, so a word's
// timer can't silently expire while the player isn't looking.
document.addEventListener("visibilitychange", ()=>{
  if(document.hidden && B.on && !B.paused) pauseBattle();
});
$("#hud-pause").onclick = ()=> pauseBattle();
$("#pause-resume").onclick = ()=> resumeBattle();
$("#pause-quit").onclick = ()=>{ $("#pause-overlay").classList.remove("on"); endBattle(true); };
function pushMiss(w){ if(!B.missSet.has(w.h)){ B.missSet.add(w.h); B.misses.push(w); } }
function spawnZombie(){
  const w = pickWord();
  // hp is cosmetic-only (drives the floating HP bar): 1 = full, drops to 0.5
  // once a boss's first stage is passed, animates to 0 on the kill.
  B.zombie = {w, x: B.w+30, state:"walk", hp: 1};
  B.spawned++; B.locked = false;
  if(isBossSpawn(B.spawned)){
    B.zombie.boss = true; B.zombie.stage = "meaning";
    sfx.combo(5);   // boss-arrival sting
  }
  const z = B.zombie;
  // v6 ladder: per-word format from the mastery streak. Bosses keep their own
  // two-stage ritual and the A4 intro battle stays meaning-only.
  z.format = (z.boss || introPhase === "battle") ? "meaning"
    : formatFor(w, masteryStore[w.h], { audio: audioAvailable(w.h), cloze: x => x.h in CLOZE });
  // v6 soft-intro: the first-ever appearance of a format freezes the walker,
  // the guide explains it in one line, and that word can never cost a life.
  const introKey = FORMATS[z.format].intro;
  if(introKey && !formatIntros[z.format]){
    z.frozen = true; z.introFree = true;
    showFormatIntro(introKey);
  }
  const pol = FORMATS[z.format].audio;
  // during an intro the audio waits for dismiss (played in showFormatIntro's OK)
  if(!z.frozen && (pol === "always" || (pol === "setting" && settings.autoSpeak))) speak(w.h);
  renderQuestion(w, z.format, z.format === "reverse" ? "battle.reversePrompt" : null);
  updateHud();   // round capsule tracks B.spawned — refresh as each word enters
  // per-word ramp on the unscaled base, then re-derive the screen-scaled
  // speed (a plain B.speed *= 1.03 would be wiped by the next resize)
  B.speedBase *= 1.03;
  B.speed = B.speedBase * (B.w/380);
}
// v6p2: typed questions slow the walker — recall under pressure, not panic.
const TYPED_WALK_FACTOR = 0.4;
// v6p3: cloze is tap-answer but demands reading time — gentler than typed.
const CLOZE_WALK_FACTOR = 0.6;
// Append the 4 option buttons for a plain-data option list. Shared by every
// tap-answer format (the cloze branch and the generic branch both call it).
function renderOptionButtons(box, opts){
  for(const o of opts){
    const b = document.createElement("button");
    // Label wrapped in its own span (not just a bare text node) so short
    // viewports can -webkit-line-clamp it specifically — an ellipsis on the
    // primary answer only, never a silent symmetric crop across label+sub.
    b.innerHTML = `<span class="opt-label">${o.label}</span>` + (o.sub? `<span class="th">${o.sub}</span>`:"");
    b._correct = !!o.correct;
    b.onclick = ()=>answer(b, o);
    box.appendChild(b);
  }
}
// One renderer for every question format. Options come back from the FORMATS
// registry as plain data; promptKey (boss stage 2 / regular reverse) adds the
// full-width prompt row above the grid, reusing the boss-prompt styling.
function renderQuestion(word, format, promptKey){
  const deck = B.deck.length >= 8 ? B.deck : pool;
  const box = $("#opts");
  box.innerHTML = "";
  // v6p3 cloze: a blanked sentence + translation prompt row, then tap 1 of 4
  // hanzi. Distractors are baked in the data and their pinyin subs resolve
  // over the full dataset (BY_HANZI), not the scoped pool.
  if(format === "cloze"){
    const c = clozeFor(word, CLOZE);
    const prompt = document.createElement("div");
    prompt.className = "boss-prompt cloze-prompt";
    const sent = document.createElement("div");
    sent.className = "cloze-sentence";
    sent.textContent = c ? c.text : "___";
    prompt.appendChild(sent);
    const tr = document.createElement("div");
    tr.className = "cloze-trans";
    tr.textContent = !c ? ""
      : scope.lang === "th" ? c.th
      : scope.lang === "both" ? (c.th ? c.en + " · " + c.th : c.en)
      : c.en;
    prompt.appendChild(tr);
    box.appendChild(prompt);
    renderOptionButtons(box, FORMATS.cloze.buildOptions(word, c || { d: [] }, BY_HANZI, Math.random));
    return;
  }
  if(promptKey){
    const m = meaningOf(word, scope.lang);
    const prompt = document.createElement("div");
    prompt.className = "boss-prompt";
    prompt.textContent = t(promptKey, { meaning: m.main });
    box.appendChild(prompt);
  }
  if(FORMATS[format].input){ renderTypedInput(word); return; }
  if(format === "listen"){
    const rp = document.createElement("button");
    rp.className = "replay";
    rp.textContent = "🔊 " + t("battle.replay");
    rp.onclick = ()=> speak(word.h);   // never locked — replay is always allowed
    box.appendChild(rp);
  }
  renderOptionButtons(box, FORMATS[format].buildOptions(word, deck, scope.lang, Math.random));
}
// v6p2 typed-pinyin input: letters field (native keyboard) + one tone row per
// non-neutral syllable + attack button. Grading is pure (pinyin.js); the
// result routes through the same answer() flow as a tapped option.
function renderTypedInput(word){
  const box = $("#opts");
  const wrap = document.createElement("div");
  wrap.className = "typed-box";
  const field = document.createElement("input");
  field.type = "text";
  field.className = "typed-letters";
  field.placeholder = t("battle.typedPlaceholder");
  field.autocapitalize = "off"; field.autocomplete = "off";
  field.spellcheck = false; field.setAttribute("autocorrect", "off");
  wrap.appendChild(field);
  const sylls = syllables(word.p), tones = syllableTones(word.p);
  const picks = tones.map(() => 0);
  const go = document.createElement("button");
  const sync = () => { go.disabled = !field.value.trim() || tones.some((tn, i) => tn > 0 && !picks[i]); };
  tones.forEach((tn, i) => {
    if(!tn) return;                     // neutral syllable — nothing to pick
    const row = document.createElement("div");
    row.className = "tone-row";
    const lab = document.createElement("span");
    lab.className = "tone-label";
    lab.textContent = letters(sylls[i], "ü");   // display form — "nü", not the typeable "nv"
    row.appendChild(lab);
    for(let k = 1; k <= 4; k++){
      const c = document.createElement("button");
      c.className = "chip tone-chip";
      c.textContent = String(k);
      // a bare "3" is meaningless to a screen reader — name the syllable too
      c.setAttribute("aria-label", t("battle.toneAria", { syl: lab.textContent, n: k }));
      c.setAttribute("aria-pressed", "false");
      c.onclick = () => {
        picks[i] = k;
        row.querySelectorAll(".tone-chip").forEach(x => {
          x.classList.toggle("on", x === c);
          x.setAttribute("aria-pressed", String(x === c));
        });
        sync();
      };
      row.appendChild(c);
    }
    wrap.appendChild(row);
  });
  go.className = "typed-go";
  go.textContent = t("battle.typedGo");
  go.disabled = true;
  field.oninput = sync;
  field.enterKeyHint = "go";
  field.addEventListener("keydown", e => { if(e.key === "Enter" && !go.disabled) go.click(); });
  go.onclick = () => {
    const g = gradeTyped(word.p, field.value, picks.filter((_, i) => tones[i] > 0));
    // answer()'s guards decide first — a tap that leaks through an overlay
    // must not reveal the pinyin below. lockOptions() disables the field.
    if(!answer(go, { correct: g.ok })) return;
    if(!g.ok){
      // kind diff: always show the right pinyin; name what was close
      const diff = document.createElement("div");
      diff.className = "boss-prompt";
      diff.textContent = word.p
        + (g.lettersOk ? " · " + t("battle.typedLettersOk")
           : g.tonesOk ? " · " + t("battle.typedTonesOk") : "");
      wrap.appendChild(diff);
    }
  };
  wrap.appendChild(go);
  box.appendChild(wrap);
}
function showFormatIntro(key){
  $("#fi-text").textContent = t(key);
  $("#fi-ok").textContent = t("battle.introOk");
  $("#format-intro").classList.add("on");
  $("#fi-ok").onclick = ()=>{
    $("#format-intro").classList.remove("on");
    const z = B.zombie;
    if(z){
      // Persist the once-ever intro flag only on dismissal (not at spawn):
      // quitting mid-overlay must not burn the intro or the free attempt.
      formatIntros[z.format] = 1; store.set("formatIntros", formatIntros);
    }
    if(z && z.state === "walk"){
      z.x = B.w + 30;      // full runway — the intro must never eat thinking time
      z.frozen = false;
      if(FORMATS[z.format].audio === "always") speak(z.w.h);
    }
  };
}
function lockOptions(){
  B.locked = true;
  document.querySelectorAll("#opts button, #opts input").forEach(b=>b.disabled = true);
}
function revealCorrect(){
  document.querySelectorAll("#opts button").forEach(b=>{
    if(b._correct) b.classList.add("good");
  });
}
function answer(btn, o){
  if(B.paused) return;   // overlay is up — ignore any tap that leaks through
  const z = B.zombie;
  if(!z || z.state!=="walk" || z.frozen || B.locked) return;
  const boss = z.boss;
  const correct = !!o.correct;
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
    z.hp = 0.5;   // cosmetic HP bar: half-depleted after stage 1 (meaning)
    btn.classList.add("good");
    lockOptions();
    // Deadline checked in loop() rather than a raw setTimeout, so a pause
    // mid-transition doesn't fire it behind the overlay — resumeBattle()
    // shifts it forward like every other absolute performance.now() deadline.
    B.bossStageAt = performance.now() + 500;
    updateHud();
    return true;
  }
  // Every other branch below is a final resolution of this word (correct kill,
  // wrong tap, or — via bite() — a timeout): reveal the translation on the
  // plaque from here on (drawWordPlate reads z.revealed, not the answer state).
  z.revealed = true;
  if(correct){
    z.frozen = true;   // coin is in flight — don't let the walker cross the bite line first (race with killZombie)
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
    btn.classList.add("good", "stamp", "stamp-good");
    lockOptions();
    B.proj = {x:B.L.mascotX+16*B.S, y:B.h-B.L.ground-30*B.S};   // coin flies at the cat
    // (word audio fires once, on spawn — no replay on the answer tap)
    if(boss){ noteAnswer(z.w.h, true); B.bossDefeated = true; }   // both stages passed
    const gy = B.h-B.L.ground;
    // boss final kill gets the reference's CRITICAL! starburst (A3); the
    // 10-combo milestone below may upgrade a normal kill to critical too.
    B.feedback = boss
      ? {...feedbackEffect("critical", z.x, gy-42*B.S), until:fxUntil(750)}
      : {...feedbackEffect("correct", z.x, gy-42*B.S), until:fxUntil(620)};
    B.plaqueHitAt = performance.now();   // plaque bounce timebase (drawWordPlate)
    const floater = comboFloater(z.x, gy-130, B.combo);
    if(floater) B.floats.push(floater);
    // milestone combo (10, 20, ...): fireworks + a CRITICAL! comic burst
    // (fx-critical sprite + bold lettering, drawn in drawFeedbackLayer)
    // replaces the plain correct stamp for this kill.
    if(B.combo>=10 && B.combo%10===0){
      B.parts.push(...fireworkRing(z.x, gy-16));
      B.feedback = {...feedbackEffect("critical", z.x, gy-42*B.S), until:fxUntil(750)};
    }
  }else{
    // ONE attempt per word: wrong tap = lose a heart. Skip the charge animation and
    // advance quickly — just long enough to see the correct answer flashed green.
    B.combo = 0;
    const free = !!z.introFree;   // first-ever attempt of a new format: no heart lost
    sfx.wrong(); if(!free){ sfx.bite(); hapticWrong(); }
    btn.classList.add("bad", "stamp", "stamp-bad");
    lockOptions();
    revealCorrect();
    pushMiss(z.w);
    if(boss) noteAnswer(z.w.h, false);          // any miss fails the boss word
    if(!free){ B.lives--; B.flash = 1; B.screenShake = REDUCED_MOTION ? 0 : 1; }
    B.resolved++;
    z.state = "wrong";
    z.wrongUntil = performance.now() + 560;
    B.feedback = {...feedbackEffect("wrong", z.x, B.h-B.L.ground-44*B.S), until:fxUntil(560)};
  }
  updateHud();
  return true;   // tap accepted and resolved — callers may reveal follow-up UI
}
function scheduleNext(ms){
  B.zombie = null; B.proj = null;
  B.nextAt = performance.now()+ms;
  // options stay visible (locked) so the revealed answer can sink in;
  // the next spawn's renderQuestion replaces them
}
function killZombie(z){
  const gy = B.h-B.L.ground;
  // A3 enemy hit flash: quick warm-white pulse at the raccoon (drawn in draw(),
  // just before the feedback layer). Absolute deadline — shifted on resume.
  B.hitFlash = {x:z.x, y:gy-40*B.S, until:fxUntil(150)};
  B.parts.push(...coinBurst(z.x, gy-16, !!z.boss, shopState.effect));   // bosses pop a bigger, coinier burst; effect pack swaps the look
  z.state = "happy";
  z.happyAt = performance.now();   // raccoonBob("happy") wants time-since-defeat, not the raw rAF t
  z.hpAtKill = z.hp;   // draw() lerps hp -> 0 over the happy/dying window from this
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
    B.combo = 0; noteAnswer(z.w.h, false); pushMiss(z.w); revealCorrect(); lockOptions();
    z.revealed = true;   // timeout resolves the word too — fill the plaque's translation line
  }
  const free = !!(z && z.introFree);   // intro word timing out is also forgiven
  sfx.bite();
  if(!free){ B.lives--; B.flash = 1; }
  B.resolved++;
  scheduleNext(1500);   // long enough to read the revealed answer
  updateHud();
}
function loop(now){
  if(!B.on) return;
  if(B.paused){
    // frozen: keep the rAF alive (resume is a plain unpause, no re-bootstrap)
    // but advance nothing — no motion, no spawns, no expiry, no redraw (the
    // last frame stays under the overlay). B.lastT tracks now so dt stays sane.
    B.lastT = now;
    requestAnimationFrame(loop);
    return;
  }
  const dt = Math.min(0.05, (now-(B.lastT||now))/1000); B.lastT = now;
  // boss stage 1 (meaning) -> stage 2 (hanzi) transition, deadline-based so a
  // pause mid-transition can't fire it behind the overlay (see answer()).
  if(B.bossStageAt && now >= B.bossStageAt){
    B.bossStageAt = 0;
    const bz = B.zombie;
    if(bz && bz.frozen && bz.stage === "meaning"){
      bz.stage = "hanzi"; bz.frozen = false;
      bz.format = "reverse";
      renderQuestion(bz.w, "reverse", "battle.bossPrompt");
      B.locked = false;
    }
  }
  // next word (or end of round) once the field is clear
  if(!B.zombie && now >= B.nextAt){
    if(B.lives>0 && B.spawned<B.wordsTotal) spawnZombie();
    else { endBattle(false); return; }
  }
  const z = B.zombie;
  if(z){
    if(z.state==="walk"){
      if(!z.frozen){
        z.x -= B.speed*(z.boss?bossSpeedFactor:1)*(z.format==="typed"?TYPED_WALK_FACTOR:z.format==="cloze"?CLOZE_WALK_FACTOR:1)*dt;
        if(z.x <= B.L.mascotX+B.L.catHalf) bite(true);          // too slow — cat got there
      }
    }else if(z.state==="dash"){
      z.x -= B.speed*7*dt;
      if(z.x <= B.L.mascotX+B.L.catHalf) bite(false);         // legacy: never assigned, kept for safety
    }else if(z.state==="happy" && now >= B.dyingUntil){
      scheduleNext(200);
    }else if(z.state==="wrong"){
      z.x += 24*B.S*dt;
      if(now >= z.wrongUntil) scheduleNext(350);
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
  draw(now);
  requestAnimationFrame(loop);
}
// programmatic canvas backdrops — kept dark/low-contrast so the word banner stays readable
function paintBackdrop(c, w, h, gy, style, now=0){
  const pulse = now / 1000;
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
function draw(now){
  ctx.clearRect(0,0,B.w,B.h);
  const gy = B.h - B.L.ground;
  const shake = B.screenShake > 0
    ? Math.sin(now * 0.08) * 5 * B.S * B.screenShake
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
  // player cat (left side, was the maneki) — shop skin + growth accessories +
  // kitten companion now live here instead of on the walker (M5 role swap).
  // "happy" during the post-kill victory hop, otherwise a walk-in-place idle
  // (drawCat has no dedicated idle state; "walk" just bobs/steps in place
  // since x never changes here).
  const hopping = B.mascotHopUntil && now < B.mascotHopUntil;   // little victory hop after a kill
  const playerState = hopping ? "happy" : "walk";
  drawCat(ctx, B.L.mascotX, gy + 6*B.S, now, playerState, SKIN_PALETTES[shopState.skin], .9*B.S, B.acc, false);
  if(B.hasKitten) drawCat(ctx, B.L.mascotX - B.L.catHalf, gy + 6*B.S, now + 250, playerState, SKIN_PALETTES[shopState.skin], 0.5*B.S, [], false);
  // idle coin icon (left of the player) - coin sprite or vector fallback
  const coinImgIdle = sprite("coin");
  if(coinImgIdle){
    ctx.drawImage(coinImgIdle, 4*B.S, gy-22*B.S, B.L.coinPx, B.L.coinPx);
  }else{
    drawCoinMark(ctx, 16*B.S, gy-10*B.S, 9*B.S);
  }
  const z = B.zombie;
  if(z){
    // word + pinyin + (post-reveal) translation, fixed at the center of the
    // sky area (not following the raccoon). Boss stage 2 asks "which hanzi?",
    // so the plate must not give it away while the raccoon is still walking.
    // Format decides what the plaque may reveal while the word is live; any
    // resolution (kill/wrong/timeout) reveals everything, as before.
    const fl = FORMATS[z.format || "meaning"].plaque;
    const live = z.state === "walk" && !z.revealed;
    drawWordPlate(z, { mask: live && !!fl.mask, icon: live && !!fl.icon, py: !live || !!fl.py }, now);
    // raccoon enemy (was the cat walker) — bosses draw bigger with a gold
    // aura (boss param, not scale — see raccoon.js); no skins/accessories/
    // kitten on it, those moved to the player above.
    const rScale = z.boss ? 1.5*B.S : B.S;
    drawRaccoon(ctx, z.x, gy + 6*B.S, z.state === "happy" ? now - z.happyAt : now, z.state, rScale, !!z.boss);
    // floating HP bar above its head — cosmetic only. Animates hp -> 0 over
    // the happy/dying window (killZombie snapshots hpAtKill); wrong/timeout
    // never touch hp (the raccoon "wins" that word, no damage).
    let hpFrac = z.hp;
    if(z.state === "happy" && B.dyingUntil){
      const remain = Math.max(0, B.dyingUntil - now);
      hpFrac = (z.hpAtKill ?? z.hp) * (remain/250);
    }
    drawHpBar(ctx, z.x, gy + 6*B.S - RACCOON_HEIGHT*rScale, 46*B.S, hpFrac, B.S);
  }else{
    B.plaqueRect = null;   // no word on screen — the canvas click/keydown handlers no-op
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
    }else if(p.kind==="star"){
      ctx.fillStyle = "#ffe08a"; drawStarMark(ctx, p.x, p.y, 5.2);
    }else{
      ctx.fillStyle = "#f5c518"; ctx.beginPath(); ctx.arc(p.x,p.y,3.4,0,7); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // combo floaters drifting up from a kill
  if(B.floats.length){
    ctx.font = fontString(700, B.L.floaterPx, LATIN_STACK);
    ctx.fillStyle = "#f5c518";
    for(const f of B.floats){
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life/0.9));
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }
  // A3 enemy hit flash: expanding cream pulse at the kill (set in killZombie)
  if(B.hitFlash){
    const leftF = B.hitFlash.until - performance.now();
    if(leftF <= 0){ B.hitFlash = null; }
    else{
      // expanding cream pulse, fading out — a fade, so reduced-motion-safe
      // (fxUntil already halved its duration there)
      ctx.save();
      ctx.globalAlpha = 0.85 * (leftF / fxDuration(150));
      ctx.fillStyle = "rgba(251,245,232,1)";
      const rr = (18 + 30 * (1 - leftF / fxDuration(150))) * B.S;
      ctx.beginPath(); ctx.arc(B.hitFlash.x, B.hitFlash.y, rr, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }
  drawFeedbackLayer(now);
  // hit flash — softened dim-violet (cat wandered off, not combat damage)
  if(B.flash>0){ ctx.fillStyle = `rgba(90,44,80,${(0.30*B.flash).toFixed(3)})`; ctx.fillRect(0,0,B.w,B.h); }
  if(shake) ctx.restore();
}
// z: the current walker (B.zombie) — carries the target word (z.w), boss
// flags, and z.revealed (set in answer()/bite() once the word is resolved).
// vis: { mask, icon, py } — what the format may reveal while live (see the
// call site in draw(), which derives it from FORMATS[z.format].plaque).
// Order per PRD §4.3/§6.2: pinyin (small, above) -> Hanzi (large) ->
// translation (reserved space always; filled in only once z.revealed).
function drawWordPlate(z, vis, now){
  const w = z.w, boss = z.boss, level = w.lv;
  const hanzi = vis.mask ? "？？" : vis.icon ? "🔊" : w.h;
  // pinyin off when: the format hides it (reverse/listen/tone while live), OR the player toggled it off
  const pinyin = (!vis.py || !settings.showPinyin) ? "" : w.p;
  const revealed = !!z.revealed;
  const showSub = scope.lang === "both";   // meaningOf() only returns a .sub in "both" mode

  // A3 plaque bounce: damped dip on a correct answer (juice.js curve; 0 when
  // idle or under reduced motion — no vertical motion, per "fades only").
  const bounce = (!REDUCED_MOTION && B.plaqueHitAt)
    ? plaqueBounce(performance.now() - B.plaqueHitAt) : 0;
  const wy = Math.round(B.h * 0.36) + Math.round(bounce);
  ctx.save();
  ctx.font = fontString(700, B.L.hanziPx, HANZI_STACK);
  const textW = Math.max(ctx.measureText(hanzi).width, 74*B.S);
  const spkR = 12*B.S;
  const lw = Math.min(B.w - 24*B.S, textW + 56*B.S + spkR*2.2);
  // Stacked rows, top to bottom: pinyin (if shown) -> Hanzi -> translation.
  // The translation row's height is reserved unconditionally (same whether
  // revealed or not) so the plaque never resizes/jumps at reveal time.
  const padV = 10*B.S;
  const pinyinH = pinyin ? 22*B.S : 0;
  const hanziH = B.L.hanziPx * 1.05;
  const transH = (showSub ? 40 : 24) * B.S;
  const lh = padV*2 + pinyinH + hanziH + transH;
  const x = B.w/2 - lw/2, y = wy - lh/2;
  const plaqueImg = sprite("ui-word-plaque");
  if(plaqueImg){
    // 9-slice so the gold rim + notched frame stay crisp at any plaque size
    const di = Math.min(20*B.S, lw/3, lh/3);
    for(const r of nineSliceRects(560, 320, 48, x, y, lw, lh, di)){
      ctx.drawImage(plaqueImg, r.sx, r.sy, r.sw, r.sh, r.dx, r.dy, r.dw, r.dh);
    }
  }else{
    // vector fallback: cream paper plaque (education-first reference): matte
    // paper, warm-brown border, corner ticks — hanzi/pinyin stay dynamic text
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
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let cy = y + padV;
  if(pinyin){
    ctx.font = fontString(600, B.L.pinyinPx, LATIN_STACK);
    ctx.fillStyle = "#8C5F2A";
    ctx.fillText(pinyin, B.w/2, cy + pinyinH/2);
    cy += pinyinH;
  }
  ctx.font = fontString(700, B.L.hanziPx, HANZI_STACK);
  ctx.fillStyle = boss ? "#7A4E0C" : "#3A2E1D";
  ctx.fillText(hanzi, B.w/2, cy + hanziH/2);
  cy += hanziH;
  // translation row: filled in once the word is resolved (revealed), a faint
  // dashed placeholder otherwise — the row's own space is already reserved
  // above regardless of reveal state, so nothing shifts when it fills in.
  const midY = cy + (showSub ? transH*0.32 : transH/2);
  if(revealed){
    const m = meaningOf(w, scope.lang);
    ctx.font = fontString(700, 15*B.S, LATIN_STACK);
    ctx.fillStyle = "#2F6B4F";
    ctx.fillText(m.main, B.w/2, midY);
    if(showSub && m.sub){
      ctx.font = fontString(600, 13*B.S, LATIN_STACK);
      ctx.fillStyle = "#5C7A68";
      ctx.fillText(m.sub, B.w/2, cy + transH*0.74);
    }
  }else{
    ctx.strokeStyle = "rgba(140,95,42,.32)";
    ctx.lineWidth = Math.max(1.4, 2*B.S);
    ctx.setLineDash([4*B.S, 4*B.S]);
    ctx.beginPath(); ctx.moveTo(B.w/2-44*B.S, midY); ctx.lineTo(B.w/2+44*B.S, midY); ctx.stroke();
    if(showSub){
      const y2 = cy + transH*0.74;
      ctx.beginPath(); ctx.moveTo(B.w/2-30*B.S, y2); ctx.lineTo(B.w/2+30*B.S, y2); ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  ctx.textBaseline = "alphabetic";
  if(level){
    // dark-green level tag (reference TAG)
    ctx.font = fontString(700, 10*B.S, LATIN_STACK);
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
  // speaker icon, right edge of the plaque, vertically centered — also the
  // visual affordance for the click/keyboard hit-test set up on #cv below.
  // Skipped when replay is disallowed (tone/reverse while live — don't
  // advertise a disabled affordance) and when the plaque is already showing
  // the big 🔊-as-hanzi (listen format live) to avoid two speaker glyphs.
  if(canReplayAudio(z) && !vis.icon){
    drawSpeakerIcon(ctx, x + lw - spkR - 10*B.S, y + lh/2, spkR, boss ? "#7A4E0C" : "#8C5F2A");
  }
  B.plaqueRect = {x, y, w: lw, h: lh};
  ctx.restore();
}
function drawSpeakerIcon(c, cx, cy, r, color){
  c.save();
  c.translate(cx, cy);
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(-r*0.9, -r*0.35); c.lineTo(-r*0.3, -r*0.35);
  c.lineTo(r*0.35, -r*0.85); c.lineTo(r*0.35, r*0.85);
  c.lineTo(-r*0.3, r*0.35); c.lineTo(-r*0.9, r*0.35);
  c.closePath(); c.fill();
  c.strokeStyle = color;
  c.lineWidth = Math.max(1.2, r*0.16);
  c.lineCap = "round";
  c.beginPath(); c.arc(r*0.05, 0, r*0.62, -Math.PI*0.32, Math.PI*0.32); c.stroke();
  c.beginPath(); c.arc(r*0.05, 0, r*0.98, -Math.PI*0.34, Math.PI*0.34); c.stroke();
  c.restore();
}
function drawFeedbackLayer(now){
  const fb = B.feedback;
  if(!fb) return;
  const kind = fb.kind || fb.type;
  // fxDuration() mirrors the halving already applied to fb.until at creation
  // (fxUntil()) — total must track it 1:1 or the fade fraction below (p) goes
  // out of sync with reduced motion and the stamp appears to freeze/cut off.
  const total = fxDuration((kind === "critical" || kind === "streak") ? 750 : kind === "correct" ? 620 : 560);
  const left = fb.until - performance.now();
  if(left <= 0){ B.feedback = null; return; }
  const p = 1 - left / total;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1-p);
  // orb burst: quick scale-in pop behind the stamp; skipped silently if the
  // sprite hasn't loaded (file:// first-frame, offline) — stamp/vector remains
  const orbImg = fb.orb ? sprite(fb.orb) : null;
  if(orbImg){
    const os = ((kind === "streak" || kind === "critical") ? 110 : 84) * B.S * (0.6 + 0.5 * Math.min(1, p * 2.4));
    ctx.drawImage(orbImg, fb.x - os/2, fb.y - os/2, os, os);
  }
  const fxImg = fb.sprite ? sprite(fb.sprite) : null;
  if(fxImg){
    const size = (kind === "critical" ? 96 : 72) * B.S;
    ctx.drawImage(fxImg, fb.x - size/2, fb.y - size/2, size, size);
  }else if(kind === "correct" || (kind === "streak" && !orbImg)){
    ctx.strokeStyle = "rgba(245,197,24,.86)";
    ctx.lineWidth = Math.max(2, 4*B.S*(1-p));
    ctx.beginPath(); ctx.arc(fb.x, fb.y, (18 + 44*p)*B.S, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = "rgba(255,244,224,.95)";
    for(let i=0;i<10;i++){
      const a = i*Math.PI*2/10 + now*.004;
      const r = (14 + 42*p)*B.S;
      ctx.beginPath(); ctx.arc(fb.x+Math.cos(a)*r, fb.y+Math.sin(a)*r, 2.2*B.S, 0, Math.PI*2); ctx.fill();
    }
  }else{
    ctx.strokeStyle = "rgba(255,100,110,.65)";
    ctx.lineWidth = 3*B.S;
    ctx.beginPath(); ctx.arc(fb.x, fb.y, (18 + 26*p)*B.S, Math.PI*.15, Math.PI*1.85); ctx.stroke();
  }
  if(kind === "critical"){
    // comic-burst lettering (§7.4): scales in fast over the burst's first
    // ~15%, then just rides the layer's overall fade (globalAlpha above).
    // fb.x is the kill's x (can sit near the canvas edge — e.g. a boss word
    // resolved right after its stage-2 question renders, before the raccoon
    // has walked in far) — clamp so the ~9-character label can't run off
    // either edge, unlike the compact icon/orb it's stamped over.
    const tx = Math.min(Math.max(fb.x, 74*B.S), B.w - 74*B.S);
    const scale = 0.55 + 0.45 * Math.min(1, p * 6);
    ctx.save();
    ctx.translate(tx, fb.y);
    ctx.scale(scale, scale);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = fontString(800, 22*B.S, LATIN_STACK);
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#FBF5E8";
    ctx.lineWidth = 4*B.S;
    ctx.strokeText("CRITICAL!", 0, 0);
    ctx.fillStyle = "#7A4E0C";
    ctx.fillText("CRITICAL!", 0, 0);
    ctx.restore();
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
  if(quit){
    // still bank what was earned so far — no perfect bonus, no best-score, no results screen
    if(B.resolved > 0) noteDaily(B.resolved);
    if(B.score > 0){ wallet += B.score; store.set("wallet", wallet); updateWalletChip(); }
    if(introPhase){ introPhase = null; store.set("introDone", true); }
    // B2: evaluate awards on quit too (a streak-7 crossing must not be lost),
    // but silently — the toast queue waits for the next real results screen.
    const quitFacts = {
      ...scopeFacts(D.levels, masteryStore),
      sessionDone: false,
      bossDefeated: !!B.bossDefeated,
      streak: streakInfo(daily, todayStr()).streak,
    };
    stickerState = evaluateAwards(stickerState, STICKER_DEFS, quitFacts, todayStr());
    store.set("stickers", stickerState);
    show("home"); return;
  }
  noteDaily(B.resolved);
  const isPerfect = B.mode==="round" && B.resolved>0 && B.misses.length===0 && (!B.customDeck || B.smartRound);
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
  // A3 results celebration: count the earned coins up (~700ms ease-out).
  // Reduced motion or a zero score renders instantly.
  const scoreEl = $("#r-score");
  if(REDUCED_MOTION || B.score === 0){
    scoreEl.textContent = B.score;
  }else{
    const target = B.score, t0 = performance.now(), dur = 700;
    scoreEl.textContent = "0";
    const tick = now => {
      const frac = (now - t0) / dur;
      scoreEl.textContent = countUpValue(0, target, frac);
      if(frac < 1 && currentScreen === "results") requestAnimationFrame(tick);
      else scoreEl.textContent = target;
    };
    requestAnimationFrame(tick);
  }
  const key = scopeKey(scope)+"·"+modeKey(B.mode, B.wordsTotal);
  if(B.customDeck){
    // miss/weak-word decks don't compete on the scoreboard — no best-tag/prev-best suffix
    $("#r-sub").innerHTML = t("results.sub", { acc, words: B.correct, key });
  }else{
    const best = store.get("best", {});
    const prev = best[key]? best[key].score : 0;
    const isBest = B.score > prev;
    if(isBest){ best[key] = {score:B.score, date:new Date().toISOString().slice(0,10)}; store.set("best", best); }
    $("#r-sub").innerHTML = t("results.sub", { acc, words: B.correct, key })
      + (isBest ? ` · <b style="color:var(--lc-brown)">${t("results.bestTag")}</b>` : ` · ${t("results.bestPrev", { prev })}`);
  }
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
  // A4 intro round: mark the intro complete and point at the streak
  // ("come back tomorrow"), calm framing. The Welcome sticker occupies
  // #r-sticker-slot in Phase 4 (stickers.js).
  const hintEl = $("#r-intro-hint");
  if(introPhase === "battle"){
    introPhase = null;
    store.set("introDone", true);
    hintEl.textContent = t("results.introHint");
    hintEl.style.display = "block";
  }else{
    hintEl.style.display = "none";
  }
  // B2 sticker awards: evaluate every unearned sticker against fresh facts.
  // Persist immediately (a sticker earned mid-session survives reload); show
  // at most ONE toast per results screen — the rest stay queued.
  const stickerFacts = {
    ...scopeFacts(D.levels, masteryStore),
    sessionDone: B.resolved > 0,
    bossDefeated: !!B.bossDefeated,
    streak: streakInfo(daily, todayStr()).streak,
  };
  stickerState = evaluateAwards(stickerState, STICKER_DEFS, stickerFacts, todayStr());
  store.set("stickers", stickerState);
  const slot = $("#r-sticker-slot");
  const popped = popToast(stickerState);
  if(popped.id){
    stickerState = popped.state;
    store.set("stickers", stickerState);
    const def = STICKER_DEFS.find(d => d.id === popped.id);
    slot.innerHTML = "";
    const toastEl = document.createElement("div");
    toastEl.className = "sticker-toast";
    toastEl.appendChild(iconSvg(stickerIcon(def)));
    const label = document.createElement("span");
    label.textContent = t("results.newSticker", { name: stickerLabel(def) });
    toastEl.appendChild(label);
    slot.appendChild(toastEl);
    slot.style.display = "block";
  }else{
    slot.style.display = "none";
  }
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
  const today = todayStr();
  const dailyBox = $("#shop-daily"), seasonBox = $("#shop-season");
  const skinBox = $("#shop-skins"), bdBox = $("#shop-backdrops"), fxBox = $("#shop-effects"), sndBox = $("#shop-sounds"), decoBox = $("#shop-street");
  for(const b of [dailyBox, seasonBox, skinBox, bdBox, fxBox, sndBox, decoBox]) b.innerHTML = "";

  // Today's Stock — the 3 featured pool items; once owned they live in their type section
  const stock = unownedDailyStock(today, shopState);
  for(const id of stock){
    const item = CATALOG.find(i => i.id === id);
    if(item) dailyBox.appendChild(makeShopRow(item, today));
  }
  if(!stock.length){
    // all featured items owned — cosmetic empty state instead of a bare shelf
    dailyBox.innerHTML = `<div class="scorerow" style="color:var(--muted)">${t("shop.dailyAllOwned")}</div>`;
  }

  // Season Corner — active set is buyable; off-season shows the next set's teaser
  const st = seasonStatus(today);
  const seasonNote = $("#shop-season-note");
  if(st.active){
    for(const item of CATALOG.filter(i => i.season === st.active.id && !shopState.owned.includes(i.id))){
      seasonBox.appendChild(makeShopRow(item, today));
    }
    seasonNote.textContent = t("shop.seasonUntil", { date: fmtMonthDay(st.active.to) });
  }else{
    seasonNote.textContent = t("shop.seasonReturns", { name: t("season." + st.next.id), date: fmtMonthDay(st.next.from) });
  }

  // Permanent sections — pool/season items appear here only once owned
  for(const item of CATALOG){
    if((item.pool || item.season) && !shopState.owned.includes(item.id)) continue;
    const box = item.type==="skin" ? skinBox : item.type==="backdrop" ? bdBox : item.type==="effect" ? fxBox : item.type==="soundpack" ? sndBox : decoBox;
    box.appendChild(makeShopRow(item, today));
  }
  startShopPreviewLoop();
}

// "Jul 1" / "1 ก.ค." for a [month, day] pair, in the active locale.
// The fixed 2026 year is inert: only month/day are rendered (see the
// { month: "short", day: "numeric" } options below), and there's no leap-day
// window in play, so the hardcoded year never affects the output.
const fmtMonthDay = ([m, d]) =>
  new Date(2026, m - 1, d).toLocaleDateString(getLocale() === "th" ? "th-TH" : "en-US", { month: "short", day: "numeric" });

function makeShopRow(item, today){
  const owned = shopState.owned.includes(item.id);
  const equipped = shopState[item.type] === item.id;
  const tier = (shopState.tiers && shopState.tiers[item.id]) || 1;
  const row = document.createElement("div");
  row.className = "scorerow shoprow";
  const left = document.createElement("span");
  left.className = "shop-left";
  const preview = document.createElement("canvas");
  preview.className = "shop-preview";
  preview.setAttribute("aria-hidden", "true");
  preview._shopItem = item;
  const copy = document.createElement("span");
  copy.className = "shop-copy";
  const stars = item.type === "deco" && owned ? " " + "★".repeat(tier) : "";
  copy.innerHTML = `<b>${tOr("item."+item.id, item.name)}${stars}</b><small>${t("shop.coins", { coins: item.price.toLocaleString() })}</small>`;
  left.replaceChildren(preview, copy);
  const btn = document.createElement("button");
  const doBuy = () => {
    const r = buy(wallet, shopState, item.id, today);
    if(!r.ok) return;
    wallet = r.wallet; shopState = r.shop;
    store.set("wallet", wallet); store.set("shop", shopState);
    // no renderStreet() here: the street canvas is display:none while the
    // shop screen is up (renderStreet would no-op) and show("street") always
    // re-renders on entry, so a bought deco appears the moment it can be seen.
    updateWalletChip(); renderShop();
  };
  if(item.type === "deco"){
    // Owning a deco displays it on the street; re-buys upgrade its tier (v7 F4).
    if(!owned){
      btn.className = "chip buy-chip";
      btn.textContent = t("shop.buy");
      btn.disabled = !canAfford(wallet, item.id);
      btn.onclick = doBuy;
    }else if(item.maxTier && tier < item.maxTier){
      const up = upgradePrice(item, tier);
      btn.className = "chip buy-chip";
      btn.textContent = t("shop.upgrade", { stars: "★".repeat(tier + 1), coins: up.toLocaleString() });
      btn.disabled = wallet < up;
      btn.onclick = doBuy;
    }else{
      btn.className = "chip on";
      btn.textContent = t("shop.maxed");
      btn.disabled = true;
    }
  }else{
    btn.className = "chip" + (equipped ? " on" : "");
    if(equipped){
      btn.textContent = t("shop.equipped"); btn.disabled = true;
    }else if(owned){
      btn.textContent = t("shop.equip");
      btn.onclick = ()=>{ shopState = equipItem(shopState, item.id); store.set("shop", shopState); renderShop(); };
    }else{
      btn.className = "chip buy-chip";
      btn.textContent = t("shop.buy");
      btn.disabled = !canAfford(wallet, item.id);
      btn.onclick = doBuy;
    }
  }
  row.appendChild(left); row.appendChild(btn);
  renderShopPreview(preview, item, performance.now());
  return row;
}

let shopPreviewRaf = 0;
function startShopPreviewLoop(){
  if(shopPreviewRaf) return;
  const tick = now => {
    shopPreviewRaf = 0;
    if(currentScreen !== "shop") return;
    document.querySelectorAll(".shop-preview").forEach(canvas => {
      if(canvas._shopItem) renderShopPreview(canvas, canvas._shopItem, now);
    });
    shopPreviewRaf = requestAnimationFrame(tick);
  };
  shopPreviewRaf = requestAnimationFrame(tick);
}

function renderShopPreview(canvas, item, now=0){
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
    drawCat(c, w*.52, h+6, now, "walk", SKIN_PALETTES[item.id], .72, [], false);
  }else if(item.type==="backdrop"){
    const img = sprite(`bg-${item.id}`);
    if(img) drawCoverImage(c, img, 0, 0, w, h);
    else paintBackdrop(c, w, h, h-7, item.id, now);
    c.strokeStyle = "rgba(245,197,24,.55)"; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0,h-8); c.lineTo(w,h-8); c.stroke();
  }else if(item.type==="effect"){
    if(item.id==="sakura-fx"){
      c.fillStyle = "#f6a8c8";
      for(const [x,y,r] of [[18,15,0],[31,24,.9],[43,13,-.5],[24,31,.4]]){
        c.beginPath(); c.ellipse(x,y,5,2.6,r,0,Math.PI*2); c.fill();
      }
    }else if(item.id==="star-shower"){
      c.fillStyle = "#ffe08a";
      for(const [x,y,r] of [[18,14,4],[33,22,5],[44,12,3],[25,30,3.5]]) drawStarMark(c, x, y, r);
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
    }else if(item.id==="lion-drum"){
      c.fillStyle = "#c1272d"; c.beginPath(); c.ellipse(28,24,12,9,0,0,Math.PI*2); c.fill();
      c.fillStyle = "#f5c518"; c.fillRect(16,20,24,3);
      c.strokeStyle = "#7a1c14"; c.lineWidth = 2;
      c.beginPath(); c.moveTo(20,10); c.lineTo(26,19); c.moveTo(38,10); c.lineTo(32,19); c.stroke();
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
  if(!w || !h) return;   // hidden (display:none) — next show("street") redraws
  const dpr = window.devicePixelRatio||1;
  scv.width = Math.round(w*dpr); scv.height = Math.round(h*dpr);
  const sc = scv.getContext("2d");
  sc.setTransform(dpr,0,0,dpr,0,0);
  sc.clearRect(0,0,w,h);
  const bg = sprite("bg-street");
  if(bg) drawCoverImage(sc, bg, 0, 0, w, h);
  else paintStreetBase(sc, w, h);
  const gy = h - 10;

  const level = levelForXp(xp);
  const pieces = streetPieces(level, shopState.owned, shopState.tiers || {});
  const m = streetMetrics(w, h);
  const backGy = gy - h * (1 - m.backY);
  drawStreetPads(sc, w, gy, h, pieces, m);
  // Painter's order: back row (buildings) fully before front row (decos).
  for(const p of pieces){
    if(p.kind !== "building") continue;
    const x = p.slot * w, basis = m.unit * m.backScale;
    drawContactShadow(sc, x, backGy, basis);
    drawStreetBuilding(sc, p.id, x, backGy, basis);
  }
  for(const p of pieces){
    if(p.kind === "building") continue;
    const x = p.slot * w;
    drawContactShadow(sc, x, gy, m.unit);
    drawTieredDeco(sc, p, x, gy, m.unit);
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
  // streetProgress() (street.js, pure/untouched) returns next.name in English
  // only; look the id back up by level to get a localized building.* label.
  const nextB = prog.next ? BUILDINGS.find(b => b.lv === prog.next.lv) : null;
  const nextTxt = prog.next
    ? t("street.next", { lv: prog.next.lv, name: nextB ? tOr("building."+nextB.id, prog.next.name) : prog.next.name })
    : t("street.allUnlocked");
  cap.textContent = pieces.length===0
    ? t("street.captionEmpty", { next: nextTxt })
    : t("street.captionProgress", { unlocked: prog.unlocked, total: prog.total, next: nextTxt });
}
function paintStreetBase(c, w, h){
  // Warm-daylight village street: cream/sky gradient, soft green hills, sun
  // upper-left, sand road along the bottom fifth. Deterministic (fixed
  // positions, no Math.random) so it matches the bg-street.png art hook.
  const sky = c.createLinearGradient(0,0,0,h);
  sky.addColorStop(0, "#5DAADD"); sky.addColorStop(.55, "#BFE0F2"); sky.addColorStop(1, "#FBF5E8");
  c.fillStyle = sky; c.fillRect(0,0,w,h);

  // sun disc, upper-left (project light rule), with a soft outer glow
  c.fillStyle = "rgba(242,188,87,.32)";
  c.beginPath(); c.arc(w*.16, h*.2, h*.22, 0, Math.PI*2); c.fill();
  c.fillStyle = "rgba(242,188,87,.88)";
  c.beginPath(); c.arc(w*.16, h*.2, h*.13, 0, Math.PI*2); c.fill();

  // faint cream cloud blobs, fixed positions
  c.fillStyle = "rgba(251,245,232,.7)";
  for(const [fx,fy,rx,ry] of [[.42,.14,.055,.022],[.58,.09,.04,.017],[.8,.17,.05,.02],[.27,.26,.038,.016]]){
    c.beginPath(); c.ellipse(w*fx, h*fy, w*rx, h*ry, 0, 0, Math.PI*2); c.fill();
  }

  // two soft green hill bands, 55-70% alpha
  c.fillStyle = "rgba(50,119,94,.55)";
  c.beginPath();
  c.moveTo(0,h*.62); c.lineTo(w*.18,h*.5); c.lineTo(w*.38,h*.6); c.lineTo(w*.6,h*.46); c.lineTo(w*.82,h*.58); c.lineTo(w,h*.5);
  c.lineTo(w,h*.74); c.lineTo(0,h*.74); c.closePath(); c.fill();

  c.fillStyle = "rgba(50,119,94,.7)";
  c.beginPath();
  c.moveTo(0,h*.7); c.lineTo(w*.22,h*.6); c.lineTo(w*.44,h*.68); c.lineTo(w*.66,h*.58); c.lineTo(w*.88,h*.66); c.lineTo(w,h*.62);
  c.lineTo(w,h*.82); c.lineTo(0,h*.82); c.closePath(); c.fill();

  // sand road, bottom fifth, with a warm edge line
  const roadY = h*.8;
  c.fillStyle = "#EAC796";
  c.fillRect(0, roadY, w, h - roadY);
  c.strokeStyle = "#846043"; c.lineWidth = 2;
  c.beginPath(); c.moveTo(0, roadY); c.lineTo(w, roadY); c.stroke();
}
// Soft contact-shadow ellipse under an occupied piece, at its row line.
function drawContactShadow(c, x, y, basis){
  c.save();
  c.fillStyle = "rgba(46,42,36,.12)";
  c.beginPath(); c.ellipse(x, y + basis*.05, basis*.5, basis*.12, 0, 0, Math.PI*2); c.fill();
  c.restore();
}
function drawStreetPads(c, w, gy, h, pieces, m){
  const occupied = new Set(pieces.map(p => p.slot.toFixed(2)));
  const backGy = gy - h * (1 - m.backY);
  const drawPad = (x, y, basis) => {
    const pw = basis*.9, ph = basis*.16;
    c.fillStyle = "rgba(255,214,95,.08)";
    c.beginPath(); c.ellipse(x, y+1, pw, ph, 0, 0, Math.PI*2); c.fill();
    c.strokeStyle = "rgba(245,197,24,.16)"; c.lineWidth = 1;
    c.beginPath(); c.ellipse(x, y+1, pw, ph, 0, 0, Math.PI*2); c.stroke();
  };
  const buildingSlots = [.18,.34,.5,.66,.82];
  const decoSlots = [.10,.26,.42,.58,.74];
  for(const slot of buildingSlots){
    if(occupied.has(slot.toFixed(2))) continue;
    drawPad(slot*w, backGy, m.unit * m.backScale);
  }
  for(const slot of decoSlots){
    if(occupied.has(slot.toFixed(2))) continue;
    drawPad(slot*w, gy, m.unit);
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
      c.fillStyle = "#846043"; roundRectOn(c,-3,-bh,6,bh,2); c.fill();
      c.strokeStyle = "#F2BC57"; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(0,-bh); c.quadraticCurveTo(bw*.26,-bh*1.06,bw*.42,-bh*.86); c.stroke();
      c.fillStyle = "#c1272d"; c.beginPath(); c.ellipse(bw*.43,-bh*.74,bw*.18,bw*.23,0,0,Math.PI*2); c.fill();
      c.fillStyle = "#F2BC57"; c.fillRect(bw*.34,-bh*.98,bw*.18,3); c.fillRect(bw*.36,-bh*.52,bw*.14,3);
      break;
    case "coin-bank":
      c.fillStyle = "#846043"; roundRectOn(c,-bw/2,-bh,bw,bh,4); c.fill();
      c.fillStyle = "#E69777"; c.fillRect(-bw*.55,-bh,bw*1.1,bh*.16);
      c.fillStyle = "#F2BC57"; c.beginPath(); c.arc(0, -bh*.58, bw*.2, 0, Math.PI*2); c.fill();
      c.fillStyle = "#2E2A24"; c.font = `700 ${Math.round(bw*.22)}px serif`; c.textAlign = "center";
      c.fillText("$", 0, -bh*.5);
      c.fillStyle = "rgba(251,245,232,.72)"; c.fillRect(-bw*.34,-bh*.28,bw*.68,bh*.05);
      break;
    case "tailor":
      c.fillStyle = "#846043"; roundRectOn(c,-bw/2, -bh*.85, bw, bh*.85, 4); c.fill();
      c.fillStyle = "#c1272d"; c.fillRect(-bw/2-5, -bh*.85-9, bw+10, 9);
      c.fillStyle = "rgba(251,245,232,.18)"; c.fillRect(-bw*.42,-bh*.79,bw*.84,bh*.13);
      c.fillStyle = "#F2BC57";
      c.fillRect(-bw*.18, -bh*.55, bw*.14, bh*.14); c.fillRect(bw*.04, -bh*.55, bw*.14, bh*.14);
      break;
    case "kitten-cafe":
      c.fillStyle = "#846043"; roundRectOn(c,-bw/2, -bh*.75, bw, bh*.75, 4); c.fill();
      c.fillStyle = "#E69777";
      c.beginPath(); c.moveTo(-bw/2-6,-bh*.75); c.lineTo(0,-bh); c.lineTo(bw/2+6,-bh*.75); c.closePath(); c.fill();
      c.fillStyle = "#F2BC57"; c.beginPath(); c.arc(0,-bh*.4,bw*.16,0,Math.PI*2); c.fill();
      c.fillStyle = "#2E2A24"; c.beginPath(); c.arc(-bw*.05,-bh*.43,bw*.03,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(bw*.05,-bh*.43,bw*.03,0,Math.PI*2); c.fill();
      break;
    case "emperor-gate":
      c.fillStyle = "#c1272d";
      c.fillRect(-bw*.7, -bh*1.15, bw*.16, bh*1.15);
      c.fillRect(bw*.54, -bh*1.15, bw*.16, bh*1.15);
      c.fillRect(-bw*.7, -bh*1.15, bw*1.4, bh*.14);
      c.fillStyle = "#E69777"; c.fillRect(-bw*.82,-bh*1.28,bw*1.64,bh*.13);
      c.fillStyle = "#F2BC57"; c.beginPath(); c.arc(0,-bh*1.08,bw*.12,0,Math.PI*2); c.fill();
      break;
  }
  c.restore();
}
// Small 4-point star (shop previews + star-shower particles).
function drawStarMark(c, x, y, r){
  c.beginPath();
  c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y);
  c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y);
  c.quadraticCurveTo(x, y, x, y - r); c.fill();
}
function drawTieredDeco(c, p, x, gy, h){
  const tier = p.tier || 1;
  if(tier >= 2){
    c.save();
    c.shadowColor = "rgba(255,214,95,.55)"; c.shadowBlur = 12;
    c.translate(x, gy); c.scale(1.15, 1.15); c.translate(-x, -gy);
    drawStreetDeco(c, p.id, x, gy, h);
    c.restore();
  }else{
    drawStreetDeco(c, p.id, x, gy, h);
  }
  if(tier >= 3) drawCrownAccent(c, p.id, x, gy, h);
}
// Top of each deco shape in units of s (= basis*.32), from drawStreetDeco
// geometry; used to plant the tier-3 crown at the piece's actual top.
const DECO_TOPS = {
  "red-lantern": 1.6, "noodle-stall": .84, "tea-sign": 1.3, "foo-dog": .8,
  "golden-arch": 1.4, "mahjong-table": .72, "koi-pond": .39, "drum-tower": 1.5,
  "bubble-tea": 1.34, "paper-umbrella": 1.4, "goldfish-banner": 1.4,
  "neon-cat-sign": 1.1, "shaved-ice-cart": .94, "mooncake-stall": .78,
  "firecracker-arch": .82,
};
// Tier-3 crown: a small gold pennant on a wood pole planted above the piece's
// top-left, plus three tiny star sparkles arced above. Deterministic (no
// randomness) so it renders identically every frame.
function drawCrownAccent(c, id, x, gy, basis){
  c.save(); c.translate(x, gy);
  // piece top: shape top in s-units, scaled by the tier-2 1.15x enlargement
  const top = -(DECO_TOPS[id] || 1) * basis * .32 * 1.15;
  const poleX = -basis * .3;
  const poleBase = top - basis * .12;
  const poleTip = poleBase - basis * .36;
  c.strokeStyle = "#846043"; c.lineWidth = Math.max(1.4, basis * .045); c.lineCap = "round";
  c.beginPath(); c.moveTo(poleX, poleBase); c.lineTo(poleX, poleTip); c.stroke();
  c.fillStyle = "#F2BC57";
  c.beginPath();
  c.moveTo(poleX, poleTip);
  c.lineTo(poleX + basis*.18, poleTip + basis*.07);
  c.lineTo(poleX, poleTip + basis*.14);
  c.closePath(); c.fill();
  c.fillStyle = "#FFE08A";
  const sparkles = [
    [poleX + basis*.42, poleTip - basis*.06, basis*.06],
    [poleX + basis*.78, poleTip + basis*.04, basis*.055],
    [poleX + basis*.58, poleTip - basis*.26, basis*.05],
  ];
  for(const [sx, sy, r] of sparkles) drawStarMark(c, sx, sy, r);
  c.restore();
}
function drawStreetDeco(c, id, x, gy, h){
  const s = h*.32;
  c.save(); c.translate(x, gy);
  if(!c.shadowBlur){                       // keep caller-set glow (tiered decos)
    c.shadowColor = "rgba(245,197,24,.28)";
    c.shadowBlur = 5;
  }
  switch(id){
    case "red-lantern":
      c.strokeStyle = "#846043"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0,-s*1.6); c.lineTo(0,-s*1.1); c.stroke();
      c.fillStyle = "#c1272d"; c.beginPath(); c.ellipse(0,-s*.8,s*.32,s*.42,0,0,Math.PI*2); c.fill();
      c.fillStyle = "#F2BC57"; c.fillRect(-2,-s*.38,4,s*.12);
      break;
    case "noodle-stall":
      c.fillStyle = "#846043"; roundRectOn(c,-s*.48,-s*.62,s*.96,s*.62,3); c.fill();
      c.fillStyle = "#c1272d"; c.fillRect(-s*.56,-s*.84,s*1.12,s*.18);
      c.fillStyle = "#F2BC57"; c.fillRect(-s*.56,-s*.84,s*.18,s*.18); c.fillRect(-s*.1,-s*.84,s*.18,s*.18); c.fillRect(s*.36,-s*.84,s*.2,s*.18);
      break;
    case "tea-sign":
      c.strokeStyle = "#F2BC57"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0,-s*1.3); c.lineTo(0,-s*.9); c.stroke();
      c.fillStyle = "#846043"; roundRectOn(c,-s*.38,-s*1.3,s*.76,s*.32,3); c.fill();
      c.fillStyle = "#F2BC57"; c.font = `700 ${Math.round(s*.22)}px serif`; c.textAlign = "center";
      c.fillText("tea", 0, -s*1.06);
      break;
    case "foo-dog":
      c.fillStyle = "#846043"; c.beginPath(); c.ellipse(0,-s*.3,s*.32,s*.4,0,0,Math.PI*2); c.fill();
      c.fillStyle = "#F2BC57"; c.beginPath(); c.arc(0,-s*.62,s*.18,0,Math.PI*2); c.fill();
      c.fillStyle = "#2E2A24"; c.beginPath(); c.arc(-s*.05,-s*.65,s*.025,0,Math.PI*2); c.fill(); c.beginPath(); c.arc(s*.05,-s*.65,s*.025,0,Math.PI*2); c.fill();
      break;
    case "golden-arch":
      c.strokeStyle = "#F2BC57"; c.lineWidth = 3;
      c.beginPath(); c.arc(0,-s*.5, s*.9, Math.PI, 0); c.stroke();
      c.beginPath(); c.moveTo(-s*.9,-s*.5); c.lineTo(-s*.9,0); c.moveTo(s*.9,-s*.5); c.lineTo(s*.9,0); c.stroke();
      c.fillStyle = "rgba(251,245,232,.35)"; c.beginPath(); c.arc(0,-s*.93,s*.13,0,Math.PI*2); c.fill();
      break;
    case "mahjong-table":
      c.fillStyle = "#2f7d4f"; c.fillRect(-s*.5,-s*.55,s,s*.16);
      c.fillStyle = "#8a5a2c"; c.fillRect(-s*.42,-s*.4,s*.1,s*.4); c.fillRect(s*.32,-s*.4,s*.1,s*.4);
      c.fillStyle = "#fdf6e3";
      for(const tx of [-s*.3,-s*.1,s*.1,s*.28]) c.fillRect(tx,-s*.72,s*.14,s*.14);
      break;
    case "koi-pond":
      c.fillStyle = "#3f8fb0"; c.beginPath(); c.ellipse(0,-s*.14,s*.55,s*.22,0,0,Math.PI*2); c.fill();
      c.fillStyle = "#e8734a"; c.beginPath(); c.ellipse(-s*.14,-s*.16,s*.16,s*.07,-.5,0,Math.PI*2); c.fill();
      c.fillStyle = "#fdf6e3"; c.beginPath(); c.ellipse(s*.16,-s*.1,s*.13,s*.06,.4,0,Math.PI*2); c.fill();
      c.strokeStyle = "#8a5a2c"; c.lineWidth = 2; c.beginPath(); c.ellipse(0,-s*.14,s*.58,s*.25,0,0,Math.PI*2); c.stroke();
      break;
    case "drum-tower":
      c.fillStyle = "#8a5a2c"; c.fillRect(-s*.34,-s*1.15,s*.68,s*1.15);
      c.fillStyle = "#c1272d"; c.beginPath(); c.moveTo(-s*.48,-s*1.15); c.lineTo(0,-s*1.5); c.lineTo(s*.48,-s*1.15); c.closePath(); c.fill();
      c.beginPath(); c.ellipse(0,-s*.62,s*.2,s*.24,0,0,Math.PI*2); c.fill();
      c.fillStyle = "#F2BC57"; c.beginPath(); c.arc(0,-s*.62,s*.07,0,Math.PI*2); c.fill();
      break;
    case "bubble-tea":
      c.fillStyle = "#8a5a2c"; c.fillRect(-s*.4,-s*.7,s*.8,s*.7);
      c.fillStyle = "#F2BC57"; c.fillRect(-s*.48,-s*.86,s*.96,s*.16);
      c.fillStyle = "#e8a9c9"; c.fillRect(-s*.12,-s*1.2,s*.24,s*.3);
      c.strokeStyle = "#5a3a1c"; c.lineWidth = 2; c.beginPath(); c.moveTo(0,-s*1.2); c.lineTo(s*.06,-s*1.34); c.stroke();
      break;
    case "paper-umbrella":
      c.strokeStyle = "#8a5a2c"; c.lineWidth = 2; c.beginPath(); c.moveTo(0,0); c.lineTo(0,-s*.9); c.stroke();
      c.fillStyle = "#e8734a"; c.beginPath(); c.arc(0,-s*.9,s*.5,Math.PI,0); c.fill();
      c.strokeStyle = "#fdf6e3"; c.lineWidth = 1.5;
      for(const a of [-2.5,-1.9,-1.2,-.6]){ c.beginPath(); c.moveTo(0,-s*.9); c.lineTo(Math.cos(a)*s*.5,-s*.9+Math.sin(a)*s*.5); c.stroke(); }
      break;
    case "goldfish-banner":
      c.strokeStyle = "#8a5a2c"; c.lineWidth = 2; c.beginPath(); c.moveTo(0,0); c.lineTo(0,-s*1.4); c.stroke();
      c.fillStyle = "#e8734a"; c.beginPath(); c.ellipse(s*.2,-s*1.1,s*.3,s*.12,0,0,Math.PI*2); c.fill();
      c.fillStyle = "#F2BC57"; c.beginPath(); c.moveTo(s*.46,-s*1.1); c.lineTo(s*.62,-s*1.2); c.lineTo(s*.62,-s*1.0); c.closePath(); c.fill();
      break;
    case "neon-cat-sign":
      c.fillStyle = "#846043"; c.fillRect(-s*.36,-s*1.1,s*.72,s*.8);
      c.strokeStyle = "#7fd7ff"; c.lineWidth = 2; c.strokeRect(-s*.36,-s*1.1,s*.72,s*.8);
      c.strokeStyle = "#F2BC57"; c.beginPath(); c.arc(0,-s*.72,s*.18,0,Math.PI*2); c.stroke();
      c.beginPath(); c.moveTo(-s*.14,-s*.86); c.lineTo(-s*.06,-s*.98); c.moveTo(s*.14,-s*.86); c.lineTo(s*.06,-s*.98); c.stroke();
      break;
    case "shaved-ice-cart":
      c.fillStyle = "#fdf6e3"; c.fillRect(-s*.4,-s*.62,s*.8,s*.5);
      c.fillStyle = "#7fd7ff"; c.beginPath(); c.arc(0,-s*.72,s*.22,Math.PI,0); c.fill();
      c.fillStyle = "#e8734a"; c.fillRect(-s*.06,-s*.94,s*.12,s*.1);
      c.strokeStyle = "#8a5a2c"; c.lineWidth = 2;
      c.beginPath(); c.arc(-s*.22,-s*.04,s*.1,0,Math.PI*2); c.stroke();
      c.beginPath(); c.arc(s*.22,-s*.04,s*.1,0,Math.PI*2); c.stroke();
      break;
    case "mooncake-stall":
      c.fillStyle = "#8a5a2c"; c.fillRect(-s*.42,-s*.6,s*.84,s*.6);
      c.fillStyle = "#c1272d"; c.fillRect(-s*.5,-s*.78,s,s*.18);
      c.fillStyle = "#F2BC57";
      for(const tx of [-s*.26,-s*.02,s*.2]){ c.beginPath(); c.arc(tx+s*.06,-s*.42,s*.09,0,Math.PI*2); c.fill(); }
      break;
    case "firecracker-arch":
      c.strokeStyle = "#c1272d"; c.lineWidth = 3;
      c.beginPath(); c.arc(0,-s*.2,s*.62,Math.PI,0); c.stroke();
      c.fillStyle = "#c1272d";
      for(const [ax,ay] of [[-s*.62,-s*.2],[s*.62,-s*.2],[-s*.5,-s*.62],[s*.5,-s*.62],[0,-s*.82]]) c.fillRect(ax-2,ay,4,s*.18);
      c.fillStyle = "#F2BC57"; c.beginPath(); c.arc(0,-s*.82,s*.06,0,Math.PI*2); c.fill();
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
if(isFirstRun(store.get("introDone", false), masteryStore)){
  renderWelcome();
  show("welcome");
}
renderHome();
renderQuests();
renderStreet();
updateNav(currentScreen);
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
