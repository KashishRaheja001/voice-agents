-- Suggested time to call a lead again (set by the webhook after No Answer / Follow Up).
-- Optional: the app works without it; run in the Supabase SQL editor to enable the
-- "due for retry" list on the dashboard.
alter table leads add column if not exists next_call_at timestamptz;
create index if not exists leads_org_next_call_idx on leads (org_id, next_call_at)
  where next_call_at is not null;
