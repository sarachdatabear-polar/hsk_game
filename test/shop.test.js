import { describe, it, expect } from "vitest";
import { CATALOG, defaultShop, canAfford, buy, equipItem } from "../src/shop.js";

describe("shop", () => {
  it("defaultShop shape", () => {
    expect(defaultShop()).toEqual({ owned: [], skin: "", backdrop: "", effect: "", soundpack: "" });
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

  it("CATALOG has 4 skins, 3 backdrops, 2 effects, and 2 soundpacks with expected ids/prices", () => {
    const skins = CATALOG.filter(i => i.type === "skin");
    const backdrops = CATALOG.filter(i => i.type === "backdrop");
    const effects = CATALOG.filter(i => i.type === "effect");
    const soundpacks = CATALOG.filter(i => i.type === "soundpack");
    expect(skins.length).toBe(4);
    expect(backdrops.length).toBe(3);
    expect(effects.length).toBe(2);
    expect(soundpacks.length).toBe(2);
    expect(skins.map(i => i.id)).toEqual(["midnight", "sakura", "jade", "gold"]);
    expect(backdrops.map(i => i.id)).toEqual(["market", "temple", "bamboo"]);
    expect(effects.map(i => i.id)).toEqual(["sakura-fx", "firecracker-fx"]);
    expect(soundpacks.map(i => i.id)).toEqual(["bells", "arcade"]);
  });

  it("effect items are purchasable and equip into the effect slot", () => {
    let shop = defaultShop();
    let r = buy(2000, shop, "sakura-fx");
    expect(r.ok).toBe(true);
    expect(r.wallet).toBe(0);
    expect(r.shop.owned).toEqual(["sakura-fx"]);
    shop = r.shop;
    shop = equipItem(shop, "sakura-fx");
    expect(shop.effect).toBe("sakura-fx");
  });

  it("equipItem('', 'effect') clears the effect slot", () => {
    const shop = { owned: ["sakura-fx"], skin: "", backdrop: "", effect: "sakura-fx" };
    const s = equipItem(shop, "", "effect");
    expect(s.effect).toBe("");
  });

  it("firecracker-fx is purchasable at its price", () => {
    const r = buy(3500, defaultShop(), "firecracker-fx");
    expect(r.ok).toBe(true);
    expect(r.wallet).toBe(0);
    expect(r.shop.owned).toEqual(["firecracker-fx"]);
  });

  it("soundpack items are purchasable and equip into the soundpack slot", () => {
    let shop = defaultShop();
    let r = buy(2500, shop, "bells");
    expect(r.ok).toBe(true);
    expect(r.wallet).toBe(0);
    expect(r.shop.owned).toEqual(["bells"]);
    shop = r.shop;
    shop = equipItem(shop, "bells");
    expect(shop.soundpack).toBe("bells");
  });

  it("arcade soundpack is purchasable at its price", () => {
    const r = buy(4000, defaultShop(), "arcade");
    expect(r.ok).toBe(true);
    expect(r.wallet).toBe(0);
    expect(r.shop.owned).toEqual(["arcade"]);
  });

  it("equipItem('', 'soundpack') clears the soundpack slot", () => {
    const shop = { owned: ["bells"], skin: "", backdrop: "", effect: "", soundpack: "bells" };
    const s = equipItem(shop, "", "soundpack");
    expect(s.soundpack).toBe("");
  });

  it("CATALOG has 5 street decorations with expected ids/prices", () => {
    const decos = CATALOG.filter(i => i.type === "deco");
    expect(decos.length).toBe(5);
    expect(decos.map(i => i.id)).toEqual(["red-lantern", "noodle-stall", "tea-sign", "foo-dog", "golden-arch"]);
    expect(decos.map(i => i.price)).toEqual([800, 1500, 2200, 3000, 5000]);
  });

  it("buying a deco adds it to owned", () => {
    const r = buy(800, defaultShop(), "red-lantern");
    expect(r.ok).toBe(true);
    expect(r.wallet).toBe(0);
    expect(r.shop.owned).toEqual(["red-lantern"]);
  });

  it("equipItem is a no-op for decos even when owned — no real slot to fill", () => {
    const shop = { owned: ["red-lantern"], skin: "", backdrop: "", effect: "", soundpack: "" };
    const s = equipItem(shop, "red-lantern");
    // Decos have no slot: equipItem must return the shop unchanged — same
    // shape, no stray "deco" field.
    expect(s).toEqual(shop);
  });
});
