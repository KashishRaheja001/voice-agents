# Pricing and unit economics

Last checked 2026-10-20. ₹ figures assume ~₹92/$. Anything marked *unverified*
must be confirmed before quoting a customer.

## Provider rates

| Item | Rate | Source |
|---|---|---|
| Dograh Cloud platform fee | 1¢/min (~₹0.92), $5 min top-up, 10 concurrent calls | dograh.com/pricing |
| Dograh self-hosted | Free (BSD-2 confirmed in github.com/dograh-hq/dograh LICENSE, 2026-11-03) | dograh.com/pricing |
| Sarvam STT | ₹30/hour (₹0.50/min) | docs.sarvam.ai/api/pricing |
| Sarvam TTS Bulbul v3 | ₹30 per 10K characters | docs.sarvam.ai/api/pricing |
| Sarvam LLM `sarvam-105b` | ₹15 input / ₹5 cached / ₹60 output per 1M tokens | docs.sarvam.ai/api/pricing |
| Vobiz outbound | Plan says ₹0.45/min; review sites list $0.0115/min (~₹1.05) | *unverified, get India rate card* |
| Vobiz number | ~$1/month + one-time setup of one month's rent | *unverified* |
| Plivo India (comparison) | ₹0.38/min, 30 s pulse | *unverified, third-party guide* |

## Cost per minute

| Item | Dograh Cloud now | Self-hosted, cheap line | Self-hosted, ₹1 line |
|---|---|---|---|
| Platform | ₹0.92 | ₹0.25–0.50 (server) | ₹0.25–0.50 |
| STT | ₹0.50 | ₹0.50 | ₹0.50 |
| TTS | ₹0.80–1.20 | ₹0.80–1.20 | ₹0.80–1.20 |
| LLM | ₹0.10–0.30 | ₹0.10–0.20 | ₹0.10–0.20 |
| Telephony | ₹0.45–1.05 | ₹0.40 | ₹1.05 |
| **Total** | **₹2.8–4.0** | **₹2.05–2.80** | **₹2.70–3.45** |

TTS is the biggest line. Ways to cut it:
- pre-recorded audio for fixed lines (greeting, standard questions, closing)
- agent replies under 2 sentences
- end "not interested" calls at once

Observed 2026-10-20: user saw about ₹6/min on a web call using Dograh's own models
(*unverified*, breakdown not yet read). This is well above the ₹2.8–4.0 estimate, so
Dograh Models are likely billed on top of the 1¢ platform fee at a higher rate than
BYOK. Switching to BYOK (Sarvam) is the first fix to test.

Replace these estimates with real numbers from the Dograh runs API once test calls run.

## Price sheet (draft)

| Item | Price |
|---|---|
| One-time setup / flow build | ₹10–15k |
| AI calling | ₹3/min, billed per 30 s |
| Telephony | Passed through at cost |
| Monthly minimum | ₹10k (~3,300 min included) |
| Pilot, first 2 weeks | ₹4/min on Dograh Cloud |

## Decision rules

- Don't sell at ₹3/min while on Dograh Cloud; margin is zero or negative.
- Move to self-hosting at 2 paying customers or ~10k min/month.
- Don't accept ₹3 flat with no setup fee and no minimum.
