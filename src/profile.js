"use strict";
// Player profile derivations. Pure: no DOM, storage, network, or Supabase.
// The profile stores only the player's chosen name; every progress/collection
// number is derived from the existing authoritative game state.
import { isMastered } from "./mastery.js";
import { normalizeAvatar } from "./avatar.js";

export function defaultProfile() {
  return { displayName: "", avatar: { kind: "monogram" } };
}

function graphemes(value) {
  const text = String(value || "");
  // Segment by user-perceived characters when available so Thai combining
  // marks and emoji sequences are never split. Array.from is the safe older-
  // WebView fallback (at least preserves surrogate pairs).
  return typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
    ? [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].map(x => x.segment)
    : Array.from(text);
}

export function normalizeDisplayName(value, maxLength = 24) {
  const limit = Math.max(0, Math.floor(Number(maxLength) || 0));
  const clean = String(value || "").trim().replace(/\s+/gu, " ");
  return graphemes(clean).slice(0, limit).join("");
}

// The Profile avatar represents the player, not the Lucky Cat character.
// Return one user-perceived initial when the player has chosen a name; the UI
// renders a neutral person icon for an empty profile.
export function profileInitial(value) {
  const first = graphemes(normalizeDisplayName(value))[0] || "";
  return /^[a-z]$/i.test(first) ? first.toUpperCase() : first;
}

// One call replaces the Object.assign + normalizeDisplayName dance main.js
// used at boot. Tolerant of any input. The profile stays "the player's
// chosen name + chosen avatar VALUE" — the photo data URL never passes
// through here (own key, nbhsk.profilePhoto), and asset/ownership/wire
// concerns live in avatar.js.
export function normalizeProfile(raw) {
  return {
    displayName: normalizeDisplayName(raw && raw.displayName),
    avatar: normalizeAvatar(raw && raw.avatar),
  };
}

export function profileStats({
  levels, mastery, stickerState, stickerDefs, shop, catalog, hiddenCatalogTypes,
} = {}) {
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

  const hiddenTypes = new Set(hiddenCatalogTypes || []);
  const ownedIds = new Set((shop && shop.owned) || []);
  // Default Cat Journey hides Street decorations. Do not make those
  // unobtainable rows part of a fresh player's completion target, but retain
  // any one a returning player already owns so old progress is never erased.
  const collectibles = (catalog || []).filter(item =>
    item
    && item.type !== "consumable"
    && (!hiddenTypes.has(item.type) || ownedIds.has(item.id)));
  const collectibleIds = new Set(collectibles.map(item => item.id));
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

// Best Word Quest score across every scope the player has finished a session
// in. `best` is the persisted map of scope-key -> { score, date } (store key
// "best"); tolerant of missing/garbage entries so a corrupt row never NaNs
// the Profile.
export function bestSessionScore(best) {
  let top = 0;
  for (const entry of Object.values(best || {})) {
    const score = Number(entry && entry.score);
    if (Number.isFinite(score) && score > top) top = score;
  }
  return top;
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
