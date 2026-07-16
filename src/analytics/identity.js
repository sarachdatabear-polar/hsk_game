// src/analytics/identity.js
// Anonymous identity for analytics. Pure + injectable store/gen.
// anon_id is a random UUID created ONLY on first call (i.e. after consent),
// never a device/ad id. session_id is per app-open.

const ANON_KEY = "analyticsAnonId";

export function getAnonId(store, gen) {
  let id = store.get(ANON_KEY, null);
  if (!id) {
    id = gen();
    store.set(ANON_KEY, id);
  }
  return id;
}

export function newSessionId(gen) {
  return gen();
}

export function clearAnonId(store) {
  store.set(ANON_KEY, null);
}
