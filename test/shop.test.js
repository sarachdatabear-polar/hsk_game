import { describe, it, expect } from "vitest";
import { CATALOG, defaultShop, canAfford, buy, equipItem, SEASONS, dailyStock, nextFeaturedIn, isAvailable, seasonStatus } from "../src/shop.js";

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

  it("CATALOG has 10 skins, 8 backdrops, 3 effects, and 3 soundpacks with expected ids/prices", () => {
    const skins = CATALOG.filter(i => i.type === "skin");
    const backdrops = CATALOG.filter(i => i.type === "backdrop");
    const effects = CATALOG.filter(i => i.type === "effect");
    const soundpacks = CATALOG.filter(i => i.type === "soundpack");
    expect(skins.length).toBe(10);
    expect(backdrops.length).toBe(8);
    expect(effects.length).toBe(3);
    expect(soundpacks.length).toBe(3);
    expect(skins.map(i => i.id)).toEqual(["midnight", "sakura", "jade", "gold", "panda", "ninja", "astronaut", "beach", "mooncake-rabbit", "dragon"]);
    expect(backdrops.map(i => i.id)).toEqual(["market", "temple", "bamboo", "harbor-night", "snow-festival", "island-sunset", "lantern-festival", "dragon-gate"]);
    expect(effects.map(i => i.id)).toEqual(["sakura-fx", "firecracker-fx", "star-shower"]);
    expect(soundpacks.map(i => i.id)).toEqual(["bells", "arcade", "lion-drum"]);
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

  it("CATALOG has 15 street decorations with expected ids/prices", () => {
    const decos = CATALOG.filter(i => i.type === "deco");
    expect(decos.length).toBe(15);
    expect(decos.map(i => i.id)).toEqual(["red-lantern", "noodle-stall", "tea-sign", "foo-dog", "golden-arch", "mahjong-table", "koi-pond", "drum-tower", "bubble-tea", "paper-umbrella", "goldfish-banner", "neon-cat-sign", "shaved-ice-cart", "mooncake-stall", "firecracker-arch"]);
    expect(decos.map(i => i.price)).toEqual([800, 1500, 2200, 3000, 5000, 4000, 6000, 9000, 2500, 1800, 2200, 3500, 4500, 5000, 6000]);
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

  it("v7 catalog: permanent prestige items with expected ids/prices", () => {
    const pick = id => CATALOG.find(i => i.id === id);
    expect(pick("panda")).toMatchObject({ type: "skin", price: 8000 });
    expect(pick("ninja")).toMatchObject({ type: "skin", price: 12000 });
    expect(pick("astronaut")).toMatchObject({ type: "skin", price: 20000 });
    expect(pick("harbor-night")).toMatchObject({ type: "backdrop", price: 6000 });
    expect(pick("snow-festival")).toMatchObject({ type: "backdrop", price: 8000 });
    expect(pick("mahjong-table")).toMatchObject({ type: "deco", price: 4000 });
    expect(pick("koi-pond")).toMatchObject({ type: "deco", price: 6000 });
    expect(pick("drum-tower")).toMatchObject({ type: "deco", price: 9000 });
    // permanent items carry neither pool nor season
    for (const id of ["panda", "harbor-night", "drum-tower"]) {
      expect(pick(id).pool).toBeUndefined();
      expect(pick(id).season).toBeUndefined();
    }
  });

  it("v7 catalog: daily pool is exactly the six launch items", () => {
    const pool = CATALOG.filter(i => i.pool === "daily");
    expect(pool.map(i => i.id)).toEqual([
      "bubble-tea", "paper-umbrella", "goldfish-banner",
      "neon-cat-sign", "lion-drum", "star-shower",
    ]);
    expect(pool.map(i => i.price)).toEqual([2500, 1800, 2200, 3500, 4500, 3000]);
    expect(pool.find(i => i.id === "lion-drum").type).toBe("soundpack");
    expect(pool.find(i => i.id === "star-shower").type).toBe("effect");
  });

  it("v7 catalog: three season sets, three items each", () => {
    const byId = id => CATALOG.find(i => i.id === id);
    expect(CATALOG.filter(i => i.season === "summer").map(i => i.id))
      .toEqual(["beach", "island-sunset", "shaved-ice-cart"]);
    expect(CATALOG.filter(i => i.season === "midautumn").map(i => i.id))
      .toEqual(["mooncake-rabbit", "lantern-festival", "mooncake-stall"]);
    expect(CATALOG.filter(i => i.season === "cny").map(i => i.id))
      .toEqual(["dragon", "dragon-gate", "firecracker-arch"]);
    expect(byId("dragon").price).toBe(25000);
    expect(byId("beach").price).toBe(12000);
    expect(byId("mooncake-rabbit").price).toBe(15000);
  });

  it("v7 catalog: every deco (old and new) has maxTier 3; nothing else does", () => {
    for (const i of CATALOG) {
      if (i.type === "deco") expect(i.maxTier, i.id).toBe(3);
      else expect(i.maxTier, i.id).toBeUndefined();
    }
  });
});

describe("shop v7 availability", () => {
  const byId = id => CATALOG.find(i => i.id === id);

  it("SEASONS windows match the PRD", () => {
    expect(SEASONS.map(s => s.id)).toEqual(["summer", "midautumn", "cny"]);
    expect(SEASONS[0]).toMatchObject({ from: [7, 1], to: [8, 15] });
    expect(SEASONS[1]).toMatchObject({ from: [9, 1], to: [10, 5] });
    expect(SEASONS[2]).toMatchObject({ from: [1, 20], to: [2, 24] });
  });

  it("dailyStock: 3 unique pool ids, stable for the same date", () => {
    const a = dailyStock("2026-07-07");
    expect(a.length).toBe(3);
    expect(new Set(a).size).toBe(3);
    for (const id of a) expect(byId(id).pool).toBe("daily");
    expect(dailyStock("2026-07-07")).toEqual(a);
  });

  it("dailyStock: full pool cycles in ceil(6/3)=2 days and then repeats", () => {
    const day0 = dailyStock("2026-07-07");
    const day1 = dailyStock("2026-07-08");
    const union = new Set([...day0, ...day1]);
    expect(union.size).toBe(6);                      // full-cycle coverage
    expect(dailyStock("2026-07-09")).toEqual(day0);  // period 2
  });

  it("nextFeaturedIn: 0 when featured today, 1 when featured tomorrow, null for non-pool", () => {
    const today = "2026-07-07";
    const featured = dailyStock(today);
    const absent = CATALOG.filter(i => i.pool === "daily" && !featured.includes(i.id));
    expect(nextFeaturedIn(featured[0], today)).toBe(0);
    expect(nextFeaturedIn(absent[0].id, today)).toBe(1);
    expect(nextFeaturedIn("red-lantern", today)).toBe(null);
  });

  it("isAvailable: permanent items always, even with no date", () => {
    expect(isAvailable(byId("panda"), undefined)).toBe(true);
    expect(isAvailable(byId("red-lantern"), "2026-07-07")).toBe(true);
  });

  it("isAvailable: pool items only while featured, never without a date", () => {
    const today = "2026-07-07";
    const featured = dailyStock(today);
    const absent = CATALOG.filter(i => i.pool === "daily" && !featured.includes(i.id));
    expect(isAvailable(byId(featured[0]), today)).toBe(true);
    expect(isAvailable(absent[0], today)).toBe(false);
    expect(isAvailable(byId(featured[0]), undefined)).toBe(false);
  });

  it("isAvailable: season window edges (PRD success criteria)", () => {
    const beach = byId("beach"), dragon = byId("dragon");
    expect(isAvailable(beach, "2026-07-01")).toBe(true);   // first day
    expect(isAvailable(beach, "2026-08-15")).toBe(true);   // last day
    expect(isAvailable(beach, "2026-06-30")).toBe(false);
    expect(isAvailable(beach, "2026-08-16")).toBe(false);
    expect(isAvailable(dragon, "2026-01-20")).toBe(true);
    expect(isAvailable(dragon, "2026-02-24")).toBe(true);
    expect(isAvailable(dragon, "2026-02-25")).toBe(false);
    expect(isAvailable(dragon, undefined)).toBe(false);
  });

  it("seasonStatus: active summer on launch day; teaser after it ends; year wrap to cny", () => {
    expect(seasonStatus("2026-07-07").active.id).toBe("summer");
    const after = seasonStatus("2026-08-16");
    expect(after.active).toBe(null);
    expect(after.next.id).toBe("midautumn");
    expect(after.nextInDays).toBe(16);                     // Aug 16 -> Sep 1
    expect(seasonStatus("2026-11-01").next.id).toBe("cny"); // wraps into January
  });

  it("a season item bought in-window equips out-of-window (no date gating on equip)", () => {
    const shop = { ...defaultShop(), owned: ["dragon"] };
    expect(equipItem(shop, "dragon").skin).toBe("dragon");
  });
});
