# Analytics dark transport — design (roadmap R3)

_Author: Claude (Opus), 2026-07-16. Design for the **dark, provider-agnostic analytics
transport layer** selected by the owner from the R3 provider recommendation
(`2026-07-16-analytics-provider-recommendation.md`). Provider = **Supabase-native**.
This spec covers the code that ships **dark** — it emits nothing until the consent flag is
on AND the owner completes the R3 gate (events table, privacy §2e text, Data Safety
answers, PDPA sign-off)._

## Owner decisions captured (2026-07-16)

- **Provider:** Supabase-native event logging (raw fetch → PostgREST), the recommended default.
- **Scope:** build the dark transport layer — event contract + consent gate + offline queue +
  Supabase transport, unit-tested, default-off.
- **Consent gate:** plumbing + a **Settings toggle** (default OFF). **No first-run consent
  card** this session — that user-facing legal surface (privacy §2e text, Data Safety) is a
  later owner-gated pass.
- **Event wiring:** wire **session lifecycle only** now (`session_start` / `session_complete`)
  as the integration proof; the purchase funnel, SRS (`review_recovery` / `delayed_recall`),
  and `notif_permission` call-sites are a tracked follow-up.

## The dark guarantee — what makes "dark" enforceable

Two independent gates, either of which alone keeps the pipeline dark:

1. **Consent flag** `nbhsk.analyticsEnabled`, **default `false`**. `track()` is a hard no-op
   and no transport, `anon_id`, or network initializes until it is `true`. Zero emission for
   offline guests (privacy policy §2a).
2. **The events table's existence is the real kill-switch.** The shipped Settings toggle goes
   live the instant a `events` table exists in Supabase. Therefore:

   > **INVARIANT:** The owner MUST NOT create the `events` table until privacy §2e text +
   > store Data Safety answers + PDPA/GDPR sign-off are complete. Until then, even a user who
   > flips the toggle emits nothing (inserts 404 and are silently dropped/queued).

This merge lands on `development` and is dark by construction (no table yet). The
`development → main` release that exposes the toggle to real users is itself R3-gated.

## Architecture

New pure-module cluster `src/analytics/`, matching the `cloud.js` / `sync.js` house contract:
**never throws, offline-guarded, injectable `{get,set}` store, `nbhsk.*` namespaced, pure and
unit-tested by dependency injection.** `main.js` owns all impure wiring (store, fetch, event
call-sites).

| Module | Responsibility |
|---|---|
| `src/analytics/events.js` | Event contract. Name enum + a per-event **prop allowlist**. `makeEvent(name, ctx)` returns a validated PII-free record, dropping any non-allowlisted prop key. Never emits hanzi/word content, display name, or auth id. |
| `src/analytics/identity.js` | `getAnonId(store, gen)` — reuse `nbhsk.analyticsAnonId` or create a **random UUID on first call after consent** (never a device/ad id). `newSessionId(gen)` — per app-open. UUID generator **injected** with a non-crypto fallback (`crypto.randomUUID` is undefined on `file://`). |
| `src/analytics/consent.js` | `isEnabled(store)` → `nbhsk.analyticsEnabled` (default `false`). `setEnabled(store, on)` — writes the flag; on **disable, clears the queue and `anon_id`** (revocation). |
| `src/analytics/queue.js` | localStorage offline queue `nbhsk.analyticsQueue`. `enqueue` (bounded cap, drop-oldest on overflow), `drain` (return + clear), `clear`. |
| `src/analytics/transport.js` | `send(events, {url, key, fetchImpl})` — POST batch array to `${url}/rest/v1/events`. Headers: `apikey: <anon>`, `Authorization: Bearer <anon>`, `Content-Type: application/json`, **`Prefer: return=minimal`**. Never throws → `{ok, status}`. |
| `src/analytics/index.js` | Factory `createAnalytics({store, fetchImpl, now, gen, isOnline, isNative, config})` → `{ track, flush, setConsent, isEnabled }`. |

### `index.js` behavior

- `track(name, props)` — **no-op unless `isEnabled`**. Otherwise: ensure `anon_id` + `session_id`,
  `makeEvent(...)`, `enqueue`. If `isOnline()`, attempt `flush()`.
- `flush()` — if `isEnabled` and `isOnline()`: `drain` the queue, `transport.send`. On failure,
  **re-enqueue** the drained batch (best-effort, bounded by cap). No-op otherwise.
- `setConsent(on)` — `consent.setEnabled`; on `false` also clears queue + `anon_id`.

### Why raw fetch, not the existing `supabase-js` client (`src/cloud.js`)

1. **De-identification.** `supabase-js` auto-attaches the signed-in user's JWT, which would tie
   analytics events to the auth user server-side. Raw fetch with only the anon publishable key
   keeps events de-identified even for signed-in players (the contract's intent).
2. **Role-uniformity.** With `anon INSERT only` RLS, every analytics insert runs as the `anon`
   role regardless of sign-in state, so a single RLS policy applies uniformly. An authenticated
   request would run as `authenticated` and need a second grant.

`Prefer: return=minimal` is **required, not cosmetic**: under `no SELECT` RLS a default
PostgREST insert tries to return the inserted row (needs SELECT) and fails. Enforced by a
transport unit test (header is sent) and re-checked on the device smoke (RLS actually accepts).

## Event contract (from the R3 doc, formalized)

```
event {
  name         // enum
  ts           // client ISO8601 (server also stamps received_at)
  anon_id      // random UUID per install, created ONLY after consent
  session_id   // per app-open
  level_scope? // e.g. "HSK3" — never per-word content
  props?       // bounded, enumerated keys only
  app_version  // injected at build time (see below)
  platform     // "web" | "android" (from native.isNative())
}
```

Names (this session wires the first two): `session_start`, `session_complete` (+duration
bucket) — then follow-up: `review_recovery`, `delayed_recall`, `notif_permission`
(granted/denied/dismissed), purchase funnel (`store_open`, `product_view`, `purchase_start`,
`purchase_success`, `purchase_fail`). D1/D7 return is derived **server-side** from `anon_id`
first-seen, never a client flag.

## Wiring in `main.js` (this session: session lifecycle only)

- Construct one `createAnalytics(...)` instance at boot, after the `store` helper
  (`main.js:83`), injecting: the inline `store`, `globalThis.fetch`, `now = () => new Date()`,
  a UUID `gen`, `isOnline = () => navigator.onLine !== false`, `isNative` from `native.js`, and
  `config = { url: SUPABASE_URL, key: SUPABASE_KEY }` from `src/cloud-config.js`.
- `track("session_start")` at boot; `track("session_complete", { duration_bucket })` on the
  existing hide/`pushEdge("hide")` path (`main.js:1726`).
- `flush()` from the existing online-edge handler (`main.js:1730`) and `syncEdge`
  (`main.js:714`).
- **Settings toggle** (default OFF) calling `setConsent(on)`; strings added to **en + th** in
  `src/i18n.js` (there is no `zh` table). Placed in the existing settings/account surface.

All the above lands in `main.js`, which is untested-by-design; the module cluster carries the
test coverage.

## `app_version` source

No runtime version constant exists today (`package.json` `version` = `0.2.0` is not injected).
Add an esbuild `--define:__APP_VERSION__` sourced from `package.json` to the `build` script;
code reads it with a fallback: `typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev"`.

## Supabase `events` table — DRAFT DDL (owner applies)

Shipped as `supabase/analytics-events.sql`, **not** auto-run (the repo has no migrations dir;
existing tables were applied out-of-band via the SQL editor). The owner applies it **only after**
the privacy/Data-Safety/PDPA gate is complete (see the invariant above). Shape:

```sql
create table if not exists public.events (
  id           bigint generated always as identity primary key,
  received_at  timestamptz not null default now(),
  name         text not null,
  ts           timestamptz,
  anon_id      uuid not null,
  session_id   uuid,
  level_scope  text,
  props        jsonb,
  app_version  text,
  platform     text
);
alter table public.events enable row level security;
-- anon may INSERT only; NO select policy (write-only from the client).
create policy "anon insert events" on public.events
  for insert to anon with check (true);
```

Owner verifies no existing `events` table conflicts before applying.

## Testing (vitest, DI style — matches `sync.test.js`)

- `events.js` — valid names pass; unknown name rejected; non-allowlisted prop keys stripped; no
  PII fields leak.
- `identity.js` — `anon_id` created once and reused; distinct `session_id`s; injected `gen`
  fallback works (no `crypto`).
- `consent.js` — default false; enable/disable; **disable clears queue + anon_id**.
- `queue.js` — enqueue/drain round-trip; cap overflow drops oldest.
- `transport.js` — POSTs to `/rest/v1/events` with `apikey` + **`Prefer: return=minimal`**;
  never throws on an injected failing/throwing `fetch`.
- `index.js` — `track` is a no-op when consent off (no queue write, no fetch); when on, enqueues
  and flushes; `flush` re-enqueues on transport failure; `setConsent(false)` clears the queue.

`main.js` wiring is untested by design.

## Validation still needed before go-live (not this session — owner/device)

- Device smoke: transport actually inserts inside the Capacitor Android WebView, and RLS accepts
  the anon insert with `Prefer: return=minimal`.
- `file://` smoke: events buffer in the queue and flush correctly once online + consented.
- Owner gate: create `events` table, approve privacy §2e text, fill Data Safety answers, PDPA/
  GDPR sign-off.

## Out of scope (tracked follow-ups)

- First-run consent card (the AdMob/§2d surface does not exist yet — greenfield, owner-gated text).
- Wiring `review_recovery`, `delayed_recall`, `notif_permission`, and the purchase funnel.
- Server-side D1/D7 + funnel SQL (the "dashboard" until volume justifies a BI tool).

## Deploy note

Adds a user-visible Settings toggle → a `development → main` release would warrant a `sw.js`
`SHELL` bump. This merge targets `development` only; the SHELL bump is deferred to that
(R3-gated) release, consistent with prior dark-feature merges.
