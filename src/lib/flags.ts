// src/lib/flags.ts

/** Konvertiert ISO-Ländercode ("DE", "PT", "HU") → 🇩🇪 🇵🇹 🇭🇺 */
export function countryCodeToEmoji(code: string | null): string {
  if (!code) return "🏳️";

  const upper = code.toUpperCase();
  if (upper.length !== 2) return upper;

  // Unicode: A → 🇦 = 0x1F1E6
  const OFFSET = 0x1F1E6 - "A".charCodeAt(0);

  const first = upper.charCodeAt(0) + OFFSET;
  const second = upper.charCodeAt(1) + OFFSET;

  return String.fromCodePoint(first) + String.fromCodePoint(second);
}
