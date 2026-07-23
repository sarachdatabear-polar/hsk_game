"use strict";
// Street Collection — pure. Set membership + completion + book view model.
// Membership derives from DECO_META (street.js); prices/names from CATALOG
// (shop.js). Nothing here reads storage.
import { DECO_META, WELCOME_ID } from "./street.js";
import { CATALOG } from "./shop.js";

// Real collectible sets, in display order. The single earn-only `welcome`
// "set" is deliberately excluded from set-completion.
export const SET_IDS = ["market", "garden", "festival"];

const NAME = Object.fromEntries(CATALOG.map(i => [i.id, i.name]));
const PRICE = Object.fromEntries(CATALOG.map(i => [i.id, i.price]));

export function setMembers(setId) {
  if (!SET_IDS.includes(setId)) return [];
  return Object.keys(DECO_META).filter(id => id !== WELCOME_ID && DECO_META[id].set === setId);
}

export function completedSets(ownedIds) {
  const owned = new Set(ownedIds || []);
  return SET_IDS.filter(s => { const m = setMembers(s); return m.length > 0 && m.every(id => owned.has(id)); });
}

export function newlyCompletedSets(ownedIds, alreadyGranted = []) {
  const granted = new Set(alreadyGranted || []);
  return completedSets(ownedIds).filter(s => !granted.has(s));
}

export function collectionView(ownedIds, tiers = {}) {
  const owned = new Set(ownedIds || []);
  const complete = new Set(completedSets(ownedIds));
  return SET_IDS.map(set => ({
    set,
    complete: complete.has(set),
    items: setMembers(set).map(id => ({
      id, name: NAME[id] || id, price: PRICE[id] || 0,
      owned: owned.has(id), tier: (tiers && tiers[id]) || 1,
    })),
  }));
}
