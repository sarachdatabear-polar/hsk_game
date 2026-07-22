"use strict";
// Lucky Shop — pure module, no DOM/localStorage. Caller owns persistence.

import { addDays } from "./daily.js";
import { defaultStreetLayout } from "./street.js";

export const CATALOG = [
  { id: "market",   name: "Night Market", price: 1000, type: "backdrop" },
  { id: "temple",   name: "Temple Dawn",  price: 2000, type: "backdrop" },
  { id: "bamboo",   name: "Bamboo",       price: 3000, type: "backdrop" },
  { id: "sakura-fx",      name: "Sakura Petals", price: 2000, type: "effect" },
  { id: "firecracker-fx", name: "Firecrackers",  price: 3500, type: "effect" },
  { id: "bells",  name: "Temple Bells", price: 2500, type: "soundpack" },
  { id: "arcade", name: "Arcade",       price: 4000, type: "soundpack" },
  { id: "red-lantern",  name: "Red Lantern",  price: 800,  type: "deco", maxTier: 3 },
  { id: "noodle-stall", name: "Noodle Stall",  price: 1500, type: "deco", maxTier: 3 },
  { id: "tea-sign",     name: "Tea Sign",      price: 2200, type: "deco", maxTier: 3 },
  { id: "foo-dog",      name: "Foo Dog",       price: 3000, type: "deco", maxTier: 3 },
  { id: "golden-arch",  name: "Golden Arch",   price: 5000, type: "deco", maxTier: 3 },
  { id: "streak-freeze", name: "Streak Freeze", price: 600, type: "consumable", cap: 2 },
  // ---- v7 permanent prestige band (PRD v7 F1) ----
  { id: "panda",     name: "Panda",     price: 8000,  type: "skin" },
  { id: "ninja",     name: "Ninja",     price: 12000, type: "skin" },
  { id: "astronaut", name: "Astronaut", price: 20000, type: "skin" },
  { id: "harbor-night",  name: "Harbor Night",  price: 6000, type: "backdrop" },
  { id: "snow-festival", name: "Snow Festival", price: 8000, type: "backdrop" },
  { id: "mahjong-table", name: "Mahjong Table", price: 4000, type: "deco", maxTier: 3 },
  { id: "koi-pond",      name: "Koi Pond",      price: 6000, type: "deco", maxTier: 3 },
  { id: "drum-tower",    name: "Drum Tower",    price: 9000, type: "deco", maxTier: 3 },
  // ---- v7 Today's Stock daily pool (F2) — buyable only while featured ----
  { id: "bubble-tea",      name: "Bubble Tea Stand", price: 2500, type: "deco", pool: "daily", maxTier: 3 },
  { id: "paper-umbrella",  name: "Paper Umbrella",   price: 1800, type: "deco", pool: "daily", maxTier: 3 },
  { id: "goldfish-banner", name: "Goldfish Banner",  price: 2200, type: "deco", pool: "daily", maxTier: 3 },
  { id: "neon-cat-sign",   name: "Neon Cat Sign",    price: 3500, type: "deco", pool: "daily", maxTier: 3 },
  { id: "lion-drum",       name: "Lion Dance Drum",  price: 4500, type: "soundpack", pool: "daily" },
  { id: "star-shower",     name: "Star Shower",      price: 3000, type: "effect",    pool: "daily" },
  // ---- v7 Season Corner (F3) — buyable only inside the season window ----
  { id: "beach",            name: "Beach Cat",        price: 12000, type: "skin",     season: "summer" },
  { id: "island-sunset",    name: "Island Sunset",    price: 8000,  type: "backdrop", season: "summer" },
  { id: "shaved-ice-cart",  name: "Shaved-Ice Cart",  price: 4500,  type: "deco",     season: "summer", maxTier: 3 },
  { id: "mooncake-rabbit",  name: "Mooncake Rabbit",  price: 15000, type: "skin",     season: "midautumn" },
  { id: "lantern-festival", name: "Lantern Festival", price: 9000,  type: "backdrop", season: "midautumn" },
  { id: "mooncake-stall",   name: "Mooncake Stall",   price: 5000,  type: "deco",     season: "midautumn", maxTier: 3 },
  { id: "dragon",           name: "Dragon",           price: 25000, type: "skin",     season: "cny" },
  { id: "dragon-gate",      name: "Dragon Gate",      price: 10000, type: "backdrop", season: "cny" },
  { id: "firecracker-arch", name: "Firecracker Arch", price: 6000,  type: "deco",     season: "cny", maxTier: 3 },
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

// Pure rotation, no RNG: slot i on day d = pool[(d*3 + i) % pool.length].
export function dailyStock(dateStr) {
  const pool = CATALOG.filter(i => i.pool === "daily");
  const d = dayIndex(dateStr);
  return [0, 1, 2].map(i => pool[(((d * 3 + i) % pool.length) + pool.length) % pool.length].id);
}

// Today's featured ids the player doesn't own yet — exactly what the
// Today's Stock shelf shows ([] = show the all-stocked-up empty state).
export function unownedDailyStock(dateStr, shop) {
  return dailyStock(dateStr).filter(id => !shop.owned.includes(id));
}

// Days until `id` is next featured (0 = today). null for non-pool ids.
export function nextFeaturedIn(id, dateStr) {
  const item = CATALOG.find(i => i.id === id);
  if (!item || item.pool !== "daily") return null;
  const cycle = Math.ceil(CATALOG.filter(i => i.pool === "daily").length / 3);
  for (let n = 0; n <= cycle; n++) {
    if (dailyStock(addDays(dateStr, n)).includes(id)) return n;
  }
  return null; // unreachable while the pool is non-empty
}

// [month,day] window containment; supports windows that wrap the new year.
function inWindow(dateStr, from, to) {
  const [, m, d] = dateStr.split("-").map(Number);
  const md = m * 100 + d, lo = from[0] * 100 + from[1], hi = to[0] * 100 + to[1];
  return lo <= hi ? md >= lo && md <= hi : md >= lo || md <= hi;
}

export function isAvailable(item, dateStr) {
  if (!item) return false;
  if (item.pool === "daily") return !!dateStr && dailyStock(dateStr).includes(item.id);
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
  return { owned: [], skin: "", backdrop: "", effect: "", soundpack: "", tiers: {},
           streetLayout: defaultStreetLayout() };
}

export function canAfford(wallet, id) {
  const item = byId(id);
  return !!item && wallet >= item.price;
}

// Next-tier price for a tierable item, or null when maxed / not tierable.
// tier 1 -> 2 costs 1.5x base; tier 2 -> 3 costs 2.5x base (PRD v7 F4).
export function upgradePrice(item, currentTier) {
  if (!item || !item.maxTier || currentTier >= item.maxTier) return null;
  return Math.round(item.price * (currentTier === 1 ? 1.5 : 2.5));
}

export function buy(wallet, shop, id, dateStr) {
  const item = byId(id);
  if (!item) return { ok: false, wallet, shop };
  if (shop.owned.includes(id)) {
    // Owned tierable deco -> tier upgrade. Availability is not re-checked:
    // once owned, seasonal/pool decos upgrade year-round (PRD v7 F4).
    if (item.type !== "deco" || !item.maxTier) return { ok: false, wallet, shop };
    const cur = (shop.tiers && shop.tiers[id]) || 1;
    const price = upgradePrice(item, cur);
    if (price === null || wallet < price) return { ok: false, wallet, shop };
    return {
      ok: true,
      wallet: wallet - price,
      shop: { ...shop, tiers: { ...(shop.tiers || {}), [id]: cur + 1 } },
    };
  }
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
// (it treats any owned non-deco id as a one-time purchase), so a capped
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
  if (item.type === "deco") return shop;   // decos have no slot — owning one displays it
  return { ...shop, [item.type]: id };
}
