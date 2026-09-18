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

/**
 * Formats a phone number for WhatsApp's wa.me links.
 * Mexican numbers must include the country code 52, without the plus sign.
 */
export function formatWhatsAppPhoneNumber(phone: string, defaultCountryCode = '52'): string {
  const digits = phone.replace(/\D/g, '');

  // Legacy Mexican mobile format: 521 + 10 digits -> 52 + 10 digits.
  if (digits.startsWith('521') && digits.length === 13) {
    return `52${digits.slice(3)}`;
  }

  if (digits.startsWith(defaultCountryCode) && digits.length === 12) {
    return digits;
  }

  if (digits.length === 10) {
    return `${defaultCountryCode}${digits}`;
  }

  return digits;
}
