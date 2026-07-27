"use strict";

import { CAT_BACKGROUNDS } from "./cat-journey.js";

export const CAT_MEMORY_PACK = "evergreen-v1";

export const CAT_KEEPSAKES = Object.freeze([
  { id: "heart-leaf", icon: "heart", asset: "keepsake-heart-leaf-v1.png" },
  { id: "tea-cup", icon: "focus-heart" },
  { id: "paper-lantern", icon: "star" },
  { id: "bridge-charm", icon: "streak" },
  { id: "plum-petal", icon: "paw" },
  { id: "scholar-brush", icon: "pencil" },
  { id: "book-ribbon", icon: "book" },
  { id: "market-orange", icon: "collection" },
  { id: "paper-kite", icon: "star" },
  { id: "bamboo-sprig", icon: "paw" },
  { id: "river-pebble", icon: "focus-heart" },
  { id: "wooden-bell", icon: "sound" },
]);

const memory = (id, destinationId, minBondTier, keepsakeId, key) => Object.freeze({
  id,
  pack: CAT_MEMORY_PACK,
  destinationId,
  minBondTier,
  keepsakeId,
  titleKey: `cat.memory.${key}.title`,
  storyKey: `cat.memory.${key}.story`,
  enabled: true,
});

export const CAT_MEMORIES = Object.freeze([
  // Study Buddy: seven exact stories before a repeat is possible.
  memory("garden-leaf", "bg-home", 0, "heart-leaf", "leaf"),
  memory("tea-steam", "bg-home", 0, "tea-cup", "tea"),
  memory("book-ribbon", "bg-home", 0, "book-ribbon", "book"),
  memory("sunny-window", "bg-home", 0, "paper-kite", "sunnyWindow"),
  memory("page-corner", "bg-home", 0, "book-ribbon", "pageCorner"),
  memory("pencil-curl", "bg-home", 0, "scholar-brush", "pencilCurl"),
  memory("little-bell-note", "bg-home", 0, "wooden-bell", "littleBell"),

  // Curious Paws — Vocabulary Garden.
  memory("plum-petal", "bg-cat-garden-v1", 1, "plum-petal", "blossom"),
  memory("bamboo-shadow", "bg-cat-garden-v1", 1, "bamboo-sprig", "bambooShadow"),
  memory("koi-ripple", "bg-cat-garden-v1", 1, "river-pebble", "koiRipple"),
  memory("garden-kite", "bg-cat-garden-v1", 1, "paper-kite", "gardenKite"),
  memory("morning-dew", "bg-cat-garden-v1", 1, "heart-leaf", "morningDew"),
  memory("quiet-stone-path", "bg-cat-garden-v1", 1, "bridge-charm", "stonePath"),

  // Neighborhood Explorer — Morning Market.
  memory("market-orange", "bg-cat-market-v1", 2, "market-orange", "market"),
  memory("blank-market-tag", "bg-cat-market-v1", 2, "book-ribbon", "marketTag"),
  memory("basket-ribbon", "bg-cat-market-v1", 2, "book-ribbon", "basketRibbon"),
  memory("sesame-bun", "bg-cat-market-v1", 2, "tea-cup", "sesameBun"),
  memory("market-bell", "bg-cat-market-v1", 2, "wooden-bell", "marketBell"),
  memory("umbrella-colors", "bg-cat-market-v1", 2, "paper-kite", "umbrellaColors"),

  // Lantern Friend — Lantern Riverside.
  memory("lantern-glow", "bg-cat-lantern-v1", 3, "paper-lantern", "lantern"),
  memory("bridge-light", "bg-cat-lantern-v1", 3, "bridge-charm", "bridge"),
  memory("river-pebble", "bg-cat-lantern-v1", 3, "river-pebble", "riverPebble"),
  memory("moon-reflection", "bg-cat-lantern-v1", 3, "paper-lantern", "moonReflection"),
  memory("firefly-path", "bg-cat-lantern-v1", 3, "heart-leaf", "fireflyPath"),
  memory("riverside-charm", "bg-cat-lantern-v1", 3, "bridge-charm", "riversideCharm"),

  // Scholar Cat — Scholar Gate.
  memory("scholar-brush", "bg-cat-scholar-gate-v1", 4, "scholar-brush", "brush"),
  memory("inkstone-light", "bg-cat-scholar-gate-v1", 4, "river-pebble", "inkstoneLight"),
  memory("mountain-cloud", "bg-cat-scholar-gate-v1", 4, "paper-kite", "mountainCloud"),
  memory("scholar-bookmark", "bg-cat-scholar-gate-v1", 4, "book-ribbon", "scholarBookmark"),
  memory("quiet-scholar-desk", "bg-cat-scholar-gate-v1", 4, "scholar-brush", "scholarDesk"),
]);

function hashText(value) {
  let hash = 2166136261;
  for (const char of String(value || "")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function historyEntries(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => typeof item === "string"
    ? { id: item, day: "", index }
    : { id: item?.storyId || item?.id || "", day: item?.day || "", index })
    .filter(item => item.id);
}

export function memoryById(id) {
  return CAT_MEMORIES.find(item => item.id === id) || null;
}

export function keepsakeById(id) {
  return CAT_KEEPSAKES.find(item => item.id === id) || null;
}

export function eligibleMemories({
  bondTier = 0,
  enabledPacks = [CAT_MEMORY_PACK],
} = {}) {
  const packs = new Set(enabledPacks);
  return CAT_MEMORIES.filter(item =>
    item.enabled && item.minBondTier <= bondTier && packs.has(item.pack));
}

export function memoryForJourney(day, history = [], options = {}) {
  const eligible = eligibleMemories(options);
  if (!eligible.length) return null;
  const entries = historyEntries(history);
  const seen = new Set(entries.map(item => item.id));
  const unseen = eligible.filter(item => !seen.has(item.id));
  if (unseen.length) return unseen[hashText(day) % unseen.length];

  // Once every eligible story has appeared, choose among the least recently
  // seen. A legacy string-only history has no dates, so all stories tie and
  // the deterministic day hash remains the fallback.
  const lastSeen = new Map();
  for (const entry of entries) {
    const prior = lastSeen.get(entry.id);
    const rank = entry.day || String(entry.index).padStart(8, "0");
    if (!prior || rank > prior) lastSeen.set(entry.id, rank);
  }
  const oldest = eligible.reduce((value, item) => {
    const rank = lastSeen.get(item.id) || "";
    return value === null || rank < value ? rank : value;
  }, null);
  const pool = eligible.filter(item => (lastSeen.get(item.id) || "") === oldest);
  return pool[hashText(day) % pool.length];
}

export function validateCatMemoryContent({
  memories = CAT_MEMORIES,
  keepsakes = CAT_KEEPSAKES,
  strings = null,
} = {}) {
  const errors = [];
  const destinationIds = new Set(CAT_BACKGROUNDS.map(item => item.id));
  const keepsakeIds = new Set();
  for (const item of keepsakes) {
    if (!item?.id) errors.push("keepsake missing id");
    else if (keepsakeIds.has(item.id)) errors.push(`duplicate keepsake id: ${item.id}`);
    else keepsakeIds.add(item.id);
    if (!item?.icon) errors.push(`keepsake missing icon: ${item?.id || "unknown"}`);
  }
  const memoryIds = new Set();
  for (const item of memories) {
    if (!item?.id) errors.push("memory missing id");
    else if (memoryIds.has(item.id)) errors.push(`duplicate memory id: ${item.id}`);
    else memoryIds.add(item.id);
    if (!item?.pack) errors.push(`memory missing pack: ${item?.id || "unknown"}`);
    if (!destinationIds.has(item?.destinationId)) errors.push(`unknown destination: ${item?.id || "unknown"}`);
    if (!keepsakeIds.has(item?.keepsakeId)) errors.push(`unknown keepsake: ${item?.id || "unknown"}`);
    if (!Number.isInteger(item?.minBondTier) || item.minBondTier < 0 || item.minBondTier > 4) {
      errors.push(`invalid bond tier: ${item?.id || "unknown"}`);
    }
    for (const key of [item?.titleKey, item?.storyKey]) {
      if (!key) errors.push(`memory missing translation key: ${item?.id || "unknown"}`);
      else if (strings) {
        for (const locale of ["en", "th"]) {
          if (!strings[locale] || typeof strings[locale][key] !== "string" || !strings[locale][key].trim()) {
            errors.push(`missing ${locale} translation: ${key}`);
          }
        }
      }
    }
  }
  return errors;
}
