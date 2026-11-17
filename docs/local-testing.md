# Local end-to-end testing

Runs the real app against a local Supabase (Docker) and a mock Dograh. It never touches
real Supabase, real Dograh, or any phone number. Last run 2026-11-17: 17 of 17 passed,
plus the calling-hours check, plus a manual browser pass (signup, settings, CSV import,
Call AI, Do Not Call, retry).

## 1. Local Supabase (once)

Needs Docker Desktop. Use a scratch folder so nothing lands in this repo:

```bash
mkdir ~/sbtest && cd ~/sbtest
npx supabase init
mkdir -p supabase/migrations
cp <repo>/apps/web/supabase/001_multitenant.sql supabase/migrations/20260101000001_multitenant.sql
cp <repo>/apps/web/supabase/002_usage_limits.sql supabase/migrations/20260101000002_usage.sql
cp <repo>/apps/web/supabase/003_retry_scheduling.sql supabase/migrations/20260101000003_retry.sql
# in supabase/config.toml set [auth.email] enable_confirmations = false
npx supabase start -x studio,imgproxy,edge-runtime,logflare,vector,mailpit,realtime,storage-api,postgres-meta,supavisor
```

The first start downloads several images. `npx supabase status -o env` prints the local
URL and keys (the local demo keys are public and safe).

## 2. Dev server with test settings

From `apps/web`, with the local Supabase values:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<anon key> SUPABASE_SECRET_KEY=<service role key> \
DOGRAH_API_URL=http://localhost:4010/api/v1 DOGRAH_API_KEY=testkey \
DOGRAH_WEBHOOK_SECRET=localtest CALLING_HOURS_ENFORCED=false MAX_ATTEMPTS_PER_LEAD=2 \
npx next dev -p 3100
```

## 3. Run the checks

```bash
SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=<anon key> \
SUPABASE_SERVICE_KEY=<service role key> APP_URL=http://localhost:3100 \
node scripts/e2e-local.mjs
```

It starts its own mock Dograh on port 4010. To check the calling-hours guard, restart
the dev server with `CALLING_HOURS_START=5 CALLING_HOURS_END=5` and run the script with
`--hours-blocked`.

## What it covers

Call payload and trigger ID, double-call and attempt-cap guards, do-not-call, webhook
secret and validation, idempotency, Site Visit / Follow Up / No Answer / opt-out
classification, retry times, monthly minute limit, CSV export (rounding and formula
escaping), page rendering, CSV import semantics, and tenant isolation (RLS).

## Not covered

Real Dograh behaviour (see "Unverified" in dograh-integration.md), real phone calls,
Vobiz, and Vercel. Test those with your own number first.
