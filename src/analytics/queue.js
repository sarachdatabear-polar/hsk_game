// src/analytics/queue.js
// Bounded offline queue for analytics events. Pure + injectable store.
const KEY = "analyticsQueue";
export const DEFAULT_CAP = 200;

export function enqueue(store, event, cap = DEFAULT_CAP) {
  const raw = store.get(KEY, []);
  const q = Array.isArray(raw) ? raw : [];
  q.push(event);
  while (q.length > cap) q.shift(); // drop oldest on overflow
  store.set(KEY, q);
  return q.length;
}

export function drain(store) {
  const raw = store.get(KEY, []);
  const q = Array.isArray(raw) ? raw : [];
  store.set(KEY, []);
  return q;
}

export function clear(store) {
  store.set(KEY, []);
}
