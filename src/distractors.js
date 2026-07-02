function shuffle(a, rand) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const tok = s => (s || "").toLowerCase().replace(/[()]/g, "").trim().split(/[ ,;/]+/)[0];

export function pickDistractors(pool, target, rand = Math.random) {
  const i = pool.findIndex(w => w.h === target.h);
  const tTok = tok(target.e);
  const ok = w => w.h !== target.h && tok(w.e) !== tTok && !(target.t && w.t === target.t);
  let cands = pool.slice(Math.max(0, i - 40), i + 41).filter(ok);
  if (cands.length < 3) cands = pool.filter(ok);
  return shuffle([...cands], rand).slice(0, 3);
}
