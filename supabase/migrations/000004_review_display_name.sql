-- Phase 10A.5: optional user-chosen display name per review. Provider
-- facts stay immutable; this rides the existing user-owned review state
-- (client-updatable under transaction_reviews_update_own).
alter table public.transaction_reviews
  add column if not exists display_name text;
