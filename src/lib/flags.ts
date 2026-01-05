// src/lib/flags.ts

/** ISO country code → 🇩🇪 🇵🇹 🇭🇺 */
export function countryCodeToEmoji(code: string | null): string {
  if (!code) return "🏳️";

  const upper = code.toUpperCase();
  if (upper.length !== 2) return upper;

  const OFFSET = 0x1F1E6 - "A".charCodeAt(0);

  return String.fromCodePoint(
    upper.charCodeAt(0) + OFFSET,
    upper.charCodeAt(1) + OFFSET
  );
}

/** ISO country code → localized country name (default: English) */
export function countryCodeToName(
  code: string | null,
  locale: string = "en"
): string {
  if (!code) return "";

  try {
    return (
      new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code
    );
  } catch {
    return code;
  }
}
