# dograh-voice

Hinglish outbound voice agents for Indian businesses (first vertical: real estate lead
qualification and site-visit booking), built on Dograh. Started 2026-10-20.

This is a workspace repo, not an app. Dograh is the product layer (agent builder,
campaigns, call logs). This repo holds what we own: prompts, test cases, customer
configs, docs, and small Python scripts.

## Stack

- Platform: Dograh Cloud now (app.dograh.com); self-host (BSD-2 open source) once there
  are 2+ paying customers or ~10k+ min/month.
- STT: Sarvam (Saarika, hi-IN) and Deepgram, compared side by side.
- LLM: Sarvam `sarvam-105b`; fall back to Groq or Gemini Flash if replies are slow.
- TTS: Sarvam Bulbul v3, Hindi voice.
- Telephony: Vobiz (not set up yet). Get the India rate card before quoting prices.

## Business targets

- Sell price target: ₹3/min AI calling, billed per 30 s, telephony passed through,
  plus setup fee and monthly minimum. Pilots at ₹4/min on Dograh Cloud.
- Cost target to make ₹3 work: ≤ ₹2.0/min all-in (needs self-hosting).
- See docs/pricing.md for the full cost table.

## Rules

- Never commit API keys, `.env`, or any lead/contact data. Real lead files live in
  `data/` (gitignored) or in Dograh only.
- Never call a real lead without consent and DLT clearance. See docs/compliance.md.
- Changes made to agents through the Dograh MCP are saved as drafts; publish in the
  Dograh UI after testing.
- Every prompt change gets re-tested against the agent's `test-cases.md` before publishing.
- Record test outcomes (latency, quality, cost per call) in docs/test-results.md.
- Mark any price or rate that hasn't been confirmed from a primary source as
  "unverified".

## Layout

- `docs/`: setup, pricing, compliance, test results
- `agents/<name>/`: prompt.md (global + node prompts) and test-cases.md
- `customers/<name>/`: customer-specific project details, script changes, pilot results
- `scripts/`: small Python utilities (cost report, CSV cleaner, webhook receiver)
- `data/`: gitignored, local lead files only
