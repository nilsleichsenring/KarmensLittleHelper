import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Loader,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
  Group,
} from "@mantine/core";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

const SUBMISSION_STORAGE_PREFIX = "partner_submission_";

type Participant = {
  id: string;
  full_name: string;
  residence_country: string;
  notes: string | null;
};

export default function PartnerParticipantsPage() {
  const { projectToken } = useParams<{ projectToken: string }>();
  const navigate = useNavigate();

  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [country, setCountry] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Participant | null>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);

  // --------------------------------------------------
  // Load submissionId & country
  // --------------------------------------------------
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

    async function loadSubmission() {
      const { data, error } = await supabase
        .from("project_partner_submissions")
        .select("country_code")
        .eq("id", stored)
        .single();

      if (error || !data) {
        console.error(error);
        setErrorMessage("Could not load submission data.");
        setLoading(false);
        return;
      }

      setCountry(data.country_code);
    }

    loadSubmission();
  }, [projectToken]);

  // --------------------------------------------------
  // Load participants
  // --------------------------------------------------
  useEffect(() => {
    async function loadParticipants() {
      if (!submissionId) return;

      const { data, error } = await supabase
        .from("participants")
        .select("*")
        .eq("project_partner_submission_id", submissionId)
        .order("full_name", { ascending: true });

      if (error) {
        console.error(error);
        setErrorMessage("Could not load participants.");
        setLoading(false);
        return;
      }

      setParticipants(data || []);
      setLoading(false);
    }

    loadParticipants();
  }, [submissionId]);

  // --------------------------------------------------
  // Open Add Modal
  // --------------------------------------------------
  function openAddModal() {
    setEditing(null);
    setFullName("");
    setNotes("");
    setModalOpen(true);
  }

  // --------------------------------------------------
  // Open Edit Modal
  // --------------------------------------------------
  function openEditModal(p: Participant) {
    setEditing(p);
    setFullName(p.full_name);
    setNotes(p.notes || "");
    setModalOpen(true);
  }

  // --------------------------------------------------
  // Save participant (Add or Edit)
  // --------------------------------------------------
  async function handleSave() {
    if (!fullName.trim()) {
      setErrorMessage("Full name is required.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    // EDIT
    if (editing) {
      const { error } = await supabase
        .from("participants")
        .update({
          full_name: fullName.trim(),
          notes: notes.trim() || null,
        })
        .eq("id", editing.id);

      setSaving(false);

      if (error) {
        console.error(error);
        setErrorMessage("Could not update participant.");
        return;
      }

      // Update local list
      setParticipants((prev) =>
        prev
          .map((p) =>
            p.id === editing.id
              ? {
                  ...p,
                  full_name: fullName.trim(),
                  notes: notes.trim() || null,
                }
              : p
          )
          .sort((a, b) => a.full_name.localeCompare(b.full_name))
      );

      setModalOpen(false);
      return;
    }

    // ADD
    const { data, error } = await supabase
      .from("participants")
      .insert({
        project_partner_submission_id: submissionId,
        full_name: fullName.trim(),
        residence_country: country,
        notes: notes.trim() || null,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      console.error(error);
      setErrorMessage("Could not add participant.");
      return;
    }

    // Update local list
    setParticipants((prev) =>
      [...prev, data as Participant].sort((a, b) =>
        a.full_name.localeCompare(b.full_name)
      )
    );

    setModalOpen(false);
  }

  // --------------------------------------------------
  // Delete participant
  // --------------------------------------------------
  async function handleDelete(id: string) {
    const { error } = await supabase
      .from("participants")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Could not delete participant.");
      return;
    }

    setParticipants((prev) => prev.filter((p) => p.id !== id));
  }

  // --------------------------------------------------
  // Continue
  // --------------------------------------------------
  function handleContinue() {
    if (participants.length === 0) {
      setErrorMessage("Please add at least one participant.");
      return;
    }

    navigate(`/p/${projectToken!}/tickets`);
  }

  // --------------------------------------------------
  // Rendering
  // --------------------------------------------------
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

  if (errorMessage && participants.length === 0) {
    return (
      <Container size="sm" py="xl">
        <Stack>
          <Title order={2}>Participants</Title>
          <Alert color="red">{errorMessage}</Alert>
        </Stack>
      </Container>
    );
  }

  return (
    <Box style={{ minHeight: "100vh" }} bg="#f5f6fa">
      <Container size="sm" py="xl">
        <Stack gap="xl">
          {/* Header */}
          <Stack gap={4}>
            <Text size="sm" c="dimmed">
              Step 4
            </Text>
            <Title order={2}>Participants</Title>
            <Text size="sm" c="dimmed">
              Please add all participants. Residence must be in {country}.
            </Text>
          </Stack>

          {/* Table */}
          <Table striped highlightOnHover withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Notes</Table.Th>
                <Table.Th style={{ width: 120 }}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {participants.map((p) => (
                <Table.Tr key={p.id}>
                  <Table.Td>{p.full_name}</Table.Td>
                  <Table.Td>{p.notes || "-"}</Table.Td>
                  <Table.Td>
                    <Group gap={6}>
                      <Button
                        size="xs"
                        variant="subtle"
                        onClick={() => openEditModal(p)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="xs"
                        color="red"
                        variant="light"
                        onClick={() => handleDelete(p.id)}
                      >
                        Delete
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {participants.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={3} style={{ textAlign: "center" }}>
                    No participants added yet.
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>

          <Button onClick={openAddModal}>+ Add participant</Button>

          {errorMessage && <Alert color="red">{errorMessage}</Alert>}

          <Button onClick={handleContinue} size="md">
            Continue
          </Button>
        </Stack>
      </Container>

      {/* MODAL */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit participant" : "Add participant"}
        centered
      >
        <Stack>
          <TextInput
            label="Full name"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.currentTarget.value)}
            withAsterisk
          />

          <TextInput label="Residence country" value={country} readOnly />

          <Textarea
            label="Notes"
            placeholder="Optional notes"
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            minRows={2}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={handleSave}>
              {editing ? "Save changes" : "Add participant"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
