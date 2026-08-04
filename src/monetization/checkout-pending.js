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
  return { sessionId: raw.sessionId, productId: raw.productId, startedAt, announced: !!raw.announced };
}

export function clearPending(store) {
  if (typeof store.remove === "function") store.remove(KEY);
  else store.set(KEY, null);
}

// "Have we already told the buyer about this purchase?" — durable, because the
// answer must survive the process dying between announcing and clearing.
//
// Neither of the obvious alternatives works. Toasting pollForCredit's reported
// delta re-announces on a later boot, because sync.js's expectedOrderId lookup
// deliberately re-confirms an already-folded row. Toasting the observed wallet
// change instead goes SILENT when a concurrent syncEdge("foreground") folds the
// credit first — which is precisely the installed-PWA suspend/resume path this
// whole flow exists to handle. Only a record of having announced is correct in
// both cases.
export function markAnnounced(store) {
  const raw = store.get(KEY, null);
  if (raw && typeof raw === "object") store.set(KEY, { ...raw, announced: true });
}

// Cross-tab resolution lock: two open tabs/PWA windows can both boot into
// resolvePendingCheckout (src/ui/checkout-return.js) and both pass readPending
// before either markAnnounced lands — pollForCredit's gap is up to ~6s. The
// server-side grant is idempotent either way, but without a lock the buyer
// sees the success toast twice and purchase_success double-counts.
//
// localStorage has NO compare-and-swap. Two tabs can both read "no fresh
// claim" and both write. So this NARROWS the race rather than eliminating it:
// after writing, re-read and only report success if OUR write is the one that
// settled (last-writer-wins). That is good enough — today there is no lock at
// all, and the worst remaining case (both writes land in the same tick, one
// wins) is rarer than the window this closes.
//
// Same tab re-entering (boot's resumeCheckout(), then shop-open's) always
// re-claims regardless of age — this is a refresh, not a contest.
export const CLAIM_TTL_MS = 30 * 1000;

export function claimResolution(store, tabId, now) {
  try {
    const raw = store.get(KEY, null);
    if (!raw || typeof raw !== "object" || typeof raw.sessionId !== "string" || !raw.sessionId) return false;
    const nowMs = Number(now) || 0;
    const claim = raw.claim && typeof raw.claim === "object" ? raw.claim : null;
    const claimAge = claim ? nowMs - (Number(claim.at) || 0) : Infinity;
    // <=, matching readPending's own TTL convention (expires only once
    // STRICTLY past the window, so age-equals-TTL is still fresh).
    const heldByOther = !!claim && claim.tab !== tabId && claimAge <= CLAIM_TTL_MS;
    if (heldByOther) return false;
    store.set(KEY, { ...raw, claim: { tab: tabId, at: nowMs } });
    const settled = store.get(KEY, null);
    return !!(settled && settled.claim && settled.claim.tab === tabId && settled.claim.at === nowMs);
  } catch {
    // Fail OPEN: the worst case of proceeding unclaimed is a duplicate toast;
    // the worst case of failing closed is never announcing a real purchase.
    return true;
  }
}
