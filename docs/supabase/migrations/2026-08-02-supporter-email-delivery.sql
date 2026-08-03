-- Migration 2026-08-02 — automatic Supporter gift email delivery.
--
-- Purchase grants remain authoritative in grant_purchase. The Stripe and
-- RevenueCat webhooks call claim_supporter_delivery after a confirmed
-- Supporter grant, send through Resend, then call finish_supporter_delivery.
-- The order-id primary key is the permanent idempotency record; Resend also
-- receives the same order-derived Idempotency-Key for transport-level retries.

create table if not exists public.supporter_deliveries (
  order_id             text primary key,
  user_id              uuid not null references auth.users (id) on delete cascade,
  status               text not null default 'pending'
                       check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts             integer not null default 0 check (attempts >= 0),
  provider_message_id  text,
  last_error           text,
  last_attempt_at      timestamptz,
  sent_at              timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists supporter_deliveries_user_idx
  on public.supporter_deliveries (user_id, created_at desc);

alter table public.supporter_deliveries enable row level security;
revoke all on table public.supporter_deliveries from anon, authenticated;
grant select, insert, update on table public.supporter_deliveries to service_role;

-- Private, service-only source for the ZIP. No storage.objects policy is
-- created: buyers receive the file as an email attachment, while the webhook
-- creates a ten-minute signed URL solely for Resend to fetch during the send.
insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
) values (
  'supporter-assets',
  'supporter-assets',
  false,
  26214400,
  array['application/zip', 'application/x-zip-compressed']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Atomically create/claim the permanent delivery record. A second concurrent
-- webhook sees 'sending' and returns a retryable failure. If an invocation
-- dies while owning the row, it becomes reclaimable after ten minutes.
create or replace function public.claim_supporter_delivery(
  p_user_id uuid,
  p_order_id text
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  if p_user_id is null or nullif(trim(p_order_id), '') is null then
    return 'invalid';
  end if;

  insert into public.supporter_deliveries (order_id, user_id)
  values (p_order_id, p_user_id)
  on conflict (order_id) do nothing;

  update public.supporter_deliveries
  set status = 'sending',
      attempts = attempts + 1,
      last_attempt_at = now(),
      updated_at = now(),
      last_error = null
  where order_id = p_order_id
    and user_id = p_user_id
    and (
      status in ('pending', 'failed')
      or (status = 'sending' and last_attempt_at < now() - interval '10 minutes')
    )
  returning 'claimed' into v_status;

  if v_status = 'claimed' then return v_status; end if;

  select status into v_status
  from public.supporter_deliveries
  where order_id = p_order_id and user_id = p_user_id;

  return coalesce(v_status, 'invalid');
end;
$$;

-- Record either a successful provider message id or the retryable failure.
-- Only the invocation holding status='sending' may finish the row.
create or replace function public.finish_supporter_delivery(
  p_order_id text,
  p_provider_message_id text,
  p_error text
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  update public.supporter_deliveries
  set status = case
        when nullif(trim(p_provider_message_id), '') is not null then 'sent'
        else 'failed'
      end,
      provider_message_id = nullif(trim(p_provider_message_id), ''),
      last_error = case
        when nullif(trim(p_provider_message_id), '') is not null then null
        else left(coalesce(p_error, 'unknown'), 500)
      end,
      sent_at = case
        when nullif(trim(p_provider_message_id), '') is not null then now()
        else null
      end,
      updated_at = now()
  where order_id = p_order_id and status = 'sending'
  returning status into v_status;

  return coalesce(v_status, 'invalid');
end;
$$;

revoke execute on function public.claim_supporter_delivery(uuid, text)
  from public, anon, authenticated;
grant execute on function public.claim_supporter_delivery(uuid, text)
  to service_role;

revoke execute on function public.finish_supporter_delivery(text, text, text)
  from public, anon, authenticated;
grant execute on function public.finish_supporter_delivery(text, text, text)
  to service_role;
