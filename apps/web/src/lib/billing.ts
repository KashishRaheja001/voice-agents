// Usage and cost maths. Billing is per 30-second pulse (see docs/pricing.md).
// PRICE_PER_MIN is what the customer pays; COST_PER_MIN is our all-in cost. Both are
// placeholders until confirmed from real call data (unverified).

export const PULSE_SECONDS = 30;

export function billableSeconds(durationSeconds: number | null | undefined): number {
  const d = Number(durationSeconds);
  if (!Number.isFinite(d) || d <= 0) return 0;
  return Math.ceil(d / PULSE_SECONDS) * PULSE_SECONDS;
}

export function totalBillableMinutes(durations: Array<number | null | undefined>): number {
  const seconds = durations.reduce<number>((sum, d) => sum + billableSeconds(d), 0);
  return seconds / 60;
}

const numberEnv = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export const pricePerMin = () => numberEnv("PRICE_PER_MIN", 3);
export const costPerMin = () => numberEnv("COST_PER_MIN", 2.8);
export const maxAttemptsPerLead = () => numberEnv("MAX_ATTEMPTS_PER_LEAD", 3);
// 0 means no limit.
export const defaultMonthlyMinutesLimit = () => numberEnv("MONTHLY_MINUTES_LIMIT", 0);

// Start of the current month in IST, as an ISO string (for filtering calls).
export function startOfMonthIst(now: Date = new Date()): string {
  const ist = new Date(now.getTime() + 330 * 60_000);
  const startIstAsUtc = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1);
  return new Date(startIstAsUtc - 330 * 60_000).toISOString();
}
