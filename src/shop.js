"use strict";
// Lucky Shop — pure module, no DOM/localStorage. Caller owns persistence.


export const CATALOG = [
  { id: "market",   name: "Night Market", price: 1000, type: "backdrop" },
  { id: "temple",   name: "Temple Dawn",  price: 2000, type: "backdrop" },
  { id: "bamboo",   name: "Bamboo",       price: 3000, type: "backdrop" },
  { id: "sakura-fx",      name: "Sakura Petals", price: 2000, type: "effect" },
  { id: "firecracker-fx", name: "Firecrackers",  price: 3500, type: "effect" },
  { id: "bells",  name: "Temple Bells", price: 2500, type: "soundpack" },
  { id: "arcade", name: "Arcade",       price: 4000, type: "soundpack" },
  { id: "streak-freeze", name: "Streak Freeze", price: 600, type: "consumable", cap: 2 },
  // ---- v7 permanent prestige band (PRD v7 F1) ----
  { id: "panda",     name: "Panda",     price: 8000,  type: "skin" },
  { id: "ninja",     name: "Ninja",     price: 12000, type: "skin" },
  { id: "astronaut", name: "Astronaut", price: 20000, type: "skin" },
  { id: "harbor-night",  name: "Harbor Night",  price: 6000, type: "backdrop" },
  { id: "snow-festival", name: "Snow Festival", price: 8000, type: "backdrop" },
  { id: "lion-drum",       name: "Lion Dance Drum",  price: 4500, type: "soundpack" },
  { id: "star-shower",     name: "Star Shower",      price: 3000, type: "effect" },
  // ---- v7 Season Corner (F3) — buyable only inside the season window ----
  { id: "beach",            name: "Beach Cat",        price: 12000, type: "skin",     season: "summer" },
  { id: "island-sunset",    name: "Island Sunset",    price: 8000,  type: "backdrop", season: "summer" },
  { id: "mooncake-rabbit",  name: "Mooncake Rabbit",  price: 15000, type: "skin",     season: "midautumn" },
  { id: "lantern-festival", name: "Lantern Festival", price: 9000,  type: "backdrop", season: "midautumn" },
  { id: "dragon",           name: "Dragon",           price: 25000, type: "skin",     season: "cny" },
  { id: "dragon-gate",      name: "Dragon Gate",      price: 10000, type: "backdrop", season: "cny" },
];

// `filter` recolors the real cat sprite (ctx.filter); the hex palette is only
// the vector-fallback look used before the PNG finishes loading.
export const SKIN_PALETTES = {
  panda:     { sprite: "cat-panda", body: "#f4f4f0", head: "#ffffff", ear: "#26262c", inner: "#3a3a40", leg: "#26262c",
               filter: "grayscale(1) brightness(1.32) contrast(1.08)" },
  ninja:     { sprite: "cat-ninja", body: "#23233a", head: "#2c2c46", ear: "#2c2c46", inner: "#c1272d", leg: "#16162a",
               filter: "grayscale(.85) brightness(.45)" },
  astronaut: { sprite: "cat-astronaut", body: "#e8ecf4", head: "#f4f7fd", ear: "#f4f7fd", inner: "#4a7fd4", leg: "#b8c2d4",
               filter: "grayscale(.9) brightness(1.35)" },
  beach:     { sprite: "cat-beach", body: "#f3b23e", head: "#ffd27a", ear: "#ffd27a", inner: "#2aa8c4", leg: "#d08a20",
               filter: "saturate(1.4) brightness(1.2) hue-rotate(10deg)" },
  "mooncake-rabbit": { sprite: "cat-mooncake", body: "#efe6da", head: "#f8f2e8", ear: "#f8f2e8", inner: "#c9a34e", leg: "#cbbfa8",
               filter: "sepia(.4) brightness(1.25)" },
  dragon:    { sprite: "cat-dragon", body: "#b3202a", head: "#c92f30", ear: "#c92f30", inner: "#f5c518", leg: "#7c1418",
               filter: "saturate(1.5) hue-rotate(-20deg) brightness(.95)" },
};

// ---- v7 availability (PRD v7 F2/F3). All date params are local "YYYY-MM-DD"
// strings (same convention as daily.js/quests.js); parsing uses the UTC trick
// so device timezone never shifts the day.
export const SEASONS = [
  { id: "summer",    label: "Summer",         from: [7, 1],  to: [8, 15] },
  { id: "midautumn", label: "Mid-Autumn",     from: [9, 1],  to: [10, 5] },
  { id: "cny",       label: "Lunar New Year", from: [1, 20], to: [2, 24] },
];

const dayIndex = dateStr => Math.floor(Date.parse(dateStr + "T00:00:00Z") / 86400000);


// The "Today's Picks" shelf: a deterministic date-based rotation over every
// currently obtainable cosmetic, skipping owned items until three real choices
// are found. Consumables are excluded — they are counted, not owned, and have
// their own buy path.
export function catJourneyStock(dateStr, shop) {
  if (!dateStr || !Number.isFinite(dayIndex(dateStr))) return [];
  const owned = new Set(Array.isArray(shop?.owned) ? shop.owned : []);
  const eligible = CATALOG.filter(item =>
    item.type !== "consumable"
    && isAvailable(item, dateStr));
  if (!eligible.length) return [];
  const day = dayIndex(dateStr);
  const types = ["skin", "backdrop", "effect", "soundpack"];
  const stock = [];
  // Lead with different categories so "Today's Picks" feels curated instead
  // of showing three adjacent backdrops/skins from catalog order.
  const typeStart = ((day % types.length) + types.length) % types.length;
  for (let typeOffset = 0; typeOffset < types.length && stock.length < 3; typeOffset++) {
    const type = types[(typeStart + typeOffset) % types.length];
    const group = eligible.filter(item => item.type === type);
    if (!group.length) continue;
    const itemStart = (((day + typeOffset) % group.length) + group.length) % group.length;
    for (let itemOffset = 0; itemOffset < group.length; itemOffset++) {
      const item = group[(itemStart + itemOffset) % group.length];
      if (!owned.has(item.id)) {
        stock.push(item.id);
        break;
      }
    }
  }
  // A collector may have exhausted one or more categories. Backfill from any
  // remaining eligible cosmetic so three choices still appear when possible.
  const start = (((day * 3) % eligible.length) + eligible.length) % eligible.length;
  for (let offset = 0; offset < eligible.length && stock.length < 3; offset++) {
    const item = eligible[(start + offset) % eligible.length];
    if (!owned.has(item.id) && !stock.includes(item.id)) stock.push(item.id);
  }
  return stock;
}

// [month,day] window containment; supports windows that wrap the new year.
function inWindow(dateStr, from, to) {
  const [, m, d] = dateStr.split("-").map(Number);
  const md = m * 100 + d, lo = from[0] * 100 + from[1], hi = to[0] * 100 + to[1];
  return lo <= hi ? md >= lo && md <= hi : md >= lo || md <= hi;
}

export function isAvailable(item, dateStr) {
  if (!item) return false;
  if (item.season) {
    if (!dateStr) return false;
    const s = SEASONS.find(s => s.id === item.season);
    return !!s && inWindow(dateStr, s.from, s.to);
  }
  return true;
}

// Days from dateStr to the next occurrence of [month,day] (always >= 1).
function daysUntil(dateStr, [m, d]) {
  const y = Number(dateStr.slice(0, 4));
  const today = dayIndex(dateStr);
  for (const year of [y, y + 1]) {
    const target = Math.floor(Date.UTC(year, m - 1, d) / 86400000);
    if (target > today) return target - today;
  }
  return 366; // unreachable
}

export function seasonStatus(dateStr) {
  const active = SEASONS.find(s => inWindow(dateStr, s.from, s.to)) || null;
  let next = null, best = Infinity;
  for (const s of SEASONS) {
    if (s === active) continue;
    const n = daysUntil(dateStr, s.from);
    if (n < best) { best = n; next = s; }
  }
  return { active, next, nextInDays: best };
}

function byId(id) { return CATALOG.find(it => it.id === id); }

export function defaultShop() {
  return { owned: [], skin: "", backdrop: "", effect: "", soundpack: "" };
}

export function canAfford(wallet, id) {
  const item = byId(id);
  return !!item && wallet >= item.price;
}

export function buy(wallet, shop, id, dateStr) {
  const item = byId(id);
  if (!item) return { ok: false, wallet, shop };
  // Tiering died with the Street decorations — `maxTier` was only ever set on
  // `type: "deco"` items, so every remaining catalog entry is a one-time buy.
  if (shop.owned.includes(id)) return { ok: false, wallet, shop };
  if (!isAvailable(item, dateStr)) return { ok: false, wallet, shop };
  if (wallet < item.price) return { ok: false, wallet, shop };
  return {
    ok: true,
    wallet: wallet - item.price,
    shop: { ...shop, owned: [...shop.owned, id] },
  };
}

// Consumables are counted, not owned: repurchase allowed below the item cap.
// buy()'s owned-check would permanently block a repurchase after the first
// (it treats any owned id as a one-time purchase), so a capped
// consumable needs its own pure path — never routed through buy()/owned/
// equipItem(). Caller owns persistence of the count (e.g. nbhsk.freezes).
export function buyConsumable(item, wallet, count) {
  if (!item || item.type !== "consumable") return { ok: false, reason: "not-consumable" };
  if (count >= item.cap) return { ok: false, reason: "cap" };
  if (wallet < item.price) return { ok: false, reason: "coins" };
  return { ok: true, wallet: wallet - item.price, count: count + 1 };
}

// type is only consulted when id is "" (clears that slot); for a real id the
// slot is looked up from the catalog, so callers normally omit it.
export function equipItem(shop, id, type) {
  if (!id) return type === "skin" || type === "backdrop" || type === "effect" || type === "soundpack" ? { ...shop, [type]: "" } : shop;
  const item = byId(id);
  if (!item || !shop.owned.includes(id)) return shop;
  return { ...shop, [item.type]: id };
}
