-- Optional per-customer spend controls. Run in the Supabase SQL editor.
-- monthly_minutes_limit: billable minutes per calendar month (IST). NULL = use the
-- MONTHLY_MINUTES_LIMIT env default (0 = unlimited).
alter table organizations add column if not exists monthly_minutes_limit int;

-- Speeds up the monthly usage and attempts-per-lead checks on /api/call.
create index if not exists calls_org_created_idx on calls (org_id, created_at);
create index if not exists calls_lead_created_idx on calls (lead_id, created_at);
