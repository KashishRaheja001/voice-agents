# EstateFlow web app

Branded, multi-tenant CRM for AI real estate calling. Dograh is the calling engine
behind it (see `../../docs/dograh-integration.md`).

Stack: Next.js 16 (App Router), React 19, Tailwind 4, Supabase (Postgres + Auth).

## Run locally

1. Create a **new** Supabase project and run `supabase/001_multitenant.sql` in the SQL editor.
2. In Supabase Auth settings, decide whether email confirmation is required.
3. `cp .env.example .env.local` and fill it in.
4. `npm install && npm run dev`, then open http://localhost:3000.

## Structure

- `src/app/(marketing)`: public home page
- `src/app/(auth)`: login and signup (signup also creates the workspace)
- `src/app/(app)`: dashboard, leads, properties, settings (login required)
- `src/app/api`: `call` (start a call), `webhook/dograh` (call results), `properties/search` (agent tool)
- `src/proxy.ts`: session refresh and route protection (Next 16 "proxy", formerly middleware)
- `src/lib/brand.ts`: product name and tagline, change here to rebrand

Rebranding: edit `src/lib/brand.ts` and the color tokens in `src/app/globals.css`.

## Not done yet

- Lead CSV import, site-visit calendar, WhatsApp confirmation
- Team invites (one owner per workspace for now)
- Usage metering and billing
- Lint cleanup inherited from the old demo (`npm run lint` reports `any` types and `<a>` links)
