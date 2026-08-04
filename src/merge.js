"use strict";
// Pure two-state merge folds for cloud-save reconcile (design doc 2026-07-10 §2).
// Convention: first arg = local, second = cloud. Every fold tolerates
// null/undefined on either side and returns a normalized value. Most folds
// here are max-based — safe for monotonic counters, but max CAN absorb value
// across a mismatched pair (a spend, an unrelated numeric lead) whenever the
// state isn't monotonic. The wallet is the sharpest case: its legacy fold
// (mergeWallet, still used for uid switches/fresh installs/legacy meta — see
// mergeAll) is exactly this kind of max and is NOT additive-safe. The
// walletBase delta path (mergeWalletDelta, design doc
// 2026-08-04-wallet-delta-fold.md) is what actually makes the wallet
// additive-safe in both directions; see mergeAll's comment below for why.
import { defaultShop } from "./shop.js";
import { defaultStickers } from "./stickers.js";
import { defaultQuestState, defaultMonthly, MONTHLY_TARGET, settleMonthly } from "./quests.js";
import { defaultDaily } from "./daily.js";
import { normalizeCatJourney } from "./cat-journey.js";
import { CAT_JOURNEY_CLOUD_ENABLED } from "./cloud-config.js";

export const BASE_SYNC_KEYS = ["mastery", "xp", "daily", "quests", "monthly",
  "wallet", "freezes", "shop", "stickers", "best"];
export function syncKeysFor(catJourneyCloudEnabled = CAT_JOURNEY_CLOUD_ENABLED) {
  return catJourneyCloudEnabled ? [...BASE_SYNC_KEYS, "catJourney"] : [...BASE_SYNC_KEYS];
}
export const SYNC_KEYS = syncKeysFor();

export function defaultSyncMeta() {
  return { dirty: {}, lastSyncAt: 0, lastLedgerAt: "", shopSlots: null, shopPreferences: null,
           // { uid, base, pushed } — wallet snapshot at the last local/cloud
           // agreement (the delta fold's reference point; see mergeWalletDelta).
           walletSync: null };
}

const num = v => Number(v) || 0;

export function mergeXp(a, b) { return Math.max(num(a), num(b), 0); }
// Legacy wallet fold: symmetric max, kept for the legacy path in mergeAll
// (uid switch / legacy meta / fresh install / baseline changed-detection —
// see mergeAll's comment). NOT additive-safe: see mergeWalletDelta for the
// fold that is.
export function mergeWallet(a, b) { return Math.max(num(a), num(b), 0); }
// The additive-safe wallet fold (walletBase present in mergeAll — design doc
// 2026-08-04-wallet-delta-fold.md). `base` is the local wallet value both
// sides last agreed on; `pushed` says whether the cloud row is known to
// already include that base. cloud + (local - base): earns on either side
// add, a real remote spend subtracts, and neither side's independent history
// gets max()'d away. `pushed:false` means our own last delta may still be
// missing from the cloud row (that push failed) — max(cloudSide, base)
// treats a cloud value below base as our own unpushed state rather than a
// remote spend, so it isn't refunded away; with `pushed:true`, cloud below
// base is a real remote spend and is honored. Floor at 0 either way.
export function mergeWalletDelta(localSide, cloudSide, base, pushed) {
  const b = num(base);
  const cloudEff = pushed ? num(cloudSide) : Math.max(num(cloudSide), b);
  return Math.max(0, cloudEff + (num(localSide) - b));
}
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

function earliestPositive(a, b) {
  const x = Math.max(0, Math.floor(Number(a) || 0));
  const y = Math.max(0, Math.floor(Number(b) || 0));
  if (!x) return y;
  if (!y) return x;
  return Math.min(x, y);
}

function canonicalText(a, b) {
  const values = [a, b].filter(value => typeof value === "string" && value);
  return values.sort((x, y) => x.localeCompare(y))[0] || "";
}

function mergeJourneyGoalHistory(a, b) {
  const throughDay = a.throughDay > b.throughDay ? a.throughDay : b.throughDay;
  const countThrough = value => value.baselineCount
    + value.days.filter(day => throughDay && day <= throughDay).length;
  return {
    baselineCount: Math.max(countThrough(a), countThrough(b)),
    throughDay,
    days: [...new Set([...a.days, ...b.days])]
      .filter(day => !throughDay || day > throughDay)
      .sort(),
  };
}

function mergeJourneyClaim(a, b) {
  return {
    day: a.day,
    departedAt: earliestPositive(a.departedAt, b.departedAt),
    readyAt: earliestPositive(a.readyAt, b.readyAt),
    // Returned is monotonic. The earliest positive timestamp is the canonical
    // acknowledgement when both devices completed independently.
    returnedAt: earliestPositive(a.returnedAt, b.returnedAt),
    destinationId: canonicalText(a.destinationId, b.destinationId),
    storyId: canonicalText(a.storyId, b.storyId),
    keepsakeId: canonicalText(a.keepsakeId, b.keepsakeId),
    wordKey: canonicalText(a.wordKey, b.wordKey),
  };
}

function journeyPreferenceOf(a, b) {
  if (a.selectedBackgroundAt !== b.selectedBackgroundAt) {
    return a.selectedBackgroundAt > b.selectedBackgroundAt ? a : b;
  }
  const deviceOrder = a.selectedBackgroundDevice.localeCompare(b.selectedBackgroundDevice);
  if (deviceOrder) return deviceOrder > 0 ? a : b;
  return a.selectedBackground.localeCompare(b.selectedBackground) <= 0 ? a : b;
}

export function mergeCatJourney(a, b) {
  const A = normalizeCatJourney(a);
  const B = normalizeCatJourney(b);
  const claims = new Map(A.claims.map(claim => [claim.day, claim]));
  for (const claim of B.claims) {
    const prior = claims.get(claim.day);
    claims.set(claim.day, prior ? mergeJourneyClaim(prior, claim) : claim);
  }
  const preference = journeyPreferenceOf(A, B);
  return normalizeCatJourney({
    v: 2,
    selectedBackground: preference.selectedBackground,
    selectedBackgroundAt: preference.selectedBackgroundAt,
    selectedBackgroundDevice: preference.selectedBackgroundDevice,
    goalHistory: mergeJourneyGoalHistory(A.goalHistory, B.goalHistory),
    lastSeenBondTier: Math.max(A.lastSeenBondTier, B.lastSeenBondTier),
    claims: [...claims.values()],
  });
}

// The four equipped-cosmetic slots, normalized through defaultShop so null/
// partial shop states compare stably. sync.js diffs these against the
// last-synced baseline (meta.shopSlots) to detect a REAL local re-dress.
export function slotsOf(shop) {
  const s = Object.assign(defaultShop(), shop || {});
  return { skin: s.skin, backdrop: s.backdrop, effect: s.effect, soundpack: s.soundpack };
}

// Sync preference baseline. Ownership changes must not masquerade as a
// re-dress, so only equipped slots participate. (This wrapped the Street
// layout/project projections too until the Street retirement; it is kept as an
// object rather than collapsed to slotsOf so sync.js's baseline shape and its
// stored meta.shopPreferences survive the change unmodified.)
export function shopPreferencesOf(shop) {
  return { slots: slotsOf(shop) };
}

// The v7->v8 migration (migrations.js) prunes these 15 retired Street
// decoration ids out of local `owned` on upgrade. A pre-migration cloud row
// still lists them, so a bare union would resurrect them into `owned` on
// every reconcile and push them right back to cloud forever. The id list is
// inlined ON PURPOSE (copied from migrations.js, not imported): shop.js no
// longer exports these, and merge must never depend on live catalog data —
// the same trap the old to:2 entry documented about STREET_LAYOUT_VERSION.
const RETIRED_DECOS = new Set([
  "red-lantern", "noodle-stall", "tea-sign", "foo-dog", "golden-arch",
  "mahjong-table", "koi-pond", "drum-tower", "bubble-tea",
  "paper-umbrella", "goldfish-banner", "neon-cat-sign",
  "shaved-ice-cart", "mooncake-stall", "firecracker-arch",
]);

// Equipped slots resolve by dirty-bit LWW: local wins iff the equip slots
// themselves changed locally since the last successful sync (sync.js diffs
// slotsOf(local.shop) against the meta.shopSlots baseline) — so a fresh
// install adopts the cloud outfit, but an unsynced re-dress isn't undone by
// an old cloud row.
export function mergeShop(a, b, localPreferenceDirty = false) {
  const A = Object.assign(defaultShop(), a || {});
  const slotsDirty = typeof localPreferenceDirty === "object"
    ? !!localPreferenceDirty.slotsDirty
    : !!localPreferenceDirty;
  if (!b) {
    const owned = (A.owned || []).filter(id => !RETIRED_DECOS.has(id));
    return { owned, skin: A.skin, backdrop: A.backdrop,
             effect: A.effect, soundpack: A.soundpack };
  }
  const B = Object.assign(defaultShop(), b);
  const owned = [...new Set([...(A.owned || []), ...(B.owned || [])])]
    .filter(id => !RETIRED_DECOS.has(id));
  const slots = slotsDirty ? A : B;
  return { owned, skin: slots.skin, backdrop: slots.backdrop,
           effect: slots.effect, soundpack: slots.soundpack };
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
             today, restWeek: base.restWeek, restDay: base.restDay, restNoteDay: base.restNoteDay };
  }
  const N = A.last > B.last ? A : B;
  const O = N === A ? B : A;
  let streak = N.streak;
  const gap = daysBetween(O.last, N.last);
  if (O.last && gap >= 1 && gap <= N.streak) {
    streak = Math.max(N.streak, num(O.streak) + Math.min(N.streak, gap));
  }
  return { last: N.last, streak, today, restWeek: N.restWeek, restDay: N.restDay, restNoteDay: N.restNoteDay };
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
//
// WALLET DELTA PATH (`walletBase`, design doc 2026-08-04-wallet-delta-fold.md,
// stage 1). `walletBase = { base, pushed } | null`. `null`/absent is the
// LEGACY path above, byte-identical to today — used for uid switch, legacy
// meta, fresh install/reinstall (consumables-never-restore rides on this),
// guest-sign-in first contact, and the `baseline = mergeAll(local, null, …)`
// changed-detection call. When `walletBase` is present, the wallet key uses
// mergeWalletDelta(localSide, cloudSide, base, pushed) instead of the max
// fold: `localSide = local.wallet + lm.earned` (lm.earned is a genuine local
// earn event and belongs in the delta — idempotent with settleMonthly, same
// as the legacy path), `cloudSide = cloud.wallet` with NO cm.earned and NO
// unseenPurchased folded in. Both are dropped on purpose, not by oversight:
// - cm.earned would double-pay. The cloud's stale month is always a COPY of
//   some device's local state; that device settles it into its own wallet at
//   its next boot and the coins ride ITS delta. Crediting cm here on top of
//   that would pay the same reward twice. `settleMonthly(cm)` is still
//   CALLED — cm.state still feeds mergeMonthly so a stale month can't win
//   the month pick — only cm.earned is excluded from the wallet.
// - unseenPurchased's subtract-then-add dance exists only to protect webhook
//   credits from the max fold; in `cloudEff + delta` the credit already sits
//   inside the cloud term exactly once, so folding unseen in again would
//   double it. The ledger fetch/cursor/credits-attribution machinery is
//   unchanged — a fresh cursor with no walletSync is a legacy-path case.
// mergeWallet stays exported for the legacy path; mergeWalletDelta is the
// pure fold for this one (see its own comment for the pushed/unpushed split).
export function mergeAll(local, cloud, {
  shopDirty = false,
  today = null, unseenPurchased = 0, walletBase = null,
} = {}) {
  const l = local || {}, c = cloud || {};
  const lm = today ? settleMonthly(Object.assign(defaultMonthly(), l.monthly || {}), today) : { state: l.monthly, earned: 0 };
  const cm = today ? settleMonthly(Object.assign(defaultMonthly(), c.monthly || {}), today) : { state: c.monthly, earned: 0 };
  const unseen = num(unseenPurchased);
  const localSide = num(l.wallet) + lm.earned;
  const wallet = walletBase
    ? mergeWalletDelta(localSide, num(c.wallet), walletBase.base, walletBase.pushed)
    : mergeWallet(localSide, num(c.wallet) + cm.earned - unseen) + unseen;
  const merged = {
    mastery: mergeMastery(l.mastery, c.mastery),
    xp: mergeXp(l.xp, c.xp),
    daily: mergeDaily(l.daily, c.daily),
    quests: mergeQuests(l.quests, c.quests),
    monthly: mergeMonthly(lm.state, cm.state),
    wallet,
    freezes: mergeFreezes(l.freezes, c.freezes),
    shop: mergeShop(l.shop, c.shop, { slotsDirty: shopDirty }),
    stickers: mergeStickers(l.stickers, c.stickers),
    best: mergeBest(l.best, c.best),
  };
  if (l.catJourney != null || c.catJourney != null) {
    merged.catJourney = mergeCatJourney(l.catJourney, c.catJourney);
  }
  return merged;
}
