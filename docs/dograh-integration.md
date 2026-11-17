# Dograh <-> web app integration

The web app (`apps/web`) is the branded product. Dograh is the calling engine behind
it. Customers never see Dograh.

## Flow

1. User clicks **Call AI** on a lead -> `POST /api/call` (signed-in users only).
2. The route calls Dograh `POST {DOGRAH_API_URL}/public/agent/{trigger_uuid}` with
   `phone_number` and `initial_context` (see below), using our `DOGRAH_API_KEY`.
3. The lead is marked "Calling..." and a call row is stored with the Dograh run id.
4. When the call ends, a Dograh **webhook node** POSTs to
   `https://<app-domain>/api/webhook/dograh`. The route stores transcript, summary,
   recording and extracted fields, and updates the lead status.
5. Optional: the agent calls the **property search tool**
   (`POST /api/properties/search`) mid-call to quote only the customer's own projects.

## Per-customer setup (the part you do in Dograh)

For each customer:

1. Create or clone the agent (Priya, Hinglish) in Dograh, publish it.
2. Add an **API Trigger** node. Copy its trigger UUID into the customer's
   **Settings -> Agent Trigger ID** in the web app.
3. Use these template variables in prompts (all come from `initial_context`):
   `{{lead_name}}`, `{{company_name}}`, `{{agent_name}}`, `{{budget}}`,
   `{{property_type}}`, `{{preferred_location}}`, `{{timeline}}`. They replace the
   hardcoded "3 BHK Gurgaon" text in the old Sam agent.
4. Add extraction variables to the agent: `interest`, `budget`, `configuration`,
   `location`, `timeline`, `purpose`, `visit_slot`, `do_not_call`.
5. Add a **webhook node**:
   - URL: `https://<app-domain>/api/webhook/dograh`, method POST
   - Auth: custom header `X-Webhook-Secret: <DOGRAH_WEBHOOK_SECRET>`
   - Payload template:

```json
{
  "run_id": "{{workflow_run_id}}",
  "lead_id": "{{initial_context.lead_id}}",
  "interest": "{{gathered_context.interest}}",
  "budget": "{{gathered_context.budget}}",
  "configuration": "{{gathered_context.configuration}}",
  "location": "{{gathered_context.location}}",
  "timeline": "{{gathered_context.timeline}}",
  "purpose": "{{gathered_context.purpose}}",
  "visit_slot": "{{gathered_context.visit_slot}}",
  "do_not_call": "{{gathered_context.do_not_call}}",
  "recording": "{{recording_url}}",
  "transcript_url": "{{transcript_url}}",
  "duration": "{{cost_info.call_duration_seconds}}"
}
```

6. (Optional) Property search tool: HTTP tool pointing at
   `https://<app-domain>/api/properties/search` with the same `X-Webhook-Secret`
   header and body `{ "org_id": "{{initial_context.org_id}}", "location": ..., "configuration": ... }`.

## Unverified, check before relying on it

- `DOGRAH_API_URL` default is `https://api.dograh.com/api/v1` (from the Dograh skill
  docs). The Dograh MCP uses `https://app.dograh.com/api/v1`. Confirm which one the
  public trigger endpoint answers on.
- Whether the webhook node supports a custom auth header and whether the tool can
  template `initial_context.org_id` into its body.
- The `cost_info.call_duration_seconds` variable name.
- Whether `{{transcript_url}}` is a public/downloadable URL without extra auth.

## Security notes

- The webhook and tool routes reject requests without the shared secret. The
  organization is always taken from the lead row, not the payload.
- Dashboard data is isolated by Postgres Row Level Security, not just app code.
- The service-role key is used only in the webhook, tool route and signup.
- Leads flagged `do_not_call` cannot be called from the app. This only covers calls
  placed through this app; campaigns started inside Dograh bypass it.

## Launch hardening (added 2026-11-17)

- **Calling hours:** `/api/call` refuses calls outside 9am to 9pm IST (env-tunable, see
  `apps/web/.env.example`). The exact TRAI window for enquiry callbacks is unverified.
- **Double-call guard:** a lead with a call "Calling..." younger than 15 min can't be
  called again. Older ones are treated as lost and can be retried. Two truly
  simultaneous requests can still race; the UI disables the button while pending.
- **Timeout:** the Dograh request aborts after 15 s instead of hanging.
- **No Answer:** a webhook with duration under 8 s and nothing gathered marks the lead
  "No Answer" instead of "Contacted".
- **CSV import:** Leads page, Import CSV. Requires a consent confirmation and a source
  label, stored in `leads.consent_source`. Dedupes by phone, max 1000 rows.
- **Status matching** now uses whole words, so "casino" no longer reads as "no".
- **Cost controls:** max 3 calls per lead (`MAX_ATTEMPTS_PER_LEAD`) and an optional
  monthly billable-minute cap per customer (`organizations.monthly_minutes_limit`,
  run `apps/web/supabase/002_usage_limits.sql`; env default `MONTHLY_MINUTES_LIMIT`).
  The dashboard shows this month's billable minutes (30 s pulse) and billed amount.
