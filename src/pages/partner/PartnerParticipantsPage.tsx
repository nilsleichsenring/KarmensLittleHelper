// src/pages/partner/PartnerParticipantsPage.tsx

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Container,
  Group,
  Loader,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { supabase } from "../../lib/supabaseClient";
import { countryCodeToName, } from "../../lib/flags";

const SUBMISSION_STORAGE_PREFIX = "partner_submission_";

type Submission = {
  id: string;
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
};

export default function PartnerParticipantsPage() {
  const { projectToken } = useParams<{ projectToken: string }>();
  const navigate = useNavigate();

  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Add modal state
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [savingAdd, setSavingAdd] = useState(false);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // -------------------------------------------------------------
  // Load submissionId from localStorage
  // -------------------------------------------------------------
  useEffect(() => {
    if (!projectToken) {
      setErrorMessage("Invalid access link.");
      setLoading(false);
      return;
    }

    const key = SUBMISSION_STORAGE_PREFIX + projectToken;
    const stored = localStorage.getItem(key);

    if (!stored) {
      setErrorMessage("No submission found. Please start again.");
      setLoading(false);
      return;
    }

    setSubmissionId(stored);
  }, [projectToken]);

  // -------------------------------------------------------------
  // Load submission + participants
  // -------------------------------------------------------------
  useEffect(() => {
    async function load() {
      if (!submissionId) return;

      setLoading(true);
      setErrorMessage(null);

      // Load submission (for country + status)
      const { data: sub, error: subError } = await supabase
        .from("project_partner_submissions")
        .select("id, country_code, organisation_name, submitted")
        .eq("id", submissionId)
        .single();

      if (subError || !sub) {
        console.error(subError);
        setErrorMessage("Could not load submission.");
        setLoading(false);
        return;
      }

      const subTyped = sub as Submission;
      setSubmission(subTyped);

      if (subTyped.submitted) {
        // Falls schon eingereicht → direkt zum Done-Screen
        navigate(`/p/${projectToken}/done`, { replace: true });
        return;
      }

      // Load participants
      const { data: parts, error: partsError } = await supabase
        .from("participants")
        .select("id, full_name, residence_country, is_green_travel, notes")
        .eq("project_partner_submission_id", submissionId)
        .order("full_name", { ascending: true });

      if (partsError) {
        console.error(partsError);
        setErrorMessage("Could not load participants.");
        setParticipants([]);
        setLoading(false);
        return;
      }

      setParticipants((parts || []) as Participant[]);
      setLoading(false);
    }

    load();
  }, [submissionId, navigate, projectToken]);

  // -------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // Add participant
  // -------------------------------------------------------------
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
        full_name: newName.trim(),
        residence_country: submission.country_code, // auto from submission
        notes: newNotes.trim() || null,
      })
      .select()
      .single();

    setSavingAdd(false);

    if (error || !data) {
      console.error(error);
      setErrorMessage("Could not add participant.");
      return;
    }

    setParticipants((prev) => [...prev, data as Participant]);
    resetAddForm();
    setAddOpen(false);
  }

  // -------------------------------------------------------------
  // Edit participant
  // -------------------------------------------------------------
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

    setEditOpen(false);
  }

  // -------------------------------------------------------------
  // Delete participant
  // -------------------------------------------------------------
  async function handleDeleteParticipant(id: string) {
    if (!submissionId) return;

    setDeletingId(id);
    setErrorMessage(null);

    const { error } = await supabase
      .from("participants")
      .delete()
      .eq("id", id)
      .eq("project_partner_submission_id", submissionId);

    setDeletingId(null);

    if (error) {
      console.error(error);
      setErrorMessage("Could not delete participant.");
      return;
    }

    setParticipants((prev) => prev.filter((p) => p.id !== id));
  }

  // -------------------------------------------------------------
  // Continue → tickets
  // -------------------------------------------------------------
  function handleContinue() {
    if (!projectToken) return;
    navigate(`/p/${projectToken}/tickets`);
  }

  // -------------------------------------------------------------
  // Reset for testing
  // -------------------------------------------------------------
  function handleResetForTesting() {
    if (!projectToken) return;
    const key = SUBMISSION_STORAGE_PREFIX + projectToken;
    localStorage.removeItem(key);
    navigate(`/p/${projectToken}`, { replace: true });
  }

  // -------------------------------------------------------------
  // Render
  // -------------------------------------------------------------
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
            Submission could not be loaded. Please contact the host
            organisation.
          </Alert>
        </Stack>
      </Container>
    );
  }

  return (
    <Box style={{ minHeight: "100vh" }} bg="#f5f6fa">
      <Container size="lg" py="xl">
        <Stack gap="xl">
          {/* Header */}
          <Stack gap={4}>
            <Text size="sm" c="dimmed">
              Step 5 of 7
            </Text>
            <Title order={2}>Participants</Title>
            <Text size="sm" c="dimmed">
              Please add all people whose travel costs are included in this reimbursement 
              claim.
            </Text>
          </Stack>

          {/* Summary / Actions */}
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {participants.length} participant
              {participants.length === 1 ? "" : "s"}
            </Text>

            <Button onClick={() => setAddOpen(true)}>Add participant</Button>
          </Group>

          {/* Table */}
          <CardLikeParticipantsTable
            participants={participants}
            onEdit={openEditModal}
            onDelete={handleDeleteParticipant}
            deletingId={deletingId}
          />


          {errorMessage && <Alert color="red">{errorMessage}</Alert>}

          {/* Continue */}
          <Group justify="space-between" mt="md">
            <Text
              size="xs"
              c="dimmed"
              style={{ cursor: "pointer" }}
              onClick={handleResetForTesting}
            >
              Reset this submission (testing)
            </Text>

            <Button onClick={handleContinue}>Continue</Button>
          </Group>
        </Stack>
      </Container>

      {/* Add Modal */}
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
          {/* Full name */}
          <TextInput
            label="Full name"
            placeholder="Jane Doe"
            value={newName}
            onChange={(e) => setNewName(e.currentTarget.value)}
            withAsterisk
          />

          {/* Country of residence (read-only) */}
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

              <Text>
                {countryCodeToName(submission?.country_code ?? null)}
              </Text>
            </Group>

            <Text size="xs" c="dimmed">
              The partner organisation confirms that all participants are officially
              resident in this country.
            </Text>
          </Stack>


          {/* Notes */}
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

{/* Edit Modal */}
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

          {/* Country of residence (read-only) */}
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

              <Text>
                {countryCodeToName(submission?.country_code ?? null)}
              </Text>
            </Group>

            <Text size="xs" c="dimmed">
              The partner organisation confirms that all participants are officially
              resident in this country.
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
    </Box>
  );
}

// Kleine Hilfskomponente für die Tabelle, um den Haupt-Component schlanker zu halten
type TableProps = {
  participants: Participant[];
  onEdit: (p: Participant) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
};

function CardLikeParticipantsTable({
  participants,
  onEdit,
  onDelete,
  deletingId,
}: TableProps) {
  if (participants.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        No participants added yet.
      </Text>
    );
  }

  return (
    <>
      {/* Info-Hinweis zum Travel-Typ */}
      <Alert color="blue" variant="light" mb="sm">
        Travel type (standard / green) is determined automatically by the system
        based on the submitted tickets. No manual selection is required.
      </Alert>

      <Table striped highlightOnHover withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>

            {/* ⬇️ neue, schmale Residence-Spalte */}
            <Table.Th style={{ width: 180 }}>
              Country of residence
            </Table.Th>

            <Table.Th>Notes</Table.Th>
            <Table.Th style={{ width: 140 }}>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {participants.map((p) => (
            <Table.Tr key={p.id}>
              {/* Name */}
              <Table.Td>{p.full_name}</Table.Td>

              {/* Country of residence (Flag + Name, read-only) */}
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

              {/* Notes */}
              <Table.Td>
                {p.notes || <Text c="dimmed">—</Text>}
              </Table.Td>

              {/* Actions */}
              <Table.Td>
                <Group gap={4} justify="flex-end">
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
                    Delete
                  </Button>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </>
  );
}
