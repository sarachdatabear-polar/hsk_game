"use strict";
// Pure two-state merge folds for cloud-save reconcile (design doc 2026-07-10 §2).
// Convention: first arg = local, second = cloud. Every fold tolerates
// null/undefined on either side and returns a normalized value. All rules are
// additive-safe: no fold can lose progress in either direction.
import { defaultShop } from "./shop.js";
import { defaultStickers } from "./stickers.js";
import { defaultQuestState, defaultMonthly, MONTHLY_TARGET, settleMonthly } from "./quests.js";
import { defaultDaily } from "./daily.js";
import { normalizeStreetLayout } from "./street.js";

export const SYNC_KEYS = ["mastery", "xp", "daily", "quests", "monthly",
  "wallet", "freezes", "shop", "stickers", "best"];

export function defaultSyncMeta() {
  return { dirty: {}, lastSyncAt: 0, lastLedgerAt: "", shopSlots: null, shopPreferences: null };
}

const num = v => Number(v) || 0;

export function mergeXp(a, b) { return Math.max(num(a), num(b), 0); }
export function mergeWallet(a, b) { return Math.max(num(a), num(b), 0); }
export function mergeFreezes(a, b) {
  return Math.min(2, Math.max(num(a), num(b), 0));
}

export function mergeBest(a, b) {
  const A = a || {}, B = b || {};
  const out = {};
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
    const x = A[k], y = B[k];
    if (!x || !y) { out[k] = { ...(x || y) }; continue; }
    out[k] = num(y.score) > num(x.score) ? { ...y } : { ...x };
  }
  return out;
}

// queue is transient display state: cloud-merged stickers land in the album
// silently and must never re-announce, so the queue is never taken from cloud.
export function mergeStickers(a, b) {
  const A = Object.assign(defaultStickers(), a || {});
  const Bearned = (b && b.earned) || {};
  const earned = {};
  for (const id of new Set([...Object.keys(A.earned), ...Object.keys(Bearned)])) {
    const x = A.earned[id], y = Bearned[id];
    earned[id] = x && y ? (x < y ? x : y) : (x || y);
  }
  return { earned, queue: Array.isArray(A.queue) ? A.queue.slice() : [] };
}

// The four equipped-cosmetic slots, normalized through defaultShop so null/
// partial shop states compare stably. sync.js diffs these against the
// last-synced baseline (meta.shopSlots) to detect a REAL local re-dress.
export function slotsOf(shop) {
  const s = Object.assign(defaultShop(), shop || {});
  return { skin: s.skin, backdrop: s.backdrop, effect: s.effect, soundpack: s.soundpack };
}

export function streetLayoutOf(shop) {
  const s = Object.assign(defaultShop(), shop || {});
  return normalizeStreetLayout(s.streetLayout, s.owned || []);
}

// Sync preference baseline. Ownership/tier changes must not masquerade as a
// re-dress/rearrange, so only equipped slots + canonical layout participate.
export function shopPreferencesOf(shop) {
  return { slots: slotsOf(shop), streetLayout: streetLayoutOf(shop) };
}

// Equipped slots resolve by dirty-bit LWW: local wins iff the equip slots
// themselves changed locally since the last successful sync (sync.js diffs
// slotsOf(local.shop) against the meta.shopSlots baseline) — so a fresh
// install adopts the cloud outfit, but an unsynced re-dress isn't undone by
// an old cloud row.
export function mergeShop(a, b, localPreferenceDirty = false) {
  const A = Object.assign(defaultShop(), a || {});
  const flags = typeof localPreferenceDirty === "object"
    ? { slotsDirty: !!localPreferenceDirty.slotsDirty, layoutDirty: !!localPreferenceDirty.layoutDirty }
    : { slotsDirty: !!localPreferenceDirty, layoutDirty: false };
  if (!b) {
    return { owned: [...(A.owned || [])], skin: A.skin, backdrop: A.backdrop,
             effect: A.effect, soundpack: A.soundpack, tiers: { ...(A.tiers || {}) },
             streetLayout: normalizeStreetLayout(A.streetLayout, A.owned || []) };
  }
  const B = Object.assign(defaultShop(), b);
  const owned = [...new Set([...(A.owned || []), ...(B.owned || [])])];
  const tiers = {};
  for (const id of new Set([...Object.keys(A.tiers || {}), ...Object.keys(B.tiers || {})])) {
    tiers[id] = Math.max(num((A.tiers || {})[id]), num((B.tiers || {})[id]));
  }
  const slots = flags.slotsDirty ? A : B;
  // A legacy cloud row has no layout preference to adopt. Welcome ownership
  // and coach completion are additive even when the other side's arrangement
  // wins; the chosen placements are normalized against merged ownership.
  const bHasLayout = !!(b && b.streetLayout && b.streetLayout.v === 2);
  const chosenLayout = flags.layoutDirty || !bHasLayout ? A.streetLayout : B.streetLayout;
  const streetLayout = normalizeStreetLayout({
    ...(chosenLayout || {}),
    welcomeOwned: !!(A.streetLayout?.welcomeOwned || B.streetLayout?.welcomeOwned),
    coachDone: !!(A.streetLayout?.coachDone || B.streetLayout?.coachDone),
  }, owned);
  return { owned, skin: slots.skin, backdrop: slots.backdrop,
           effect: slots.effect, soundpack: slots.soundpack, tiers, streetLayout };
}

// s/k are cumulative counters: max is the safe fold (sum would double-count
// the shared pre-sync history). r is the transient current run — it follows
// whichever side saw the word more recently (ls), never a max of both.
export function mergeMastery(a, b) {
  const A = a || {}, B = b || {};
  const out = {};
  for (const h of new Set([...Object.keys(A), ...Object.keys(B)])) {
    const x = A[h], y = B[h];
    if (!x || !y) { out[h] = { ...(x || y) }; continue; }
    const s = Math.max(num(x.s), num(y.s));
    const k = Math.min(Math.max(num(x.k), num(y.k)), s);
    const newer = num(x.ls) >= num(y.ls) ? x : y;
    out[h] = { s, k, r: num(newer.r), ls: Math.max(num(x.ls), num(y.ls)) };
  }
  return out;
}

// Daily-quest state is per-day scratch (progress/done roll over on date
// change), so cross-date comparison is meaningless: newer date wins wholesale.
export function mergeQuests(a, b) {
  const A = Object.assign(defaultQuestState(), a || {});
  const B = Object.assign(defaultQuestState(), b || {});
  if (A.date !== B.date) {
    const w = A.date > B.date ? A : B;
    return { date: w.date, progress: { ...(w.progress || {}) }, done: [...(w.done || [])] };
  }
  const progress = {};
  for (const id of new Set([...Object.keys(A.progress || {}), ...Object.keys(B.progress || {})])) {
    progress[id] = Math.max(num((A.progress || {})[id]), num((B.progress || {})[id]));
  }
  return { date: A.date, progress, done: [...new Set([...(A.done || []), ...(B.done || [])])] };
}

export function mergeMonthly(a, b) {
  const A = Object.assign(defaultMonthly(), a || {});
  const B = Object.assign(defaultMonthly(), b || {});
  if (A.month !== B.month) return A.month > B.month ? A : B;
  return { month: A.month,
           done: Math.min(MONTHLY_TARGET, Math.max(num(A.done), num(B.done))),
           claimed: !!(A.claimed || B.claimed) };
}

function daysBetween(a, b) {   // whole days b - a; 0 when either is invalid/empty
  if (!a || !b) return 0;
  const da = new Date(a + "T00:00:00Z"), db = new Date(b + "T00:00:00Z");
  if (isNaN(da) || isNaN(db)) return 0;
  return Math.round((db - da) / 86400000);
}

function normDaily(v) {
  const d = Object.assign(defaultDaily(), v || {});
  d.today = Object.assign({ date: "", resolved: 0 }, d.today);
  return d;
}

function mergeToday(x, y) {
  if (x.date === y.date) return { date: x.date, resolved: Math.max(num(x.resolved), num(y.resolved)) };
  return x.date > y.date ? { ...x } : { ...y };
}

// Chain merge (design §2): the newer-`last` side is the live chain; the older
// side extends it only when their calendars touch or overlap. Taking a bare
// max would resurrect long-dead streaks, so a disconnected old chain loses.
export function mergeDaily(a, b) {
  const A = normDaily(a), B = normDaily(b);
  const today = mergeToday(A.today, B.today);
  if (A.last === B.last) {
    const base = A.streak >= B.streak ? A : B;
    return { last: base.last, streak: Math.max(A.streak, B.streak),
             today, restWeek: base.restWeek, restDay: base.restDay };
  }
  const N = A.last > B.last ? A : B;
  const O = N === A ? B : A;
  let streak = N.streak;
  const gap = daysBetween(O.last, N.last);
  if (O.last && gap >= 1 && gap <= N.streak) {
    streak = Math.max(N.streak, num(O.streak) + Math.min(N.streak, gap));
  }
  return { last: N.last, streak, today, restWeek: N.restWeek, restDay: N.restDay };
}

// A completed-but-unclaimed month is unrealized wallet value (unlike daily
// quests, which credit the wallet immediately) — it must be settled before a
// cross-month merge would otherwise discard it. The naive fix (credit the
// reward once into the merged wallet AFTER folding) double-pays: if a
// device's own boot-time settleMonthlyNow() already paid the stale month
// into ITS wallet, and reconcile then runs against a still-stale row on the
// other side, a second reward gets folded in on top of the already-settled
// wallet. The correct order is to settle EACH side into ITS OWN wallet
// first (via quests.js's settleMonthly — same rule settleMonthlyNow uses,
// so a side that's already current-month is an idempotent no-op) and only
// then max-fold the two settled wallets together.
// THE FOLD (coin-purchase go-live, design doc §3 as amended 2026-07-12 — the
// doc's looser "add after the max fold" wording double-counts once the cloud
// wallet already reflects the purchase; this is the corrected formula).
//
// Purchased coins are granted server-side: the webhook inserts a ledger row
// (event_id set) AND atomically increments the cloud wallet row. So by the
// time reconcile runs, the cloud wallet may ALREADY include a purchase the
// client hasn't seen locally. `unseenPurchased` is the sum of ledger deltas
// for event_id-tagged rows newer than the client's cursor (sync.js computes
// it from fetchLedgerSince).
//
// A bare max(local, cloud) either eats the purchase (if local is otherwise
// ahead) or — if we naively added unseenPurchased on top of both sides —
// double-counts it for a client that already pushed its earned coins into
// the cloud wallet the webhook then incremented. The fix: subtract
// unseenPurchased from the cloud contribution BEFORE the max fold (this
// neutralizes the cloud's purchase component so the fold only compares the
// two sides' shared, already-synced history) and add it back ONCE after the
// fold (this credits the purchase exactly once, regardless of which side the
// max picked). Value-neutral for any row whose value already exists on BOTH
// sides — that's exactly the well-synced case. mergeWallet's floor-at-0 clamp
// absorbs a spent-down cloud wallet going negative after the subtraction.
//
// unseenPurchased defaults to 0, at which point this is a 0-subtract/0-add
// no-op: byte-identical to the pre-fold formula (test-asserted in merge.test.js).
export function mergeAll(local, cloud, { shopDirty = false, shopLayoutDirty = false, today = null, unseenPurchased = 0 } = {}) {
  const l = local || {}, c = cloud || {};
  const lm = today ? settleMonthly(Object.assign(defaultMonthly(), l.monthly || {}), today) : { state: l.monthly, earned: 0 };
  const cm = today ? settleMonthly(Object.assign(defaultMonthly(), c.monthly || {}), today) : { state: c.monthly, earned: 0 };
  const unseen = num(unseenPurchased);
  return {
    mastery: mergeMastery(l.mastery, c.mastery),
    xp: mergeXp(l.xp, c.xp),
    daily: mergeDaily(l.daily, c.daily),
    quests: mergeQuests(l.quests, c.quests),
    monthly: mergeMonthly(lm.state, cm.state),
    wallet: mergeWallet(num(l.wallet) + lm.earned, num(c.wallet) + cm.earned - unseen) + unseen,
    freezes: mergeFreezes(l.freezes, c.freezes),
    shop: mergeShop(l.shop, c.shop, { slotsDirty: shopDirty, layoutDirty: shopLayoutDirty }),
    stickers: mergeStickers(l.stickers, c.stickers),
    best: mergeBest(l.best, c.best),
  };
}
