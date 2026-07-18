import { describe, it, expect, beforeEach } from "vitest";
import { MIN_SYNC_GAP_MS, rowsFromLocal, localFromRows,
         reconcile, pushDirty, __resetForTests } from "../src/sync.js";
import { __setClientForTests, LEDGER_EPOCH } from "../src/cloud.js";
import { SYNC_KEYS } from "../src/merge.js";

// _setOrder (I3): records the ordered sequence of set(key) calls so tests can
// pin the crash-safety invariant (cursor-advance meta write lands before the
// merged SYNC_KEYS writes) directly, instead of trusting sync.js's comment.
function memStore(init = {}) {
  const m = { ...init };
  const setOrder = [];
  return {
    get: (k, d) => (k in m ? JSON.parse(JSON.stringify(m[k])) : d),
    set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); setOrder.push(k); },
    _raw: m,
    _setOrder: setOrder,
  };
}

// ledgerRows/ledgerError: extend the fake for the coin-purchase ledger-cursor
// fold (mirrors fetchLedgerSince's chain — select/eq/not/gt/order — one
// table branch alongside progress/wallet). calls.ledgerSince records the
// `gt` cutoff each fetch used, so tests can assert the cursor value a
// reconcile actually queried with.
function fakeClient({ session, progressRow = null, walletRow = null, failPush = false,
                       ledgerRows = [], ledgerError = null, ledgerOrderRow = null } = {}) {
  const calls = { upserts: [], sessions: 0, ledgerSince: [], ledgerOrders: [] };
  const client = {
    auth: { getSession: async () => { calls.sessions++; return { data: { session } }; } },
    from: (table) => {
      if (table === "ledger") {
        return {
          select: () => ({ eq: (col, value) => ({
            not: () => ({ gt: (gtCol, since) => ({
              order: async () => {
                calls.ledgerSince.push(since);
                return ledgerError ? { data:null, error:ledgerError } : { data:ledgerRows, error:null };
              },
            }) }),
            eq: (orderCol, orderId) => ({
              maybeSingle: async () => {
                calls.ledgerOrders.push({ col, value, orderCol, orderId });
                return { data: ledgerOrderRow, error: null };
              },
            }),
          }) }),
        };
      }
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () =>
          ({ data: table === "progress" ? progressRow : walletRow, error: null }) }) }),
        upsert: async (row) => { calls.upserts.push({ table, row }); return { error: failPush ? { message: "x" } : null }; },
      };
    },
  };
  return { client, calls };
}

const SESSION = { user: { id: "u1", is_anonymous: true } };

beforeEach(() => { __resetForTests(); __setClientForTests(null); delete globalThis.navigator; });

describe("row mapping", () => {
  it("rowsFromLocal shapes both rows; stickers strips queue; streak derived", () => {
    const local = { mastery: {}, xp: 10, daily: { last: "2026-07-10", streak: 4, today: { date: "2026-07-10", resolved: 20 }, restWeek: "", restDay: "" },
      quests: { date: "2026-07-10", progress: {}, done: [] }, monthly: { month: "2026-07", done: 1, claimed: false },
      wallet: 300, freezes: 2, shop: { owned: [], skin: "", backdrop: "", effect: "", soundpack: "", tiers: {} },
      stickers: { earned: { s1: "2026-07-01" }, queue: ["s1"] }, best: {} };
    const r = rowsFromLocal("u1", local);
    expect(r.progress.user_id).toBe("u1");
    expect(r.progress.streak).toBe(4);
    expect(r.progress.cosmetics).toEqual(local.shop);
    expect(r.progress.stickers).toEqual({ earned: { s1: "2026-07-01" } });
    expect(r.wallet).toEqual({ user_id: "u1", coins: 300, freezes: 2 });
  });
  it("localFromRows inverts (nulls when rows absent)", () => {
    const l = localFromRows(null, null);
    expect(l.wallet).toBeUndefined();
    const l2 = localFromRows({ xp: 7, cosmetics: { owned: ["a"] } }, { coins: 9, freezes: 1 });
    expect(l2.xp).toBe(7);
    expect(l2.shop).toEqual({ owned: ["a"] });
    expect(l2.wallet).toBe(9);
    expect(l2.freezes).toBe(1);
  });
});

describe("reconcile", () => {
  it("no session -> {ok:false}", async () => {
    const { client } = fakeClient({ session: null });
    __setClientForTests(client);
    const r = await reconcile(memStore(), "foreground");
    expect(r.ok).toBe(false);
  });
  it("merges cloud into local, pushes, stamps lastSyncAt, clears dirty", async () => {
    const { client, calls } = fakeClient({ session: SESSION,
      progressRow: { user_id: "u1", xp: 900, mastery: {}, daily: { last: "", streak: 0, today: { date: "", resolved: 0 }, restWeek: "", restDay: "" },
        quests: {}, monthly: {}, best: {}, cosmetics: {}, stickers: { earned: {} } },
      walletRow: { user_id: "u1", coins: 50, freezes: 0 } });
    __setClientForTests(client);
    const store = memStore({ xp: 100, wallet: 700, sync: { dirty: { xp: true, wallet: true }, lastSyncAt: 0 } });
    const r = await reconcile(store, "sign-in", 1000000);
    expect(r).toEqual({ ok: true, changed: true, credits: [] });
    expect(store.get("xp", 0)).toBe(900);          // cloud won xp
    expect(store.get("wallet", 0)).toBe(700);      // local won wallet
    const pushedProgress = calls.upserts.find(u => u.table === "progress").row;
    expect(pushedProgress.xp).toBe(900);
    const meta = store.get("sync", {});
    expect(meta.lastSyncAt).toBe(1000000);
    expect(meta.dirty).toEqual({});
  });
  it("changed:false when cloud contributes nothing", async () => {
    const { client } = fakeClient({ session: SESSION, progressRow: null, walletRow: null });
    __setClientForTests(client);
    const r = await reconcile(memStore({ xp: 5 }), "sign-in", 5000);
    expect(r).toEqual({ ok: true, changed: false, credits: [] });
  });
  it("cooldown skips non-sign-in reasons but never sign-in", async () => {
    const { client } = fakeClient({ session: SESSION });
    __setClientForTests(client);
    const store = memStore({ sync: { dirty: {}, lastSyncAt: 100000 } });
    const r1 = await reconcile(store, "foreground", 100000 + MIN_SYNC_GAP_MS - 1);
    expect(r1).toEqual({ ok: false, reason: "cooldown" });
    const r2 = await reconcile(store, "sign-in", 100000 + 1);
    expect(r2.ok).toBe(true);
  });

  it("\"purchase\" also bypasses the cooldown (purchase-poll's ~2s-apart retries would otherwise no-op past try 1)", async () => {
    const { client } = fakeClient({ session: SESSION });
    __setClientForTests(client);
    const store = memStore({ sync: { dirty: {}, lastSyncAt: 100000 } });
    // Well inside MIN_SYNC_GAP_MS of the prior sync — a plain reason would be
    // dropped as "cooldown" (see the test above); "purchase" must still run.
    const r = await reconcile(store, "purchase", 100000 + MIN_SYNC_GAP_MS - 1);
    expect(r.ok).toBe(true);
  });
  it("regression: a boot-settled local wallet is not double-paid by a still-stale cloud monthly row", async () => {
    // Local already ran settleMonthlyNow() at boot: its wallet (2500) already
    // includes June's 1500 reward. Cloud never pushed since, so its row
    // still shows June done:40 unclaimed with the pre-settle wallet (1000).
    // A same-instant local date is derived inside reconcile() from `now` —
    // pick a `now` whose LOCAL calendar date (matches main.js's todayStr())
    // is 2026-07-15, well past June.
    const now = new Date(2026, 6, 15, 12, 0, 0).getTime();
    const { client } = fakeClient({ session: SESSION,
      progressRow: { user_id: "u1", xp: 0, mastery: {},
        daily: { last: "", streak: 0, today: { date: "", resolved: 0 }, restWeek: "", restDay: "" },
        quests: {}, monthly: { month: "2026-06", done: 40, claimed: false },
        best: {}, cosmetics: {}, stickers: { earned: {} } },
      walletRow: { user_id: "u1", coins: 1000, freezes: 0 } });
    __setClientForTests(client);
    const store = memStore({ wallet: 2500, monthly: { month: "2026-07", done: 3, claimed: false },
      sync: { dirty: {}, lastSyncAt: 0 } });
    const r = await reconcile(store, "sign-in", now);
    expect(r.ok).toBe(true);
    // A buggy post-fold credit would give max(2500,1000)+1500 = 4000.
    expect(store.get("wallet", 0)).toBe(2500);
    expect(store.get("monthly", null)).toEqual({ month: "2026-07", done: 3, claimed: false });
  });

  it("push failure keeps dirty flags", async () => {
    const { client } = fakeClient({ session: SESSION, failPush: true });
    __setClientForTests(client);
    const store = memStore({ xp: 5, sync: { dirty: { xp: true }, lastSyncAt: 0 } });
    const r = await reconcile(store, "sign-in", 1);
    expect(r.ok).toBe(false);
    expect(store.get("sync", {}).dirty).toEqual({ xp: true });
  });
});

describe("reconcile: ledger-cursor purchase fold (coin-purchase go-live, THE FOLD)", () => {
  const PROGRESS_STUB = { user_id: "u1", xp: 0, mastery: {},
    daily: { last: "", streak: 0, today: { date: "", resolved: 0 }, restWeek: "", restDay: "" },
    quests: {}, monthly: {}, best: {}, cosmetics: {}, stickers: { earned: {} } };

  it("unseen ledger rows credit once; cursor advances to the max created_at fetched", async () => {
    // Cloud wallet (5000) already includes the webhook's 1000-coin grant —
    // pre-fix, max(local 5000, cloud 5000) would eat the purchase entirely.
    // Cursor is a REAL non-empty prior value (a returning, previously-synced
    // device that just hasn't polled the ledger since this purchase) — NOT
    // "" (fresh/new device). A fresh cursor takes the adopt branch instead
    // (I2 fix, see the "new-device sign-in" test below); this test pins the
    // subtract-then-add branch that only fires for a returning device.
    const ledgerRows = [{ delta: 1000, created_at: "2026-07-12T10:00:00Z", order_id: "GPA.1000" }];
    const { client, calls } = fakeClient({ session: SESSION,
      progressRow: PROGRESS_STUB, walletRow: { user_id: "u1", coins: 5000, freezes: 0 }, ledgerRows });
    __setClientForTests(client);
    const store = memStore({ wallet: 5000,
      sync: { dirty: {}, lastSyncAt: 0, lastLedgerAt: "2026-06-01T00:00:00Z" } });
    const r = await reconcile(store, "sign-in", 2000000);
    expect(r.ok).toBe(true);
    expect(r.credits).toEqual([{ orderId: "GPA.1000", delta: 1000 }]);
    expect(store.get("wallet", 0)).toBe(6000);
    const meta = store.get("sync", {});
    expect(meta.lastLedgerAt).toBe("2026-07-12T10:00:00Z");
    expect(calls.ledgerSince[0]).toBe("2026-06-01T00:00:00Z");
    // I3: cursor-ordering invariant, pinned directly (not just by comment).
    // The cursor-advance meta write ("sync") must land before any of the
    // merged SYNC_KEYS writes (wallet included) — that's the property that
    // makes a mid-reconcile crash land on the self-healing side (see the
    // CURSOR ORDERING comment in sync.js). Red-checked: temporarily moving
    // the cursor-advance block in sync.js to after the merged-key write loop
    // makes this specific assertion fail (firstSyncIdx becomes 10, after all
    // ten SYNC_KEYS writes, while firstKeyIdx stays 0) while every other
    // test in the suite still passes — confirming this assertion, not
    // incidental ordering elsewhere, is what pins the invariant.
    const firstSyncIdx = store._setOrder.indexOf("sync");
    const firstKeyIdx = store._setOrder.findIndex(k => SYNC_KEYS.includes(k));
    expect(firstSyncIdx).toBeGreaterThanOrEqual(0);
    expect(firstKeyIdx).toBeGreaterThanOrEqual(0);
    expect(firstSyncIdx).toBeLessThan(firstKeyIdx);
  });

  it("ledger/RLS failure aborts before mutation so recovery cannot double-credit", async () => {
    // A signed-in ledger read can fail independently of the progress/wallet
    // reads (for example a bad RLS policy). The wallet gap is then unsafe to
    // attribute, so reconcile must not mutate or push anything.
    const { client, calls } = fakeClient({ session: SESSION,
      progressRow: PROGRESS_STUB, walletRow: { user_id: "u1", coins: 9000, freezes: 0 },
      ledgerError:{ message:"permission denied", code:"42501" } });
    __setClientForTests(client);
    const store = memStore({ wallet: 5000,
      sync: { dirty: { wallet:true }, lastSyncAt: 0, lastLedgerAt: "2026-07-01T00:00:00Z" } });
    const r = await reconcile(store, "sign-in", 2000000);
    expect(r).toEqual({ ok:false, reason:"ledger" });
    expect(store.get("wallet", 0)).toBe(5000);
    expect(store.get("sync", {}).lastLedgerAt).toBe("2026-07-01T00:00:00Z"); // cursor frozen, not advanced
    expect(calls.upserts).toEqual([]);
    const meta = store.get("sync", {});
    expect(meta.lastSyncAt).toBe(0);
    expect(meta.dirty).toEqual({ wallet:true });
  });

  it("missing migration degrades safely because no purchase grant can commit yet", async () => {
    const { client } = fakeClient({ session:SESSION, progressRow:PROGRESS_STUB,
      walletRow:{ user_id:"u1", coins:9000, freezes:0 },
      ledgerError:{ message:"column ledger.order_id does not exist", code:"42703" } });
    __setClientForTests(client);
    const store = memStore({ wallet:5000, sync:{ dirty:{}, lastSyncAt:0, lastLedgerAt:"" } });
    const r = await reconcile(store, "sign-in", 2000000);
    expect(r.ok).toBe(true);
    expect(store.get("wallet",0)).toBe(9000);
  });

  it("regression: a later reconcile whose ledger fetch now succeeds credits the same unseen rows exactly once (no skip-forever)", async () => {
    // Same fixture as above, but the SECOND reconcile's ledger fetch
    // succeeds and returns a purchase row still newer than the frozen
    // cursor — proving the abort-on-failure path doesn't lose it.
    const { client: failClient } = fakeClient({ session: SESSION,
      progressRow: PROGRESS_STUB, walletRow: { user_id: "u1", coins: 5000, freezes: 0 },
      ledgerError:{ message:"permission denied", code:"42501" } });
    __setClientForTests(failClient);
    const store = memStore({ wallet: 5000, sync: { dirty: {}, lastSyncAt: 0, lastLedgerAt: "2026-06-01T00:00:00Z" } });
    const r1 = await reconcile(store, "sign-in", 1000000);
    expect(r1.ok).toBe(false);
    expect(store.get("wallet", 0)).toBe(5000);
    expect(store.get("sync", {}).lastLedgerAt).toBe("2026-06-01T00:00:00Z"); // still frozen

    // The migration lands (or the transient fault clears): the SAME unseen
    // purchase row is still there, still newer than the untouched cursor.
    const ledgerRows = [{ delta: 1000, created_at: "2026-07-12T10:00:00Z" }];
    const { client: okClient } = fakeClient({ session: SESSION,
      progressRow: PROGRESS_STUB, walletRow: { user_id: "u1", coins: 6000, freezes: 0 }, ledgerRows });
    __setClientForTests(okClient);
    const r2 = await reconcile(store, "sign-in", 1000000 + MIN_SYNC_GAP_MS + 1);
    expect(r2.ok).toBe(true);
    expect(store.get("wallet", 0)).toBe(6000);   // credited exactly once: max(5000,6000-1000)+1000
    expect(store.get("sync", {}).lastLedgerAt).toBe("2026-07-12T10:00:00Z"); // cursor now advances
  });

  it("new-device sign-in: cursor \"\" fetches ALL ledger rows, folds old purchases in exactly once (neutral)", async () => {
    const ledgerRows = [
      { delta: 1000, created_at: "2026-01-01T00:00:00Z" },
      { delta: 2000, created_at: "2026-03-01T00:00:00Z" },
    ];
    const { client, calls } = fakeClient({ session: SESSION,
      progressRow: PROGRESS_STUB, walletRow: { user_id: "u1", coins: 8000, freezes: 0 }, ledgerRows });
    __setClientForTests(client);
    const store = memStore({ wallet: 0, sync: { dirty: {}, lastSyncAt: 0, lastLedgerAt: "" } });
    const r = await reconcile(store, "sign-in", 2000000);
    expect(r.ok).toBe(true);
    // Fresh cursor ("") -> I2's adopt branch: unseenPurchased forced to 0,
    // so this is max(0, 8000-0)+0 = 8000 (adopt the cloud wallet wholesale),
    // NOT the subtract-then-add formula max(0, 8000-3000)+3000. Both land on
    // 8000 for this fixture — the two formulas coincide whenever local is 0
    // and the ledger sum doesn't exceed cloud — so this assertion alone
    // can't distinguish them; it exists to confirm the adopt branch stays
    // neutral here, not to prove which branch ran (that's the freshCursor
    // unit-level guarantee in sync.js, exercised via lastLedgerAt: "" above).
    expect(store.get("wallet", 0)).toBe(8000);
    expect(store.get("sync", {}).lastLedgerAt).toBe("2026-03-01T00:00:00Z");
    expect(calls.ledgerSince[0]).toBe(LEDGER_EPOCH);
  });

  it("I2: fresh cursor does NOT resurrect a spent-down purchase (adopt, not subtract-then-add)", async () => {
    // The exact review scenario: buy 1000 -> spend to 300 -> push -> wipe ->
    // restore on a fresh device. Cloud wallet already reflects the spend
    // (300); the purchase ledger row (1000) is "unseen" only because this
    // device has never polled it before. Pre-fix (subtract-then-add on a
    // fresh cursor): max(0, 300-1000->clamp 0)+1000 = 1000 — mints 700 coins
    // that were already spent, and repeats on every further wipe. Fixed
    // (adopt): max(0, 300-0)+0 = 300 — the client just adopts the cloud
    // wallet, which already has the correct settled total.
    const ledgerRows = [{ delta: 1000, created_at: "2026-05-01T00:00:00Z" }];
    const { client } = fakeClient({ session: SESSION,
      progressRow: PROGRESS_STUB, walletRow: { user_id: "u1", coins: 300, freezes: 0 }, ledgerRows });
    __setClientForTests(client);
    const store = memStore({ wallet: 0, sync: { dirty: {}, lastSyncAt: 0, lastLedgerAt: "" } });
    const r = await reconcile(store, "sign-in", 2000000);
    expect(r.ok).toBe(true);
    expect(store.get("wallet", 0)).toBe(300);   // NOT 1000
  });

  it("fresh-cursor purchase poll folds only its exact new order above local earnings", async () => {
    const ledgerRows = [{ delta:1000, created_at:"2026-07-12T12:00:00Z", order_id:"GPA.NEW" }];
    const { client } = fakeClient({ session:SESSION, progressRow:PROGRESS_STUB,
      walletRow:{ user_id:"u1", coins:1000, freezes:0 }, ledgerRows });
    __setClientForTests(client);
    const store = memStore({ wallet:5000, sync:{ dirty:{wallet:true}, lastSyncAt:0, lastLedgerAt:"" } });
    const r = await reconcile(store, "purchase", 2000000, "GPA.NEW");
    expect(r.ok).toBe(true);
    expect(store.get("wallet",0)).toBe(6000); // local 5000 + this purchase 1000
    expect(r.credits).toEqual([{ orderId:"GPA.NEW", delta:1000 }]);
  });

  it("purchase poll confirms an exact order already consumed by a foreground reconcile without re-crediting", async () => {
    const prior = { delta:1000, created_at:"2026-07-12T12:00:00Z", order_id:"GPA.ALREADY" };
    const { client, calls } = fakeClient({ session:SESSION, progressRow:PROGRESS_STUB,
      walletRow:{ user_id:"u1", coins:6000, freezes:0 }, ledgerRows:[], ledgerOrderRow:prior });
    __setClientForTests(client);
    const store = memStore({ wallet:6000,
      sync:{ dirty:{}, lastSyncAt:0, lastLedgerAt:"2026-07-12T12:00:00Z" } });
    const r = await reconcile(store, "purchase", 2000000, "GPA.ALREADY");
    expect(r.ok).toBe(true);
    expect(r.credits).toEqual([{ orderId:"GPA.ALREADY", delta:1000 }]);
    expect(store.get("wallet",0)).toBe(6000); // attribution only; never fold an older row twice
    expect(calls.ledgerOrders).toEqual([{ col:"user_id", value:"u1", orderCol:"order_id", orderId:"GPA.ALREADY" }]);
  });

  it("no unseen rows: byte-identical to the pre-ledger-cursor fold", async () => {
    const { client } = fakeClient({ session: SESSION,
      progressRow: PROGRESS_STUB, walletRow: { user_id: "u1", coins: 700, freezes: 0 }, ledgerRows: [] });
    __setClientForTests(client);
    const store = memStore({ wallet: 5000, sync: { dirty: {}, lastSyncAt: 0, lastLedgerAt: "2026-01-01T00:00:00Z" } });
    const r = await reconcile(store, "sign-in", 2000000);
    expect(r.ok).toBe(true);
    expect(store.get("wallet", 0)).toBe(5000);   // plain max(5000, 700), unchanged behavior
    expect(store.get("sync", {}).lastLedgerAt).toBe("2026-01-01T00:00:00Z"); // no rows -> no advance
  });

  it("push failure after a ledger fetch: cursor still advances, wallet still credited locally, dirty flags kept", async () => {
    // The cursor-write happens BEFORE the push attempt (I3's ordering
    // invariant) — a failed push must not roll either back. The store ends
    // up ahead of what got pushed; the next successful sync just re-pushes
    // the same (already-correct) merged state.
    const ledgerRows = [{ delta: 1000, created_at: "2026-06-15T00:00:00Z", order_id: "GPA.FAIL" }];
    const { client } = fakeClient({ session: SESSION,
      progressRow: PROGRESS_STUB, walletRow: { user_id: "u1", coins: 5000, freezes: 0 },
      ledgerRows, failPush: true });
    __setClientForTests(client);
    const store = memStore({ wallet: 5000,
      sync: { dirty: { wallet: true }, lastSyncAt: 0, lastLedgerAt: "2026-06-01T00:00:00Z" } });
    const r = await reconcile(store, "sign-in", 2000000);
    expect(r).toEqual({ ok: false, reason: "network", localChanged: true,
      credits: [{ orderId: "GPA.FAIL", delta: 1000 }] });
    expect(store.get("wallet", 0)).toBe(6000);                                   // credited locally
    expect(store.get("sync", {}).lastLedgerAt).toBe("2026-06-15T00:00:00Z");     // cursor advanced
    expect(store.get("sync", {}).dirty).toEqual({ wallet: true });               // kept, not cleared
  });
});

describe("pushDirty", () => {
  it("skips with no dirty flags", async () => {
    const r = await pushDirty(memStore(), "hide");
    expect(r).toEqual({ ok: true, skipped: true });
  });
  it("pushes local rows and clears settled flags without touching lastSyncAt", async () => {
    const { client, calls } = fakeClient({ session: SESSION });
    __setClientForTests(client);
    const store = memStore({ xp: 42, sync: { dirty: { xp: true }, lastSyncAt: 777 } });
    const r = await pushDirty(store, "hide");
    expect(r.ok).toBe(true);
    expect(calls.upserts.length).toBe(2);
    const meta = store.get("sync", {});
    expect(meta.dirty).toEqual({});
    expect(meta.lastSyncAt).toBe(777);
  });

  it("non-monthly dirty push stays on the plain path: local wallet pushed verbatim, cloud ignored, lastSyncAt untouched", async () => {
    const { client, calls } = fakeClient({ session: SESSION,
      // Cloud holds a much larger wallet — if pushDirty ever consulted it,
      // the pushed row would reflect that. The plain path must never fetch
      // or fold cloud rows at all.
      progressRow: { user_id: "u1", xp: 0, mastery: {},
        daily: { last: "", streak: 0, today: { date: "", resolved: 0 }, restWeek: "", restDay: "" },
        quests: {}, monthly: {}, best: {}, cosmetics: {}, stickers: { earned: {} } },
      walletRow: { user_id: "u1", coins: 5000, freezes: 0 } });
    __setClientForTests(client);
    const store = memStore({ wallet: 200, sync: { dirty: { xp: true }, lastSyncAt: 777 } });
    const r = await pushDirty(store, "purchase");
    expect(r.ok).toBe(true);
    const pushedWallet = calls.upserts.find(u => u.table === "wallet").row;
    expect(pushedWallet.coins).toBe(200);           // blind local push, not max(200,5000)
    const meta = store.get("sync", {});
    expect(meta.lastSyncAt).toBe(777);               // plain path never stamps lastSyncAt
  });

  it("pushDirty routes through reconcile when monthly is dirty (stale-month settle path)", async () => {
    // local monthly is current (2026-07); cloud row still holds a completed,
    // unclaimed June (done:40) with a pre-settle wallet. A blind push of the
    // local wallet (200) would clobber that unrealized 1500-coin reward.
    const now = new Date(2026, 6, 15, 12, 0, 0).getTime(); // local date 2026-07-15
    const { client, calls } = fakeClient({ session: SESSION,
      progressRow: { user_id: "u1", xp: 0, mastery: {},
        daily: { last: "", streak: 0, today: { date: "", resolved: 0 }, restWeek: "", restDay: "" },
        quests: {}, monthly: { month: "2026-06", done: 40, claimed: false },
        best: {}, cosmetics: {}, stickers: { earned: {} } },
      walletRow: { user_id: "u1", coins: 100, freezes: 0 } });
    __setClientForTests(client);
    // lastSyncAt is recent enough to fail a plain cooldown check — proves
    // "monthly-dirty" bypasses the cooldown gate the same way "sign-in" does.
    const store = memStore({ wallet: 200, monthly: { month: "2026-07", done: 3, claimed: false },
      sync: { dirty: { monthly: true }, lastSyncAt: now - 1000 } });
    const r = await pushDirty(store, "hide", now);
    expect(r.ok).toBe(true);
    const pushedWallet = calls.upserts.find(u => u.table === "wallet").row;
    expect(pushedWallet.coins).toBe(1600);            // max(200,100) + 1500 settle, NOT a blind 200
    expect(store.get("wallet", 0)).toBe(1600);
    const meta = store.get("sync", {});
    expect(meta.lastSyncAt).toBe(now);                // reconcile's stamp, proving the merge path ran
    expect(meta.dirty).toEqual({});
  });

  it("monthly-dirty mid-round: defers entirely — no network, dirty preserved, {ok:false, reason:'mid-round'}", async () => {
    // syncEdge (main.js) refuses reconcile while B.on per the "merged state
    // must not change mid-battle" invariant. pushDirty's monthly redirect is
    // a reconcile, so it must honor the same gate — and it must NOT fall back
    // to a blind push either (rowsFromLocal would push the local monthly row
    // and clobber the cloud's unclaimed month: the exact bug this fix is
    // for). Defer whole-hog; the next battle-free edge catches up.
    const now = new Date(2026, 6, 15, 12, 0, 0).getTime();
    const { client, calls } = fakeClient({ session: SESSION,
      progressRow: { user_id: "u1", xp: 0, mastery: {},
        daily: { last: "", streak: 0, today: { date: "", resolved: 0 }, restWeek: "", restDay: "" },
        quests: {}, monthly: { month: "2026-06", done: 40, claimed: false },
        best: {}, cosmetics: {}, stickers: { earned: {} } },
      walletRow: { user_id: "u1", coins: 100, freezes: 0 } });
    __setClientForTests(client);
    const store = memStore({ wallet: 200, monthly: { month: "2026-07", done: 3, claimed: false },
      sync: { dirty: { monthly: true, wallet: true }, lastSyncAt: 0 } });
    const r = await pushDirty(store, "hide", now, true);   // midRound = true
    expect(r).toEqual({ ok: false, reason: "mid-round" });
    expect(calls.sessions).toBe(0);                    // never even asked for a session
    expect(calls.upserts.length).toBe(0);              // no fetch, no push
    expect(store.get("sync", {}).dirty).toEqual({ monthly: true, wallet: true });
    expect(store.get("wallet", 0)).toBe(200);          // store untouched
    // and a later battle-free edge picks it right up:
    const r2 = await pushDirty(store, "hide", now, false);
    expect(r2.ok).toBe(true);
    expect(store.get("wallet", 0)).toBe(1600);         // reconcile redirect ran this time
  });

  it("non-monthly dirty mid-round: plain blind push still happens (write-only, safe mid-battle)", async () => {
    // The blind push never writes gameplay keys back to the store (settleDirty
    // only clears dirty bits + meta), so it can't violate the mid-battle
    // invariant — keep it flowing so purchases made from the shop mid-pause
    // still reach the cloud promptly.
    const { client, calls } = fakeClient({ session: SESSION });
    __setClientForTests(client);
    const store = memStore({ wallet: 950, sync: { dirty: { wallet: true }, lastSyncAt: 777 } });
    const r = await pushDirty(store, "purchase", undefined, true);   // midRound = true
    expect(r.ok).toBe(true);
    expect(calls.upserts.find(u => u.table === "wallet").row.coins).toBe(950);
    const meta = store.get("sync", {});
    expect(meta.dirty).toEqual({});
    expect(meta.lastSyncAt).toBe(777);
  });
});
