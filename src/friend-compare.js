"use strict";
// Friend compare — share a compact "score card" as a code/link and compare it
// with your own, with NO accounts and NO social graph. Pure: no DOM, storage,
// network, or Supabase. The card carries only derived, non-identifying progress
// numbers plus the player's chosen display name.
//
// Codec: a delimited string `LCH1|<name>|<level>|<streak>|<mastered>|<stickers>`.
// The name is percent-encoded; `encodeURIComponent` output never contains `|`
// (it escapes it to %7C), so `|` is a safe delimiter even for Thai/emoji names.
// This is env-agnostic (no base64/btoa) so it runs identically in the WebView
// and under vitest.

import { normalizeDisplayName } from "./profile.js";

const PREFIX = "LCH1";
const SEP = "|";
const MAX_NAME = 24;

// card: { name, level, streak, mastered, stickers }
export function encodeFriendCard(card = {}) {
  const c = normalizeCard(card);
  return [
    PREFIX,
    encodeURIComponent(c.name),
    c.level,
    c.streak,
    c.mastered,
    c.stickers,
  ].join(SEP);
}

// Returns a normalized card, or null when the payload is missing/malformed.
export function decodeFriendCard(payload) {
  if (typeof payload !== "string") return null;
  const parts = payload.trim().split(SEP);
  if (parts.length !== 6 || parts[0] !== PREFIX) return null;
  let name;
  try { name = decodeURIComponent(parts[1]); } catch { return null; }
  const nums = parts.slice(2).map(n => Number(n));
  if (nums.some(n => !Number.isFinite(n))) return null;
  return normalizeCard({
    name,
    level: nums[0], streak: nums[1], mastered: nums[2], stickers: nums[3],
  });
}

// A shareable deep link that reopens straight into the compare view.
export function friendShareLink(origin, card) {
  return `${String(origin || "")}#f=${encodeURIComponent(encodeFriendCard(card))}`;
}

// Pull an incoming card out of a URL hash like `...#f=<encoded>`. Null if absent.
export function friendCardFromHash(hash) {
  const m = /[#&]f=([^&]+)/.exec(String(hash || ""));
  if (!m) return null;
  let payload;
  try { payload = decodeURIComponent(m[1]); } catch { return null; }
  return decodeFriendCard(payload);
}

// Compare my card against a friend's. Returns per-metric rows with a winner
// flag; the screen resolves `key` -> a localized label so this stays i18n-free.
const METRICS = ["level", "streak", "mastered", "stickers"];
export function buildFriendCompare(mine, theirs) {
  const m = normalizeCard(mine);
  const t = normalizeCard(theirs);
  const rows = METRICS.map(key => {
    const a = m[key], b = t[key];
    return { key, mine: a, theirs: b, winner: a === b ? "tie" : (a > b ? "mine" : "theirs") };
  });
  const wins = rows.filter(r => r.winner === "mine").length;
  const losses = rows.filter(r => r.winner === "theirs").length;
  return {
    theirName: t.name,
    rows,
    lead: wins === losses ? "tie" : (wins > losses ? "mine" : "theirs"),
  };
}

function normalizeCard(card = {}) {
  return {
    name: clampName(card.name),
    level: clampInt(card.level),
    streak: clampInt(card.streak),
    mastered: clampInt(card.mastered),
    stickers: clampInt(card.stickers),
  };
}

function clampInt(v) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function clampName(v) {
  // Grapheme-aware: name entry (profile.js) allows 24 user-perceived
  // characters, so a plain .slice(0, MAX_NAME) in UTF-16 code units can cut a
  // surrogate pair in half (e.g. a name ending in an emoji), leaving a lone
  // surrogate that later throws `URIError` out of encodeURIComponent. Reuse
  // the same grapheme clamp profile.js uses for name entry.
  return normalizeDisplayName(v, MAX_NAME);
}
