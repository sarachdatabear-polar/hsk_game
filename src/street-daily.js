"use strict";
// Street Daily Surprise — pure, positive-only return loop. A gift is a pure
// function of the day key (no RNG), so a reload on the same day shows the same
// gift and it cannot be farmed. Nothing here reads storage or the clock.
import { SKIN_PALETTES } from "./shop.js";

const NEIGHBOURS = Object.keys(SKIN_PALETTES);
const COIN_TIERS = [20, 30, 40, 50];

// Small deterministic string hash (djb2), same spirit as quests.js date-hashing.
function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function isNewDay(lastVisitDay, todayKey) {
  if (typeof todayKey !== "string" || !todayKey) return false;
  return todayKey !== lastVisitDay;
}

export function dailyGift(todayKey) {
  const h = hash(String(todayKey));
  return {
    coins: COIN_TIERS[h % COIN_TIERS.length],
    keepsake: (Math.floor(h / 7) % 4) === 0,          // ~1 in 4 days
    neighbour: NEIGHBOURS[Math.floor(h / 3) % NEIGHBOURS.length],
  };
}
