import { useEffect, useState, useRef } from "react";
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
  Radio,
} from "@mantine/core";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

import { getTravelModeLabel } from "../../lib/travel/travelIcons";
import { HelpTooltip } from "../../components/HelpTooltip";
import { openTicketFile } from "../../lib/tickets/openTicketFile";

const SUBMISSION_STORAGE_PREFIX = "partner_submission_";

type Participant = {
  id: string;
  full_name: string;
};

type TripType = "oneway" | "return" | "roundtrip";

type TravelMode =
  | "bus"
  | "carpooling"
  | "car"
  | "flight"
  | "ship"
  | "train"
  | "other";

type Ticket = {
  id: string;
  from_location: string;
  to_location: string;
  travel_mode: TravelMode;
  currency: string;
  amount_eur: number;
  amount_original: number | null;
  file_url: string;
  trip_type: TripType | null;
};


type TicketWithParticipants = Ticket & {
  participantIds: string[];
};

const MODE_OPTIONS = [
  { value: "bus", label: "Bus / Van" },
  { value: "carpooling", label: "Carpooling" },
  { value: "car", label: "Car / Motorbike" },
  { value: "flight", label: "Plane" }, // 🔥 exakt das erwartet travel.ts
  { value: "ship", label: "Ship" },
  { value: "train", label: "Train" },
  { value: "other", label: "Other" },
] as const;

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

function formatTripType(tt: TripType | null): string {
  if (!tt) return "—";
  if (tt === "oneway") return "One-way";
  if (tt === "return") return "Return";
  if (tt === "roundtrip") return "Roundtrip";
  return "—";
}

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
  const [editingTicket, setEditingTicket] =
    useState<TicketWithParticipants | null>(null);

  // Form State
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [mode, setMode] = useState<TravelMode | null>(null);

  // NEW: Trip type
  const [tripType, setTripType] = useState<TripType>("oneway");

  const [currency, setCurrency] = useState<string>("EUR");
  const [amountOriginal, setAmountOriginal] = useState("");
  const [amountEur, setAmountEur] = useState("");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    string[]
  >([]);
  const [file, setFile] = useState<File | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isReplacingFile, setIsReplacingFile] = useState(false);

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

      const rawTickets = (ticketRows || []) as any[];

      const ticketsBase: Ticket[] = rawTickets.map((t) => ({
        id: t.id,
        from_location: t.from_location,
        to_location: t.to_location,
        travel_mode: t.travel_mode,
        currency: t.currency_code ?? "EUR",
        amount_eur: t.amount_eur,
        amount_original: t.amount_original,
        file_url: t.file_url,
        trip_type: (t.trip_type as TripType | null) ?? null,
      }));

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
    setTripType("oneway");
    setCurrency("EUR");
    setAmountOriginal("");
    setAmountEur("");
    setSelectedParticipantIds([]);
    setFile(null);
    setExistingFileUrl(null);
    setIsReplacingFile(false);
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
    setTripType(ticket.trip_type ?? "oneway");
    setCurrency(ticket.currency || "EUR");
    if (ticket.currency === "EUR") {
      setAmountOriginal("");
    } else {
      setAmountOriginal(
        ticket.amount_original !== null
          ? ticket.amount_original.toString()
          : ""
      );
    }
    setAmountEur(
      ticket.amount_eur !== null
        ? ticket.amount_eur.toString()
        : ""
    );
    setSelectedParticipantIds(ticket.participantIds);
    setFile(null);
    setExistingFileUrl(ticket.file_url);
    setIsReplacingFile(false);
    setErrorMessage(null);
    setModalOpen(true);
  }

  function handleChangePdfClick() {
    fileInputRef.current?.click();
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
    if (!tripType) return setErrorMessage("Please select a trip type.");
    if (selectedParticipantIds.length === 0)
      return setErrorMessage("Please assign at least one participant.");

    // Amount logic
    let original = amountOriginal.trim();
    let eur = amountEur.trim();

    if (currency === "EUR") {
      if (!eur) return setErrorMessage("Please enter the amount in EUR.");
      original = ""; // not used
    } else {
      if (!original || !eur)
        return setErrorMessage(
          "Please enter both the original amount and the EUR amount."
        );
    }

    // Convert to numbers
    const originalNumber =
      currency === "EUR" ? null : Number(original.replace(",", "."));

    if (originalNumber !== null && isNaN(originalNumber)) {
      return setErrorMessage("Original amount is not a valid number.");
    }

    const eurNumber = Number(eur.replace(",", "."));
    if (isNaN(eurNumber)) {
      return setErrorMessage("EUR amount is not a valid number.");
    }

    // File handling

    // ADD: immer PDF nötig
    if (!editingTicket && !file)
      return setErrorMessage("Please upload the ticket as PDF.");

    // EDIT: nur wenn User ersetzen will
    if (editingTicket && isReplacingFile && !file)
      return setErrorMessage("Please upload the new PDF.");

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
            currency_code: currency,
            amount_original: originalNumber,
            amount_eur: eurNumber,
            file_url: fileUrlToUse,
            trip_type: tripType,
          })
          .select()
          .single();

        if (insertError || !newTicketData) {
          console.error(insertError);
          setErrorMessage("Could not save ticket.");
          setSaving(false);
          return;
        }

        const newTicketRow = newTicketData as any;
        const newTicket: TicketWithParticipants = {
          id: newTicketRow.id,
          from_location: newTicketRow.from_location,
          to_location: newTicketRow.to_location,
          travel_mode: newTicketRow.travel_mode,
          currency: newTicketRow.currency_code ?? currency ?? "EUR",
          amount_original: newTicketRow.amount_original,
          amount_eur: newTicketRow.amount_eur,
          file_url: newTicketRow.file_url,
          trip_type: (newTicketRow.trip_type as TripType | null) ?? tripType,
          participantIds: [...selectedParticipantIds],
        };

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

        setTickets((prev) => [...prev, newTicket]);

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
          currency_code: currency, // ✅ RICHTIGES DB-Feld
          amount_original: originalNumber,
          amount_eur: eurNumber,
          file_url: fileUrlToUse,
          trip_type: tripType,
        })
        .eq("id", editingTicket.id);

      if (updateError) {
        console.error(updateError);
        setErrorMessage("Could not update ticket.");
        setSaving(false);
        return;
      }

      // Update participant links
      await supabase
        .from("ticket_participants")
        .delete()
        .eq("ticket_id", editingTicket.id);

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
                trip_type: tripType,
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
    await supabase
      .from("ticket_participants")
      .delete()
      .eq("ticket_id", ticketId);
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
              Step 6 of 7
            </Text>
            <Title order={2}>Travel tickets</Title>
          </Stack>

          <Table striped highlightOnHover withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Route</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Mode</Table.Th>
                <Table.Th>Amount</Table.Th>
                <Table.Th>Participants</Table.Th>
                <Table.Th style={{ width: 160 }}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {tickets.map((t) => (
                <Table.Tr key={t.id}>
                  <Table.Td>
                    {t.from_location} → {t.to_location}
                  </Table.Td>
                  <Table.Td>{formatTripType(t.trip_type)}</Table.Td>
                  <Table.Td>{getTravelModeLabel(t.travel_mode)}</Table.Td>
                  <Table.Td>
                    <Stack gap={0}>
                      <Text size="sm">
                        {t.amount_eur.toFixed(2)} EUR
                      </Text>

                      {t.currency !== "EUR" && t.amount_original !== null && (
                        <Text size="xs" c="dimmed">
                          ({t.amount_original.toFixed(2)} {t.currency})
                        </Text>
                      )}
                    </Stack>
                  </Table.Td>
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
                      <Button
                        size="xs"
                        variant="subtle"
                        onClick={() => openEditModal(t)}
                      >
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
                  <Table.Td colSpan={6} style={{ textAlign: "center" }}>
                    No tickets added yet.
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>

          <Group justify="space-between" align="flex-start">
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
              label={
                <Group gap={6} align="center">
                  <span>Means of travel</span>
                  <HelpTooltip
                    label="I love u, babes! ❤️"
                  />
                </Group>
              }
              placeholder="Select mode"
              data={MODE_OPTIONS}
              value={mode}
              onChange={(value) => {
                setMode(value as TravelMode | null);
              }}
              withAsterisk
            />

            {/* NEW: Trip type */}
            <Radio.Group
              label="Trip type"
              value={tripType}
              onChange={(value) => setTripType(value as TripType)}
              withAsterisk
            >
              <Group mt="xs">
                <Radio value="oneway" label="One-way" />
                <Radio value="return" label="Return" />
                <Radio value="roundtrip" label="Roundtrip" />
              </Group>
            </Radio.Group>
          </Stack>

          {/* Currency & amounts */}
          <Stack gap="xs">
            <Group gap={6} align="center">
              <Title order={5}>Amounts</Title>
            </Group>

            <Group grow align="flex-end">
              <Select
                label={
                  <Group gap={6} align="center">
                    <span>Currency</span>
                    <HelpTooltip
                      label="💡If the ticket is in EUR, only the amount in EUR is required. If you choose another currency, please provide both the original amount and the converted amount in EUR."
                      width={300}
                    />
                  </Group>
                }
                data={CURRENCY_OPTIONS}
                value={currency}
                  onChange={(val) => {
                    const safeCurrency = val ?? "EUR";
                    setCurrency(safeCurrency);

                    if (safeCurrency === "EUR") {
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
                label={
                  <Group gap={6} align="center">
                    <span>Amount in EUR</span>
                    <HelpTooltip
                      label="Enter the TOTAL ticket amount for all selected participants. Do not enter per-person prices."
                    />
                  </Group>
                }
                placeholder="0.00"
                value={amountEur}
                onChange={(e) => setAmountEur(e.currentTarget.value)}
                withAsterisk
              />
            </Group>
          </Stack>

          {/* Ticket file */}
          <Stack gap="xs">
            <Title order={5}>Ticket file</Title>

            {/* 🔒 Hidden file input – ALWAYS mounted */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              style={{ display: "none" }}
              onChange={(e) => {
                const selectedFile = e.target.files?.[0] ?? null;

                if (!selectedFile) {
                  // User closed dialog → back to view state
                  setIsReplacingFile(false);
                  return;
                }

                setFile(selectedFile);
              }}
            />

            {/* Zustand A: PDF vorhanden, kein Ersetzen */}
            {existingFileUrl && !isReplacingFile && !file && (
              <Group justify="space-between" align="center">
                <Text size="xs" c="dimmed">
                  PDF already uploaded.
                </Text>

                <Group gap="xs">
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() => openTicketFile(existingFileUrl)}
                  >
                    View PDF
                  </Button>

                  <Button
                    size="xs"
                    variant="subtle"
                    onClick={handleChangePdfClick}
                  >
                    Change PDF
                  </Button>
                </Group>
              </Group>
            )}

            {/* Zustand B: User ersetzt PDF */}
            {isReplacingFile && file && (
              <Text size="xs" c="dimmed">
                Selected file: {file.name}
              </Text>
            )}

            {/* Zustand C: Kein PDF vorhanden */}
            {!existingFileUrl && !file && !isReplacingFile && (
              <Button
                size="xs"
                onClick={handleChangePdfClick}
              >
                Upload PDF
              </Button>
            )}
          </Stack>

          {/* Participants */}
          <Stack gap="xs">
            <Title order={5}>Assign participants</Title>

            <MultiSelect
              data={participantOptions}
              value={selectedParticipantIds}
              onChange={setSelectedParticipantIds}
              label={
                <Group gap={6} align="center">
                  <span>Participants</span>
                  <HelpTooltip
                    label="Select all participants that are covered by this ticket. The entered ticket amount applies to all selected participants together."
                    width={300}
                  />
                </Group>
              }
              withAsterisk
            />
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
