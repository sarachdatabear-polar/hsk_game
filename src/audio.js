let mp3Set = new Set();
let base = "audio/";
let zhVoice = null;
let current = null;

export function initAudio(indexArray, baseUrl = "audio/") {
  mp3Set = new Set(indexArray || []);
  base = baseUrl;
  if (window.speechSynthesis) {
    const pick = () => {
      const vs = speechSynthesis.getVoices();
      zhVoice = vs.find(v => /zh[-_]CN/i.test(v.lang)) || vs.find(v => /^zh/i.test(v.lang)) || null;
    };
    pick(); speechSynthesis.onvoiceschanged = pick;
  }
}

export function speak(hanzi) {
  if (!hanzi) return;
  if (current) { current.pause(); current = null; }
  if (window.speechSynthesis) speechSynthesis.cancel();
  if (mp3Set.has(hanzi)) {
    current = new Audio(base + encodeURIComponent(hanzi) + ".mp3");
    current.play().catch(() => ttsFallback(hanzi));   // e.g. offline cache miss
    return;
  }
  ttsFallback(hanzi);
}

function ttsFallback(hanzi) {
  if (!window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(hanzi);
  u.lang = "zh-CN"; u.rate = 0.85;
  if (zhVoice) u.voice = zhVoice;
  speechSynthesis.speak(u);
}
