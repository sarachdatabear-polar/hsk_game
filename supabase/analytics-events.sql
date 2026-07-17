-- supabase/analytics-events.sql
-- DRAFT — DO NOT APPLY until the R3 owner gate is complete:
--   privacy-policy §2e text approved, store Data Safety answers filled,
--   PDPA/GDPR reviewer sign-off. The shipped Settings toggle goes LIVE the
--   instant this table exists — that existence is the real kill-switch.
-- Apply via the Supabase SQL editor (this repo has no migrations runner).
-- Verify no existing `events` table conflicts before running.

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

-- Client is write-only: anon may INSERT, and there is deliberately NO SELECT
-- policy (matches the transport's `Prefer: return=minimal`).
create policy "anon insert events" on public.events
  for insert to anon with check (true);
