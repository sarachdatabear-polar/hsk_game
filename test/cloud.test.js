import { describe, it, expect, beforeEach } from "vitest";
import { getSession, ensureGuest, sendCode, verifyCode, signOut,
         upsertProfile, saveDisplayName, fetchSyncRows, pushSyncRows, fetchLedgerSince, fetchLedgerOrder,
         LEDGER_EPOCH, __setClientForTests } from "../src/cloud.js";

// House pattern (see test/native.test.js): no vi.mock — a hand-rolled fake
// client + globalThis stubs, reset in beforeEach.
function fakeClient({ session = null, failAuth = false } = {}) {
  const calls = { getSession: 0, anon: 0, updateUser: [], otp: [], verify: [],
                  signOut: 0, upserts: [] };
  const err = failAuth ? { message: "boom" } : null;
  const client = {
    auth: {
      getSession: async () => { calls.getSession++; return { data: { session } }; },
      signInAnonymously: async () => {
        calls.anon++;
        return err ? { data: {}, error: err }
                   : { data: { session: { user: { id: "anon1", is_anonymous: true } } }, error: null };
      },
      updateUser: async (args) => { calls.updateUser.push(args); return { data: {}, error: err }; },
      signInWithOtp: async (args) => { calls.otp.push(args); return { data: {}, error: err }; },
      verifyOtp: async (args) => {
        calls.verify.push(args);
        return err ? { data: {}, error: err }
                   : { data: { session: { user: { id: "u9", email: args.email } } }, error: null };
      },
      signOut: async () => { calls.signOut++; return { error: null }; },
    },
    from: (table) => ({ upsert: async (row) => { calls.upserts.push({ table, row }); return { error: null }; } }),
  };
  return { client, calls };
}

beforeEach(() => {
  __setClientForTests(null);
  delete globalThis.navigator;
});

describe("offline guard", () => {
  it("every networked call short-circuits with reason offline", async () => {
    globalThis.navigator = { onLine: false };
    for (const p of [getSession(), ensureGuest("en"), sendCode("a@b.co"),
                     verifyCode("a@b.co", "123456", "email", "en")])
      expect(await p).toEqual({ ok: false, reason: "offline" });
  });
});

describe("ensureGuest", () => {
  it("creates an anonymous session and upserts the profile row", async () => {
    const { client, calls } = fakeClient();
    __setClientForTests(client);
    const r = await ensureGuest("th");
    expect(r.ok).toBe(true);
    expect(calls.anon).toBe(1);
    expect(calls.upserts).toEqual([{ table: "profiles", row: { id: "anon1", locale: "th" } }]);
  });
  it("reuses an existing session without a second sign-in", async () => {
    const s = { user: { id: "u1", is_anonymous: true } };
    const { client, calls } = fakeClient({ session: s });
    __setClientForTests(client);
    const r = await ensureGuest("en");
    expect(r.ok).toBe(true);
    expect(calls.anon).toBe(0);
    expect(calls.upserts[0].row).toEqual({ id: "u1", locale: "en" });
  });
  it("auth failure resolves ok:false, never throws", async () => {
    const { client } = fakeClient({ failAuth: true });
    __setClientForTests(client);
    expect((await ensureGuest("en")).ok).toBe(false);
  });
});

describe("sendCode picks the merge-correct channel", () => {
  it("guest session -> updateUser + verifyType email_change", async () => {
    const { client, calls } = fakeClient({ session: { user: { id: "u1", is_anonymous: true } } });
    __setClientForTests(client);
    const r = await sendCode("a@b.co");
    expect(r).toEqual({ ok: true, verifyType: "email_change" });
    expect(calls.updateUser).toEqual([{ email: "a@b.co" }]);
    expect(calls.otp.length).toBe(0);
  });
  it("no session -> signInWithOtp + verifyType email", async () => {
    const { client, calls } = fakeClient();
    __setClientForTests(client);
    const r = await sendCode("a@b.co");
    expect(r).toEqual({ ok: true, verifyType: "email" });
    expect(calls.otp).toEqual([{ email: "a@b.co", options: { shouldCreateUser: true } }]);
    expect(calls.updateUser.length).toBe(0);
  });
});

describe("sendCode falls back to OTP sign-in for a returning user (email already exists)", () => {
  const emailExistsErr = { code: "email_exists", status: 422,
                           message: "A user with this email address has already been registered" };

  it("updateUser email_exists + otp succeeds -> ok:true, verifyType email", async () => {
    const calls = { updateUser: [], otp: [] };
    const client = {
      auth: {
        getSession: async () => ({ data: { session: { user: { id: "u1", is_anonymous: true } } } }),
        updateUser: async (args) => { calls.updateUser.push(args); return { data: {}, error: emailExistsErr }; },
        signInWithOtp: async (args) => { calls.otp.push(args); return { data: {}, error: null }; },
      },
    };
    __setClientForTests(client);
    const r = await sendCode("a@b.co");
    expect(r).toEqual({ ok: true, verifyType: "email" });
    expect(calls.updateUser).toEqual([{ email: "a@b.co" }]);
    expect(calls.otp).toEqual([{ email: "a@b.co", options: { shouldCreateUser: true } }]);
  });

  it("updateUser email_exists + otp also errors -> ok:false, reason:network", async () => {
    const calls = { updateUser: [], otp: [] };
    const client = {
      auth: {
        getSession: async () => ({ data: { session: { user: { id: "u1", is_anonymous: true } } } }),
        updateUser: async (args) => { calls.updateUser.push(args); return { data: {}, error: emailExistsErr }; },
        signInWithOtp: async (args) => { calls.otp.push(args); return { data: {}, error: { status: 500 } }; },
      },
    };
    __setClientForTests(client);
    const r = await sendCode("a@b.co");
    expect(r).toEqual({ ok: false, reason: "network" });
    expect(calls.otp.length).toBe(1);
  });

  it("updateUser fails with a non-exists error -> reason:network, otp never called (regression guard)", async () => {
    const calls = { updateUser: [], otp: [] };
    const client = {
      auth: {
        getSession: async () => ({ data: { session: { user: { id: "u1", is_anonymous: true } } } }),
        updateUser: async (args) => { calls.updateUser.push(args); return { data: {}, error: { status: 500 } }; },
        signInWithOtp: async (args) => { calls.otp.push(args); return { data: {}, error: null }; },
      },
    };
    __setClientForTests(client);
    const r = await sendCode("a@b.co");
    expect(r).toEqual({ ok: false, reason: "network" });
    expect(calls.otp.length).toBe(0);
  });
});

describe("verifyCode", () => {
  it("verifies, upserts profile, returns the session", async () => {
    const { client, calls } = fakeClient();
    __setClientForTests(client);
    const r = await verifyCode("a@b.co", "123456", "email_change", "en");
    expect(r.ok).toBe(true);
    expect(calls.verify).toEqual([{ email: "a@b.co", token: "123456", type: "email_change" }]);
    expect(calls.upserts[0].row).toEqual({ id: "u9", locale: "en" });
  });
  it("wrong code resolves bad-code", async () => {
    const { client } = fakeClient({ failAuth: true });
    __setClientForTests(client);
    expect(await verifyCode("a@b.co", "000000", "email", "en"))
      .toEqual({ ok: false, reason: "bad-code" });
  });
  it("network error (AuthRetryableFetchError status 0) resolves reason:network", async () => {
    const client = {
      auth: {
        verifyOtp: async () => ({ data: {}, error: { name: "AuthRetryableFetchError", status: 0 } }),
      },
    };
    __setClientForTests(client);
    expect(await verifyCode("a@b.co", "123456", "email", "en"))
      .toEqual({ ok: false, reason: "network" });
  });
  it("network error (5xx status) resolves reason:network", async () => {
    const client = {
      auth: {
        verifyOtp: async () => ({ data: {}, error: { status: 503 } }),
      },
    };
    __setClientForTests(client);
    expect(await verifyCode("a@b.co", "123456", "email", "en"))
      .toEqual({ ok: false, reason: "network" });
  });
  it("auth error (403 status) resolves reason:bad-code", async () => {
    const client = {
      auth: {
        verifyOtp: async () => ({ data: {}, error: { status: 403 } }),
      },
    };
    __setClientForTests(client);
    expect(await verifyCode("a@b.co", "123456", "email", "en"))
      .toEqual({ ok: false, reason: "bad-code" });
  });
});

describe("signOut / upsertProfile never throw", () => {
  it("signOut resolves ok even if the SDK throws", async () => {
    __setClientForTests({ auth: { signOut: async () => { throw new Error("x"); } } });
    expect(await signOut()).toEqual({ ok: true });
  });
  it("upsertProfile resolves ok:false on throw", async () => {
    __setClientForTests({ from: () => ({ upsert: async () => { throw new Error("x"); } }) });
    expect(await upsertProfile({ id: "u1", locale: "en" })).toEqual({ ok: false });
  });
  it("upsertProfile offline-guards and never touches the client", async () => {
    // A pre-installed spy client (not null) so the assertion actually
    // distinguishes "guarded before use" from "would've failed via the
    // client anyway" — with client === null the old version of this test
    // passed even without the offline check, because getClient() would lazily
    // construct a real supabase client and its network call would just fail
    // into the same catch block, still resolving {ok:false}.
    let calls = 0;
    __setClientForTests({ from: () => { calls++; return { upsert: async () => ({ error: null }) }; } });
    globalThis.navigator = { onLine: false };
    expect(await upsertProfile({ id: "u1", locale: "en" })).toEqual({ ok: false });
    expect(calls).toBe(0);
  });
  it("saveDisplayName mirrors an explicit name for a session", async () => {
    const { client, calls } = fakeClient();
    __setClientForTests(client);
    expect(await saveDisplayName({ user: { id: "u1" } }, "th", "Lucky"))
      .toEqual({ ok: true });
    expect(calls.upserts).toEqual([{
      table: "profiles", row: { id: "u1", locale: "th", display_name: "Lucky" },
    }]);
  });
  it("saveDisplayName does nothing without a session", async () => {
    expect(await saveDisplayName(null, "en", "Lucky")).toEqual({ ok: false });
  });
});

// Fake with select support for the sync-row reads.
function fakeSyncClient({ progressRow = null, walletRow = null, failSelect = false, failUpsert = false } = {}) {
  const calls = { selects: [], upserts: [] };
  const client = {
    from: (table) => ({
      select: () => ({
        eq: (col, val) => ({
          maybeSingle: async () => {
            calls.selects.push({ table, col, val });
            if (failSelect) return { data: null, error: { message: "boom" } };
            return { data: table === "progress" ? progressRow : walletRow, error: null };
          },
        }),
      }),
      upsert: async (row) => {
        calls.upserts.push({ table, row });
        return { error: failUpsert ? { message: "boom" } : null };
      },
    }),
  };
  return { client, calls };
}

describe("fetchSyncRows", () => {
  it("offline resolves {ok:false, reason:'offline'}", async () => {
    globalThis.navigator = { onLine: false };
    expect(await fetchSyncRows("u1")).toEqual({ ok: false, reason: "offline" });
  });
  it("returns both rows (null when absent)", async () => {
    const p = { user_id: "u1", xp: 5 };
    const { client, calls } = fakeSyncClient({ progressRow: p, walletRow: null });
    __setClientForTests(client);
    expect(await fetchSyncRows("u1")).toEqual({ ok: true, progress: p, wallet: null });
    expect(calls.selects).toEqual([
      { table: "progress", col: "user_id", val: "u1" },
      { table: "wallet", col: "user_id", val: "u1" },
    ]);
  });
  it("select failure resolves {ok:false, reason:'network'} — never throws", async () => {
    const { client } = fakeSyncClient({ failSelect: true });
    __setClientForTests(client);
    expect(await fetchSyncRows("u1")).toEqual({ ok: false, reason: "network" });
  });
});

// Fake with the ledger chain (select/eq/not/gt/order — event_id-tagged rows
// only, ordered ascending). Mirrors fakeSyncClient's shape/conventions.
function fakeLedgerClient({ rows = [], fetchError = null } = {}) {
  const calls = { queries: [] };
  const client = {
    from: (table) => ({
      select: (cols) => ({
        eq: (col, val) => ({
          not: (notCol, op, notVal) => ({
            gt: (gtCol, since) => ({
              order: async (orderCol, opts) => {
                calls.queries.push({ table, cols, col, val, notCol, op, notVal, gtCol, since, orderCol, opts });
                if (fetchError) return { data: null, error: fetchError };
                return { data: rows, error: null };
              },
            }),
          }),
        }),
      }),
    }),
  };
  return { client, calls };
}

function fakeLedgerOrderClient({ row = null, fetchError = null } = {}) {
  const calls = { queries: [] };
  const client = {
    from: (table) => ({
      select: (cols) => ({
        eq: (userCol, userId) => ({
          eq: (orderCol, orderId) => ({
            maybeSingle: async () => {
              calls.queries.push({ table, cols, userCol, userId, orderCol, orderId });
              return fetchError ? { data: null, error: fetchError } : { data: row, error: null };
            },
          }),
        }),
      }),
    }),
  };
  return { client, calls };
}

describe("fetchLedgerSince", () => {
  it("offline resolves {ok:false, reason:'offline'}", async () => {
    globalThis.navigator = { onLine: false };
    expect(await fetchLedgerSince("u1", "2026-01-01T00:00:00Z")).toEqual({ ok: false, reason: "offline" });
  });
  it("queries event_id-tagged rows only, gt the given cutoff, ordered ascending", async () => {
    const rows = [{ delta: 1000, created_at: "2026-07-12T10:00:00Z" }];
    const { client, calls } = fakeLedgerClient({ rows });
    __setClientForTests(client);
    const r = await fetchLedgerSince("u1", "2026-07-01T00:00:00Z");
    expect(r).toEqual({ ok: true, rows });
    const q = calls.queries[0];
    expect(q.table).toBe("ledger");
    expect(q.col).toBe("user_id");
    expect(q.val).toBe("u1");
    expect(q.notCol).toBe("event_id");
    expect(q.op).toBe("is");
    expect(q.notVal).toBe(null);
    expect(q.gtCol).toBe("created_at");
    expect(q.since).toBe("2026-07-01T00:00:00Z");
    expect(q.orderCol).toBe("created_at");
    expect(q.opts).toEqual({ ascending: true });
  });
  it("empty/falsy sinceIso falls back to the epoch sentinel (fetch-all for a fresh cursor)", async () => {
    const { client, calls } = fakeLedgerClient({ rows: [] });
    __setClientForTests(client);
    await fetchLedgerSince("u1", "");
    expect(calls.queries[0].since).toBe(LEDGER_EPOCH);
  });
  it("no rows resolves {ok:true, rows:[]}", async () => {
    const { client } = fakeLedgerClient({ rows: [] });
    __setClientForTests(client);
    expect(await fetchLedgerSince("u1", "2026-01-01T00:00:00Z")).toEqual({ ok: true, rows: [] });
  });
  it("ordinary ledger failure is distinguished from the safe pre-migration case", async () => {
    const { client } = fakeLedgerClient({ fetchError: { message:"permission denied", code:"42501" } });
    __setClientForTests(client);
    expect(await fetchLedgerSince("u1", "2026-01-01T00:00:00Z")).toEqual({ ok:false, reason:"ledger" });
  });
  it("reports a missing ledger migration explicitly", async () => {
    const { client } = fakeLedgerClient({ fetchError: { message:'column ledger.order_id does not exist', code:'42703' } });
    __setClientForTests(client);
    expect(await fetchLedgerSince("u1", "2026-01-01T00:00:00Z")).toEqual({ ok:false, reason:"not-migrated" });
  });
});

describe("fetchLedgerOrder", () => {
  it("looks up one exact store transaction", async () => {
    const row = { delta: 1000, created_at: "2026-07-12T10:00:00Z", order_id: "GPA.ONE" };
    const { client, calls } = fakeLedgerOrderClient({ row });
    __setClientForTests(client);
    expect(await fetchLedgerOrder("u1", "GPA.ONE")).toEqual({ ok: true, row });
    expect(calls.queries[0]).toMatchObject({
      table: "ledger", userCol: "user_id", userId: "u1",
      orderCol: "order_id", orderId: "GPA.ONE",
    });
  });
  it("fails closed for an empty order id", async () => {
    expect(await fetchLedgerOrder("u1", "")).toEqual({ ok: false, reason: "missing-order" });
  });
});

describe("pushSyncRows", () => {
  it("upserts progress then wallet", async () => {
    const { client, calls } = fakeSyncClient();
    __setClientForTests(client);
    const r = await pushSyncRows({ user_id: "u1", xp: 9 }, { user_id: "u1", coins: 4, freezes: 1 });
    expect(r).toEqual({ ok: true });
    expect(calls.upserts.map(u => u.table)).toEqual(["progress", "wallet"]);
  });
  it("any upsert failure resolves {ok:false}", async () => {
    const { client } = fakeSyncClient({ failUpsert: true });
    __setClientForTests(client);
    expect(await pushSyncRows({ user_id: "u1" }, { user_id: "u1" })).toEqual({ ok: false });
  });
});
