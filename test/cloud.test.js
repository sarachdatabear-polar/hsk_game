import { describe, it, expect, beforeEach } from "vitest";
import { getSession, ensureGuest, sendCode, verifyCode, signOut,
         upsertProfile, __setClientForTests } from "../src/cloud.js";

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
});
