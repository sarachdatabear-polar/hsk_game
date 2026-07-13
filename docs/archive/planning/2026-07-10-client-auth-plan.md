# Client Auth (Guest + Email OTP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An Account sub-screen (More tab) where a player can, online and optionally, become a cloud guest and attach an email via 6-digit OTP code — writing only their `profiles` row. (Design: `docs/planning/2026-07-10-client-auth-design.md`.)

**Architecture:** Pure decision module `src/account.js` (states, view models, validation) + impure edge `src/cloud.js` (lazy supabase-js client, offline-guarded, never throws) + `main.js` wiring to a new `#s-account` screen. Boot path does zero network; cloud activates only from the Account screen.

**Tech Stack:** Vanilla JS ES modules, `@supabase/supabase-js` ^2.110.2 (statically bundled by esbuild IIFE), vitest (node env — NO jsdom; DOM logic stays untested in main.js by design), playwright-core probes.

## Global Constraints

- Game repo `/root/work/HSK/game`, branch `feat/client-auth` off `development`. Never stage `game/` from the root repo.
- Never pipe `npm test` through tail/grep/head — the raw exit code gates every commit.
- Every new i18n key exists in BOTH `en` and `th` blocks of `src/i18n.js`; new TH lines get the suffix `   // TH: needs native review` (test `test/i18n-usage.test.js` enforces key symmetry for `data-i18n` markup keys and literal `t("...")` calls).
- Boot/`file://` purity: no network calls, no console errors at module eval. `src/cloud.js` creates its client lazily; nothing in the new code runs at eval.
- Cloud calls NEVER throw or reject — they resolve `{ok:false, reason}` (same rule as `src/native.js`).
- Do NOT commit `dist/app.js` in Tasks 1–4 (Task 5 rebuilds once at the end). Do not bump `SHELL` (release cut does).
- The supabase-js session key `sb-eqsodiufgjecoqgxdisn-auth-token` is the ONE sanctioned exception to the `nbhsk.*` localStorage namespace — comment this at the client-creation site.
- Tests run in vitest DEFAULT node environment (no vitest config exists; do not add one). Mock by assigning `globalThis.*` and resetting in `beforeEach` (see `test/native.test.js:5-19`), NOT `vi.mock`.

---

### Task 1: `src/account.js` — pure decision module

**Files:**
- Create: `src/account.js`
- Test: `test/account.test.js`

**Interfaces:**
- Produces (Tasks 2 & 4 rely on these exact signatures):
  - `RESEND_COOLDOWN_MS` = 60000
  - `accountState(session) -> "local"|"guest"|"signedIn"` (session is supabase-shaped: `null` or `{user:{id, email?, is_anonymous?}}`)
  - `accountView(state, {online, phase, email}) -> {statusKey, statusParams, explainKey, showConnect, showEmailForm, showCodeForm, showSignOut}`
  - `canSendCode(email, lastSentAt, now) -> {ok:true} | {ok:false, reason:"invalid-email"} | {ok:false, reason:"cooldown", waitMs}`
  - `codeLooksValid(code) -> boolean`
  - `profileRowFor(userId, locale) -> {id, locale}`
  - `otpVerifyType(hadGuestSession) -> "email_change"|"email"`

- [ ] **Step 1: Write the failing test** — create `test/account.test.js`:

```js
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
  it("accepts exactly 6 digits (trimmed)", () => {
    expect(codeLooksValid("123456")).toBe(true);
    expect(codeLooksValid(" 123456 ")).toBe(true);
  });
  it("rejects everything else", () => {
    for (const c of ["12345", "1234567", "12345a", "", null, undefined, "12 456"])
      expect(codeLooksValid(c)).toBe(false);
  });
});

describe("profileRowFor / otpVerifyType", () => {
  it("builds the profiles upsert payload", () =>
    expect(profileRowFor("u1", "th")).toEqual({ id: "u1", locale: "th" }));
  it("defaults unknown locale to en", () =>
    expect(profileRowFor("u1", "xx")).toEqual({ id: "u1", locale: "en" }));
  it("guest upgrade verifies as email_change; fresh sign-in as email", () => {
    expect(otpVerifyType(true)).toBe("email_change");
    expect(otpVerifyType(false)).toBe("email");
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run test/account.test.js` → FAIL (module not found).

- [ ] **Step 3: Implement** — create `src/account.js`:

```js
"use strict";
// Account/auth decisions (client-auth round, design doc 2026-07-10). Pure:
// no DOM, no network, no supabase import — cloud.js is the impure edge that
// acts on these decisions, main.js renders the view models.

export const RESEND_COOLDOWN_MS = 60000;

// Supabase-shaped session (or null) -> account state.
export function accountState(session) {
  const u = session && session.user;
  if (!u) return "local";
  return u.email && !u.is_anonymous ? "signedIn" : "guest";
}

// Display model for the Account panel. phase: "idle" | "code" (code entry
// pending). Offline is calm — explainer only, no actions, no error.
export function accountView(state, { online, phase = "idle", email = "" } = {}) {
  const v = {
    statusKey: "account.status." + state,
    statusParams: state === "signedIn" ? { email } : undefined,
    explainKey: "account.explain." + state,
    showConnect: false, showEmailForm: false, showCodeForm: false, showSignOut: false,
  };
  if (!online) { v.explainKey = "account.explain.offline"; return v; }
  if (state === "signedIn") { v.showSignOut = true; return v; }
  if (phase === "code") { v.showCodeForm = true; return v; }
  if (state === "guest") { v.showEmailForm = true; return v; }
  v.showConnect = true;   // local + online + idle
  return v;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function canSendCode(email, lastSentAt, now) {
  if (!EMAIL_RE.test(String(email || "").trim())) return { ok: false, reason: "invalid-email" };
  const waitMs = (lastSentAt || 0) + RESEND_COOLDOWN_MS - now;
  if (waitMs > 0) return { ok: false, reason: "cooldown", waitMs };
  return { ok: true };
}

export function codeLooksValid(code) {
  return /^\d{6}$/.test(String(code || "").trim());
}

export function profileRowFor(userId, locale) {
  return { id: userId, locale: locale === "th" ? "th" : "en" };
}

// The merge-correctness pivot: upgrading an existing (anonymous) guest sends
// the OTP via updateUser({email}) and must verify as "email_change"; a fresh
// signInWithOtp (no session) verifies as "email". Wrong type = failed verify.
export function otpVerifyType(hadGuestSession) {
  return hadGuestSession ? "email_change" : "email";
}
```

Note: `accountState` intentionally treats a non-anonymous user *without* an email as `"guest"` (defensive: never render "Signed in as undefined").

- [ ] **Step 4: Run to verify pass** — `npx vitest run test/account.test.js` → all pass.
- [ ] **Step 5: Full suite** — `npm test` → 1485 + new = all pass, exit 0.
- [ ] **Step 6: Commit** — `git add src/account.js test/account.test.js && git commit -m "feat(account): pure account/auth decision module"`.

---

### Task 2: dependency + `src/cloud-config.js` + `src/cloud.js` — impure edge

**Files:**
- Modify: `package.json` (+ lockfile via npm)
- Create: `src/cloud-config.js`, `src/cloud.js`
- Test: `test/cloud.test.js`

**Interfaces:**
- Consumes from Task 1: `profileRowFor(userId, locale)`, `otpVerifyType(hadGuestSession)`.
- Produces (Task 4 relies on): all `async`, all resolve, never reject:
  - `getSession() -> {ok:true, session}|{ok:false, reason}`
  - `ensureGuest(locale) -> {ok:true, session}|{ok:false, reason}`
  - `sendCode(email) -> {ok:true, verifyType}|{ok:false, reason}`
  - `verifyCode(email, code, verifyType, locale) -> {ok:true, session}|{ok:false, reason:"bad-code"|"offline"|"network"}`
  - `signOut() -> {ok:true}`
  - `upsertProfile(row) -> {ok:boolean}`
  - `__setClientForTests(client)` (test seam; also used to reset with `null`)

- [ ] **Step 1: Install the SDK** — `npm i @supabase/supabase-js@^2.110.2`. Verify `package.json` dependencies gained the entry.

- [ ] **Step 2: Write the failing test** — create `test/cloud.test.js`:

```js
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
});
```

- [ ] **Step 3: Run to verify fail** — `npx vitest run test/cloud.test.js` → FAIL (module not found).

- [ ] **Step 4: Implement** — create `src/cloud-config.js`:

```js
"use strict";
// Supabase project coordinates (client-auth round). The publishable key is
// PUBLIC BY DESIGN — it ships in every client bundle; Row-Level Security on
// the server is the actual security boundary. Rotatable from the dashboard.
export const SUPABASE_URL = "https://eqsodiufgjecoqgxdisn.supabase.co";
export const SUPABASE_KEY = "sb_publishable_Kcs1HDiNFRnLwZBknl8pVA_cIamOe0J";
```

and create `src/cloud.js`:

```js
"use strict";
// Impure cloud edge (client-auth round). Mirrors native.js in spirit: tiny
// surface, lazy client, offline-guarded, NEVER throws/rejects — cloud failure
// must never break gameplay. Nothing here runs at module eval; the client is
// created on first use from the Account screen, so boot and file:// stay
// network-pure. supabase-js persists its session under its own
// sb-eqsodiufgjecoqgxdisn-auth-token localStorage key — the ONE sanctioned
// exception to the nbhsk.* namespace (the SDK owns that key's lifecycle).
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_KEY } from "./cloud-config.js";
import { profileRowFor, otpVerifyType } from "./account.js";

let client = null;
export function __setClientForTests(c) { client = c; }

function getClient() {
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    // detectSessionInUrl MUST stay false: no URL parsing on file://.
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return client;
}

function offline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

async function currentSession() {
  const { data } = await getClient().auth.getSession();
  return (data && data.session) || null;
}

export async function getSession() {
  if (offline()) return { ok: false, reason: "offline" };
  try { return { ok: true, session: await currentSession() }; }
  catch (e) { return { ok: false, reason: "network" }; }
}

export async function ensureGuest(locale) {
  if (offline()) return { ok: false, reason: "offline" };
  try {
    let session = await currentSession();
    if (!session) {
      const { data, error } = await getClient().auth.signInAnonymously();
      if (error || !data || !data.session) return { ok: false, reason: "network" };
      session = data.session;
    }
    await upsertProfile(profileRowFor(session.user.id, locale));
    return { ok: true, session };
  } catch (e) { return { ok: false, reason: "network" }; }
}

export async function sendCode(email) {
  if (offline()) return { ok: false, reason: "offline" };
  try {
    const hadGuest = !!(await currentSession());
    const verifyType = otpVerifyType(hadGuest);
    const { error } = hadGuest
      ? await getClient().auth.updateUser({ email })
      : await getClient().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    return error ? { ok: false, reason: "network" } : { ok: true, verifyType };
  } catch (e) { return { ok: false, reason: "network" }; }
}

export async function verifyCode(email, code, verifyType, locale) {
  if (offline()) return { ok: false, reason: "offline" };
  try {
    const { data, error } = await getClient().auth.verifyOtp({ email, token: code, type: verifyType });
    if (error || !data || !data.session) return { ok: false, reason: "bad-code" };
    await upsertProfile(profileRowFor(data.session.user.id, locale));
    return { ok: true, session: data.session };
  } catch (e) { return { ok: false, reason: "network" }; }
}

export async function upsertProfile(row) {
  try {
    const { error } = await getClient().from("profiles").upsert(row);
    return { ok: !error };
  } catch (e) { return { ok: false }; }
}

export async function signOut() {
  // Local-scope sign-out; local gameplay state is untouched by design.
  try { await getClient().auth.signOut({ scope: "local" }); } catch (e) { /* ignore */ }
  return { ok: true };
}
```

- [ ] **Step 5: Run to verify pass** — `npx vitest run test/cloud.test.js` → all pass.
- [ ] **Step 6: Full suite** — `npm test` → exit 0.
- [ ] **Step 7: Commit** — `git add package.json package-lock.json src/cloud-config.js src/cloud.js test/cloud.test.js && git commit -m "feat(cloud): supabase edge — lazy client, guest/OTP/profile, never-throw"`.

---

### Task 3: i18n keys + nav registration + `index.html` markup

**Files:**
- Modify: `src/i18n.js` (en block after the `notify.*` keys ~line 45; th block at the mirrored spot ~line 317)
- Modify: `src/nav.js:11` (MORE_SUBSCREENS)
- Modify: `test/nav.test.js` (extend expectations — do NOT weaken)
- Modify: `index.html` (More row + `#s-account` screen)

**Interfaces:**
- Produces: i18n keys used by Task 4's `t("...")` literals and the markup's `data-i18n` — exact key list below; screen id `#s-account`; row selector `[data-go="account"]`.
- `test/i18n-usage.test.js` auto-enforces both-locale presence for every key below once markup/Task 4 code lands. Adding them here first keeps every commit green.

- [ ] **Step 1: nav model test first** — in `test/nav.test.js`, find the assertions covering More sub-screens (`scores`, `howto` mapping to tab `"more"` and NAV_VISIBLE) and extend each with `"account"`. Example addition:

```js
it("account is a More sub-screen", () => {
  expect(activeTabFor("account")).toBe("more");
  expect(navVisibleFor("account")).toBe(true);   // match the file's actual helper names
});
```

(Read the file first; mirror its existing style/helpers exactly — the names above must be adapted to what the file actually exports/uses.)

- [ ] **Step 2: Run to verify fail** — `npx vitest run test/nav.test.js` → the new assertions FAIL.

- [ ] **Step 3: Register the screen** — `src/nav.js:11`:

```js
const MORE_SUBSCREENS = ["scores", "howto", "account"];
```

- [ ] **Step 4: Run to verify pass** — `npx vitest run test/nav.test.js` → pass.

- [ ] **Step 5: i18n keys.** In `src/i18n.js` EN block, insert after the `notify.*` keys:

```js
    // account (client-auth round — Account sub-screen off More)
    "account.row": "Account",
    "account.title": "Account",
    "account.status.local": "On this device",
    "account.status.guest": "Guest account",
    "account.status.signedIn": "Signed in as {email}",
    "account.explain.offline": "Cloud accounts need an internet connection — your progress is safe on this device.",
    "account.explain.local": "Your progress lives on this device. Connect to get ready for cloud backup.",
    "account.explain.guest": "Connected as a guest. Add your email so your account isn't lost with this device.",
    "account.explain.signedIn": "Your account is linked. Cloud backup of progress is coming soon.",
    "account.connect": "Connect",
    "account.sendCode": "Send code",
    "account.verify": "Verify",
    "account.resend": "Resend code",
    "account.resendWait": "Resend in {s}s",
    "account.signOut": "Sign out",
    "account.emailPh": "your@email.com",
    "account.codePh": "6-digit code",
    "account.codeSent": "Code sent — check your email",
    "account.signedIn": "Signed in!",
    "account.signedOut": "Signed out",
    "account.err.offline": "No internet connection",
    "account.err.network": "Couldn't reach the cloud — try again",
    "account.err.badEmail": "That email doesn't look right",
    "account.err.badCode": "Wrong or expired code — try again",
```

In the TH block, at the mirrored position (every line suffixed `   // TH: needs native review`):

```js
    // account (client-auth round)
    "account.row": "บัญชี",   // TH: needs native review
    "account.title": "บัญชี",   // TH: needs native review
    "account.status.local": "อยู่บนเครื่องนี้",   // TH: needs native review
    "account.status.guest": "บัญชีผู้เยี่ยมชม",   // TH: needs native review
    "account.status.signedIn": "เข้าสู่ระบบเป็น {email}",   // TH: needs native review
    "account.explain.offline": "บัญชีคลาวด์ต้องใช้อินเทอร์เน็ต — ความคืบหน้าของคุณยังปลอดภัยบนเครื่องนี้",   // TH: needs native review
    "account.explain.local": "ความคืบหน้าของคุณอยู่บนเครื่องนี้ เชื่อมต่อเพื่อเตรียมพร้อมสำรองข้อมูลบนคลาวด์",   // TH: needs native review
    "account.explain.guest": "เชื่อมต่อแบบผู้เยี่ยมชมแล้ว เพิ่มอีเมลเพื่อไม่ให้บัญชีหายไปพร้อมเครื่อง",   // TH: needs native review
    "account.explain.signedIn": "บัญชีของคุณเชื่อมต่อแล้ว การสำรองความคืบหน้าบนคลาวด์กำลังจะมาเร็ว ๆ นี้",   // TH: needs native review
    "account.connect": "เชื่อมต่อ",   // TH: needs native review
    "account.sendCode": "ส่งรหัส",   // TH: needs native review
    "account.verify": "ยืนยัน",   // TH: needs native review
    "account.resend": "ส่งรหัสอีกครั้ง",   // TH: needs native review
    "account.resendWait": "ส่งใหม่ได้ใน {s} วิ",   // TH: needs native review
    "account.signOut": "ออกจากระบบ",   // TH: needs native review
    "account.emailPh": "your@email.com",   // TH: needs native review
    "account.codePh": "รหัส 6 หลัก",   // TH: needs native review
    "account.codeSent": "ส่งรหัสแล้ว — เช็กอีเมลของคุณ",   // TH: needs native review
    "account.signedIn": "เข้าสู่ระบบแล้ว!",   // TH: needs native review
    "account.signedOut": "ออกจากระบบแล้ว",   // TH: needs native review
    "account.err.offline": "ไม่มีการเชื่อมต่ออินเทอร์เน็ต",   // TH: needs native review
    "account.err.network": "ติดต่อคลาวด์ไม่ได้ — ลองอีกครั้ง",   // TH: needs native review
    "account.err.badEmail": "อีเมลนี้ดูไม่ถูกต้อง",   // TH: needs native review
    "account.err.badCode": "รหัสผิดหรือหมดอายุ — ลองอีกครั้ง",   // TH: needs native review
```

- [ ] **Step 6: index.html markup.** (a) Add the Account row inside `#s-more`'s `.menu` div (after the `#more-sound` button, `index.html:985`). First check `assets/ui-icons.svg` for an appropriate symbol id (`grep -o 'symbol id="[a-z-]*"' assets/ui-icons.svg`); use a person/account-ish one if present, else `star`:

```html
      <button class="big" data-go="account"><span class="icon-text"><svg class="asset-icon"><use href="assets/ui-icons.svg#star"></use></svg><span data-i18n="account.row">Account</span></span></button>
```

(b) Add the screen after `#s-howto`'s closing div (pattern of `#s-album`, `index.html:1172-1176`):

```html
  <div class="screen festive" id="s-account">
    <button class="back" data-go="more" data-i18n="common.backMore">← More</button>
    <h2 data-i18n="account.title">Account</h2>
    <div id="account-panel"></div>
  </div>
```

- [ ] **Step 7: Full suite** — `npm test` → exit 0 (i18n-usage picks up the two markup keys; both locales exist, so green).
- [ ] **Step 8: Commit** — `git add src/i18n.js src/nav.js test/nav.test.js index.html && git commit -m "feat(account): i18n EN+TH, nav registration, Account screen markup"`.

---

### Task 4: `main.js` wiring — renderAccount + flows

**Files:**
- Modify: `src/main.js` (imports ~line 25; `[data-go]` listener ~line 528-541; new section near the daily-quests region or after renderAlbum)
- Modify: `index.html` (small CSS block for `.account-*` if needed — reuse existing `.menu button.big`, `.sect` styles first; only add CSS that's missing)

**Interfaces:**
- Consumes Task 1 (`accountState`, `accountView`, `canSendCode`, `codeLooksValid`, `RESEND_COOLDOWN_MS`) and Task 2 (`getSession`, `ensureGuest`, `sendCode`, `verifyCode`, `signOut`).
- Produces: `renderAccount()` called from the `[data-go]` branch. Wiring is untested by design (main.js convention) — all logic already lives in the tested pure modules.

- [ ] **Step 1: Imports** — add to `src/main.js` imports:

```js
import { accountState, accountView, canSendCode, codeLooksValid, RESEND_COOLDOWN_MS } from "./account.js";
import { getSession, ensureGuest, sendCode, verifyCode, signOut } from "./cloud.js";
```

- [ ] **Step 2: State + render.** Add a new section (comment-labeled like the others, e.g. after the sticker-album section):

```js
/* ============================== account ============================== */
// UI-flow state only — truth lives in the supabase session (cloud.js) and
// the pure view model (account.js). lastSentAt feeds the resend cooldown.
const accountUI = { session: null, phase: "idle", email: "", verifyType: "email", lastSentAt: 0 };
let accountCooldownTimer = 0;

function accountOnline() {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

function renderAccount() {
  const state = accountState(accountUI.session);
  const v = accountView(state, { online: accountOnline(), phase: accountUI.phase, email: accountUI.email });
  const p = $("#account-panel");
  p.innerHTML = "";
  const status = document.createElement("div");
  status.className = "sect";
  status.textContent = t(v.statusKey, v.statusParams);
  p.appendChild(status);
  const ex = document.createElement("p");
  ex.className = "account-explain";
  ex.textContent = t(v.explainKey);
  p.appendChild(ex);
  if (v.showConnect) p.appendChild(accountBtn(t("account.connect"), onAccountConnect));
  if (v.showEmailForm) {
    const email = accountInput("email", t("account.emailPh"), accountUI.email);
    p.appendChild(email);
    p.appendChild(accountBtn(t("account.sendCode"), () => onAccountSendCode(email.value)));
  }
  if (v.showCodeForm) {
    const code = accountInput("text", t("account.codePh"), "");
    code.inputMode = "numeric"; code.maxLength = 6; code.autocomplete = "one-time-code";
    p.appendChild(code);
    p.appendChild(accountBtn(t("account.verify"), () => onAccountVerify(code.value)));
    p.appendChild(accountResendBtn());
  }
  if (v.showSignOut) p.appendChild(accountBtn(t("account.signOut"), onAccountSignOut));
}

function accountBtn(label, onclick) {
  const b = document.createElement("button");
  b.className = "big"; b.textContent = label; b.onclick = onclick;
  return b;
}

function accountInput(type, placeholder, value) {
  const i = document.createElement("input");
  i.type = type; i.placeholder = placeholder; i.value = value;
  i.className = "account-input";
  return i;
}

function accountResendBtn() {
  const b = document.createElement("button");
  b.className = "big account-resend";
  const tick = () => {
    const r = canSendCode(accountUI.email, accountUI.lastSentAt, Date.now());
    if (r.ok) { b.disabled = false; b.textContent = t("account.resend"); }
    else if (r.reason === "cooldown") {
      b.disabled = true;
      b.textContent = t("account.resendWait", { s: Math.ceil(r.waitMs / 1000) });
      accountCooldownTimer = setTimeout(tick, 1000);
    }
  };
  clearTimeout(accountCooldownTimer);
  tick();
  b.onclick = () => onAccountSendCode(accountUI.email);
  return b;
}

async function refreshAccountSession() {
  const r = await getSession();
  if (r.ok) { accountUI.session = r.session; renderAccount(); }
}

async function onAccountConnect() {
  const r = await ensureGuest(getLocale());
  if (r.ok) { accountUI.session = r.session; renderAccount(); }
  else toast(t("account.err." + (r.reason === "offline" ? "offline" : "network")));
}

async function onAccountSendCode(email) {
  const gate = canSendCode(email, accountUI.lastSentAt, Date.now());
  if (!gate.ok) {
    if (gate.reason === "invalid-email") toast(t("account.err.badEmail"));
    return;   // cooldown: the resend button already shows the countdown
  }
  const r = await sendCode(String(email).trim());
  if (!r.ok) { toast(t("account.err." + (r.reason === "offline" ? "offline" : "network"))); return; }
  accountUI.email = String(email).trim();
  accountUI.verifyType = r.verifyType;
  accountUI.lastSentAt = Date.now();
  accountUI.phase = "code";
  toast(t("account.codeSent"));
  renderAccount();
}

async function onAccountVerify(code) {
  if (!codeLooksValid(code)) { toast(t("account.err.badCode")); return; }
  const r = await verifyCode(accountUI.email, String(code).trim(), accountUI.verifyType, getLocale());
  if (!r.ok) {
    toast(t("account.err." + (r.reason === "bad-code" ? "badCode" : r.reason === "offline" ? "offline" : "network")));
    return;
  }
  accountUI.session = r.session;
  accountUI.phase = "idle";
  toast(t("account.signedIn"));
  renderAccount();
}

async function onAccountSignOut() {
  await signOut();
  accountUI.session = null;
  accountUI.phase = "idle";
  toast(t("account.signedOut"));
  renderAccount();
}
```

(`getLocale` is already imported at `main.js:29`. `$` and `toast` are existing main.js helpers.)

- [ ] **Step 3: Navigation branch** — in the `[data-go]` delegated listener (`main.js:528-541`) add before the final `else`:

```js
    else if(tab==="account"){ renderAccount(); show("account"); refreshAccountSession(); }
```

- [ ] **Step 4: CSS** — in `index.html`'s style block, add (near other screen-specific styles; keep minimal, reuse tokens):

```css
  #account-panel { display:flex; flex-direction:column; gap:12px; max-width:420px; }
  .account-explain { color:var(--muted); margin:0; }
  .account-input { padding:12px 14px; border-radius:12px; border:1px solid var(--line, #ccc);
                   font:inherit; background:var(--card, #fff); }
```

(Verify `--muted` exists — it's used by the audit-v50 round; if `--line`/`--card` don't exist, use the fallback literals shown.)

- [ ] **Step 5: Suite + build** — `npm test` → exit 0. `npm run build` → clean. Note the `dist/app.js` byte size before/after the supabase-js import for the PR body (do NOT commit dist).

- [ ] **Step 6: Manual smoke over http** — `python3 -m http.server 8000` + a playwright-core probe (chromium at `~/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome`): open `http://localhost:8000`, click More tab → Account row; expect the `local`+online view (Connect button). Assert zero console errors AND (route-count) zero requests to `*.supabase.co` during boot + home + battle screens — the network-purity claim. Clicking Connect against the LIVE project is allowed (it creates one anonymous user — fine).

- [ ] **Step 7: Commit** — `git add src/main.js index.html && git commit -m "feat(account): Account screen wiring — connect, email OTP, sign-out"`.

---

### Task 5: probes, sweep gate, full verify

**Files:**
- Modify: `scripts/responsive-sweep.mjs` (account gate)
- Create: (temp, not committed) probe script under `$CLAUDE_JOB_DIR/tmp/`
- Modify: `dist/app.js` (single rebuild, committed here per repo convention)

**Interfaces:** consumes the `[data-go="account"]` row (inside `#s-more`) and `#s-account` from Task 3.

- [ ] **Step 1: Sweep gate.** In `scripts/responsive-sweep.mjs` add a nav helper (More tab first, then the row — pattern of `goToShop` at lines 246-249):

```js
async function goToAccount(page) {
  await page.evaluate(() => document.querySelector('#bottom-nav [data-go="more"], [data-go="more"]')?.click());
  await page.waitForTimeout(150);
  await page.evaluate(() => document.querySelector('#s-more [data-go="account"]')?.click());
  await page.waitForTimeout(250);
}
```

In the viewport loop (after the shop probes ~line 322):

```js
    await goToAccount(page);
    const account = await page.evaluate(probeScreen, ["account", TOL]);
```

and mirror the existing per-screen failure pushes (overflowX / small / wide) for `account`, matching exactly how the shop/street results are asserted (~lines 369-386). Return to home after, like the street block does.

- [ ] **Step 2: Run the sweep** — serve on :8000, `node scripts/responsive-sweep.mjs` → 10/10 including the new account gate. Run twice.

- [ ] **Step 3: Offline-calm probe** (temp script): playwright with `addInitScript(() => Object.defineProperty(navigator, "onLine", { get: () => false }))` → open Account → assert the panel shows `t("account.explain.offline")` text (check both EN and, after switching the language chips, TH), NO email form, zero console errors.

- [ ] **Step 4: Network-fail probe** (temp script): `page.route("**/*.supabase.co/**", r => r.abort())` → open Account → click Connect → assert a `.toast-pop.show` appears and no uncaught errors.

- [ ] **Step 5: file://-style purity probe**: load the page, count requests to `*.supabase.co` from boot through: home render, one battle answer, More screen. Expect ZERO (network only after Account interactions).

- [ ] **Step 6: Full suite + rebuild + commit** — `npm test` (exit 0), `npm run build`, then `git add dist/app.js scripts/responsive-sweep.mjs && git commit -m "test(account): sweep gate + verified probes; dist rebuild"`.

- [ ] **Step 7: PR** — push `feat/client-auth`, open PR against `development`:

```bash
gh pr create --base development --title "feat: client auth — guest + email OTP, profile row (Supabase)" --body "..."
```

PR body: design doc link, the P0 DoD claim (guest + sign-in work), bundle size delta, live-project note (anonymous users created during probes), new TH strings for native review, SHELL bump at release cut, out-of-scope list (cloud save = next round).

---

## Verification checklist (whole branch)

- `npm test` exit 0; new tests: account (pure), cloud (mocked), nav additions; i18n-usage green in both locales.
- Sweep 10/10 ×2 with the account gate.
- Probes: offline-calm (EN+TH), network-fail toast, boot network purity (zero supabase requests before Account interaction).
- Manual live check: Connect creates an anonymous user visible in Supabase dashboard; email code arrives; verify upgrades the SAME user id (check `auth.users` — no second row) and writes the `profiles` row.
- `git log` — no `dist/app.js` commits except Task 5's single rebuild; SHELL untouched.
