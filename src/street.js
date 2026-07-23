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

// Draw-box scale for the five authored milestone landmark cutouts. The source
// PNGs include a little transparent breathing room, so these values keep the
// visible silhouettes readable without colliding across the five fixed slots.
export const LANDMARK_SCALE = {
  "lantern-post": 3.0,
  "coin-bank": 2.85,
  "tailor": 3.15,
  "kitten-cafe": 3.15,
  "emperor-gate": 3.35,
};

// Display order for owned decorations; ids owned but absent here are ignored.
// v7 adds the permanent prestige decos, the daily-pool decos, and the three
// seasonal decos (order fixes each one's street slot below).
export const DECO_IDS = [
  "red-lantern", "noodle-stall", "tea-sign", "foo-dog", "golden-arch",
  "mahjong-table", "koi-pond", "drum-tower",
  "bubble-tea", "paper-umbrella", "goldfish-banner", "neon-cat-sign",
  "shaved-ice-cart", "mooncake-stall", "firecracker-arch",
];

// Street v2 grants one earn-only starter decoration after the first completed
// learning session. It deliberately lives outside the coin catalog (and thus
// outside DECO_IDS); its art reuses the red-lantern sprite with a welcome
// ribbon drawn by the caller.
export const WELCOME_ID = "welcome-lantern";

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

// Purchase-value metadata shared by Street, Shop previews, accessibility
// labels and behavior FX. Descriptions themselves stay in i18n.js.
export const DECO_META = {
  "red-lantern":      { cls: "small",   set: "market",   behavior: "light" },
  "noodle-stall":     { cls: "large",   set: "market",   behavior: "food" },
  "tea-sign":         { cls: "medium",  set: "market",   behavior: "light" },
  "foo-dog":          { cls: "small",   set: "garden",   behavior: "celebrate" },
  "golden-arch":      { cls: "gateway", set: "festival", behavior: "celebrate" },
  "mahjong-table":    { cls: "medium",  set: "market",   behavior: "celebrate" },
  "koi-pond":         { cls: "medium",  set: "garden",   behavior: "water" },
  "drum-tower":       { cls: "large",   set: "festival", behavior: "celebrate" },
  "bubble-tea":       { cls: "medium",  set: "market",   behavior: "food" },
  "paper-umbrella":   { cls: "small",   set: "garden",   behavior: "flutter" },
  "goldfish-banner":  { cls: "small",   set: "garden",   behavior: "flutter" },
  "neon-cat-sign":    { cls: "medium",  set: "market",   behavior: "light" },
  "shaved-ice-cart":  { cls: "large",   set: "festival", behavior: "food" },
  "mooncake-stall":   { cls: "large",   set: "festival", behavior: "food" },
  "firecracker-arch": { cls: "gateway", set: "festival", behavior: "celebrate" },
  [WELCOME_ID]:        { cls: "small",   set: "welcome",  behavior: "light", spriteId: "red-lantern" },
};

export function streetMeta(id) { return DECO_META[id] || null; }
export function streetClass(id) { return DECO_META[id]?.cls || DECO_CLASS[id] || null; }
export const CLASS_SIZE = { gateway: 1.6, large: 1.25, medium: 1.0, small: 0.8 };
// PNG deco draw box, as a multiple of the deco basis (main.js renderStreet uses
// it, bottom-anchored). The largest a deco draws — the vector fallback is
// smaller.
export const DECO_SPRITE_SCALE = 1.5;
// streetMetrics' w-bound unit as a fraction of width (unit = min(h*.30, w*.105)).
export const UNIT_FRAC = 0.105;
// laneY = the piece's ground line as a fraction of street height (1.0 is the
// front ground line main.js draws on); laneScale shrinks pieces with
// distance. The wider lane gaps keep the compact one-screen editor tappable.
export const LANES = {
  back:  { laneY: 0.66, laneScale: 0.68 },
  mid:   { laneY: 0.83, laneScale: 0.84 },
  front: { laneY: 1.0,  laneScale: 1.0  },
};

// Street v2 plot ids remain stable for saved layouts, but their coordinates
// form a compact three-depth diorama that fits one viewport. Exact-size plots
// leave a little breathing room: the 15 catalog items + Welcome Lantern occupy
// 16 of 18 homes when auto-arranged.
export const STREET_PLOTS = [
  // Back lane: large silhouettes and gateways frame the distant road.
  { id: "plot-large-01",   x: 0.08, lane: "back", size: "large" },
  { id: "plot-gateway-01", x: 0.25, lane: "back", size: "gateway" },
  { id: "plot-large-02",   x: 0.42, lane: "back", size: "large" },
  { id: "plot-small-01",   x: 0.58, lane: "back", size: "small" },
  { id: "plot-gateway-02", x: 0.75, lane: "back", size: "gateway" },
  { id: "plot-large-03",   x: 0.92, lane: "back", size: "large" },
  // middle lane
  { id: "plot-large-04",   x: 0.07, lane: "mid", size: "large" },
  { id: "plot-medium-01",  x: 0.23, lane: "mid", size: "medium" },
  { id: "plot-medium-02",  x: 0.39, lane: "mid", size: "medium" },
  { id: "plot-medium-03",  x: 0.56, lane: "mid", size: "medium" },
  { id: "plot-medium-04",  x: 0.73, lane: "mid", size: "medium" },
  { id: "plot-large-05",   x: 0.92, lane: "mid", size: "large" },
  // Front lane is staggered so its touch targets remain distinct from mid.
  { id: "plot-medium-05",  x: 0.12, lane: "front", size: "medium" },
  { id: "plot-medium-06",  x: 0.29, lane: "front", size: "medium" },
  { id: "plot-small-02",   x: 0.45, lane: "front", size: "small" },
  { id: "plot-small-03",   x: 0.59, lane: "front", size: "small" },
  { id: "plot-small-04",   x: 0.75, lane: "front", size: "small" },
  { id: "plot-small-05",   x: 0.91, lane: "front", size: "small" },
];

export const STREET_LAYOUT_VERSION = 2;

export function defaultStreetLayout() {
  return { v: STREET_LAYOUT_VERSION, placements: {}, welcomeOwned: false, coachDone: false };
}

const SIZE_RANK = { small: 0, medium: 1, large: 2, gateway: 3 };
const LANE_RANK = { back: 0, mid: 1, front: 2 };

export function itemFitsPlot(itemId, plotOrId) {
  const cls = streetClass(itemId);
  const plot = typeof plotOrId === "string" ? STREET_PLOTS.find(p => p.id === plotOrId) : plotOrId;
  if (!cls || !plot) return false;
  if (cls === "gateway") return plot.size === "gateway";
  if (plot.size === "gateway") return false;
  return SIZE_RANK[plot.size] >= SIZE_RANK[cls];
}

export function streetOwnedIds(ownedIds, layout) {
  const out = DECO_IDS.filter(id => (ownedIds || []).includes(id));
  if (layout?.welcomeOwned) out.push(WELCOME_ID);
  return out;
}

// Canonicalize untrusted/legacy layout data. Invalid, duplicate, unowned and
// incompatible placements are dropped into inventory by omission; ownership
// itself is never touched here.
export function normalizeStreetLayout(layout, ownedIds = []) {
  const raw = layout && typeof layout === "object" ? layout : {};
  const out = {
    v: STREET_LAYOUT_VERSION,
    placements: {},
    welcomeOwned: !!raw.welcomeOwned,
    coachDone: !!raw.coachDone,
  };
  const allowed = new Set(streetOwnedIds(ownedIds, out));
  const used = new Set();
  const placements = raw.placements && typeof raw.placements === "object" ? raw.placements : {};
  for (const plot of STREET_PLOTS) {
    const id = placements[plot.id];
    if (!allowed.has(id) || used.has(id) || !itemFitsPlot(id, plot)) continue;
    out.placements[plot.id] = id;
    used.add(id);
  }
  return out;
}

export function compatibleStreetPlots(itemId, layout, { includeOccupied = true } = {}) {
  const occupied = layout?.placements || {};
  return STREET_PLOTS.filter(p => itemFitsPlot(itemId, p) && (includeOccupied || !occupied[p.id]));
}

// First FREE compatible plot for itemId, or null when every compatible plot
// is occupied (or the item fits no plot at all). Exact-size plots are
// preferred over merely-compatible larger ones, mirroring autoArrangeStreet's
// placement preference. Callers use this to decide Buy & Place vs. Buy to
// Inventory: null means the item can only land in inventory right now.
export function firstFreeStreetPlot(itemId, layout) {
  const free = compatibleStreetPlots(itemId, layout, { includeOccupied: false });
  return free.find(p => p.size === streetClass(itemId))?.id || free[0]?.id || null;
}

export function unplacedStreetItems(ownedIds, layout) {
  const l = normalizeStreetLayout(layout, ownedIds);
  const placed = new Set(Object.values(l.placements));
  return streetOwnedIds(ownedIds, l).filter(id => !placed.has(id));
}

// Move or place an item. An occupied target swaps only when the displaced item
// fits the selected item's former plot; otherwise the operation is rejected.
export function placeStreetItem(layout, ownedIds, itemId, plotId) {
  const l = normalizeStreetLayout(layout, ownedIds);
  const target = STREET_PLOTS.find(p => p.id === plotId);
  if (!streetOwnedIds(ownedIds, l).includes(itemId) || !itemFitsPlot(itemId, target)) return l;
  const sourceId = Object.keys(l.placements).find(id => l.placements[id] === itemId) || null;
  if (sourceId === plotId) return l;
  const displaced = l.placements[plotId] || null;
  if (displaced && (!sourceId || !itemFitsPlot(displaced, sourceId))) return l;
  const next = { ...l, placements: { ...l.placements } };
  if (sourceId) delete next.placements[sourceId];
  if (displaced) next.placements[sourceId] = displaced;
  next.placements[plotId] = itemId;
  return normalizeStreetLayout(next, ownedIds);
}

export function storeStreetItem(layout, ownedIds, itemId) {
  const l = normalizeStreetLayout(layout, ownedIds);
  const next = { ...l, placements: { ...l.placements } };
  const sourceId = Object.keys(next.placements).find(id => next.placements[id] === itemId);
  if (sourceId) delete next.placements[sourceId];
  return next;
}

// Largest/most constrained items are placed first; an exact-size plot wins
// over a merely compatible larger plot. Valid existing placements remain put.
export function autoArrangeStreet(ownedIds, layout = defaultStreetLayout()) {
  const base = normalizeStreetLayout(layout, ownedIds);
  const next = { ...base, placements: { ...base.placements } };
  const placed = new Set(Object.values(next.placements));
  const ids = streetOwnedIds(ownedIds, next)
    .filter(id => !placed.has(id))
    .sort((a, b) => (SIZE_RANK[streetClass(b)] - SIZE_RANK[streetClass(a)])
      || streetOwnedIds(ownedIds, next).indexOf(a) - streetOwnedIds(ownedIds, next).indexOf(b));
  for (const id of ids) {
    const cls = streetClass(id);
    const candidates = STREET_PLOTS.filter(p => !next.placements[p.id] && itemFitsPlot(id, p))
      .sort((a, b) => (a.size === cls ? -1 : 0) - (b.size === cls ? -1 : 0)
        || LANE_RANK[a.lane] - LANE_RANK[b.lane] || a.x - b.x);
    if (candidates[0]) next.placements[candidates[0].id] = id;
  }
  return normalizeStreetLayout(next, ownedIds);
}

// One-time v1→v2 migration: keep the old authored scene's approximate x/lane
// preference, then use auto-arrange for any remainder. Welcome stays in
// inventory so the placement coach can teach the new interaction.
export function migrateLegacyStreet(ownedIds, { welcomeOwned = false } = {}) {
  let next = { ...defaultStreetLayout(), welcomeOwned, placements: {} };
  const anchors = assignDecoAnchors(ownedIds || []);
  const migrationOrder = DECO_IDS.filter(id => anchors.has(id))
    .sort((a, b) => (SIZE_RANK[streetClass(b)] - SIZE_RANK[streetClass(a)])
      || DECO_IDS.indexOf(a) - DECO_IDS.indexOf(b));
  for (const id of migrationOrder) {
    const old = anchors.get(id);
    const candidates = STREET_PLOTS.filter(p => !next.placements[p.id] && itemFitsPlot(id, p));
    candidates.sort((a, b) => {
      const cls = streetClass(id);
      const da = (a.size === cls ? 0 : 1) + Math.abs(a.x - old.x) + Math.abs(LANE_RANK[a.lane] - LANE_RANK[old.lane]) * .12;
      const db = (b.size === cls ? 0 : 1) + Math.abs(b.x - old.x) + Math.abs(LANE_RANK[b.lane] - LANE_RANK[old.lane]) * .12;
      return da - db || a.x - b.x;
    });
    if (candidates[0]) next.placements[candidates[0].id] = id;
  }
  // Do not place the tutorial item until the player chooses a home (or skips).
  const arranged = autoArrangeStreet(ownedIds, { ...next, welcomeOwned: false });
  return normalizeStreetLayout({ ...arranged, welcomeOwned }, ownedIds);
}
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

export function streetPieces(level, owned, tiers = {}, layout = null) {
  const pieces = [];
  const buildingSlots = layout ? [.10, .30, .50, .70, .90] : BUILDING_SLOTS;
  BUILDINGS.forEach((b, i) => {
    if (level >= b.lv) pieces.push({
      id: b.id, kind: "building", slot: buildingSlots[i],
      laneY: layout ? 0.70 : 0.82, scale: LANDMARK_SCALE[b.id],
    });
  });
  if (layout) {
    const l = normalizeStreetLayout(layout, owned);
    for (const plot of STREET_PLOTS) {
      const id = l.placements[plot.id];
      if (!id) continue;
      const lane = LANES[plot.lane], meta = streetMeta(id);
      pieces.push({
        id, spriteId: meta?.spriteId || id, plotId: plot.id, behavior: meta?.behavior,
        kind: "deco", slot: plot.x, tier: tiers[id] || 1,
        laneY: lane.laneY, scale: CLASS_SIZE[streetClass(id)] * lane.laneScale,
      });
    }
  } else {
    for (const [id, a] of assignDecoAnchors(owned)) {
      const lane = LANES[a.lane];
      pieces.push({
        id, spriteId: id, kind: "deco", slot: a.x, tier: tiers[id] || 1,
        laneY: lane.laneY, scale: CLASS_SIZE[a.cls] * lane.laneScale,
      });
    }
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

// Compact one-screen world. Width always matches the viewport, while the
// smaller width-derived unit keeps all authored homes readable without
// horizontal navigation.
export function streetWorldMetrics(viewportW, h) {
  const vw = Math.max(1, Number(viewportW) || 1);
  const vh = Math.max(1, Number(h) || 1);
  return {
    worldW: vw,
    unit: Math.min(vh * 0.22, vw * 0.085),
    sections: 1,
    backY: 0.74,
    frontY: 1,
    backScale: 0.70,
  };
}
