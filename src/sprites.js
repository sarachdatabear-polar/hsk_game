"use strict";
/* Image registry - each sprite is preloaded fire-and-forget so it never
   blocks the game loop. sprite(name) returns the Image only once it is
   fully loaded; otherwise returns null so every draw site can use its
   vector fallback instead. Works on file:// (no CORS needed). */

const REGISTRY = {};

export function loadSprites() {
  const NAMES = [
    "cat-walk", "cat-happy",
    "cat-midnight-walk", "cat-midnight-happy",
    "cat-sakura-walk", "cat-sakura-happy",
    "cat-jade-walk", "cat-jade-happy",
    "cat-gold-walk", "cat-gold-happy",
    "cat-boss-walk", "cat-boss-happy",
    "bg-market", "bg-temple", "bg-bamboo",
    "maneki", "coin",
  ];
  for (const name of NAMES) {
    const img = new Image();
    img.src = "assets/" + name + ".png";
    REGISTRY[name] = img;
  }
}

export function sprite(name) {
  const img = REGISTRY[name];
  if (!img) return null;
  if (!img.complete || !img.naturalWidth) return null;
  return img;
}
