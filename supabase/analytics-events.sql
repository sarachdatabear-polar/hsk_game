-- supabase/analytics-events.sql
-- DRAFT — DO NOT APPLY until the R3 owner gate is complete:
--   privacy-policy §2e text approved, store Data Safety answers filled,
--   PDPA/GDPR reviewer sign-off. The shipped Settings toggle goes LIVE the
--   instant this table exists — that existence is the real kill-switch.
-- Apply via the Supabase SQL editor (this repo has no migrations runner).
-- Verify no existing `events` table conflicts before running.
--
-- Size-capped anon insert (2026-08-04 audit hardening). The anon key is
-- public, so anyone holding it can call this policy directly — bypassing the
-- client's PROP_ALLOWLIST (src/analytics/events.js) entirely and posting
-- arbitrary jsonb. The WITH CHECK below caps every column the client
-- actually writes, sized off real usage: PROP_ALLOWLIST's widest event (3
-- keys) serializes to well under 200 bytes, and name/level_scope/
-- app_version/platform are all short enums or slugs (see the policy's own
-- comments for exact sources). This is a SIZE cap only, not a RATE limit —
-- an RLS WITH CHECK has no notion of "per key per minute." Real rate
-- limiting is deferred; until it exists, growth of this table must be
-- watched via the R3 owner gate above plus Supabase's free-tier usage
-- dashboard/alerts.

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
--
-- WITH CHECK caps are a size bound, not a shape/allowlist validator — the
-- client-side PROP_ALLOWLIST already does key filtering; this is defense in
-- depth against a direct anon-key caller who skips the client entirely.
create policy "anon insert events" on public.events
  for insert to anon with check (
    -- name is one of EVENT_NAMES (src/analytics/events.js); longest today is
    -- 25 chars ("street_decorate_complete"). 40 leaves headroom for growth.
    length(name) <= 40
    -- scopeKey() output (src/pool.js), e.g. "HSK1+2+3+4+5+6·HY·NEW·top500"
    -- (~29 chars).
    and (level_scope is null or length(level_scope) <= 64)
    -- package.json semver, injected at build time (scripts/build.mjs).
    and (app_version is null or length(app_version) <= 32)
    -- "web" | "android" today (src/analytics/index.js's platform detect).
    and (platform is null or length(platform) <= 16)
    -- PROP_ALLOWLIST values are short strings/booleans/numbers; the widest
    -- allowlisted event (3 keys, e.g. street_open, cat_journey_viewed)
    -- serializes to well under 200 bytes. 2048 gives ~10x headroom for
    -- future allowlisted props while still bounding the worst case a raw
    -- anon-key caller can stuff into one row. NOTE: pg_column_size reports
    -- STORED (TOAST/compressed) size, not JSON text length, so this is a
    -- coarse defense-in-depth bound, not an exact logical-size limit —
    -- acceptable paired with the deferred-rate-limiting note above.
    and (props is null or pg_column_size(props) <= 2048)
  );
