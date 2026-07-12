-- Migration 2026-07-12 — ledger event_id (coin-purchase go-live, Phase 1 T2).
--
-- Why: the RevenueCat webhook Edge Function (supabase/functions/rc-webhook)
-- must credit a coin pack EXACTLY ONCE even if RC retries delivery (PRD
-- §7.4). It inserts one ledger row per webhook event carrying RC's event id;
-- a unique index turns a replayed insert into a constraint violation the
-- function detects and treats as "already granted" instead of crediting the
-- wallet twice. Not applied to the live project by this file — it ships as
-- a plain SQL file and is applied at release per the release-cut ritual,
-- same as schema.sql itself.
alter table public.ledger add column if not exists event_id text;

create unique index if not exists ledger_event_id_uidx
  on public.ledger (event_id) where event_id is not null;
