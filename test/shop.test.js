import { describe, it, expect } from "vitest";
import { CATALOG, defaultShop, canAfford, buy, equipItem, catJourneyStock, isAvailable, buyConsumable } from "../src/shop.js";


describe("catJourneyStock", () => {
  it("backfills three obtainable non-Street cosmetics on a formerly empty day", () => {
    const stock = catJourneyStock("2026-07-30", defaultShop());
    expect(stock).toHaveLength(3);
    const types = new Set();
    for (const id of stock) {
      const item = CATALOG.find(entry => entry.id === id);
      expect(item.type).not.toBe("deco");
      expect(item.type).not.toBe("consumable");
      expect(isAvailable(item, "2026-07-30")).toBe(true);
      types.add(item.type);
    }
    expect(types.size).toBe(3);
  });

  it("is stable for a date and contains unique ids", () => {
    const a = catJourneyStock("2026-07-31", defaultShop());
    expect(catJourneyStock("2026-07-31", defaultShop())).toEqual(a);
    expect(new Set(a).size).toBe(a.length);
  });

  it("skips owned picks and backfills from the remaining eligible catalog", () => {
    const first = catJourneyStock("2026-07-30", defaultShop());
    const shop = { ...defaultShop(), owned: [first[0]] };
    const next = catJourneyStock("2026-07-30", shop);
    expect(next).toHaveLength(3);
    expect(next).not.toContain(first[0]);
  });

  it("returns [] when every eligible Cat Journey cosmetic is owned", () => {
    const owned = CATALOG
      .filter(item => item.type !== "deco" && item.type !== "consumable"
        && isAvailable(item, "2026-07-30"))
      .map(item => item.id);
    expect(catJourneyStock("2026-07-30", { ...defaultShop(), owned })).toEqual([]);
  });

  it("returns [] without a valid date instead of leaking gated items", () => {
    expect(catJourneyStock("", defaultShop())).toEqual([]);
  });
});

describe("shop", () => {
  it("defaultShop shape", () => {
    expect(defaultShop()).toEqual({ owned: [], skin: "", backdrop: "", effect: "", soundpack: "" });
  });

  it("canAfford true/false by wallet", () => {
    expect(canAfford(8000, "panda")).toBe(true);
    expect(canAfford(7999, "panda")).toBe(false);
    expect(canAfford(9999, "unknown")).toBe(false);
  });

  it("buy success deducts price and adds to owned", () => {
    const r = buy(8500, defaultShop(), "panda");
    expect(r.ok).toBe(true);
    expect(r.wallet).toBe(500);
    expect(r.shop.owned).toEqual(["panda"]);
  });

  it("buy fails on insufficient funds, wallet unchanged", () => {
    const shop = defaultShop();
    const r = buy(100, shop, "panda");
    expect(r.ok).toBe(false);
    expect(r.wallet).toBe(100);
    expect(r.shop).toEqual(shop);
  });

  it("buy fails on duplicate purchase", () => {
    const owned = { ...defaultShop(), owned: ["panda"] };
    const r = buy(10000, owned, "panda");
    expect(r.ok).toBe(false);
    expect(r.wallet).toBe(10000);
    expect(r.shop.owned).toEqual(["panda"]);
  });

  it("buy fails on unknown id", () => {
    const r = buy(10000, defaultShop(), "nope");
    expect(r.ok).toBe(false);
    expect(r.wallet).toBe(10000);
  });

  it("never goes negative — exact price leaves 0, not less", () => {
    const r = buy(8000, defaultShop(), "panda");
    expect(r.ok).toBe(true);
    expect(r.wallet).toBe(0);
    expect(r.wallet).toBeGreaterThanOrEqual(0);
  });

  it("buy does not mutate input wallet/shop", () => {
    const shop = defaultShop();
    const before = JSON.stringify(shop);
    buy(8500, shop, "panda");
    expect(JSON.stringify(shop)).toBe(before);
  });

  it("equipItem equips an owned item into its type slot", () => {
    const shop = { owned: ["panda", "market"], skin: "", backdrop: "" };
    let s = equipItem(shop, "panda");
    expect(s.skin).toBe("panda");
    s = equipItem(s, "market");
    expect(s.backdrop).toBe("market");
  });

  it("equipItem is a no-op for an unowned item", () => {
    const shop = defaultShop();
    const s = equipItem(shop, "panda");
    expect(s).toEqual(shop);
  });

  it("equipItem is a no-op for an unknown id", () => {
    const shop = { owned: ["panda"], skin: "panda", backdrop: "" };
    const s = equipItem(shop, "nonexistent");
    expect(s).toEqual(shop);
  });

  it("equipItem('', type) clears that slot", () => {
    const shop = { owned: ["panda", "market"], skin: "panda", backdrop: "market" };
    const s1 = equipItem(shop, "", "skin");
    expect(s1.skin).toBe("");
    expect(s1.backdrop).toBe("market");
    const s2 = equipItem(shop, "", "backdrop");
    expect(s2.backdrop).toBe("");
  });

  it("equipItem does not mutate input shop", () => {
    const shop = { owned: ["panda"], skin: "", backdrop: "" };
    const before = JSON.stringify(shop);
    equipItem(shop, "panda");
    expect(JSON.stringify(shop)).toBe(before);
  });

  it("CATALOG has 6 skins, 8 backdrops, 3 effects, and 3 soundpacks with expected ids/prices", () => {
    const skins = CATALOG.filter(i => i.type === "skin");
    const backdrops = CATALOG.filter(i => i.type === "backdrop");
    const effects = CATALOG.filter(i => i.type === "effect");
    const soundpacks = CATALOG.filter(i => i.type === "soundpack");
    expect(skins.length).toBe(6);
    expect(backdrops.length).toBe(8);
    expect(effects.length).toBe(3);
    expect(soundpacks.length).toBe(3);
    expect(skins.map(i => i.id)).toEqual(["panda", "ninja", "astronaut", "beach", "mooncake-rabbit", "dragon"]);
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

  it("v7 catalog: permanent prestige items with expected ids/prices", () => {
    const pick = id => CATALOG.find(i => i.id === id);
    expect(pick("panda")).toMatchObject({ type: "skin", price: 8000 });
    expect(pick("ninja")).toMatchObject({ type: "skin", price: 12000 });
    expect(pick("astronaut")).toMatchObject({ type: "skin", price: 20000 });
    expect(pick("harbor-night")).toMatchObject({ type: "backdrop", price: 6000 });
    expect(pick("snow-festival")).toMatchObject({ type: "backdrop", price: 8000 });
    // permanent items carry neither pool nor season
    for (const id of ["panda", "harbor-night"]) {
      expect(pick(id).pool).toBeUndefined();
      expect(pick(id).season).toBeUndefined();
    }
  });

  // The daily pool used to be six items (four Street decos + lion-drum +
  // star-shower); the Street retirement dropped the four decos, so the pool
  // is now just the two survivors.

  // The Season Corner set used to gate these six ids to a date window (owner
  // call: "I don't think we need it" — retired). They're now ordinary
  // catalog entries: no `season` field, same ids/prices/types as before.
  it("formerly-seasonal items: no season field, same ids/prices/types", () => {
    const byId = id => CATALOG.find(i => i.id === id);
    for (const id of ["beach", "island-sunset", "mooncake-rabbit", "lantern-festival", "dragon", "dragon-gate"]) {
      expect(byId(id).season).toBeUndefined();
    }
    expect(byId("beach")).toMatchObject({ type: "skin", price: 12000 });
    expect(byId("island-sunset")).toMatchObject({ type: "backdrop", price: 8000 });
    expect(byId("mooncake-rabbit")).toMatchObject({ type: "skin", price: 15000 });
    expect(byId("lantern-festival")).toMatchObject({ type: "backdrop", price: 9000 });
    expect(byId("dragon")).toMatchObject({ type: "skin", price: 25000 });
    expect(byId("dragon-gate")).toMatchObject({ type: "backdrop", price: 10000 });
  });
});

describe("shop v7 availability", () => {
  const byId = id => CATALOG.find(i => i.id === id);

  // The Street retirement shrank the daily pool to 2 items (lion-drum,
  // star-shower), below the 3 daily slots — so a slot always repeats and
  // only 2 unique ids show up per day (was 3 of 6 before the retirement).

  // With only 2 pool ids across 3 slots, every day's stock already covers
  // the full pool (3 consecutive slot indices mod 2 always hit both
  // residues) — full-cycle coverage now happens within a single day, not
  // over ceil(pool/3) days. The slot *order* still alternates with period 2.

  // Same shrink: since both pool ids are always featured every day now,
  // nextFeaturedIn is always 0 for a pool id — there's no longer an
  // "absent from today's stock" pool item to test a positive wait against.

  it("isAvailable: permanent items always, even with no date", () => {
    expect(isAvailable(byId("panda"), undefined)).toBe(true);
    expect(isAvailable(byId("market"), "2026-07-07")).toBe(true);
  });

  // Season Corner retired: a formerly-seasonal item is available on any date
  // (including dates well outside its old window) and with no date at all.
  it("isAvailable: formerly-seasonal items are available year-round, date or no date", () => {
    const beach = byId("beach"), dragon = byId("dragon");
    expect(isAvailable(beach, "2026-07-01")).toBe(true);
    expect(isAvailable(beach, "2026-12-25")).toBe(true);    // well outside the old summer window
    expect(isAvailable(beach, undefined)).toBe(true);
    expect(isAvailable(dragon, "2026-06-01")).toBe(true);   // well outside the old CNY window
    expect(isAvailable(dragon, undefined)).toBe(true);
  });

  it("a formerly-seasonal item bought equips regardless of date (no date gating on equip)", () => {
    const shop = { ...defaultShop(), owned: ["dragon"] };
    expect(equipItem(shop, "dragon").skin).toBe("dragon");
  });
});

describe("shop v7 tiers", () => {
  // Tiering died with the Street decorations — every remaining catalog entry
  // is a one-time buy (see src/shop.js's buy() comment). "re-buying an owned
  // non-deco still fails" below already covers the live one-time-buy
  // invariant that survives.

  it("re-buying an owned non-deco still fails", () => {
    const shop = { ...defaultShop(), owned: ["panda"] };
    expect(buy(99999, shop, "panda").ok).toBe(false);
  });

  // Season Corner retired: a formerly-seasonal item's first purchase now
  // succeeds any day of the year, and even with no date at all — there is no
  // more "gated" first purchase.
  it("a formerly-seasonal item is buyable on an arbitrary off-season date", () => {
    const r = buy(12000, defaultShop(), "beach", "2026-07-07"); // was in-window
    expect(r.ok).toBe(true);
    expect(buy(99999, defaultShop(), "beach", "2026-12-01").ok).toBe(true); // well off-season
    expect(buy(99999, defaultShop(), "beach").ok).toBe(true);               // and with no date at all
  });

  // With the daily pool shrunk to 2 ids across 3 slots, every pool item is
  // featured every day now (see the dailyStock tests above) — buy() still
  // requires a dateStr to resolve isAvailable() for a pool item at all.
  
  it("streak-freeze is a capped consumable in the permanent catalog", () => {
    const f = CATALOG.find(i => i.id === "streak-freeze");
    expect(f).toBeTruthy();
    expect(f.type).toBe("consumable");
    expect(f.price).toBe(600);
    expect(f.cap).toBe(2);
    expect(f.pool).toBeUndefined();
    expect(f.season).toBeUndefined();
  });
});

describe("buyConsumable", () => {
  const freeze = CATALOG.find(i => i.id === "streak-freeze"); // 600 coins, cap 2

  it("happy path decrements wallet and increments count", () => {
    const r = buyConsumable(freeze, 1000, 0);
    expect(r).toEqual({ ok: true, wallet: 400, count: 1 });
  });

  it("cap reached -> {ok:false, reason:'cap'}, no wallet/count change implied", () => {
    const r = buyConsumable(freeze, 5000, 2);
    expect(r).toEqual({ ok: false, reason: "cap" });
  });

  it("insufficient coins -> reason 'coins'", () => {
    const r = buyConsumable(freeze, 599, 0);
    expect(r).toEqual({ ok: false, reason: "coins" });
  });

  it("non-consumable item -> reason 'not-consumable'", () => {
    const panda = CATALOG.find(i => i.id === "panda");
    const r = buyConsumable(panda, 99999, 0);
    expect(r).toEqual({ ok: false, reason: "not-consumable" });
  });

  it("null/undefined item -> reason 'not-consumable'", () => {
    expect(buyConsumable(null, 1000, 0)).toEqual({ ok: false, reason: "not-consumable" });
    expect(buyConsumable(undefined, 1000, 0)).toEqual({ ok: false, reason: "not-consumable" });
  });

  it("second buy (count=1) succeeds and reaches the cap count", () => {
    const r = buyConsumable(freeze, 1000, 1);
    expect(r).toEqual({ ok: true, wallet: 400, count: 2 });
  });

  it("does not mutate the item argument", () => {
    const before = JSON.stringify(freeze);
    buyConsumable(freeze, 1000, 0);
    expect(JSON.stringify(freeze)).toBe(before);
  });
});
