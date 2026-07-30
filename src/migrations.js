"use strict";
import { normalizeCatJourney } from "./cat-journey.js";
import { normalizeAvatar } from "./avatar.js";
// Save-data schema versioning. main.js calls runMigrations(localStorage) once
// at boot, BEFORE constructing the store — migrations must see raw
// pre-migration values, so this module reads/writes storage directly.
//
// To change a stored shape: bump CURRENT_SCHEMA_VERSION and append one
// { to, up(storage) } entry to MIGRATIONS. Entries run in ascending order and
// each stamps its version as it lands, so a mid-ladder crash resumes (not
// re-runs) on the next boot. Local-only key — never add it to SYNC_KEYS.
//
// LADDER GAP 2..5 IS DELIBERATE (Street retirement, 2026-07-30) — the ladder is
// otherwise append-only, so read this before "restoring" them. Entries to:2..5
// existed solely to evolve the Street shape (streetLayout/streetProject) and
// imported street.js/street-project.js; keeping them would have kept the whole
// Street surface alive. They are removed rather than preserved because to:8
// DELETES the very fields they built — you do not need to faithfully migrate
// state you are about to drop. Safe because entries are independent, to:6
// (catJourney) and to:7 (avatar) never read Street state, and runMigrations'
// final `if (v !== current) stamp(current)` closes the numbering gap. A legacy
// v0 install now runs to:6 -> to:7 -> to:8.
const VERSION_KEY = "nbhsk.schemaVersion";

// Keys that exist on any pre-versioning install; how we tell a legacy install
// (run the ladder from 0) from a fresh one (just stamp and go).
const LEGACY_SENTINELS = ["nbhsk.xp", "nbhsk.mastery", "nbhsk.daily", "nbhsk.settings", "nbhsk.scope"];

export const CURRENT_SCHEMA_VERSION = 8;

export const MIGRATIONS = [
  {
    to: 6,
    up(storage) {
      // v5->v6: Cat Journey moves from the capped device-local MVP shape to
      // permanent v2 claims. normalizeCatJourney is deliberately the single
      // migration contract: it accepts v1/v2, preserves every earned memory,
      // keeps an active journey active, and is idempotent on a retry.
      let journey;
      try {
        const raw = storage.getItem("nbhsk.catJourney");
        if (raw === null) return;
        journey = JSON.parse(raw);
      } catch (e) { return; }
      if (!journey || typeof journey !== "object") return;
      try {
        storage.setItem("nbhsk.catJourney", JSON.stringify(normalizeCatJourney(journey)));
      } catch (e) {}
    },
  },
  {
    to: 7,
    up(storage) {
      // v6->v7: nbhsk.profile gains `avatar` (Profile avatar feature). Absent
      // profile = fresh install or player never opened Profile: early-return —
      // defaultProfile()/normalizeProfile() supply the field at read time.
      // Idempotent: re-running normalizes an already-v7 profile to itself, and
      // normalizeAvatar maps any unknown/future id to monogram, so a partially
      // newer profile is never corrupted. Guarded: corrupt JSON is a no-op.
      let profile;
      try {
        const raw = storage.getItem("nbhsk.profile");
        if (raw === null) return;
        profile = JSON.parse(raw);
      } catch (e) { return; }
      if (!profile || typeof profile !== "object") return;
      const next = {
        displayName: typeof profile.displayName === "string" ? profile.displayName : "",
        avatar: normalizeAvatar(profile.avatar),
      };
      try { storage.setItem("nbhsk.profile", JSON.stringify(next)); } catch (e) {}
    },
  },
  {
    to: 8,
    up(storage) {
      // v7->v8: Street retirement. Drops the shop sub-fields that only the
      // Street surface ever read (streetLayout, streetProject, tiers — `tiers`
      // keyed off item.maxTier and ONLY decos had maxTier), prunes the 15
      // retired decoration ids out of `owned` so nothing dangles against a
      // catalog that no longer lists them, and deletes nbhsk.bricks outright
      // (its counter, its only sink, and its sync fold are all gone).
      //
      // The id list is inlined ON PURPOSE: shop.js no longer exports these, and
      // a historical migration must never depend on live catalog data — that is
      // the same trap the old to:2 entry documented about STREET_LAYOUT_VERSION.
      // Guarded and idempotent: re-running on an already-v8 save is a no-op.
      const RETIRED_DECOS = new Set([
        "red-lantern", "noodle-stall", "tea-sign", "foo-dog", "golden-arch",
        "mahjong-table", "koi-pond", "drum-tower", "bubble-tea",
        "paper-umbrella", "goldfish-banner", "neon-cat-sign",
        "shaved-ice-cart", "mooncake-stall", "firecracker-arch",
      ]);
      try { storage.removeItem("nbhsk.bricks"); } catch (e) {}
      let shop;
      try {
        const raw = storage.getItem("nbhsk.shop");
        if (raw === null) return;
        shop = JSON.parse(raw);
      } catch (e) { return; }
      if (!shop || typeof shop !== "object") return;
      delete shop.streetLayout;
      delete shop.streetProject;
      delete shop.tiers;
      if (Array.isArray(shop.owned)) shop.owned = shop.owned.filter((id) => !RETIRED_DECOS.has(id));
      try { storage.setItem("nbhsk.shop", JSON.stringify(shop)); } catch (e) {}
    },
  },
];

// Dev-time invariant: runMigrations skips any entry with `to <= v`, so an
// out-of-order (or duplicate-`to`) ladder would silently drop a migration
// instead of failing loud. Assert ascending order at module load — a no-op
// while the ladder is empty, a hard error the moment a bad entry is added.
export function assertSortedLadder(migrations) {
  for (let i = 1; i < migrations.length; i++) {
    if (migrations[i].to <= migrations[i - 1].to) {
      throw new Error(
        `MIGRATIONS must be sorted ascending by \`to\` (entry ${i}: ${migrations[i].to} <= ${migrations[i - 1].to})`,
      );
    }
  }
  return migrations;
}
assertSortedLadder(MIGRATIONS);

export function readVersion(storage) {
  try {
    const raw = storage.getItem(VERSION_KEY);
    if (raw !== null) {
      const n = Number(JSON.parse(raw));
      if (Number.isFinite(n)) return n;
    }
  } catch (e) {}
  try {
    if (LEGACY_SENTINELS.some((k) => storage.getItem(k) !== null)) return 0;
  } catch (e) {}
  return null;
}

export function runMigrations(storage, migrations = MIGRATIONS, current = CURRENT_SCHEMA_VERSION) {
  const stamp = (v) => { try { storage.setItem(VERSION_KEY, JSON.stringify(v)); } catch (e) {} };
  const from = readVersion(storage);
  if (from === null) { stamp(current); return current; }   // fresh install
  if (from >= current) return from;                        // up to date, or app downgrade: hands off
  let v = from;
  for (const m of migrations) {
    if (m.to <= v || m.to > current) continue;
    try { m.up(storage); } catch (e) { return v; }         // abort ladder; next boot retries
    v = m.to;
    stamp(v);
  }
  if (v !== current) stamp(current);                       // bump with no entries = pure stamp
  return current;
}
