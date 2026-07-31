"use strict";
// The durable record of an in-flight Stripe Checkout.
//
// WHY DURABLE: purchase-poll.js gives up after 3 tries x 2s. That is fine for
// a card, but PromptPay can confirm AFTER the buyer is already back — or after
// they have closed the tab. It also covers the redirect's worst failure: on an
// installed iOS PWA, navigating out to Stripe can land the buyer in Safari and
// never return them to the PWA shell, so they may never see the success URL at
// all. Re-checking this record on boot means the grant still lands.
//
// LOCAL-ONLY BY DESIGN: `checkout` is deliberately NOT in merge.js's SYNC_KEYS.
// An in-flight checkout is device-scoped confirmation UX; the grant itself is
// server-side against the user id, and any other device learns of the coins
// through its ordinary reconcile. Syncing this would be actively wrong.
const KEY = "checkout";

// Matches Stripe's default Checkout Session expiry.
export const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

export function writePending(store, { sessionId, productId, now }) {
  if (typeof sessionId !== "string" || !sessionId) return;
  store.set(KEY, { sessionId, productId, startedAt: Number(now) || 0 });
}

export function readPending(store, now = Date.now()) {
  const raw = store.get(KEY, null);
  if (!raw || typeof raw !== "object" || typeof raw.sessionId !== "string" || !raw.sessionId) return null;
  const startedAt = Number(raw.startedAt) || 0;
  // Drop it rather than leave a tombstone we re-read on every boot.
  if (now - startedAt > PENDING_TTL_MS) { clearPending(store); return null; }
  return { sessionId: raw.sessionId, productId: raw.productId, startedAt };
}

export function clearPending(store) {
  if (typeof store.remove === "function") store.remove(KEY);
  else store.set(KEY, null);
}
