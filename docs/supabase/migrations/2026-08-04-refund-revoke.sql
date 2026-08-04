-- Migration 2026-08-04 — automatic revocation on a Stripe refund.
--
-- Why: refund.html §4 promises that a refunded purchase is taken back — the
-- Supporter entitlement is withdrawn and the coins it granted are deducted,
-- clamped at zero (we never chase the difference if the buyer already spent
-- them). Until now nothing in this codebase actually did that: a refund
-- issued from the Stripe Dashboard left the ledger, wallet, and entitlements
-- rows untouched, so a refunded buyer kept Supporter forever — including
-- continued access to supporter-download and client restore(). The already
-- emailed six-PDF ZIP is unrecoverable and is accepted as a cost of the
-- policy, same as it is for a legitimate keep-the-goods refund anywhere else.
--
-- revoke_purchase is the atomic mirror of grant_purchase (see
-- 2026-07-12-iap-golive.sql / 2026-07-12b revision in schema.sql for why the
-- three writes must be one transaction): it inserts a NEGATIVE ledger row,
-- decrements the wallet clamped at zero, and deletes the entitlement row —
-- all inside one plpgsql body, so a reader can never observe the ledger debit
-- without the wallet/entitlement side already committed alongside it.
--
-- Idempotency contract — identical shape to grant_purchase:
--   * The ledger insert is the idempotency claim, via the SAME
--     ledger_event_id_uidx unique index grant_purchase relies on. The caller
--     (stripe-webhook) passes p_event_id = `refund:<charge id>` (core.js
--     processStripeRefund), keyed to the Stripe CHARGE id rather than the
--     event id, so a redelivered charge.refunded event for the same charge
--     dedupes here even though Stripe mints a fresh event id per delivery.
--   * ⚠ p_order_id must NOT be the bare original-purchase order id.
--     ledger_order_id_uidx (schema.sql) uniquely indexes order_id too, not
--     just event_id — and the original grant_purchase call already wrote a
--     ledger row with order_id = that same session id. Reusing it bare here
--     would collide on ledger_order_id_uidx, not the intended
--     ledger_event_id_uidx, on the very FIRST refund: the insert would roll
--     back into the unique_violation branch before ever debiting the wallet,
--     and the caller would misread the resulting 'duplicate' as "already
--     revoked" when nothing was ever revoked. stripe-webhook/index.ts passes
--     p_order_id = `refund:<original order id>` — its own uidx slot, still
--     traceable back to the purchase it reverses.
--   * A second call for the same event_id hits unique_violation. It must NOT
--     re-debit the wallet a second time — but it DOES re-run the entitlement
--     delete, mirroring grant_purchase's heal branch: if a prior call's
--     ledger insert committed but the process died before the entitlement
--     delete ran, this heals that partial state instead of leaving a
--     refunded buyer with a live entitlement forever.
--   * foreign_key_violation (deleted account) returns 'unknown-user' —
--     permanent, so the caller acks rather than retries.
--
-- p_entitlement deletion deliberately does NOT filter by entitlements.source.
-- Every Stripe grant made before 2026-08-04 is mislabeled 'revenuecat'
-- (2026-08-04-entitlement-source.sql fixed the bug going forward, not
-- retroactively), so a source filter here would silently fail to revoke any
-- pre-fix Stripe purchase. Filtering is also unnecessary for correctness:
-- stripe-checkout already refuses a purchase when the buyer is already
-- entitled (see stripe-checkout/index.ts's "already-owned" 409), so
-- double-ownership across providers for the same product_id cannot happen —
-- there is only ever one row to delete.
--
-- Apply order: this SQL must be applied BEFORE redeploying stripe-webhook.
--   * Applying this SQL first is safe: the currently-deployed stripe-webhook
--     never calls revoke_purchase (it doesn't know the refund branch
--     exists), so revoke_purchase just sits unused until the webhook code
--     that calls it ships.
--   * Redeploying stripe-webhook before this SQL lands is NOT safe: the new
--     code calls `supabase.rpc("revoke_purchase", …)` on every
--     charge.refunded delivery, and that RPC does not exist yet — every
--     refund event 500s (Stripe retries, then gives up) until the SQL is
--     applied. SQL-first, as with every prior grant_purchase revision.
create or replace function public.revoke_purchase(
  p_user_id uuid, p_delta integer, p_reason text, p_event_id text,
  p_order_id text, p_entitlement text
) returns text language plpgsql as $$
begin
  insert into public.ledger (user_id, delta, reason, event_id, order_id)
  values (p_user_id, -abs(p_delta), p_reason, p_event_id, p_order_id); -- event idempotency + client transaction attribution
  update public.wallet set coins = greatest(0, coins - abs(p_delta))
    where user_id = p_user_id; -- refund policy §4: clamp at zero, never chase the difference
  if p_entitlement is not null then
    delete from public.entitlements
      where user_id = p_user_id and product_id = p_entitlement; -- no source filter — see header comment
  end if;
  return 'revoked';
exception
  when unique_violation then                                   -- event already processed: DO NOT re-debit...
    if p_entitlement is not null then                           -- ...but heal a prior partial (delete is naturally idempotent)
      delete from public.entitlements
        where user_id = p_user_id and product_id = p_entitlement;
    end if;
    return 'duplicate';
  when foreign_key_violation then                                -- deleted account: permanent, ack so Stripe stops retrying
    return 'unknown-user';
end;
$$;

-- Server-authoritative surface only, same rule as grant_purchase: revoke
-- decisions are made entirely by the Stripe webhook (service_role), never by
-- a client. Function creation defaults EXECUTE to PUBLIC, so re-issue the
-- restriction against the full six-type signature.
revoke execute on function public.revoke_purchase(uuid, integer, text, text, text, text) from public, anon, authenticated;
grant execute on function public.revoke_purchase(uuid, integer, text, text, text, text) to service_role;
