"use strict";
// Completes a Stripe checkout after the redirect returns (or on any later
// boot, if the buyer never came back).
//
// TWO HALVES, AND THE SECOND IS EASY TO MISS: pollForCredit delivers the
// COINS via sync.js's ledger reconcile. Supporter STATUS rides `ent`, which is
// local-only, absent from SYNC_KEYS, and never touched by reconcile. The
// native flow sets it by calling prov.restore() after a credited entitlement
// purchase (main.js:3910-3917) — unreachable here, because purchase() returns
// "pending" and iapBuy exits before the page navigates away. Deliver both, or
// the buyer pays 79฿, receives 2,000 coins, and is never a Supporter.
import { readPending, clearPending, markAnnounced, claimResolution } from "../monetization/checkout-pending.js";
import { pollForCredit } from "../monetization/purchase-poll.js";

// Per-JS-context identity for the cross-tab resolution claim (see
// checkout-pending.js's claimResolution doc). One id per tab/PWA window,
// stable across repeated calls in the same tab (main.js calls this at boot
// AND on shop-open) so a tab always re-claims its own earlier claim rather
// than contesting it. Memoized, not per-call, so it costs nothing on the
// hot path once generated.
let cachedTabId = "";
function defaultTabId() {
  if (!cachedTabId) cachedTabId = `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return cachedTabId;
}

export async function resolvePendingCheckout({
  store, provider, reconcile, sleep, now = Date.now,
  onCredited, onEntitlement, track, tabId = defaultTabId(),
}) {
  const idle = { resolved: false, credited: false, delta: 0 };
  let pending;
  try { pending = readPending(store, now()); } catch { return idle; }
  if (!pending) return idle;

  // Cross-tab lock: another tab's fresh claim means it is already driving
  // this exact pending record to completion. Do nothing here rather than
  // double-poll, double-toast, and double-count purchase_success — server
  // idempotency already protects the coins, this protects the UX/analytics.
  // Narrows, not eliminates, the race — see claimResolution's doc.
  let claimed = true;
  try { claimed = claimResolution(store, tabId, now()); } catch { claimed = true; }
  if (!claimed) return idle;

  let credited = false;
  let delta = 0;
  try {
    const result = await pollForCredit({
      reconcile, orderId: pending.sessionId,
      // Refresh the claim each tick so a long poll can't let its ~30s TTL
      // lapse and let a second tab jump in mid-flight.
      sleep: async (ms) => {
        await sleep(ms);
        try { claimResolution(store, tabId, now()); } catch { /* fail open */ }
      },
    });
    credited = !!(result && result.credited);
    delta = Number(result && result.delta) || 0;
  } catch {
    // Offline or a mid-flight sync fault is "no credit seen THIS time", not a
    // failure: the record survives and the next boot re-checks it.
    return { resolved: true, credited: false, delta: 0 };
  }

  // Not yet paid, or a PromptPay QR still unconfirmed. Keep the record.
  if (!credited) return { resolved: true, credited: false, delta: 0 };

  // Persist BEFORE the user-visible effect: if we die between the toast and
  // clearPending, the next boot must NOT re-announce. Ordering matters —
  // marking after the toast would leave the same window this closes.
  const alreadyAnnounced = !!pending.announced;
  if (!alreadyAnnounced) {
    try { markAnnounced(store); } catch { /* best effort */ }
    if (typeof onCredited === "function") onCredited(delta);
  }

  // Entitlement half. A restore failure must NOT hold the coins hostage or
  // resurrect the pending record — the money landed either way, and the
  // account-screen Restore button remains a manual second chance.
  try {
    const restored = provider && typeof provider.restore === "function" ? await provider.restore() : null;
    if (restored && restored.ok && typeof onEntitlement === "function") {
      onEntitlement(restored.ownedProductIds || []);
    }
  } catch { /* leave it to the Restore button */ }

  try { clearPending(store); } catch { /* nothing else to do */ }
  // The funnel breaks across the redirect otherwise: purchase_start fires in
  // iapBuy (main.js:3821) but purchase_success (main.js:3895) sits in the
  // branch a redirect never reaches.
  if (!alreadyAnnounced && typeof track === "function") track("purchase_success", { product: pending.productId });
  return { resolved: true, credited: true, delta };
}
