-- Phase 11 — provider webhook events.
--
-- Server-only table. Provides the idempotency key for provider webhooks
-- (ARCHITECTURE.md §6 provider_events, §8 mono/webhook): the unique
-- (provider_id, provider_event_id) constraint is what makes duplicate
-- deliveries safe. The webhook function inserts the row first and only
-- processes when the insert did not conflict.
--
-- There are deliberately NO client policies: with RLS enabled and no policy,
-- PostgREST grants nothing to `anon`/`authenticated`, so this table is
-- reachable only with the service-role key (Edge Functions).

create table public.provider_events (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  provider_event_id text not null,
  event_type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'received'
    check (status in ('received', 'processed', 'failed')),
  payload_hash text not null,
  error_code text,
  user_id uuid references auth.users (id) on delete cascade,
  unique (provider_id, provider_event_id)
);

-- Lookup by user for reauth/account operations driven by webhooks.
create index provider_events_user_idx on public.provider_events (user_id);
-- Support "show me recent failures" without scanning the table.
create index provider_events_status_idx on public.provider_events (status, received_at desc);

-- ================================================================ RLS
alter table public.provider_events enable row level security;

-- Intentionally no policy. See the note above: server-only.
