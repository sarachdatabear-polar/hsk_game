"use strict";
// Player profile derivations. Pure: no DOM, storage, network, or Supabase.
// The profile stores only the player's chosen name; every progress/collection
// number is derived from the existing authoritative game state.
import { isMastered } from "./mastery.js";

export function defaultProfile() {
  return { displayName: "" };
}

export function normalizeDisplayName(value, maxLength = 24) {
  const limit = Math.max(0, Math.floor(Number(maxLength) || 0));
  const clean = String(value || "").trim().replace(/\s+/gu, " ");
  // Segment by user-perceived characters when available so Thai combining
  // marks and emoji sequences are never cut in half. Array.from is the safe
  // older-WebView fallback (at least preserves surrogate pairs).
  const chars = typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
    ? [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(clean)].map(x => x.segment)
    : Array.from(clean);
  return chars.slice(0, limit).join("");
}

export function profileStats({ levels, mastery, stickerState, stickerDefs, shop, catalog } = {}) {
  const words = new Map();
  for (const levelWords of Object.values(levels || {})) {
    for (const word of levelWords || []) {
      if (word && word.h && !words.has(word.h)) words.set(word.h, word);
    }
  }

  let seenWords = 0;
  let masteredWords = 0;
  const masteryStore = mastery || {};
  for (const hanzi of words.keys()) {
    if (masteryStore[hanzi]) seenWords++;
    if (isMastered(masteryStore, hanzi)) masteredWords++;
  }

  const stickerIds = new Set((stickerDefs || []).map(d => d && d.id).filter(Boolean));
  const earnedIds = new Set(Object.keys((stickerState && stickerState.earned) || {}));
  let earnedStickers = 0;
  for (const id of stickerIds) if (earnedIds.has(id)) earnedStickers++;

  const collectibles = (catalog || []).filter(item => item && item.type !== "consumable");
  const collectibleIds = new Set(collectibles.map(item => item.id));
  const ownedIds = new Set((shop && shop.owned) || []);
  let ownedCosmetics = 0;
  for (const id of collectibleIds) if (ownedIds.has(id)) ownedCosmetics++;

  return {
    totalWords: words.size,
    seenWords,
    masteredWords,
    totalStickers: stickerIds.size,
    earnedStickers,
    totalCosmetics: collectibleIds.size,
    ownedCosmetics,
  };
}

export function equippedSummary(shop, catalog) {
  const state = shop || {};
  const owned = new Set(state.owned || []);
  const items = catalog || [];
  const equipped = type => {
    const id = state[type];
    const item = id && owned.has(id) ? items.find(it => it.id === id && it.type === type) : null;
    return item ? { id: item.id, name: item.name } : null;
  };
  return {
    skin: equipped("skin"),
    backdrop: equipped("backdrop"),
    effect: equipped("effect"),
    soundpack: equipped("soundpack"),
  };
}
