import { describe, it, expect } from "vitest";
import {
  REVENUECAT_ANDROID_PUBLIC_KEY,
  REVENUECAT_PRODUCT_IDS,
  REVENUECAT_RESTORABLE_PRODUCT_IDS,
} from "../src/monetization/revenuecat-config.js";
import { PRODUCTS } from "../src/monetization/products.js";

describe("revenuecat-config", () => {
  it("key is a string (blank until the Play app exists in RevenueCat)", () => {
    expect(typeof REVENUECAT_ANDROID_PUBLIC_KEY).toBe("string");
  });
  it("product ids are non-empty and unique", () => {
    expect(REVENUECAT_PRODUCT_IDS.length).toBeGreaterThan(0);
    expect(new Set(REVENUECAT_PRODUCT_IDS).size).toBe(REVENUECAT_PRODUCT_IDS.length);
  });
  it("every RC product id exists in the catalog", () => {
    const catalogIds = new Set(PRODUCTS.map((p) => p.id));
    for (const id of REVENUECAT_PRODUCT_IDS) expect(catalogIds.has(id)).toBe(true);
  });
  it("restorable ids are a subset of the RC product ids", () => {
    for (const id of REVENUECAT_RESTORABLE_PRODUCT_IDS) {
      expect(REVENUECAT_PRODUCT_IDS).toContain(id);
    }
  });
});

import {
  REVENUECAT_WEB_PUBLIC_KEY,
  REVENUECAT_WEB_PRODUCT_IDS,
  REVENUECAT_WEB_RESTORABLE_PRODUCT_IDS,
} from "../src/monetization/revenuecat-config.js";

describe("revenuecat-config web billing", () => {
  it("web key is a string (blank until RC Web Billing is configured)", () => {
    expect(typeof REVENUECAT_WEB_PUBLIC_KEY).toBe("string");
  });
  it("web sells the supporter unlock only", () => {
    expect(REVENUECAT_WEB_PRODUCT_IDS).toEqual(["supporter"]);
  });
  it("every web product id exists in the catalog", () => {
    const catalogIds = new Set(PRODUCTS.map((p) => p.id));
    for (const id of REVENUECAT_WEB_PRODUCT_IDS) expect(catalogIds.has(id)).toBe(true);
  });
  it("web restorable ids are a subset of the web product ids", () => {
    for (const id of REVENUECAT_WEB_RESTORABLE_PRODUCT_IDS) {
      expect(REVENUECAT_WEB_PRODUCT_IDS).toContain(id);
    }
  });
  it("supporter is a non-consumable (has an entitlement) so it can restore", () => {
    const supporter = PRODUCTS.find((p) => p.id === "supporter");
    expect(supporter && supporter.entitlement).toBe("supporter");
  });
});
