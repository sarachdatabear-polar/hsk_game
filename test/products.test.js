import { describe, it, expect } from "vitest";
import { PRODUCTS, productById, displayPrice } from "../src/monetization/products.js";

describe("PRODUCTS catalog (PRD §7.1)", () => {
  it("has exactly the 5 v1 products with unique ids", () => {
    expect(PRODUCTS.map(p => p.id).sort()).toEqual(
      ["coins_l", "coins_m", "coins_s", "coins_xl", "supporter"]
    );
  });

  it("prices and coin grants match the PRD exactly", () => {
    const byId = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));
    expect(byId.supporter).toMatchObject({ coins: 2000, priceTHB: 79, priceUSD: 2.99 });
    expect(byId.coins_s).toMatchObject({ coins: 1000, priceTHB: 29, priceUSD: 0.99 });
    expect(byId.coins_m).toMatchObject({ coins: 3500, priceTHB: 99, priceUSD: 2.99 });
    expect(byId.coins_l).toMatchObject({ coins: 6500, priceTHB: 169, priceUSD: 4.99 });
    expect(byId.coins_xl).toMatchObject({ coins: 15000, priceTHB: 329, priceUSD: 9.99 });
  });

  it("supporter is the only entitlement product", () => {
    expect(PRODUCTS.filter(p => p.entitlement).map(p => p.id)).toEqual(["supporter"]);
    expect(PRODUCTS.find(p => p.id === "supporter").entitlement).toBe("supporter");
  });

  it("every product grants a positive whole number of coins", () => {
    for (const p of PRODUCTS) {
      expect(Number.isInteger(p.coins), `${p.id} coins`).toBe(true);
      expect(p.coins).toBeGreaterThan(0);
    }
  });
});

describe("productById", () => {
  it("finds a product by id", () => {
    expect(productById("coins_m").coins).toBe(3500);
  });
  it("returns null for unknown ids", () => {
    expect(productById("nope")).toBeNull();
  });
});

describe("displayPrice", () => {
  it("shows baht for th", () => {
    expect(displayPrice(productById("supporter"), "th")).toBe("79฿");
  });
  it("shows dollars for any other locale", () => {
    expect(displayPrice(productById("coins_s"), "en")).toBe("$0.99");
    expect(displayPrice(productById("coins_m"), "en")).toBe("$2.99");
  });
});
