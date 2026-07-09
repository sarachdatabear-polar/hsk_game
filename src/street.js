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

// Decorations are auto-arranged: however many the player owns are spread evenly
// across the front-row band and scaled so they NEVER overlap, at any count
// 1..15. The street is a "proud to show" reward showcase, not a builder — the
// game curates the layout so it always looks intentional and the art always
// reads cleanly, rather than asking the player to place pieces by hand.
const DECO_BAND = { left: 0.15, right: 0.97 }; // usable front-row band; left margin clears the maneki mascot
// Tier-1 deco footprint as a fraction of street width (art + padding). Sets the
// count at which decos start shrinking: full scale while a cell is >= this.
export const BASE_DECO_W = 0.13;
// Tier-2/3 upgrades enlarge the drawn silhouette 1.15x (main.js drawTieredDeco).
// The layout budgets for the worst case so an all-max-tier street never overlaps.
export const TIER_MAX_FACTOR = 1.15;

// Even "centered-cell" layout for `count` decos: equal end margins, equal gaps,
// uniform scale so each footprint — at its largest possible (max-tier) draw
// size — fits its own cell.
function decoLayout(count) {
  const span = DECO_BAND.right - DECO_BAND.left;
  const cell = span / count;
  const scale = Math.min(1, cell / (BASE_DECO_W * TIER_MAX_FACTOR));
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({ slot: DECO_BAND.left + (i + 0.5) * cell, scale });
  }
  return out;
}

export function streetPieces(level, owned, tiers = {}) {
  const pieces = [];
  BUILDINGS.forEach((b, i) => {
    if (level >= b.lv) pieces.push({ id: b.id, kind: "building", slot: BUILDING_SLOTS[i] });
  });
  const ownedDecos = DECO_IDS.filter(id => owned.includes(id)); // canonical order = stable identity
  const layout = decoLayout(ownedDecos.length);
  ownedDecos.forEach((id, i) => {
    pieces.push({ id, kind: "deco", slot: layout[i].slot, tier: tiers[id] || 1, scale: layout[i].scale });
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
  const unit = Math.min(h * 0.30, w * 0.105);
  const backY = 0.86;
  const frontY = 1.0;
  const backScale = 0.78;
  return { unit, backY, frontY, backScale };
}
