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
import { PDFDocument, StandardFonts } from "pdf-lib";

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

  // Load data
  useEffect(() => {
    async function loadAll() {
      if (!submissionId) return;

      setLoading(true);
      setErrorMessage(null);

      // Submission
      const { data: sub, error: subError } = await supabase
        .from("project_partner_submissions")
        .select(
          "id, project_id, country_code, organisation_name, submitted, submitted_at, contact_name, contact_email, iban, bic, account_holder"
        )
        .eq("id", submissionId)
        .single();

      if (subError || !sub) {
        console.error(subError);
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

      // Participants
      const { data: partRows, error: partError } = await supabase
        .from("participants")
        .select("id, full_name")
        .eq("project_partner_submission_id", submissionId)
        .order("full_name", { ascending: true });

      if (partError) {
        console.error(partError);
        setErrorMessage("Could not load participants.");
        setLoading(false);
        return;
      }

      const participantsList = (partRows || []) as Participant[];
      setParticipants(participantsList);

      // Tickets
      const { data: ticketRows, error: ticketError } = await supabase
        .from("tickets")
        .select("id, from_location, to_location, amount_eur, file_url")
        .eq("project_partner_submission_id", submissionId)
        .order("created_at", { ascending: true });

      if (ticketError) {
        console.error(ticketError);
        setErrorMessage("Could not load tickets.");
        setLoading(false);
        return;
      }

      const baseTickets =
        ((ticketRows || []) as Omit<Ticket, "assigned_participants">[]) || [];

      if (baseTickets.length === 0) {
        setTickets([]);
        setLoading(false);
        return;
      }

      // Assigned participants
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
      console.error(error);
      setErrorMessage("Could not submit your data. Please try again.");
      return;
    }

    navigate(`/p/${projectToken!}/done`, { replace: true });
  }

  // ---------------------------------------------------------------
  // PDF DOWNLOAD — fully rewritten + correctly scaled + safe embed
  // ---------------------------------------------------------------
  async function handleDownloadPdf() {
    if (!submission) return;

    setDownloadingPdf(true);
    setErrorMessage(null);

    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // ---------------- PAGE 1: SUMMARY ----------------
      let page = pdfDoc.addPage([595.28, 841.89]);
      const { height } = page.getSize();
      let y = height - 50;

      const line = () => {
        y -= 15;
        page.drawText("------------------------------------------------------------", {
          x: 50,
          y,
          size: 10,
          font,
        });
        y -= 20;
      };

      page.drawText("Travel Reimbursement Summary", {
        x: 50,
        y,
        size: 18,
        font,
      });
      y -= 30;

      page.drawText("Organisation:", { x: 50, y, size: 12, font });
      page.drawText(
        `${submission.organisation_name} (${submission.country_code})`,
        { x: 150, y, size: 12, font }
      );
      y -= 20;

      if (submission.contact_name || submission.contact_email) {
        page.drawText("Contact:", { x: 50, y, size: 12, font });
        page.drawText(
          `${submission.contact_name || ""} ${
            submission.contact_email ? " - " + submission.contact_email : ""
          }`,
          { x: 150, y, size: 12, font }
        );
        y -= 20;
      }

      line();

      page.drawText("Bank details", { x: 50, y, size: 14, font });
      y -= 20;

      const pairs = [
        ["Account holder:", submission.account_holder || "-"],
        ["IBAN:", submission.iban || "-"],
        ["BIC:", submission.bic || "-"],
      ];

      for (const [label, value] of pairs) {
        page.drawText(label, { x: 50, y, size: 12, font });
        page.drawText(value, { x: 160, y, size: 12, font });
        y -= 18;
      }

      y -= 10;
      line();

      // Participants
      page.drawText("Participants", { x: 50, y, size: 14, font });
      y -= 20;

      for (const p of participants) {
        if (y < 80) {
          page = pdfDoc.addPage([595.28, 841.89]);
          y = page.getSize().height - 50;
        }
        page.drawText("- " + p.full_name, { x: 60, y, size: 12, font });
        y -= 16;
      }

      y -= 10;
      line();

      // Tickets overview
      page.drawText("Tickets (overview)", { x: 50, y, size: 14, font });
      y -= 20;

      for (let i = 0; i < tickets.length; i++) {
        const t = tickets[i];
        if (y < 80) {
          page = pdfDoc.addPage([595.28, 841.89]);
          y = page.getSize().height - 50;
        }

        page.drawText(
          `${i + 1}. ${t.from_location} -> ${t.to_location} (${t.amount_eur.toFixed(
            2
          )} EUR)`,
          { x: 60, y, size: 12, font }
        );
        y -= 16;

        page.drawText(
          `   Participants: ${
            t.assigned_participants.length > 0
              ? t.assigned_participants.join(", ")
              : "-"
          }`,
          { x: 60, y, size: 11, font }
        );
        y -= 18;
      }

      // ---------------- PDF: TICKET FILES ----------------
      for (let i = 0; i < tickets.length; i++) {
        const t = tickets[i];
        if (!t.file_url) continue;

        const { data: fileBlob, error: fileError } = await supabase.storage
          .from("tickets")
          .download(t.file_url);

        if (fileError || !fileBlob) continue;

        const bytes = await fileBlob.arrayBuffer();
        const ticketPdf = await PDFDocument.load(bytes);

        const copied = await pdfDoc.copyPages(ticketPdf, ticketPdf.getPageIndices());

        // FIRST PAGE (WRAPPER + HEADER)
        const original = copied[0];
        const { width: pw, height: ph } = original.getSize();

        const wrapper = pdfDoc.addPage([pw, ph]);

        wrapper.drawText(`Ticket ${i + 1} of ${tickets.length}`, {
          x: 40,
          y: ph - 40,
          size: 16,
          font,
        });

        wrapper.drawText(`${t.from_location} -> ${t.to_location} (${t.amount_eur.toFixed(2)} EUR)`, {
          x: 40,
          y: ph - 60,
          size: 12,
          font,
        });

        if (t.assigned_participants.length > 0) {
          wrapper.drawText(
            `Participants: ${t.assigned_participants.join(", ")}`,
            {
              x: 40,
              y: ph - 80,
              size: 12,
              font,
            }
          );
        }

        const scale = 0.8;
        const embedded = await wrapper.doc.embedPage(original);
        const scaledH = ph * scale;

        let imgY = ph - 100 - scaledH;
        if (imgY < 30) imgY = 30;

        wrapper.drawPage(embedded, {
          x: 40,
          y: imgY,
          xScale: scale,
          yScale: scale,
        });

        // Following pages
        for (let p = 1; p < copied.length; p++) {
          const orig = copied[p];
          const { width: w, height: h } = orig.getSize();

          const newPage = pdfDoc.addPage([w, h]);
          const embeddedNext = await pdfDoc.embedPage(orig);

          newPage.drawPage(embeddedNext, {
            x: 0,
            y: 0,
            xScale: scale,
            yScale: scale,
          });
        }
      }

      // Save + download
      const finalBytes = await pdfDoc.save();
      const safe = new Uint8Array(finalBytes);
      const blob = new Blob([safe], { type: "application/pdf" });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reimbursement_${submission.organisation_name.replace(
        /\s+/g,
        "_"
      )}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setErrorMessage("Could not generate PDF.");
    } finally {
      setDownloadingPdf(false);
    }
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

          <Stack gap={2}>
            <Text size="sm" c="dimmed">
              Organisation
            </Text>
            <Text>
              {submission.organisation_name} ({submission.country_code})
            </Text>
          </Stack>

          <Stack gap={2}>
            <Text size="sm" c="dimmed">
              Contact person
            </Text>
            <Text>
              {submission.contact_name || "-"}
              {submission.contact_email
                ? ` – ${submission.contact_email}`
                : ""}
            </Text>
          </Stack>

          <Stack gap={2}>
            <Text size="sm" c="dimmed">
              Bank information
            </Text>
            <Text>
              <strong>Account holder:</strong>{" "}
              {submission.account_holder || "-"}
            </Text>
            <Text>
              <strong>IBAN:</strong> {submission.iban || "-"}
            </Text>
            <Text>
              <strong>BIC:</strong> {submission.bic || "-"}
            </Text>
          </Stack>

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
