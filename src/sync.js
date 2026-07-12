"use strict";
// Sync orchestrator (cloud-save round). Same contract as cloud.js: never
// throws/rejects, offline/failure resolves {ok:false} and gameplay never
// notices. Pure data flow: cloud rows -> mergeAll -> store -> cloud rows.
// `store` is injected ({get,set}) so node probes/tests can shim localStorage.
import { getSession, fetchSyncRows, pushSyncRows } from "./cloud.js";
import { mergeAll, defaultSyncMeta } from "./merge.js";

export const MIN_SYNC_GAP_MS = 30000;

let inFlight = false;
export function __resetForTests() { inFlight = false; }

export function localSnapshot(store) {
  return {
    mastery: store.get("mastery", {}),
    xp: store.get("xp", 0),
    daily: store.get("daily", null),
    quests: store.get("quests", null),
    monthly: store.get("monthly", null),
    wallet: store.get("wallet", 0),
    freezes: store.get("freezes", 0),
    shop: store.get("shop", null),
    stickers: store.get("stickers", null),
    best: store.get("best", {}),
  };
}

export function rowsFromLocal(userId, l) {
  return {
    progress: {
      user_id: userId,
      mastery: l.mastery || {},
      xp: Number(l.xp) || 0,
      streak: (l.daily && Number(l.daily.streak)) || 0,
      daily: l.daily || {},
      quests: l.quests || {},
      monthly: l.monthly || {},
      best: l.best || {},
      cosmetics: l.shop || {},
      stickers: { earned: (l.stickers && l.stickers.earned) || {} },
    },
    wallet: { user_id: userId, coins: Number(l.wallet) || 0, freezes: Number(l.freezes) || 0 },
  };
}

export function localFromRows(progressRow, walletRow) {
  const p = progressRow || {}, w = walletRow || {};
  return { mastery: p.mastery, xp: p.xp, daily: p.daily, quests: p.quests,
           monthly: p.monthly, best: p.best, shop: p.cosmetics,
           stickers: p.stickers, wallet: w.coins, freezes: w.freezes };
}

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Device-local calendar date from an epoch ms — same algorithm as main.js's
// (unexported) todayStr(): local Y/M/D, not UTC, so a stale-monthly settle
// here rolls over at the same midnight as main.js's boot-time
// settleMonthlyNow(). sync.js is otherwise pure/injectable (store, now), so
// this derives from the `now` param rather than importing a DOM-adjacent
// helper from main.js.
function localDateStr(ms) {
  const d = new Date(ms);
  const mm = String(d.getMonth() + 1).padStart(2, "0"), dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Clear dirty flags for keys whose stored value still equals what we pushed —
// a gameplay write that raced the push keeps its flag for the next edge.
function settleDirty(store, expected, lastSyncAt) {
  const meta = Object.assign(defaultSyncMeta(), store.get("sync", {}));
  meta.dirty = meta.dirty || {};
  for (const k of Object.keys(expected)) {
    if (eq(store.get(k, null), expected[k])) delete meta.dirty[k];
  }
  if (lastSyncAt) meta.lastSyncAt = lastSyncAt;
  store.set("sync", meta);
}

export async function reconcile(store, reason, now = Date.now()) {
  if (inFlight) return { ok: false, reason: "busy" };
  inFlight = true;
  try {
    const meta = Object.assign(defaultSyncMeta(), store.get("sync", {}));
    if (reason !== "sign-in" && now - meta.lastSyncAt < MIN_SYNC_GAP_MS) {
      return { ok: false, reason: "cooldown" };
    }
    const s = await getSession();
    if (!s.ok) return { ok: false, reason: s.reason };
    if (!s.session) return { ok: false, reason: "no-session" };
    const uid = s.session.user.id;
    const rows = await fetchSyncRows(uid);
    if (!rows.ok) return { ok: false, reason: rows.reason };
    const local = localSnapshot(store);
    const shopDirty = !!(meta.dirty && meta.dirty.shop);
    const today = localDateStr(now);
    // Both calls get `today` (not just the cloud-merged one): mergeAll's
    // stale-monthly settle is symmetric in local/cloud, so the baseline must
    // settle local's own stale month too — otherwise a local-only stale
    // rollover would show up as a spurious `changed:true` (or mask a real
    // one) purely from the settle, not from anything cloud contributed.
    const merged = mergeAll(local, localFromRows(rows.progress, rows.wallet), { shopDirty, today });
    const baseline = mergeAll(local, null, { shopDirty, today });
    const changed = !eq(merged, baseline);
    for (const k of Object.keys(merged)) store.set(k, merged[k]);
    const built = rowsFromLocal(uid, merged);
    const push = await pushSyncRows(built.progress, built.wallet);
    if (!push.ok) return { ok: false, reason: "network" };
    settleDirty(store, merged, now);
    return { ok: true, changed };
  } catch (e) {
    return { ok: false, reason: "network" };
  } finally {
    inFlight = false;
  }
}

export async function pushDirty(store, reason) {
  const meta = Object.assign(defaultSyncMeta(), store.get("sync", {}));
  if (!Object.keys(meta.dirty || {}).length) return { ok: true, skipped: true };
  if (inFlight) return { ok: false, reason: "busy" };
  inFlight = true;
  try {
    const s = await getSession();
    if (!s.ok || !s.session) return { ok: false };
    const local = localSnapshot(store);
    const built = rowsFromLocal(s.session.user.id, local);
    const r = await pushSyncRows(built.progress, built.wallet);
    if (r.ok) settleDirty(store, local, 0);
    return { ok: r.ok };
  } catch (e) {
    return { ok: false };
  } finally {
    inFlight = false;
  }
}
