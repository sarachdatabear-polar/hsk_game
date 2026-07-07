"use strict";
// Lucky Cat Street — pure module, no DOM/canvas. Derives entirely from the
// caller's level (levelForXp(xp)) + owned decos (shopState.owned); nothing
// here reads or writes storage.

export const BUILDINGS = [
  { lv: 5,  id: "lantern-post", name: "Lantern Post" },
  { lv: 10, id: "coin-bank",    name: "Coin Bank" },
  { lv: 20, id: "tailor",       name: "Tailor Shop" },
  { lv: 30, id: "kitten-cafe",  name: "Kitten Café" },
  { lv: 50, id: "emperor-gate", name: "Emperor's Gate" },
];

// Display order for owned decorations; ids owned but absent here are ignored.
// v7 adds the permanent prestige decos, the daily-pool decos, and the three
// seasonal decos (order fixes each one's street slot below).
export const DECO_IDS = [
  "red-lantern", "noodle-stall", "tea-sign", "foo-dog", "golden-arch",
  "mahjong-table", "koi-pond", "drum-tower",
  "bubble-tea", "paper-umbrella", "goldfish-banner", "neon-cat-sign",
  "shaved-ice-cart", "mooncake-stall", "firecracker-arch",
];

const BUILDING_SLOTS = [.18, .34, .5, .66, .82];
// First five match v4 so existing streets do not reshuffle; the ten new
// fractions fill remaining gaps between buildings.
const DECO_SLOTS = [
  .10, .26, .42, .58, .74,
  .06, .14, .22, .30, .38,
  .46, .54, .62, .70, .90,
];

export function streetPieces(level, owned, tiers = {}) {
  const pieces = [];
  BUILDINGS.forEach((b, i) => {
    if (level >= b.lv) pieces.push({ id: b.id, kind: "building", slot: BUILDING_SLOTS[i] });
  });
  DECO_IDS.forEach((id, i) => {
    if (owned.includes(id)) pieces.push({ id, kind: "deco", slot: DECO_SLOTS[i], tier: tiers[id] || 1 });
  });
  return pieces.sort((a, b) => a.slot - b.slot);
}

export function streetProgress(level) {
  const total = BUILDINGS.length;
  const unlocked = BUILDINGS.filter(b => b.lv <= level).length;
  const nextB = BUILDINGS.find(b => b.lv > level) || null;
  const next = nextB ? { lv: nextB.lv, name: nextB.name } : null;
  return { unlocked, total, next };
}

// Two-row street layout metrics for a given canvas (w, h).
// Deterministic, no DOM; all outputs are positive and finite.
export function streetMetrics(w, h) {
  const unit = Math.min(h * 0.30, w * 0.062);
  const backY = 0.86;
  const frontY = 1.0;
  const backScale = 0.78;
  return { unit, backY, frontY, backScale };
}
