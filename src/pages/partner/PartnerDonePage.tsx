import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Container,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { supabase } from "../../lib/supabaseClient";

import { generatePartnerSubmissionPdf } from "../../lib/pdf/react/generatePartnerSubmissionPdf";
import { deriveParticipantTravelTypes } from "../../lib/travel/travel";

const SUBMISSION_STORAGE_PREFIX = "partner_submission_";

type SubmissionInfo = {
  organisation_name: string;
  country_code: string;
  submitted_at: string | null;
};

type Submission = {
  id: string;
  project_id: string;
  country_code: string;
  organisation_name: string;

  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;

  iban: string | null;
  bic: string | null;
  account_holder: string | null;
  bank_name: string | null;
  bank_country: string | null;

  address_line1: string | null;
  address_line2: string | null;
  address_postal_code: string | null;
  address_city: string | null;
  address_region: string | null;

  use_org_address_for_bank: boolean | null;
  bank_address_line1: string | null;
  bank_address_line2: string | null;
  bank_address_postal_code: string | null;
  bank_address_city: string | null;
  bank_address_region: string | null;

  use_org_address_for_account_holder?: boolean | null;
  account_holder_address_line1?: string | null;
  account_holder_address_line2?: string | null;
  account_holder_address_postal_code?: string | null;
  account_holder_address_city?: string | null;
  account_holder_address_region?: string | null;

  submitted: boolean;
  submitted_at: string | null;

  payment_status: "unpaid" | "paid";
  payment_paid_at: string | null;

  created_at: string;
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
  residence_country: string;
  notes?: string | null;
  is_green_travel: boolean | null;
};

type TripType = "oneway" | "return" | "roundtrip";

type BaseTicket = {
  id: string;
  from_location: string;
  to_location: string;
  travel_mode: string | null;
  currency: string;
  amount_original: number | null;
  amount_eur: number;
  trip_type: TripType | null;
  file_url: string | null;
};

type Ticket = BaseTicket & {
  assigned_participants: string[];
};

type TicketParticipantRow = {
  ticket_id: string;
  participant_id: string;
};

export default function PartnerDonePage() {
  const { projectToken } = useParams<{ projectToken: string }>();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const [info, setInfo] = useState<SubmissionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadAll() {
      if (!projectToken) {
        setLoading(false);
        return;
      }

      const key = SUBMISSION_STORAGE_PREFIX + projectToken;
      const submissionId = localStorage.getItem(key);

      if (!submissionId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const { data: submissionData, error: submissionError } = await supabase
          .from("project_partner_submissions")
          .select("*")
          .eq("id", submissionId)
          .single();

        if (submissionError || !submissionData) {
          console.error(submissionError);
          setErrorMessage("We could not load your submission details.");
          setLoading(false);
          return;
        }

        const typedSubmission = submissionData as Submission;
        setSubmission(typedSubmission);

        setInfo({
          organisation_name: typedSubmission.organisation_name,
          country_code: typedSubmission.country_code,
          submitted_at: typedSubmission.submitted_at,
        });

        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("name, start_date, end_date, project_reference")
          .eq("id", typedSubmission.project_id)
          .single();

        if (projectError) {
          console.error(projectError);
        } else {
          setProject((projectData as Project) || null);
        }

        const { data: participantRows, error: participantError } = await supabase
          .from("participants")
          .select("id, full_name, residence_country, is_green_travel, notes")
          .eq("project_partner_submission_id", submissionId)
          .order("full_name", { ascending: true });

        if (participantError) {
          console.error(participantError);
        }

        const rawParticipants = (participantRows || []) as Participant[];

        let ticketRows: any[] | null = null;

        const strictTickets = await supabase
          .from("tickets")
          .select(
            "id, from_location, to_location, travel_mode, currency, currency_code, amount_original, amount_eur, trip_type, file_url"
          )
          .eq("project_partner_submission_id", submissionId)
          .order("created_at", { ascending: true });

        if (strictTickets.error) {
          console.error(
            "Strict ticket select failed, falling back:",
            strictTickets.error
          );

          const fallbackTickets = await supabase
            .from("tickets")
            .select("*")
            .eq("project_partner_submission_id", submissionId)
            .order("created_at", { ascending: true });

          if (fallbackTickets.error) {
            console.error(fallbackTickets.error);
            setTickets([]);
            setParticipants(rawParticipants);
            setLoading(false);
            return;
          }

          ticketRows = fallbackTickets.data as any[];
        } else {
          ticketRows = strictTickets.data as any[];
        }

        const baseTickets: BaseTicket[] = (ticketRows || []).map((t: any) => ({
          id: t.id,
          from_location: t.from_location,
          to_location: t.to_location,
          travel_mode: t.travel_mode ?? null,
          currency: t.currency ?? t.currency_code ?? "EUR",
          amount_original:
            t.amount_original === undefined ? null : t.amount_original,
          amount_eur: Number(t.amount_eur ?? 0),
          trip_type: (t.trip_type as TripType | null) ?? null,
          file_url: t.file_url ?? null,
        }));

        let ticketParticipantRows: TicketParticipantRow[] = [];

        if (baseTickets.length > 0) {
          const { data: tpRows, error: tpError } = await supabase
            .from("ticket_participants")
            .select("ticket_id, participant_id")
            .in(
              "ticket_id",
              baseTickets.map((t) => t.id)
            );

          if (tpError) {
            console.error(tpError);
          } else {
            ticketParticipantRows = (tpRows || []) as TicketParticipantRow[];
          }
        }

        const travelByParticipant = deriveParticipantTravelTypes({
          participants: rawParticipants,
          tickets: baseTickets,
          ticketParticipants: ticketParticipantRows,
        });

        const participantsWithTravelType: Participant[] = rawParticipants.map(
          (participant) => ({
            ...participant,
            is_green_travel: travelByParticipant[participant.id] === "green",
          })
        );

        setParticipants(participantsWithTravelType);

        const enrichedTickets: Ticket[] = baseTickets.map((ticket) => ({
          ...ticket,
          assigned_participants:
            ticketParticipantRows
              .filter((row) => row.ticket_id === ticket.id)
              .map((row) => {
                const participant = rawParticipants.find(
                  (p) => p.id === row.participant_id
                );
                return participant ? participant.full_name : "(unknown)";
              }) || [],
        }));

        setTickets(enrichedTickets);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setErrorMessage("We could not load your submission details.");
        setLoading(false);
      }
    }

    loadAll();
  }, [projectToken]);

  async function handleDownloadPdf() {
    if (!submission || !project) {
      setErrorMessage("The PDF is not available yet.");
      return;
    }

    setDownloadingPdf(true);
    setErrorMessage(null);

    try {
      await generatePartnerSubmissionPdf({
        submission,
        project,
        participants,
        tickets,
      });
    } catch (err) {
      console.error(err);
      setErrorMessage("Could not generate PDF.");
    }

    setDownloadingPdf(false);
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

  const contactFirstName = submission?.contact_name
    ? submission.contact_name.split(" ")[0]
    : null;

  return (
    <Box style={{ minHeight: "100vh" }} bg="#f5f6fa">
      <Container size="sm" py="xl">
        <Stack gap="xl">
          <Stack gap={4}>
            <Title order={2}>
              Thank you{contactFirstName ? `, ${contactFirstName}` : ""}!
            </Title>

            <Text size="sm" c="dimmed">
              Your reimbursement claim has been received.
              The host organisation will contact you if anything is missing.
            </Text>
          </Stack>

          {info && (
            <Paper withBorder radius="md" p="lg">
              <Stack gap="sm">
                <Title order={4}>Submission details</Title>

                <Stack gap={4}>
                  <Text size="sm" c="dimmed">
                    Organisation
                  </Text>
                  <Text>
                    {info.organisation_name} ({info.country_code})
                  </Text>
                </Stack>

                {info.submitted_at && (
                  <Stack gap={4}>
                    <Text size="sm" c="dimmed">
                      Submitted at
                    </Text>
                    <Text>{new Date(info.submitted_at).toLocaleString()}</Text>
                  </Stack>
                )}
              </Stack>
            </Paper>
          )}

          <Paper withBorder radius="md" p="lg">
            <Stack gap="sm">
              <Title order={4}>Confirmation PDF</Title>

              <Text size="sm" c="dimmed">
                You can download a PDF copy of your submitted reimbursement
                claim for your records.
              </Text>

              <Button
                variant="outline"
                onClick={handleDownloadPdf}
                loading={downloadingPdf}
                disabled={!submission || !project}
                style={{ alignSelf: "flex-start" }}
              >
                Download PDF
              </Button>
            </Stack>
          </Paper>

          {errorMessage && <Alert color="red">{errorMessage}</Alert>}

          {!info && !errorMessage && (
            <Text size="sm" c="dimmed">
              Your submission is completed, but we could not load the details.
            </Text>
          )}
        </Stack>
      </Container>
    </Box>
  );
}