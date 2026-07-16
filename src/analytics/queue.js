// src/analytics/queue.js
// Bounded offline queue for analytics events. Pure + injectable store.
const KEY = "analyticsQueue";
export const DEFAULT_CAP = 200;

export function enqueue(store, event, cap = DEFAULT_CAP) {
  const q = store.get(KEY, []);
  q.push(event);
  while (q.length > cap) q.shift(); // drop oldest on overflow
  store.set(KEY, q);
  return q.length;
}

export function drain(store) {
  const q = store.get(KEY, []);
  store.set(KEY, []);
  return q;
}

export function clear(store) {
  store.set(KEY, []);
}
