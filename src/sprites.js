"use strict";
/* Lazy image registry. A canvas draw asks for the sprite it needs; the first
   request starts a fire-and-forget load and returns null so the existing
   vector fallback draws that frame. This avoids downloading every costume,
   season, shop tile, and street decoration on the Home screen. */

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
  "raccoon-walk", "raccoon-happy", "raccoon-wrong",
  "maneki", "coin", "lantern",
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
  "tile-arcade", "tile-lion-drum", "tile-streak-freeze",
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

export function createSpriteRegistry({ makeImage, onReady } = {}) {
  const images = {};
  const factory = makeImage || (() => typeof Image === "undefined" ? null : new Image());
  const notifyReady = onReady || (typeof window !== "undefined" && typeof CustomEvent !== "undefined"
    ? name => window.dispatchEvent(new CustomEvent("nbhsk:sprite-ready", { detail:{ name } }))
    : null);

  function load(name) {
    if (!SPRITE_NAMES.includes(name) || images[name]) return images[name] || null;
    const image = factory();
    if (!image) return null;
    if (notifyReady) {
      const ready = () => notifyReady(name, image);
      if (typeof image.addEventListener === "function") image.addEventListener("load", ready, { once:true });
      else image.onload = ready;
    }
    image.src = "assets/" + name + (SVG_SPRITES.has(name) ? ".svg" : ".png");
    images[name] = image;
    return image;
  }

  function preload(names = []) {
    for (const name of names) load(name);
  }

  function get(name) {
    const image = images[name] || load(name);
    if (!image || !image.complete || !image.naturalWidth) return null;
    return image;
  }

  return { loadSprites: preload, sprite: get };
}

const sprites = createSpriteRegistry();
export const loadSprites = sprites.loadSprites;
export const sprite = sprites.sprite;
