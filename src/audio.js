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
    const pick = () => {
      const vs = speechSynthesis.getVoices();
      zhVoice = vs.find(v => /zh[-_]CN/i.test(v.lang)) || vs.find(v => /^zh/i.test(v.lang)) || null;
    };
    pick(); speechSynthesis.onvoiceschanged = pick;
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
    window.Capacitor.Plugins.TextToSpeech.speak({ text: hanzi, lang: "zh-CN", rate: 1.0 }).catch(() => {});
  } else if (mode === "web") {
    const u = new SpeechSynthesisUtterance(hanzi);
    u.lang = "zh-CN"; u.rate = 0.85;
    if (zhVoice) u.voice = zhVoice;
    speechSynthesis.speak(u);
  }
}
