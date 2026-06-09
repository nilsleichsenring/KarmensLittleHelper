// src/lib/participantAgreement/buildAgreement.ts

import { AGREEMENT_SECTION_DEFINITIONS } from "./definitions";
import { DEFAULT_AGREEMENT_VERSION } from "./defaults";

import type {
  AgreementBuilderInput,
  AgreementDocument,
  AgreementRenderedSection,
  AgreementSectionDefinition,
  AgreementSectionId,
  AgreementSnapshot,
} from "./types";

import { getCountryLabel } from "./countryLabels";

export function buildAgreement(
  input: AgreementBuilderInput
): AgreementDocument {
  const version = input.version ?? DEFAULT_AGREEMENT_VERSION;
  const generatedAt = new Date().toISOString();

  const includedDefinitions = getIncludedSectionDefinitions(
    AGREEMENT_SECTION_DEFINITIONS,
    input.includeOptionalSections ?? []
  );

  const renderedSections = includedDefinitions.map((definition) =>
    renderSection(definition, input)
  );

  return {
    version,
    language: input.language,
    generated_at: generatedAt,
    project: input.project,
    participant: input.participant,
    included_section_ids: includedDefinitions.map((item) => item.id),
    sections: renderedSections,
  };
}

export function buildAgreementSnapshot(
  input: AgreementBuilderInput
): AgreementSnapshot {
  const document = buildAgreement(input);

  return {
    agreement_version: document.version,
    agreement_language: document.language,
    generated_at: document.generated_at,
    project: document.project,
    participant: document.participant,
    included_section_ids: document.included_section_ids,
    sections: document.sections,
  };
}

function getIncludedSectionDefinitions(
  definitions: AgreementSectionDefinition[],
  includeOptionalSections: AgreementSectionId[]
) {
  const optionalSet = new Set(includeOptionalSections);

  return [...definitions]
    .filter((definition) => {
      if (definition.required) return true;
      return optionalSet.has(definition.id);
    })
    .sort((a, b) => a.order - b.order);
}

function renderSection(
  definition: AgreementSectionDefinition,
  input: AgreementBuilderInput
): AgreementRenderedSection {
  const template = definition.contentByLanguage[input.language];

  const title = interpolateText(template.title, input);
  const intro = template.intro
    ? interpolateText(template.intro, input)
    : undefined;

  const paragraphs = (template.paragraphs ?? []).map((paragraph) =>
    interpolateText(paragraph, input)
  );

  const bullets =
    definition.kind === "data_points"
      ? buildParticipantDataBullets(input)
      : definition.kind === "consent_summary"
        ? buildConsentBullets(input)
        : (template.bullets ?? []).map((bullet) =>
            interpolateText(bullet, input)
          );

  const closingNote = template.closingNote
    ? interpolateText(template.closingNote, input)
    : undefined;

  return {
    id: definition.id,
    kind: definition.kind,
    required: definition.required,
    order: definition.order,
    title,
    intro,
    paragraphs,
    bullets,
    closingNote,
  };
}

function interpolateText(
  text: string,
  input: AgreementBuilderInput
): string {
  const replacements: Record<string, string> = {
    "{{project_name}}": input.project.name || "—",
    "{{project_reference}}": input.project.project_reference || "—",
    "{{participant_name}}": input.participant.full_name || "—",
    "{{participant_email}}": input.participant.email || "—",
    "{{residence_country}}": input.participant.residence_country || "—",
    "{{host_organisation_name}}": input.project.host_organisation_name || "—",
    "{{project_start_date}}": input.project.start_date || "—",
    "{{project_end_date}}": input.project.end_date || "—",
  };

  let result = text;

  Object.entries(replacements).forEach(([token, value]) => {
    result = result.replaceAll(token, value);
  });

  return result;
}

function buildParticipantDataBullets(
  input: AgreementBuilderInput
): string[] {
  const participantLabels = {
    en: {
      fullName: "Full name",
      email: "Email",
      residenceCountry: "Residence country",
      foodPreferences: "Food preferences",
      healthIssues: "Health issues",
      additionalInformation: "Additional information",
    },
    sl: {
      fullName: "Ime in priimek",
      email: "E-naslov",
      residenceCountry: "Država prebivališča",
      foodPreferences: "Prehranske preference",
      healthIssues: "Zdravstvene posebnosti",
      additionalInformation: "Dodatne informacije",
    },
    de: {
      fullName: "Vollständiger Name",
      email: "E-Mail",
      residenceCountry: "Wohnsitzland",
      foodPreferences: "Ernährungspräferenzen",
      healthIssues: "Gesundheitliche Hinweise",
      additionalInformation: "Zusätzliche Informationen",
    },
  } as const;

  const labels = participantLabels[input.language];

  return [
    `${labels.fullName}: ${input.participant.full_name || "—"}`,
    `${labels.email}: ${input.participant.email || "—"}`,
    `${labels.residenceCountry}: ${getCountryLabel(
      input.participant.residence_country,
      input.language
    )}`,
    `${labels.foodPreferences}: ${formatFoodPreferences(
      input.participant.food_preferences,
      input.language
    )}`,
    `${labels.healthIssues}: ${input.participant.health_issues || "—"}`,
    `${labels.additionalInformation}: ${
      input.participant.additional_information || "—"
    }`,
  ];
}

function buildConsentBullets(
  input: AgreementBuilderInput
): string[] {
  const consentLabels = {
    en: {
      mediaConsent: "Media consent",
      futureProjectsConsent: "Future projects consent",
    },
    sl: {
      mediaConsent: "Soglasje za uporabo fotografij in videov",
      futureProjectsConsent:
        "Soglasje za obveščanje o prihodnjih projektih",
    },
    de: {
      mediaConsent: "Einwilligung zur Nutzung von Fotos und Videos",
      futureProjectsConsent:
        "Einwilligung für Informationen zu zukünftigen Projekten",
    },
  } as const;

  const labels = consentLabels[input.language];

  return [
    `${labels.mediaConsent}: ${formatConsent(
      input.participant.media_consent,
      input.language
    )}`,
    `${labels.futureProjectsConsent}: ${formatConsent(
      input.participant.future_projects_consent,
      input.language
    )}`,
  ];
}

function formatFoodPreferences(
  values: string[],
  language: AgreementBuilderInput["language"]
): string {
  if (!values || values.length === 0) return "—";

  const foodPreferenceLabels = {
    en: {
      no_restrictions: "No Restrictions",
      vegetarian: "Vegetarian",
      vegan: "Vegan",
      halal: "Halal",
      gluten_free: "Gluten Free",
      lactose_free: "Lactose Free",
    },
    sl: {
      no_restrictions: "Brez omejitev",
      vegetarian: "Vegetarijansko",
      vegan: "Vegansko",
      halal: "Halal",
      gluten_free: "Brez glutena",
      lactose_free: "Brez laktoze",
    },
    de: {
      no_restrictions: "Keine Einschränkungen",
      vegetarian: "Vegetarisch",
      vegan: "Vegan",
      halal: "Halal",
      gluten_free: "Glutenfrei",
      lactose_free: "Laktosefrei",
    },
  } as const;

  const labels = foodPreferenceLabels[language];

  return values
    .map((value) => labels[value as keyof typeof labels] ?? value)
    .join(", ");
}

function formatConsent(
  value: boolean,
  language: AgreementBuilderInput["language"]
): string {
  if (language === "sl") {
    return value ? "Dovoljeno" : "Ni dovoljeno";
  }

  if (language === "de") {
    return value ? "Erteilt" : "Nicht erteilt";
  }

  return value ? "Granted" : "Not granted";
}

