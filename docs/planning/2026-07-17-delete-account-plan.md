# Delete Account Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give email-signed-in users an in-app control that permanently deletes their cloud account + all cloud data, shipped dark until the owner deploys the Edge Function.

**Architecture:** A new Deno Edge Function `delete-account` (thin `index.ts` I/O + vitest-tested `core.js`) verifies the caller's JWT and calls `auth.admin.deleteUser(uid)`; the existing `ON DELETE CASCADE` FKs wipe all 5 user tables atomically. `src/cloud.js` gains `deleteAccount()` (invoke → local sign-out, never throws); `src/main.js` renders a two-step-confirm button gated on `v.showSignOut && deleteAccountEnabled()`. Local `nbhsk.*` data is untouched.

**Tech Stack:** Vanilla JS ES modules, esbuild, vitest, Supabase (supabase-js, Deno Edge Functions). Mirrors the existing `supabase/functions/rc-webhook/` pattern.

**Design doc:** `docs/planning/2026-07-17-delete-account-design.md`.

## Global Constraints

- **Ships dark:** the button is gated on `deleteAccountEnabled()` = `!!store.get("dev.deleteAccount", false)`, **default false**. No `sw.js` SHELL bump for this dark landing.
- **No live-backend mutation here:** the Edge Function is staged in-repo only. The owner runs `supabase functions deploy delete-account` and flips the flag — not this branch.
- **No schema change:** the cascade FKs already exist (`docs/supabase/schema.sql`).
- **A user can only delete themselves:** the uid comes from the verified JWT (`auth.getUser(jwt)`), never from the request body.
- **Local data is kept:** deletion signs out (`scope:"local"`) but never clears `nbhsk.*`.
- `core.js` and `cloud.js` are pure ESM importable under vitest; `main.js` wiring is untested by design.
- After editing `src/`, run `npm run build`. Never pipe `npm test` to `tail`/`grep` when gating a commit.
- New TH i18n strings join the native-review queue.
- Commit message trailer for every commit: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

### Task 1: `delete-account` Edge Function (core + wrapper)

**Files:**
- Create: `supabase/functions/delete-account/core.js`
- Create: `supabase/functions/delete-account/index.ts`
- Test: `test/delete-account-core.test.js`

**Interfaces:**
- Produces: `authorizeDelete(authHeader: string|null) → { ok: true, jwt: string } | { ok: false, status: 401 }` (imported by `index.ts` and the test).

- [ ] **Step 1: Write the failing test**

```js
// test/delete-account-core.test.js
import { describe, it, expect } from "vitest";
import { authorizeDelete } from "../supabase/functions/delete-account/core.js";

describe("authorizeDelete", () => {
  it("rejects a missing header", () => {
    expect(authorizeDelete(null)).toEqual({ ok: false, status: 401 });
  });
  it("rejects a non-Bearer header", () => {
    expect(authorizeDelete("Basic abc")).toEqual({ ok: false, status: 401 });
  });
  it("rejects an empty Bearer token", () => {
    expect(authorizeDelete("Bearer    ")).toEqual({ ok: false, status: 401 });
  });
  it("accepts a well-formed Bearer token", () => {
    expect(authorizeDelete("Bearer jwt.token.here")).toEqual({ ok: true, jwt: "jwt.token.here" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/delete-account-core.test.js`
Expected: FAIL — cannot resolve `../supabase/functions/delete-account/core.js`.

- [ ] **Step 3: Write `core.js`**

```js
// supabase/functions/delete-account/core.js
// delete-account Edge Function — pure authorization slice (vitest-tested,
// mirrors rc-webhook/core.js). Validates the caller's Authorization header.
// The uid is resolved from the VERIFIED token in index.ts, never from the
// request body, so a user can only ever delete themselves.
export function authorizeDelete(authHeader) {
  const m = /^Bearer\s+(.+)$/.exec(String(authHeader || ""));
  if (!m || !m[1].trim()) return { ok: false, status: 401 };
  return { ok: true, jwt: m[1].trim() };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/delete-account-core.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Write `index.ts` (Deno wrapper — not unit-tested, mirrors rc-webhook)**

```ts
// Delete-account — Deno Edge Function. Thin I/O wrapper: authorization logic
// lives in core.js (vitest-tested). This file resolves the caller's own uid
// from their verified JWT and does the service-role delete that cascades to
// every user table (profiles/progress/wallet/entitlements/ledger).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authorizeDelete } from "./core.js";

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response("service unavailable", { status: 503 });
  }

  const auth = authorizeDelete(req.headers.get("Authorization"));
  if (!auth.ok) return new Response("unauthorized", { status: auth.status });

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  // Resolve the caller's OWN uid from their verified token — never a body value.
  const { data: userData, error: userErr } = await supabase.auth.getUser(auth.jwt);
  if (userErr || !userData || !userData.user) {
    return new Response("unauthorized", { status: 401 });
  }
  // Service-role delete; ON DELETE CASCADE wipes this uid's rows across all
  // five user tables in one atomic Postgres operation.
  const { error: delErr } = await supabase.auth.admin.deleteUser(userData.user.id);
  if (delErr) return new Response("storage error", { status: 500 });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
```

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/delete-account/core.js supabase/functions/delete-account/index.ts test/delete-account-core.test.js
git commit -m "feat(delete-account): Edge Function — verify caller JWT + service-role deleteUser (cascade)"
```

---

### Task 2: `cloud.deleteAccount()` client edge

**Files:**
- Modify: `src/cloud.js` (add `deleteAccount` near `signOut`, ~line 188)
- Test: `test/cloud-delete.test.js`

**Interfaces:**
- Consumes: existing `getClient()`, `currentSession()`, `offline()`, `__setClientForTests()` in `cloud.js`.
- Produces: `deleteAccount() → Promise<{ ok: true } | { ok: false, reason: "offline"|"no-session"|"network" }>`.

- [ ] **Step 1: Write the failing test**

```js
// test/cloud-delete.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/cloud-delete.test.js`
Expected: FAIL — `deleteAccount` is not exported.

- [ ] **Step 3: Add `deleteAccount` to `src/cloud.js`** (immediately after the existing `signOut` function)

```js
// Delete the caller's cloud account + all cloud data (via the delete-account
// Edge Function, which resolves the uid from this JWT and service-role deletes
// it — cascade wipes every user table). Local nbhsk.* is intentionally kept:
// on success we only sign out locally, so the player drops to offline guest.
// Never throws — {ok:false, reason} on any failure, matching this file.
export async function deleteAccount() {
  if (offline()) return { ok: false, reason: "offline" };
  try {
    const session = await currentSession();
    if (!session) return { ok: false, reason: "no-session" };
    const { error } = await getClient().functions.invoke("delete-account", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error) return { ok: false, reason: "network" };
    await getClient().auth.signOut({ scope: "local" });
    return { ok: true };
  } catch (e) { return { ok: false, reason: "network" }; }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/cloud-delete.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/cloud.js test/cloud-delete.test.js
git commit -m "feat(delete-account): cloud.deleteAccount() — invoke fn then local sign-out, never throws"
```

---

### Task 3: i18n strings (EN + TH)

**Files:**
- Modify: `src/i18n.js` (EN block near `account.signOut` ~line 65; TH block near its `account.signOut` ~line 474)

**Interfaces:**
- Produces i18n keys used by Task 4: `account.delete`, `account.deleteConfirm`, `account.deleteConfirmYes`, `account.deleteCancel`, `account.deleteDone`, `account.deleteFail`.

- [ ] **Step 1: Add the EN strings** (immediately after `"account.signOut": "Sign out",`)

```js
    "account.delete": "Delete account",
    "account.deleteConfirm": "Permanently erase your cloud data? Signing out instead keeps it.",
    "account.deleteConfirmYes": "Delete permanently",
    "account.deleteCancel": "Cancel",
    "account.deleteDone": "Cloud account deleted",
    "account.deleteFail": "Couldn't delete — try again",
```

- [ ] **Step 2: Add the TH strings** (immediately after the Thai `"account.signOut": "ออกจากระบบ",`) — tagged for native review

```js
    "account.delete": "ลบบัญชี", // TH-REVIEW
    "account.deleteConfirm": "ลบข้อมูลบนคลาวด์อย่างถาวรหรือไม่? การออกจากระบบจะเก็บข้อมูลไว้", // TH-REVIEW
    "account.deleteConfirmYes": "ลบถาวร", // TH-REVIEW
    "account.deleteCancel": "ยกเลิก", // TH-REVIEW
    "account.deleteDone": "ลบบัญชีคลาวด์แล้ว", // TH-REVIEW
    "account.deleteFail": "ลบไม่สำเร็จ — ลองอีกครั้ง", // TH-REVIEW
```

- [ ] **Step 3: Run the i18n parity test to confirm EN/TH keys match**

Run: `npx vitest run test/i18n.test.js`
Expected: PASS (no missing-key mismatch between EN and TH).

- [ ] **Step 4: Commit**

```bash
git add src/i18n.js
git commit -m "feat(delete-account): EN+TH strings for the delete-account control (TH review queue +6)"
```

---

### Task 4: Account-panel UI + dark flag + build

**Files:**
- Modify: `src/main.js` — import `deleteAccount` (line ~40); add `deleteAccountEnabled()` (near `iapEnabled`, ~line 164); add `confirmingDelete` to `accountUI`; render the control + handler in the account panel (~line 645); reset the flag in `onAccountSignOut`.
- Modify: `index.html` — one small CSS rule for the destructive button in the `#account-panel` block (~line 220).
- Build: `npm run build`

**Interfaces:**
- Consumes: `deleteAccount` from `./cloud.js` (Task 2); the `account.delete*` i18n keys (Task 3); existing `accountBtn`, `renderAccount`, `toast`, `store`, `accountUI`, `v.showSignOut`.

- [ ] **Step 1: Import `deleteAccount`** — extend the existing cloud import (`src/main.js:40`)

Change:
```js
import { getSession, ensureGuest, sendCode, verifyCode, saveDisplayName, signOut } from "./cloud.js";
```
to:
```js
import { getSession, ensureGuest, sendCode, verifyCode, saveDisplayName, signOut, deleteAccount } from "./cloud.js";
```

- [ ] **Step 2: Add the dark flag** — next to `iapEnabled` (`src/main.js:164`, `const iapEnabled = () => !!store.get("dev.iap", false);`)

```js
// Delete-account control ships dark: hidden until the owner deploys the
// delete-account Edge Function and sets nbhsk.dev.deleteAccount = true.
const deleteAccountEnabled = () => !!store.get("dev.deleteAccount", false);
```

- [ ] **Step 3: Add `confirmingDelete` to the `accountUI` initial state**

Find the `accountUI` object literal (grep `accountUI = {` in `src/main.js`) and add `confirmingDelete: false,` to it.

- [ ] **Step 4: Render the control in the account panel** — after the sign-out line (`src/main.js:645`, `if(v.showSignOut) p.appendChild(accountBtn(t("account.signOut"), onAccountSignOut));`), add:

```js
  if(v.showSignOut && deleteAccountEnabled()) renderDeleteAccount(p);
```

- [ ] **Step 5: Add the `renderDeleteAccount` helper + `onAccountDelete` handler** — near `onAccountSignOut` (`src/main.js:802`)

```js
function renderDeleteAccount(p){
  if(!accountUI.confirmingDelete){
    // First tap arms the confirm; the destructive action is never one click.
    const b = accountBtn(t("account.delete"), ()=>{ accountUI.confirmingDelete = true; renderAccount(); });
    b.classList.add("account-danger");
    p.appendChild(b);
    return;
  }
  const warn = document.createElement("p");
  warn.className = "account-explain";
  warn.textContent = t("account.deleteConfirm");
  p.appendChild(warn);
  const yes = accountBtn(t("account.deleteConfirmYes"), onAccountDelete);
  yes.classList.add("account-danger");
  p.appendChild(yes);
  p.appendChild(accountBtn(t("account.deleteCancel"), ()=>{ accountUI.confirmingDelete = false; renderAccount(); }));
}

async function onAccountDelete(){
  // accountBtn() already disables the button for the in-flight call.
  const r = await deleteAccount();
  if(!r.ok){ toast(t("account.deleteFail")); return; }
  // Cloud gone; drop to local/guest. Local nbhsk.* progress is intentionally kept.
  accountUI.session = null;
  accountUI.phase = "idle";
  accountUI.email = "";
  accountUI.lastSentAt = 0;
  accountUI.confirmingDelete = false;
  toast(t("account.deleteDone"));
  renderAccount();
}
```

- [ ] **Step 6: Reset the confirm state on sign-out** — in `onAccountSignOut` (`src/main.js:802`), add `accountUI.confirmingDelete = false;` alongside the other `accountUI.*` resets.

- [ ] **Step 7: Add the destructive-button CSS** — in `index.html`, inside the `#account-panel` style block (~line 220), add:

```css
  .account-danger{background:#c0392b; color:#fff; border-color:#c0392b;}
```

- [ ] **Step 8: Build**

Run: `npm run build`
Expected: clean; `dist/app.js` regenerated.

- [ ] **Step 9: Run the full suite**

Run: `npm test`
Expected: PASS — baseline 74 files / 1946 tests **plus** the new `delete-account-core` (4) and `cloud-delete` (3) tests; no regressions.

- [ ] **Step 10: Manual dark check (documented, not automated)**

With the flag unset, the account panel shows **no** Delete button for a signed-in user. Setting `localStorage["nbhsk.dev.deleteAccount"]="true"` and reopening Account reveals it; first tap arms the confirm, Cancel disarms. (No network is exercised — the function is undeployed; that's expected until the owner un-darks.)

- [ ] **Step 11: Commit**

```bash
git add src/main.js index.html dist/app.js
git commit -m "feat(delete-account): dark account-panel control with two-step confirm (email users)"
```

---

## Owner runbook (post-merge, not part of this branch)

1. Deploy: `supabase functions deploy delete-account` (project `lucky-cat-hsk`). The function inherits `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from the platform.
2. Smoke on a throwaway signed-in account: delete → confirm rows gone in all 5 tables + the `auth.users` row gone.
3. Set `nbhsk.dev.deleteAccount = true` (un-dark) and cut a release **with a SHELL bump**.
4. **Doc follow-up:** update privacy policy §6 (PR #113's wording) to state the in-app "Delete account" control now ships, removing the "planned / until it ships" note.

## Self-review notes (spec coverage)

- Edge Function + JWT-only uid + cascade → Task 1. Client `deleteAccount()` never-throws → Task 2. EN+TH copy → Task 3. Email-only gating (`v.showSignOut`), two-step confirm, dark flag, keep-local → Task 4. Owner deploy/un-dark + privacy §6 follow-up → runbook. YAGNI exclusions (anon UI, re-auth, export, factory-reset) carried from the design.
