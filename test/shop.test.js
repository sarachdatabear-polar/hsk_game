import { describe, it, expect } from "vitest";
import { CATALOG, defaultShop, canAfford, buy, equipItem } from "../src/shop.js";

describe("shop", () => {
  it("defaultShop shape", () => {
    expect(defaultShop()).toEqual({ owned: [], skin: "", backdrop: "" });
  });

  it("canAfford true/false by wallet", () => {
    expect(canAfford(500, "midnight")).toBe(true);
    expect(canAfford(499, "midnight")).toBe(false);
    expect(canAfford(9999, "unknown")).toBe(false);
  });

  it("buy success deducts price and adds to owned", () => {
    const r = buy(1000, defaultShop(), "midnight");
    expect(r.ok).toBe(true);
    expect(r.wallet).toBe(500);
    expect(r.shop.owned).toEqual(["midnight"]);
  });

  it("buy fails on insufficient funds, wallet unchanged", () => {
    const shop = defaultShop();
    const r = buy(100, shop, "midnight");
    expect(r.ok).toBe(false);
    expect(r.wallet).toBe(100);
    expect(r.shop).toEqual(shop);
  });

  it("buy fails on duplicate purchase", () => {
    const owned = { ...defaultShop(), owned: ["midnight"] };
    const r = buy(10000, owned, "midnight");
    expect(r.ok).toBe(false);
    expect(r.wallet).toBe(10000);
    expect(r.shop.owned).toEqual(["midnight"]);
  });

  it("buy fails on unknown id", () => {
    const r = buy(10000, defaultShop(), "nope");
    expect(r.ok).toBe(false);
    expect(r.wallet).toBe(10000);
  });

  it("never goes negative — exact price leaves 0, not less", () => {
    const r = buy(500, defaultShop(), "midnight");
    expect(r.ok).toBe(true);
    expect(r.wallet).toBe(0);
    expect(r.wallet).toBeGreaterThanOrEqual(0);
  });

  it("buy does not mutate input wallet/shop", () => {
    const shop = defaultShop();
    const before = JSON.stringify(shop);
    buy(1000, shop, "midnight");
    expect(JSON.stringify(shop)).toBe(before);
  });

  it("equipItem equips an owned item into its type slot", () => {
    const shop = { owned: ["midnight", "market"], skin: "", backdrop: "" };
    let s = equipItem(shop, "midnight");
    expect(s.skin).toBe("midnight");
    s = equipItem(s, "market");
    expect(s.backdrop).toBe("market");
  });

  it("equipItem is a no-op for an unowned item", () => {
    const shop = defaultShop();
    const s = equipItem(shop, "midnight");
    expect(s).toEqual(shop);
  });

  it("equipItem is a no-op for an unknown id", () => {
    const shop = { owned: ["midnight"], skin: "midnight", backdrop: "" };
    const s = equipItem(shop, "nonexistent");
    expect(s).toEqual(shop);
  });

  it("equipItem('', type) clears that slot", () => {
    const shop = { owned: ["midnight", "market"], skin: "midnight", backdrop: "market" };
    const s1 = equipItem(shop, "", "skin");
    expect(s1.skin).toBe("");
    expect(s1.backdrop).toBe("market");
    const s2 = equipItem(shop, "", "backdrop");
    expect(s2.backdrop).toBe("");
  });

  it("equipItem does not mutate input shop", () => {
    const shop = { owned: ["midnight"], skin: "", backdrop: "" };
    const before = JSON.stringify(shop);
    equipItem(shop, "midnight");
    expect(JSON.stringify(shop)).toBe(before);
  });

  it("CATALOG has 4 skins and 3 backdrops with expected ids/prices", () => {
    const skins = CATALOG.filter(i => i.type === "skin");
    const backdrops = CATALOG.filter(i => i.type === "backdrop");
    expect(skins.length).toBe(4);
    expect(backdrops.length).toBe(3);
    expect(skins.map(i => i.id)).toEqual(["midnight", "sakura", "jade", "gold"]);
    expect(backdrops.map(i => i.id)).toEqual(["market", "temple", "bamboo"]);
  });
});
