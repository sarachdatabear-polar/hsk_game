"use strict";
// Lucky Shop — pure module, no DOM/localStorage. Caller owns persistence.

export const CATALOG = [
  { id: "midnight", name: "Midnight",  price: 500,  type: "skin" },
  { id: "sakura",   name: "Sakura",    price: 1500, type: "skin" },
  { id: "jade",     name: "Jade",      price: 2500, type: "skin" },
  { id: "gold",     name: "Gold",      price: 5000, type: "skin" },
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
  midnight: { sprite: "cat-midnight", body: "#2a2a30", head: "#35353c", ear: "#35353c", inner: "#6a6a78", leg: "#1c1c22",
              filter: "grayscale(1) brightness(.5)" },
  sakura:   { sprite: "cat-sakura", body: "#f6c6d8", head: "#fbdce8", ear: "#fbdce8", inner: "#e8608a", leg: "#e0a0b8",
              filter: "hue-rotate(300deg) saturate(.75) brightness(1.15)" },
  jade:     { sprite: "cat-jade", body: "#2f9e5a", head: "#3fbf70", ear: "#3fbf70", inner: "#eec94a", leg: "#1f7040",
              filter: "hue-rotate(85deg) saturate(.8)" },
  gold:     { sprite: "cat-gold", body: "#e3a80e", head: "#ffd75e", ear: "#ffd75e", inner: "#fff4e0", leg: "#9c6b00",
              filter: "saturate(1.6) brightness(1.25) contrast(1.05)" },
};

function byId(id) { return CATALOG.find(it => it.id === id); }

export function defaultShop() {
  return { owned: [], skin: "", backdrop: "", effect: "", soundpack: "" };
}

export function canAfford(wallet, id) {
  const item = byId(id);
  return !!item && wallet >= item.price;
}

export function buy(wallet, shop, id) {
  const item = byId(id);
  if (!item) return { ok: false, wallet, shop };
  if (shop.owned.includes(id)) return { ok: false, wallet, shop };
  if (wallet < item.price) return { ok: false, wallet, shop };
  return {
    ok: true,
    wallet: wallet - item.price,
    shop: { ...shop, owned: [...shop.owned, id] },
  };
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
