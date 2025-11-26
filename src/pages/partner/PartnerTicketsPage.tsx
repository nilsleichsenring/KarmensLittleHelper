import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Container,
  FileInput,
  Group,
  Loader,
  Modal,
  MultiSelect,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

const SUBMISSION_STORAGE_PREFIX = "partner_submission_";

type Participant = {
  id: string;
  full_name: string;
};

type Ticket = {
  id: string;
  from_location: string;
  to_location: string;
  travel_mode: string;
  currency: string;
  amount_eur: number;
  amount_original: number | null;
  file_url: string;
};

type TicketWithParticipants = Ticket & {
  participantIds: string[];
};

const MODE_OPTIONS = [
  { value: "Flight", label: "Flight" },
  { value: "Train", label: "Train" },
  { value: "Bus", label: "Bus" },
  { value: "Other", label: "Other" },
];

const CURRENCY_OPTIONS = [
  { value: "EUR", label: "EUR" },
  { value: "PLN", label: "PLN" },
  { value: "CZK", label: "CZK" },
  { value: "HUF", label: "HUF" },
  { value: "RON", label: "RON" },
  { value: "BGN", label: "BGN" },
  { value: "HRK", label: "HRK" },
  { value: "SEK", label: "SEK" },
  { value: "NOK", label: "NOK" },
  { value: "DKK", label: "DKK" },
  { value: "CHF", label: "CHF" },
  { value: "GBP", label: "GBP" },
];

export default function PartnerTicketsPage() {
  const { projectToken } = useParams<{ projectToken: string }>();
  const navigate = useNavigate();

  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tickets, setTickets] = useState<TicketWithParticipants[]>([]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketWithParticipants | null>(null);

  // Form State
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [mode, setMode] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string | null>("EUR");
  const [amountOriginal, setAmountOriginal] = useState("");
  const [amountEur, setAmountEur] = useState("");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  // --------------------------------------------------
  // Load submissionId
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
  }, [projectToken]);

  // --------------------------------------------------
  // Load participants and tickets
  // --------------------------------------------------
  useEffect(() => {
    async function loadData() {
      if (!submissionId) return;

      setLoading(true);
      setErrorMessage(null);

      // Load participants
      const { data: participantRows, error: participantError } = await supabase
        .from("participants")
        .select("id, full_name")
        .eq("project_partner_submission_id", submissionId)
        .order("full_name", { ascending: true });

      if (participantError) {
        console.error(participantError);
        setErrorMessage("Could not load participants.");
        setLoading(false);
        return;
      }

      const participantsList = (participantRows || []) as Participant[];
      setParticipants(participantsList);

      // Load tickets
      const { data: ticketRows, error: ticketError } = await supabase
        .from("tickets")
        .select("*")
        .eq("project_partner_submission_id", submissionId)
        .order("created_at", { ascending: true });

      if (ticketError) {
        console.error(ticketError);
        setErrorMessage("Could not load tickets.");
        setLoading(false);
        return;
      }

      const ticketsBase = (ticketRows || []) as Ticket[];
      if (ticketsBase.length === 0) {
        setTickets([]);
        setLoading(false);
        return;
      }

      const ticketIds = ticketsBase.map((t) => t.id);

      const { data: linkRows, error: linkError } = await supabase
        .from("ticket_participants")
        .select("ticket_id, participant_id")
        .in("ticket_id", ticketIds);

      if (linkError) {
        console.error(linkError);
        setErrorMessage("Could not load ticket participants.");
        setLoading(false);
        return;
      }

      // Map format: ticket_id → [participants...]
      const map: Record<string, string[]> = {};
      (linkRows || []).forEach((row: any) => {
        if (!map[row.ticket_id]) map[row.ticket_id] = [];
        map[row.ticket_id].push(row.participant_id);
      });

      const combined: TicketWithParticipants[] = ticketsBase.map((t) => ({
        ...t,
        participantIds: map[t.id] || [],
      }));

      setTickets(combined);
      setLoading(false);
    }

    loadData();
  }, [submissionId]);

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------
  const participantOptions = participants.map((p) => ({
    value: p.id,
    label: p.full_name,
  }));

  function resetForm() {
    setFromLocation("");
    setToLocation("");
    setMode(null);
    setCurrency("EUR");
    setAmountOriginal("");
    setAmountEur("");
    setSelectedParticipantIds([]);
    setFile(null);
    setExistingFileUrl(null);
    setErrorMessage(null);
    setEditingTicket(null);
  }

  function openAddModal() {
    resetForm();
    setModalOpen(true);
  }

  function openEditModal(ticket: TicketWithParticipants) {
    setEditingTicket(ticket);
    setFromLocation(ticket.from_location);
    setToLocation(ticket.to_location);
    setMode(ticket.travel_mode);
    setCurrency(ticket.currency);
    setAmountOriginal(ticket.amount_original?.toString() ?? "");
    setAmountEur(ticket.amount_eur.toString());
    setSelectedParticipantIds(ticket.participantIds);
    setFile(null);
    setExistingFileUrl(ticket.file_url);
    setErrorMessage(null);
    setModalOpen(true);
  }

  // --------------------------------------------------
  // Save ticket (Add or Edit)
  // --------------------------------------------------
  async function handleSaveTicket() {
    if (!submissionId) return;

    setErrorMessage(null);

    // Basic required fields
    if (!fromLocation.trim()) return setErrorMessage("Please enter From.");
    if (!toLocation.trim()) return setErrorMessage("Please enter To.");
    if (!mode) return setErrorMessage("Please select a mode of travel.");
    if (!currency) return setErrorMessage("Please select a currency.");
    if (selectedParticipantIds.length === 0)
      return setErrorMessage("Please assign at least one participant.");

    // Amount logic
    let original = amountOriginal.trim();
    let eur = amountEur.trim();

    if (currency === "EUR") {
      if (!eur)
        return setErrorMessage("Please enter the amount in EUR.");
      original = ""; // not used
    } else {
      if (!original || !eur)
        return setErrorMessage(
          "Please enter both the original amount and the EUR amount."
        );
    }

    // Convert to numbers
    const originalNumber =
      currency === "EUR"
        ? null
        : Number(original.replace(",", "."));

    if (originalNumber !== null && isNaN(originalNumber))
      return setErrorMessage("Original amount is not a valid number.");

    const eurNumber = Number(eur.replace(",", "."));
    if (isNaN(eurNumber))
      return setErrorMessage("EUR amount is not a valid number.");

    // File handling
    if (!editingTicket && !file)
      return setErrorMessage("Please upload the ticket as PDF.");

    if (editingTicket && !existingFileUrl && !file)
      return setErrorMessage("Please upload the ticket as PDF.");

    setSaving(true);

    try {
      let fileUrlToUse = existingFileUrl;

      // Upload new PDF if provided
      if (file) {
        const path = `${submissionId}/ticket-${crypto.randomUUID()}.pdf`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("tickets")
          .upload(path, file);

        if (uploadError || !uploadData) {
          console.error(uploadError);
          setErrorMessage("Could not upload file.");
          setSaving(false);
          return;
        }

        fileUrlToUse = uploadData.path;
      }

      if (!fileUrlToUse) {
        setErrorMessage("Ticket file missing.");
        setSaving(false);
        return;
      }

      // ADD
      if (!editingTicket) {
        const { data: newTicketData, error: insertError } = await supabase
          .from("tickets")
          .insert({
            project_partner_submission_id: submissionId,
            from_location: fromLocation.trim(),
            to_location: toLocation.trim(),
            travel_mode: mode,
            currency,
            amount_original: originalNumber,
            amount_eur: eurNumber,
            file_url: fileUrlToUse,
          })
          .select()
          .single();

        if (insertError || !newTicketData) {
          console.error(insertError);
          setErrorMessage("Could not save ticket.");
          setSaving(false);
          return;
        }

        const newTicket = newTicketData as Ticket;

        // Insert participant links
        const newLinks = selectedParticipantIds.map((pid) => ({
          ticket_id: newTicket.id,
          participant_id: pid,
        }));

        const { error: linkError } = await supabase
          .from("ticket_participants")
          .insert(newLinks);

        if (linkError) {
          console.error(linkError);
          setErrorMessage("Ticket saved, but participants not linked.");
          setSaving(false);
          return;
        }

        setTickets((prev) => [
          ...prev,
          {
            ...newTicket,
            participantIds: [...selectedParticipantIds],
          },
        ]);

        setModalOpen(false);
        setSaving(false);
        return;
      }

      // EDIT
      const { error: updateError } = await supabase
        .from("tickets")
        .update({
          from_location: fromLocation.trim(),
          to_location: toLocation.trim(),
          travel_mode: mode,
          currency,
          amount_original: originalNumber,
          amount_eur: eurNumber,
          file_url: fileUrlToUse,
        })
        .eq("id", editingTicket.id);

      if (updateError) {
        console.error(updateError);
        setErrorMessage("Could not update ticket.");
        setSaving(false);
        return;
      }

      // Update participant links
      await supabase.from("ticket_participants").delete().eq("ticket_id", editingTicket.id);

      const newLinks = selectedParticipantIds.map((pid) => ({
        ticket_id: editingTicket.id,
        participant_id: pid,
      }));

      await supabase.from("ticket_participants").insert(newLinks);

      // Update local state
      setTickets((prev) =>
        prev.map((t) =>
          t.id === editingTicket.id
            ? {
                ...t,
                from_location: fromLocation.trim(),
                to_location: toLocation.trim(),
                travel_mode: mode!,
                currency: currency!,
                amount_original: originalNumber,
                amount_eur: eurNumber,
                file_url: fileUrlToUse!,
                participantIds: [...selectedParticipantIds],
              }
            : t
        )
      );

      setModalOpen(false);
      setSaving(false);
    } catch (err) {
      console.error(err);
      setErrorMessage("Unexpected error.");
      setSaving(false);
    }
  }

  // --------------------------------------------------
  // Delete ticket
  // --------------------------------------------------
  async function handleDeleteTicket(ticketId: string) {
    await supabase.from("ticket_participants").delete().eq("ticket_id", ticketId);
    await supabase.from("tickets").delete().eq("id", ticketId);
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
  }

  // --------------------------------------------------
  // Continue
  // --------------------------------------------------
  function handleContinue() {
    if (tickets.length === 0)
      return setErrorMessage("Please add at least one ticket before continuing.");
    navigate(`/p/${projectToken!}/submit`);
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

  const participantNameMap = new Map<string, string>();
  participants.forEach((p) => participantNameMap.set(p.id, p.full_name));

  return (
    <Box style={{ minHeight: "100vh" }} bg="#f5f6fa">
      <Container size="lg" py="xl">
        <Stack gap="xl">
          <Stack gap={4}>
            <Text size="sm" c="dimmed">
              Step 5
            </Text>
            <Title order={2}>Travel tickets</Title>
          </Stack>

          <Table striped highlightOnHover withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Route</Table.Th>
                <Table.Th>Mode</Table.Th>
                <Table.Th>EUR</Table.Th>
                <Table.Th>Participants</Table.Th>
                <Table.Th style={{ width: 160 }}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {tickets.map((t) => (
                <Table.Tr key={t.id}>
                  <Table.Td>{t.from_location} → {t.to_location}</Table.Td>
                  <Table.Td>{t.travel_mode}</Table.Td>
                  <Table.Td>{t.amount_eur.toFixed(2)}</Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {t.participantIds.map((pid) => (
                        <Badge key={pid} variant="light">
                          {participantNameMap.get(pid)}
                        </Badge>
                      ))}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={6}>
                      <Button size="xs" variant="subtle" onClick={() => openEditModal(t)}>
                        Edit
                      </Button>
                      <Button
                        size="xs"
                        color="red"
                        variant="light"
                        onClick={() => handleDeleteTicket(t.id)}
                      >
                        Delete
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {tickets.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={5} style={{ textAlign: "center" }}>
                    No tickets added yet.
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>

          <Group justify="space-between">
            <Button onClick={openAddModal}>+ Add ticket</Button>

            {errorMessage && <Alert color="red">{errorMessage}</Alert>}

            <Button onClick={handleContinue}>Continue</Button>
          </Group>
        </Stack>
      </Container>

      {/* Modal */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTicket ? "Edit ticket" : "Add ticket"}
        size="lg"
        centered
      >
        <Stack gap="md">
          {/* Travel details */}
          <Stack gap="xs">
            <Title order={5}>Travel details</Title>
            <Group grow>
              <TextInput
                label="From"
                placeholder="Bremen"
                value={fromLocation}
                onChange={(e) => setFromLocation(e.currentTarget.value)}
                withAsterisk
              />
              <TextInput
                label="To"
                placeholder="Amarante"
                value={toLocation}
                onChange={(e) => setToLocation(e.currentTarget.value)}
                withAsterisk
              />
            </Group>

            <Select
              label="Mode of travel"
              placeholder="Select mode"
              data={MODE_OPTIONS}
              value={mode}
              onChange={setMode}
              withAsterisk
            />
          </Stack>

          {/* Currency & amounts */}
          <Stack gap="xs">
            <Title order={5}>Amounts</Title>

            <Group grow>
              <Select
                label="Currency"
                data={CURRENCY_OPTIONS}
                value={currency}
                onChange={(val) => {
                  setCurrency(val);
                  if (val === "EUR") {
                    setAmountOriginal("");
                  }
                }}
                withAsterisk
              />

              {currency !== "EUR" && (
                <TextInput
                  label={`Original amount (${currency})`}
                  placeholder="0.00"
                  value={amountOriginal}
                  onChange={(e) => setAmountOriginal(e.currentTarget.value)}
                  withAsterisk
                />
              )}

              <TextInput
                label="Amount in EUR"
                placeholder="0.00"
                value={amountEur}
                onChange={(e) => setAmountEur(e.currentTarget.value)}
                withAsterisk
              />
            </Group>

            <Text size="xs" c="dimmed">
              For EUR tickets, only the EUR amount is required.  
              For all other currencies, both fields are required.
            </Text>
          </Stack>

          {/* File upload */}
          <Stack gap="xs">
            <Title order={5}>Ticket file</Title>

            <FileInput
              label={editingTicket ? "Replace PDF (optional)" : "Upload PDF"}
              placeholder="Upload ticket as PDF"
              accept="application/pdf"
              value={file}
              onChange={setFile}
            />

            {editingTicket && existingFileUrl && (
              <Text size="xs" c="dimmed">
                A file is already uploaded. You may keep it or replace it.
              </Text>
            )}
          </Stack>

          {/* Participants */}
          <Stack gap="xs">
            <Title order={5}>Assign participants</Title>
            <MultiSelect
              data={participantOptions}
              value={selectedParticipantIds}
              onChange={setSelectedParticipantIds}
              label="Participants"
              withAsterisk
            />
            <Text size="xs" c="dimmed">
              Select all participants that are covered by this ticket.
            </Text>
          </Stack>

          {errorMessage && <Alert color="red">{errorMessage}</Alert>}

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={handleSaveTicket}>
              {editingTicket ? "Save changes" : "Save ticket"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
