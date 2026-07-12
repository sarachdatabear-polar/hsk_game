"use strict";
// Pure two-state merge folds for cloud-save reconcile (design doc 2026-07-10 §2).
// Convention: first arg = local, second = cloud. Every fold tolerates
// null/undefined on either side and returns a normalized value. All rules are
// additive-safe: no fold can lose progress in either direction.
import { defaultShop } from "./shop.js";
import { defaultStickers } from "./stickers.js";
import { defaultQuestState, defaultMonthly, MONTHLY_TARGET, MONTHLY_REWARD } from "./quests.js";
import { defaultDaily } from "./daily.js";

export const SYNC_KEYS = ["mastery", "xp", "daily", "quests", "monthly",
  "wallet", "freezes", "shop", "stickers", "best"];

export function defaultSyncMeta() { return { dirty: {}, lastSyncAt: 0 }; }

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

// Equipped slots resolve by dirty-bit LWW: local wins iff the shop key changed
// locally since the last successful sync — so a fresh install adopts the
// cloud outfit, but an unsynced re-dress isn't undone by an old cloud row.
export function mergeShop(a, b, localSlotsDirty) {
  const A = Object.assign(defaultShop(), a || {});
  if (!b) {
    return { owned: [...(A.owned || [])], skin: A.skin, backdrop: A.backdrop,
             effect: A.effect, soundpack: A.soundpack, tiers: { ...(A.tiers || {}) } };
  }
  const B = Object.assign(defaultShop(), b);
  const owned = [...new Set([...(A.owned || []), ...(B.owned || [])])];
  const tiers = {};
  for (const id of new Set([...Object.keys(A.tiers || {}), ...Object.keys(B.tiers || {})])) {
    tiers[id] = Math.max(num((A.tiers || {})[id]), num((B.tiers || {})[id]));
  }
  const slots = localSlotsDirty ? A : B;
  return { owned, skin: slots.skin, backdrop: slots.backdrop,
           effect: slots.effect, soundpack: slots.soundpack, tiers };
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

// coins owed for the month a cross-month merge discards.
// A completed-but-unclaimed month is unrealized wallet value (unlike daily
// quests, which credit the wallet immediately) — settle it before it's lost.
// Mirrors main.js's local-path settleMonthlyNow() guard. Idempotent: after
// one merge the stale month no longer exists on either side.
export function staleMonthlyOwed(a, b) {
  const A = Object.assign(defaultMonthly(), a || {});
  const B = Object.assign(defaultMonthly(), b || {});
  if (A.month === B.month) return 0;
  const stale = A.month > B.month ? B : A;
  return stale.done >= MONTHLY_TARGET && !stale.claimed ? MONTHLY_REWARD : 0;
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

export function mergeAll(local, cloud, { shopDirty = false } = {}) {
  const l = local || {}, c = cloud || {};
  return {
    mastery: mergeMastery(l.mastery, c.mastery),
    xp: mergeXp(l.xp, c.xp),
    daily: mergeDaily(l.daily, c.daily),
    quests: mergeQuests(l.quests, c.quests),
    monthly: mergeMonthly(l.monthly, c.monthly),
    wallet: mergeWallet(l.wallet, c.wallet) + staleMonthlyOwed(l.monthly, c.monthly),
    freezes: mergeFreezes(l.freezes, c.freezes),
    shop: mergeShop(l.shop, c.shop, shopDirty),
    stickers: mergeStickers(l.stickers, c.stickers),
    best: mergeBest(l.best, c.best),
  };
}
