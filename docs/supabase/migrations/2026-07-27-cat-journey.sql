-- Cat Journey full-product cloud field.
-- Additive and idempotent: old clients ignore the column; the new client keeps
-- CAT_JOURNEY_CLOUD_ENABLED=false until this has been applied successfully.

begin;

alter table public.progress
  add column if not exists cat_journey jsonb not null default '{}'::jsonb;

comment on column public.progress.cat_journey is
  'Additively merged nbhsk.catJourney v2 state: goal history, bond acknowledgement, background preference, and permanent claims.';

commit;
