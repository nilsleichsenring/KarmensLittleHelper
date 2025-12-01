import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Container,
  Loader,
  Stack,
  Table,
  Text,
  Title,
  Group,
} from "@mantine/core";
import { supabase } from "../../lib/supabaseClient";

import { generatePdf } from "../../lib/pdf/pdfEngine";
import { renderPartnerSubmission } from "../../lib/pdf/renderers/partnerSubmission";

const SUBMISSION_STORAGE_PREFIX = "partner_submission_";

type Submission = {
  id: string;
  project_id: string;
  country_code: string;
  organisation_name: string;
  submitted: boolean;
  submitted_at: string | null;
  contact_name: string | null;
  contact_email: string | null;
  iban: string | null;
  bic: string | null;
  account_holder: string | null;
};

type Project = {
  name: string;
  start_date: string | null;
  end_date: string | null;
  project_reference: string | null;
};

type Participant = {
  id: string;
  full_name: string;
};

type Ticket = {
  id: string;
  from_location: string;
  to_location: string;
  amount_eur: number;
  file_url: string | null;
  assigned_participants: string[];
};

type TicketParticipantRow = {
  ticket_id: string;
  participant_id: string;
};

export default function PartnerSubmitPage() {
  const { projectToken } = useParams<{ projectToken: string }>();
  const navigate = useNavigate();

  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [project, setProject] = useState<Project | null>(null);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasDataIssues = participants.length === 0 || tickets.length === 0;

  // Load submission ID
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

  // Load submission, project, participants, tickets
  useEffect(() => {
    async function loadAll() {
      if (!submissionId) return;

      setLoading(true);
      setErrorMessage(null);

      // Submission
      const { data: sub } = await supabase
        .from("project_partner_submissions")
        .select(
          "id, project_id, country_code, organisation_name, submitted, submitted_at, contact_name, contact_email, iban, bic, account_holder"
        )
        .eq("id", submissionId)
        .single();

      if (!sub) {
        setErrorMessage("Could not load submission.");
        setLoading(false);
        return;
      }

      const submissionTyped = sub as Submission;
      setSubmission(submissionTyped);

      if (submissionTyped.submitted) {
        navigate(`/p/${projectToken!}/done`, { replace: true });
        return;
      }

      // Load project
      const { data: proj } = await supabase
        .from("projects")
        .select("name,start_date,end_date,project_reference")
        .eq("id", submissionTyped.project_id)
        .single();

      setProject((proj as Project) || null);

      // Participants
      const { data: partRows } = await supabase
        .from("participants")
        .select("id, full_name")
        .eq("project_partner_submission_id", submissionId)
        .order("full_name", { ascending: true });

      const participantsList = (partRows || []) as Participant[];
      setParticipants(participantsList);

      // Tickets
      const { data: ticketRows } = await supabase
        .from("tickets")
        .select("id, from_location, to_location, amount_eur, file_url")
        .eq("project_partner_submission_id", submissionId)
        .order("created_at", { ascending: true });

      const baseTickets =
        ((ticketRows || []) as Omit<Ticket, "assigned_participants">[]) || [];

      if (baseTickets.length === 0) {
        setTickets([]);
        setLoading(false);
        return;
      }

      const { data: tpRows } = await supabase
        .from("ticket_participants")
        .select("ticket_id, participant_id")
        .in(
          "ticket_id",
          baseTickets.map((t) => t.id)
        );

      const tpList = (tpRows || []) as TicketParticipantRow[];

      const enrichedTickets: Ticket[] = baseTickets.map((t) => ({
        ...t,
        assigned_participants:
          tpList
            .filter((tp) => tp.ticket_id === t.id)
            .map((tp) => {
              const user = participantsList.find(
                (p) => p.id === tp.participant_id
              );
              return user ? user.full_name : "(unknown)";
            }) || [],
      }));

      setTickets(enrichedTickets);
      setLoading(false);
    }

    loadAll();
  }, [submissionId, navigate, projectToken]);

  // FINAL SUBMIT
  async function handleSubmit() {
    if (!submissionId || !submission) return;

    if (hasDataIssues) {
      setErrorMessage(
        "You need at least one participant and one ticket before submitting."
      );
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const { error } = await supabase
      .from("project_partner_submissions")
      .update({
        submitted: true,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", submissionId);

    setSubmitting(false);

    if (error) {
      setErrorMessage("Could not submit your data. Please try again.");
      return;
    }

    navigate(`/p/${projectToken!}/done`, { replace: true });
  }

  // DOWNLOAD PDF (using PDF Engine)
  async function handleDownloadPdf() {
    if (!submission || !project) return;

    setDownloadingPdf(true);
    setErrorMessage(null);

    try {
      const data = {
        submission,
        project,
        participants,
        tickets,
      };

      await generatePdf(
        renderPartnerSubmission,
        data,
        `reimbursement_${submission.organisation_name.replace(/\s+/g, "_")}.pdf`
      );
    } catch (err) {
      console.error(err);
      setErrorMessage("Could not generate PDF.");
    }

    setDownloadingPdf(false);
  }

  // Rendering
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
        <Stack>
          <Title order={2}>Submit</Title>
          <Alert color="red">{errorMessage}</Alert>
        </Stack>
      </Container>
    );
  }

  if (!submission) {
    return (
      <Container size="sm" py="xl">
        <Stack>
          <Title order={2}>Submit</Title>
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
          <Stack gap={4}>
            <Text size="sm" c="dimmed">
              Step 6
            </Text>
            <Title order={2}>Review & submit</Title>
            <Text size="sm" c="dimmed">
              Please review your data. After submitting, you will not be able to
              change it anymore.
            </Text>
          </Stack>

          {/* Organisation */}
          <Stack gap={2}>
            <Text size="sm" c="dimmed">
              Organisation
            </Text>
            <Text>
              {submission.organisation_name} ({submission.country_code})
            </Text>
          </Stack>

          {/* Contact */}
          <Stack gap={2}>
            <Text size="sm" c="dimmed">
              Contact person
            </Text>
            <Text>
              {submission.contact_name || "-"}
              {submission.contact_email
                ? ` — ${submission.contact_email}`
                : ""}
            </Text>
          </Stack>

          {/* Bank */}
          <Stack gap={2}>
            <Text size="sm" c="dimmed">
              Bank information
            </Text>
            <Text>
              <strong>Account holder:</strong> {submission.account_holder || "-"}
            </Text>
            <Text>
              <strong>IBAN:</strong> {submission.iban || "-"}
            </Text>
            <Text>
              <strong>BIC:</strong> {submission.bic || "-"}
            </Text>
          </Stack>

          {/* Participants */}
          <Stack gap="xs">
            <Group justify="space-between">
              <Title order={4}>Participants</Title>
              <Text size="sm" c="dimmed">
                {participants.length} participant(s)
              </Text>
            </Group>

            <Table striped highlightOnHover withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {participants.map((p) => (
                  <Table.Tr key={p.id}>
                    <Table.Td>{p.full_name}</Table.Td>
                  </Table.Tr>
                ))}
                {participants.length === 0 && (
                  <Table.Tr>
                    <Table.Td>No participants added.</Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Stack>

          {/* Tickets */}
          <Stack gap="xs">
            <Group justify="space-between">
              <Title order={4}>Tickets</Title>
              <Text size="sm" c="dimmed">
                {tickets.length} ticket(s)
              </Text>
            </Group>

            <Table striped highlightOnHover withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Route</Table.Th>
                  <Table.Th>Amount (EUR)</Table.Th>
                  <Table.Th>Participants</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {tickets.map((t) => (
                  <Table.Tr key={t.id}>
                    <Table.Td>
                      {t.from_location} → {t.to_location}
                    </Table.Td>
                    <Table.Td>{t.amount_eur.toFixed(2)}</Table.Td>
                    <Table.Td>
                      {t.assigned_participants.length > 0
                        ? t.assigned_participants.join(", ")
                        : "-"}
                    </Table.Td>
                  </Table.Tr>
                ))}
                {tickets.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={3}>No tickets added.</Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Stack>

          {hasDataIssues && (
            <Alert color="red">
              You need at least one participant and one ticket before
              submitting.
            </Alert>
          )}

          {errorMessage && <Alert color="red">{errorMessage}</Alert>}

          <Group justify="space-between">
            <Button
              variant="outline"
              onClick={handleDownloadPdf}
              loading={downloadingPdf}
            >
              Download PDF
            </Button>

            <Button
              onClick={handleSubmit}
              loading={submitting}
              disabled={submitting || hasDataIssues}
            >
              Submit
            </Button>
          </Group>
        </Stack>
      </Container>
    </Box>
  );
}
