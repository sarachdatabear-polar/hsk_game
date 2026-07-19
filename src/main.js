"use strict";
import { buildPool, coveragePct, scopeKey, meaning, normalizeLen, modeKey, scopeSummary } from "./pool.js";
import { formatFor, FORMATS } from "./formats.js";
import { gradeTyped, syllables, syllableTones, letters } from "./pinyin.js";
import { clozeFor } from "./cloze.js";
import { exampleFor } from "./examples.js";
import { tonePool, toneQuestion, gradeTone } from "./tone_gym.js";
import { killPoints } from "./scoring.js";
import { coinBurst, comboFloater, fireworkRing, feedbackEffect, perfectBonus, impactBurst as lanternSparkBurst } from "./fx.js";
import { sfx, setSfxVolume, clampVol, unlockSfx } from "./sfx.js";
import { drawCat } from "./cat.js";
import { drawRaccoon } from "./raccoon.js";
import { CONTENT_H } from "./sprite-draw.js";
import { uiScale, layout, lanternTrailLayout, lanternTrailBackdrop, lanternApproachScale } from "./layout.js";
import { sprite } from "./sprites.js";
import { nineSliceRects } from "./nineslice.js";
import { preload as preloadAssets } from "./assets.js";
import { recordAnswer, levelMastery } from "./mastery.js";
import { levelForXp, xpToNext, accessoriesFor, MILESTONES } from "./growth.js";
import { smartDeck, weakWords, isDue } from "./srs.js";
import { defaultDaily, noteActivity, streakInfo } from "./daily.js";
import { REMINDER_HOUR, reminderPlan, reengagePlan } from "./notify.js";
import { defaultQuestState, noteQuestEvent, questStatus,
         defaultMonthly, noteMonthlyProgress, monthlyStatus, claimMonthly, settleMonthly } from "./quests.js";
import { reviewChallengePoints, reviewChallengeSpeedFactor } from "./boss.js";
import { initAudio, speak, audioAvailable, hasMp3, setVoiceVolume, unlockAudio } from "./audio.js";
import { initNative, hapticKill, hapticWrong, keepAwake, syncStreakReminder, syncReengageReminder, requestNotifPermission, isNative } from "./native.js";
import { CATALOG, SKIN_PALETTES, defaultShop, canAfford, buy, buyConsumable, equipItem, seasonStatus, upgradePrice, unownedDailyStock } from "./shop.js";
import { BUILDINGS, streetPieces, streetProgress, streetMetrics, DECO_SPRITE_SCALE } from "./street.js";
import { iconSvg, setIconLabel, setPill } from "./icons.js";
import { t, setLocale, getLocale, detectLocale } from "./i18n.js";
import { HANZI_STACK, LATIN_STACK, fontString } from "./fonts.js";
import { navVisibleOn, activeTabFor } from "./nav.js";
import { comboMultiplier, comboFires, roundProgress } from "./hud.js";
import { comboGlowTier, plaqueBounce, countUpValue, trailMoveX } from "./juice.js";
import { isFirstRun, introDeck } from "./firstrun.js";
import { defaultStickers, stickerDefs, scopeFacts, evaluateAwards, popToast, dropFromQueue } from "./stickers.js";
import { journeyNodes, currentNodeId } from "./journey.js";
import { defaultProfile, normalizeDisplayName, profileInitial, profileStats, equippedSummary } from "./profile.js";
import { accountState, accountView, canSendCode, codeLooksValid } from "./account.js";
import { getSession, ensureGuest, sendCode, verifyCode, saveDisplayName, signOut, deleteAccount } from "./cloud.js";
import { SYNC_KEYS } from "./merge.js";
import { createStore } from "./storage.js";
import { runMigrations } from "./migrations.js";
import { errorEntry, pushErrorThrottled, describeErrorEvent } from "./errlog.js";
import { reconcile, pushDirty } from "./sync.js";
import { PRODUCTS, productById, displayPrice } from "./monetization/products.js";
import { defaultEnt, isSupporter, applyPurchase, restoreFrom } from "./monetization/purchases.js";
import { getProvider } from "./monetization/provider.js";
import { iapVisible } from "./monetization/gating.js";
import { pollForCredit } from "./monetization/purchase-poll.js";
import { createQuestSession } from "./quest-session.js";
import { questFeedbackFor } from "./quest-feedback.js";
import { questResultsSummary } from "./quest-results.js";
import { questRewardPolicy } from "./quest-rewards.js";
import { cardSessionKey, newCardSession, restoreCardSession, cardSessionSnapshot } from "./flashcards.js";
import { createAnalytics } from "./analytics/index.js";
import { durationBucket } from "./analytics/events.js";
import { SUPABASE_URL, SUPABASE_KEY } from "./cloud-config.js";
import { createWordDetail } from "./ui/word-detail-screen.js";
import { createFriendCompare } from "./ui/friend-screen.js";
import { friendCardFromHash } from "./friend-compare.js";

/* ============================== data & state ============================== */
const D = window.HSK_DATA;
// v6 phase 3: cloze sentence data + baked distractors, loaded via a <script>
// tag before dist/app.js. Undefined on file:// if the tag is missing → the
// cloze format never triggers (caps.cloze returns false for every word).
const CLOZE = window.HSK_CLOZE || {};
// Flashcard-back example sentences: cloze words provide their own sentence, plus
// the broader HSK3 example set (data/examples.js, EN-only). Merged for the
// example surface only — the cloze GAME still uses CLOZE (it needs distractors).
const EXAMPLES = Object.assign({}, CLOZE, window.HSK_EXAMPLES || {});
// hanzi → full record, over the WHOLE dataset (not the scoped pool). Cloze
// distractors may be words outside a top-N scope, so their pinyin subs must
// resolve here. Built once at boot.
const BY_HANZI = {};
for (const lv of Object.values(D.levels)) for (const w of lv) BY_HANZI[w.h] = w;
const $ = s => document.querySelector(s);
function setPressed(el, on){
  if(!el) return;
  el.classList.toggle("on", !!on);
  el.setAttribute("aria-pressed", String(!!on));
}
// Thai-primary answers (battle-interface round T2): Thai-locale players see
// Thai as the bold main line, English as the smaller sub line — everywhere
// else keeps English-main/Thai-sub (or single-language en/th modes, which
// ignore the flag). Single wrapper so every meaning() call site in main.js
// (and the buildOptions call it feeds) derives the flag the same way.
const meaningOf = (w, lang) => meaning(w, lang, getLocale() === "th");
// Accessibility (§11): read once at boot. When set, feedback-stamp effects
// (drawFeedbackLayer) get half the on-screen duration and the hit-flash
// screen shake is skipped outright (see the wrong-answer branch in answer()).
const REDUCED_MOTION = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
function fxDuration(ms){ return REDUCED_MOTION ? Math.round(ms/2) : ms; }
function fxUntil(ms){ return performance.now() + fxDuration(ms); }
// Must run before anything reads through the store: migrations see raw values.
runMigrations(localStorage);
const store = createStore({ storage: localStorage, syncKeys: SYNC_KEYS });
// Crash visibility: persist uncaught errors/rejections to a local-only ring
// buffer (nbhsk.errlog). Inspect via devtools: JSON.parse(localStorage["nbhsk.errlog"]).
function logGlobalError(ev){
  try{
    const d = describeErrorEvent(ev);
    const cur = store.get("errlog", []);
    const next = pushErrorThrottled(cur, errorEntry(d.source, d.message, d.stack, Date.now()));
    if (next !== cur) store.set("errlog", next);  // throttled repeats skip the write
  }catch(e){}
}
window.addEventListener("error", logGlobalError);
window.addEventListener("unhandledrejection", logGlobalError);
// Dark analytics transport (Task 8 wiring): hard no-op until the Settings
// consent toggle is on. See src/analytics/ for the queue/consent/transport
// modules constructed here.
function analyticsUuid() {
  try {
    if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  // Non-crypto fallback (crypto.randomUUID is undefined on file://):
  return "axxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
const analytics = createAnalytics({
  store,
  fetchImpl: (...args) => fetch(...args),
  now: () => new Date(),
  gen: analyticsUuid,
  isOnline: () => navigator.onLine !== false,
  isNative,
  config: { url: SUPABASE_URL, key: SUPABASE_KEY },
});
let analyticsSessionStart = Date.now();
const scope = Object.assign({levels:[1], core:false, newOnly:false, topN:0, lang:"both", sessionLen:20},
                            store.get("scope", {}));
let settings = Object.assign({autoSpeak:true, showPinyin:true, sfxVol:1, voiceVol:1}, store.get("settings", {}));
// Defensive clamp — a corrupt/out-of-range stored value shouldn't survive a
// reload (see clampVol in sfx.js, shared with audio.js's voice volume).
settings.sfxVol = clampVol(settings.sfxVol);
settings.voiceVol = clampVol(settings.voiceVol);
let formatIntros = store.get("formatIntros", {});   // v6: which formats have had their soft-intro
// UI language: persisted choice wins, else device language. i18n.js is pure,
// so persistence lives here (nbhsk.locale), like every other nbhsk.* key.
setLocale(store.get("locale", detectLocale()));
sfx.enabled = store.get("sfx", true);
setSfxVolume(settings.sfxVol);
setVoiceVolume(settings.voiceVol);
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
let playerProfile = Object.assign(defaultProfile(), store.get("profile", {}));
playerProfile.displayName = normalizeDisplayName(playerProfile.displayName);
function noteAnswer(hanzi, correct){
  recordAnswer(masteryStore, hanzi, correct);
  store.set("mastery", masteryStore);
}
let wallet = store.get("wallet", 0);
// IAP (mock-provider v1). ent is local-only on purpose — NOT in SYNC_KEYS;
// entitlements become server-authoritative in the RevenueCat slice.
let ent = Object.assign(defaultEnt(), store.get("ent", {}));
// Dev-flag escape hatch (mock only): localStorage.setItem("nbhsk.dev.iap", "true")
// + reload. Sync/cheap — anything that must stay sync keeps reading this directly.
// Real visibility (see iapOn below) also honors a real provider's availability.
const iapEnabled = () => !!store.get("dev.iap", false);
// Delete-account control (right-to-erasure) ships LIVE for email-signed-in
// users as of v77 — the Edge Function is deployed + E2E-smoke-verified
// (2026-07-17). The dev flag stays as a local testing escape hatch:
// nbhsk.dev.deleteAccount = false hides the control on this device.
const deleteAccountEnabled = () => !!store.get("dev.deleteAccount", true);
let iapProvider = null;
let iapPending = null;   // productId of the purchase in flight — survives re-renders
// analytics (dark) product_view dedup: renderIapSections() runs on every
// renderShop() (initial open + every in-place re-render after a purchase),
// but the funnel event should fire once per product per shop *open* — cleared
// at the shop-tab entry point (see "shop" branch of the [data-go] handler).
const shopViewedProducts = new Set();
function provider(){
  if(!iapProvider) iapProvider = getProvider({
    get: (k,d)=>store.get(k,d),
    set: (k,v)=>store.set(k,v),
    // A store purchase must be attributed to the UUID accepted by the
    // Supabase grant_purchase RPC. ensureGuest reuses an existing signed-in
    // session or creates an anonymous UUID before RevenueCat configures.
    ensureUserId: async () => {
      const r = await ensureGuest(getLocale(), playerProfile.displayName || undefined);
      if(!r.ok || !r.session || !r.session.user) return null;
      accountUI.session = r.session;
      renderAccount();
      return r.session.user.id;
    },
  });
  return iapProvider;
}
// Availability-driven visibility (go-live plan §4 T1, src/monetization/gating.js):
// a real provider un-darks the purchase UI on its own; the mock stays behind
// iapEnabled(). Starts false so nothing flashes visible before init resolves
// it (identical to today's hidden-by-default in Phase 1, where no real
// provider exists). The dev flag itself only changes via localStorage edit +
// reload, so no live re-evaluation is needed beyond the one at boot.
let iapOn = false;
let shopState = Object.assign(defaultShop(), store.get("shop", {}));
function updateWalletChip(){ setPill($("#home-wallet"), "secondary-coin", wallet.toLocaleString()); }
// Re-arm window (ms): a deco buy synchronously re-renders its row as an
// "Upgrade" button at the same coordinates, so a double-tap's second tap
// can land on it and charge the upgrade too — see makeShopRow.
const SHOP_REARM_MS = 400;
let justBought = null;   // {id, at} — item + moment of the most recent purchase
// Owned streak-freeze count (0-2, retention pack). Counted, not owned — never
// routed through shopState.owned/buy()/equipItem() (see shop.js buyConsumable).
let freezes = Math.min(2, Number(store.get("freezes")) || 0);

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
  if(txt) txt.textContent = t("home.levelChip", { lv });
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
  const info = streakInfo(daily, todayStr(), freezes);
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
  // retention pack: small "N freeze(s)" chip, shown only while any are owned
  const freezeChip = $("#streak-freeze-chip");
  if(freezeChip){
    freezeChip.style.display = freezes > 0 ? "flex" : "none";
    const label = freezeChip.querySelector(".freeze-count");
    if(label) label.textContent = freezes === 1 ? t("home.freeze-one") : t("home.freezes", { n: freezes });
  }
}
// Minimal floating toast (retention pack) — freeze-used is a rare single
// event, so no queue/stacking: a second call while one is showing just
// replaces it. Appended to <body> (outside #app/.screen) so it survives the
// show("home")/show("results") screen swap that follows noteDaily().
let toastTimer = 0;
function toast(msg){
  clearTimeout(toastTimer);
  let el = document.getElementById("toast-pop");
  if(!el){
    el = document.createElement("div");
    el.id = "toast-pop";
    el.className = "toast-pop";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  requestAnimationFrame(()=> el.classList.add("show"));
  toastTimer = setTimeout(()=>{ el.classList.remove("show"); }, 2600);
}

/* ============================== accessible dialogs ============================== */
let activeDialog = null;
const dialogFocusable = el => [...el.querySelectorAll(
  'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'
)].filter(node => node.offsetParent !== null);

function setDialogSiblings(dialog, inert){
  for(const sibling of dialog.parentElement.children){
    if(sibling === dialog) continue;
    if(inert){
      sibling.dataset.preDialogAriaHidden = sibling.getAttribute("aria-hidden") ?? "__none__";
      sibling.setAttribute("aria-hidden", "true");
      sibling.inert = true;
    }else{
      const previous = sibling.dataset.preDialogAriaHidden;
      if(previous === "__none__") sibling.removeAttribute("aria-hidden");
      else if(previous !== undefined) sibling.setAttribute("aria-hidden", previous);
      delete sibling.dataset.preDialogAriaHidden;
      sibling.inert = false;
    }
  }
}

function openDialog(dialog, initialFocus, onEscape){
  if(!dialog) return;
  if(activeDialog && activeDialog.dialog !== dialog) closeDialog(activeDialog.dialog, false);
  const returnFocus = document.activeElement;
  dialog.classList.add("on");
  setDialogSiblings(dialog, true);
  activeDialog = { dialog, returnFocus, onEscape };
  requestAnimationFrame(()=> (initialFocus || dialogFocusable(dialog)[0])?.focus());
}

function closeDialog(dialog, restoreFocus = true){
  if(!dialog) return;
  dialog.classList.remove("on");
  setDialogSiblings(dialog, false);
  if(activeDialog?.dialog === dialog){
    const target = activeDialog.returnFocus;
    activeDialog = null;
    if(restoreFocus && target?.isConnected) requestAnimationFrame(()=>target.focus());
  }
}

document.addEventListener("keydown", event => {
  if(!activeDialog) return;
  if(event.key === "Escape" && activeDialog.onEscape){
    event.preventDefault();
    activeDialog.onEscape();
    return;
  }
  if(event.key !== "Tab") return;
  const focusable = dialogFocusable(activeDialog.dialog);
  if(!focusable.length){ event.preventDefault(); return; }
  const first = focusable[0], last = focusable[focusable.length - 1];
  if(event.shiftKey && document.activeElement === first){ event.preventDefault(); last.focus(); }
  else if(!event.shiftKey && document.activeElement === last){ event.preventDefault(); first.focus(); }
  else if(!activeDialog.dialog.contains(document.activeElement)){
    event.preventDefault(); (event.shiftKey ? last : first).focus();
  }
}, true);

const wordDetail = createWordDetail({ $, openDialog, closeDialog, examples: EXAMPLES, getLocale });

// Friend compare — no accounts; a compact score card is shared as a code/link
// and compared locally. getMyCard() derives from the same authoritative state
// the profile dashboard reads.
async function shareFriendCard(text, link, code){
  try { if(navigator.share){ await navigator.share({ title: t("friend.title"), text, url: link }); return; } }
  catch { /* user dismissed the share sheet, or unsupported — fall through */ }
  try { if(navigator.clipboard?.writeText){ await navigator.clipboard.writeText(code); toast(t("friend.copied")); return; } }
  catch { /* clipboard blocked (file://, permissions) — fall through */ }
  $("#fr-code")?.select?.();
}
const friendCompare = createFriendCompare({
  $, openDialog, closeDialog, share: shareFriendCard,
  getOrigin: () => location.origin + location.pathname,
  getMyCard: () => {
    const stats = profileStats({
      levels: D.levels, mastery: masteryStore, stickerState, stickerDefs: STICKER_DEFS,
      shop: shopState, catalog: CATALOG,
    });
    return {
      name: playerProfile.displayName,
      level: levelForXp(xp),
      streak: streakInfo(daily, todayStr(), freezes).streak,
      mastered: stats.masteredWords,
      stickers: stats.earnedStickers,
    };
  },
});
$("#go-friend").onclick = () => friendCompare.open();
// Deep link: opening a shared `#f=<code>` link lands straight in the compare view.
const incomingFriendCard = friendCardFromHash(location.hash);
if(incomingFriendCard) requestAnimationFrame(() => friendCompare.open(incomingFriendCard));

function noteDaily(count){
  const wasGoalMet = streakInfo(daily, todayStr(), freezes).goalMet;
  const r = noteActivity(daily, todayStr(), count, freezes);
  // persist the same shape as before — freezesUsed is transient, not stored
  daily = { last: r.last, streak: r.streak, today: r.today, restWeek: r.restWeek, restDay: r.restDay };
  store.set("daily", daily);
  if(r.freezesUsed > 0){
    freezes = Math.max(0, freezes - r.freezesUsed);
    store.set("freezes", freezes);
    toast(t("toast.freeze-used", { n: r.streak }));
  }
  updateStreakChip();
  const info = streakInfo(daily, todayStr(), freezes);
  // retention pack: once today's goal is first met, cancel any pending
  // streak-saver reminder rather than waiting for the next backgrounding.
  if(!wasGoalMet && info.goalMet){
    syncStreakReminder({ schedule: false, hour: REMINDER_HOUR, cancel: true }, "", "");
  }
  // Ask for the Android notification permission HERE, in the foreground, the
  // first time tonight's streak-saver is actually plausible (live streak, goal
  // not yet met, before the reminder hour). Android 13+ suppresses this dialog
  // if requested while backgrounding, so the visibilitychange sync only checks
  // the grant — the prompt has to happen during active play. Once per session.
  if(!notifPermAsked && (reminderPlan(info, new Date().getHours()).schedule || reengagePlan(info).schedule)){
    notifPermAsked = true;
    requestNotifPermission().then(result => {
      // analytics (dark): notif_permission — fires when the foreground Android
      // notification-permission prompt resolves; map to the contract's closed
      // set so an unexpected native status doesn't get silently dropped.
      const mapped = result === "granted" ? "granted" : result === "denied" ? "denied" : "dismissed";
      analytics.track("notif_permission", { result: mapped });
    });
  }
}
let notifPermAsked = false;

/* ============================== daily quests ============================== */
let questState = Object.assign(defaultQuestState(), store.get("quests", {}));
let questToasts = [];  // quests completed during the current battle, for the results screen

/* ============================== monthly quest (retention pack) ============================== */
// Rolls up daily-quest completions into one calendar-month goal with a coin
// reward + album badge (quests.js owns the pure rollover/cap/claim rules;
// store.get already JSON.parses, so this mirrors questState's Object.assign
// pattern rather than the brief's literal snippet, which double-parses).
let monthly = Object.assign(defaultMonthly(), store.get("monthly", {}));

// Auto-claim a month that ended complete-but-unclaimed (follow-up ticket from
// PR #70). Runs at boot, before every monthly write (questEvent), and on
// quest render, so the payout lands at the first observation of the new month.
function settleMonthlyNow(){
  const r = settleMonthly(monthly, todayStr());
  if(r.state === monthly) return;
  monthly = r.state;
  store.set("monthly", monthly);
  if(r.earned > 0){
    wallet += r.earned; store.set("wallet", wallet); updateWalletChip();
    toast(t("quest.monthly.autoClaimed", { reward: r.earned }));
  }
}
settleMonthlyNow();

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
  if(def.event === "monthly-40") return t("sticker.monthlyName");
  return t("sticker.streak30Name");
}
function stickerHint(def){
  if(def.kind === "scope") return t("sticker.scopeHint", { lv: def.lv, n: def.topN });
  if(def.kind === "milestone") return t("sticker.msHint", { lv: def.lv, pct: def.pct });
  if(def.event === "welcome") return t("sticker.welcomeHint");
  if(def.event === "first-boss") return t("sticker.bossHint");
  if(def.event === "streak-7") return t("sticker.streak7Hint");
  if(def.event === "monthly-40") return t("sticker.monthlyHint");
  return t("sticker.streak30Hint");
}
function stickerIcon(def){
  if(def.kind === "scope") return "paw";
  if(def.kind === "milestone") return "star";
  if(def.event === "first-boss") return "target";
  if(def.event === "welcome") return "cards";
  if(def.event === "monthly-40") return "calendar";
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
  if(r.completed.length){
    questToasts.push(...r.completed);
    // retention pack: every daily quest completion also feeds the monthly goal.
    // Settle first — on a month boundary noteMonthlyProgress would wipe an
    // unclaimed reward before settleMonthly could see it.
    settleMonthlyNow();
    monthly = noteMonthlyProgress(monthly, todayStr(), r.completed.length);
    store.set("monthly", monthly);
  }
  renderQuests();
}
function renderQuests(){
  const panel = $("#quest-panel");
  if(!panel) return;
  settleMonthlyNow();
  panel.innerHTML = "";
  const ms = monthlyStatus(monthly, todayStr());
  const pct = Math.min(100, Math.round(100*ms.done/ms.target));
  const mrow = document.createElement("div");
  mrow.className = "quest-row monthly-row"+(ms.claimed? " done":"");
  mrow.innerHTML = `<div class="mq-top">
      <span class="qi">${ms.claimed? t("quest.status.done") : t("quest.status.open")}</span>
      <span class="qd">${t("quest.monthly.title", { done: ms.done, target: ms.target })}</span>
      <span class="qr">${ms.claimed ? "" : t("quest.reward", { reward: ms.reward })}</span>
    </div>
    <div class="mbar monthly-bar"><i style="width:${pct}%"></i></div>`;
  if(ms.complete && !ms.claimed){
    const btn = document.createElement("button");
    btn.className = "chip buy-chip monthly-claim";
    btn.textContent = t("quest.monthly.claim", { reward: ms.reward });
    btn.onclick = () => {
      const c = claimMonthly(monthly);
      monthly = c.state;
      store.set("monthly", monthly);
      if(c.earned > 0){ wallet += c.earned; store.set("wallet", wallet); updateWalletChip(); }
      renderQuests();
    };
    mrow.appendChild(btn);
  }
  panel.appendChild(mrow);
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
// Street quest popup (2026-07-11 audit F2/F3 revert): #quest-panel itself
// didn't move logic, only markup — renderQuests() above still targets it
// unchanged. Open/close just toggles the overlay, same convention as
// #pause-overlay, plus a backdrop-tap close (safe here — unlike the battle
// pause overlay, an accidental dismiss costs nothing).
function closeQuestDialog(){ closeDialog($("#quest-overlay")); }
$("#street-quests-btn").onclick = ()=>{
  renderQuests();
  openDialog($("#quest-overlay"), $("#quest-popup-close"), closeQuestDialog);
};
$("#quest-popup-close").onclick = closeQuestDialog;
$("#quest-overlay").addEventListener("click", e=>{
  if(e.target.id === "quest-overlay") closeQuestDialog();
});
function updateSmartBtn(){
  const deck = smartDeck(masteryStore, pool, Date.now());
  const btn = $("#go-smart");
  // deck===0 (fresh profile, nothing played yet) stays tappable — disabled
  // would swallow the click that's supposed to explain why it's empty — so
  // only the 1-7 "not enough yet" case uses the real disabled attribute.
  // .locked mimics the same muted look for the ===0 case.
  btn.disabled = deck.length > 0 && deck.length < 8;
  btn.classList.toggle("locked", deck.length === 0);
  // below the 8-word minimum, show progress toward it ("6/8") so the disabled
  // button reads as "not enough yet" rather than broken
  setIconLabel(btn, "target", !deck.length ? t("scope.smartReview")
    : deck.length < 8 ? t("scope.smartReviewProgress", { have: deck.length, min: 8 })
    : t("scope.smartReviewReady", { n: deck.length }));
}
$("#go-smart").onclick = ()=>{
  const deck = smartDeck(masteryStore, pool, Date.now());
  if(deck.length === 0){ toast(t("scope.smartReviewLocked")); return; }
  if(deck.length < 8) return;
  battleDeckOverride = deck;
  smartDeckNext = true;
  questEvent("review");
  startBattle("round");
};

/* ============================== account ============================== */
// UI-flow state only — truth lives in the supabase session (cloud.js) and
// the pure view model (account.js). lastSentAt feeds the resend cooldown.
const accountUI = { session: null, phase: "idle", email: "", verifyType: "email", lastSentAt: 0, confirmingDelete: false };
let accountCooldownTimer = 0;

function accountOnline(){
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

function renderAccount(){
  clearTimeout(accountCooldownTimer);
  const state = accountState(accountUI.session);
  const email = (accountUI.session && accountUI.session.user && accountUI.session.user.email) || accountUI.email;
  const v = accountView(state, { online: accountOnline(), phase: accountUI.phase, email });
  const p = $("#account-panel");
  p.innerHTML = "";
  const status = document.createElement("div");
  status.className = "sect";
  status.textContent = t(v.statusKey, v.statusParams);
  p.appendChild(status);
  const ex = document.createElement("p");
  ex.className = "account-explain";
  ex.textContent = t(v.explainKey);
  p.appendChild(ex);
  if(state === "local"){
    // Pre-connect benefit rows (audit v55 F2) — three short reasons to
    // connect, shown only before the player has taken any account action.
    // Literal t("...") calls (not a computed key) so the static i18n-usage
    // guard (test/i18n-usage.test.js) enumerates each one.
    const benefitRow = (icon, label) => {
      const row = document.createElement("p");
      row.className = "account-benefit";
      row.appendChild(iconSvg(icon));
      const span = document.createElement("span");
      span.textContent = label;
      row.appendChild(span);
      return row;
    };
    const benefits = document.createElement("div");
    benefits.className = "account-benefits";
    benefits.appendChild(benefitRow("trophy", t("account.benefit.safe")));
    benefits.appendChild(benefitRow("cards", t("account.benefit.devices")));
    benefits.appendChild(benefitRow("star", t("account.benefit.free")));
    p.appendChild(benefits);
  }
  if(state !== "local"){
    const sy = document.createElement("p");
    sy.className = "account-explain";
    const meta = store.get("sync", null);
    sy.textContent = meta && meta.lastSyncAt
      ? t("account.lastSynced", { when: new Date(meta.lastSyncAt).toLocaleString() })
      : t("account.neverSynced");
    p.appendChild(sy);
  }
  if(v.showConnect) p.appendChild(accountBtn(t("account.connect"), onAccountConnect));
  if(v.showEmailForm){
    const emailInput = accountInput("email", t("account.emailPh"), accountUI.email);
    p.appendChild(emailInput);
    p.appendChild(accountBtn(t("account.sendCode"), ()=>onAccountSendCode(emailInput.value)));
  }
  if(v.showCodeForm){
    const code = accountInput("text", t("account.codePh"), "");
    code.inputMode = "numeric"; code.maxLength = 10; code.autocomplete = "one-time-code";
    p.appendChild(code);
    p.appendChild(accountBtn(t("account.verify"), ()=>onAccountVerify(code.value)));
    p.appendChild(accountResendBtn());
    p.appendChild(accountChangeEmailBtn());
  }
  if(isSupporter(ent)){
    const chip = document.createElement("p");
    chip.className = "account-explain";
    chip.textContent = t("account.supporterChip");
    p.appendChild(chip);
  }
  if(v.showSignOut) p.appendChild(accountBtn(t("account.signOut"), onAccountSignOut));
  if(v.showSignOut && deleteAccountEnabled()) renderDeleteAccount(p);
  // IAP v1: restore is device-local (mock provider); Apple will require
  // this button once real billing lands, so the UI slot exists now.
  // Availability-aware (iapOn, not iapEnabled()) — see gating.js.
  if(iapOn && provider().supportsRestore()) p.appendChild(accountBtn(t("iap.restore"), onRestorePurchases));
}

function accountBtn(label, onclick){
  const b = document.createElement("button");
  b.className = "big"; b.textContent = label;
  b.onclick = async () => {
    if(b.disabled) return;
    b.disabled = true;
    try { await onclick(); } finally { b.disabled = false; }
  };
  return b;
}

function accountInput(type, placeholder, value){
  const i = document.createElement("input");
  i.type = type; i.placeholder = placeholder; i.value = value;
  i.className = "account-input";
  return i;
}

function accountResendBtn(){
  const b = document.createElement("button");
  b.className = "big account-resend";
  const tick = ()=>{
    const r = canSendCode(accountUI.email, accountUI.lastSentAt, Date.now());
    if(r.ok){ b.disabled = false; b.textContent = t("account.resend"); }
    else if(r.reason === "cooldown"){
      b.disabled = true;
      b.textContent = t("account.resendWait", { s: Math.ceil(r.waitMs / 1000) });
      accountCooldownTimer = setTimeout(tick, 1000);
    }
  };
  clearTimeout(accountCooldownTimer);
  tick();
  // Same re-entry guard as accountBtn(): without it, two rapid clicks right
  // after the cooldown clears fire two OTP sends (mailer budget ~2/hr) since
  // accountUI.lastSentAt only updates after the await resolves. On success
  // renderAccount() rebuilds this button from scratch (this `b` goes stale,
  // so the finally's re-enable is a harmless no-op); on a failure toast
  // (offline/network/cooldown) there's no re-render, so finally is what
  // re-enables this exact button.
  b.onclick = async () => {
    if(b.disabled) return;
    b.disabled = true;
    try { await onAccountSendCode(accountUI.email); }
    finally { b.disabled = false; }
  };
  return b;
}

function accountChangeEmailBtn(){
  const b = document.createElement("button");
  b.className = "account-change-email";
  b.textContent = t("account.changeEmail");
  // Escape hatch for a typo'd email: back to the email form without losing
  // what was typed (accountUI.email is intentionally left alone — it prefills
  // the email input for correction, it does not get cleared like sign-out does).
  b.onclick = ()=>{ accountUI.phase = "idle"; renderAccount(); };
  return b;
}

async function refreshAccountSession(){
  const r = await getSession();
  if(r.ok){
    accountUI.session = r.session;
    renderAccount();
    if(r.session && playerProfile.displayName)
      saveDisplayName(r.session, getLocale(), playerProfile.displayName);
  }
}

// cloud-save: module-scope caches don't see localStorage writes — after a
// merge, re-read every synced key the same way boot does.
function rehydrateFromStore(){
  masteryStore = store.get("mastery", {});
  wallet = store.get("wallet", 0);
  shopState = Object.assign(defaultShop(), store.get("shop", {}));
  freezes = Math.min(2, Number(store.get("freezes")) || 0);
  xp = store.get("xp", 0);
  daily = Object.assign(defaultDaily(), store.get("daily", {}));
  daily.today = Object.assign({date:"", resolved:0}, daily.today);
  questState = Object.assign(defaultQuestState(), store.get("quests", {}));
  monthly = Object.assign(defaultMonthly(), store.get("monthly", {}));
  const st = Object.assign(defaultStickers(), store.get("stickers", {}) || {});
  stickerState = { earned: Object.assign({}, st.earned), queue: stickerState.queue };
  updateWalletChip();
}

// Reconcile edge: never during an active round (design §3 — merged state must
// not change mid-battle); the next edge catches up.
async function syncEdge(reason){
  if(B.on) return;
  analytics.flush();
  const r = await reconcile(store, reason);
  if(r.ok || r.localChanged){
    rehydrateFromStore();
    renderAccount();
    if(r.ok && reason === "sign-in" && r.changed) toast(t("account.restored"));
  }
}

// pushDirty can redirect to a full reconcile (monthly-dirty, sync.js) — any
// merge that wrote the store must be followed by a rehydrate, same as
// syncEdge. The plain push path never merges ("changed" absent) and skips it.
function pushEdge(reason){
  pushDirty(store, reason, undefined, B.on).then(r => {
    if(r && (r.localChanged || (r.ok && "changed" in r))) { rehydrateFromStore(); renderAccount(); }
  });
}

async function onAccountConnect(){
  const r = await ensureGuest(getLocale(), playerProfile.displayName || undefined);
  if(r.ok){ accountUI.session = r.session; renderAccount(); syncEdge("sign-in"); }
  else toast(t("account.err." + (r.reason === "offline" ? "offline" : "network")));
}

async function onAccountSendCode(email){
  const gate = canSendCode(email, accountUI.lastSentAt, Date.now());
  if(!gate.ok){
    if(gate.reason === "invalid-email") toast(t("account.err.badEmail"));
    // cooldown: silent by design. The resend button (code phase) shows the
    // countdown itself. The email form (idle phase) has no such readout, but
    // sign-out clears lastSentAt, so the only way to reach it with a live
    // cooldown is "Use a different email" right after a send — an edge case
    // we accept staying quiet on rather than surfacing a toast for.
    return;
  }
  const r = await sendCode(String(email).trim());
  if(!r.ok){ toast(t("account.err." + (r.reason === "offline" ? "offline" : "network"))); return; }
  accountUI.email = String(email).trim();
  accountUI.verifyType = r.verifyType;
  accountUI.lastSentAt = Date.now();
  accountUI.phase = "code";
  toast(t("account.codeSent"));
  renderAccount();
}

async function onAccountVerify(code){
  if(!codeLooksValid(code)){ toast(t("account.err.badCode")); return; }
  const r = await verifyCode(accountUI.email, String(code).trim(), accountUI.verifyType, getLocale(),
    playerProfile.displayName || undefined);
  if(!r.ok){
    toast(t("account.err." + (r.reason === "bad-code" ? "badCode" : r.reason === "offline" ? "offline" : "network")));
    return;
  }
  accountUI.session = r.session;
  accountUI.phase = "idle";
  toast(t("account.signedIn"));
  renderAccount();
  syncEdge("sign-in");
}

async function onAccountSignOut(){
  await signOut();
  accountUI.session = null;
  accountUI.phase = "idle";
  accountUI.email = "";
  accountUI.lastSentAt = 0;
  accountUI.confirmingDelete = false;
  toast(t("account.signedOut"));
  renderAccount();
}

function renderDeleteAccount(p){
  if(!accountUI.confirmingDelete){
    // First tap arms the confirm; the destructive action is never one click.
    const b = accountBtn(t("account.delete"), ()=>{ accountUI.confirmingDelete = true; renderAccount(); });
    b.classList.add("account-danger");
    p.appendChild(b);
    return;
  }
  const warn = document.createElement("p");
  warn.className = "account-explain";
  warn.textContent = t("account.deleteConfirm");
  p.appendChild(warn);
  const yes = accountBtn(t("account.deleteConfirmYes"), onAccountDelete);
  yes.classList.add("account-danger");
  p.appendChild(yes);
  p.appendChild(accountBtn(t("account.deleteCancel"), ()=>{ accountUI.confirmingDelete = false; renderAccount(); }));
}

async function onAccountDelete(){
  // accountBtn() already disables the button for the in-flight call.
  const r = await deleteAccount();
  if(!r.ok){ toast(t("account.deleteFail")); return; }
  // Cloud gone; drop to local/guest. Local nbhsk.* progress is intentionally kept.
  accountUI.session = null;
  accountUI.phase = "idle";
  accountUI.email = "";
  accountUI.lastSentAt = 0;
  accountUI.confirmingDelete = false;
  toast(t("account.deleteDone"));
  renderAccount();
}

async function onRestorePurchases(){
  const r = await provider().restore();
  if(!r.ok){ toast(t("iap.restoreFailed")); return; }
  ent = restoreFrom(ent, r.ownedProductIds);
  store.set("ent", ent);
  toast(isSupporter(ent) ? t("iap.restored") : t("iap.nothingToRestore"));
  renderAccount();
}

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
  const smart = smartDeck(masteryStore, pool, Date.now());
  if(startBtn) startBtn.textContent = smart.length >= 8
    ? t("home.startReview", { n: smart.length })
    : t("home.start");
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
    setPressed(b, b.dataset.wlang === lang));
  const lv = scope.levels[0] || 1;
  document.querySelectorAll("#welcome-level-chips .chip").forEach(b=>
    setPressed(b, Number(b.dataset.wlv) === lv));
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

/* ============================== audio (pre-recorded mp3 first, Web Speech fallback) ============================== */
// index.json lists which words have a bundled mp3; fetch fails silently on file://
// (keeping TTS-only), which is fine per the file:// constraint.
fetch("audio/index.json").then(r=>r.json()).then(ix=>initAudio(ix)).catch(()=>initAudio([]))
  // mp3Set fills in asynchronously here, AFTER the synchronous boot renderHome()
  // has already run with an empty set — refresh Home so the Tone Trainer entry
  // gate (which reads hasMp3) reflects real audio availability, not the default.
  .finally(()=>{ if(currentScreen === "home") renderHome(); });

// Mobile browsers block all audio (Web Audio, <audio>.play, speech synthesis)
// until the first real user gesture. Prime every path once on the first
// interaction so the word audio the game speaks on its own — and SFX fired
// from the rAF loop — actually play. Passive so it never delays the tap.
let audioUnlockInFlight = false;
function unlockAllAudio(){
  if(audioUnlockInFlight) return;
  audioUnlockInFlight = true;
  // Keep the gesture listeners until BOTH paths confirm success. Mobile
  // policies can reject the first attempt; the next real tap must retry
  // instead of leaving word audio/SFX silent for the rest of the session.
  Promise.all([unlockSfx(), unlockAudio()]).then(([sfxReady, wordReady])=>{
    if(!sfxReady || !wordReady) return;
    window.removeEventListener("pointerdown", unlockAllAudio, true);
    window.removeEventListener("touchend", unlockAllAudio, true);
    window.removeEventListener("click", unlockAllAudio, true);
  }).finally(()=>{ audioUnlockInFlight = false; });
}
window.addEventListener("pointerdown", unlockAllAudio, true);
window.addEventListener("touchend", unlockAllAudio, true);
window.addEventListener("click", unlockAllAudio, true);

/* ============================== UI-frame preload ============================== */
// Canvas sprites are lazy: sprite(name) starts the first load and renders the
// vector fallback until it arrives. Only tiny global 9-slice UI frames preload.
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
let streetSpriteRefresh = 0;
window.addEventListener("nbhsk:sprite-ready", ()=>{
  // Battle and Shop repaint continuously. Street is a static canvas, so its
  // initial vector fallback needs one coalesced redraw when lazy PNGs arrive.
  if(currentScreen !== "street" || streetSpriteRefresh) return;
  streetSpriteRefresh = requestAnimationFrame(()=>{
    streetSpriteRefresh = 0;
    if(currentScreen === "street") renderStreet();
  });
});
function updateNav(name){
  const nav = $("#bottom-nav");
  if(!nav) return;
  const visible = navVisibleOn(name);
  nav.style.display = visible ? "flex" : "none";
  const active = activeTabFor(name);
  nav.querySelectorAll(".nav-btn").forEach(b=>{
    const on = b.dataset.tab===active;
    b.classList.toggle("active", on);
    if(on) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
}
function show(name){
  if(activeDialog && !activeDialog.dialog.closest("#s-"+name)){
    closeDialog(activeDialog.dialog, false);
  }
  // A4: ANY route home mid-intro (learn Exit, Android hardware back via
  // initNative's goHome, future shortcuts) abandons the intro for good —
  // never hijack a later session, never re-show welcome. endBattle's own
  // intro completion runs before its show() calls, so this is a no-op there.
  if(name === "home" && introPhase){ introPhase = null; store.set("introDone", true); }
  currentScreen = name;
  // F4-iOS: battle is the only screen that ever needs a definite #app height
  // (see index.html's body.battle-on rule) — it never scrolls the document,
  // so a fixed 100dvh is safe there and nowhere else. show() is the single
  // choke point every screen switch passes through, so toggling here can't
  // leak the class onto another screen.
  document.body.classList.toggle("battle-on", name === "battle");
  document.querySelectorAll(".screen").forEach(el=>el.classList.remove("on"));
  $("#s-"+name).classList.add("on");
  updateNav(name);
  // All screens share the single document scroller (no per-screen scroll
  // container) — reset it on every switch so a scrolled-down previous
  // screen never leaks its position into the next one.
  window.scrollTo(0, 0);
  if(name==="home"){ renderHome(); }
  if(name==="street"){ renderStreet(); renderQuests(); }
}
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click", ()=>{
  const tab = b.dataset.go;
  if(tab==="scope"){ renderScope(); applyScopeView(); show("scope"); }
  else if(tab==="scope-learn"){ renderScope(); applyScopeView(); show("scope"); }
  else if(tab==="scores"){ renderScores(); show("scores"); }
  else if(tab==="progress"){ renderProgress(); show("progress"); }
  else if(tab==="shop"){
    // analytics (dark): store_open — fires once here (the shop-tab entry
    // point), not on the repeated in-place renderShop() re-renders that
    // follow a purchase/equip while already on the shop screen.
    analytics.track("store_open");
    shopViewedProducts.clear();   // fresh "shown once per open" window for product_view
    const fromProfile = currentScreen === "progress";
    const back = $("#shop-back");
    back.dataset.go = fromProfile ? "progress" : "home";
    back.setAttribute("data-i18n", fromProfile ? "common.backProfile" : "common.back");
    back.textContent = t(fromProfile ? "common.backProfile" : "common.back");
    renderShop(); show("shop");
  }
  else if(tab==="album"){ renderAlbum(); show("album"); }
  else if(tab==="tones"){ startToneRound(); show("tones"); }
  else if(tab==="account"){ accountUI.confirmingDelete = false; renderAccount(); show("account"); refreshAccountSession(); }
  else {
    if(tab==="home"){
      if(B.on){ endBattle(true); return; }   // banks partial round + shows home itself
      stopBattle();   // intro abandonment handled in show()
    }
    show(tab);
  }
}));

/* ============================== scope selector ============================== */
function renderScope(){
  const lvBox = $("#lv-chips");
  lvBox.innerHTML = "";
  for(let n=1;n<=6;n++){
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = "HSK"+n;
    setPressed(b, scope.levels.includes(n));
    b.onclick = ()=>{
      const i = scope.levels.indexOf(n);
      if(i>=0){ if(scope.levels.length>1) scope.levels.splice(i,1); }
      else scope.levels.push(n);
      scope.levels.sort();
      renderScope();
    };
    lvBox.appendChild(b);
  }
  setPressed($("#f-core"), scope.core);
  setPressed($("#f-new"), scope.newOnly);
  document.querySelectorAll("#topn-chips .chip").forEach(c=>setPressed(c, +c.dataset.n===scope.topN));
  document.querySelectorAll("#lang-chips .chip").forEach(c=>setPressed(c, c.dataset.lang===scope.lang));
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
    setPressed(c, on);
  });
  const lenInput = $("#len-custom");
  lenInput.hidden = !lenCustomOpen;
  if(lenCustomOpen && document.activeElement !== lenInput) lenInput.value = len;
  setIconLabel($("#go-battle"), "quest", t("scope.wordQuest", { n: len }));
  const savedCards = store.get("flashcards", null);
  const cardsKey = cardSessionKey(scopeKey(scope), len);
  const cardsLeft = savedCards?.key === cardsKey && Array.isArray(savedCards.deck)
    ? Math.max(0, savedCards.deck.length - (Number(savedCards.i) || 0)) : 0;
  setIconLabel($("#go-learn"), "cards", cardsLeft
    ? t("scope.cardsResume", { n: cardsLeft }) : t("scope.cards"));
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
    setPressed(c, c.dataset.view === scopeView));
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
  document.querySelectorAll("#ui-lang-chips .chip").forEach(c => setPressed(c, c.dataset.uilang === getLocale()));
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
$("#go-learn").onclick   = ()=>{ learnDeck = null; startLearn("home"); };

/* ============================== flashcards ============================== */
const fc = {deck:[], i:0, flipped:false, done:0, total:0, persist:false, key:""};
function persistCardSession(){
  if(fc.persist) store.set("flashcards", cardSessionSnapshot(fc, fc.key));
}
function startLearn(returnTo = "home"){
  const src = learnDeck && learnDeck.length ? learnDeck : pool;
  fc.returnTo = returnTo;   // screen to land on when the deck runs out
  fc.persist = !(learnDeck && learnDeck.length) && returnTo === "home";
  fc.key = cardSessionKey(scopeKey(scope), normalizeLen(scope.sessionLen));
  const restored = fc.persist
    ? restoreCardSession(store.get("flashcards", null), fc.key, BY_HANZI)
    : null;
  const session = restored || newCardSession(src, fc.persist ? normalizeLen(scope.sessionLen) : Math.min(400, src.length));
  fc.deck = session.deck; fc.i = session.i; fc.done = session.done; fc.total = session.total;
  fc.flipped = false;
  persistCardSession();
  show("learn");
  renderCard();
}
function endLearn(){
  if(fc.persist) store.set("flashcards", null);
  if(introPhase === "learn"){
    // A4: warm-up done — straight into a short battle over the same 6 words
    // (normal rules, standard distractors; no fake difficulty).
    introPhase = "battle";
    battleDeckOverride = introWords.slice();
    startBattle("round");
    return;
  }
  show(fc.returnTo || "home");
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
    const ex = exampleFor(w, EXAMPLES, getLocale());
    const exampleRow = ex ? `<div class="fc-example">
        <div class="fc-example-label">${t("fc.inSentence")}</div>
        <div class="fc-example-cn">${ex.cn}</div>
        <div class="fc-example-tr">${ex.tr}</div>
        <button class="spk" id="fc-example-spk" type="button" data-i18n-title="common.playAudio" aria-label="Play audio"><svg class="asset-icon"><use href="assets/ui-icons.svg#sound"></use></svg></button>
      </div>` : "";
    c.innerHTML = `<button class="wd-info" id="fc-info" type="button" data-i18n-title="wd.info" aria-label="Word detail">ⓘ</button>
      <div class="hz" style="font-size:40px">${w.h}</div><div class="py">${w.p}</div>
      <div class="mean">${w.e}${th}</div>${exampleRow}<div class="hint">${t("learn.hintBack")}</div>`;
    $("#fc-info").onclick = e=>{ e.stopPropagation(); wordDetail.open(w); };
    if(ex){
      $("#fc-example-spk").onclick = e=>{ e.stopPropagation(); speak(ex.cn); };
    }
  }
  c.setAttribute("aria-pressed", String(fc.flipped));
  $("#fc-again").disabled = !fc.flipped;
  $("#fc-know").disabled = !fc.flipped;
}
$("#fc-card").onclick = ()=>{ fc.flipped = !fc.flipped; renderCard(); };
$("#fc-spk").onclick = e=>{ e.stopPropagation(); const w=fc.deck[fc.i]; if(w) speak(w.h); };
function nextCard(keep){
  if(!fc.flipped) return;
  const w = fc.deck[fc.i];
  noteAnswer(w.h, !keep);        // "know it" (keep=false) = correct; "still learning" = incorrect
  if(keep) fc.deck.push(w);      // still learning → resurfaces at the end
  else { fc.done++; noteDaily(1); questEvent("learn"); addXp(1); }   // "know it" counts toward the daily goal, one tap at a time
  fc.i++; fc.flipped = false;
  persistCardSession();
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
  // Seed from the all-time best (audit v55 F1a) rather than 0, so the
  // persistent line and the reveal line both read as "best streak ever",
  // live-updated via the same Math.max in answerTone below — not "best
  // streak this round". "tonesBest" is local-only (not in merge.js SYNC_KEYS).
  TG.i = 0; TG.score = 0; TG.streak = 0; TG.bestStreak = Number(store.get("tonesBest", 0)) || 0;
  TG.q = null; TG.locked = false; TG.ended = false;
  renderTonesBest();
  nextToneQuestion();
}
// Persistent "best streak" line (audit v55 F1a) — visible below the tone
// grid throughout play, not just on the round-done reveal. Hidden entirely
// at 0 (cleaner than announcing "Best streak: 0" on a brand-new profile).
function renderTonesBest(){
  const el = $("#tones-best");
  if(!el) return;
  if(TG.bestStreak > 0){
    el.textContent = t("tones.bestStreak", { n: TG.bestStreak });
    el.style.display = "";
  } else {
    el.textContent = "";
    el.style.display = "none";
  }
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
// Mandarin tone pitch-contours drawn in a 44×30 box (Chao 5-level shape):
// 1 high-level, 2 rising, 3 low-dipping, 4 falling.
const TONE_CURVE = {
  1: "M4,7 H40",
  2: "M5,24 L39,6",
  3: "M5,11 L17,25 L39,5",
  4: "M5,5 L39,24",
};
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
    // number + pitch-contour glyph (level / rising / dipping / falling) — a
    // clearer read than the tiny spacing tone marks it replaces.
    b.innerHTML = `<span class="tone-num">${t("tones.tone"+k)}</span>` +
      `<svg class="tone-curve" viewBox="0 0 44 30" aria-hidden="true">` +
      `<path d="${TONE_CURVE[k]}" fill="none" stroke="currentColor" stroke-width="3.4" ` +
      `stroke-linecap="round" stroke-linejoin="round"/></svg>`;
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
  renderTonesBest();
  const reveal = $("#tones-reveal");
  if(reveal) reveal.innerHTML = `<div class="boss-prompt"><span class="hz">${q.word.h}</span><span class="py">${q.word.p}</span></div>`;
  // Guard the deferred advance only (not nextToneQuestion itself, which the
  // very first call needs to run while currentScreen is still "home" — see
  // the [data-go] "tones" route): without this, tapping Home during the
  // reveal window lets the timer fire nextToneQuestion() on the hidden
  // screen, playing audio over Home (and crediting rewards early on the
  // last question). But if the answer just graded WAS the last question
  // (TG.i >= TG.len, the same check nextToneQuestion would make), tapping
  // Home must still credit the round's coins/XP — endToneRound only touches
  // the hidden #tones-* DOM and is idempotent (TG.ended), so it's safe to
  // run off-screen; startToneRound resets that DOM on re-entry.
  TG.advanceTimer = setTimeout(()=>{
    TG.advanceTimer = null;
    if(currentScreen === "tones") nextToneQuestion();
    else if(TG.i >= TG.len) endToneRound();
  }, fxDuration(900));
}
// Light rewards (design spec §3): +1 coin and +1 XP per correct answer,
// counted toward the daily streak — deliberately NOT recordAnswer/mastery.
function endToneRound(){
  if(TG.ended) return;   // idempotent — rewards must credit exactly once per round
  TG.ended = true;
  clearTimeout(TG.advanceTimer); TG.advanceTimer = null;
  // Persist the all-time best streak (audit v55 F1a) — TG.bestStreak is
  // already the live max (seeded from store + Math.max'd in answerTone), so
  // this Math.max is just a safety floor against a concurrent write.
  store.set("tonesBest", Math.max(Number(store.get("tonesBest", 0)) || 0, TG.bestStreak));
  const box = $("#tones-options");
  if(box) box.innerHTML = "";
  const prog = $("#tones-progress");
  if(prog) prog.textContent = "";
  // Hide the persistent best-streak line (audit v55 F1a) while the reveal is
  // up — the reveal's own streakLine below already states the same number;
  // startToneRound's renderTonesBest() call brings it back for the next round.
  const bestLine = $("#tones-best");
  if(bestLine) bestLine.style.display = "none";
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
/* Lucky-cat pattern: a friendly review guide approaches from the right.
   Correct answers light the trail; missed words return through the Review Pouch. */
const cv = $("#cv"), ctx = cv.getContext("2d");
const B = {on:false};
function updateCanvasA11y(word, format = "meaning", revealed = false){
  if(!cv || !word) return;
  let key = "battle.canvasHidden";
  const params = { h:word.h, p:word.p };
  if(revealed) key = "battle.canvasRevealed";
  else if(format === "meaning") key = "battle.canvasWord";
  else if(format === "listen") key = "battle.canvasListen";
  else if(format === "tone" || format === "typed") key = "battle.canvasHanzi";
  const label = t(key, params);
  cv.setAttribute("aria-label", label);
  cv.title = label;
}
function trailView(){
  // 2026-07-17 (owner): the battle scene is static. The cat holds its
  // start-of-trail position and the lantern path is not drawn (see draw()).
  // Pinning learned=0 keeps catX at startX so the cat never drifts under the
  // centred word plate as words are learned, while the raccoon (guideTargetX)
  // still approaches that fixed point — its walk-in is the answer timer.
  return lanternTrailLayout(B.w || 0, B.h || 0, 0, B.L ? B.L.ground : 0, { startNextSegment: false });
}
function guideTargetX(){
  return trailView().catX + (B.L ? B.L.catHalf : 0);
}
function renderedTrailCatX(now){
  const target = trailView().catX;
  if(!B.trailMove || REDUCED_MOTION) return target;
  const elapsed = now - B.trailMove.at;
  const x = trailMoveX(B.trailMove.from, B.trailMove.to, elapsed);
  if(elapsed >= 480) B.trailMove = null;
  return x;
}
function refreshGuideSpeed(){
  if(!B.speedBase || !B.w || !B.L) return;
  const spawnX = B.w + 30;
  const baselineTarget = B.L.mascotX + B.L.catHalf;
  const scale = lanternApproachScale(spawnX, guideTargetX(), baselineTarget);
  B.speed = B.speedBase * (B.w/380) * scale;
}
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
  refreshGuideSpeed();
}
const cvRO = new ResizeObserver(()=>{ if(B.on) sizeCanvas(); });
cvRO.observe(cv);
window.addEventListener("resize", ()=>{ if(B.on) sizeCanvas(); });
// F4-iOS: Safari can resize the visual viewport (e.g. the URL bar
// showing/hiding, or the keyboard) without firing a matching window
// "resize" — visualViewport's own resize event is the belt-and-braces catch
// for that case. Same guard as the listener above; harmless no-op when
// visualViewport isn't supported.
window.visualViewport?.addEventListener("resize", ()=>{ if(B.on) sizeCanvas(); });

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
  if(B.paused) return;
  if(B.zombie){
    if(!canReplayAudio(B.zombie)) return;
    speak(B.zombie.w.h);
  }else if(B.reveal){
    // T6: word already resolved (B.zombie gone) but still in its reveal
    // window — the speaker badge on the persistent plate keeps working.
    speak(B.reveal.w.h);
  }
}
// T6: during the reveal window (word resolved, next spawn pending) any tap
// outside the speaker's hit box means "move on" — fast-forward straight to
// the next word instead of waiting out the rest of REVEAL_MS.
function inRevealWindow(now){ return !B.zombie && !!B.reveal && B.nextAt > now; }
cv.addEventListener("click", e=>{
  const box = cv.getBoundingClientRect();
  const x = e.clientX - box.left, y = e.clientY - box.top;
  // T4: speaker badge hit-tests BEFORE the whole-card plaque rect (it sits
  // inside plaqueRect's bounds) — same action today (replay), but the
  // ordering matters now that tap-to-skip (T6) lands on the card elsewhere.
  const sr = B.speakerRect;
  if(sr && x>=sr.x && x<=sr.x+sr.w && y>=sr.y && y<=sr.y+sr.h){ replayCurrentWord(); return; }
  const now = performance.now();
  if(inRevealWindow(now)){ B.nextAt = now; return; }   // T6: tap-to-skip — plate + recap strip are both on-canvas, so this single check covers either
  const r = B.plaqueRect;
  if(!r) return;
  if(x>=r.x && x<=r.x+r.w && y>=r.y && y<=r.y+r.h) replayCurrentWord();
});
cv.addEventListener("keydown", e=>{
  if(e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
  if(B.paused) return;   // overlay is up — same guard as replayCurrentWord/answer
  e.preventDefault();
  const now = performance.now();
  if(inRevealWindow(now)){ B.nextAt = now; return; }   // T6: keyboard tap-to-skip
  replayCurrentWord();
});
// Pointer cursor over the plaque only (2026-07-11 audit F6, whole-card replay
// surface) — the rest of the canvas isn't interactive, so a canvas-wide
// pointer cursor would be a false affordance. T6: the reveal-window plate is
// also a tap-to-skip surface, so it gets the same affordance.
cv.addEventListener("mousemove", e=>{
  const r = B.plaqueRect;
  const tappable = canReplayAudio(B.zombie) || inRevealWindow(performance.now());
  if(!r || !tappable){ cv.style.cursor = ""; return; }
  const box = cv.getBoundingClientRect();
  const x = e.clientX - box.left, y = e.clientY - box.top;
  const over = x>=r.x && x<=r.x+r.w && y>=r.y && y<=r.y+r.h;
  cv.style.cursor = over ? "pointer" : "";
});

function startBattle(mode){
  if(B.on) return;   // re-entrancy guard: a double-tapped start button must not schedule a second rAF loop
  lastMode = mode;
  B.on = true; B.mode = mode;
  // A custom review deck can be as small as 2; distractors fall back to the
  // full pool for small decks, so 2 is safe.
  B.deck = (battleDeckOverride && battleDeckOverride.length >= 2) ? battleDeckOverride : pool;
  // miss/weak-word decks are a small custom slice of the pool, not a real round —
  // endBattle() must not let them set high scores or earn the perfect bonus.
  B.customDeck = !!(battleDeckOverride && battleDeckOverride.length >= 2);
  battleDeckOverride = null;
  B.smartRound = B.customDeck && smartDeckNext;   // full-rules smart review (owner: perfect bonus yes, best-score no)
  smartDeckNext = false;
  B.zombie = null; B.proj = null; B.parts = []; B.feedback = null;
  B.hitFlash = null; B.plaqueHitAt = 0; B.trailMove = null;
  B.reveal = null;   // T6: resolved-word snapshot for the persistent reveal-window plate/strip
  B.bossDefeated = false;   // session fact for the first-boss sticker (B2)
  B.floats = []; B.mascotHopUntil = 0;
  B.score = 0; B.combo = 0;
  const exhaustiveSource = B.customDeck || introPhase === "battle";
  B.quest = createQuestSession({
    mode,
    target: mode === "round" ? normalizeLen(scope.sessionLen) : Infinity,
    deck: B.deck,
    source: exhaustiveSource ? "exhaustive" : "weighted",
    masteryStore,
  });
  B.wordsTotal = B.quest.view().target;
  B.spawned = 0; B.resolved = 0; B.correct = 0; B.attempts = 0;
  B.recent = []; B.misses = []; B.missSet = new Set();
  B.nextAt = 0; B.lastT = 0; B.locked = false; B.bossStageAt = 0;
  B.paused = false; B.pausedAt = 0;
  closeDialog($("#pause-overlay"), false);
  closeDialog($("#format-intro"), false);   // a quit mid soft-intro must not carry it into the next battle
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
  showQuestFeedback("choose");
  $("#opts").innerHTML = "";
  requestAnimationFrame(loop);
}
function stopBattle(){
  B.on = false; keepAwake(false);
  closeDialog($("#pause-overlay"), false);
  closeDialog($("#format-intro"), false);
  if(window.speechSynthesis) speechSynthesis.cancel();
}
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
const analyticsToggle = document.getElementById("analytics-consent");
if (analyticsToggle) {
  // Analytics consent UI ships DARK: the toggle stays hidden until the R3
  // legal gate clears (published privacy policy + Play Data Safety answers).
  // The transport is already a hard no-op without consent; hiding the toggle
  // removes the only surface that could grant it. Un-dark: set
  // nbhsk.dev.analytics = true (then release with the legal docs published).
  const analyticsRow = analyticsToggle.closest(".settings-row");
  if (!store.get("dev.analytics", false)) {
    if (analyticsRow) analyticsRow.style.display = "none";
  } else {
    analyticsToggle.checked = analytics.isEnabled(); // false by default
    analyticsToggle.addEventListener("change", () => {
      analytics.setConsent(analyticsToggle.checked);
    });
  }
}
// The quest HUD shows durable learning progress and the current review pouch.
// There are no lives: missed words return after a short spacing gap.
function updateHud(){
  if(!B.on) return;   // toggleSfx can fire from the More screen, outside battle
  const q = B.quest.view();
  $("#hud-review").textContent = t("battle.reviewPouch", { n: q.reviewPouch });
  const label = q.endless ? `${q.learned} · ∞` : `${q.learned}/${q.target}`;
  // Endless has no session length: roundProgress reads 0 by design (hud.js),
  // so the track would sit empty all session and read as broken — hide it
  // and let the "N · ∞" count carry the state. Idempotent per update.
  $("#hud-progress").querySelector(".hud-progress-track").style.display = q.endless ? "none" : "";
  $("#hud-progress-fill").style.width = (roundProgress(q.learned, q.target) * 100) + "%";
  $("#hud-progress-count").textContent = t("battle.learnedProgress", { label });
  updateComboStrip();
}
function showQuestFeedback(state, format = "meaning"){
  const rail = $("#quest-feedback");
  if(!rail) return;
  const feedback = questFeedbackFor(state, format);
  rail.textContent = t(feedback.key);
  rail.classList.toggle("feedback-correct", feedback.tone === "correct");
  rail.classList.toggle("feedback-review", feedback.tone === "review");
  rail.classList.toggle("feedback-challenge", feedback.tone === "challenge");
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
   B.hitFlash.until, B.plaqueHitAt, B.trailMove.at. */
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
// Volume sliders (T12): plain range inputs, bound once at boot; pauseBattle()
// just re-syncs their displayed value in case settings changed elsewhere
// (e.g. a future settings screen). Persisted the same way as every other
// settings.* field — assign, then store.set("settings", settings).
const pauseSfxVol = $("#pause-sfxvol"), pauseVoiceVol = $("#pause-voicevol");
function syncPauseSliders(){
  if(pauseSfxVol) pauseSfxVol.value = settings.sfxVol;
  if(pauseVoiceVol) pauseVoiceVol.value = settings.voiceVol;
}
if(pauseSfxVol) pauseSfxVol.oninput = ()=>{
  settings.sfxVol = clampVol(pauseSfxVol.value);
  setSfxVolume(settings.sfxVol);
  store.set("settings", settings);
};
if(pauseVoiceVol) pauseVoiceVol.oninput = ()=>{
  settings.voiceVol = clampVol(pauseVoiceVol.value);
  setVoiceVolume(settings.voiceVol);
  store.set("settings", settings);
};
function pauseBattle(){
  if(!B.on || B.paused) return;
  B.paused = true;
  B.pausedAt = performance.now();
  keepAwake(false);   // nothing moves while paused — let the screen sleep
  renderPauseToggles();
  syncPauseSliders();
  openDialog($("#pause-overlay"), $("#pause-resume"), resumeBattle);
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
  if(B.trailMove) B.trailMove.at += shift;
  B.paused = false;
  keepAwake(true);
  closeDialog($("#pause-overlay"));
}
// Auto-pause (never auto-resume) when the tab/app is backgrounded, so a word's
// timer can't silently expire while the player isn't looking.
document.addEventListener("visibilitychange", ()=>{
  if(document.hidden && B.on && !B.paused) pauseBattle();
  // retention pack: leaving the app re-syncs the Android streak-saver
  // reminder so it reflects today's freshest streak/goal state.
  if(document.hidden){
    const inf = streakInfo(daily, todayStr(), freezes);
    const plan = reminderPlan(inf, new Date().getHours());
    syncStreakReminder(plan,
      t("notify.streak.title", { n: inf.streak }),
      t("notify.streak.body", { remaining: Math.max(0, inf.goal - inf.todayResolved) }));
    syncReengageReminder(reengagePlan(inf),
      t("notify.comeback.title", { n: inf.streak }),
      t("notify.comeback.body", { n: inf.streak }));
    // midRound=B.on: a hide during a (paused) battle must not let a
    // monthly-dirty push redirect into reconcile — see pushDirty/syncEdge.
    pushEdge("hide");
    analytics.track("session_complete", { duration_bucket: durationBucket(Date.now() - analyticsSessionStart) });
  }
  if(!document.hidden) syncEdge("foreground");
});
window.addEventListener("online", ()=>{ analytics.flush(); syncEdge("online"); });
$("#hud-pause").onclick = ()=> pauseBattle();
$("#pause-resume").onclick = ()=> resumeBattle();
$("#pause-quit").onclick = ()=>{ closeDialog($("#pause-overlay"), false); endBattle(true); };
function syncQuestOutcome(correct, timedOut=false){
  const result = B.quest.resolve({ correct, timedOut });
  const q = B.quest.view();
  B.resolved = q.learned;
  B.correct = q.correctAttempts;
  B.attempts = q.attempts;
  B.reviewed = q.reviewed;
  B.misses = q.missedWords.slice();
  B.missSet = new Set(B.misses.map(w => w.h));
  return result;
}
function spawnZombie(){
  const encounter = B.quest.next();
  if(!encounter) return false;
  const w = encounter.word;
  B.reveal = null;   // T6: new word incoming — drop the previous word's reveal-window snapshot
  const learnedAtStart = B.quest.view().learned;
  B.zombie = {
    w, encounter, x:B.w+30, state:"walk",
    trailSegmentStart: learnedAtStart > 0 && learnedAtStart % 5 === 0,
    // Snapshot SRS due status *before* this encounter's answer can mutate the
    // mastery record (recordAnswer always rewrites `ls`, so a due check made
    // later — inside answer()'s correct branch — would always read false).
    // Used to fire analytics' delayed_recall on a successful spaced recall.
    dueAtSpawn: isDue(masteryStore[w.h], Date.now()),
  };
  B.spawned++; B.locked = false;
  if(encounter.reviewChallenge){
    B.zombie.boss = true; B.zombie.stage = "meaning";
    sfx.combo(5);   // boss-arrival sting
  }
  const z = B.zombie;
  // v6 ladder: per-word format from the mastery streak. Bosses keep their own
  // two-stage ritual and the A4 intro quest stays meaning-only.
  z.format = (z.boss || introPhase === "battle") ? "meaning"
    : formatFor(w, masteryStore[w.h], { audio: audioAvailable(w.h), cloze: x => x.h in CLOZE });
  // v6 soft-intro: the first-ever appearance of a format freezes the walker
  // while the guide explains it in one line.
  const introKey = FORMATS[z.format].intro;
  if(introKey && !formatIntros[z.format]){
    z.frozen = true; z.introFree = true;
    showFormatIntro(introKey);
  }
  const pol = FORMATS[z.format].audio;
  // during an intro the audio waits for dismiss (played in showFormatIntro's OK)
  if(!z.frozen && (pol === "always" || (pol === "setting" && settings.autoSpeak))) speak(w.h);
  renderQuestion(w, z.format, z.format === "reverse" ? "battle.reversePrompt" : null);
  showQuestFeedback(encounter.reviewChallenge ? "challenge" : "choose", z.format);
  updateHud();   // round capsule tracks B.spawned — refresh as each word enters
  // per-word ramp on the unscaled base, then re-derive the screen-scaled
  // speed (a plain B.speed *= 1.03 would be wiped by the next resize)
  if(encounter.origin === "fresh") B.speedBase *= 1.03;
  refreshGuideSpeed();
  return true;
}
// v6p2: typed questions slow the walker — recall under pressure, not panic.
const TYPED_WALK_FACTOR = 0.4;
// v6p3: cloze is tap-answer but demands reading time — gentler than typed.
const CLOZE_WALK_FACTOR = 0.6;
// Kill "happy"/dying window: long enough for the 4-frame raccoon-happy bow
// (80ms/frame = 320ms cycle) to finish while the kill feedback stamp fades
// behind it (see draw()'s F7-style behind-the-raccoon ordering). killZombie's
// B.dyingUntil deadline and the hp-bar lerp below must both use this same
// constant or the hp bar and the actual dying window fall out of sync.
const DYING_MS = 400;
// Owner-tuned reveal window (Jordan, 2026-07-11): total time from an answer's
// resolution (kill / wrong tap / timeout) to the next word spawning, so the
// locked green/red options have long enough on screen to sink in before
// they're replaced. Every post-resolution scheduleNext() delay derives from
// this so all three paths land on the same ~2s total.
const REVEAL_MS = 2000;
// Wrong-tap hop window: the walker's brief backward flinch (z.state="wrong")
// — also the wrong-feedback stamp's fade duration (fxUntil at the wrong
// branch and drawFeedbackLayer's total). Shared so they read as one beat.
const WRONG_MS = 560;
// Append the 4 option buttons for a plain-data option list. Shared by every
// tap-answer format (the cloze branch and the generic branch both call it).
// #4 tone signal: a compact per-syllable number + pitch-contour glyph, reusing
// the Tone Trainer's TONE_CURVE. Stroke is currentColor so it stays legible when
// the button flips to the cream-on-green/coral good/bad states. Neutral syllables
// (tone 0) show a subtle dot, no contour.
function toneSigHtml(tones){
  const items = (tones || []).map(k => k > 0
    ? `<span class="tsig-i"><span class="tsig-n">${k}</span>` +
      `<svg class="tsig-c" viewBox="0 0 44 30" aria-hidden="true">` +
      `<path d="${TONE_CURVE[k]}" fill="none" stroke="currentColor" stroke-width="3.6" ` +
      `stroke-linecap="round" stroke-linejoin="round"/></svg></span>`
    : `<span class="tsig-i tsig-neutral">·</span>`).join("");
  return `<span class="tone-sig" aria-hidden="true">${items}</span>`;
}
function renderOptionButtons(box, opts){
  for(const o of opts){
    const b = document.createElement("button");
    // Label wrapped in its own span (not just a bare text node) so short
    // viewports can -webkit-line-clamp it specifically — an ellipsis on the
    // primary answer only, never a silent symmetric crop across label+sub.
    b.innerHTML = `<span class="opt-label">${o.label}</span>` + (o.sub? `<span class="th">${o.sub}</span>`:"")
      + (o.tones ? toneSigHtml(o.tones) : "");
    if(o.tones) b.classList.add("has-tonesig");
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
  // Stable DOM state for accessibility tooling and release probes. Classes
  // are reserved for visual layout; this attribute names every active format
  // (including formats that do not need special CSS).
  $("#s-battle").dataset.format = format;
  updateCanvasA11y(word, format, false);
  // F9: the listen format's extra full-width replay row can overflow the
  // .cv-wrap min-height floor on short viewports — this class lets CSS
  // shrink that floor exactly (and only) while a listen question is live.
  $("#s-battle").classList.toggle("listen-fmt", format === "listen");
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
  // small custom decks (miss/weak-word review) can be meaning-homogeneous —
  // pass the full scoped pool as the widening source for distractors.
  renderOptionButtons(box, FORMATS[format].buildOptions(word, deck, scope.lang, Math.random, pool, getLocale() === "th"));
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
  openDialog($("#format-intro"), $("#fi-ok"), null);
  $("#fi-ok").onclick = ()=>{
    closeDialog($("#format-intro"));
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
  const rewardPolicy = questRewardPolicy(z.encounter?.origin);
  const correct = !!o.correct;
  if(!boss) noteAnswer(z.w.h, correct);
  if(correct && boss && z.stage === "meaning"){
    // stage 1 passed: no kill yet, advance to the reverse (hanzi) question.
    // Freeze the walk (not the render state, so the sprite keeps animating)
    // so the brief pause can't cost a free bite.
    z.frozen = true;
    btn.classList.add("good");
    lockOptions();
    // Deadline checked in loop() rather than a raw setTimeout, so a pause
    // mid-transition doesn't fire it behind the overlay — resumeBattle()
    // shifts it forward like every other absolute performance.now() deadline.
    B.bossStageAt = performance.now() + 500;
    showQuestFeedback("choose");
    updateHud();
    return true;
  }
  // Every other branch below is a final resolution of this word (correct kill,
  // wrong tap, or — via bite() — a timeout): unmask the plaque's hanzi/pinyin
  // from here on (drawWordPlate reads z.revealed, not the answer state).
  z.revealed = true;
  updateCanvasA11y(z.w, z.format, true);
  if(correct){
    const trailBefore = trailView();
    const resolvedAt = performance.now();
    z.frozen = true;   // coin is in flight — don't let the walker cross the bite line first (race with killZombie)
    if(rewardPolicy.luckyFlow === "change") B.combo++;
    questEvent("correct");
    if(rewardPolicy.luckyFlow === "change") questEvent("combo", B.combo);
    if(boss) questEvent("boss");
    const killXp = boss ? 5 : 1;   // boss final kill is worth +5 total, not +1 then +5
    addXp(killXp);
    // farther kill = bigger bonus (replaces the old time bonus)
    const biteX = trailBefore.catX + B.L.catHalf;
    const distFrac = Math.max(0, z.x - biteX) / (B.w - biteX);
    if(rewardPolicy.awardsCoins){
      B.score += boss ? reviewChallengePoints(killPoints(B.combo, distFrac)) : killPoints(B.combo, distFrac);
    }
    sfx.kill(); hapticKill();
    if(rewardPolicy.luckyFlow === "change" && B.combo >= 3) sfx.combo(B.combo);
    btn.classList.add("good", "stamp", "stamp-good");
    lockOptions();
    // A gold lucky charm carries the successful recall from the cat to the
    // guide. The internal projectile field stays until the later cleanup.
    B.proj = {x:trailBefore.catX+16*B.S, y:B.h-B.L.ground-30*B.S};
    // (word audio fires once, on spawn — no replay on the answer tap)
    if(boss){ noteAnswer(z.w.h, true); B.bossDefeated = true; }   // both stages passed
    syncQuestOutcome(true, false);
    if(z.encounter?.origin === "review"){
      // analytics (dark): review_recovery — fires when a word that had been
      // missed this session (queued into the quest-session Review Pouch,
      // origin:"review") is now recalled correctly.
      analytics.track("review_recovery");
    }
    if(z.dueAtSpawn){
      // analytics (dark): delayed_recall — fires when a word whose SRS record
      // (srs.js isDue, snapshotted at spawn) was due is answered correctly —
      // a successful spaced recall after its interval elapsed.
      analytics.track("delayed_recall");
    }
    const trailAfter = trailView();
    B.trailMove = { from:trailBefore.catX, to:trailAfter.catX, at:resolvedAt };
    refreshGuideSpeed();
    const gy = B.h-B.L.ground;
    // boss final kill gets the reference's CRITICAL! starburst (A3); the
    // 10-combo milestone below may upgrade a normal kill to critical too.
    B.feedback = boss
      ? {...feedbackEffect("critical", z.x, gy-42*B.S), until:fxUntil(750)}
      : {...feedbackEffect("correct", z.x, gy-42*B.S), until:fxUntil(620)};
    B.plaqueHitAt = performance.now();   // plaque bounce timebase (drawWordPlate)
    const floater = rewardPolicy.luckyFlow === "change" ? comboFloater(z.x, gy-130, B.combo) : null;
    if(floater) B.floats.push(floater);
    // T10: "Correct!  +N XP" floater — N is the exact amount addXp() just
    // credited above (killXp), never an invented number. Sits a touch higher
    // than the combo floater so the two don't fully overlap when both show.
    B.floats.push({x:z.x, y:gy-160, text: t("battle.correct") + "  +" + killXp + " XP", life:0.9, vy:-60});
    // milestone combo (10, 20, ...): fireworks + a CRITICAL! comic burst
    // (fx-critical sprite + bold lettering, drawn in drawFeedbackLayer)
    // replaces the plain correct stamp for this kill.
    if(rewardPolicy.luckyFlow === "change" && B.combo>=10 && B.combo%10===0){
      B.parts.push(...fireworkRing(z.x, gy-16));
      B.feedback = {...feedbackEffect("critical", z.x, gy-42*B.S), until:fxUntil(750)};
    }
    showQuestFeedback("learned");
  }else{
    // A wrong tap reveals the answer, then returns the word to the review pouch.
    B.reveal = { w:z.w, boss:!!boss, format:z.format || "meaning", trailSegmentStart:!!z.trailSegmentStart };   // T6: reveal-window snapshot
    if(rewardPolicy.luckyFlow === "change") B.combo = 0;
    const free = !!z.introFree;   // first-ever attempt of a new format is gently introduced
    sfx.wrong(); if(!free) hapticWrong();
    btn.classList.add("bad", "stamp", "stamp-bad");
    lockOptions();
    revealCorrect();
    if(boss) noteAnswer(z.w.h, false);          // any miss fails the boss word
    syncQuestOutcome(false, false);
    z.state = "wrong";
    z.wrongUntil = performance.now() + WRONG_MS;
    B.feedback = {...feedbackEffect("wrong", z.x, B.h-B.L.ground-44*B.S), until:fxUntil(WRONG_MS)};
    showQuestFeedback("review");
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
  // T6: snapshot for the reveal window's persistent plate/strip — taken here
  // (not in answer()'s correct branch) because the word isn't actually
  // resolved until the coin lands and this fires; z itself goes away (state
  // "happy" -> scheduleNext nulls B.zombie) well before REVEAL_MS is up.
  B.reveal = { w:z.w, boss:!!z.boss, format:z.format || "meaning", trailSegmentStart:!!z.trailSegmentStart };
  const gy = B.h-B.L.ground;
  // The lucky charm arriving lights a quick warm glow behind the guide.
  B.hitFlash = {x:z.x, y:gy-40*B.S, until:fxUntil(150)};
  if(questRewardPolicy(z.encounter?.origin).awardsCoins){
    B.parts.push(...coinBurst(z.x, gy-16, !!z.boss, shopState.effect));
  }
  B.parts.push(...lanternSparkBurst(z.x, gy-16));
  z.state = "happy";
  z.happyAt = performance.now();
  B.dyingUntil = performance.now() + DYING_MS;
  B.proj = null;
  B.mascotHopUntil = performance.now()+400;   // little victory hop for the mascot
}
function bite(timedOut){
  const z = B.zombie;
  B.reveal = { w:z.w, boss:!!z.boss, format:z.format || "meaning", trailSegmentStart:!!z.trailSegmentStart };   // T6: reveal-window snapshot
  updateCanvasA11y(z.w, z.format, true);
  if(timedOut){
    // boss word already counted its one attempt on the first tap (see answer());
    // only count here if it timed out before ever being tapped.
    if(questRewardPolicy(z.encounter?.origin).luckyFlow === "change") B.combo = 0;
    noteAnswer(z.w.h, false); revealCorrect(); lockOptions();
    syncQuestOutcome(false, true);
    z.revealed = true;   // timeout resolves the word too — unmasks the plaque's hanzi/pinyin
    showQuestFeedback("review");
  }
  const free = !!(z && z.introFree);   // intro word timing out is also forgiven
  if(!free){ sfx.wrong(); hapticWrong(); }
  scheduleNext(REVEAL_MS);   // owner-tuned window to read the revealed answer
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
      showQuestFeedback("challenge");
      B.locked = false;
    }
  }
  // next word (or end of round) once the field is clear
  if(!B.zombie && now >= B.nextAt){
    if(!B.quest.view().complete){
      if(!spawnZombie()){ endBattle(false); return; }
    }else { endBattle(false); return; }
  }
  const z = B.zombie;
  if(z){
    if(z.state==="walk"){
      if(!z.frozen){
        z.x -= B.speed*(z.boss?reviewChallengeSpeedFactor:1)*(z.format==="typed"?TYPED_WALK_FACTOR:z.format==="cloze"?CLOZE_WALK_FACTOR:1)*dt;
        if(z.x <= guideTargetX()) bite(true);                    // time ran out — guide reached the cat
      }
    }else if(z.state==="dash"){
      z.x -= B.speed*7*dt;
      if(z.x <= guideTargetX()) bite(false);                    // legacy: never assigned, kept for safety
    }else if(z.state==="happy" && now >= B.dyingUntil){
      scheduleNext(REVEAL_MS - DYING_MS);   // kill → ~REVEAL_MS total before the next word
    }else if(z.state==="wrong"){
      z.x += 24*B.S*dt;
      if(now >= z.wrongUntil) scheduleNext(REVEAL_MS - WRONG_MS);   // wrong → same ~REVEAL_MS total
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
  const chapter = B.quest ? B.quest.view().chapter : 0;
  const selected = lanternTrailBackdrop(chapter, shopState.backdrop);
  const img = sprite(selected);
  if(img) drawCoverImage(ctx, img, 0, 0, B.w, B.h);
  else if(shopState.backdrop) paintBackdrop(ctx, B.w, B.h, gy, shopState.backdrop, performance.now());
  else paintBackdrop(ctx, B.w, B.h, gy, "", performance.now());
}
// T7: character scale tune (spec §4 — "scaled up by the tuned constant").
// Single knob for BOTH characters' base scale so cat/raccoon parity (T5's
// "both characters' CONTENT_H render at the same effective size") holds at
// any tuning: replaces the old bare 0.9 literal on each. 1.4 (the spec's
// stated ceiling) shipped as-is: a Playwright screenshot sweep at
  // 320x568/390x844/412x915 (idle spawn, mid-walk, and post-wrong-answer)
  // found no collisions at that value — no step-down to
// 1.3/1.25 needed (commit body has the screenshot-by-screenshot reasoning).
// Boss stays at CHAR_BASE*1.5 on top of this, unchanged.
const CHAR_SCALE = 1.4;
const CHAR_BASE = 0.9 * CHAR_SCALE;
function draw(now){
  ctx.clearRect(0,0,B.w,B.h);
  const gy = B.h - B.L.ground;
  drawBackdrop(gy);
  // T7/spec §4 last bullet: a single very-light warm wash under the ground
  // band ONLY (not the sky/scenery above) — grounds the bigger characters
  // without dulling the backdrop art. One flat fill, no gradient/blur.
  ctx.fillStyle = "rgba(46,42,36,.06)";
  ctx.fillRect(0, gy, B.w, B.h - gy);
  // ground line — subtle gold
  ctx.strokeStyle = "rgba(245,197,24,.35)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0,gy+12); ctx.lineTo(B.w,gy+12); ctx.stroke();
  // Lantern trail (path + nodes) intentionally not drawn — the scene is static
  // now (owner 2026-07-17). The cat and raccoon still render below.
  ctx.textAlign = "center";
  // player cat (left side, was the maneki) — shop skin + growth accessories +
  // kitten companion now live here instead of on the walker (M5 role swap).
  // "happy" during the post-kill victory hop, otherwise a walk-in-place idle
  // (drawCat has no dedicated idle state; "walk" just bobs/steps in place
  // since x never changes here).
  const hopping = B.mascotHopUntil && now < B.mascotHopUntil;   // little victory hop after a kill
  const playerState = hopping ? "happy" : "walk";
  const catScale = CHAR_BASE*B.L.mascotS;
  const catX = renderedTrailCatX(now), catY = gy + 6*B.S;
  drawCat(ctx, catX, catY, now, playerState, SKIN_PALETTES[shopState.skin], catScale, B.acc, false);
  // Companion follows the cat between lantern nodes and stays on-canvas.
  const kittenX = Math.max(16*B.L.mascotS + 2, catX - B.L.catHalf);
  if(B.hasKitten) drawCat(ctx, kittenX, gy + 6*B.S, now + 250, playerState, SKIN_PALETTES[shopState.skin], 0.5*B.L.mascotS, [], false);
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
    // T6: the recap strip belongs to the whole reveal window, not just the
    // B.zombie===null tail of it — z.revealed is true from the moment of
    // resolution (kill/wrong/timeout) through the "happy" dying window and
    // the "wrong" retreat hop, both of which keep z (and B.zombie) alive for
    // a few hundred ms before scheduleNext() nulls it. Draw it here too so it
    // doesn't pop in partway through (plate + strip visible the WHOLE window).
    if(z.revealed) drawRecapStrip(z.w, now);
    // The arriving lucky charm blooms into a warm lantern glow behind the
    // guide. It is drawn before the sprite so the character stays crisp.
    if(B.hitFlash){
      const leftF = B.hitFlash.until - performance.now();
      if(leftF <= 0){ B.hitFlash = null; }
      else{
        // expanding gold pulse, fading out — a fade, so reduced-motion-safe
        // (fxUntil already halved its duration there)
        ctx.save();
        ctx.globalAlpha = 0.85 * (leftF / fxDuration(150));
        ctx.fillStyle = "rgba(245,197,24,1)";
        const rr = (18 + 30 * (1 - leftF / fxDuration(150))) * B.S;
        ctx.beginPath(); ctx.arc(B.hitFlash.x, B.hitFlash.y, rr, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }
    }
    // Recall feedback stays behind the bowing guide so the illustration
    // remains readable throughout the reveal window.
    drawFeedbackLayer(now);
    // Friendly review guide: walks in with the prompt, then bows happily when
    // the learner recalls it. Review Challenges use the larger gold-aura
    // variant, without an HP bar or defeat framing.
    const rScale = CHAR_BASE * (z.boss ? 1.5 : 1) * B.L.mascotS;
    drawRaccoon(ctx, z.x, gy + 6*B.S, z.state === "happy" ? now - z.happyAt : now, z.state, rScale, !!z.boss);
  }else if(B.reveal && now < B.nextAt){
    // T6: the zombie object itself is gone by now (scheduleNext() nulls
    // B.zombie right at kill/wrong/timeout resolution — for a kill that's
    // after the short "happy" dying window, for wrong/timeout it's
    // immediate) but the ~2s reveal window (REVEAL_MS) isn't over yet. Keep
    // showing the resolved word — fully unmasked, vis is fixed rather than
    // derived from any live state — plus the recap strip underneath, so the
    // card no longer vanishes mid-reveal.
    const rz = { w: B.reveal.w, boss: B.reveal.boss, format: B.reveal.format };
    drawWordPlate(rz, { mask:false, icon:false, py:true }, now);
    drawRecapStrip(B.reveal.w, now);
    drawFeedbackLayer(now);
  }else{
    B.plaqueRect = null;   // no word on screen — the canvas click/keydown handlers no-op
    B.speakerRect = null;
    // A stamp can outlive the raccoon (word cleared, next spawn pending) —
    // still finish its fade here so it doesn't just vanish.
    drawFeedbackLayer(now);
  }
  // Successful recall charm: a warm gold orb travels from cat to guide.
  if(B.proj){
    const charmImg = sprite("vfx-orb-gold");
    const pc = B.L.coinPx * 1.55;
    if(charmImg){
      ctx.drawImage(charmImg, B.proj.x-pc/2, B.proj.y-pc/2, pc, pc);
    }else{
      const glow = ctx.createRadialGradient(B.proj.x,B.proj.y,1,B.proj.x,B.proj.y,pc*.6);
      glow.addColorStop(0,"#FFF4C0"); glow.addColorStop(.55,"#F2BC57"); glow.addColorStop(1,"rgba(242,188,87,0)");
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(B.proj.x,B.proj.y,pc*.6,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#FFF4C0"; drawStarMark(ctx, B.proj.x, B.proj.y, pc*.2);
    }
  }
  // Lantern sparks, reward bursts, and Lucky Flow fireworks.
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
    }else if(p.kind==="impact"){
      // Short sun-yellow/cream starbits read as lantern light arriving.
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life/0.35));
      ctx.fillStyle = p.vx >= 0 ? "#F2BC57" : "#FBF5E8";   // sun-yellow/cream split by the randomized fling direction
      drawStarMark(ctx, p.x, p.y, 3.4);
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
}
// z: the current walker (B.zombie) — carries the target word (z.w), boss
// flags, and z.revealed (set in answer()/bite() once the word is resolved,
// so masked/listen formats can unmask the hanzi/pinyin — no translation is
// ever drawn on the plaque; that lives on the choice buttons only).
// vis: { mask, icon, py } — what the format may reveal while live (see the
// call site in draw(), which derives it from FORMATS[z.format].plaque).
// Order per PRD §4.3/§6.2: pinyin (small, above) -> Hanzi (large).
// Small rounded speaker mark (T4 — supersedes the 2026-07-11 audit F6 removal;
// discoverability affordance beside the pinyin, distinct from the whole-card
// tap-to-replay surface which stays). cx/cy: badge center; r: badge radius,
// all in CSS px (canvas ctx is DPR-transformed — see sizeCanvas). Mirrors
// assets/ui-icons.svg#sound's cone+waves silhouette, hand-drawn for canvas.
function drawSpeakerBadge(cx, cy, r){
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.fillStyle = "#F2BC57";      // --lc-sun
  ctx.fill();
  ctx.lineWidth = Math.max(1, r*0.14);
  ctx.strokeStyle = "#2E2A24";    // --lc-ink
  ctx.stroke();
  const s = r * 0.09;             // scales a 24x24 glyph viewBox into the badge
  ctx.save();
  ctx.translate(cx - 12*s, cy - 12*s);
  ctx.fillStyle = "#2E2A24";
  ctx.beginPath();
  ctx.moveTo(4*s,14*s); ctx.lineTo(4*s,10*s); ctx.lineTo(8*s,10*s);
  ctx.lineTo(13*s,6*s); ctx.lineTo(13*s,18*s); ctx.lineTo(8*s,14*s);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#2E2A24";
  ctx.lineWidth = Math.max(1, 1.6*s);
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(16*s, 12*s, 4*s, -0.6, 0.6); ctx.stroke();
  ctx.beginPath(); ctx.arc(16*s, 12*s, 7*s, -0.7, 0.7); ctx.stroke();
  ctx.restore();
}
function drawWordPlate(z, vis, now){
  const w = z.w, boss = z.boss, level = w.lv;
  const format = z.format || "meaning";
  const hanzi = vis.mask ? "？？" : vis.icon ? "🔊" : w.h;
  // pinyin off when: the format hides it (reverse/listen/tone while live), OR the player toggled it off
  const pinyin = (!vis.py || !settings.showPinyin) ? "" : w.p;
  // T4: per-format instruction line, always shown, above the pinyin row.
  const instruction = t("battle.instruction." + format);

  // A3 plaque bounce: damped dip on a correct answer (juice.js curve; 0 when
  // idle or under reduced motion — no vertical motion, per "fades only").
  const bounce = (!REDUCED_MOTION && B.plaqueHitAt)
    ? plaqueBounce(performance.now() - B.plaqueHitAt) : 0;
  // Goal 2026-07-13: shrink the plate ~15% and lift it (0.36 -> 0.31) so the
  // recap strip below it clears the cat/raccoon on short-and-wide canvases.
  // CARD scales the chrome (padding/badge/min-widths/pinyin) down; the hanzi
  // glyph shrinks too but is floored at 56 CSS px so it never drops below the
  // PRD §6.1 legibility floor on narrow phones (where the width term binds).
  const CARD = 0.85;
  const wy = Math.round(B.h * 0.31) + Math.round(bounce);
  const T = B.L.textS * CARD;   // plaque metrics scale with the width-driven text scale
  const hzPx = Math.max(56, B.L.hanziPx * CARD);
  const pyPx = B.L.pinyinPx * CARD;
  ctx.save();
  ctx.font = fontString(700, hzPx, HANZI_STACK);
  const textW = Math.max(ctx.measureText(hanzi).width, 74*T);
  const spkR = 12*T;
  const instrPx = 13*T;
  // Width invariant: the card must be wide enough for every line it will ever
  // show — hanzi, pinyin, AND the instruction line — measured here EVERY call
  // regardless of reveal state, so it never resizes/jumps when revealed.
  let widestLine = 0;
  if(pinyin){
    ctx.font = fontString(600, pyPx, LATIN_STACK);
    widestLine = Math.max(widestLine, ctx.measureText(pinyin).width);
  }
  ctx.font = fontString(600, instrPx, LATIN_STACK);
  widestLine = Math.max(widestLine, ctx.measureText(instruction).width);
  ctx.font = fontString(700, hzPx, HANZI_STACK); // restore: hanzi font, as measured above
  const lw = Math.min(B.w - 24*T, Math.max(textW + 56*T + spkR*2.2, widestLine + 24*T));
  // Stacked rows, top to bottom: instruction -> pinyin (if shown) -> Hanzi.
  // No translation row — English/Thai live on the choice buttons only.
  const padV = 10*T;
  const instrH = 16*T;
  const pinyinH = pinyin ? 22*T : 0;
  const hanziH = hzPx * 1.05;
  const lh = padV*2 + instrH + pinyinH + hanziH;
  const x = B.w/2 - lw/2, y = wy - lh/2;
  const plaqueImg = sprite("ui-word-plaque");
  if(plaqueImg){
    // 9-slice so the gold rim + notched frame stay crisp at any plaque size
    const di = Math.min(20*T, lw/3, lh/3);
    for(const r of nineSliceRects(560, 320, 48, x, y, lw, lh, di)){
      ctx.drawImage(plaqueImg, r.sx, r.sy, r.sw, r.sh, r.dx, r.dy, r.dw, r.dh);
    }
  }else{
    // T4: vector fallback — matte cream paper + ONE warm-brown hairline
    // border + soft shadow. Dropped the double-border + corner ticks (lighter
    // frame per spec §3); the 9-slice sprite path above is a real asset and
    // is untouched.
    ctx.shadowColor = "rgba(60,40,20,.32)";
    ctx.shadowBlur = 12*T;
    ctx.shadowOffsetY = 4*T;
    const paper = ctx.createLinearGradient(0,y,0,y+lh);
    paper.addColorStop(0,"rgba(253,246,227,.97)");
    paper.addColorStop(1,"rgba(243,230,198,.97)");
    ctx.fillStyle = paper;
    roundRect(x,y,lw,lh,14*T); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = boss ? "#D8A93A" : "#B98F55";
    ctx.lineWidth = 1.4*T;
    roundRect(x+0.7*T,y+0.7*T,lw-1.4*T,lh-1.4*T,13*T); ctx.stroke();
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let cy = y + padV;
  const innerW = lw - 16*T; // defensive shrink budget: screen-width clamp can still leave a line too wide
  // instruction line (warm-brown, format-keyed) — always shown, above pinyin
  {
    let font = fontString(600, instrPx, LATIN_STACK);
    ctx.font = font;
    const iw = ctx.measureText(instruction).width;
    if(iw > innerW) ctx.font = fontString(600, instrPx * (innerW/iw), LATIN_STACK);
    ctx.fillStyle = "#846043";
    ctx.fillText(instruction, B.w/2, cy + instrH/2);
    cy += instrH;
  }
  if(pinyin){
    ctx.font = fontString(600, pyPx, LATIN_STACK);
    const pw = ctx.measureText(pinyin).width;
    if(pw > innerW) ctx.font = fontString(600, pyPx * (innerW/pw), LATIN_STACK);
    ctx.fillStyle = "#8C5F2A";
    ctx.fillText(pinyin, B.w/2, cy + pinyinH/2);
    // T4: speaker badge beside the pinyin, inside the card's right margin —
    // hit rect padded to >=44px CSS px regardless of the visual badge size;
    // inset guarantees the whole padded hit box stays inside the card.
    const hit = Math.max(44, spkR*2);
    const inset = Math.max(spkR + 10*T, hit/2 + 6*T);
    const bx = x + lw - inset, by = cy + pinyinH/2;
    drawSpeakerBadge(bx, by, spkR);
    B.speakerRect = { x: bx - hit/2, y: by - hit/2, w: hit, h: hit };
    cy += pinyinH;
  }else{
    B.speakerRect = null;
  }
  // #1/#2: the 🔊 icon and the fullwidth ？？ mask aren't centered within their
  // advance box (emoji ink overflows the row / rim; fullwidth ？ is left-weighted,
  // so a screen-centered anchor reads as shifted left). Shrink the icon to clear
  // the plaque rim, then re-anchor on the glyph's actual ink box. Real hanzi are
  // symmetric, so inkShift is ~0 and they are unaffected.
  const glyphPx = vis.icon ? hzPx * 0.72 : hzPx;
  ctx.font = fontString(700, glyphPx, HANZI_STACK);
  ctx.fillStyle = boss ? "#7A4E0C" : "#3A2E1D";
  const gm = ctx.measureText(hanzi);
  const inkShift = (gm.actualBoundingBoxLeft != null && gm.actualBoundingBoxRight != null)
    ? (gm.actualBoundingBoxRight - gm.actualBoundingBoxLeft) / 2 : 0;
  ctx.fillText(hanzi, B.w/2 - inkShift, cy + hanziH/2);
  cy += hanziH;
  ctx.textBaseline = "alphabetic";
  if(level){
    // dark-green level tag (reference TAG)
    ctx.font = fontString(700, 10*T, LATIN_STACK);
    const tagText = `HSK ${level}`;
    const tw = ctx.measureText(tagText).width + 12*T;
    const th = 16*T;
    ctx.fillStyle = "#2F6B4F";
    roundRect(x+8*T, y-th*.45, tw, th, th/2); ctx.fill();
    ctx.strokeStyle = "#1E4634";
    ctx.lineWidth = 1.2*T;
    roundRect(x+8*T, y-th*.45, tw, th, th/2); ctx.stroke();
    ctx.fillStyle = "#F2EDDE";
    ctx.textAlign = "left";
    ctx.fillText(tagText, x+14*T, y-th*.45 + th*.7);
  }
  B.plaqueRect = {x, y, w: lw, h: lh};
  ctx.restore();
}
// T6 recap strip (spec §7): small cream strip directly under the plate during
// the reveal window — `main · sub` (thai/english order follows the
// locale-primary meaning() call, same as the answer buttons), main only when
// sub is empty. Defensive font shrink mirrors the instruction-line pattern
// above (drawWordPlate) so a long English gloss can't blow past the canvas.
function drawRecapStrip(w, now){
  const r = B.plaqueRect;
  if(!r) return;
  const m = meaningOf(w, scope.lang);
  const T = B.L.textS;
  const padX = 16*T, padY = 8*T;
  const maxTextW = (B.w - 24*T) - padX*2;
  let fontPx = 15*T;
  const sep = m.sub ? " · " : "";
  ctx.save();
  ctx.font = fontString(600, fontPx, LATIN_STACK);
  let totalW = ctx.measureText(m.main).width + ctx.measureText(sep).width + ctx.measureText(m.sub || "").width;
  if(totalW > maxTextW && totalW > 0){
    fontPx *= maxTextW / totalW;
    ctx.font = fontString(600, fontPx, LATIN_STACK);
    totalW = ctx.measureText(m.main).width + ctx.measureText(sep).width + ctx.measureText(m.sub || "").width;
  }
  const sw = totalW + padX*2;
  const sh = fontPx*1.5 + padY*2;
  const sx = B.w/2 - sw/2;
  // Goal 2026-07-13 overlap fix: pin the strip under the plate, but clamp it
  // up so its bottom stays clear of the tallest character on screen. Both cat
  // and raccoon are bottom-anchored at (gy + 6*B.S) and draw CONTENT_H*scale
  // tall; bosses draw at CHAR_BASE*1.5, so the guard keys off whichever is
  // present. Bounded fallback: on a canvas too short to hold plate + strip +
  // character, the strip stays just under the plate rather than climbing over
  // it (prefers plate-attachment over a giant-boss edge case).
  let sy = r.y + r.h + 12*T;
  const bossOnScreen = !!(B.zombie?.boss || B.reveal?.boss);
  const charScale = CHAR_BASE * (bossOnScreen ? 1.5 : 1) * B.L.mascotS;
  const charTop = (B.h - B.L.ground + 6*B.S) - CONTENT_H*charScale;
  if(sy + sh + 6*T > charTop){
    sy = Math.max(r.y + r.h + 4*T, charTop - sh - 6*T);
  }
  ctx.fillStyle = "#FBF5E8";
  roundRect(sx, sy, sw, sh, sh/2); ctx.fill();
  ctx.strokeStyle = "#EAC796";
  ctx.lineWidth = 1.2*T;
  roundRect(sx+0.6*T, sy+0.6*T, sw-1.2*T, sh-1.2*T, sh/2-0.6*T); ctx.stroke();
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  let cx = sx + padX;
  const cy = sy + sh/2;
  ctx.fillStyle = "#2E2A24";
  ctx.fillText(m.main, cx, cy);
  cx += ctx.measureText(m.main).width;
  if(m.sub){
    ctx.fillStyle = "#846043";
    ctx.fillText(sep, cx, cy);
    cx += ctx.measureText(sep).width;
    ctx.fillText(m.sub, cx, cy);
  }
  ctx.restore();
}
function drawFeedbackLayer(now){
  const fb = B.feedback;
  if(!fb) return;
  const kind = fb.kind || fb.type;
  // fxDuration() mirrors the halving already applied to fb.until at creation
  // (fxUntil()) — total must track it 1:1 or the fade fraction below (p) goes
  // out of sync with reduced motion and the stamp appears to freeze/cut off.
  const total = fxDuration((kind === "critical" || kind === "streak") ? 750 : kind === "correct" ? 620 : WRONG_MS);
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
    ctx.strokeText(t("battle.critical"), 0, 0);
    ctx.fillStyle = "#7A4E0C";
    ctx.fillText(t("battle.critical"), 0, 0);
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
    // but silently — the sticker-slot toast queue waits for the next real
    // results screen. The monthly badge's floating toast() is a separate,
    // body-appended overlay (survives the show("home") swap below) — it
    // still fires here so the badge is announced wherever it actually lands,
    // even if that's a mid-round quit rather than a finished round.
    const quitFacts = {
      ...scopeFacts(D.levels, masteryStore),
      sessionDone: false,
      bossDefeated: !!B.bossDefeated,
      streak: streakInfo(daily, todayStr(), freezes).streak,
      monthlyDone: monthlyStatus(monthly, todayStr()).done,
    };
    const hadMonthlyBadgeQuit = !!stickerState.earned["ev:monthly-40"];
    stickerState = evaluateAwards(stickerState, STICKER_DEFS, quitFacts, todayStr());
    if(!hadMonthlyBadgeQuit && stickerState.earned["ev:monthly-40"]){
      // announced here once — drop the queued copy so the next results
      // screen's sticker slot doesn't announce it again
      toast(t("quest.monthly.badge"));
      stickerState = dropFromQueue(stickerState, "ev:monthly-40");
    }
    store.set("stickers", stickerState);
    show("home"); return;
  }
  const results = questResultsSummary(B.quest.view(), { score:B.score });
  noteDaily(results.learned);
  const isPerfect = B.mode==="round" && B.resolved>0 && B.misses.length===0 && (!B.customDeck || B.smartRound);
  if(isPerfect) questEvent("perfect");
  wallet += B.score;
  const bonus = isPerfect ? perfectBonus(B.score) : 0;
  if(bonus) wallet += bonus;
  store.set("wallet", wallet);
  updateWalletChip();
  $("#r-learned").textContent = t("results.learnedTarget", { learned:results.learned, target:results.target });
  $("#r-attempts").textContent = results.attempts;
  $("#r-accuracy").textContent = results.accuracy + "%";
  $("#r-lantern-count").textContent = results.lanternsLit;
  $("#r-chapter").textContent = t("results.chapter", { n:results.routeChapter });
  $("#r-next-review").textContent = t(results.nextReview === "practice"
    ? "results.nextReviewPractice"
    : "results.nextReviewTomorrow");
  const lanternRow = $("#r-lanterns");
  lanternRow.replaceChildren();
  for(let i=0;i<4;i++){
    const img = document.createElement("img");
    img.src = "assets/lantern.png";
    img.alt = i < results.chapterLanternsLit ? t("results.lanternAlt") : "";
    img.className = i < results.chapterLanternsLit ? "lit" : "unlit";
    lanternRow.appendChild(img);
  }
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
      ? t("results.levelUpUnlocked", { lv: to, items: hit.map(m=>tOr("milestone."+m.id, m.name)).join(", ") })
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
  const acc = results.accuracy;
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
    $("#r-sub").innerHTML = t("results.sub", { acc, words: results.learned, key });
  }else{
    const best = store.get("best", {});
    const prev = best[key]? best[key].score : 0;
    const isBest = B.score > prev;
    if(isBest){ best[key] = {score:B.score, date:new Date().toISOString().slice(0,10)}; store.set("best", best); }
    $("#r-sub").innerHTML = t("results.sub", { acc, words: results.learned, key })
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
    sp.className = "sp"; sp.setAttribute("aria-label", t("common.playAudio")); sp.replaceChildren(iconSvg("sound")); sp.onclick = ()=>speak(w.h);
    row.appendChild(sp);
    list.appendChild(row);
  }
  $("#r-review").style.display = B.misses.length? "block":"none";
  $("#r-review").onclick = ()=>{ learnDeck = B.misses.slice(); startLearn("results"); };
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
    streak: streakInfo(daily, todayStr(), freezes).streak,
    monthlyDone: monthlyStatus(monthly, todayStr()).done,
  };
  const hadMonthlyBadge = !!stickerState.earned["ev:monthly-40"];
  stickerState = evaluateAwards(stickerState, STICKER_DEFS, stickerFacts, todayStr());
  // retention pack: the monthly badge gets the floating toast() since it's
  // most likely to land right as the player finishes the quest that crossed
  // 40/40 — and ONLY the toast: the queued sticker copy is dropped so the
  // sticker slot below (and future results screens) won't repeat it.
  if(!hadMonthlyBadge && stickerState.earned["ev:monthly-40"]){
    toast(t("quest.monthly.badge"));
    stickerState = dropFromQueue(stickerState, "ev:monthly-40");
  }
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
  const skinBox = $("#shop-skins"), bdBox = $("#shop-backdrops"), fxBox = $("#shop-effects"), sndBox = $("#shop-sounds"), supBox = $("#shop-supplies"), decoBox = $("#shop-street");
  for(const b of [dailyBox, seasonBox, skinBox, bdBox, fxBox, sndBox, supBox, decoBox]) b.innerHTML = "";

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
    const box = item.type==="skin" ? skinBox : item.type==="backdrop" ? bdBox : item.type==="effect" ? fxBox : item.type==="soundpack" ? sndBox : item.type==="consumable" ? supBox : decoBox;
    box.appendChild(makeShopRow(item, today));
  }
  startShopPreviewLoop();
  renderIapSections();
}

// "Jul 1" / "1 ก.ค." for a [month, day] pair, in the active locale.
// The fixed 2026 year is inert: only month/day are rendered (see the
// { month: "short", day: "numeric" } options below), and there's no leap-day
// window in play, so the hardcoded year never affects the output.
const fmtMonthDay = ([m, d]) =>
  new Date(2026, m - 1, d).toLocaleDateString(getLocale() === "th" ? "th-TH" : "en-US", { month: "short", day: "numeric" });

// Counted consumables live outside shopState.owned; each id maps to its own
// counter so a future second consumable can never render the freeze count.
function consumableCount(item){ return item.id === "streak-freeze" ? freezes : 0; }

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
  const ownedCount = item.type === "consumable" ? `<small>${t("shop.owned-count", { n: consumableCount(item), cap: item.cap })}</small>` : "";
  const desc = item.type === "consumable" ? tOr("item." + item.id + ".desc", "") : "";
  const descHtml = desc ? `<small class="item-desc">${desc}</small>` : "";
  copy.innerHTML = `<b>${tOr("item."+item.id, item.name)}${stars}</b>${descHtml}<small>${t("shop.coins", { coins: item.price.toLocaleString() })}</small>${ownedCount}`;
  left.replaceChildren(preview, copy);
  const btn = document.createElement("button");
  const doBuy = () => {
    const r = buy(wallet, shopState, item.id, today);
    if(!r.ok) return;
    wallet = r.wallet; shopState = r.shop;
    store.set("wallet", wallet); store.set("shop", shopState);
    pushEdge("purchase");
    justBought = { id: item.id, at: performance.now() };
    // no renderStreet() here: the street canvas is display:none while the
    // shop screen is up (renderStreet would no-op) and show("street") always
    // re-renders on entry, so a bought deco appears the moment it can be seen.
    updateWalletChip(); renderShop();
  };
  if(item.type === "consumable"){
    // Counted, not owned (task-2 review carry-forward): never touches
    // shopState.owned/buy()/equipItem() — buyConsumable + nbhsk.freezes only.
    btn.className = "chip buy-chip";
    btn.textContent = t("shop.buy");
    const have = consumableCount(item);
    btn.disabled = have >= item.cap || wallet < item.price;
    btn.onclick = () => {
      const r = buyConsumable(item, wallet, consumableCount(item));
      if(!r.ok) return;
      wallet = r.wallet;
      if(item.id === "streak-freeze"){ freezes = r.count; store.set("freezes", freezes); }
      store.set("wallet", wallet);
      pushEdge("purchase");
      justBought = { id: item.id, at: performance.now() };
      updateWalletChip(); updateStreakChip(); renderShop();
    };
    // same double-tap re-arm guard as the deco branch below: the row
    // re-renders in place (still "Buy", possibly now disabled at cap) and a
    // fast second tap shouldn't land before the player sees the new state.
    if(justBought && justBought.id === item.id){
      const elapsed = performance.now() - justBought.at;
      if(elapsed < SHOP_REARM_MS){
        const wasDisabled = btn.disabled;
        btn.disabled = true;
        setTimeout(()=>{ btn.disabled = wasDisabled; }, SHOP_REARM_MS - elapsed);
      }
    }
  }else if(item.type === "deco"){
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
    // this row's buy button was just replaced (Buy -> Upgrade, same spot) by
    // the purchase that owns this item — briefly re-disable it so a fast
    // second tap of a double-tap doesn't also charge the upgrade.
    if(justBought && justBought.id === item.id){
      const elapsed = performance.now() - justBought.at;
      if(elapsed < SHOP_REARM_MS){
        const wasDisabled = btn.disabled;
        btn.disabled = true;
        setTimeout(()=>{ btn.disabled = wasDisabled; }, SHOP_REARM_MS - elapsed);
      }
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

/* --------------------------- IAP (mock v1) --------------------------- */
function renderIapSections(){
  const on = iapOn;
  const prov = provider();
  const coinProducts = PRODUCTS.filter(p => !p.entitlement && prov.supports(p.id));
  const supporterOn = on && prov.supports("supporter");
  for(const id of ["shop-coins-sect", "shop-coins"]){
    const el = document.getElementById(id);
    if(el) el.hidden = !on || coinProducts.length === 0;
  }
  for(const id of ["shop-supporter-sect", "shop-supporter"]){
    const el = document.getElementById(id);
    if(el) el.hidden = !supporterOn;
  }
  if(!on) return;
  const coinsBox = $("#shop-coins"), supporterBox = $("#shop-supporter");
  coinsBox.innerHTML = ""; supporterBox.innerHTML = "";
  for(const p of coinProducts) coinsBox.appendChild(makeIapRow(p));
  if(supporterOn) supporterBox.appendChild(makeSupporterCard());
}

function makeIapRow(p){
  if(!shopViewedProducts.has(p.id)){
    shopViewedProducts.add(p.id);
    // analytics (dark): product_view — fires once per IAP product tile shown
    // in the shop, the first time it renders after the shop was opened.
    analytics.track("product_view", { product: p.id });
  }
  const row = document.createElement("div");
  row.className = "scorerow shoprow";
  const copy = document.createElement("span");
  copy.className = "shop-copy";
  copy.innerHTML = `<b>${t("item." + p.id)}</b><small>${t("iap.amount", { coins: p.coins.toLocaleString() })}</small>`;
  const btn = document.createElement("button");
  btn.className = "chip buy-chip";
  btn.textContent = provider().price(p.id) || displayPrice(p, getLocale());
  btn.onclick = () => iapBuy(p, btn);
  if(iapPending){
    btn.disabled = true;
    if(iapPending === p.id) btn.textContent = t("iap.pending");
  }
  row.appendChild(copy); row.appendChild(btn);
  return row;
}

function makeSupporterCard(){
  const owned = isSupporter(ent);
  const row = document.createElement("div");
  row.className = "scorerow shoprow";
  const copy = document.createElement("span");
  copy.className = "shop-copy";
  copy.innerHTML = owned
    ? `<b>${t("shop.supporterTitle")} ♥</b><small>${t("shop.supporterOwned")}</small>`
    : `<b>${t("shop.supporterTitle")}</b><small>${t("shop.supporterDesc")}</small>`;
  row.appendChild(copy);
  if(!owned){
    if(!shopViewedProducts.has("supporter")){
      shopViewedProducts.add("supporter");
      // analytics (dark): product_view — supporter card only counts as "shown"
      // when it's actually buyable (unowned); the owned/"thanks" state isn't a
      // product tile.
      analytics.track("product_view", { product: "supporter" });
    }
    const btn = document.createElement("button");
    btn.className = "chip buy-chip";
    btn.textContent = provider().price("supporter") || displayPrice(productById("supporter"), getLocale());
    btn.onclick = () => iapBuy(productById("supporter"), btn);
    if(iapPending){
      btn.disabled = true;
      if(iapPending === "supporter") btn.textContent = t("iap.pending");
    }
    row.appendChild(btn);
  }
  return row;
}

// Buy flow: pending -> provider -> [mock: applyPurchase self-grant] |
// [real: server-side grant via reconcile poll] -> celebrate.
// iapPending is the double-tap guard: it is module state, not DOM state, so
// a mid-purchase renderShop() (e.g. buying an unrelated item) can't hand the
// user a fresh enabled button for the same product. Cancelled is silent
// (user changed their mind); failed/unavailable gets a toast.
async function iapBuy(p, btn){
  if(iapPending || btn.disabled) return;
  iapPending = p.id;
  btn.disabled = true;
  btn.textContent = t("iap.pending");
  // analytics (dark): purchase_start — fires once the double-tap/disabled
  // guard above has cleared, i.e. a real purchase attempt is starting.
  analytics.track("purchase_start", { product: p.id });
  try{
    const prov = provider();
    const r = await prov.purchase(p.id);

  if(prov.kind === "mock"){
    // Mock path (dev flag only, no backend): unchanged self-grant, byte-for-
    // byte the same flow this branch replaced (coin-purchase go-live T4 —
    // see the real path below for the split's other half).
    iapPending = null;
    if(!r.ok){
      // analytics (dark): purchase_fail — terminal mock-provider outcome
      // (cancel vs. anything else the mock reports as not-ok).
      analytics.track("purchase_fail", { product: p.id, reason: r.reason === "cancelled" ? "cancelled" : "provider_error" });
      if(r.reason !== "cancelled") toast(t("iap.failed"));
      return;
    }
    const g = applyPurchase(wallet, ent, p.id, r.orderId, Date.now());
    if(g.ok){
      wallet = g.wallet; ent = g.ent;
      store.set("wallet", wallet); store.set("ent", ent);
      pushEdge("purchase");
      updateWalletChip();
      toast(p.entitlement ? t("iap.supporterThanks") : t("iap.success", { coins: p.coins.toLocaleString() }));
      // analytics (dark): purchase_success — mock self-grant confirmed.
      analytics.track("purchase_success", { product: p.id });
    }else{
      // analytics (dark): purchase_fail — store transaction ok but the local
      // grant didn't apply (duplicate/already-owned); no coins/entitlement moved.
      analytics.track("purchase_fail", { product: p.id, reason: "no_credit" });
    }
    return;
  }

  // Real provider (kind !== "mock", e.g. "revenuecat"): coins are granted
  // SERVER-SIDE by the RevenueCat webhook (idempotent ledger row + wallet
  // increment) — the client NEVER self-grants here. purchase() ok only means
  // the store transaction went through; stay in iap.pending and poll
  // sync.js's ledger-cursor reconcile ("purchase" bypasses the sync cooldown,
  // see sync.js's BYPASS_COOLDOWN) until the credit lands locally (go-live
  // plan §3/§4 T4).
  if(!r.ok){
    iapPending = null;
    // analytics (dark): purchase_fail — only for terminal outcomes; "pending"
    // is not a failure (the store transaction may still resolve), so it does
    // not fire an event here.
    if(r.reason === "pending") toast(t("iap.processing"));
    else if(r.reason !== "cancelled"){ toast(t("iap.failed")); analytics.track("purchase_fail", { product: p.id, reason: "provider_error" }); }
    else analytics.track("purchase_fail", { product: p.id, reason: "cancelled" });
    return;
  }
  const poll = await pollForCredit({
    reconcile: (reason, orderId) => reconcile(store, reason, undefined, orderId),
    orderId: r.orderId,
    sleep: ms => new Promise(res => setTimeout(res, ms)),
  });
  iapPending = null;
  // Any reconcile() call inside the poll that ran wrote ALL merged SYNC_KEYS
  // back to the store, not just wallet (sync.js's reconcile, same guarantee
  // syncEdge relies on) — rehydrate in-memory state the same way syncEdge
  // does, or a later gameplay write would persist a stale value on top of
  // what reconcile just merged in. Unconditional (not just on poll.credited):
  // a push failure inside reconcile still commits the merged store writes
  // before returning {ok:false}, and rehydrating a no-op case is harmless.
  rehydrateFromStore();
  renderAccount();
  if(poll.credited){
    // Server is authoritative: toast the delta on this exact transaction's
    // ledger row, never an aggregate wallet increase or the local catalog.
    toast(p.entitlement ? t("iap.supporterThanks") : t("iap.success", { coins: poll.delta.toLocaleString() }));
    // analytics (dark): purchase_success — server-side grant confirmed via
    // the reconcile poll (the actual credit, not just the store transaction).
    analytics.track("purchase_success", { product: p.id });
  }else{
    // Exhausted the poll with no visible credit yet. The webhook's grant is
    // idempotent and guaranteed eventually — the next ordinary sync (or the
    // next reconcile edge) will fold the ledger row in. Not an error.
    toast(t("iap.processing"));
  }
  // Supporter entitlement rides `ent`, which is local-only and NOT in
  // SYNC_KEYS (see `ent`'s declaration comment) — the coin poll's reconcile
  // never touches it. Pull it separately via restore(), same pattern as
  // onRestorePurchases. (Supporter's bonus coins DO arrive through the coin
  // poll above, same as any other product.) Coin packs ship first in this
  // go-live slice — Supporter itself stays gated behind ads landing (round
  // decision, go-live plan §6.1) — but this branch stays wired for when it
  // un-darks, so entitlement purchases already work end-to-end.
  if(p.entitlement){
    const rr = await prov.restore();
    if(rr.ok){
      ent = restoreFrom(ent, rr.ownedProductIds);
      store.set("ent", ent);
      renderAccount();
    }
  }
  }catch(e){
    // Provider plugins promise a never-throw contract, but a bridge/SDK fault
    // must still release the pending guard instead of disabling IAP forever.
    toast(t("iap.failed"));
    // analytics (dark): purchase_fail — bridge/SDK threw despite the
    // never-throw contract; the transaction outcome is unknown.
    analytics.track("purchase_fail", { product: p.id, reason: "exception" });
  }finally{
    iapPending = null;
    renderShop();   // single render point for every outcome, incl. duplicate/already-owned fallthrough
  }
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
  // Effects/soundpacks/consumables: prefer full-bleed painted tile art when
  // present, else fall through to the procedural motif below (some tiles
  // aren't shipped yet).
  if(item.type==="effect" || item.type==="soundpack" || item.type==="consumable"){
    const timg = sprite("tile-"+item.id);
    if(timg){
      c.save(); roundRectOn(c,0,0,w,h,10); c.clip();
      drawCoverImage(c, timg, 0, 0, w, h);
      c.restore();
      c.strokeStyle = "rgba(245,197,24,.28)"; c.lineWidth = 1; roundRectOn(c,.5,.5,w-1,h-1,10); c.stroke();
      return;
    }
  }
  if(item.type==="skin"){
    drawCat(c, w*.52, h+6, now, "walk", SKIN_PALETTES[item.id], .72, [], false);
  }else if(item.type==="backdrop"){
    const img = sprite(`bg-${item.id}`);
    if(img) drawCoverImage(c, img, 0, 0, w, h);
    else paintBackdrop(c, w, h, h-7, item.id, now);
    c.strokeStyle = "rgba(245,197,24,.55)"; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0,h-8); c.lineTo(w,h-8); c.stroke();
  }else if(item.type==="effect"){
    // 96x64 tile — spread the motif across the whole area (the earlier draws
    // hugged the top-left quadrant, leaving the tile looking half-empty).
    if(item.id==="sakura-fx"){
      for(const [x,y,r,col] of [[16,18,-.3,"#f6a8c8"],[36,13,.5,"#f9c6da"],[56,22,-.6,"#f6a8c8"],
                                [76,15,.3,"#f9c6da"],[26,42,.4,"#f9c6da"],[48,48,-.4,"#f6a8c8"],
                                [68,44,.7,"#f6a8c8"],[84,34,-.2,"#f9c6da"]]){
        c.fillStyle = col; c.beginPath(); c.ellipse(x,y,6,3,r,0,Math.PI*2); c.fill();
      }
    }else if(item.id==="star-shower"){
      c.fillStyle = "#ffe08a";
      for(const [x,y,r] of [[18,16,4.5],[40,11,3],[60,20,5],[80,13,3.5],
                            [28,42,3.5],[50,46,5],[72,42,4],[88,30,2.6]]) drawStarMark(c, x, y, r);
    }else{
      // firecracker burst centered in the tile: radiating sparks + bright core
      const cx=48, cy=32;
      c.strokeStyle = "#ffcf5a"; c.lineWidth = 2; c.lineCap = "round";
      for(let a=0;a<8;a++){ const ang = a*Math.PI/4;
        c.beginPath(); c.moveTo(cx+Math.cos(ang)*9, cy+Math.sin(ang)*9);
        c.lineTo(cx+Math.cos(ang)*25, cy+Math.sin(ang)*22); c.stroke(); }
      c.fillStyle = "#e04040"; c.beginPath(); c.arc(cx,cy,9,0,Math.PI*2); c.fill();
      c.fillStyle = "#fff4c0"; c.beginPath(); c.arc(cx,cy,4,0,Math.PI*2); c.fill();
      c.fillStyle = "#ffe08a";
      for(let a=0;a<8;a++){ const ang = a*Math.PI/4 + Math.PI/8;
        c.beginPath(); c.arc(cx+Math.cos(ang)*24, cy+Math.sin(ang)*20, 2, 0, Math.PI*2); c.fill(); }
    }
  }else if(item.type==="soundpack"){
    c.lineWidth = 2.5; c.lineCap = "round";
    if(item.id==="bells"){
      c.fillStyle = "#f5c518"; c.beginPath(); c.arc(48,26,15,Math.PI,0); c.lineTo(65,44); c.lineTo(31,44); c.closePath(); c.fill();
      c.fillStyle = "#3a2200"; c.beginPath(); c.arc(48,44,3.6,0,Math.PI*2); c.fill();
    }else if(item.id==="lion-drum"){
      c.fillStyle = "#c1272d"; c.beginPath(); c.ellipse(48,36,18,13,0,0,Math.PI*2); c.fill();
      c.fillStyle = "#f5c518"; c.fillRect(30,30,36,4);
      c.strokeStyle = "#7a1c14"; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(30,12); c.lineTo(40,28); c.moveTo(66,12); c.lineTo(56,28); c.stroke();
    }else{
      c.strokeStyle = "#7fd7ff"; c.lineWidth = 3;
      c.beginPath(); c.moveTo(34,44); c.lineTo(34,16); c.lineTo(64,10); c.lineTo(64,38); c.stroke();
      c.fillStyle = "#7fd7ff";
      c.beginPath(); c.arc(30,44,5,0,Math.PI*2); c.fill();
      c.beginPath(); c.arc(60,38,5,0,Math.PI*2); c.fill();
    }
  }else if(item.type==="consumable"){
    // streak freeze: same 6-spoke snowflake as ui-icons.svg#freeze, stroked
    // straight from the symbol's path data (Path2D takes SVG path strings) so
    // tile and icon can never drift apart. Canvas-drawn like every other
    // tile — .shop-preview has no DOM/svg overlay layer to composite onto.
    c.save();
    c.translate(48, 32); c.scale(1.9, 1.9); c.translate(-12, -12);
    c.strokeStyle = "#bfe8ff"; c.lineCap = "round"; c.lineJoin = "round";
    c.lineWidth = 2;
    c.stroke(new Path2D("M12 4v16M5 8l14 8M5 16l14-8"));
    c.lineWidth = 1.5;
    c.stroke(new Path2D("M12 7l-2.2 1.3M12 7l2.2 1.3M12 17l-2.2-1.3M12 17l2.2-1.3M7.5 9.7L6 8.8M7.5 9.7l-.6 2.3M16.5 9.7l.6 2.3M16.5 9.7l1.5-.9M7.5 14.3l-1.5.9M7.5 14.3l-.6-2.3M16.5 14.3l.6-2.3M16.5 14.3l1.5.9"));
    c.restore();
  }else{
    // deco: fit the painted sprite inside the tile with padding. drawStreetDeco's
    // street scale (DECO_SPRITE_SCALE 1.5) is sized for the street ground and
    // overflows/clips in this small 96x64 preview tile. Vector fallback (no PNG
    // yet) keeps the street draw until real art lands.
    const dimg = sprite("deco-" + item.id);
    if(dimg){
      const s = Math.min((h-10)/dimg.height, (w-18)/dimg.width);
      const dw = dimg.width*s, dh = dimg.height*s;
      c.drawImage(dimg, (w-dw)/2, h-5-dh, dw, dh);
    }else{
      drawStreetDeco(c, item.id, w*.5, h-5, h);
    }
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
    const du = m.unit * (p.scale || 1);   // auto-arrange shrinks decos so they never overlap
    drawContactShadow(sc, x, gy, du);
    drawTieredDeco(sc, p, x, gy, du);
  }

  // mascot - maneki sprite or vector fallback, always far left on the ground.
  // 2026-07-11 audit F2: "cat too small" — bump the draw scale ~40% (mascot-
  // bump precedent, 263e3f6/4ec9fcf); both branches stay grounded (gy-anchored).
  const mImg = sprite("maneki");
  const mp = Math.min(h*0.62, 67);
  if(mImg){
    sc.drawImage(mImg, 4, gy-mp+4, mp, mp);
  }else{
    sc.textAlign = "left";
    sc.font = `${Math.round(h*0.42)}px serif`;
    drawCat(sc, 22, gy + 8, 0, "happy", null, .81, [], false);
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
  // Ghost "empty plot" pads only for not-yet-unlocked BUILDINGS (a "reach Lv X"
  // hint). Decos are auto-arranged at dynamic slots now, so fixed deco ghost
  // pads would sit at the wrong places / under real decos — dropped.
  const buildingSlots = [.18,.34,.5,.66,.82];
  for(const slot of buildingSlots){
    if(occupied.has(slot.toFixed(2))) continue;
    drawPad(slot*w, backGy, m.unit * m.backScale);
  }
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
  // Crown accent is calibrated to the vector geometry (DECO_TOPS); on a PNG
  // sprite it would land mid-art, so tier-3 PNG decos show via the enlarge+glow
  // only. Reposition-for-sprite is a later polish.
  if(tier >= 3 && !sprite("deco-" + p.id)) drawCrownAccent(c, p.id, x, gy, h);
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
// DECO_SPRITE_SCALE lives in street.js (co-located with BASE_DECO_W so their
// no-overlap coupling is unit-tested); it's the PNG draw box as a multiple of
// the deco basis h, bottom-anchored.
function drawStreetDeco(c, id, x, gy, h){
  // Prefer the PNG art when loaded; fall back to the vector shape otherwise
  // (manifest: decor + fallback "canvas:drawStreetDeco"). Any caller tier
  // enlargement / glow already in the ctx transform applies to the sprite too.
  const img = sprite("deco-" + id);
  if(img){
    const sz = h * DECO_SPRITE_SCALE;
    c.drawImage(img, x - sz/2, gy - sz, sz, sz);
    return;
  }
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

/* ============================== profile / progress ============================== */
function renderProfileDashboard(){
  const level = levelForXp(xp);
  const prog = xpToNext(xp);
  const pct = prog.need ? Math.round(100*prog.into/prog.need) : 100;

  const displayName = playerProfile.displayName || t("profile.defaultName");
  $("#profile-name").textContent = displayName;
  const avatar = $("#profile-avatar");
  const initial = profileInitial(playerProfile.displayName);
  $("#profile-avatar-initial").textContent = initial;
  avatar.classList.toggle("has-initial", !!initial);
  avatar.setAttribute("aria-label", t("profile.avatar", { name: displayName }));
  $("#profile-level").textContent = t("profile.level", { lv: level });
  $("#profile-xp-bar").style.width = pct + "%";
  $("#profile-xp-copy").textContent = t("profile.xp", {
    into: prog.into.toLocaleString(), need: prog.need.toLocaleString(),
  });
  const streak = streakInfo(daily, todayStr(), freezes).streak;
  $("#profile-streak").textContent = t("profile.streak", { n: streak });
  $("#profile-coins").textContent = t("profile.coins", { n: wallet.toLocaleString() });

  const stats = profileStats({
    levels: D.levels, mastery: masteryStore, stickerState, stickerDefs: STICKER_DEFS,
    shop: shopState, catalog: CATALOG,
  });
  $("#profile-mastered").textContent = stats.masteredWords.toLocaleString();
  $("#profile-seen").textContent = stats.seenWords.toLocaleString();
  $("#profile-stickers").textContent = `${stats.earnedStickers}/${stats.totalStickers}`;
  $("#profile-cosmetics").textContent = `${stats.ownedCosmetics}/${stats.totalCosmetics}`;
  $("#profile-collection-count").textContent = t("profile.collectionCount", {
    owned: stats.ownedCosmetics, total: stats.totalCosmetics,
  });
  $("#profile-sticker-count").textContent = t("profile.stickerCount", {
    earned: stats.earnedStickers, total: stats.totalStickers,
  });

  const equipped = equippedSummary(shopState, CATALOG);
  const skinName = equipped.skin ? tOr("item."+equipped.skin.id, equipped.skin.name) : t("profile.defaultCat");
  const backdropName = equipped.backdrop
    ? tOr("item."+equipped.backdrop.id, equipped.backdrop.name) : t("profile.defaultBackdrop");
  $("#profile-skin").textContent = t("profile.skin", { name: skinName });
  $("#profile-backdrop").textContent = t("profile.backdrop", { name: backdropName });

  const nameRow = $("#profile-name-row"), form = $("#profile-name-form");
  const input = $("#profile-name-input");
  nameRow.hidden = false; form.hidden = true;
  $("#profile-edit-name").onclick = ()=>{
    input.value = playerProfile.displayName;
    nameRow.hidden = true; form.hidden = false;
    input.focus(); input.select();
  };
  $("#profile-cancel-name").onclick = ()=>{ form.hidden = true; nameRow.hidden = false; };
  form.onsubmit = e=>{
    e.preventDefault();
    playerProfile = { displayName: normalizeDisplayName(input.value) };
    store.set("profile", playerProfile);
    saveDisplayName(accountUI.session, getLocale(), playerProfile.displayName);
    renderProfileDashboard();
  };
}
function renderProgress(){
  renderProfileDashboard();
  // #go-smart now lives on this screen (2026-07-11 audit F1) — refresh its
  // label here too, not just on renderHome(), so it reflects the latest
  // deck size the moment the player opens Progress.
  updateSmartBtn();
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
        <span>${t("progress.levelRow", { pct: `<b>${m.pct}%</b>`, seen: m.seen.toLocaleString(), total: words.length.toLocaleString() })}</span>
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
    row.setAttribute("role", "button");
    row.tabIndex = 0;
    row.style.cursor = "pointer";
    row.innerHTML = `<span class="hz">${w.h}</span>
      <span class="det"><span class="py">${w.p}</span> — ${w.e}${w.t? " · "+w.t:""}</span>`;
    row.onclick = ()=> wordDetail.open(w);
    row.onkeydown = e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); wordDetail.open(w); } };
    const sp = document.createElement("button");
    sp.className = "sp"; sp.setAttribute("aria-label", t("common.playAudio")); sp.replaceChildren(iconSvg("sound")); sp.onclick = e=>{ e.stopPropagation(); speak(w.h); };
    row.appendChild(sp);
    list.appendChild(row);
  }
  const showBtns = weak.length >= 2;
  $("#nw-review").style.display = showBtns ? "block" : "none";
  $("#nw-fight").style.display = showBtns ? "block" : "none";
  $("#nw-review").onclick = ()=>{ learnDeck = weak.slice(); startLearn("progress"); };
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
analytics.track("session_start");
analyticsSessionStart = Date.now();
renderQuests();
updateNav(currentScreen);
// Availability-driven IAP gating (go-live plan §4 T1): resolve once at boot.
// renderIapSections() is safe to call standalone (see its hidden-toggling
// loop) even before the shop screen has ever been rendered — the elements
// it touches are static markup, always present in the DOM.
iapVisible(provider(), iapEnabled()).then(v => { iapOn = v; renderIapSections(); });
if(location.hash === "#debug"){
  window.__debugTarget = ()=> B.zombie && B.zombie.w.h;
  window.__grantXp = n => { addXp(n); };
}
initNative({ getScreen: ()=>currentScreen, goHome: ()=>{ if(B.on){ endBattle(true); } else { stopBattle(); show("home"); } } });
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
