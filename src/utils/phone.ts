/** Returns a stable phone key for matching clients within an organization. */
export function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('521') && digits.length === 13) return digits.slice(3);
  if (digits.startsWith('52') && digits.length === 12) return digits.slice(2);
  if (digits.startsWith('1') && digits.length === 11) return digits.slice(1);
  return digits;
}

export function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  return normalized.length >= 10 && normalized.length <= 15;
}
