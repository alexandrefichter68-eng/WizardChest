/** Converts an ISO 3166-1 alpha-2 code into its flag emoji via regional indicator symbols. */
export function countryCodeToFlagEmoji(countryCode: string): string {
  const code = countryCode.toUpperCase();
  if (code.length !== 2) return '🏳️';
  const codePoints = [...code].map((char) => 0x1f1e6 - 65 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
