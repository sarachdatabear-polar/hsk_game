"use strict";
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

export const CURRENT_SCHEMA_VERSION = 1;

export const MIGRATIONS = [
  // { to: 2, up(storage) { ...rewrite keys in place... } },
];

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
