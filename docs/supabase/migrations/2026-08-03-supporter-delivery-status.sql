-- 2026-08-03: delivery truth. The Resend webhook (resend-webhook function)
-- moves rows past 'sent': email.delivered -> 'delivered' (terminal),
-- email.bounced/email.failed -> 'failed' (re-claimable by
-- claim_supporter_delivery, unchanged). Additive + idempotent.
alter table public.supporter_deliveries
  drop constraint if exists supporter_deliveries_status_check;
alter table public.supporter_deliveries
  add constraint supporter_deliveries_status_check
  check (status in ('pending', 'sending', 'sent', 'failed', 'delivered'));
