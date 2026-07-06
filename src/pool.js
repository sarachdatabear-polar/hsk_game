export function buildPool(levels, scope) {
  const map = new Map();
  for (const lv of scope.levels) {
    for (const w of levels[String(lv)]) {
      const prev = map.get(w.h);
      if (!prev) { map.set(w.h, { ...w, fs: w.f }); }
      else {
        prev.fs += w.f;
        if (w.f > prev.f) { prev.f = w.f; prev.ta = w.ta; prev.tt = w.tt; }
        if (w.lv < prev.lv) { prev.lv = w.lv; prev.p = w.p; prev.n = w.n; }
        if (!prev.t && w.t) prev.t = w.t;
        if (!prev.e && w.e) prev.e = w.e;
        prev.c = Math.max(prev.c, w.c);
      }
    }
  }
  let arr = [...map.values()];
  if (scope.core)    arr = arr.filter(w => w.c === 1);
  if (scope.newOnly) arr = arr.filter(w => w.n === 1);
  arr.sort((a, b) => b.f - a.f);
  if (scope.topN > 0) arr = arr.slice(0, scope.topN);
  return arr;
}

export function coveragePct(pool, manifest, levelsSelected) {
  let denom = 0;
  for (const lv of levelsSelected) denom += manifest.levels[String(lv)].freq_total;
  if (!denom) return 0;
  const num = pool.reduce((s, w) => s + w.fs, 0);
  return Math.min(99, Math.round(100 * num / denom));
}

export function scopeKey(scope) {
  return "HSK" + scope.levels.join("+")
    + (scope.core ? "·HY" : "") + (scope.newOnly ? "·NEW" : "")
    + (scope.topN ? "·top" + scope.topN : "");
}

export function meaning(w, lang) {
  if (lang === "en") return { main: w.e, sub: "" };
  if (lang === "th") return w.t ? { main: w.t, sub: "" } : { main: w.e + " *", sub: "" };
  return { main: w.e, sub: w.t || "" };
}

// Session length: how many words a "round" battle spawns before it ends.
export function normalizeLen(v) {
  if (v === null || v === undefined || v === "") return 20;
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 20;
  return Math.min(500, Math.max(5, n));
}

// High-score bucket: longer rounds score more, so each length gets its own
// key — except 20, which keeps the legacy "round" key so old bests survive.
export function modeKey(mode, len) {
  return (mode === "round" && len !== 20) ? "round" + len : mode;
}

// Human-readable summary of the current scope, for the home screen's scope
// chip (M3). Returns structured parts rather than a finished string so
// main.js can localize the filter labels via t() — this module stays
// dependency-free of i18n, like the rest of pool.js.
export function scopeSummary(scope) {
  const levels = [...scope.levels].sort((a, b) => a - b);
  let levelLabel = "";
  if (levels.length === 1) {
    levelLabel = "HSK" + levels[0];
  } else if (levels.length > 1) {
    const isRun = levels.every((n, i) => i === 0 || n === levels[i - 1] + 1);
    levelLabel = isRun
      ? `HSK${levels[0]}–${levels[levels.length - 1]}`
      : "HSK" + levels.join("+");
  }
  return {
    levelLabel,
    core: !!scope.core,
    newOnly: !!scope.newOnly,
    sessionLen: normalizeLen(scope.sessionLen),
  };
}
