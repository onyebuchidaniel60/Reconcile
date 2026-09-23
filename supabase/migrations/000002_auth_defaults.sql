-- Client-writable tables default ownership to the authenticated caller,
-- so inserts without an explicit user_id still satisfy RLS WITH CHECK.
-- Server-written tables (transactions, connections, accounts, sync_runs)
-- intentionally keep NO default: service code must pass user_id explicitly.
alter table public.transaction_reviews alter column user_id set default auth.uid();
alter table public.merchant_rules alter column user_id set default auth.uid();
alter table public.budgets alter column user_id set default auth.uid();
