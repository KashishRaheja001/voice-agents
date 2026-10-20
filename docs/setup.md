# Setup

## 1. Accounts

| Service | What you need | Where |
|---|---|---|
| Dograh Cloud | Account + $5 minimum top-up | app.dograh.com |
| Sarvam | API key (₹100 free credit on signup) | dashboard.sarvam.ai |
| Deepgram | API key, for STT comparison | console.deepgram.com |
| Groq or Google AI Studio | API key, backup fast LLM | console.groq.com / aistudio.google.com |
| Vobiz | Account, Indian number, Auth ID + Auth Token (later) | vobiz.ai |

Provider keys go into Dograh's **Providers** page, not into this repo.

## 2. Dograh MCP for Claude Code

1. Create a key at app.dograh.com/api-keys.
2. Set it as a user environment variable so `.mcp.json` can read it (Windows PowerShell):
   ```powershell
   [Environment]::SetEnvironmentVariable("DOGRAH_API_KEY", "<your key>", "User")
   ```
3. Restart Claude Code from this folder and approve the `dograh` server when asked.
4. Check it's connected with `claude mcp list`.

The key controls which Dograh workspace Claude sees. Edits made through MCP are saved
as drafts, so publish them in the Dograh UI.

## 3. First agent (browser test, no phone)

1. app.dograh.com/workflow → create agent → **Outbound** → paste the use case from
   `agents/real-estate-v1/prompt.md`.
2. Start a **Web Call** with Dograh's own models. This is the baseline.

## 4. Switch to own keys (BYOK)

1. **Providers → Add Provider**: add Sarvam, Deepgram and Groq. Dograh checks each key
   before saving.
2. **Models → Add Configuration**, mode **BYOK**:

   | Part | Config A (all Sarvam) | Config B (Deepgram STT) |
   |---|---|---|
   | LLM | Sarvam `sarvam-105b` | Sarvam `sarvam-105b` |
   | Transcriber | Sarvam Saarika, `hi-IN` | Deepgram (multilingual, hint hi + en) |
   | Voice | Sarvam Bulbul v3, Hindi voice | Sarvam Bulbul v3, Hindi voice |

   Don't pick Saaras for STT if it appears; it translates rather than transcribes
   (unverified, so check the dropdown description).
3. Click **Make org default** on the config you're testing.
4. Run the test cases and record results in `docs/test-results.md`.

## 5. Telephony (after browser tests pass)

1. Vobiz: buy an Indian number, copy the Auth ID and Auth Token.
2. Dograh → `/telephony-configurations` → add Vobiz, leave Application ID blank.
3. Add the number in E.164 format (+91XXXXXXXXXX).
4. In the Vobiz console, attach the number to the auto-created `dograh-…` application.
5. Call only your own phone until compliance is settled (docs/compliance.md).

## Sources

- Dograh docs index: https://docs.dograh.com/llms.txt
- Model configurations: https://docs.dograh.com/configurations/inference-providers.md
- MCP: https://docs.dograh.com/integrations/mcp.md
- Vobiz: https://docs.dograh.com/integrations/telephony/vobiz.md
