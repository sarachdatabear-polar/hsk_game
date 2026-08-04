"use strict";
// Single authority on what an avatar value IS: which ids exist, who owns
// what, the wire encoding, and how an id becomes pixels (a pure CSS crop of
// the same happy sprite sheets used by the game). Pure: no DOM,
// storage, Date, or network. Imports neither profile.js nor
// friend-compare.js (they import us), so there are no cycles.
//
// Ownership is enforced at pick time (catAvatarChoices) and wire-encode time
// (wireAvatarId) ONLY — a *stored* {kind:"cat"} avatar is displayed even if
// shop.owned were transiently missing the id (ownership never lapses; the
// avatar must not flicker to monogram on an unloaded shop state). A *removed*
// id falls out via the allowlist in normalizeAvatar -> monogram.
import { SKIN_PALETTES } from "./shop.js";
import { SPRITE_METRICS } from "./sprite-metrics.js";

export const AVATAR_DEFAULT_CAT_ID = "lucky";
// "lucky" is a reserved id for the default cat (no SKIN_PALETTES entry).
// Its avatar comes from cat-happy so Home, Battle, Profile, the picker, and
// friend cards all show the same cream-and-orange book-holding character.
export const AVATAR_CAT_IDS = [AVATAR_DEFAULT_CAT_ID, ...Object.keys(SKIN_PALETTES)];

const SHEET_W = 1024;   // 4 frames of FRAME px
const FRAME = 256;

// Shape-only normalization: any input -> a valid Avatar (fresh object).
// Pixels for {kind:"photo"} are storage's business (nbhsk.profilePhoto).
export function normalizeAvatar(raw) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    if (raw.kind === "photo") return { kind: "photo" };
    if (raw.kind === "cat" && AVATAR_CAT_IDS.includes(raw.id)) return { kind: "cat", id: raw.id };
  }
  return { kind: "monogram" };
}

export function ownsCatAvatar(id, ownedIds) {
  if (id === AVATAR_DEFAULT_CAT_ID) return true;
  if (!AVATAR_CAT_IDS.includes(id)) return false;
  return Array.isArray(ownedIds) && ownedIds.includes(id);
}

export function catAvatarChoices(ownedIds) {
  return AVATAR_CAT_IDS.map(id => ({ id, locked: !ownsCatAvatar(id, ownedIds) }));
}

// THE id -> asset-sheet resolution. Never string-munges the id itself.
export function avatarSheetFor(avatar) {
  const a = normalizeAvatar(avatar);
  if (a.kind !== "cat") return null;
  if (a.id === AVATAR_DEFAULT_CAT_ID) return "cat-happy";
  return SKIN_PALETTES[a.id].sprite + "-happy";
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Pure CSS crop of frame 0's content box, element-size independent: a square
// (side = max(bw, bh), centered on the bbox, clamped into the 256px frame)
// expressed as percentage background geometry. Both axes divide by the same
// `side`, so sizePct stays 4:1 (uniform scale, no distortion); percent
// background-position is container-size independent, so one style serves the
// 112px hero circle, 64px picker tiles, and 36px friend rows.
export function avatarPortraitStyle(avatar) {
  const sheet = avatarSheetFor(avatar);
  if (!sheet) return null;
  const m = SPRITE_METRICS[sheet];
  const bw = m.r - m.l, bh = m.b - m.t;
  const side = Math.min(FRAME, Math.max(bw, bh));
  const cl = clamp((m.l + m.r) / 2 - side / 2, 0, FRAME - side);
  const ct = clamp((m.t + m.b) / 2 - side / 2, 0, FRAME - side);
  return {
    image: "assets/" + sheet + ".png",
    sizePct: [(SHEET_W * 100) / side, (FRAME * 100) / side],
    posPct: [
      side >= SHEET_W ? 0 : (cl * 100) / (SHEET_W - side),
      side >= FRAME ? 0 : (ct * 100) / (FRAME - side),
    ],
  };
}

// Wire encoding for the friend card: owned cat -> its id; photo/monogram/
// unowned/unknown -> "" (the approved photo -> monogram degrade).
export function wireAvatarId(avatar, ownedIds) {
  const a = normalizeAvatar(avatar);
  if (a.kind !== "cat") return "";
  return ownsCatAvatar(a.id, ownedIds) ? a.id : "";
}

// Wire decoding (UNTRUSTED input) — the only path a foreign avatar field may
// take toward pixels. Allowlisted id -> cat; anything else -> monogram.
export function avatarFromWireId(field) {
  return typeof field === "string" && AVATAR_CAT_IDS.includes(field)
    ? { kind: "cat", id: field }
    : { kind: "monogram" };
}
