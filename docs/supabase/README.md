# Supabase backend (P0 draft)

Cloud backend for Lucky Cat HSK, per the Monetization & Production PRD §6.
**Nothing in the shipped game reads or writes this yet** — this directory lets
the backend be stood up and reviewed independently of client work.

## Files

- **`schema.sql`** — tables (`profiles`, `progress`, `wallet`, `entitlements`,
  `ledger`), the `updated_at` trigger, and Row-Level Security policies. Each
  column is commented with the `nbhsk.*` localStorage key it mirrors.

## Apply to a project

1. Create a Supabase project (note its region — used in the privacy policy).
2. Run the schema:
   - **SQL editor:** paste `schema.sql` and run, **or**
   - **CLI:** `supabase db push` (or `psql "$DATABASE_URL" -f schema.sql`).
3. Enable the auth providers the PRD calls for: anonymous (guest), Google,
   Apple, email magic-link (§6.1).

## Design guardrails (do not violate)

- **Offline-first:** the app must stay fully playable as a guest with no
  network. These tables are a *mirror*, reconciled on foreground / sign-in /
  post-purchase — never the source of truth during play.
- **Server-authoritative money:** purchased coins and entitlements are written
  **only** by the RevenueCat webhook (service_role) — never the client. RLS
  gives users read-only access to `entitlements`/`ledger`.
- **Anti-cheat cap is server-side:** the daily earned-coin clamp
  (`wallet.earned_today`) is enforced by an Edge Function / trigger, not the
  client. A client-side clamp would stop no one (localStorage is editable) and
  is intentionally omitted.

## Not synced (local-only)

Device preferences and transient UI state stay on-device and are absent from the
schema by design: `nbhsk.settings`, `nbhsk.sfx`, `nbhsk.scope`,
`nbhsk.scopeView`, `nbhsk.formatIntros`, `nbhsk.introDone`.

## Next (later slices, not this one)

RevenueCat webhook → Edge Function that writes `entitlements`/`ledger`; the
reconcile logic on the client; and the earned-coin clamp trigger. See PRD §6–§7.
