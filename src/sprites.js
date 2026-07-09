"use strict";
/* Image registry - each sprite is preloaded fire-and-forget so it never
   blocks the game loop. sprite(name) returns the Image only once it is
   fully loaded; otherwise returns null so every draw site can use its
   vector/canvas fallback instead. Works on file:// because the registry is
   static and does not fetch JSON at runtime. */

const REGISTRY = {};

// bg-home is CSS-only (ships as WebP) — not a canvas sprite.
export const SPRITE_NAMES = [
  "cat-walk", "cat-happy",
  "cat-panda-walk", "cat-panda-happy",
  "cat-ninja-walk", "cat-ninja-happy",
  "cat-astronaut-walk", "cat-astronaut-happy",
  "cat-beach-walk", "cat-beach-happy",
  "cat-mooncake-walk", "cat-mooncake-happy",
  "cat-dragon-walk", "cat-dragon-happy",
  "cat-boss-walk", "cat-boss-happy",
  "raccoon-walk", "raccoon-happy",
  "maneki", "coin",
  "bg-quest", "bg-battle", "bg-market", "bg-street",
  "bg-temple", "bg-bamboo",
  "bg-harbor-night", "bg-snow-festival", "bg-island-sunset",
  "bg-lantern-festival", "bg-dragon-gate",
  // street decos — PNG art with a canvas (drawStreetDeco) vector fallback
  "deco-red-lantern", "deco-noodle-stall", "deco-tea-sign",
  "deco-foo-dog", "deco-golden-arch",
  "deco-mahjong-table", "deco-koi-pond", "deco-drum-tower",
  "deco-bubble-tea", "deco-paper-umbrella", "deco-goldfish-banner",
  "deco-neon-cat-sign", "deco-shaved-ice-cart", "deco-mooncake-stall",
  "deco-firecracker-arch",
  // shop effect/soundpack preview tiles (full-bleed painted art)
  "tile-sakura-fx", "tile-firecracker-fx", "tile-star-shower", "tile-bells",
  "fx-correct", "fx-wrong", "fx-critical", "fx-level-up",
  "vfx-orb-green", "vfx-orb-red", "vfx-orb-blue", "vfx-orb-gold",
  "ui-word-plaque",
];

// Effect stamps ship as SVG (crisp at any canvas scale); everything else is PNG.
const SVG_SPRITES = new Set([
  "fx-correct", "fx-wrong", "fx-critical", "fx-level-up",
  "vfx-orb-green", "vfx-orb-red", "vfx-orb-blue", "vfx-orb-gold",
  "ui-word-plaque",
]);

export function loadSprites() {
  for (const name of SPRITE_NAMES) {
    const img = new Image();
    img.src = "assets/" + name + (SVG_SPRITES.has(name) ? ".svg" : ".png");
    REGISTRY[name] = img;
  }
}

export function sprite(name) {
  const img = REGISTRY[name];
  if (!img) return null;
  if (!img.complete || !img.naturalWidth) return null;
  return img;
}
