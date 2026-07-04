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
export const DECO_IDS = ["red-lantern", "noodle-stall", "tea-sign", "foo-dog", "golden-arch"];

// 10 fixed slots (fraction of street width, left→right), interleaved so the
// street reads as spread-out rather than bunched even with only a couple of
// pieces: deco, building, deco, building, ... across the strip.
const BUILDING_SLOTS = [.18, .34, .5, .66, .82];
const DECO_SLOTS = [.10, .26, .42, .58, .74];

// Deterministic draw list for the given level/owned decos. Same inputs always
// produce the same array (order + slots), so callers can unit-test layout
// without any DOM/canvas involved.
export function streetPieces(level, owned) {
  const pieces = [];
  BUILDINGS.forEach((b, i) => {
    if (level >= b.lv) pieces.push({ id: b.id, kind: "building", slot: BUILDING_SLOTS[i] });
  });
  DECO_IDS.forEach((id, i) => {
    if (owned.includes(id)) pieces.push({ id, kind: "deco", slot: DECO_SLOTS[i] });
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
