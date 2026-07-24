"use strict";
// Street Keepsakes — pure, append-only ledger of cosmetic mementos. A keepsake
// may DISPLAY a word the player already mastered (frozen string snapshot); it
// never drives review or any learning state.

export function makeKeepsake(kind, day, opts = {}) {
  const seg = opts.set != null ? String(opts.set)
    : opts.seq != null ? String(opts.seq) : "";
  const id = seg ? `${kind}:${seg}:${day}` : `${kind}:${day}`;
  const k = { id, kind, day };
  if (typeof opts.word === "string" && opts.word) k.word = opts.word;
  return k;
}

// The words already displayed on a keepsake list, in ledger order. Callers pass
// this to mastery.pickKeepsakeWord as the exclude set so a word is remembered by
// at most one keepsake.
export function keepsakeWords(list) {
  const arr = Array.isArray(list) ? list : [];
  return arr.filter(k => k && typeof k.word === "string" && k.word).map(k => k.word);
}

export function addKeepsake(list, keepsake) {
  const arr = Array.isArray(list) ? list : [];
  if (!keepsake || typeof keepsake.id !== "string") return arr.slice();
  if (arr.some(k => k && k.id === keepsake.id)) return arr.slice();
  return [...arr, keepsake];
}
