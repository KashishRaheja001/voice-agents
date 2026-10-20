# Scripts

Small Python utilities, added when needed. Planned:

- `cost_report.py`: pull usage from the Dograh runs API and calculate real cost per minute
- `clean_leads.py`: normalise lead CSVs to E.164 (+91…), remove duplicates and
  do-not-call numbers
- `webhook.py`: receive Dograh webhook results and write them to a Google Sheet or CRM

Read keys from `.env`; never hard-code them.
