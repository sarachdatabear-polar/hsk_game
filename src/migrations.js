"use strict";
import { migrateLegacyStreet, normalizeStreetLayout } from "./street.js";
import { defaultStreetProject } from "./street-project.js";
// Save-data schema versioning. main.js calls runMigrations(localStorage) once
// at boot, BEFORE constructing the store — migrations must see raw
// pre-migration values, so this module reads/writes storage directly.
//
// To change a stored shape: bump CURRENT_SCHEMA_VERSION and append one
// { to, up(storage) } entry to MIGRATIONS. Entries run in ascending order and
// each stamps its version as it lands, so a mid-ladder crash resumes (not
// re-runs) on the next boot. Local-only key — never add it to SYNC_KEYS.
const VERSION_KEY = "nbhsk.schemaVersion";

// Keys that exist on any pre-versioning install; how we tell a legacy install
// (run the ladder from 0) from a fresh one (just stamp and go).
const LEGACY_SENTINELS = ["nbhsk.xp", "nbhsk.mastery", "nbhsk.daily", "nbhsk.settings", "nbhsk.scope"];

export const CURRENT_SCHEMA_VERSION = 3;

export const MIGRATIONS = [
  // v1→v2: street.js's shop-state layout gained a `streetLayout` scene
  // (v2 shape: { v:2, placements, welcomeOwned, coachDone } — see
  // migrateLegacyStreet/normalizeStreetLayout in src/street.js) plus a
  // `streetProject` field (src/street-project.js). This shipped without a
  // ladder entry; main.js still upgrades lazily at read time (defense in
  // depth), but this makes the upgrade durable on disk instead of relying on
  // that forever. Reads/writes raw JSON since it runs before the store exists;
  // every step is guarded so corrupt/missing data is a no-op, never a throw.
  {
    to: 2,
    up(storage) {
      let shop;
      try {
        const raw = storage.getItem("nbhsk.shop");
        if (raw === null) return;
        shop = JSON.parse(raw);
      } catch (e) { return; }
      if (!shop || typeof shop !== "object") return;
      let mastery = null;
      try {
        const raw = storage.getItem("nbhsk.mastery");
        if (raw !== null) mastery = JSON.parse(raw);
      } catch (e) {}
      const welcomeOwned = (mastery && typeof mastery === "object" && Object.keys(mastery).length > 0)
        || !!shop.streetLayout?.welcomeOwned;
      const owned = Array.isArray(shop.owned) ? shop.owned : [];
      try {
        // A historical migration entry must NOT branch on the live current-
        // version constant, or every future bump silently re-breaks it: since
        // STREET_LAYOUT_VERSION moved 2->3, `=== STREET_LAYOUT_VERSION` would
        // mis-route a dormant v2 install into migrateLegacyStreet (rebuilding
        // placements, resetting coachDone). Pin the historical shape: any
        // already-structured layout (v>=2) is normalized, not rebuilt. Use
        // `>= 2`, not `=== 2` — a v3 layout reaching here must keep its fields.
        shop.streetLayout = shop.streetLayout && shop.streetLayout.v >= 2
          ? normalizeStreetLayout({ ...shop.streetLayout, welcomeOwned }, owned)
          : migrateLegacyStreet(owned, { welcomeOwned });
      } catch (e) { return; }
      if (shop.streetProject == null) shop.streetProject = defaultStreetProject();
      try { storage.setItem("nbhsk.shop", JSON.stringify(shop)); } catch (e) {}
    },
  },
  {
    to: 3,
    up(storage) {
      // v2→v3: streetLayout gains ownership fields (name, savedLayouts,
      // keepsakes, setsCompleted, lastVisitDay) and streetProject gains an
      // opt-in `reserve` flag. normalizeStreetLayout fills the new fields
      // defensively; every step is guarded so corrupt data is a no-op.
      let shop;
      try {
        const raw = storage.getItem("nbhsk.shop");
        if (raw === null) return;
        shop = JSON.parse(raw);
      } catch (e) { return; }
      if (!shop || typeof shop !== "object") return;
      const owned = Array.isArray(shop.owned) ? shop.owned : [];
      try {
        shop.streetLayout = normalizeStreetLayout(shop.streetLayout, owned);
      } catch (e) { return; }
      if (shop.streetProject && typeof shop.streetProject === "object"
          && typeof shop.streetProject.reserve !== "boolean") {
        shop.streetProject.reserve = false;
      }
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
