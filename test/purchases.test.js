import { describe, it, expect } from "vitest";
import {
  defaultEnt, isSupporter, applyPurchase, restoreFrom,
} from "../src/monetization/purchases.js";

describe("defaultEnt / isSupporter", () => {
  it("defaults to non-supporter with no orders", () => {
    expect(defaultEnt()).toEqual({ supporter: false, orders: [] });
  });
  it("isSupporter is null-safe", () => {
    expect(isSupporter(null)).toBe(false);
    expect(isSupporter(undefined)).toBe(false);
    expect(isSupporter({ supporter: true, orders: [] })).toBe(true);
  });
});

describe("applyPurchase", () => {
  it("credits a coin pack and logs the order", () => {
    const r = applyPurchase(100, defaultEnt(), "coins_s", "o-1", 5000);
    expect(r.ok).toBe(true);
    expect(r.wallet).toBe(1100);
    expect(r.ent.supporter).toBe(false);
    expect(r.ent.orders).toEqual([{ orderId: "o-1", productId: "coins_s", at: 5000 }]);
  });

  it("supporter sets the flag AND credits 2,000 coins", () => {
    const r = applyPurchase(0, defaultEnt(), "supporter", "o-2", 6000);
    expect(r.ok).toBe(true);
    expect(r.wallet).toBe(2000);
    expect(r.ent.supporter).toBe(true);
  });

  it("a replayed orderId never double-credits (idempotent, PRD §7.4)", () => {
    const first = applyPurchase(0, defaultEnt(), "coins_m", "o-3", 1);
    const replay = applyPurchase(first.wallet, first.ent, "coins_m", "o-3", 2);
    expect(replay).toEqual({ ok: false, wallet: 3500, ent: first.ent, reason: "duplicate" });
  });

  it("rejects unknown products without touching state", () => {
    const ent = defaultEnt();
    const r = applyPurchase(50, ent, "coins_xxl", "o-4", 1);
    expect(r).toEqual({ ok: false, wallet: 50, ent, reason: "unknown-product" });
  });

  it("rejects buying supporter twice", () => {
    const owned = applyPurchase(0, defaultEnt(), "supporter", "o-5", 1).ent;
    const r = applyPurchase(9, owned, "supporter", "o-6", 2);
    expect(r).toEqual({ ok: false, wallet: 9, ent: owned, reason: "already-owned" });
  });

  it("treats a null/missing ent as defaultEnt", () => {
    const r = applyPurchase(0, null, "coins_s", "o-7", 1);
    expect(r.ok).toBe(true);
    expect(r.wallet).toBe(1000);
  });
});

describe("restoreFrom", () => {
  it("re-derives supporter from a restored non-consumable", () => {
    const r = restoreFrom(defaultEnt(), ["supporter"]);
    expect(r.supporter).toBe(true);
  });
  it("coin packs never restore anything", () => {
    const r = restoreFrom(defaultEnt(), ["coins_s", "coins_xl"]);
    expect(r.supporter).toBe(false);
  });
  it("never un-sets an existing supporter flag", () => {
    const ent = { supporter: true, orders: [] };
    expect(restoreFrom(ent, []).supporter).toBe(true);
  });
  it("is null-safe on both arguments", () => {
    expect(restoreFrom(null, null)).toEqual({ supporter: false, orders: [] });
  });
});
