-- Reconcile core demo — Slice 1 foundation.
-- Tables per ARCHITECTURE.md §6 with RLS (user_id = auth.uid()),
-- immutability for transaction facts, and canonical category seeds.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- users
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  country_code char(2) not null default 'NG',
  default_currency char(3) not null default 'NGN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------- bank_connections
create table public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  provider_id text not null,
  provider_customer_id text,
  provider_connection_id text not null,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'reauth_required', 'error', 'revoked')),
  consented_at timestamptz,
  consent_expires_at timestamptz,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, provider_connection_id)
);
create index bank_connections_user_id_idx on public.bank_connections (user_id);

-- ------------------------------------------------------- bank_accounts
create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  bank_connection_id uuid not null references public.bank_connections (id) on delete cascade,
  provider_id text not null,
  provider_account_id text not null,
  institution_id text,
  institution_name text,
  display_name text,
  masked_account_number text,
  currency char(3) not null default 'NGN',
  current_balance_minor bigint not null default 0,
  available_balance_minor bigint not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, provider_account_id)
);
create index bank_accounts_user_id_idx on public.bank_accounts (user_id);
create index bank_accounts_connection_id_idx on public.bank_accounts (bank_connection_id);

-- ---------------------------------------------------------- transactions
-- Immutable authoritative ledger. Clients have SELECT only; all writes are
-- server-side (Edge Functions with the service-role key).
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  bank_account_id uuid not null references public.bank_accounts (id) on delete cascade,
  provider_id text not null,
  provider_transaction_id text not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null default 'NGN',
  direction text not null check (direction in ('credit', 'debit')),
  semantic_type text not null default 'unknown'
    check (semantic_type in ('income', 'expense', 'external_transfer', 'internal_transfer', 'refund', 'unknown')),
  occurred_at timestamptz not null,
  merchant_name text,
  narration text,
  normalized_merchant text,
  budget_eligible boolean not null default true,
  created_at timestamptz not null default now(),
  unique (provider_id, bank_account_id, provider_transaction_id)
);
create index transactions_user_occurred_idx
  on public.transactions (user_id, occurred_at desc);
create index transactions_account_idx on public.transactions (bank_account_id);

-- -------------------------------------------------- transaction_reviews
-- User-owned review/category state. Separate from immutable facts.
create table public.transaction_reviews (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null unique references public.transactions (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  status text not null default 'needs_review'
    check (status in ('needs_review', 'reconciled', 'excluded')),
  category_id text references public.categories (id),
  user_note text,
  confirmed_at timestamptz,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index transaction_reviews_user_status_idx
  on public.transaction_reviews (user_id, status);

-- ------------------------------------------------------------ categories
create table public.categories (
  id text primary key,
  label text not null,
  created_at timestamptz not null default now()
);

insert into public.categories (id, label) values
  ('food', 'Food'),
  ('transport', 'Transport'),
  ('bills', 'Bills'),
  ('shopping', 'Shopping'),
  ('entertainment', 'Entertainment'),
  ('health', 'Health'),
  ('personal', 'Personal'),
  ('education', 'Education'),
  ('family', 'Family'),
  ('external_transfer', 'External Transfer'),
  ('income', 'Income'),
  ('internal_transfer', 'Internal Transfer'),
  ('other', 'Other')
on conflict (id) do nothing;

-- -------------------------------------------------------- merchant_rules
create table public.merchant_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  merchant_key text not null,
  category_id text not null references public.categories (id),
  created_from text,
  confidence real check (confidence is null or (confidence >= 0 and confidence <= 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, merchant_key)
);
create index merchant_rules_user_idx on public.merchant_rules (user_id);

-- --------------------------------------------------------------- budgets
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  period_type text not null default 'monthly' check (period_type = 'monthly'),
  period_start date not null,
  period_end date not null,
  total_limit_minor bigint not null check (total_limit_minor >= 0),
  currency char(3) not null default 'NGN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_type, period_start)
);
create index budgets_user_idx on public.budgets (user_id);

-- ------------------------------------------------------ budget_categories
create table public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets (id) on delete cascade,
  category_id text not null references public.categories (id),
  limit_minor bigint not null check (limit_minor >= 0),
  created_at timestamptz not null default now(),
  unique (budget_id, category_id)
);

-- -------------------------------------------------------------- sync_runs
create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  bank_connection_id uuid references public.bank_connections (id) on delete cascade,
  mode text not null default 'manual',
  status text not null default 'started',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  transactions_seen integer not null default 0,
  transactions_added integer not null default 0,
  error_code text
);
create index sync_runs_user_idx on public.sync_runs (user_id);

-- ================================================================== RLS
alter table public.users enable row level security;
alter table public.bank_connections enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_reviews enable row level security;
alter table public.categories enable row level security;
alter table public.merchant_rules enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_categories enable row level security;
alter table public.sync_runs enable row level security;

-- users: own profile only.
create policy users_select_own on public.users
  for select using (id = auth.uid());
create policy users_insert_own on public.users
  for insert with check (id = auth.uid());
create policy users_update_own on public.users
  for update using (id = auth.uid());

-- Authoritative facts: client SELECT own rows. No client writes.
create policy bank_connections_select_own on public.bank_connections
  for select using (user_id = auth.uid());
create policy bank_accounts_select_own on public.bank_accounts
  for select using (user_id = auth.uid());
create policy transactions_select_own on public.transactions
  for select using (user_id = auth.uid());
create policy sync_runs_select_own on public.sync_runs
  for select using (user_id = auth.uid());

-- Review state: client may read and write its own rows, never delete.
create policy transaction_reviews_select_own on public.transaction_reviews
  for select using (user_id = auth.uid());
create policy transaction_reviews_insert_own on public.transaction_reviews
  for insert with check (user_id = auth.uid());
create policy transaction_reviews_update_own on public.transaction_reviews
  for update using (user_id = auth.uid());

-- Merchant rules and budgets: full own-row access (no authoritative facts).
create policy merchant_rules_all_own on public.merchant_rules
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy budgets_all_own on public.budgets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy budget_categories_all_own on public.budget_categories
  for all using (
    exists (
      select 1 from public.budgets b
      where b.id = budget_categories.budget_id and b.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.budgets b
      where b.id = budget_categories.budget_id and b.user_id = auth.uid()
    )
  );

-- Categories: canonical seed, readable by any authenticated user.
create policy categories_select_authenticated on public.categories
  for select to authenticated using (true);

-- ============================================ profile auto-created on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
