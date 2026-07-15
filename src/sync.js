"use strict";
// Sync orchestrator (cloud-save round). Same contract as cloud.js: never
// throws/rejects, offline/failure resolves {ok:false} and gameplay never
// notices. Pure data flow: cloud rows -> mergeAll -> store -> cloud rows.
// `store` is injected ({get,set}) so node probes/tests can shim localStorage.
import { getSession, fetchSyncRows, pushSyncRows, fetchLedgerSince, fetchLedgerOrder } from "./cloud.js";
import { mergeAll, defaultSyncMeta } from "./merge.js";

export const MIN_SYNC_GAP_MS = 30000;

// Reasons allowed to skip the cooldown gate: sign-in (a fresh session should
// always get one reconcile), monthly-dirty (pushDirty's redirect for a
// stale-monthly settle — it must run even if a routine reconcile just fired,
// since skipping it would fall through to nothing and leave the dirty flag
// unsettled indefinitely), and purchase (purchase-poll.js's real-provider
// poll retries ~2s apart — well under MIN_SYNC_GAP_MS — so every retry after
// the first would otherwise be dropped as "cooldown", making the poll a
// no-op past try 1).
const BYPASS_COOLDOWN = new Set(["sign-in", "monthly-dirty", "purchase"]);

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

export async function reconcile(store, reason, now = Date.now(), expectedOrderId = null) {
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
    // Missing pre-launch columns are the only safe degradation: without them
    // grant_purchase cannot commit, so no hidden purchase component can exist.
    // Any other ledger failure aborts before mutation below.
    const led = await fetchLedgerSince(uid, meta.lastLedgerAt);
    const ledgerOk = led.ok;
    // A real ledger/RLS failure makes the cloud wallet unsafe to fold: its
    // gap may already contain a purchase that the frozen cursor will return
    // later. Abort before any local writes so recovery cannot double-credit.
    // The one safe degradation is a provably missing schema: grant_purchase
    // cannot commit purchases without those columns, so the legacy max-fold
    // remains valid while the dark migration is still unapplied.
    if(!ledgerOk && led.reason !== "not-migrated") return { ok:false, reason:led.reason || "ledger" };
    // Guard: never touch led.rows when the fetch failed — some fake/real
    // clients return null/undefined `rows` alongside ok:false.
    const unseen = ledgerOk ? led.rows.reduce((sum, r) => sum + (Number(r.delta) || 0), 0) : 0;
    // Purchase polling must confirm the exact store transaction, never infer
    // success from an aggregate wallet increase (which could be unrelated
    // cloud progress). Keep the attribution alongside the ledger rows that
    // produced this fold and return it to the caller below.
    const unseenCredits = ledgerOk ? led.rows
      .filter(r => r.order_id)
      .map(r => ({ orderId: r.order_id, delta: Number(r.delta) || 0 })) : [];
    let credits = unseenCredits;
    // The native billing sheet can foreground the app before purchase()
    // resolves. A normal foreground reconcile may therefore consume and fold
    // this row first. Look up the exact order only for confirmation in that
    // case; because it is older than the cursor, never add it to `unseen`.
    if (expectedOrderId && !credits.some(c => c.orderId === expectedOrderId)) {
      const exact = await fetchLedgerOrder(uid, expectedOrderId);
      if (exact.ok && exact.row) {
        credits = credits.concat({
          orderId: exact.row.order_id,
          delta: Number(exact.row.delta) || 0,
        });
      }
    }
    // FRESH-CURSOR ADOPT (I2 fix, coin-purchase go-live review): a fresh
    // cursor (meta.lastLedgerAt === "") means either a brand-new device or a
    // post-wipe reinstall. In BOTH cases the client has no history of its
    // own to reconcile against — the cloud wallet already reflects every
    // settled purchase (the webhook wrote it directly), so the correct move
    // is to ADOPT the cloud wallet wholesale, not to subtract-then-add
    // unseenPurchased on top of it. Subtract-then-add on a fresh cursor lets
    // a spent-down local wallet float the cloud side back UP by the full
    // unseen sum (buy 1000 -> spend to 300 -> push -> wipe -> restore would
    // give max(0, 300-1000->clamp 0)+1000 = 1000, minting 700 coins out of
    // thin air, and repeatably so across further wipes) — it also violates
    // PRD §7.4 (consumables never restore). We still fetch the ledger rows
    // (their max created_at is what advances the cursor) and still advance
    // the cursor either way; we just pass 0 as unseenPurchased into the fold
    // so it degrades to a plain max(local, cloud) adopt. The webhook's atomic
    // grant guarantees that no ledger row is visible without its matching
    // wallet increment.
    const freshCursor = !meta.lastLedgerAt;
    // On the safe not-migrated path unseenPurchased is 0; real ledger failures
    // already returned above.
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
    // On a fresh cursor, pass 0 (adopt) instead of the summed unseen — see
    // the freshCursor comment above.
    // A purchase poll supplies its exact store transaction. On a fresh cursor,
    // fold only that new row: old lifetime rows are already represented by the
    // cloud wallet and must not resurrect spent consumables, while the just-
    // completed order must still be added when local earnings are ahead.
    const expectedCredit = expectedOrderId
      ? unseenCredits.find(c => c.orderId === expectedOrderId)
      : null;
    const foldUnseen = !ledgerOk ? 0
      : freshCursor ? (expectedCredit ? expectedCredit.delta : 0)
      : unseen;
    const merged = mergeAll(local, localFromRows(rows.progress, rows.wallet),
      { shopDirty, today, unseenPurchased: foldUnseen });
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
    if (ledgerOk && led.rows.length) {
      const maxAt = led.rows.reduce((m, r) => (r.created_at > m ? r.created_at : m), led.rows[0].created_at);
      const cursorMeta = Object.assign(defaultSyncMeta(), store.get("sync", {}));
      cursorMeta.lastLedgerAt = maxAt;
      store.set("sync", cursorMeta);
    }
    for (const k of Object.keys(merged)) store.set(k, merged[k]);
    const built = rowsFromLocal(uid, merged);
    const push = await pushSyncRows(built.progress, built.wallet);
    // The merged keys above are durable local writes even when the following
    // cloud push fails. Tell DOM/in-memory callers to rehydrate so they do not
    // overwrite those merged values with stale module-scope caches. This is
    // especially important when the progress-row upsert succeeds but the
    // wallet-row upsert fails after a stale-month reward was settled.
    if (!push.ok) return { ok: false, reason: "network", localChanged: true, credits };
    settleDirty(store, merged, now);
    return { ok: true, changed, credits };
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
