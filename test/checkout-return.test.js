import { describe, it, expect, vi } from "vitest";
import { resolvePendingCheckout } from "../src/ui/checkout-return.js";
import { writePending, readPending } from "../src/monetization/checkout-pending.js";

function fakeStore() {
  const map = new Map();
  return { map, get: (k, d) => (map.has(k) ? map.get(k) : d), set: (k, v) => map.set(k, v), remove: k => map.delete(k) };
}
const T0 = 1_800_000_000_000;

function setup(over = {}) {
  const store = over.store || fakeStore();
  writePending(store, { sessionId: "cs_1", productId: "supporter", now: T0 });
  return {
    store,
    provider: { restore: vi.fn(async () => ({ ok: true, ownedProductIds: ["supporter"] })) },
    reconcile: vi.fn(async () => ({ ok: true, credits: [{ orderId: "cs_1", delta: 2000 }] })),
    sleep: async () => {},
    now: () => T0 + 1000,
    onCredited: vi.fn(),
    onEntitlement: vi.fn(),
    track: vi.fn(),
    ...over,
  };
}

describe("resolvePendingCheckout", () => {
  it("does nothing when there is no pending checkout", async () => {
    const s = setup({ store: fakeStore() });
    s.store.remove("checkout");
    const r = await resolvePendingCheckout(s);
    expect(r.resolved).toBe(false);
    expect(s.reconcile).not.toHaveBeenCalled();
  });

  it("credits the coins and clears the record", async () => {
    const s = setup();
    const r = await resolvePendingCheckout(s);
    expect(r).toEqual({ resolved: true, credited: true, delta: 2000 });
    expect(s.onCredited).toHaveBeenCalledWith(2000);
    expect(readPending(s.store, T0 + 1000)).toBeNull();
  });

  it("ALSO delivers the entitlement — coins alone are not Supporter", async () => {
    const s = setup();
    await resolvePendingCheckout(s);
    expect(s.provider.restore).toHaveBeenCalled();
    expect(s.onEntitlement).toHaveBeenCalledWith(["supporter"]);
  });

  it("keeps the pending record when the credit has not landed yet", async () => {
    const s = setup({ reconcile: async () => ({ ok: true, credits: [] }) });
    const r = await resolvePendingCheckout(s);
    expect(r).toEqual({ resolved: true, credited: false, delta: 0 });
    expect(readPending(s.store, T0 + 1000)).not.toBeNull();
    expect(s.onEntitlement).not.toHaveBeenCalled();
  });

  it("fires purchase_success only once the credit lands", async () => {
    const s = setup();
    await resolvePendingCheckout(s);
    expect(s.track).toHaveBeenCalledWith("purchase_success", { product: "supporter" });

    const pendingOnly = setup({ reconcile: async () => ({ ok: true, credits: [] }) });
    await resolvePendingCheckout(pendingOnly);
    expect(pendingOnly.track).not.toHaveBeenCalled();
  });

  it("still clears and credits when restore fails — coins must not be held hostage", async () => {
    const s = setup({ provider: { restore: async () => ({ ok: false, reason: "unavailable" }) } });
    const r = await resolvePendingCheckout(s);
    expect(r.credited).toBe(true);
    expect(s.onEntitlement).not.toHaveBeenCalled();
    expect(readPending(s.store, T0 + 1000)).toBeNull();
  });

  // The regression this closes: round 1 toasted the reported delta and
  // re-announced on a later boot; round 2 diffed the wallet and went SILENT
  // when a concurrent syncEdge folded the credit first. Only the marker is
  // correct in both directions.
  it("announces exactly once — a re-run on an already-announced record is silent", async () => {
    const s = setup();
    await resolvePendingCheckout(s);
    expect(s.onCredited).toHaveBeenCalledTimes(1);
    expect(s.track).toHaveBeenCalledTimes(1);

    // Simulate dying after the announcement but before clearPending.
    const again = setup({ store: s.store });
    again.store.set("checkout", { sessionId: "cs_1", productId: "supporter", startedAt: T0, announced: true });
    await resolvePendingCheckout(again);
    expect(again.onCredited).not.toHaveBeenCalled();
    expect(again.track).not.toHaveBeenCalled();
    // but the entitlement half still runs, and the record is still cleared
    expect(again.provider.restore).toHaveBeenCalled();
    expect(readPending(again.store, T0 + 1000)).toBeNull();
  });

  it("marks announced BEFORE invoking onCredited, so a crash cannot re-announce", async () => {
    const s = setup({ onCredited: () => { throw new Error("died mid-toast"); } });
    await resolvePendingCheckout(s).catch(() => {});
    expect(s.store.get("checkout", null)).toBeTruthy();
    expect(s.store.get("checkout", null).announced).toBe(true);
  });

  it("never throws when RECONCILE explodes", async () => {
    const s = setup({ reconcile: async () => { throw new Error("offline"); } });
    await expect(resolvePendingCheckout(s)).resolves.toEqual({ resolved: true, credited: false, delta: 0 });
  });

  // Separate from the reconcile case on purpose: a single test named "provider or
  // reconcile" only ever exploded reconcile, so the try/catch around restore()
  // could be deleted with the suite still green. This module runs early in boot,
  // so an uncaught throw here is a boot crash, not a failed purchase.
  it("never throws when provider.restore() THROWS — coins still land, record still clears", async () => {
    const s = setup({ provider: { restore: async () => { throw new Error("boom"); } } });
    await expect(resolvePendingCheckout(s)).resolves.toEqual({ resolved: true, credited: true, delta: 2000 });
    expect(s.onEntitlement).not.toHaveBeenCalled();
    expect(readPending(s.store, T0 + 1000)).toBeNull();
  });

  // Pins the SEQUENCE, not just the individual effects. Every effect can fire and
  // still be wrong: clearing the pending record BEFORE restore() destroys the
  // crash-resilience property (a tab killed mid-restore must retry on next boot),
  // and firing analytics before the credit is confirmed reports revenue that may
  // never land. Both mutations passed all seven original tests.
  it("pins the ORDER: poll -> credited -> restore -> entitlement -> clear -> track", async () => {
    const calls = [];
    const store = fakeStore();
    writePending(store, { sessionId: "cs_1", productId: "supporter", now: T0 });
    const remove = store.remove;
    store.remove = (k) => { calls.push("clear"); return remove(k); };
    await resolvePendingCheckout({
      store,
      provider: { restore: async () => { calls.push("restore"); return { ok: true, ownedProductIds: ["supporter"] }; } },
      reconcile: async () => { calls.push("poll"); return { ok: true, credits: [{ orderId: "cs_1", delta: 2000 }] }; },
      sleep: async () => {},
      now: () => T0 + 1000,
      onCredited: () => calls.push("credited"),
      onEntitlement: () => calls.push("entitlement"),
      track: () => calls.push("track"),
    });
    expect(calls).toEqual(["poll", "credited", "restore", "entitlement", "clear", "track"]);
  });
});
