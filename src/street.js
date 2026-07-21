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

// ---- scene composer (2026-07-20) ----
// The street is a curated scene, not a shelf: each deco has a size class and
// classes have hand-authored anchors in three depth lanes composed around
// bg-street.png (road up the middle, fences at the sides). See
// docs/superpowers/specs/2026-07-20-audit-fixes-design.md.
export const DECO_CLASS = {
  "golden-arch": "gateway", "firecracker-arch": "gateway",
  "drum-tower": "large", "noodle-stall": "large",
  "mooncake-stall": "large", "shaved-ice-cart": "large",
  "koi-pond": "medium", "mahjong-table": "medium", "bubble-tea": "medium",
  "tea-sign": "medium", "neon-cat-sign": "medium",
  "red-lantern": "small", "paper-umbrella": "small",
  "goldfish-banner": "small", "foo-dog": "small",
};
export const CLASS_SIZE = { gateway: 1.6, large: 1.25, medium: 1.0, small: 0.8 };
// PNG deco draw box, as a multiple of the deco basis (main.js renderStreet uses
// it, bottom-anchored). The largest a deco draws — the vector fallback is
// smaller.
export const DECO_SPRITE_SCALE = 1.5;
// streetMetrics' w-bound unit as a fraction of width (unit = min(h*.30, w*.105)).
export const UNIT_FRAC = 0.105;
// laneY = the piece's ground line as a fraction of street height (1.0 is the
// front ground line main.js draws on); laneScale shrinks pieces with
// distance. Buildings keep their historical 0.86 row between back and mid.
export const LANES = {
  back:  { laneY: 0.82, laneScale: 0.72 },
  mid:   { laneY: 0.91, laneScale: 0.86 },
  front: { laneY: 1.0,  laneScale: 1.0  },
};
// One anchor list per class, list length = class census, so every deco always
// has a home and classes never compete. List order is fill order. Front-lane
// left margin (≥.15 after half-widths) clears the maneki mascot; gateways own
// the road center so an arch reads as the street's entrance.
export const DECO_ANCHORS = {
  // back first: the first-bought arch reads as a distant gate behind the buildings, keeping the Tailor (building slot .5) visible; the second arch fronts the road.
  gateway: [ { x: 0.50, lane: "back" }, { x: 0.50, lane: "mid" } ],
  large:   [ { x: 0.25, lane: "front" }, { x: 0.77, lane: "front" },
             { x: 0.30, lane: "back" },  { x: 0.70, lane: "back" } ],
  medium:  [ { x: 0.58, lane: "front" }, { x: 0.93, lane: "front" },
             { x: 0.20, lane: "mid" },   { x: 0.35, lane: "mid" },
             { x: 0.80, lane: "mid" } ],
  small:   [ { x: 0.42, lane: "front" }, { x: 0.68, lane: "mid" },
             { x: 0.14, lane: "back" },  { x: 0.88, lane: "back" } ],
};

// Permanent-home assignment: each deco's anchor is fixed by its class-rank
// position in DECO_IDS (owned or not), so buying ANY deco never moves another
// — the street grows, it doesn't reshuffle. Unowned homes simply stay empty
// until purchased. Pure function of the owned set; same result on every
// machine, nothing persisted.
export function assignDecoAnchors(ownedIds) {
  const rank = { gateway: 0, large: 0, medium: 0, small: 0 };
  const out = new Map();
  for (const id of DECO_IDS) {
    const cls = DECO_CLASS[id];
    const idx = rank[cls]++;
    if (!ownedIds.includes(id)) continue;
    const anchor = DECO_ANCHORS[cls][idx];
    if (anchor) out.set(id, { x: anchor.x, lane: anchor.lane, cls });
  }
  return out;
}

export function streetPieces(level, owned, tiers = {}) {
  const pieces = [];
  BUILDINGS.forEach((b, i) => {
    if (level >= b.lv) pieces.push({ id: b.id, kind: "building", slot: BUILDING_SLOTS[i], laneY: 0.86 });
  });
  for (const [id, a] of assignDecoAnchors(owned)) {
    const lane = LANES[a.lane];
    pieces.push({
      id, kind: "deco", slot: a.x, tier: tiers[id] || 1,
      laneY: lane.laneY, scale: CLASS_SIZE[a.cls] * lane.laneScale,
    });
  }
  // Painter's order for the caller: farthest ground line first, then x.
  return pieces.sort((a, b) => (a.laneY - b.laneY) || (a.slot - b.slot));
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
