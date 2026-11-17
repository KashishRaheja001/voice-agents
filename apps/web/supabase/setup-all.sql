-- EstateFlow database setup: 001 + 002 + 003 combined. Paste into the Supabase SQL editor and run once on a NEW project.

-- ===== 001_multitenant.sql =====
-- Multi-tenant schema for the EstateFlow app (Dograh calling backend).
-- Run in the Supabase SQL editor on a NEW project (or after dropping the old demo
-- tables). Every customer (builder/agency) is one organization; users belong to
-- organizations via org_members; Row Level Security keeps tenants apart.

create extension if not exists pgcrypto;

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  agent_name text not null default 'Priya',
  language text not null default 'hinglish',
  -- Trigger UUID of this customer's published Dograh agent (API Trigger node).
  dograh_trigger_uuid text,
  created_at timestamptz not null default now()
);

create table org_members (
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index on org_members (user_id);

create table properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  project_name text not null,
  builder text,
  location text not null,
  description text,
  price_range text,
  configurations text,
  amenities text,
  created_at timestamptz not null default now()
);
create index on properties (org_id);

create table leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  budget text,
  preferred_location text,
  property_type text,
  timeline text,
  purpose text,
  status text not null default 'New',
  interest_level text not null default 'Pending',
  -- Set when the caller asks not to be called again. Calls are blocked.
  do_not_call boolean not null default false,
  -- Caller consent recorded for DLT / compliance (see docs/compliance.md).
  consent_source text,
  created_at timestamptz not null default now(),
  unique (org_id, phone)
);
create index on leads (org_id, status);

create table calls (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  dograh_run_id text,
  call_status text not null default 'Calling...',
  summary text,
  transcript text,
  recording_url text,
  duration int,
  -- Raw gathered_context from Dograh (budget, BHK, visit slot, ...).
  extracted jsonb,
  created_at timestamptz not null default now(),
  unique (org_id, dograh_run_id)
);
create index on calls (org_id, created_at desc);
create index on calls (lead_id);

-- ---------------------------------------------------------------- RLS

create or replace function is_org_member(target_org uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from org_members
    where org_id = target_org and user_id = auth.uid()
  );
$$;

alter table organizations enable row level security;
alter table org_members enable row level security;
alter table properties enable row level security;
alter table leads enable row level security;
alter table calls enable row level security;

create policy "members read their org" on organizations
  for select using (is_org_member(id));
create policy "owners update their org" on organizations
  for update using (
    exists (select 1 from org_members m
            where m.org_id = organizations.id and m.user_id = auth.uid() and m.role = 'owner')
  );

create policy "read own memberships" on org_members
  for select using (user_id = auth.uid());

create policy "tenant access" on properties
  for all using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "tenant access" on leads
  for all using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy "tenant access" on calls
  for all using (is_org_member(org_id)) with check (is_org_member(org_id));

-- Organizations and memberships are created server-side with the service-role key
-- during signup; there are intentionally no insert policies for them.

-- ===== 002_usage_limits.sql =====
-- Optional per-customer spend controls. Run in the Supabase SQL editor.
-- monthly_minutes_limit: billable minutes per calendar month (IST). NULL = use the
-- MONTHLY_MINUTES_LIMIT env default (0 = unlimited).
alter table organizations add column if not exists monthly_minutes_limit int;

-- Speeds up the monthly usage and attempts-per-lead checks on /api/call.
create index if not exists calls_org_created_idx on calls (org_id, created_at);
create index if not exists calls_lead_created_idx on calls (lead_id, created_at);

-- ===== 003_retry_scheduling.sql =====
-- Suggested time to call a lead again (set by the webhook after No Answer / Follow Up).
-- Optional: the app works without it; run in the Supabase SQL editor to enable the
-- "due for retry" list on the dashboard.
alter table leads add column if not exists next_call_at timestamptz;
create index if not exists leads_org_next_call_idx on leads (org_id, next_call_at)
  where next_call_at is not null;

