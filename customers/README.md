# Customers

One folder per customer: `customers/<customer-name>/`, each with:

- `project.md`: project facts the agent may state (prices, location, possession), plus
  who signed off on them
- `script-changes.md`: how their agent differs from the base agent in `agents/`
- `pilot.md`: pilot dates, minutes used, answer rate, qualified rate, visits booked,
  cost per qualified lead
- `compliance.md`: who holds DLT, consent confirmation, date received

No lead lists or phone numbers here. Those stay in `data/` (gitignored) or Dograh.
