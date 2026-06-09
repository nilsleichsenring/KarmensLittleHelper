// src/lib/participantAgreement/types.ts

export type AgreementLanguage = "en" | "sl" | "de";

export type AgreementSectionId =
  | "intro"
  | "project_summary"
  | "host_responsibilities"
  | "participant_responsibilities"
  | "participant_identity"
  | "consent_overview"
  | "data_protection"
  | "closing"
  | "participation_fee"
  | "withdrawal_policy"
  | "travel_cost_notice"
  | "media_consent_clause"
  | "future_projects_clause";

export type AgreementSectionKind =
  | "paragraph"
  | "bullet_list"
  | "data_points"
  | "consent_summary"
  | "closing";

export type AgreementTextTemplate = {
  title: string;
  intro?: string;
  paragraphs?: string[];
  bullets?: string[];
  closingNote?: string;
};

export type AgreementSectionDefinition = {
  id: AgreementSectionId;
  kind: AgreementSectionKind;
  required: boolean;
  order: number;
  contentByLanguage: Record<AgreementLanguage, AgreementTextTemplate>;
};

export type AgreementParticipantInput = {
  full_name: string;
  email: string;
  residence_country: string;
  food_preferences: string[];
  health_issues: string | null;
  additional_information: string | null;
  media_consent: boolean;
  future_projects_consent: boolean;
};

export type AgreementProjectInput = {
  id: string;
  name: string;
  participant_access_token?: string | null;
  project_reference?: string | null;
  host_organisation_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

export type AgreementBuilderInput = {
  version: number;
  language: AgreementLanguage;
  project: AgreementProjectInput;
  participant: AgreementParticipantInput;
  includeOptionalSections?: AgreementSectionId[];
};

export type AgreementRenderedSection = {
  id: AgreementSectionId;
  kind: AgreementSectionKind;
  required: boolean;
  order: number;
  title: string;
  intro?: string;
  paragraphs: string[];
  bullets: string[];
  closingNote?: string;
};

export type AgreementDocument = {
  version: number;
  language: AgreementLanguage;
  generated_at: string;
  project: AgreementProjectInput;
  participant: AgreementParticipantInput;
  included_section_ids: AgreementSectionId[];
  sections: AgreementRenderedSection[];
};

export type AgreementSnapshot = {
  agreement_version: number;
  agreement_language: AgreementLanguage;
  generated_at: string;
  project: AgreementProjectInput;
  participant: AgreementParticipantInput;
  included_section_ids: AgreementSectionId[];
  sections: AgreementRenderedSection[];
};