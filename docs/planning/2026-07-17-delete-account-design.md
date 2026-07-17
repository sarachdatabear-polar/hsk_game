# Delete Account — design

_Author: Claude (Opus), 2026-07-17. Approved by Jordan. In-app account/data deletion
for email-signed-in cloud users, satisfying the GDPR/PDPA right to erasure that the
privacy policy (§6) promises. Ships **dark behind a flag** until the owner deploys the
Edge Function — no unilateral live-backend mutation._

## Goal

Give an **email-signed-in** user a Settings control that permanently erases their cloud
account and all cloud data, in-app. This closes the compliance gap found while filling the
privacy policy: §6 claimed a "Settings → Delete account" control that does not exist.

## Owner decisions captured (2026-07-17)

- **Who sees it:** email-signed-in users only (shown where "Sign out" shows). Anonymous
  cloud-sync guests do **not** get a delete button (they never consciously "made an account").
- **Local data:** **kept**. Deletion erases cloud data + signs out; local `nbhsk.*` progress
  is untouched — the user drops to offline guest (matches privacy policy §1/§6).
- **Confirmation:** **two-step in-panel confirm** (tap → "permanently erases your cloud data"
  → Confirm/Cancel). Not type-to-confirm.
- **Shipping:** build + **stage** the Edge Function in-repo; ship the button **dark behind a
  flag (default off)**, un-darked only after the owner deploys the function. Mirrors the IAP
  dark pattern. No schema change (cascade FKs already exist). No live backend touched here.

## Why deletion is trivial server-side

Every user table already cascades from `auth.users`:

    profiles / progress / wallet / entitlements / ledger
      → user_id references auth.users (id) ON DELETE CASCADE   (docs/supabase/schema.sql)

So the entire server operation is **one call**: `auth.admin.deleteUser(uid)`. Postgres
cascades the row deletions atomically. No per-table delete logic, no partial-failure state.

## Architecture (mirrors `supabase/functions/rc-webhook/`)

### 1. Edge Function `supabase/functions/delete-account/`
- `index.ts` — thin Deno I/O wrapper. Reads `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
  from env (503 if absent). Extracts the caller's JWT from the `Authorization` header,
  resolves it to a uid with an anon-scoped client (`auth.getUser(jwt)`), then service-role
  `auth.admin.deleteUser(uid)`. Returns 200 `{ok:true}` / 401 (no/invalid token) / 500.
  **A user can only ever delete themselves** — the uid comes from the verified token, never
  from the request body.
- `core.js` — the pure, vitest-testable slice: header/token validation and the
  authorization decision (`authorizeDelete(authHeader) → {ok, jwt}` / `{ok:false, status}`),
  kept out of `index.ts` so it runs under Node like `rc-webhook/core.js` does.

### 2. Client `src/cloud.js` → `deleteAccount()`
- Reads the current session; if none, returns `{ok:false, reason:"no-session"}`.
- `functions.invoke("delete-account", { headers: { Authorization: "Bearer <access_token>" }})`.
- On success: `signOut({ scope: "local" })` and return `{ok:true}`.
- Never throws — wraps in try/catch returning `{ok:false, reason}`, matching cloud.js's
  existing `{error}`-tolerant convention.

### 3. UI `src/main.js` (account panel)
- New availability flag `deleteAccountEnabled()` = `!!store.get("dev.deleteAccount", false)`,
  **default false** — mirrors the existing `iapEnabled()` = `!!store.get("dev.iap", false)`
  dark pattern (`main.js:164`). Button hidden in production until the owner un-darks.
- When `showSignOut` (email session) **and** `deleteAccountEnabled()`: render a destructive
  "Delete account" button below "Sign out".
- **Two-step confirm** reusing the panel's existing re-render pattern: first tap swaps the
  button for a confirm prompt ("This permanently erases your cloud data. Sign out keeps it.")
  with **Confirm** (destructive) + **Cancel**. Confirm calls `deleteAccount()`, disables the
  button during the call, then toasts and re-renders to the local/guest account state.
- Errors → graceful toast (auth-expired → "please sign in again"; unreachable → generic
  fail toast). No crash, no local data loss on failure.

### 4. i18n `src/i18n.js`
- New EN + TH keys: `account.delete`, `account.deleteConfirm`, `account.deleteConfirmYes`,
  `account.deleteCancel`, `account.deleteDone`, `account.deleteFail`. TH strings join the
  native-review queue (tagged like prior additions).

## Data flow

    [Delete account] → [confirm] → cloud.deleteAccount()
      → functions.invoke("delete-account", Bearer <jwt>)
      → fn: getUser(jwt) → uid → admin.deleteUser(uid) → CASCADE wipes all rows
      → client signOut(local) → account panel re-renders to guest → toast
    (local nbhsk.* untouched throughout)

## Error handling

| Case | Behavior |
|---|---|
| No/expired session | client returns early / fn 401 → toast "sign in again", no-op |
| Function not deployed / offline | invoke rejects → `{ok:false}` → generic fail toast |
| Service env missing | fn 503 → treated as fail toast client-side |
| Partial delete | impossible — single `deleteUser`, cascade is atomic |
| Double-tap | button disabled during the in-flight call |

## Testing

- `test/cloud-delete.test.js` — `deleteAccount()` with a mocked client/invoke: success
  (invoke ok → signOut called → `{ok:true}`), auth-fail (no session → early `{ok:false}`),
  invoke-throws (→ `{ok:false}`, no throw).
- `test/delete-account-core.test.js` — `core.authorizeDelete()`: missing header, malformed
  header, well-formed Bearer → `{ok, jwt}`. Mirrors `test/rc-webhook.test.js`.
- `main.js` wiring untested by design. Full suite must stay green (baseline 74 files /
  1946 tests + these new files).

## Shipping / owner runbook (no live-backend mutation in this branch)

1. Build lands on `development` behind `deleteAccountEnabled()` = false → **dark**, button
   hidden in prod. No SHELL bump required for the dark landing.
2. Owner deploys: `supabase functions deploy delete-account` (project `lucky-cat-hsk`).
   The function inherits `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from the platform.
3. Owner smoke-tests on a throwaway signed-in account (delete → row gone in all 5 tables →
   auth user gone), then flips the flag on and cuts a release (SHELL bump).
4. **Doc follow-up at un-dark:** update privacy policy §6 to state the in-app control now
   ships (removing the "planned / until it ships" wording added while filling #113).

## Out of scope (YAGNI)

- Anonymous-guest self-delete UI (data still cascades if they ever sign in + delete).
- Re-authentication / type-to-confirm before delete (session presence is sufficient for a game).
- Data export ("download my data") — separate right, separate feature.
- Any local factory-reset ("wipe everything") path — explicitly rejected; local data is kept.
