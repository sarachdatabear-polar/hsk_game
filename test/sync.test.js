import { describe, it, expect, beforeEach } from "vitest";
import { MIN_SYNC_GAP_MS, localSnapshot, rowsFromLocal, localFromRows,
         reconcile, pushDirty, __resetForTests } from "../src/sync.js";
import { __setClientForTests } from "../src/cloud.js";

function memStore(init = {}) {
  const m = { ...init };
  return {
    get: (k, d) => (k in m ? JSON.parse(JSON.stringify(m[k])) : d),
    set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); },
    _raw: m,
  };
}

function fakeClient({ session, progressRow = null, walletRow = null, failPush = false } = {}) {
  const calls = { upserts: [] };
  const client = {
    auth: { getSession: async () => ({ data: { session } }) },
    from: (table) => ({
      select: () => ({ eq: () => ({ maybeSingle: async () =>
        ({ data: table === "progress" ? progressRow : walletRow, error: null }) }) }),
      upsert: async (row) => { calls.upserts.push({ table, row }); return { error: failPush ? { message: "x" } : null }; },
    }),
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
    expect(r).toEqual({ ok: true, changed: true });
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
    expect(r).toEqual({ ok: true, changed: false });
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
});
