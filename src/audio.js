import { isNative } from "./native.js";
import { clampVol } from "./sfx.js";

let mp3Set = new Set();
let base = "audio/";
let zhVoice = null;
// Resolves the first time initAudio() runs (with real data or the boot
// catch's empty fallback) — the moment mp3Set is trustworthy. Auto-speak
// paths race this (with a timeout) instead of reading mp3Set while the boot
// fetch is still in flight, which used to send a session's first question
// down the TTS path even when its mp3 exists.
let indexReadyResolve;
export const audioIndexReady = new Promise(res => { indexReadyResolve = res; });
// One reused <audio> element for word playback. Mobile browsers unlock media
// per-element on the first gesture-initiated play(); reusing a single element
// (rather than `new Audio()` per word) keeps that unlock alive for the session
// so the auto-spoken word (fired on card appearance, NOT a gesture) is allowed.
let wordEl = null;
function wordAudio() {
  if (!wordEl && typeof Audio !== "undefined") { wordEl = new Audio(); wordEl.preload = "auto"; }
  return wordEl;
}
// Pronunciation volume (settings.voiceVol, wave-2 volume controls). Applied
// to both playback paths: the bundled-mp3 Audio element and the Web Speech
// SpeechSynthesisUtterance fallback.
let voiceVol = 1;
export function setVoiceVolume(v) { voiceVol = clampVol(v); }

// A hair of silence — a valid, always-supported source used only to unlock the
// reused word element inside the first user gesture (see unlockAudio).
const SILENT_WAV = "data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YSADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

let unlocked = false;
let unlocking = null;
// A rejected play() before the session is unlocked usually means the iOS
// gesture unlock hasn't landed yet. Remember the word; unlockAudio() replays
// it on success — so a session's FIRST question is heard on the first tap
// instead of silently downgrading to a TTS voice iOS also tends to drop.
let pendingRetry = null; // { hanzi, at }
const RETRY_WINDOW_MS = 8000;
// Mobile browsers gate audio until the first real user gesture: the Web Audio
// context starts suspended, HTMLAudioElement.play() is rejected, and
// speechSynthesis.speak() is silently dropped — all outside a gesture. Call
// this from a first pointerdown/touch/click so every path is primed before the
// game speaks a word on its own. Idempotent; best-effort (every step guarded).
export function unlockAudio() {
  if (unlocked) return Promise.resolve(true);
  if (unlocking) return unlocking;
  if (typeof window === "undefined") return Promise.resolve(false);
  // Prime web speech — iOS requires the first utterance inside a gesture.
  const synth = window.speechSynthesis;
  if (synth) { try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; synth.speak(u); } catch (e) {} }
  // Prime the reused word element with a blip of silence so later
  // programmatic (non-gesture) play() calls are allowed for the session.
  const el = wordAudio();
  // No HTML media implementation exists (for example a native-only test
  // shell). Web/native speech was already primed above, so there is nothing
  // retryable to wait for.
  if (!el) { unlocked = true; return Promise.resolve(true); }
  try {
    el.muted = true;
    el.src = SILENT_WAV;
    const unlockSrc = el.src;
    const p = el.play();
    if (!p || typeof p.then !== "function") {
      el.muted = false;
      unlocked = true;
      return Promise.resolve(true);
    }
    unlocking = Promise.resolve(p).then(() => {
      // A gesture's bubble handler can start a real word before the silent
      // play promise settles. Never pause/reset that newer source.
      if (el.src === unlockSrc) { el.pause(); el.currentTime = 0; }
      el.muted = false;
      unlocked = true;
      if (pendingRetry && Date.now() - pendingRetry.at < RETRY_WINDOW_MS) {
        const h = pendingRetry.hanzi; pendingRetry = null;
        speak(h);
      }
      return true;
    }).catch(() => {
      el.muted = false;
      return false;
    }).finally(() => { unlocking = null; });
    return unlocking;
  } catch (e) {
    el.muted = false;
    return Promise.resolve(false);
  }
}

// Bundled-MP3 presence — reliable tone (browser TTS can't be trusted for tones).
export function hasMp3(hanzi){ return mp3Set.has(hanzi); }

export function initAudio(indexArray, baseUrl = "audio/") {
  mp3Set = new Set(indexArray || []);
  base = baseUrl;
  if (typeof window !== "undefined" && window.speechSynthesis) {
    const synth = window.speechSynthesis;
    const pick = () => {
      const vs = synth.getVoices();
      zhVoice = vs.find(v => /zh[-_]CN/i.test(v.lang)) || vs.find(v => /^zh/i.test(v.lang)) || null;
    };
    pick(); synth.onvoiceschanged = pick;
  }
  if (indexReadyResolve) { indexReadyResolve(); indexReadyResolve = null; }
}

// Which TTS path to use for a word that has no bundled mp3.
export function chooseTts() {
  if (isNative() && window.Capacitor.Plugins && window.Capacitor.Plugins.TextToSpeech) return "native";
  if (typeof window !== "undefined" && window.speechSynthesis) return "web";
  return "none";
}

// Can this word be spoken at all? (bundled mp3, or any TTS path)
export function audioAvailable(hanzi) {
  return mp3Set.has(hanzi) || chooseTts() !== "none";
}

export function speak(hanzi) {
  if (!hanzi) return;
  pendingRetry = null;   // a newer word supersedes any queued retry
  const el = wordAudio();
  if (el && !el.paused) { el.pause(); }
  // Chrome's cancel-then-speak race: calling speechSynthesis.cancel() while
  // nothing is speaking/pending is a no-op, but calling speak() immediately
  // after a real cancel can silently drop the new utterance. Only cancel
  // when there's actually something to interrupt, and when we do, defer the
  // follow-up speak() by a tick so the cancel has landed first.
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  let deferred = false;
  if (synth && (synth.speaking || synth.pending)) {
    synth.cancel();
    deferred = true;
  }
  if (mp3Set.has(hanzi) && el) {
    el.muted = false;
    el.src = base + encodeURIComponent(hanzi) + ".mp3";
    el.volume = voiceVol;
    try { el.currentTime = 0; } catch (e) {}
    el.play().catch(() => {
      console.warn("[audio] mp3 play rejected", hanzi);
      if (!unlocked) { pendingRetry = { hanzi, at: Date.now() }; return; }
      ttsFallback(hanzi, synth, deferred);
    });
    return;
  }
  ttsFallback(hanzi, synth, deferred);
}

// Speaks one web-speech utterance on the given synth. `isRetry` guards
// against retrying forever: only the first attempt gets an onerror handler
// that re-speaks once. `synth` is captured at speak()-time rather than
// re-read off `window` later, so a deferred speak always lands on the
// synthesizer instance it was scheduled against.
function speakUtterance(hanzi, synth, isRetry) {
  const u = new SpeechSynthesisUtterance(hanzi);
  u.lang = "zh-CN"; u.rate = 0.85; u.volume = voiceVol;
  if (zhVoice) u.voice = zhVoice;
  if (!isRetry) u.onerror = () => speakUtterance(hanzi, synth, true);
  synth.speak(u);
}

// Auto-speak entry for words the game speaks on its own (question spawn,
// tone-trainer prompt) — NOT for tap-driven replay buttons, which must stay
// synchronous inside their gesture. Waits (briefly) for the bundled-mp3
// index and any in-flight unlock so a session's first auto-spoken word takes
// the mp3 path instead of losing the boot race.
export function speakWhenReady(hanzi, timeoutMs = 1500) {
  if (!hanzi) return;
  const timeout = new Promise(res => setTimeout(res, timeoutMs));
  Promise.race([audioIndexReady, timeout])
    .then(() => unlocking || null)
    .then(() => speak(hanzi));
}

function ttsFallback(hanzi, synth, deferred = false) {
  const mode = chooseTts();
  if (mode === "native") {
    window.Capacitor.Plugins.TextToSpeech.speak({ text: hanzi, lang: "zh-CN", rate: 1.0, volume: voiceVol }).catch(() => {});
  } else if (mode === "web") {
    if (deferred) setTimeout(() => speakUtterance(hanzi, synth, false), 0);
    else speakUtterance(hanzi, synth, false);
  }
}
