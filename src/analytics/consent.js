// src/analytics/consent.js
// Analytics consent flag. Default OFF. Pure + injectable store.
const KEY = "analyticsEnabled";

export function isEnabled(store) {
  return store.get(KEY, false) === true;
}

export function setEnabled(store, on) {
  store.set(KEY, !!on);
}
