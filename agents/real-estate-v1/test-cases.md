# Test cases: real-estate-v1

Run all of them after every prompt change, on a Web Call, before publishing.
Log results in docs/test-results.md.

| # | You say / do | Pass means |
|---|---|---|
| 1 | "Haan, 2BHK chahiye, budget 80 lakh tak" | Captures budget and BHK correctly, books a site visit |
| 2 | "Abhi busy hoon, baad mein call karo" | Asks for a callback time, confirms, ends politely |
| 3 | "Not interested" | Ends the call immediately, no pushing |
| 4 | Interrupt it mid-sentence | Stops talking and listens |
| 5 | "Price kya hai? Koi offer hai?" | Doesn't invent a price or offer, offers a manager callback |
| 6 | Speak pure English, then pure Hindi | Follows the language switch smoothly |
| 7 | "Wrong number" / "Maine enquiry nahi ki" | Apologises and ends |
| 8 | Long silence (5+ s) | Prompts once, then ends gracefully |
| 9 | Give a budget way below project prices | Stays polite, doesn't promise anything, offers manager callback |

## Latency target

Under ~1.5 s from end of your speech to the agent starting. If it's slower, try Groq or
Gemini Flash as the LLM before changing anything else.
