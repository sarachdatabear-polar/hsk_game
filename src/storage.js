"use strict";
// Persistence chokepoint: every nbhsk.* localStorage read/write goes through
// the store this module creates. Extracted from main.js so persistence has a
// seam of its own (and tests); main.js constructs it once with the real
// localStorage and merge.js's SYNC_KEYS.
export const NS = "nbhsk.";

export function createStore({ storage, syncKeys = [] }) {
  return {
    get(k, d) {
      try {
        const v = storage.getItem(NS + k);
        return v === null ? d : JSON.parse(v);
      } catch (e) { return d; }
    },
    set(k, v) {
      try { storage.setItem(NS + k, JSON.stringify(v)); } catch (e) {}
      // cloud-save: persist a dirty flag per synced key so a mid-session kill
      // doesn't forget unpushed changes. Writes only on false->true flips.
      if (syncKeys.includes(k)) {
        try {
          const raw = storage.getItem(NS + "sync");
          const meta = raw ? JSON.parse(raw) : { dirty: {}, lastSyncAt: 0 };
          if (!meta.dirty) meta.dirty = {};
          if (!meta.dirty[k]) {
            meta.dirty[k] = true;
            storage.setItem(NS + "sync", JSON.stringify(meta));
          }
        } catch (e) {}
      }
    },
  };
}
