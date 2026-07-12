-- Migration 2026-07-12 — IAP go-live (coin-purchase round, Phase 1 T2).
-- Three changes, all serving the RevenueCat webhook Edge Function
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

-- 3. grant_purchase — ONE atomic write for the whole grant (I1 fix).
--
-- Superseded design (never shipped live — this whole migration is still
-- unapplied at the time of this revision): a plain increment_wallet SQL
-- function paired with the webhook doing the ledger insert and the wallet
-- increment as two SEPARATE awaits. That left a window where the ledger row
-- was COMMITTED (visible to readers) but the wallet increment was NOT YET
-- applied. A client reconcile reading the ledger in that window sees a
-- coin-pack delta it hasn't folded into its local total, credits itself, and
-- advances its cursor PAST the row — so when the wallet increment lands a
-- moment later, the max(local, cloud) fold on the next reconcile
-- double-counts it, permanently (the cursor already moved past the row, so
-- nothing re-triggers the credit).
--
-- Fix: grant_purchase does the ledger insert, the wallet increment, and the
-- entitlement upsert inside ONE plpgsql function body, which Postgres runs
-- as a single implicit transaction — either all three writes commit, or
-- none do. A ledger row can never be visible without its wallet increment
-- already committed alongside it, which is exactly what makes the client's
-- ledger-cursor reconcile safe to trust.
--
-- event_id carries the idempotency key: the ledger insert is the one step
-- that can conflict (ledger_event_id_uidx, above), so it doubles as the
-- "claim this event" step — if it succeeds, the other two writes are
-- guaranteed to commit in the same transaction. A unique_violation there
-- means the event was already granted (don't re-credit, but heal a prior
-- partial entitlement write — entitlements is PK-idempotent so this is
-- always safe to retry). A foreign_key_violation means the user row is
-- gone (deleted account) — permanent, so the webhook should ack, not retry.
--
-- drop is defensive: this migration was never applied live, so no database
-- actually has increment_wallet, but the drop keeps this file safe to run
-- against any environment that experimented with the superseded design.
drop function if exists public.increment_wallet(uuid, integer);

create or replace function public.grant_purchase(
  p_user_id uuid, p_delta integer, p_reason text, p_event_id text, p_entitlement text
) returns text language plpgsql as $$
begin
  insert into public.ledger (user_id, delta, reason, event_id)
  values (p_user_id, p_delta, p_reason, p_event_id);        -- claims the event; unique event_id = idempotency key
  insert into public.wallet (user_id, coins) values (p_user_id, p_delta)
    on conflict (user_id) do update set coins = wallet.coins + excluded.coins;
  if p_entitlement is not null then
    insert into public.entitlements (user_id, product_id) values (p_user_id, p_entitlement)
      on conflict (user_id, product_id) do nothing;
  end if;
  return 'granted';
exception
  when unique_violation then                                 -- event already processed: DO NOT re-credit...
    if p_entitlement is not null then                        -- ...but heal a prior partial (entitlement is PK-idempotent)
      insert into public.entitlements (user_id, product_id) values (p_user_id, p_entitlement)
        on conflict (user_id, product_id) do nothing;
    end if;
    return 'duplicate';
  when foreign_key_violation then                            -- deleted account: permanent, ack so RC stops retrying
    return 'unknown-user';
end;
$$;

-- Server-authoritative surface only: clients never write purchased coins
-- (schema header rule), so client roles may not call this at all.
revoke execute on function public.grant_purchase(uuid, integer, text, text, text) from public, anon, authenticated;
