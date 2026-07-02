let ctx = null;
function ac() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  return AC ? (ctx = new AC()) : null;
}
function tone(freq, dur, type = "square", vol = 0.15, when = 0) {
  const a = ac(); if (!a || !sfx.enabled) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, a.currentTime + when);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + when + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + when); o.stop(a.currentTime + when + dur);
}
export const sfx = {
  enabled: true,
  kill()  { tone(660, .09); tone(880, .12, "square", .15, .07); },          // rising blip
  wrong() { tone(160, .25, "sawtooth", .18); },                              // buzz
  bite()  { tone(220, .12, "sawtooth", .2); tone(110, .3, "sawtooth", .2, .1); },
  combo(n){ const base = 700 + Math.min(n, 8) * 60; tone(base, .08, "triangle", .12); tone(base * 1.5, .1, "triangle", .12, .06); }
};
