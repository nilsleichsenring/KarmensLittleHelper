// src/pages/partner/PartnerParticipantsPage.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { IconEye } from "@tabler/icons-react";
import { supabase } from "../../lib/supabaseClient";
import { countryCodeToName } from "../../lib/flags";

const SUBMISSION_STORAGE_PREFIX = "partner_submission_";

type Submission = {
  id: string;
  project_id: string;
  country_code: string;
  organisation_name: string;
  submitted: boolean;
};

type Participant = {
  id: string;
  full_name: string;
  residence_country: string;
  is_green_travel: boolean | null;
  notes: string | null;
  project_participant_id: string | null;
};

type ProjectParticipantSuggestion = {
  id: string;
  full_name: string;
  email: string | null;
  residence_country: string;
  food_preferences: string[] | null;
  health_issues: string | null;
  additional_information: string | null;
  media_consent: boolean | null;
  future_projects_consent: boolean | null;
  agreement_accepted_at: string | null;
  resume_token: string;
};

type LinkedProjectParticipantDetails = {
  id: string;
  full_name: string;
  email: string | null;
  residence_country: string;
  food_preferences: string[] | null;
  health_issues: string | null;
  additional_information: string | null;
  media_consent: boolean | null;
  future_projects_consent: boolean | null;
  agreement_accepted_at: string | null;
  resume_token: string;
};

export default function PartnerParticipantsPage() {
  const { projectToken } = useParams<{ projectToken: string }>();
  const navigate = useNavigate();

  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [suggestedParticipants, setSuggestedParticipants] = useState<
    ProjectParticipantSuggestion[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [savingAdd, setSavingAdd] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [usingSuggestionId, setUsingSuggestionId] = useState<string | null>(
    null
  );

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeParticipant, setActiveParticipant] = useState<Participant | null>(
    null
  );
  const [linkedProjectParticipantDetails, setLinkedProjectParticipantDetails] =
    useState<LinkedProjectParticipantDetails | null>(null);

  useEffect(() => {
    if (!projectToken) {
      setErrorMessage("Invalid access link.");
      setLoading(false);
      return;
    }

    const key = SUBMISSION_STORAGE_PREFIX + projectToken;
    const stored = localStorage.getItem(key);

    if (!stored) {
      setErrorMessage("No reimbursement claim found. Please start again.");
      setLoading(false);
      return;
    }

    setSubmissionId(stored);
  }, [projectToken]);

  useEffect(() => {
    async function load() {
      if (!submissionId) return;

      setLoading(true);
      setErrorMessage(null);

      const { data: sub, error: subError } = await supabase
        .from("project_partner_submissions")
        .select("id, project_id, country_code, organisation_name, submitted")
        .eq("id", submissionId)
        .single();

      if (subError || !sub) {
        console.error(subError);
        setErrorMessage("Could not load reimbursement claim.");
        setLoading(false);
        return;
      }

      const subTyped = sub as Submission;
      setSubmission(subTyped);

      if (subTyped.submitted) {
        navigate(`/p/${projectToken}/done`, { replace: true });
        return;
      }

      const { data: parts, error: partsError } = await supabase
        .from("participants")
        .select(
          "id, full_name, residence_country, is_green_travel, notes, project_participant_id"
        )
        .eq("project_partner_submission_id", submissionId)
        .order("full_name", { ascending: true });

      if (partsError) {
        console.error(partsError);
        setErrorMessage("Could not load participants.");
        setParticipants([]);
        setSuggestedParticipants([]);
        setLoading(false);
        return;
      }

      const loadedParticipants = (parts || []) as Participant[];
      setParticipants(loadedParticipants);

      const { data: suggestionsData, error: suggestionsError } = await supabase
        .from("project_participants")
        .select(
          `
          id,
          full_name,
          email,
          residence_country,
          food_preferences,
          health_issues,
          additional_information,
          media_consent,
          future_projects_consent,
          agreement_accepted_at,
          resume_token
        `
        )
        .eq("project_id", subTyped.project_id)
        .eq("residence_country", subTyped.country_code)
        .not("agreement_accepted_at", "is", null)
        .order("full_name", { ascending: true });

      if (suggestionsError) {
        console.error(suggestionsError);
        setErrorMessage("Could not load suggested participants.");
        setSuggestedParticipants([]);
        setLoading(false);
        return;
      }

      const linkedProjectParticipantIds = new Set(
        loadedParticipants
          .map((p) => p.project_participant_id)
          .filter((value): value is string => !!value)
      );

      const normalizedExistingNames = new Set(
        loadedParticipants.map((p) => normalizeName(p.full_name))
      );

      const filteredSuggestions = (
        (suggestionsData || []) as ProjectParticipantSuggestion[]
      ).filter((suggestion) => {
        if (linkedProjectParticipantIds.has(suggestion.id)) {
          return false;
        }

        if (normalizedExistingNames.has(normalizeName(suggestion.full_name))) {
          return false;
        }

        return true;
      });

      setSuggestedParticipants(filteredSuggestions);
      setLoading(false);
    }

    load();
  }, [submissionId, navigate, projectToken]);

  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) =>
      a.full_name.localeCompare(b.full_name)
    );
  }, [participants]);

  const sortedSuggestions = useMemo(() => {
    return [...suggestedParticipants].sort((a, b) =>
      a.full_name.localeCompare(b.full_name)
    );
  }, [suggestedParticipants]);

  function resetAddForm() {
    setNewName("");
    setNewNotes("");
  }

  function openEditModal(p: Participant) {
    setEditId(p.id);
    setEditName(p.full_name);
    setEditNotes(p.notes ?? "");
    setEditOpen(true);
  }

  function formatConfirmedAt(value: string | null) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function formatFoodPreferences(values: string[] | null) {
    if (!values || values.length === 0) return "—";

    return values
      .map((value) =>
        value
          .split("_")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ")
      )
      .join(", ");
  }

  function formatConsent(value: boolean | null) {
    if (value == null) return "—";
    return value ? "Granted" : "Not granted";
  }

  async function openDetailsModal(participant: Participant) {
    setActiveParticipant(participant);
    setLinkedProjectParticipantDetails(null);
    setDetailsOpen(true);

    if (!participant.project_participant_id) {
      return;
    }

    setDetailsLoading(true);

    const { data, error } = await supabase
      .from("project_participants")
      .select(
        `
        id,
        full_name,
        email,
        residence_country,
        food_preferences,
        health_issues,
        additional_information,
        media_consent,
        future_projects_consent,
        agreement_accepted_at,
        resume_token
      `
      )
      .eq("id", participant.project_participant_id)
      .single();

    setDetailsLoading(false);

    if (error) {
      console.error(error);
      return;
    }

    setLinkedProjectParticipantDetails(data as LinkedProjectParticipantDetails);
  }

  async function handleAddParticipant() {
    if (!submission || !submissionId) return;

    if (!newName.trim()) {
      setErrorMessage("Please enter the participant's name.");
      return;
    }

    setSavingAdd(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("participants")
      .insert({
        project_partner_submission_id: submissionId,
        project_participant_id: null,
        full_name: newName.trim(),
        residence_country: submission.country_code,
        notes: newNotes.trim() || null,
      })
      .select(
        "id, full_name, residence_country, is_green_travel, notes, project_participant_id"
      )
      .single();

    setSavingAdd(false);

    if (error || !data) {
      console.error(error);
      setErrorMessage("Could not add participant.");
      return;
    }

    const insertedParticipant = data as Participant;

    setParticipants((prev) => [...prev, insertedParticipant]);

    setSuggestedParticipants((prev) =>
      prev.filter(
        (suggestion) =>
          normalizeName(suggestion.full_name) !==
          normalizeName(insertedParticipant.full_name)
      )
    );

    resetAddForm();
    setAddOpen(false);
  }

  async function handleUseSuggestedParticipant(
    suggestion: ProjectParticipantSuggestion
  ) {
    if (!submissionId || !submission) return;

    setUsingSuggestionId(suggestion.id);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("participants")
      .insert({
        project_partner_submission_id: submissionId,
        project_participant_id: suggestion.id,
        full_name: suggestion.full_name.trim(),
        residence_country: submission.country_code,
        notes: null,
      })
      .select(
        "id, full_name, residence_country, is_green_travel, notes, project_participant_id"
      )
      .single();

    setUsingSuggestionId(null);

    if (error || !data) {
      console.error(error);
      setErrorMessage("Could not add suggested participant.");
      return;
    }

    const insertedParticipant = data as Participant;

    setParticipants((prev) => [...prev, insertedParticipant]);
    setSuggestedParticipants((prev) =>
      prev.filter((item) => item.id !== suggestion.id)
    );
  }

  async function handleEditParticipant() {
    if (!submissionId || !editId) return;

    if (!editName.trim()) {
      setErrorMessage("Please enter the participant's name.");
      return;
    }

    setSavingEdit(true);
    setErrorMessage(null);

    const { error } = await supabase
      .from("participants")
      .update({
        full_name: editName.trim(),
        notes: editNotes.trim() || null,
      })
      .eq("id", editId)
      .eq("project_partner_submission_id", submissionId);

    setSavingEdit(false);

    if (error) {
      console.error(error);
      setErrorMessage("Could not update participant.");
      return;
    }

    setParticipants((prev) =>
      prev.map((p) =>
        p.id === editId
          ? {
              ...p,
              full_name: editName.trim(),
              notes: editNotes.trim() || null,
            }
          : p
      )
    );

    if (activeParticipant?.id === editId) {
      setActiveParticipant((prev) =>
        prev
          ? {
              ...prev,
              full_name: editName.trim(),
              notes: editNotes.trim() || null,
            }
          : prev
      );
    }

    setEditOpen(false);
  }

  async function handleDeleteParticipant(id: string) {
    if (!submissionId) return;

    setDeletingId(id);
    setErrorMessage(null);

    const participantToDelete = participants.find((p) => p.id === id);

    const { error } = await supabase
      .from("participants")
      .delete()
      .eq("id", id)
      .eq("project_partner_submission_id", submissionId);

    setDeletingId(null);

    if (error) {
      console.error(error);
      setErrorMessage("Could not remove participant.");
      return;
    }

    setParticipants((prev) => prev.filter((p) => p.id !== id));

    if (activeParticipant?.id === id) {
      setDetailsOpen(false);
      setActiveParticipant(null);
      setLinkedProjectParticipantDetails(null);
    }

    if (!participantToDelete || !submission) {
      return;
    }

    if (participantToDelete.project_participant_id) {
      const { data: restoredLinkedSuggestion, error: restoreLinkedError } =
        await supabase
          .from("project_participants")
          .select(
            `
            id,
            full_name,
            email,
            residence_country,
            food_preferences,
            health_issues,
            additional_information,
            media_consent,
            future_projects_consent,
            agreement_accepted_at,
            resume_token
          `
          )
          .eq("id", participantToDelete.project_participant_id)
          .eq("project_id", submission.project_id)
          .eq("residence_country", submission.country_code)
          .not("agreement_accepted_at", "is", null)
          .single();

      if (!restoreLinkedError && restoredLinkedSuggestion) {
        setSuggestedParticipants((prev) => {
          if (prev.some((item) => item.id === restoredLinkedSuggestion.id)) {
            return prev;
          }

          return [
            ...prev,
            restoredLinkedSuggestion as ProjectParticipantSuggestion,
          ];
        });
      }

      return;
    }

    if (participantToDelete.residence_country === submission.country_code) {
      const { data: restoredSuggestions, error: restoreError } = await supabase
        .from("project_participants")
        .select(
          `
          id,
          full_name,
          email,
          residence_country,
          food_preferences,
          health_issues,
          additional_information,
          media_consent,
          future_projects_consent,
          agreement_accepted_at,
          resume_token
        `
        )
        .eq("project_id", submission.project_id)
        .eq("residence_country", submission.country_code)
        .not("agreement_accepted_at", "is", null)
        .eq("full_name", participantToDelete.full_name)
        .order("full_name", { ascending: true });

      if (!restoreError && restoredSuggestions && restoredSuggestions.length > 0) {
        setSuggestedParticipants((prev) => {
          const existingIds = new Set(prev.map((item) => item.id));
          const additions = (
            restoredSuggestions as ProjectParticipantSuggestion[]
          ).filter((item) => !existingIds.has(item.id));

          return [...prev, ...additions];
        });
      }
    }
  }

  function handleContinue() {
    if (!projectToken) return;

    if (participants.length === 0) {
      setErrorMessage("Please add at least one participant before continuing.");
      return;
    }

    navigate(`/p/${projectToken}/tickets`);
  }

  if (loading) {
    return (
      <Box
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Loader />
      </Box>
    );
  }

  if (errorMessage && !submission) {
    return (
      <Container size="sm" py="xl">
        <Stack gap="md">
          <Stack gap={4}>
            <Text size="sm" c="dimmed">
              Step 5 of 6
            </Text>

            <Title order={2}>Participants</Title>
          </Stack>

          <Alert color="red">{errorMessage}</Alert>
        </Stack>
      </Container>
    );
  }

  if (!submission) {
    return (
      <Container size="sm" py="xl">
        <Stack>
          <Title order={2}>Participants</Title>
          <Alert color="red">
            Reimbursement claim could not be loaded. Please contact the host
            organisation.
          </Alert>
        </Stack>
      </Container>
    );
  }

  return (
    <Box style={{ minHeight: "100vh" }} bg="#f5f6fa">
      <Container size="xl" py="xl">
        <Stack gap="xl">
          <Stack gap={4}>
            <Text size="sm" c="dimmed">
              Step 5 of 7
            </Text>
            <Title order={2}>Participants</Title>
            <Text size="sm" c="dimmed">
              Please add all people whose travel costs are included in this
              reimbursement claim.
            </Text>
          </Stack>

          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {participants.length} participant
              {participants.length === 1 ? "" : "s"}
            </Text>

            <Button onClick={() => setAddOpen(true)}>Add participant</Button>
          </Group>

          <SimpleGrid
            cols={{ base: 1, lg: 3 }}
            spacing="lg"
            verticalSpacing="lg"
            style={{ alignItems: "start" }}
          >
            <Box style={{ minWidth: 0 }}>
              <SuggestedParticipantsCard
                suggestions={sortedSuggestions}
                usingSuggestionId={usingSuggestionId}
                onUseParticipant={handleUseSuggestedParticipant}
                formatConfirmedAt={formatConfirmedAt}
                formatFoodPreferences={formatFoodPreferences}
              />
            </Box>

            <Box style={{ minWidth: 0, gridColumn: "span 2" }}>
              <ParticipantsInClaimCard
                participants={sortedParticipants}
                onView={openDetailsModal}
                onEdit={openEditModal}
                onDelete={handleDeleteParticipant}
                deletingId={deletingId}
              />
            </Box>
          </SimpleGrid>

          {errorMessage && <Alert color="red">{errorMessage}</Alert>}

          <Group justify="flex-end" mt="md" align="flex-start">
            <Stack gap={4} align="flex-end">
              <Button
                onClick={handleContinue}
                disabled={participants.length === 0}
              >
                Continue
              </Button>

              {participants.length === 0 && (
                <Text size="xs" c="red">
                  Please add at least one participant.
                </Text>
              )}
            </Stack>
          </Group>
        </Stack>
      </Container>

      <Modal
        opened={addOpen}
        onClose={() => {
          if (!savingAdd) {
            setAddOpen(false);
            resetAddForm();
          }
        }}
        title="Add participant"
        centered
      >
        <Stack gap="sm">
          <TextInput
            label="Full name"
            placeholder="Jane Doe"
            value={newName}
            onChange={(e) => setNewName(e.currentTarget.value)}
            withAsterisk
          />

          <Stack gap={4}>
            <Text size="sm" fw={500}>
              Country of residence
            </Text>

            <Group gap="sm">
              <img
                src={`/flags/${submission?.country_code}.svg`}
                alt={submission?.country_code ?? "Country flag"}
                style={{
                  width: 24,
                  height: 16,
                  objectFit: "contain",
                }}
              />

              <Text>{countryCodeToName(submission?.country_code ?? null)}</Text>
            </Group>

            <Text size="xs" c="dimmed">
              The partner organisation confirms that all participants are
              officially resident in this country.
            </Text>
          </Stack>

          <Textarea
            label="Notes (optional)"
            minRows={2}
            value={newNotes}
            onChange={(e) => setNewNotes(e.currentTarget.value)}
          />

          <Button onClick={handleAddParticipant} loading={savingAdd}>
            Save participant
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={editOpen}
        onClose={() => {
          if (!savingEdit) {
            setEditOpen(false);
          }
        }}
        title="Edit participant"
        centered
      >
        <Stack gap="sm">
          <TextInput
            label="Full name"
            value={editName}
            onChange={(e) => setEditName(e.currentTarget.value)}
            withAsterisk
          />

          <Stack gap={4}>
            <Text size="sm" fw={500}>
              Country of residence
            </Text>

            <Group gap="sm">
              <img
                src={`/flags/${submission?.country_code?.toUpperCase()}.svg`}
                alt={submission?.country_code ?? "Country flag"}
                style={{
                  width: 24,
                  height: 16,
                  objectFit: "contain",
                }}
              />

              <Text>{countryCodeToName(submission?.country_code ?? null)}</Text>
            </Group>

            <Text size="xs" c="dimmed">
              The partner organisation confirms that all participants are
              officially resident in this country.
            </Text>
          </Stack>

          <Textarea
            label="Notes (optional)"
            minRows={2}
            value={editNotes}
            onChange={(e) => setEditNotes(e.currentTarget.value)}
          />

          <Button onClick={handleEditParticipant} loading={savingEdit}>
            Save changes
          </Button>
        </Stack>
      </Modal>

      <ParticipantDetailsModal
        opened={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setActiveParticipant(null);
          setLinkedProjectParticipantDetails(null);
        }}
        participant={activeParticipant}
        linkedDetails={linkedProjectParticipantDetails}
        loading={detailsLoading}
        formatConfirmedAt={formatConfirmedAt}
        formatFoodPreferences={formatFoodPreferences}
        formatConsent={formatConsent}
      />
    </Box>
  );
}

function normalizeName(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

type SuggestedParticipantsCardProps = {
  suggestions: ProjectParticipantSuggestion[];
  usingSuggestionId: string | null;
  onUseParticipant: (suggestion: ProjectParticipantSuggestion) => Promise<void>;
  formatConfirmedAt: (value: string | null) => string;
  formatFoodPreferences: (values: string[] | null) => string;
};

function SuggestedParticipantsCard({
  suggestions,
  usingSuggestionId,
  onUseParticipant,
  formatConfirmedAt,
  formatFoodPreferences,
}: SuggestedParticipantsCardProps) {
  if (suggestions.length === 0) {
    return (
      <Card withBorder radius="md" p="lg">
        <Stack gap="xs">
          <Title order={4}>Suggested participants</Title>
          <Text size="sm" c="dimmed">
            No confirmed project-wide participants match this partner&apos;s
            country at the moment.
          </Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="md">
        <Stack gap="xs">
          <Title order={4}>Suggested participants</Title>
          <Text size="sm" c="dimmed">
            These confirmed participant onboarding entries match the current
            project and residence country. You can add them directly to this
            reimbursement claim.
          </Text>
        </Stack>

        <Stack gap="sm">
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id} withBorder radius="md" p="md">
              <Stack gap="sm">
                <Group justify="space-between" align="flex-start">
                  <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={600}>{suggestion.full_name}</Text>
                    <Text size="sm" c="dimmed" style={{ wordBreak: "break-word" }}>
                      {suggestion.email || "No email"}
                    </Text>
                  </Stack>

                  <Button
                    size="xs"
                    loading={usingSuggestionId === suggestion.id}
                    onClick={() => onUseParticipant(suggestion)}
                  >
                    Use participant
                  </Button>
                </Group>

                <Stack gap={4}>
                  <Text size="sm">
                    <strong>Confirmed:</strong>{" "}
                    {formatConfirmedAt(suggestion.agreement_accepted_at)}
                  </Text>

                  <Text size="sm">
                    <strong>Food preferences:</strong>{" "}
                    {formatFoodPreferences(suggestion.food_preferences)}
                  </Text>
                </Stack>

                {suggestion.additional_information && (
                  <Text size="sm" c="dimmed" style={{ whiteSpace: "pre-wrap" }}>
                    {suggestion.additional_information}
                  </Text>
                )}
              </Stack>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}

type ParticipantsInClaimCardProps = {
  participants: Participant[];
  onView: (p: Participant) => void;
  onEdit: (p: Participant) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
};

function ParticipantsInClaimCard({
  participants,
  onView,
  onEdit,
  onDelete,
  deletingId,
}: ParticipantsInClaimCardProps) {
  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="md">
        <Stack gap="xs">
          <Title order={4}>Participants in this reimbursement claim</Title>
          <Text size="sm" c="dimmed">
            These participants are currently included in this reimbursement
            claim.
          </Text>
        </Stack>

        <Alert color="blue" variant="light">
          Travel type (standard / green) is determined automatically by the
          system based on the submitted tickets. No manual selection is
          required.
        </Alert>

        {participants.length === 0 ? (
          <Text c="dimmed" size="sm">
            No participants added yet.
          </Text>
        ) : (
          <Box style={{ overflowX: "auto" }}>
            <Table striped highlightOnHover withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th style={{ width: 220 }}>Country of residence</Table.Th>
                  <Table.Th>Notes</Table.Th>
                  <Table.Th style={{ width: 170 }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {participants.map((p) => (
                  <Table.Tr key={p.id}>
                    <Table.Td>{p.full_name}</Table.Td>

                    <Table.Td>
                      <Group gap={6} wrap="nowrap">
                        <img
                          src={`/flags/${p.residence_country.toUpperCase()}.svg`}
                          alt={p.residence_country}
                          style={{
                            width: 20,
                            height: 14,
                            objectFit: "contain",
                            flexShrink: 0,
                          }}
                        />
                        <Text size="sm" style={{ whiteSpace: "nowrap" }}>
                          {countryCodeToName(p.residence_country)}
                        </Text>
                      </Group>
                    </Table.Td>

                    <Table.Td>{p.notes || <Text c="dimmed">—</Text>}</Table.Td>

                    <Table.Td>
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        <ActionIcon
                          variant="subtle"
                          aria-label="Open participant details"
                          onClick={() => onView(p)}
                        >
                          <IconEye size={18} />
                        </ActionIcon>

                        <Button
                          size="xs"
                          variant="subtle"
                          onClick={() => onEdit(p)}
                        >
                          Edit
                        </Button>

                        <Button
                          size="xs"
                          variant="subtle"
                          color="red"
                          loading={deletingId === p.id}
                          onClick={() => onDelete(p.id)}
                        >
                          Remove
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
        )}
      </Stack>
    </Card>
  );
}

type ParticipantDetailsModalProps = {
  opened: boolean;
  onClose: () => void;
  participant: Participant | null;
  linkedDetails: LinkedProjectParticipantDetails | null;
  loading: boolean;
  formatConfirmedAt: (value: string | null) => string;
  formatFoodPreferences: (values: string[] | null) => string;
  formatConsent: (value: boolean | null) => string;
};

function ParticipantDetailsModal({
  opened,
  onClose,
  participant,
  linkedDetails,
  loading,
  formatConfirmedAt,
  formatFoodPreferences,
  formatConsent,
}: ParticipantDetailsModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Participant details"
      centered
      size="lg"
    >
      {!participant ? (
        <Text size="sm" c="dimmed">
          No participant selected.
        </Text>
      ) : (
        <Stack gap="lg">
          <Stack gap="xs">
            <Title order={5}>Included in this reimbursement claim</Title>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Stack gap={2}>
                <Text size="xs" c="dimmed">
                  Full name
                </Text>
                <Text size="sm">{participant.full_name || "—"}</Text>
              </Stack>

              <Stack gap={2}>
                <Text size="xs" c="dimmed">
                  Country of residence
                </Text>
                <Text size="sm">
                  {countryCodeToName(participant.residence_country)}
                </Text>
              </Stack>
            </SimpleGrid>

            <Stack gap={2}>
              <Text size="xs" c="dimmed">
                Notes
              </Text>
              <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                {participant.notes || "—"}
              </Text>
            </Stack>

            <Stack gap={2}>
              <Text size="xs" c="dimmed">
                Linked project participant
              </Text>
              <Text size="sm">
                {participant.project_participant_id ? "Yes" : "No"}
              </Text>
            </Stack>
          </Stack>

          {participant.project_participant_id && (
            <Card withBorder radius="md" p="md">
              <Stack gap="md">
                <Group justify="space-between" align="center">
                  <Title order={5}>Linked participant profile</Title>
                  {loading && <Loader size="sm" />}
                </Group>

                {!loading && !linkedDetails && (
                  <Alert color="yellow" variant="light">
                    Linked participant details could not be loaded.
                  </Alert>
                )}

                {!loading && linkedDetails && (
                  <>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                      <Stack gap={2}>
                        <Text size="xs" c="dimmed">
                          Full name
                        </Text>
                        <Text size="sm">{linkedDetails.full_name || "—"}</Text>
                      </Stack>

                      <Stack gap={2}>
                        <Text size="xs" c="dimmed">
                          Email
                        </Text>
                        <Text size="sm">{linkedDetails.email || "—"}</Text>
                      </Stack>

                      <Stack gap={2}>
                        <Text size="xs" c="dimmed">
                          Residence country
                        </Text>
                        <Text size="sm">
                          {countryCodeToName(linkedDetails.residence_country)}
                        </Text>
                      </Stack>

                      <Stack gap={2}>
                        <Text size="xs" c="dimmed">
                          Agreement status
                        </Text>
                        <Text size="sm">
                          {linkedDetails.agreement_accepted_at
                            ? "Confirmed"
                            : "Open"}
                        </Text>
                      </Stack>

                      <Stack gap={2}>
                        <Text size="xs" c="dimmed">
                          Confirmed at
                        </Text>
                        <Text size="sm">
                          {formatConfirmedAt(linkedDetails.agreement_accepted_at)}
                        </Text>
                      </Stack>

                      <Stack gap={2}>
                        <Text size="xs" c="dimmed">
                          Resume token
                        </Text>
                        <Text size="sm" style={{ wordBreak: "break-all" }}>
                          {linkedDetails.resume_token || "—"}
                        </Text>
                      </Stack>
                    </SimpleGrid>

                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                      <Stack gap={2}>
                        <Text size="xs" c="dimmed">
                          Food preferences
                        </Text>
                        <Text size="sm">
                          {formatFoodPreferences(linkedDetails.food_preferences)}
                        </Text>
                      </Stack>

                      <Stack gap={2}>
                        <Text size="xs" c="dimmed">
                          Media consent
                        </Text>
                        <Text size="sm">
                          {formatConsent(linkedDetails.media_consent)}
                        </Text>
                      </Stack>

                      <Stack gap={2}>
                        <Text size="xs" c="dimmed">
                          Future projects consent
                        </Text>
                        <Text size="sm">
                          {formatConsent(linkedDetails.future_projects_consent)}
                        </Text>
                      </Stack>
                    </SimpleGrid>

                    <Stack gap={2}>
                      <Text size="xs" c="dimmed">
                        Health issues
                      </Text>
                      <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                        {linkedDetails.health_issues || "—"}
                      </Text>
                    </Stack>

                    <Stack gap={2}>
                      <Text size="xs" c="dimmed">
                        Additional information
                      </Text>
                      <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                        {linkedDetails.additional_information || "—"}
                      </Text>
                    </Stack>
                  </>
                )}
              </Stack>
            </Card>
          )}
        </Stack>
      )}
    </Modal>
  );
}