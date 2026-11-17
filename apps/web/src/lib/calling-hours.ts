// TRAI restricts commercial calls to 9am–9pm. Enforced in IST by default so a
// customer can't accidentally call leads at night. Tune with env vars; disable with
// CALLING_HOURS_ENFORCED=false (e.g. for testing). Confirm the exact rule for
// enquiry callbacks in docs/compliance.md (unverified).

const IST_OFFSET_MINUTES = 330;

function numberEnv(name: string, fallback: number) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) ? n : fallback;
}

export function istHour(now: Date = new Date()): number {
  const ist = new Date(now.getTime() + IST_OFFSET_MINUTES * 60_000);
  return ist.getUTCHours();
}

export function isWithinCallingHours(now: Date = new Date()): boolean {
  if (process.env.CALLING_HOURS_ENFORCED === "false") return true;
  const start = numberEnv("CALLING_HOURS_START", 9);
  const end = numberEnv("CALLING_HOURS_END", 21);
  const h = istHour(now);
  return h >= start && h < end;
}

export function callingHoursMessage() {
  const start = numberEnv("CALLING_HOURS_START", 9);
  const end = numberEnv("CALLING_HOURS_END", 21);
  const fmt = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "am" : "pm"}`;
  return `Calls are only allowed between ${fmt(start)} and ${fmt(end)} IST.`;
}
