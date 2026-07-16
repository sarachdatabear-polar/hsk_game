import { describe, it, expect } from "vitest";
import { RESEND_COOLDOWN_MS, accountState, accountView, canSendCode,
         codeLooksValid, profileRowFor, otpVerifyType } from "../src/account.js";

describe("accountState", () => {
  it("null session is local", () => expect(accountState(null)).toBe("local"));
  it("undefined session is local", () => expect(accountState(undefined)).toBe("local"));
  it("session without user is local", () => expect(accountState({})).toBe("local"));
  it("anonymous user is guest", () =>
    expect(accountState({ user: { id: "u1", is_anonymous: true } })).toBe("guest"));
  it("user with email is signedIn", () =>
    expect(accountState({ user: { id: "u1", email: "a@b.co" } })).toBe("signedIn"));
  it("non-anonymous user WITHOUT email still counts as guest (defensive)", () =>
    expect(accountState({ user: { id: "u1" } })).toBe("guest"));
});

describe("accountView", () => {
  const off = { online: false, phase: "idle", email: "" };
  it("offline shows calm explainer and no actions, any state", () => {
    for (const s of ["local", "guest", "signedIn"]) {
      const v = accountView(s, off);
      expect(v.explainKey).toBe("account.explain.offline");
      expect(v.showConnect).toBe(false);
      expect(v.showEmailForm).toBe(false);
      expect(v.showCodeForm).toBe(false);
      expect(v.showSignOut).toBe(false);
      expect(v.statusKey).toBe("account.status." + s);
    }
  });
  it("local+online offers Connect only", () => {
    const v = accountView("local", { online: true, phase: "idle", email: "" });
    expect(v).toMatchObject({ statusKey: "account.status.local",
      explainKey: "account.explain.local", showConnect: true,
      showEmailForm: false, showCodeForm: false, showSignOut: false });
  });
  it("guest+online idle offers the email form", () => {
    const v = accountView("guest", { online: true, phase: "idle", email: "" });
    expect(v).toMatchObject({ explainKey: "account.explain.guest",
      showConnect: false, showEmailForm: true, showCodeForm: false });
  });
  it("code phase shows the code form for local AND guest", () => {
    for (const s of ["local", "guest"]) {
      const v = accountView(s, { online: true, phase: "code", email: "a@b.co" });
      expect(v.showCodeForm).toBe(true);
      expect(v.showEmailForm).toBe(false);
    }
  });
  it("signedIn shows email param + sign out, ignores phase", () => {
    const v = accountView("signedIn", { online: true, phase: "code", email: "a@b.co" });
    expect(v.statusKey).toBe("account.status.signedIn");
    expect(v.statusParams).toEqual({ email: "a@b.co" });
    expect(v.explainKey).toBe("account.explain.signedIn");
    expect(v.showSignOut).toBe(true);
    expect(v.showCodeForm).toBe(false);
    expect(v.showEmailForm).toBe(false);
  });
});

describe("canSendCode", () => {
  it("rejects malformed emails", () => {
    for (const e of ["", "x", "x@y", "x y@z.co", "@z.co", null, undefined])
      expect(canSendCode(e, 0, 1000).ok).toBe(false);
    expect(canSendCode("x", 0, 1000).reason).toBe("invalid-email");
  });
  it("accepts a normal email with no prior send", () =>
    expect(canSendCode("a@b.co", 0, 1000)).toEqual({ ok: true }));
  it("trims whitespace", () => expect(canSendCode("  a@b.co  ", 0, 1000).ok).toBe(true));
  it("enforces the 60s cooldown with waitMs", () => {
    const r = canSendCode("a@b.co", 100000, 100000 + RESEND_COOLDOWN_MS - 1);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("cooldown");
    expect(r.waitMs).toBe(1);
  });
  it("allows again exactly at cooldown boundary", () =>
    expect(canSendCode("a@b.co", 100000, 100000 + RESEND_COOLDOWN_MS).ok).toBe(true));
});

describe("codeLooksValid", () => {
  it("accepts 6-10 digits (trimmed)", () => {
    for (const c of ["123456", " 123456 ", "1234567", "12345678", "1234567890"])
      expect(codeLooksValid(c)).toBe(true);
  });
  it("rejects everything else", () => {
    for (const c of ["12345", "12345678901", "12345a", "", null, undefined, "12 456"])
      expect(codeLooksValid(c)).toBe(false);
  });
});

describe("profileRowFor / otpVerifyType", () => {
  it("builds the profiles upsert payload", () =>
    expect(profileRowFor("u1", "th")).toEqual({ id: "u1", locale: "th" }));
  it("defaults unknown locale to en", () =>
    expect(profileRowFor("u1", "xx")).toEqual({ id: "u1", locale: "en" }));
  it("adds or resets display_name only when explicitly supplied", () => {
    expect(profileRowFor("u1", "en", " Lucky Learner "))
      .toEqual({ id: "u1", locale: "en", display_name: "Lucky Learner" });
    expect(profileRowFor("u1", "en", ""))
      .toEqual({ id: "u1", locale: "en", display_name: null });
  });
  it("guest upgrade verifies as email_change; fresh sign-in as email", () => {
    expect(otpVerifyType(true)).toBe("email_change");
    expect(otpVerifyType(false)).toBe("email");
  });
});
