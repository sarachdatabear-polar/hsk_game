-- Migration 2026-07-12 — IAP go-live (coin-purchase round, Phase 1 T2).
-- Two changes, both serving the RevenueCat webhook Edge Function
-- (supabase/functions/rc-webhook). Not applied to the live project by this
-- file — it ships as a plain SQL file and is applied at release per the
-- release-cut ritual, same as schema.sql itself.

-- 1. ledger.event_id — webhook idempotency.
--
-- Why: the webhook must credit a coin pack EXACTLY ONCE even if RC retries
-- delivery (PRD §7.4). It inserts one ledger row per webhook event carrying
-- RC's event id; a unique index turns a replayed insert into a constraint
-- violation the function detects and treats as "already granted" instead of
-- crediting the wallet twice.
alter table public.ledger add column if not exists event_id text;

create unique index if not exists ledger_event_id_uidx
  on public.ledger (event_id) where event_id is not null;

-- 2. wallet_guard — exempt service-role purchase grants from the earn clamp.
--
-- Why: the guard treated ANY positive coin delta as earnings and clamped it
-- to the 25,000/day allowance — including the webhook's wallet increment for
-- a PAID coin pack. A user near the daily cap who bought a pack could have
-- the credit silently eaten. The schema's stated rule is "purchased coins
-- bypass the cap and arrive via the ledger (service_role)"; this makes the
-- mechanism real: when the writer is the service role (the webhook — the
-- only service-role wallet writer), the guard returns NEW untouched. Every
-- other writer (anon/authenticated clients syncing earned coins) hits the
-- clamp logic below, byte-identical to before.
create or replace function public.wallet_guard()
returns trigger language plpgsql as $$
declare
  earn_cap       constant integer := 25000;
  first_sync_cap constant integer := 100000;
  allowance integer;
  delta     integer;
  days      integer;
begin
  -- Server-authoritative purchase grants bypass the earn clamp. auth.role()
  -- reads the request JWT's role claim (same auth.* helper family the RLS
  -- policies use): 'service_role' only for service-key requests — clients
  -- get 'anon'/'authenticated' and clamp as before. (Direct psql/SQL-editor
  -- sessions have no JWT: auth.role() is null there, so the clamp applies.)
  if auth.role() = 'service_role' then
    return new;
  end if;
  new.freezes := least(greatest(coalesce(new.freezes, 0), 0), 2);
  new.coins   := greatest(coalesce(new.coins, 0), 0);
  if tg_op = 'INSERT' then
    new.coins := least(new.coins, first_sync_cap);
    new.earned_today := 0;
    new.earned_today_date := current_date;
    return new;
  end if;
  if old.earned_today_date < current_date then
    new.earned_today := 0;
  else
    new.earned_today := old.earned_today;
  end if;
  new.earned_today_date := current_date;
  delta := new.coins - old.coins;
  if delta > 0 then
    days := greatest(1, current_date - old.updated_at::date);
    allowance := greatest(earn_cap * days - new.earned_today, 0);
    if delta > allowance then
      delta := allowance;
      new.coins := old.coins + delta;
    end if;
    new.earned_today := new.earned_today + delta;
  end if;
  return new;
end;
$$;
