"use strict";

export const CAT_MEMORIES = Object.freeze([
  { id: "garden-leaf", icon: "heart", titleKey: "cat.memory.leaf.title", storyKey: "cat.memory.leaf.story" },
  { id: "tea-steam", icon: "focus-heart", titleKey: "cat.memory.tea.title", storyKey: "cat.memory.tea.story" },
  { id: "lantern-glow", icon: "star", titleKey: "cat.memory.lantern.title", storyKey: "cat.memory.lantern.story" },
  { id: "bridge-light", icon: "streak", titleKey: "cat.memory.bridge.title", storyKey: "cat.memory.bridge.story" },
  { id: "plum-petal", icon: "paw", titleKey: "cat.memory.blossom.title", storyKey: "cat.memory.blossom.story" },
  { id: "scholar-brush", icon: "pencil", titleKey: "cat.memory.brush.title", storyKey: "cat.memory.brush.story" },
  { id: "book-ribbon", icon: "book", titleKey: "cat.memory.book.title", storyKey: "cat.memory.book.story" },
  { id: "market-orange", icon: "collection", titleKey: "cat.memory.market.title", storyKey: "cat.memory.market.story" },
]);

function hashText(value) {
  let hash = 2166136261;
  for (const char of String(value || "")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function memoryById(id) {
  return CAT_MEMORIES.find(item => item.id === id) || null;
}

export function memoryForJourney(day, existingIds = []) {
  const owned = new Set(Array.isArray(existingIds) ? existingIds : []);
  const unseen = CAT_MEMORIES.filter(item => !owned.has(item.id));
  const pool = unseen.length ? unseen : CAT_MEMORIES;
  return pool[hashText(day) % pool.length];
}
