"use strict";
// Street Project — pure goal/progress helpers. A project never escrows coins:
// progress is simply how close the current wallet is to the chosen decoration.

export const STREET_PROJECT_VERSION = 1;

export function defaultStreetProject() {
  return { v: STREET_PROJECT_VERSION, itemId: "", plotId: "", reserve: false };
}

export function normalizeStreetProject(project, ownedIds = []) {
  const raw = project && typeof project === "object" ? project : {};
  const itemId = typeof raw.itemId === "string" ? raw.itemId : "";
  const plotId = typeof raw.plotId === "string" ? raw.plotId : "";
  const reserve = !!raw.reserve;
  if (!itemId || (ownedIds || []).includes(itemId)) return defaultStreetProject();
  return { v: STREET_PROJECT_VERSION, itemId, plotId, reserve };
}

export function makeStreetProject(itemId, plotId = "") {
  return normalizeStreetProject({ itemId, plotId });
}

const coins = value => Math.max(0, Number(value) || 0);

// Coins spoken-for by an active reserved project. A commitment device, not a
// hard lock: the Street Shop checks OTHER purchases against wallet - this.
export function reservedAmount(project, item, wallet) {
  if (!project?.reserve || !item || item.type !== "deco" || project.itemId !== item.id) return 0;
  return Math.min(coins(wallet), coins(item.price));
}

export function projectStage(wallet, price) {
  const total = coins(price);
  if (!total || coins(wallet) >= total) return total ? 3 : 0;
  const ratio = coins(wallet) / total;
  if (ratio >= 2 / 3) return 2;
  if (ratio >= 1 / 3) return 1;
  return 0;
}

export function streetProjectProgress(project, item, beforeWallet, afterWallet = beforeWallet) {
  const valid = !!item && item.type === "deco" && project?.itemId === item.id && coins(item.price) > 0;
  if (!valid) {
    return {
      active: false, price: 0, before: 0, after: 0, gained: 0,
      remaining: 0, beforePct: 0, pct: 0, beforeStage: 0, stage: 0,
      ready: false, crossedReady: false,
    };
  }
  const price = coins(item.price);
  const before = coins(beforeWallet);
  const after = coins(afterWallet);
  const beforePct = Math.min(100, Math.floor(before / price * 100));
  const pct = Math.min(100, Math.floor(after / price * 100));
  const beforeStage = projectStage(before, price);
  const stage = projectStage(after, price);
  return {
    active: true,
    price,
    before,
    after,
    gained: Math.max(0, after - before),
    remaining: Math.max(0, price - after),
    beforePct,
    pct,
    beforeStage,
    stage,
    ready: after >= price,
    crossedReady: before < price && after >= price,
  };
}

export function remainingBucket(remaining) {
  const n = coins(remaining);
  if (n === 0) return "ready";
  if (n < 500) return "<500";
  if (n < 2000) return "500-1999";
  if (n < 5000) return "2000-4999";
  return "5000+";
}
