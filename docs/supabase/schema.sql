-- Lucky Cat HSK — Supabase schema (Monetization & Production PRD §6.2)
--
-- STATUS: P0 draft / indicative. Mirrors today's offline-first localStorage
-- state (the `nbhsk.*` keys) so cloud save is a straight reconcile, not a
-- redesign. Apply to a fresh Supabase project (SQL editor or `supabase db
-- push`). Nothing in the game reads/writes these tables yet — cloud sync is a
-- later P0/P3 slice; this file exists so the backend can be stood up and
-- reviewed independently of client work.
--
-- Design rules carried from the PRD:
--   * Offline-first: the app stays fully playable as a guest with no network.
--     These tables are a *mirror*, reconciled on foreground / sign-in / post-
--     purchase — never the source of truth during play.
--   * Purchased coins + entitlements are SERVER-authoritative: written only by
--     the RevenueCat webhook (service_role), never by the client (§3.1, §7.2).
--   * Earned coins are local-first and reconciled max(local, cloud) within a
--     server-enforced daily anti-cheat cap (§3.3, §6.3) — that clamp lives in
--     an Edge Function / trigger, NOT in the client.
--   * Row-Level Security: a signed-in user can touch only their own rows.
--
-- Local-only keys deliberately NOT synced (device preferences / transient UI
-- state, no cloud value): nbhsk.settings, nbhsk.sfx, nbhsk.scope,
-- nbhsk.scopeView, nbhsk.formatIntros, nbhsk.introDone.

-- ---------------------------------------------------------------------------
-- Helper: keep updated_at fresh on write.
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — 1 row per user. (PRD §6.2)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  locale       text default 'en',          -- mirrors nbhsk.locale ('en' | 'th')
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create or replace trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- progress — mirrors the learning/meta-game localStorage keys. (PRD §6.2)
-- One row per user; each column maps to exactly one nbhsk.* key.
-- ---------------------------------------------------------------------------
create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  mastery    jsonb   not null default '{}'::jsonb,  -- nbhsk.mastery  (per-word streak/mastery)
  xp         integer not null default 0,            -- nbhsk.xp       (growth curve total)
  streak     integer not null default 0,            -- derived from nbhsk.daily (day streak)
  daily      jsonb   not null default '{}'::jsonb,   -- nbhsk.daily    (streak/goal/last-played state)
  quests     jsonb   not null default '{}'::jsonb,   -- nbhsk.quests   (daily quest progress)
  monthly    jsonb   not null default '{}'::jsonb,   -- nbhsk.monthly  (monthly quest counter, retention pack)
  best       jsonb   not null default '{}'::jsonb,   -- nbhsk.best     (best-session scores, keyed object)
  cosmetics  jsonb   not null default '{}'::jsonb,   -- nbhsk.shop     (owned/equipped skins, decos, tiers)
  stickers   jsonb   not null default '{}'::jsonb,   -- nbhsk.stickers (earned sticker album)
  updated_at timestamptz not null default now()
);

create or replace trigger progress_touch before update on public.progress
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- wallet — coin balance + daily anti-cheat accounting. (PRD §3, §6.2)
-- `coins` = spendable balance (mirrors nbhsk.wallet, an integer today).
-- `earned_today` + `earned_today_date` back the server-side daily earn cap;
-- purchased coins bypass the cap: the RevenueCat webhook writes them with the
-- service role, which wallet_guard exempts from the clamp (see below), and
-- records each grant in the ledger.
-- ---------------------------------------------------------------------------
create table if not exists public.wallet (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  coins             integer not null default 0,     -- mirrors nbhsk.wallet
  freezes           integer not null default 0,     -- nbhsk.freezes (paid consumable, cap 2)
  earned_today      integer not null default 0,     -- coins earned since earned_today_date (anti-cheat, §3.3)
  earned_today_date date    not null default current_date,
  updated_at        timestamptz not null default now()
);

create or replace trigger wallet_touch before update on public.wallet
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- entitlements — non-consumable purchases (Supporter, future subs). (PRD §6.2, §7)
-- WRITTEN BY THE REVENUECAT WEBHOOK ONLY (service_role). The client never
-- self-grants — RLS below gives users read-only access to their own rows.
-- ---------------------------------------------------------------------------
create table if not exists public.entitlements (
  user_id    uuid  not null references auth.users (id) on delete cascade,
  product_id text  not null,                    -- e.g. 'supporter'
  source     text  not null default 'revenuecat',
  granted_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ---------------------------------------------------------------------------
-- ledger — append-only audit trail for coin deltas (esp. purchased coins).
-- (PRD §6.2, optional) Purchased-coin rows are service_role only; the trail
-- makes idempotent, once-only coin-pack credits auditable.
-- ---------------------------------------------------------------------------
create table if not exists public.ledger (
  id         bigint generated always as identity primary key,
  user_id    uuid    not null references auth.users (id) on delete cascade,
  delta      integer not null,                 -- +credit / -debit
  reason     text    not null,                 -- 'coins_m', 'supporter_bonus', 'earned_round', ...
  created_at timestamptz not null default now()
);

create index if not exists ledger_user_idx on public.ledger (user_id, created_at desc);

-- ===========================================================================
-- Row-Level Security — users see/modify only their own rows.
-- service_role (used by the RevenueCat webhook Edge Function) BYPASSES RLS,
-- so no explicit service policies are needed for the server-authoritative
-- writes; the client-facing policies below intentionally omit those paths.
-- ===========================================================================
alter table public.profiles     enable row level security;
alter table public.progress     enable row level security;
alter table public.wallet       enable row level security;
alter table public.entitlements enable row level security;
alter table public.ledger       enable row level security;

-- profiles: full self access.
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- progress: full self access (local-first gameplay reconciles its own row).
drop policy if exists progress_self on public.progress;
create policy progress_self on public.progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- wallet: user may read + reconcile EARNED coins on their own row. The daily
-- cap and purchased-coin authority are enforced server-side (Edge Function /
-- trigger); this policy is the client surface for local-first earned balance.
drop policy if exists wallet_self on public.wallet;
create policy wallet_self on public.wallet
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- entitlements: READ-ONLY for the owner. No client insert/update/delete —
-- only the webhook (service_role) writes here. (§7.2)
drop policy if exists entitlements_read_self on public.entitlements;
create policy entitlements_read_self on public.entitlements
  for select using (auth.uid() = user_id);

-- ledger: READ-ONLY for the owner; writes are service_role only.
drop policy if exists ledger_read_self on public.ledger;
create policy ledger_read_self on public.ledger
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Revision 2026-07-10 (cloud-save round, design doc §1). Idempotent ALTERs
-- for projects created from the original file, plus the anti-cheat guard.
-- ---------------------------------------------------------------------------
alter table public.progress add column if not exists monthly jsonb not null default '{}'::jsonb;
alter table public.wallet   add column if not exists freezes integer not null default 0;
alter table public.progress alter column best set default '{}'::jsonb;
update public.progress set best = '{}'::jsonb where best = '[]'::jsonb;

-- wallet_guard — PRD §3.3 server-side anti-cheat clamp.
--  * Service-role writers are EXEMPT (revision 2026-07-12): purchased coins
--    are granted by the RevenueCat webhook with the service key, and a paid
--    pack must never be eaten by the earn clamp. Clients can't reach this
--    path — RLS keys them to anon/authenticated JWTs.
--  * Only positive coin deltas count as earnings; spending is never penalized.
--  * UPDATE allowance = 25000/day × days since the row was last written
--    (edge-based sync legitimately delivers several offline days at once).
--  * INSERT (first-ever sync: account age proves nothing about a long-time
--    offline player) clamps coins to a lifetime-plausible 100000.
--  * freezes clamped 0–2 on both paths.
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

drop trigger if exists wallet_guard on public.wallet;
create trigger wallet_guard before insert or update on public.wallet
  for each row execute function public.wallet_guard();

-- ---------------------------------------------------------------------------
-- Revision 2026-07-12 (coin-purchase go-live, Phase 1 T2). Three changes, see
-- docs/supabase/migrations/2026-07-12-iap-golive.sql:
--  * ledger.event_id (below) makes the RevenueCat webhook's ledger insert
--    idempotent: a replayed delivery for the same RC event hits the unique
--    index instead of crediting the wallet twice.
--  * wallet_guard (edited in place above) now exempts service-role writers,
--    so the webhook's paid-coin grants bypass the daily earn clamp.
--  * increment_wallet (below) gives the webhook an atomic coin credit.
-- ---------------------------------------------------------------------------
alter table public.ledger add column if not exists event_id text;

create unique index if not exists ledger_event_id_uidx
  on public.ledger (event_id) where event_id is not null;

-- increment_wallet — atomic coin credit for the webhook. A read-then-upsert
-- in the Edge Function is a race window (two writers could both read the
-- same balance and one increment would be lost); INSERT ... ON CONFLICT DO
-- UPDATE takes the row lock and adds in place — no prior read. The insert
-- branch only needs (user_id, coins): every other wallet column is NOT NULL
-- WITH A DEFAULT. Called via PostgREST rpc() with the service key, so
-- wallet_guard's service-role exemption applies to the write.
create or replace function public.increment_wallet(p_user_id uuid, p_delta integer)
returns void language sql as $$
  insert into public.wallet (user_id, coins)
  values (p_user_id, p_delta)
  on conflict (user_id) do update set coins = wallet.coins + excluded.coins;
$$;

-- Server-authoritative surface only: clients never write purchased coins
-- (header rule), so client roles may not call this at all.
revoke execute on function public.increment_wallet(uuid, integer) from public, anon, authenticated;
