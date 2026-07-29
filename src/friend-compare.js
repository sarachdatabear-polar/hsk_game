"use strict";
// Friend compare — share a compact "score card" as a code/link and compare it
// with your own, with NO accounts and NO social graph. Pure: no DOM, storage,
// network, or Supabase. The card carries only derived, non-identifying progress
// numbers plus the player's chosen display name.
//
// Codec: a delimited string, three versions accepted on decode:
//   LCH1|<name>|<level>|<streak>|<mastered>|<stickers>                          (legacy, 6 parts)
//   LCH2|<name>|<level>|<streak>|<mastered>|<stickers>|<avatar>|<day>           (legacy, 8 parts)
//   LCH3|<name>|<level>|<streak>|<mastered>|<stickers>|<avatar>|<day>|<supporter> (current, 9 parts)
// encodeFriendCard always emits LCH3; decodeFriendCard accepts all three, so
// codes minted before each version shipped keep working (missing fields
// default: avatar "", day 0, supporter false). <supporter> is "1"/"0";
// decode is lenient (anything but "1" -> false).
// The name is percent-encoded; `encodeURIComponent` output never contains `|`
// (it escapes it to %7C), so `|` is a safe delimiter even for Thai/emoji names.
// `avatar` is written raw (not percent-encoded) — safe only because it's
// gated through the AVATAR_CAT_IDS allowlist to "" or a kebab-case id with no
// `|`/whitespace; see the "no avatar id can break the pipe wire" test.
// This is env-agnostic (no base64/btoa) so it runs identically in the WebView
// and under vitest.

import { normalizeDisplayName } from "./profile.js";
import { AVATAR_CAT_IDS } from "./avatar.js";   // wire-field allowlist only

const PREFIX_V1 = "LCH1";
const PREFIX_V2 = "LCH2";
const PREFIX_V3 = "LCH3";
const SEP = "|";
const MAX_NAME = 24;
// Sanity ceiling for the card's mint day (epoch day 100000 ≈ year 2243).
// Resolves §5 vs §13 of the spec: "1e99" is garbage -> 0 ("unknown"), not a
// finite-but-absurd freshness. Exported for the friend-recent tests.
export const MAX_CARD_DAY = 100000;

// card: { name, level, streak, mastered, stickers, avatar, day, supporter }
// ALWAYS emits LCH3 (9 parts). normalizeFriendCard re-applies the avatar
// allowlist, so a hand-built card with a bogus avatar encodes as "".
export function encodeFriendCard(card = {}) {
  const c = normalizeFriendCard(card);
  return [
    PREFIX_V3,
    encodeURIComponent(c.name),
    c.level,
    c.streak,
    c.mastered,
    c.stickers,
    c.avatar,
    c.day,
    c.supporter ? 1 : 0,
  ].join(SEP);
}

// Triple-decode: LCH1 with exactly 6 parts (avatar "", day 0, supporter
// false), LCH2 with exactly 8 (supporter false), or LCH3 with exactly 9.
// Any other count/prefix combination -> null. Stat fields stay STRICT
// (non-finite -> null); avatar/day/supporter are presentational and decode
// LENIENTLY — a mangled trailing field must not throw away a valid card.
export function decodeFriendCard(payload) {
  if (typeof payload !== "string") return null;
  const parts = payload.trim().split(SEP);
  const v3 = parts.length === 9 && parts[0] === PREFIX_V3;
  const v2 = parts.length === 8 && parts[0] === PREFIX_V2;
  const v1 = parts.length === 6 && parts[0] === PREFIX_V1;
  if (!v1 && !v2 && !v3) return null;
  let name;
  try { name = decodeURIComponent(parts[1]); } catch { return null; }
  const nums = parts.slice(2, 6).map(n => Number(n));
  if (nums.some(n => !Number.isFinite(n))) return null;
  return normalizeFriendCard({
    name,
    level: nums[0], streak: nums[1], mastered: nums[2], stickers: nums[3],
    avatar: v1 ? "" : parts[6],
    day: v1 ? 0 : Number(parts[7]),
    supporter: v3 ? parts[8] === "1" : false,   // LENIENT: anything but "1" -> false
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
export function buildFriendCompare(mine, theirs, todayDay = 0) {
  const m = normalizeFriendCard(mine);
  const t = normalizeFriendCard(theirs);
  const rows = METRICS.map(key => {
    const a = m[key], b = t[key];
    return { key, mine: a, theirs: b, winner: a === b ? "tie" : (a > b ? "mine" : "theirs") };
  });
  const wins = rows.filter(r => r.winner === "mine").length;
  const losses = rows.filter(r => r.winner === "theirs").length;
  return {
    theirName: t.name,
    theirAvatar: t.avatar,          // "" | CatId — already allowlist-validated
    theirSupporter: t.supporter,    // display attribute, NOT a compared metric
    ageDays: cardAgeDays(t, todayDay),
    rows,
    lead: wins === losses ? "tie" : (wins > losses ? "mine" : "theirs"),
  };
}

// Exported (was the private normalizeCard): friend-recent.js re-normalizes
// stored cards through the exact same rules the codec uses.
export function normalizeFriendCard(card) {
  const c = card || {};
  return {
    name: clampName(c.name),
    level: clampInt(c.level),
    streak: clampInt(c.streak),
    mastered: clampInt(c.mastered),
    stickers: clampInt(c.stickers),
    avatar: AVATAR_CAT_IDS.includes(c.avatar) ? c.avatar : "",
    day: clampDay(c.day),
    supporter: c.supporter === true || c.supporter === 1 || c.supporter === "1",
  };
}

function clampDay(v) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 && n <= MAX_CARD_DAY ? n : 0;
}

// "YYYY-MM-DD" -> days since epoch (same UTC-parse trick as shop.js
// dayIndex, so device timezone never shifts the day). Garbage -> 0.
export function epochDay(dateStr) {
  const n = Math.floor(Date.parse(String(dateStr || "") + "T00:00:00Z") / 86400000);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// Freshness with clamping: unknown mint day (LCH1) or no today reference ->
// null; a future card (clock skew between the two phones) -> 0 ("today"),
// never negative.
export function cardAgeDays(card, todayDay) {
  const day = clampDay(card && card.day);
  if (!day || !todayDay) return null;
  return Math.max(0, todayDay - day);
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
