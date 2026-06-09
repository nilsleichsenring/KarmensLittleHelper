import type {
  AgreementLanguage,
  AgreementSectionId,
} from "./types";

import { DEFAULT_AGREEMENT_LANGUAGE } from "./defaults";

const VALID_SECTION_IDS: AgreementSectionId[] = [
  "intro",
  "project_summary",
  "host_responsibilities",
  "participant_responsibilities",
  "participant_identity",
  "consent_overview",
  "data_protection",
  "closing",
  "participation_fee",
  "withdrawal_policy",
  "travel_cost_notice",
  "media_consent_clause",
  "future_projects_clause",
];

const VALID_LANGUAGES: AgreementLanguage[] = [
  "en",
  "sl",
  "de",
];

export function normalizeAgreementLanguage(
  value: unknown
): AgreementLanguage {
  if (
    typeof value === "string" &&
    VALID_LANGUAGES.includes(value as AgreementLanguage)
  ) {
    return value as AgreementLanguage;
  }

  return DEFAULT_AGREEMENT_LANGUAGE;
}

export type AgreementConfig = {
  version: number;
  default_language: "en" | "sl" | "de";
  enabled_section_ids: AgreementSectionId[];
};

export function getAgreementConfig(
  rawConfig: unknown
): AgreementConfig {
  const config =
    rawConfig && typeof rawConfig === "object"
      ? (rawConfig as Partial<AgreementConfig>)
      : null;

  return {
    version:
      typeof config?.version === "number"
        ? config.version
        : 1,

    default_language: normalizeAgreementLanguage(
      config?.default_language
    ),

    enabled_section_ids: Array.isArray(config?.enabled_section_ids)
      ? config.enabled_section_ids.filter(
          (id): id is AgreementSectionId =>
            VALID_SECTION_IDS.includes(id as AgreementSectionId)
        )
      : [],
  };
}