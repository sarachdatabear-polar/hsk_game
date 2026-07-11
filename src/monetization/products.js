"use strict";
// IAP product catalog — PRD §7.1. Pure data, SDK-independent (house pattern:
// interstitial-policy.js). `entitlement: "supporter"` marks the one
// non-consumable; coin packs are consumables and never restore.
//
// Prices here are MOCK-ERA DISPLAY ONLY: real stores return localized price
// strings and those must win once the RevenueCat provider lands. Nothing
// outside this file may hard-code a price.

export const PRODUCTS = [
  { id: "supporter", coins: 2000,  entitlement: "supporter", priceTHB: 79,  priceUSD: 2.99 },
  { id: "coins_s",   coins: 1000,  priceTHB: 29,  priceUSD: 0.99 },
  { id: "coins_m",   coins: 3500,  priceTHB: 99,  priceUSD: 2.99 },
  { id: "coins_l",   coins: 6500,  priceTHB: 169, priceUSD: 4.99 },
  { id: "coins_xl",  coins: 15000, priceTHB: 329, priceUSD: 9.99 },
];

export function productById(id) {
  return PRODUCTS.find(p => p.id === id) || null;
}

export function displayPrice(product, locale) {
  return locale === "th" ? `${product.priceTHB}฿` : `$${product.priceUSD.toFixed(2)}`;
}
