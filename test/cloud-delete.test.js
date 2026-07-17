import { describe, it, expect, vi } from "vitest";
import { deleteAccount, __setClientForTests } from "../src/cloud.js";

// jsdom's navigator.onLine defaults to true, so offline() is false here.
function fakeClient({ session = { access_token: "jwt" }, invokeError = null } = {}) {
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const invoke = vi.fn().mockResolvedValue({ data: invokeError ? null : { ok: true }, error: invokeError });
  return {
    _signOut: signOut, _invoke: invoke,
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session } }), signOut },
    functions: { invoke },
  };
}

describe("deleteAccount", () => {
  it("invokes the function with the session JWT then signs out locally", async () => {
    const c = fakeClient();
    __setClientForTests(c);
    const r = await deleteAccount();
    expect(r).toEqual({ ok: true });
    expect(c._invoke).toHaveBeenCalledWith("delete-account", { headers: { Authorization: "Bearer jwt" } });
    expect(c._signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("returns no-session and does not invoke when signed out", async () => {
    const c = fakeClient({ session: null });
    __setClientForTests(c);
    const r = await deleteAccount();
    expect(r).toEqual({ ok: false, reason: "no-session" });
    expect(c._invoke).not.toHaveBeenCalled();
  });

  it("returns network on invoke error and does NOT sign out", async () => {
    const c = fakeClient({ invokeError: { message: "boom" } });
    __setClientForTests(c);
    const r = await deleteAccount();
    expect(r).toEqual({ ok: false, reason: "network" });
    expect(c._signOut).not.toHaveBeenCalled();
  });
});
