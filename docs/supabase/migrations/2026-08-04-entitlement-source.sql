-- Migration 2026-08-04 — entitlements.source now reflects the real grantor.
--
-- Bug (audit finding): grant_purchase (2026-07-12-iap-golive.sql) never sets
-- entitlements.source, so every grant — RevenueCat AND Stripe alike — lands
-- with the column's table-level default, 'revenuecat' (schema.sql:100). That
-- silently mislabels every Stripe-web Supporter purchase since the Stripe
-- webhook went live (2026-07-31-stripe-promptpay-web-billing.md).
--
-- Fix: add a trailing p_source parameter, default 'revenuecat', and pass it
-- into BOTH places the function writes an entitlements row — the happy-path
-- insert and the unique_violation heal (a retried/replayed event that
-- already claimed its ledger row but died before the entitlement upsert
-- committed). Everything else about the function — the ledger insert, the
-- wallet upsert, the atomicity/idempotency contract, the foreign_key_violation
-- branch — is unchanged; see 2026-07-12-iap-golive.sql for that design.
--
-- Both entitlement inserts keep `on conflict (user_id, product_id) do
-- nothing`: source is first-writer-wins, same as every other column on that
-- row. A heal after a partial write never had a differing source to begin
-- with (it's the same event replaying), and deliberately not switching to
-- `do update` means a later duplicate delivery can never rewrite an existing
-- row's source out from under it.
--
-- Default keeps this order-independent for callers, NOT for apply-vs-deploy
-- ordering:
--   * Applying this SQL before redeploying the webhooks is safe — an
--     un-redeployed webhook's RPC call omits p_source (it doesn't know the
--     parameter exists), Postgres fills the default, and behavior is
--     byte-identical to today (Stripe grants still land as 'revenuecat'
--     until that webhook redeploys — no worse than the bug being fixed).
--   * Redeploying a webhook before this SQL lands is NOT safe: the redeployed
--     webhook would pass p_source to a function that doesn't accept a 7th
--     argument and every grant_purchase call fails until the SQL is applied.
--   Apply order: this SQL first, then redeploy stripe-webhook/rc-webhook.
--
-- Postgres identifies a function by (name, argument TYPES) — adding a
-- parameter is a different signature, not a like-for-like replace, so
-- `create or replace` alone would leave the OLD 6-arg function sitting
-- alongside the new 7-arg one. That is NOT a safe fallback: a named-argument
-- RPC call carrying the 6 original arg names would then match BOTH the exact
-- 6-arg function and the 7-arg function via its trailing default, which
-- Postgres reports as "function ... is not unique" (a hard error — not the
-- old function winning some implicit arity tiebreak). So drop the old
-- signature explicitly first, same pattern 2026-07-12-iap-golive.sql used
-- to retire the superseded 5-arg grant_purchase.
drop function if exists public.grant_purchase(uuid, integer, text, text, text, text);

-- grant_purchase — atomic ledger + wallet + entitlement write for the
-- webhooks. See 2026-07-12-iap-golive.sql (Revision 2026-07-12b) for why
-- atomicity matters (the I1 race) and how event_id doubles as the claim step.
create or replace function public.grant_purchase(
  p_user_id uuid, p_delta integer, p_reason text, p_event_id text,
  p_order_id text, p_entitlement text, p_source text default 'revenuecat'
) returns text language plpgsql as $$
begin
  insert into public.ledger (user_id, delta, reason, event_id, order_id)
  values (p_user_id, p_delta, p_reason, p_event_id, p_order_id); -- event idempotency + client transaction attribution
  insert into public.wallet (user_id, coins) values (p_user_id, p_delta)
    on conflict (user_id) do update set coins = wallet.coins + excluded.coins;
  if p_entitlement is not null then
    insert into public.entitlements (user_id, product_id, source)
      values (p_user_id, p_entitlement, coalesce(p_source, 'revenuecat'))
      on conflict (user_id, product_id) do nothing;
  end if;
  return 'granted';
exception
  when unique_violation then                                 -- event already processed: DO NOT re-credit...
    if p_entitlement is not null then                        -- ...but heal a prior partial (entitlement is PK-idempotent)
      insert into public.entitlements (user_id, product_id, source)
        values (p_user_id, p_entitlement, coalesce(p_source, 'revenuecat'))
        on conflict (user_id, product_id) do nothing;
    end if;
    return 'duplicate';
  when foreign_key_violation then                            -- deleted account: permanent, ack so RC stops retrying
    return 'unknown-user';
end;
$$;

-- Dropping recreated a new function object, which resets privileges to the
-- Postgres default (EXECUTE to PUBLIC) — re-issue the server-authoritative
-- surface rule against the new seven-type signature.
revoke execute on function public.grant_purchase(uuid, integer, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.grant_purchase(uuid, integer, text, text, text, text, text) to service_role;
