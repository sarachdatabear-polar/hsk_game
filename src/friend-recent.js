"use strict";
// Remembered-friends list state machine (last 5 compared cards). Pure: no
// DOM, storage, or Date — friend-screen.js persists the returned state under
// nbhsk.friends and decides WHEN a compare counts (policy: every successful
// compare). localStorage is attacker-writable on a shared device, so the
// read-normalizer re-runs every card through the codec's own clamps.
import { normalizeFriendCard, encodeFriendCard } from "./friend-compare.js";

export const RECENT_FRIENDS_LIMIT = 5;

export function defaultRecentFriends() {
  return { v: 1, items: [] };
}

export function normalizeRecentFriends(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) || !Array.isArray(raw.items)) {
    return defaultRecentFriends();
  }
  const items = [];
  for (const it of raw.items) {
    if (!it || typeof it !== "object") continue;
    items.push({ card: normalizeFriendCard(it.card), seenDay: clampDay(it.seenDay) });
    if (items.length >= RECENT_FRIENDS_LIMIT) break;
  }
  return { v: 1, items };
}

// Insert card at the FRONT. Dedup key: card.name when non-empty (exact match
// after the codec's grapheme clamp), else the full encoded card — so
// re-comparing the same friend updates their numbers and bumps them to the
// top instead of duplicating. Cap 5 (oldest drops). Pure: returns new state.
export function rememberFriend(state, card, seenDay) {
  const s = normalizeRecentFriends(state);
  const entry = { card: normalizeFriendCard(card), seenDay: clampDay(seenDay) };
  const keyOf = item => (item.card.name !== "" ? "n:" + item.card.name : "c:" + encodeFriendCard(item.card));
  const key = keyOf(entry);
  const items = [entry, ...s.items.filter(it => keyOf(it) !== key)].slice(0, RECENT_FRIENDS_LIMIT);
  return { v: 1, items };
}

export function clearRecentFriends() {
  return defaultRecentFriends();
}

function clampDay(v) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
}
