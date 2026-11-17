# Test results

One row per test run. Latency = gap between you finishing speaking and the agent
starting. Cost from the Dograh runs/usage page.

| Date | Agent | Config (STT / LLM / TTS) | Test # | Pass? | Latency (s) | Hinglish quality (1–5) | Voice (1–5) | Cost/min (₹) | Notes |
|---|---|---|---|---|---|---|---|---|---|
| 2026-10-20 | live agent 11216 (Sam, not real-estate-v1) | Dograh models (assumed, unverified) | web call 746195, 113 s | Partial | not measured | 2 (switched to Hindi only after caller asked; hallucinated lead details; garbled "Hindu token हिंदी") | not rated | ~6 (user reports ₹6/min on Dograh models; unverified, not yet read from the run's usage page) | Agent never asked for the name's purpose, assumed hardcoded lead details as fact. Ended on caller's request, no visit booked. |
| | real-estate-v1 | Dograh models (baseline) | | | | | | | |
| | real-estate-v1 | Sarvam / sarvam-105b / Bulbul v3 | | | | | | | |
| | real-estate-v1 | Deepgram / sarvam-105b / Bulbul v3 | | | | | | | |

## Decisions

Record which config you chose and why.
