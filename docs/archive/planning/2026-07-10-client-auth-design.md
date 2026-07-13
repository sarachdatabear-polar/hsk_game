# Client Auth (Guest + Email OTP) — Design

_Approved by Jordan 2026-07-10 (brainstorm round). Scope decisions: guest + email only;
auth + profile row (no progress/wallet sync this round); guest created lazily at first
sign-in intent. Backend is LIVE: Supabase project `lucky-cat-hsk`
(ref `eqsodiufgjecoqgxdisn`, ap-southeast-1), schema.sql applied (5 tables, RLS),
anonymous sign-ins + email auth enabled._

## Goal

The Monetization PRD P0 definition-of-done: **"guest + sign-in work."** The game gains an
Account surface where a player can (online, entirely optionally) become a cloud guest and
attach an email to their account. Progress/coins cloud-save is explicitly the NEXT round
(P3 reconcile) — this round writes only the `profiles` row.

## Non-negotiables (inherited)

- **Offline-first / `file://`:** boot path does zero network; the game is byte-identical
  in behavior when offline or on `file://`. Cloud code activates only from the Account
  screen, online.
- **Never throw:** cloud failure can never break gameplay (same rule as `native.js`).
- **i18n:** every new string exists in both `en` and `th` blocks of `src/i18n.js`.
- **`localStorage` namespace:** `nbhsk.*` — with ONE sanctioned exception: supabase-js
  owns its session key (`sb-<ref>-auth-token`). Comment this at the client-creation site.

## Architecture

### `src/account.js` — pure module (the brain)

No DOM, no network, no supabase import. Unit-tested exhaustively.

- **States:** `"local"` (no cloud session) → `"guest"` (anonymous session) →
  `"signedIn"` (email attached). Derived by `accountState(session)` from a session-shaped
  object (`null` | `{user:{is_anonymous:true}}` | `{user:{email}}`).
- `accountView(state, {online, email})` → display model for the Account panel:
  which i18n keys to show for status line / explainer / primary action, whether the email
  form is visible. Encodes the offline-is-calm rule (`local`+offline → explainer, no error).
- `canSendCode(email, lastSentAt, now)` → `{ok}` or `{ok:false, waitMs | reason:"invalid-email"}`.
  60 000 ms cooldown between sends; RFC-loose email shape check (`x@y.z`).
- `codeLooksValid(code)` → 6 digits exactly (trimmed).
- `profileRowFor(userId, locale)` → `{id, locale}` upsert payload (display_name stays
  null this round — YAGNI).
- `otpVerifyType(state)` → `"email_change"` when upgrading a guest (anonymous user +
  `updateUser({email})`), `"email"` for a plain `signInWithOtp` sign-in (no guest session
  exists, e.g. resumed app with cleared session). This is the merge-correctness pivot.

### `src/cloud.js` — impure edge (the hands)

Mirrors `native.js` in spirit: tiny surface, lazy, guarded, never throws.

- Statically imports `@supabase/supabase-js` (esbuild IIFE can't code-split; bundle cost
  ~50 KB gz accepted) and `src/cloud-config.js` (project URL + anon key — public by
  design; RLS is the security boundary).
- Client is created **lazily** on first Account-screen use (`getClient()` memoized);
  module eval does nothing.
- Surface (all `async`, all resolve `{ok, ...}|{ok:false, reason}`, never reject):
  - `getSession()` — current session or null (also used at Account-screen open to restore
    a persisted session).
  - `ensureGuest()` — `signInAnonymously()` if no session; then `upsertProfile`.
  - `sendCode(email)` — guest session present → `updateUser({email})` (sends
    email_change OTP); no session → `signInWithOtp({email, shouldCreateUser:true})`.
  - `verifyCode(email, code, type)` — `verifyOtp`; on success → `upsertProfile`.
  - `upsertProfile(row)` — upsert into `profiles` (RLS self-row).
  - `signOut()` — local scope sign-out; local gameplay state untouched.
- Every call checks `navigator.onLine` first (`{ok:false, reason:"offline"}`) and wraps
  the SDK in try/catch (`reason:"network"`).

### `main.js` wiring + Account panel

- **More tab** gains an "Account" row (icon + status chip: On this device / Guest /
  the email). Opens a new sub-screen `#s-account` (markup+CSS inline in index.html,
  same pattern as existing sub-screens).
- Panel renders from `accountView(...)`: status, explainer, then per state —
  `local`+online: Connect button → `ensureGuest()`; `guest`: email input + Send code;
  code entry: 6-digit input + Verify (+ resend w/ cooldown countdown); `signedIn`:
  email display + Sign out. Failures → existing `toast()` with i18n messages.
- Session restore: opening the Account screen calls `getSession()` (lazy; boot untouched).

## New i18n keys (en + th)

`nav/more row`: `account.title`, `account.row`; states: `account.status.local`,
`account.status.guest`, `account.status.signedIn`; explainers: `account.explain.offline`,
`account.explain.local`, `account.explain.guest`; actions: `account.connect`,
`account.sendCode`, `account.verify`, `account.resend`, `account.resendWait` ({s}),
`account.signOut`; form: `account.emailPh`, `account.codePh`; toasts:
`account.err.offline`, `account.err.network`, `account.err.badEmail`,
`account.err.badCode`, `account.codeSent`, `account.signedIn`, `account.signedOut`.

## Error handling & limits

- All failure paths end in a calm toast; no dead-ends, no thrown errors, no console spam.
- 60 s resend cooldown in the UI (pure rule in `account.js`); Supabase's built-in mailer
  is rate-limited (~2 emails/hr free tier) — acceptable for this round; **custom SMTP is a
  pre-launch checklist item**, not this round.
- Auth `site_url` is still the Supabase default — irrelevant to OTP codes (no redirect);
  set it when/if magic links or OAuth arrive.

## Tests

- `test/account.test.js` — full coverage of the pure module: state derivation (incl.
  anonymous flag shapes), view models per state×online, cooldown boundaries, email/code
  validation, payloads, verify-type pivot.
- `test/cloud.test.js` — mock-shaped like `native.test.js`: offline guard short-circuits,
  SDK throw → `{ok:false}`, correct SDK method per state (updateUser vs signInWithOtp),
  upsert called after guest-create and after verify, signOut scope.
- Probes: boot offline + `file://`-style (no fetch) → zero console errors, Account screen
  reachable and shows the offline explainer; sweep gates for `#s-account` at the standard
  viewports (EN + TH).
- i18n auto-usage tests pick up the new keys (both blocks mandatory).

## Rollout

Branch `feat/client-auth` off `development`. Subagent-driven build per house process
(plan doc → tasks → review chain). PR for Jordan's go. SHELL bump at release cut.
`npm i @supabase/supabase-js` (exact-version pin like other deps).

## Explicitly out of scope (next rounds)

Progress/wallet cloud-save + reconcile rules (P3); Google/Apple OAuth; magic links;
display-name editing; custom SMTP; deleting-account flow (PDPA erasure lands with the
data-sync round, where there'd be data worth erasing).
