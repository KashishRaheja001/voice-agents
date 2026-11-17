// Normalizes Indian phone numbers to E.164 (+91XXXXXXXXXX). Returns null if the
// input cannot be an Indian mobile/landline number.
export function normalizeIndianPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  const bare = digits.replace(/^\+/, "");

  let national: string | null = null;
  if (/^\d{10}$/.test(bare)) national = bare;
  else if (/^0\d{10}$/.test(bare)) national = bare.slice(1);
  else if (/^91\d{10}$/.test(bare)) national = bare.slice(2);

  if (!national) return null;
  // Indian mobile numbers start with 6-9.
  if (!/^[6-9]/.test(national)) return null;
  return `+91${national}`;
}
