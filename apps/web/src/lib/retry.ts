// When to suggest calling a lead again. Pure functions, IST based. The app only
// *suggests* retries (shown as "due" on the dashboard); a person still clicks Call.

const IST_OFFSET_MS = 330 * 60_000;
const HOUR_MS = 3_600_000;

const istHour = (d: Date) => new Date(d.getTime() + IST_OFFSET_MS).getUTCHours();

// Next 10:00 IST strictly after `from`.
function nextTenAmIst(from: Date): Date {
  const ist = new Date(from.getTime() + IST_OFFSET_MS);
  let tenAmUtcMs = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), 10) - IST_OFFSET_MS;
  if (tenAmUtcMs <= from.getTime()) tenAmUtcMs += 24 * HOUR_MS;
  return new Date(tenAmUtcMs);
}

// Keeps a suggested time inside 9am to 9pm IST; otherwise pushes it to 10am next.
export function clampToCallingHours(at: Date): Date {
  const h = istHour(at);
  return h >= 9 && h < 21 ? at : nextTenAmIst(at);
}

export function nextCallAt(status: string, now: Date = new Date()): Date | null {
  switch (status) {
    case "No Answer":
      return clampToCallingHours(new Date(now.getTime() + 3 * HOUR_MS));
    case "Follow Up":
      return nextTenAmIst(new Date(now.getTime() + 12 * HOUR_MS));
    default:
      return null;
  }
}
