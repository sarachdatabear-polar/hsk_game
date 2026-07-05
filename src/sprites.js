"use strict";
/* Image registry - each sprite is preloaded fire-and-forget so it never
   blocks the game loop. sprite(name) returns the Image only once it is
   fully loaded; otherwise returns null so every draw site can use its
   vector/canvas fallback instead. Works on file:// because the registry is
   static and does not fetch JSON at runtime. */

const REGISTRY = {};

export const SPRITE_NAMES = [
  "cat-walk", "cat-happy",
  "cat-midnight-walk", "cat-midnight-happy",
  "cat-sakura-walk", "cat-sakura-happy",
  "cat-jade-walk", "cat-jade-happy",
  "cat-gold-walk", "cat-gold-happy",
  "cat-boss-walk", "cat-boss-happy",
  "cat-portrait",
  "maneki", "coin",
  "bg-home", "bg-battle", "bg-market", "bg-results",
  "bg-temple", "bg-bamboo",
  "ui-panel", "ui-word-plaque",
  "ui-button-primary", "ui-button-secondary", "ui-button-neutral",
  "ui-badge", "ui-progress-track", "ui-progress-fill",
  "fx-correct", "fx-wrong", "fx-critical", "fx-level-up", "fx-new-best",
];

export function loadSprites() {
  for (const name of SPRITE_NAMES) {
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
