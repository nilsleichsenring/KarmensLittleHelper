import type { AgreementLanguage } from "./types";

export function getCountryLabel(
  code: string | null,
  language: AgreementLanguage
): string {
  if (!code) return "—";

  try {
    const locale =
      language === "sl"
        ? "sl-SI"
        : language === "de"
        ? "de-DE"
        : "en-US";

    const displayNames = new Intl.DisplayNames([locale], {
      type: "region",
    });

    return displayNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}