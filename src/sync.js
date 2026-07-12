"use strict";
// Sync orchestrator (cloud-save round). Same contract as cloud.js: never
// throws/rejects, offline/failure resolves {ok:false} and gameplay never
// notices. Pure data flow: cloud rows -> mergeAll -> store -> cloud rows.
// `store` is injected ({get,set}) so node probes/tests can shim localStorage.
import { getSession, fetchSyncRows, pushSyncRows, fetchLedgerSince } from "./cloud.js";
import { mergeAll, defaultSyncMeta } from "./merge.js";

export const MIN_SYNC_GAP_MS = 30000;

// Reasons allowed to skip the cooldown gate: sign-in (a fresh session should
// always get one reconcile), and monthly-dirty (pushDirty's redirect for a
// stale-monthly settle — it must run even if a routine reconcile just fired,
// since skipping it would fall through to nothing and leave the dirty flag
// unsettled indefinitely).
const BYPASS_COOLDOWN = new Set(["sign-in", "monthly-dirty"]);

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
    if (!BYPASS_COOLDOWN.has(reason) && now - meta.lastSyncAt < MIN_SYNC_GAP_MS) {
      return { ok: false, reason: "cooldown" };
    }
    const s = await getSession();
    if (!s.ok) return { ok: false, reason: s.reason };
    if (!s.session) return { ok: false, reason: "no-session" };
    const uid = s.session.user.id;
    const rows = await fetchSyncRows(uid);
    if (!rows.ok) return { ok: false, reason: rows.reason };
    // Ledger-cursor fetch (coin-purchase go-live, THE FOLD — merge.js's
    // mergeAll comment has the full formula). Purchased coins ride the
    // ledger, not the max-fold wallet compare: the webhook already
    // incremented the cloud wallet AND inserted an event_id-tagged ledger
    // row, so we need to know how much of the cloud wallet's gap over local
    // is an already-counted purchase before folding.
    //
    // A failed fetch here must NOT silently fall through to a plain
    // (non-ledger-aware) reconcile: with "how much is unseen" unknown, we
    // could either wrongly credit 0 (eating a real purchase, the exact bug
    // this exists to fix) or — worse — let the cursor advance on some LATER
    // successful fetch without ever having summed these rows in between,
    // skipping them forever. Treat it exactly like any other network
    // failure: bail whole-hog, dirty flags stay set, next reconcile retries
    // both fetches together.
    const led = await fetchLedgerSince(uid, meta.lastLedgerAt);
    if (!led.ok) return { ok: false, reason: "network" };
    const unseen = led.rows.reduce((sum, r) => sum + (Number(r.delta) || 0), 0);
    const local = localSnapshot(store);
    const shopDirty = !!(meta.dirty && meta.dirty.shop);
    const today = localDateStr(now);
    // Both calls get `today` (not just the cloud-merged one): mergeAll's
    // stale-monthly settle is symmetric in local/cloud, so the baseline must
    // settle local's own stale month too — otherwise a local-only stale
    // rollover would show up as a spurious `changed:true` (or mask a real
    // one) purely from the settle, not from anything cloud contributed.
    // unseenPurchased goes ONLY into the cloud-merged call: the baseline has
    // no cloud side to subtract a purchase component out of (mergeAll(local,
    // null, …) already contributes 0 from "cloud"), so passing it there too
    // would just add unseen straight into the baseline and mask real change.
    const merged = mergeAll(local, localFromRows(rows.progress, rows.wallet),
      { shopDirty, today, unseenPurchased: unseen });
    const baseline = mergeAll(local, null, { shopDirty, today });
    const changed = !eq(merged, baseline);
    // CURSOR ORDERING (THE FOLD): advance + persist meta.lastLedgerAt BEFORE
    // writing the merged keys to the store below. This file already has a
    // "two meta writes per reconcile" reality — settleDirty (further down)
    // stamps lastSyncAt/dirty AFTER the store writes — this adds an earlier,
    // narrower write that touches only lastLedgerAt; both writes read-modify
    // the same `sync` key via defaultSyncMeta()-assign, so they compose
    // (settleDirty's later read picks up this write's cursor).
    //
    // Why this order and not the reverse: if the process dies between this
    // write and the merged-key writes below, we land on
    // cursor-advanced/wallet-not-yet-credited. The NEXT reconcile's ledger
    // fetch then sees zero unseen rows (cursor already past them) — but the
    // cloud wallet still holds the webhook's increment, so the plain
    // max(local, cloud) fold picks the cloud side and self-heals. Writing
    // the wallet first instead would leave cursor-behind/wallet-with-credit
    // on a crash: the next reconcile would re-fetch the SAME ledger rows as
    // "unseen" and add them again on top of a wallet that already has them —
    // an unhealable double-credit.
    if (led.rows.length) {
      const maxAt = led.rows.reduce((m, r) => (r.created_at > m ? r.created_at : m), led.rows[0].created_at);
      const cursorMeta = Object.assign(defaultSyncMeta(), store.get("sync", {}));
      cursorMeta.lastLedgerAt = maxAt;
      store.set("sync", cursorMeta);
    }
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

export async function pushDirty(store, reason, now = Date.now(), midRound = false) {
  const meta = Object.assign(defaultSyncMeta(), store.get("sync", {}));
  if (!Object.keys(meta.dirty || {}).length) return { ok: true, skipped: true };
  // monthly is the one key whose CLOUD side can hold unrealized coin value (a
  // completed-unclaimed month) — a blind push here could clobber it without
  // ever crediting the reward. Redirect through reconcile so the stale month
  // gets settled first. reconcile owns `inFlight` end-to-end, so this must
  // happen before pushDirty sets its own inFlight below.
  if (meta.dirty.monthly) {
    // …but never mid-battle: reconcile writes merged state back into the
    // store, and syncEdge's invariant (design §3, "merged state must not
    // change mid-battle") applies to ANY reconcile, including this redirect —
    // a hide during a paused battle would otherwise snapshot local, resume
    // would keep playing on in-memory state, and the resolving reconcile's
    // store writes would roll localStorage back to the pre-resume snapshot.
    // Nor may it fall back to the blind push (that's the exact clobber the
    // redirect exists to prevent) — defer wholesale, dirty bits intact, and
    // the next battle-free sync edge catches up.
    if (midRound) return { ok: false, reason: "mid-round" };
    return reconcile(store, "monthly-dirty", now);
  }
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
