import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Group,
  Loader,
  MultiSelect,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";

import {
  ArrowLeftCircle,
  CheckCircle2,
  FileText,
  Info,
  Lock,
  ShieldCheck,
  User,
} from "lucide-react";

import StepNavigation, {
  type StepNavigationItem,
} from "../../components/StepNavigation";

import { supabase } from "../../lib/supabaseClient";
import { buildAgreement } from "../../lib/participantAgreement/buildAgreement";
import {
  getAgreementConfig,
} from "../../lib/participantAgreement/config";
import type { AgreementSectionId } from "../../lib/participantAgreement/types";
import { generatePdf } from "../../lib/pdf/pdfEngine";
import { renderParticipantAgreementPdf } from "../../lib/pdf/renderers/participantAgreement";

type Project = {
  id: string;
  name: string;
  participant_access_token: string | null;
  agreement_config_json: unknown | null;
};

type ProjectParticipant = {
  id: string;
  project_id: string;
  resume_token: string;
  full_name: string;
  email: string;
  residence_country: string;

  food_preferences: string[];
  health_issues: string | null;
  additional_information: string | null;

  media_consent: boolean;
  future_projects_consent: boolean;

  agreement_accepted_at: string | null;
  agreement_snapshot_json: unknown | null;
};

type ProjectCountry = {
  country_code: string;
};

type OnboardingStep = "intro" | "data" | "agreement" | "done";

type AgreementWizardStep = {
  id: string;
  label: string;
  sectionIds: string[];
};

type AgreementWizardStepId = AgreementWizardStep["id"];



const AGREEMENT_WIZARD_STEPS: AgreementWizardStep[] = [
  {
    id: "context",
    label: "Context",
    sectionIds: ["intro", "project_summary"],
  },
  {
    id: "responsibilities",
    label: "Responsibilities",
    sectionIds: ["host_responsibilities", "participant_responsibilities"],
  },
  {
    id: "participant_information",
    label: "Your information",
    sectionIds: ["participant_identity"],
  },
  {
    id: "consents",
    label: "Consents",
    sectionIds: ["consent_overview"],
  },
  {
    id: "data_protection",
    label: "Data protection",
    sectionIds: ["data_protection"],
  },
  {
    id: "optional_terms",
    label: "Additional terms",
    sectionIds: [
      "participation_fee",
      "withdrawal_policy",
      "travel_cost_notice",
      "media_consent_clause",
      "future_projects_clause",
    ],
  },
  {
    id: "confirmation",
    label: "Confirmation",
    sectionIds: ["closing"],
  },
];

export default function ParticipantOnboardingPage() {
  const { projectToken } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const resumeToken = searchParams.get("resume");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [participant, setParticipant] = useState<ProjectParticipant | null>(null);
  const [countries, setCountries] = useState<ProjectCountry[]>([]);

  const [step, setStep] = useState<OnboardingStep>("intro");
  const [agreementSectionIndex, setAgreementSectionIndex] = useState(0);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [residenceCountry, setResidenceCountry] = useState("");

  const [foodPreferences, setFoodPreferences] = useState<string[]>([]);
  const [healthIssues, setHealthIssues] = useState("");
  const [mediaConsent, setMediaConsent] = useState(false);
  const [futureProjectsConsent, setFutureProjectsConsent] = useState(false);
  const [additionalInformation, setAdditionalInformation] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [generatedResumeToken, setGeneratedResumeToken] = useState<string | null>(
    null
  );
  const [copySuccess, setCopySuccess] = useState(false);

  const effectiveResumeToken = generatedResumeToken ?? resumeToken ?? null;

  const resumeLink =
    projectToken && effectiveResumeToken
      ? `${window.location.origin}/participant/${projectToken}?resume=${effectiveResumeToken}`
      : null;

  useEffect(() => {
    async function loadData() {
      if (!projectToken) {
        setError("Invalid participant link.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("id, name, participant_access_token, agreement_config_json")
        .eq("participant_access_token", projectToken)
        .single();

      if (projectError || !projectData) {
        console.error(projectError);
        setError("Project could not be found.");
        setLoading(false);
        return;
      }

      const typedProject = projectData as Project;
      setProject(typedProject);

      const { data: countryData, error: countryError } = await supabase
        .from("project_countries")
        .select("country_code")
        .eq("project_id", typedProject.id)
        .order("country_code", { ascending: true });

      if (countryError) {
        console.error(countryError);
      } else {
        setCountries((countryData || []) as ProjectCountry[]);
      }

      if (!resumeToken) {
        setParticipant(null);
        setGeneratedResumeToken(null);
        setStep("intro");
        setLoading(false);
        return;
      }

      const { data: participantData, error: participantError } = await supabase
        .from("project_participants")
          .select(
            "id, project_id, resume_token, full_name, email, residence_country, food_preferences, health_issues, additional_information, media_consent, future_projects_consent, agreement_accepted_at, agreement_snapshot_json"
          )
        .eq("resume_token", resumeToken)
        .eq("project_id", typedProject.id)
        .single();

      if (participantError || !participantData) {
        console.error(participantError);
        setError("Participant could not be loaded.");
        setLoading(false);
        return;
      }

      const typedParticipant = participantData as ProjectParticipant;
      setParticipant(typedParticipant);

      setFullName(typedParticipant.full_name || "");
      setEmail(typedParticipant.email || "");
      setResidenceCountry(typedParticipant.residence_country || "");

      setFoodPreferences(typedParticipant.food_preferences || []);
      setHealthIssues(typedParticipant.health_issues || "");
      setMediaConsent(typedParticipant.media_consent || false);
      setFutureProjectsConsent(typedParticipant.future_projects_consent || false);
      setAdditionalInformation(typedParticipant.additional_information || "");

      setGeneratedResumeToken(typedParticipant.resume_token);

      if (typedParticipant.agreement_accepted_at) {
        setStep("done");
      } else {
        setStep("agreement");
      }

      setLoading(false);
    }

    loadData();
  }, [projectToken, resumeToken]);

  function hasAgreementRelevantChanges(existing: ProjectParticipant) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedHealthIssues = healthIssues.trim() || null;

    const existingFoodPreferences = [...(existing.food_preferences || [])].sort();
    const nextFoodPreferences = [...foodPreferences].sort();

    const foodPreferencesChanged =
      JSON.stringify(existingFoodPreferences) !==
      JSON.stringify(nextFoodPreferences);

    return (
      existing.full_name !== fullName.trim() ||
      existing.email !== normalizedEmail ||
      existing.residence_country !== residenceCountry ||
      foodPreferencesChanged ||
      (existing.health_issues || null) !== normalizedHealthIssues ||
      existing.media_consent !== mediaConsent ||
      existing.future_projects_consent !== futureProjectsConsent
    );
  }

  async function handleSaveParticipant() {
    if (!project) return;

    if (!fullName.trim() || !email.trim() || !residenceCountry) {
      setSaveError("Please fill all required fields.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const { data: existing, error: existingError } = await supabase
        .from("project_participants")
        .select("*")
        .eq("project_id", project.id)
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      const resumeTokenToUse = existing?.resume_token ?? crypto.randomUUID();

      const basePayload = {
        project_id: project.id,
        full_name: fullName.trim(),
        email: normalizedEmail,
        residence_country: residenceCountry,
        resume_token: resumeTokenToUse,

        food_preferences: foodPreferences,
        health_issues: healthIssues.trim() || null,
        additional_information: additionalInformation.trim() || null,

        media_consent: mediaConsent,
        future_projects_consent: futureProjectsConsent,
      };

      const shouldResetAgreement =
        existing?.agreement_accepted_at != null &&
        hasAgreementRelevantChanges(existing as ProjectParticipant);

      const payload = shouldResetAgreement
        ? {
            ...basePayload,
            agreement_accepted_at: null,
            agreement_snapshot_json: null,
          }
        : basePayload;

      if (existing) {
        const { error: updateError } = await supabase
          .from("project_participants")
          .update(payload)
          .eq("id", existing.id);

        if (updateError) {
          throw updateError;
        }

        setParticipant({
          id: existing.id,
          project_id: project.id,
          resume_token: resumeTokenToUse,
          full_name: fullName.trim(),
          email: normalizedEmail,
          residence_country: residenceCountry,

          food_preferences: foodPreferences,
          health_issues: healthIssues.trim() || null,
          additional_information: additionalInformation.trim() || null,

          media_consent: mediaConsent,
          future_projects_consent: futureProjectsConsent,

          agreement_accepted_at: shouldResetAgreement
            ? null
            : existing.agreement_accepted_at,
          agreement_snapshot_json: shouldResetAgreement
            ? null
            : existing.agreement_snapshot_json ?? null,
        });
      } else {
      const { data: inserted, error: insertError } = await supabase
        .from("project_participants")
        .insert(payload)
        .select(
          "id, project_id, resume_token, full_name, email, residence_country, food_preferences, health_issues, additional_information, media_consent, future_projects_consent, agreement_accepted_at, agreement_snapshot_json"
        )
        .single();

        if (insertError || !inserted) {
          throw insertError;
        }

        setParticipant(inserted as ProjectParticipant);
      }

      setGeneratedResumeToken(resumeTokenToUse);

      const nextStep =
        existing && !shouldResetAgreement && existing.agreement_accepted_at
          ? "done"
          : "agreement";

      if (nextStep === "agreement") {
        setAgreementSectionIndex(0);
      }

      setStep(nextStep);

      if (resumeToken !== resumeTokenToUse) {
        navigate(`/participant/${projectToken}?resume=${resumeTokenToUse}`);
      }
    } catch (err) {
      console.error(err);
      setSaveError("Saving failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmAgreement() {
    if (!participant || !agreementDocument) {
      setSaveError("Agreement could not be generated.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const acceptedAt = new Date().toISOString();

      const { error: updateError } = await supabase
        .from("project_participants")
        .update({
          agreement_version: agreementDocument.version,
          agreement_snapshot_json: agreementDocument,
          agreement_accepted_at: acceptedAt,
        })
        .eq("id", participant.id);

      if (updateError) {
        throw updateError;
      }

      setParticipant({
        ...participant,
        agreement_accepted_at: acceptedAt,
        agreement_snapshot_json: agreementDocument,
      });

      setStep("done");
    } catch (err) {
      console.error(err);
      setSaveError("Agreement confirmation failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyResumeLink() {
    if (!resumeLink) return;

    try {
      await navigator.clipboard.writeText(resumeLink);
      setCopySuccess(true);

      window.setTimeout(() => {
        setCopySuccess(false);
      }, 1500);
    } catch (err) {
      console.error(err);
    }
  }

  const agreementConfig = getAgreementConfig(
    project?.agreement_config_json
  );

  const agreementDocument =
    project && participant
      ? buildAgreement({
          version: agreementConfig.version,
          language: agreementConfig.default_language,
          project: {
            id: project.id,
            name: project.name,
          },
          participant: {
            full_name: fullName.trim(),
            email: email.trim().toLowerCase(),
            residence_country: residenceCountry,
            food_preferences: foodPreferences,
            health_issues: healthIssues.trim() || null,
            additional_information: additionalInformation.trim() || null,
            media_consent: mediaConsent,
            future_projects_consent: futureProjectsConsent,
          },
          includeOptionalSections:
            agreementConfig.enabled_section_ids as AgreementSectionId[],
        })
      : null;

  const visibleAgreementWizardSteps = agreementDocument
    ? AGREEMENT_WIZARD_STEPS.map((wizardStep) => ({
        ...wizardStep,
        sections: agreementDocument.sections.filter((section) =>
          wizardStep.sectionIds.includes(section.id)
        ),
      })).filter((wizardStep) => wizardStep.sections.length > 0)
    : [];

  const currentAgreementWizardStep =
    visibleAgreementWizardSteps[agreementSectionIndex] ?? null;

  const agreementNavigationSteps: StepNavigationItem<AgreementWizardStepId>[] =
    visibleAgreementWizardSteps.map((wizardStep, index) => {
      const isActive = index === agreementSectionIndex;
      const isCompleted = index < agreementSectionIndex;
      const isNext = index === agreementSectionIndex + 1;

      return {
        key: wizardStep.id,
        label: wizardStep.label,
        status: isActive
          ? "active"
          : isCompleted
            ? "completed"
            : isNext
              ? "available"
              : "locked",
      };
    });

  const isFirstAgreementSection = agreementSectionIndex === 0;

  const isLastAgreementSection =
    visibleAgreementWizardSteps.length > 0 &&
    agreementSectionIndex === visibleAgreementWizardSteps.length - 1;

  function handleAgreementStepClick(stepId: AgreementWizardStepId) {
    const index = visibleAgreementWizardSteps.findIndex(
      (wizardStep) => wizardStep.id === stepId
    );

    if (index < 0) return;

    setAgreementSectionIndex(index);
  }

  function goToPreviousAgreementSection() {
    setAgreementSectionIndex((current) => Math.max(current - 1, 0));
  }

  const agreementSectionIcons: Record<string, React.ReactNode> = {
    intro: <Info size={18} />,
    project_summary: <FileText size={18} />,
    host_responsibilities: <CheckCircle2 size={18} />,
    participant_responsibilities: <CheckCircle2 size={18} />,
    participant_identity: <User size={18} />,
    consent_overview: <ShieldCheck size={18} />,
    data_protection: <Lock size={18} />,
    withdrawal_policy: <ArrowLeftCircle size={18} />,
    closing: <CheckCircle2 size={18} />,
  };

  function goToNextAgreementSection() {
    setAgreementSectionIndex((current) =>
      Math.min(current + 1, visibleAgreementWizardSteps.length - 1)
    );
  }

  function renderStep() {
    switch (step) {
      case "intro":
        return (
          <Card withBorder radius="md" p="lg">
            <Stack gap="md">
              <Title order={3}>Participant Onboarding</Title>

              <Text size="sm" c="dimmed">
                You are about to register as a participant for this project.
                Please provide your information and confirm the agreement before
                the project meeting.
              </Text>

              <Text size="sm">
                <strong>Project:</strong> {project?.name}
              </Text>

              <Group justify="flex-end">
                <Button onClick={() => setStep("data")}>Continue</Button>
              </Group>
            </Stack>
          </Card>
        );

      case "data":
        return (
          <Card withBorder radius="md" p="lg">
            <Stack gap="md">
              <Title order={3}>Participant Data</Title>

              <TextInput
                label="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.currentTarget.value)}
                required
              />

              <TextInput
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
              />

              <Select
                label="Residence country"
                data={countries.map((c) => ({
                  value: c.country_code,
                  label: c.country_code,
                }))}
                value={residenceCountry}
                onChange={(value) => setResidenceCountry(value || "")}
                required
              />

              <MultiSelect
                label="Food preferences"
                data={[
                  { value: "no_restrictions", label: "No restrictions" },
                  { value: "vegetarian", label: "Vegetarian" },
                  { value: "vegan", label: "Vegan" },
                  { value: "halal", label: "Halal" },
                  { value: "gluten_free", label: "Gluten free" },
                  { value: "lactose_free", label: "Lactose free" },
                ]}
                value={foodPreferences}
                onChange={setFoodPreferences}
                searchable
                clearable
              />

              <Textarea
                label="Health issues"
                description="Allergies, illnesses, disorders, or other relevant information."
                value={healthIssues}
                onChange={(e) => setHealthIssues(e.currentTarget.value)}
                minRows={3}
              />

              <Checkbox
                label="I allow photos and videos to be used on social media and related webpages."
                checked={mediaConsent}
                onChange={(e) => setMediaConsent(e.currentTarget.checked)}
              />

              <Checkbox
                label="I allow the host organisation to send me information about future projects."
                checked={futureProjectsConsent}
                onChange={(e) => setFutureProjectsConsent(e.currentTarget.checked)}
              />

              <Textarea
                label="Additional information"
                value={additionalInformation}
                onChange={(e) => setAdditionalInformation(e.currentTarget.value)}
                minRows={3}
              />

              {saveError && <Alert color="red">{saveError}</Alert>}

              {resumeLink && (
                <Alert color="blue">
                  Your resume link:
                  <br />
                  {resumeLink}
                </Alert>
              )}

              <Group justify="space-between">
                <Button variant="default" onClick={() => setStep("intro")}>
                  Back
                </Button>

                <Button loading={saving} onClick={handleSaveParticipant}>
                  Continue
                </Button>
              </Group>
            </Stack>
          </Card>
        );

      case "agreement":
        return (
          <Card withBorder radius="md" p="lg">
            <Stack gap="lg">
              {/* Header */}
              <Stack gap={4}>
                <Title order={3}>Agreement</Title>

                {agreementDocument && currentAgreementWizardStep && (
                  <Text size="xs" c="dimmed">
                    Step {agreementSectionIndex + 1} of{" "}
                    {visibleAgreementWizardSteps.length} ·{" "}
                    {currentAgreementWizardStep.label} · Version{" "}
                    {agreementDocument.version} ·{" "}
                    {agreementDocument.language.toUpperCase()}
                  </Text>
                )}
              </Stack>

              {/* Step navigation */}
              {agreementDocument && visibleAgreementWizardSteps.length > 0 && (
                <Box
                  style={{
                    borderBottom: "1px solid #e9ecef",
                    paddingBottom: 12,
                    overflowX: "auto",
                  }}
                >
                  <StepNavigation
                    steps={agreementNavigationSteps}
                    onStepClick={handleAgreementStepClick}
                  />
                </Box>
              )}

              {/* Current wizard step */}
              {!agreementDocument || !currentAgreementWizardStep ? (
                <Text size="sm" c="dimmed">
                  Agreement preview not available yet.
                </Text>
              ) : (
                <Card withBorder radius="md" p="md">
                  <Stack gap="lg">
                    <Group
                      justify="space-between"
                      align="center"
                      pb={6}
                      style={{
                        borderBottom: "1px solid #e9ecef",
                      }}
                    >
                      <Group gap="sm">
                        <ThemeIcon variant="light" radius="xl" size="md">
                          {agreementSectionIcons[
                            currentAgreementWizardStep.sections[0]?.id ??
                              currentAgreementWizardStep.id
                          ]}
                        </ThemeIcon>

                        <Text fw={700} size="lg">
                          {currentAgreementWizardStep.label}
                        </Text>
                      </Group>
                    </Group>

                    {currentAgreementWizardStep.sections.map((section) => (
                      <Stack key={section.id} gap="sm">
                        <Text fw={600} size="md">
                          {section.title}
                        </Text>

                        {section.intro && (
                          <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
                            {section.intro}
                          </Text>
                        )}

                        {section.paragraphs.map((p: string, i: number) => (
                          <Text key={i} size="sm" style={{ lineHeight: 1.7 }}>
                            {p}
                          </Text>
                        ))}

                        {section.bullets.length > 0 && (
                          <Stack gap={6} pl="md">
                            {section.bullets.map((b: string, i: number) => (
                              <Text key={i} size="sm" style={{ lineHeight: 1.6 }}>
                                • {b}
                              </Text>
                            ))}
                          </Stack>
                        )}

                        {section.closingNote && (
                          <Text size="xs" c="dimmed" mt="xs">
                            {section.closingNote}
                          </Text>
                        )}
                      </Stack>
                    ))}
                  </Stack>
                </Card>
              )}

              {/* Error */}
              {saveError && <Alert color="red">{saveError}</Alert>}

              {/* Actions */}
              <Group justify="space-between">
                <Group>
                  <Button variant="default" onClick={() => setStep("data")}>
                    Back to data
                  </Button>

                  <Button
                    variant="light"
                    onClick={goToPreviousAgreementSection}
                    disabled={isFirstAgreementSection}
                  >
                    Previous
                  </Button>
                </Group>

                {isLastAgreementSection ? (
                  <Button loading={saving} onClick={handleConfirmAgreement}>
                    Confirm agreement
                  </Button>
                ) : (
                  <Button onClick={goToNextAgreementSection}>Next</Button>
                )}
              </Group>
            </Stack>
          </Card>
        );

      case "done":
        return (
          <Card withBorder radius="md" p="lg">
            <Stack gap="md">
              <Title order={3}>Registration completed</Title>

              <Text size="sm" c="dimmed">
                Thank you. Your participant data and agreement confirmation have
                been saved successfully.
              </Text>

              <Text size="sm">
                <strong>Project:</strong> {project?.name}
              </Text>

              <Text size="sm">
                You can use the following link to review or update your
                information later if needed:
              </Text>

              <Alert color="blue">
                <Text size="sm" style={{ wordBreak: "break-all" }}>
                  {resumeLink ?? "Resume link not available yet."}
                </Text>
              </Alert>

              <Group justify="space-between">
                <Button variant="default" onClick={() => setStep("agreement")}>
                  Back
                </Button>

                <Group>
                  <Button
                    variant="light"
                    onClick={handleCopyResumeLink}
                    disabled={!resumeLink}
                  >
                    {copySuccess ? "Copied!" : "Copy resume link"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      console.log("CLICKED");

                      if (!participant?.agreement_snapshot_json) {
                        console.log("NO SNAPSHOT");
                        return;
                      }

                      console.log("SNAPSHOT OK", participant.agreement_snapshot_json);

                      generatePdf(
                        renderParticipantAgreementPdf,
                        participant.agreement_snapshot_json,
                        "participant-agreement.pdf"
                      );
                    }}
                  >
                    Download PDF
                  </Button>
                </Group>
              </Group>
            </Stack>
          </Card>
        );

      default:
        return null;
    }
  }

  if (loading) {
    return (
      <Stack p="lg">
        <Loader />
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack p="lg">
        <Alert color="red">{error}</Alert>
      </Stack>
    );
  }

  return (
    <Stack p="lg" gap="lg">
      <Stack gap={4}>
        <Text fw={700} size="lg">
          Participant Onboarding
        </Text>

        <Text size="sm" c="dimmed">
          Current step: {step}
        </Text>
      </Stack>

      {renderStep()}
    </Stack>
  );
}