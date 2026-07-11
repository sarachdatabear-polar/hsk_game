import { isNative } from "./native.js";

let mp3Set = new Set();
let base = "audio/";
let zhVoice = null;
let current = null;

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
  if (current) { current.pause(); current = null; }
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
  if (mp3Set.has(hanzi)) {
    current = new Audio(base + encodeURIComponent(hanzi) + ".mp3");
    current.play().catch(() => ttsFallback(hanzi, synth, deferred));
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
  u.lang = "zh-CN"; u.rate = 0.85;
  if (zhVoice) u.voice = zhVoice;
  if (!isRetry) u.onerror = () => speakUtterance(hanzi, synth, true);
  synth.speak(u);
}

function ttsFallback(hanzi, synth, deferred = false) {
  const mode = chooseTts();
  if (mode === "native") {
    window.Capacitor.Plugins.TextToSpeech.speak({ text: hanzi, lang: "zh-CN", rate: 1.0 }).catch(() => {});
  } else if (mode === "web") {
    if (deferred) setTimeout(() => speakUtterance(hanzi, synth, false), 0);
    else speakUtterance(hanzi, synth, false);
  }
}
