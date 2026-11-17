# Dograh snapshot: "real estate agent - outbound" (workflow 11216)

Pulled via MCP `get_workflow_code` on 2026-10-20. Version: published.
This is what is live in Dograh, not the `prompt.md` draft. The two have diverged
(see "Gaps vs prompt.md" below).

## Structure

Start Call -> Main Agenda and Questions -> End Call (plus Start Call -> End Call for
wrong number / not interested). One global node. No QA/extraction node, no tools.

## Nodes (summarised, full prompts live in Dograh)

- **Global**: persona "Sam", company "EstateFlow Realty". Goal: qualify buyers, steer to
  a site visit or advisor callback. Replies 2-3 sentences, 10-25 words. English-default
  template wording ("multiple languages"), ASR-noise handling, "never use their name".
- **Start Call**: greet ("hi there"), name + company, reason, ask the caller's name, ask
  for 20 seconds. One rescue attempt if hesitant. "If company name is not given, invent
  a random but relevant company name."
- **Main Agenda and Questions**: hardcoded details: 3 BHK, Gurgaon, Rs 1-1.5 crore,
  buying in 3-6 months. Confirmation questions: amenities, sector, site visit. Wrap up
  with recap, callback or site visit. `allow_interrupt: false`. No extraction variables.
- **End Call**: 6-8 word goodbye.

## Gaps vs prompt.md

1. Persona is Sam / EstateFlow Realty (English), not Priya / Hinglish.
2. Lead details (3 BHK, Gurgaon, budget, timeline) are hardcoded in the node instead
   of template variables per lead.
3. "Invent a random company name" breaks the never-invent-facts rule.
4. Start node asks for the caller's name; global node says never use it. Contradiction.
5. No do-not-call handling, no busy/callback-time capture, no WhatsApp confirmation.
6. No extraction (budget, BHK, timeline, purpose, visit slot, outcome), so no QA data.
7. Site visit booking is only "offer a site visit"; no two-slot offer or confirm-back.
8. `allow_interrupt: false` on the main node: callers can't barge in. Check this on
   real calls.
9. No Hinglish number style ("80 lakh", "1.2 crore").
