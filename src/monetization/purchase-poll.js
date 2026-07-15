"use strict";
// Real-provider purchase poll (coin-purchase go-live plan §3/§4 T4). A real
// billing provider's coins are granted SERVER-SIDE by the RevenueCat webhook
// (idempotent ledger row + wallet increment) — the client has no self-grant
// path for kind !== "mock" and must learn the credit landed by re-running
// sync.js's ledger-cursor reconcile until it folds the unseen delta in.
//
// Pure/injectable (house pattern: interstitial-policy.js, gating.js) so tests
// drive it with fakes and zero real timers: `reconcile` is async and returns
// {ok, credits:[{orderId,delta}], ...} (sync.js's reconcile shape). Matching
// the exact store transaction prevents unrelated cloud earnings from being
// mistaken for this purchase. `sleep` is injected so tests use no real timers.
export async function pollForCredit({ reconcile, orderId, tries = 3, delayMs = 2000, sleep }) {
  if (!orderId) return { credited: false, delta: 0 };
  for (let i = 0; i < tries; i++) {
    const r = await reconcile("purchase", orderId);
    // A failed reconcile (offline, cooldown-race, etc) is just "no credit
    // seen THIS try" — not a reason to stop polling. The webhook already
    // guarantees eventual delivery; the next try (or the next ordinary sync,
    // after timeout) will pick it up.
    // A push can fail after reconcile has already folded and persisted the
    // exact ledger row locally, so credit attribution does not require r.ok.
    const credit = r && Array.isArray(r.credits)
      ? r.credits.find(c => c.orderId === orderId)
      : null;
    if (credit) return { credited: true, delta: Number(credit.delta) || 0 };
    if (i < tries - 1) await sleep(delayMs);
  }
  return { credited: false, delta: 0 };
}
