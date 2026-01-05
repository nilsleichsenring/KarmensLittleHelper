// src/pages/partner/PartnerSubmitPage.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Box,
  Button,
  Container,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { supabase } from "../../lib/supabaseClient";

import { generatePdf } from "../../lib/pdf/pdfEngine";
import { renderPartnerSubmission } from "../../lib/pdf/renderers/partnerSubmission";
import { deriveParticipantTravelTypes } from "../../lib/travel/travel";
import {
  countryCodeToName,
} from "../../lib/flags";
import { getTravelModeIcon } from "../../lib/travel/travelIcons";
import {
  getParticipantTravelModes,
} from "../../lib/travel/participantTravel";


const SUBMISSION_STORAGE_PREFIX = "partner_submission_";

// ---------------------------------------------------------
// TYPES (robust: include both possible field-namings)
// ---------------------------------------------------------
type Submission = {
  id: string;
  project_id: string;
  country_code: string;
  organisation_name: string;

  // Contact
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;

  // Bank (basic)
  iban: string | null;
  bic: string | null;
  account_holder: string | null;
  bank_name: string | null;
  bank_country: string | null;

  // Org address
  address_line1: string | null;
  address_line2: string | null;
  address_postal_code: string | null;
  address_city: string | null;
  address_region: string | null;

  // Marker + bank/account-holder address (two possible schemas)
  use_org_address_for_bank: boolean | null;
  bank_address_line1: string | null;
  bank_address_line2: string | null;
  bank_address_postal_code: string | null;
  bank_address_city: string | null;
  bank_address_region: string | null;

  // Alternative naming (if your PartnerBankPage wrote these)
  use_org_address_for_account_holder?: boolean | null;
  account_holder_address_line1?: string | null;
  account_holder_address_line2?: string | null;
  account_holder_address_postal_code?: string | null;
  account_holder_address_city?: string | null;
  account_holder_address_region?: string | null;

  // Submission status
  submitted: boolean;
  submitted_at: string | null;

  // 🆕 Payment
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

type Ticket = {
  id: string;
  from_location: string;
  to_location: string;

  travel_mode: string | null;

  currency: string;
  amount_original: number | null;
  amount_eur: number;

  trip_type: TripType | null;

  file_url: string | null;

  assigned_participants: string[];
};

type TicketParticipantRow = {
  ticket_id: string;
  participant_id: string;
};

// ---------------------------------------------------------
// HELPERS
// ---------------------------------------------------------


/**
 * Opens a ticket PDF in a new browser tab.
 * Uses the direct Supabase storage URL stored on the ticket.
 */
function openTicketFile(fileUrl: string | null) {
  if (!fileUrl) return;

  // already absolute → open directly
  if (fileUrl.startsWith("http")) {
    window.open(fileUrl, "_blank", "noopener,noreferrer");
    return;
  }

  // otherwise: resolve via Supabase public storage
  const { data } = supabase.storage
    .from("tickets") // ⚠️ Bucket-Name ggf. anpassen
    .getPublicUrl(fileUrl);

  if (data?.publicUrl) {
    window.open(data.publicUrl, "_blank", "noopener,noreferrer");
  }
}


function renderAddressBlock(
  label: string,
  {
    line1,
    line2,
    postalCode,
    city,
    region,
  }: {
    line1: string | null | undefined;
    line2: string | null | undefined;
    postalCode: string | null | undefined;
    city: string | null | undefined;
    region: string | null | undefined;
  }
) {
  const hasAny = line1 || line2 || postalCode || city || region;

  return (
    <Stack gap={2}>
      <Text size="sm" fw={500}>
        {label}
      </Text>

      {hasAny ? (
        <Stack gap={0} pl="xs">
          {line1 && <Text size="sm">{line1}</Text>}
          {line2 && <Text size="sm">{line2}</Text>}
          {(postalCode || city) && (
            <Text size="sm">
              {(postalCode || "").trim()} {(city || "").trim()}
            </Text>
          )}
          {region && <Text size="sm">{region}</Text>}
        </Stack>
      ) : (
        <Text size="sm" c="dimmed">
          No address provided.
        </Text>
      )}
    </Stack>
  );
}

function formatTripType(tt: TripType | null): string {
  if (!tt) return "—";
  if (tt === "oneway") return "One-way";
  if (tt === "return") return "Return";
  if (tt === "roundtrip") return "Roundtrip";
  return "—";
}

function formatAmount(
  currency: string,
  amountOriginal: number | null,
  amountEur: number
): string {
  if (!currency || currency === "EUR" || amountOriginal == null) {
    return `${amountEur.toFixed(2)} EUR`;
  }
  return `${amountOriginal.toFixed(2)} ${currency} → ${amountEur.toFixed(
    2
  )} EUR`;
}

function countryCodeToFlagSrc(code: string | null) {
  if (!code) return null;
  return `/dist/flags/${code.toUpperCase()}.svg`;
}

function renderTravelTypeBadge(isGreen: boolean) {
  return (
    <Badge
      size="sm"
      radius="sm"
      color={isGreen ? "green" : "gray"}
      variant={isGreen ? "filled" : "outline"}
    >
      {isGreen ? "GREEN TRAVEL" : "STANDARD TRAVEL"}
    </Badge>
  );
}

// ---------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------
export default function PartnerSubmitPage() {
  const { projectToken } = useParams<{ projectToken: string }>();
  const navigate = useNavigate();

  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [project, setProject] = useState<Project | null>(null);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // ✅ NEU: Ticket ↔ Participant Join-Daten (für UI-Auswertung)
  const [ticketParticipants, setTicketParticipants] =
    useState<TicketParticipantRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ---------------------------------------------------------
  // 1) Load Submission ID from localStorage
  // ---------------------------------------------------------
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

  // ---------------------------------------------------------
  // 2) Load Submission + Project + Participants + Tickets
  //     ✅ Bug 2 Fix: robust tickets loading with fallback
  // ---------------------------------------------------------
  useEffect(() => {
    async function loadAll() {
      if (!submissionId) return;

      setLoading(true);
      setErrorMessage(null);

      try {
        // 1) Submission
        const { data: sub, error: subError } = await supabase
          .from("project_partner_submissions")
          .select("*")
          .eq("id", submissionId)
          .single();

        if (subError || !sub) {
          console.error(subError);
          setErrorMessage("Could not load submission.");
          setSubmission(null);
          setLoading(false);
          return;
        }

        const submissionTyped = sub as Submission;
        setSubmission(submissionTyped);

        if (submissionTyped.submitted) {
          navigate(`/p/${projectToken!}/done`, { replace: true });
          return;
        }

        // 2) Project
        const { data: proj, error: projErr } = await supabase
          .from("projects")
          .select("name,start_date,end_date,project_reference")
          .eq("id", submissionTyped.project_id)
          .single();

        if (projErr) console.error(projErr);
        setProject((proj as Project) || null);

        // 3) Participants
        const { data: partRows, error: partError } = await supabase
          .from("participants")
          .select("id, full_name, residence_country, is_green_travel, notes")
          .eq("project_partner_submission_id", submissionId)
          .order("full_name", { ascending: true });

        if (partError) {
          console.error(partError);
          setErrorMessage("Could not load participants.");
        }

        const participantsList = (partRows || []) as Participant[];


        // 4) Tickets (TRY strict select first)
        let ticketRows: any[] | null = null;

        const strict = await supabase
          .from("tickets")
          .select(
            "id, from_location, to_location, travel_mode, currency, amount_original, amount_eur, trip_type, file_url"
          )
          .eq("project_partner_submission_id", submissionId)
          .order("created_at", { ascending: true });

        if (strict.error) {
          // ✅ Fallback: select("*") (mirrors Step 5 behavior)
          console.error("Strict ticket select failed, falling back:", strict.error);

          const fallback = await supabase
            .from("tickets")
            .select("*")
            .eq("project_partner_submission_id", submissionId)
            .order("created_at", { ascending: true });

          if (fallback.error) {
            console.error(fallback.error);
            setErrorMessage("Could not load tickets.");
            setTickets([]);
            setLoading(false);
            return;
          }

          ticketRows = fallback.data as any[];
        } else {
          ticketRows = strict.data as any[];
        }

        const baseTickets =
          (ticketRows || []).map((t: any) => ({
            id: t.id,
            from_location: t.from_location,
            to_location: t.to_location,
            travel_mode: t.travel_mode ?? null,
            currency: t.currency ?? "EUR",
            amount_original:
              t.amount_original === undefined ? null : t.amount_original,
            amount_eur: Number(t.amount_eur ?? 0),
            trip_type: (t.trip_type as TripType | null) ?? null,
            file_url: t.file_url ?? null,
          })) as Omit<Ticket, "assigned_participants">[];

        if (baseTickets.length === 0) {
          setTickets([]);
          setLoading(false);
          return;
        }

        // 5) Ticket participants links
        const { data: tpRows, error: tpError } = await supabase
          .from("ticket_participants")
          .select("ticket_id, participant_id")
          .in(
            "ticket_id",
            baseTickets.map((t) => t.id)
          );

        if (tpError) {
          // Not fatal – we can still show tickets without assigned participant names
          console.error(tpError);
        }

        const tpList = (tpRows || []) as TicketParticipantRow[];
        setTicketParticipants(tpList);


        // ---------------------------------------------------------
        // 🔹 K-4.2.1 — Derive travel type per participant (in-memory)
        // ---------------------------------------------------------
        const travelByParticipant = deriveParticipantTravelTypes({
          participants: participantsList,
          tickets: baseTickets,
          ticketParticipants: tpList,
        });

        // Apply derived travel type to participants shown on Review page
        const participantsWithTravel = participantsList.map((p) => ({
          ...p,
          is_green_travel: travelByParticipant[p.id] === "green",
        }));

        setParticipants(participantsWithTravel);


        const enriched: Ticket[] = baseTickets.map((t) => ({
          ...t,
          assigned_participants:
            tpList
              .filter((tp) => tp.ticket_id === t.id)
              .map((tp) => {
                const p = participantsList.find((x) => x.id === tp.participant_id);
                return p ? p.full_name : "(unknown)";
              }) || [],
        }));

        setTickets(enriched);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setErrorMessage("Unexpected error while loading data.");
        setLoading(false);
      }
    }

    loadAll();
  }, [submissionId, navigate, projectToken]);

  // ---------------------------------------------------------
  // Derived: Bug 1 display fixes (account holder + address)
  // ---------------------------------------------------------
  const useOrgAddressForAccountHolder = useMemo(() => {
    if (!submission) return false;
    // support both field names
    return Boolean(
      submission.use_org_address_for_bank ??
        submission.use_org_address_for_account_holder ??
        false
    );
  }, [submission]);

  const displayAccountHolder = useMemo(() => {
    if (!submission) return "-";
    if (submission.account_holder && submission.account_holder.trim()) {
      return submission.account_holder;
    }
    // ✅ Bug 1: fallback to organisation name if marker is active
    if (useOrgAddressForAccountHolder) {
      return submission.organisation_name;
    }
    return "-";
  }, [submission, useOrgAddressForAccountHolder]);

  const accountHolderAddress = useMemo(() => {
    if (!submission) {
      return {
        line1: null,
        line2: null,
        postalCode: null,
        city: null,
        region: null,
      };
    }

    if (useOrgAddressForAccountHolder) {
      // ✅ Bug 1: show the organisation address as the account holder address
      return {
        line1: submission.address_line1,
        line2: submission.address_line2,
        postalCode: submission.address_postal_code,
        city: submission.address_city,
        region: submission.address_region,
      };
    }

    // otherwise: use whichever bank/account-holder address fields exist
    return {
      line1: submission.bank_address_line1 ?? submission.account_holder_address_line1 ?? null,
      line2: submission.bank_address_line2 ?? submission.account_holder_address_line2 ?? null,
      postalCode:
        submission.bank_address_postal_code ?? submission.account_holder_address_postal_code ?? null,
      city: submission.bank_address_city ?? submission.account_holder_address_city ?? null,
      region: submission.bank_address_region ?? submission.account_holder_address_region ?? null,
    };
  }, [submission, useOrgAddressForAccountHolder]);

  const hasDataIssues = participants.length === 0 || tickets.length === 0;

  // ---------------------------------------------------------
  // 3) Final submit
  // ---------------------------------------------------------
  async function handleSubmit() {
    if (!submissionId || !submission) return;

    if (hasDataIssues) {
      setErrorMessage("You need at least one participant and one ticket before submitting.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const { error: submitError } = await supabase
        .from("project_partner_submissions")
        .update({
          submitted: true,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", submissionId);

      if (submitError) {
        console.error(submitError);
        setSubmitting(false);
        setErrorMessage("Could not submit your data. Please try again.");
        return;
      }

      setSubmitting(false);
      navigate(`/p/${projectToken!}/done`, { replace: true });
    } catch (err) {
      console.error(err);
      setSubmitting(false);
      setErrorMessage("Unexpected error while submitting.");
    }
  }

  // ---------------------------------------------------------
  // 4) PDF download
  // ---------------------------------------------------------
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

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------
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
            Submission could not be loaded. Please contact the host organisation.
          </Alert>
        </Stack>
      </Container>
    );
  }

  const totalTicketsEur = tickets.reduce((sum, t) => sum + (t.amount_eur || 0), 0);

return (
  <Box style={{ minHeight: "100vh" }} bg="#f5f6fa">
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Stack gap={4}>
          <Text size="sm" c="dimmed">
            Step 7 of 7
          </Text>
          <Title order={2}>Review & submit</Title>
          <Text size="sm" c="dimmed">
            Please review your data carefully. After submitting, you will not be
            able to change it anymore.
          </Text>
        </Stack>

        {/* Organisation & address */}
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Organisation
          </Text>
          <Text>
            {submission.organisation_name} ({submission.country_code})
          </Text>

          {renderAddressBlock("Organisation address", {
            line1: submission.address_line1,
            line2: submission.address_line2,
            postalCode: submission.address_postal_code,
            city: submission.address_city,
            region: submission.address_region,
          })}
        </Stack>

        {/* Contact */}
        <Stack gap={2}>
          <Text size="sm" c="dimmed">
            Contact person
          </Text>
          <Text>
            {submission.contact_name || "-"}
            {submission.contact_email ? ` — ${submission.contact_email}` : ""}
          </Text>
          {submission.contact_phone && (
            <Text size="sm">Phone: {submission.contact_phone}</Text>
          )}
        </Stack>

        {/* Bank */}
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Bank information
          </Text>

          <Text>
            <strong>Account holder:</strong> {displayAccountHolder}
          </Text>
          <Text>
            <strong>IBAN:</strong> {submission.iban || "-"}
          </Text>
          <Text>
            <strong>BIC:</strong> {submission.bic || "-"}
          </Text>

          {submission.bank_name && (
            <Text>
              <strong>Bank name:</strong> {submission.bank_name}
            </Text>
          )}
          {submission.bank_country && (
            <Text>
              <strong>Bank country:</strong> {submission.bank_country}
            </Text>
          )}

          {renderAddressBlock("Account holder address", accountHolderAddress)}
        </Stack>

        {/* Participants */}
        <Stack gap="xs">
          <Group justify="space-between">
            <Title order={4}>Participants</Title>
            <Text size="sm" c="dimmed">
              {participants.length} participant
              {participants.length === 1 ? "" : "s"}
            </Text>
          </Group>

          <Alert color="blue" variant="light">
            Travel type (standard / green) is determined automatically by the
            system based on the submitted tickets. No manual selection or
            confirmation is required.
          </Alert>

          <Table striped highlightOnHover withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th style={{ width: 180 }}>
                  Residence country
                </Table.Th>

                {/* 🆕 Means of travel */}
                <Table.Th style={{ width: 120, textAlign: "center" }}>
                  Travel
                </Table.Th>

                <Table.Th style={{ width: 160 }}>
                  Travel type
                </Table.Th>
                <Table.Th>Notes</Table.Th>
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {participants.map((p) => {
                const isGreen = !!p.is_green_travel;

                const travelModes = getParticipantTravelModes(
                  p.id,
                  tickets,
                  ticketParticipants
                );

                return (
                  <Table.Tr key={p.id}>
                    <Table.Td>{p.full_name}</Table.Td>

                    <Table.Td>
                      <Group gap="xs">
                        {countryCodeToFlagSrc(p.residence_country) && (
                          <img
                            src={countryCodeToFlagSrc(p.residence_country)!}
                            alt={p.residence_country}
                            style={{
                              width: 20,
                              height: 14,
                              objectFit: "contain",
                              display: "block",
                            }}
                          />
                        )}
                        <Text>
                          {countryCodeToName(p.residence_country)}
                        </Text>
                      </Group>
                    </Table.Td>

                    {/* 🆕 Travel modes (icons) */}
                    <Table.Td style={{ textAlign: "center" }}>
                      {travelModes.length > 0 ? (
                        <Group gap={6} justify="center">
                          {travelModes.map((mode) => (
                            <Text key={mode} size="lg">
                              {getTravelModeIcon(mode)}
                            </Text>
                          ))}
                        </Group>
                      ) : (
                        <Text size="sm" c="dimmed">
                          —
                        </Text>
                      )}
                    </Table.Td>

                    <Table.Td>
                      {renderTravelTypeBadge(isGreen)}
                    </Table.Td>

                    <Table.Td>
                      {p.notes || (
                        <Text size="sm" c="dimmed">
                          —
                        </Text>
                      )}
                    </Table.Td>
                  </Table.Tr>
                );
              })}

              {participants.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    No participants added.
                  </Table.Td>
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
              {tickets.length} ticket
              {tickets.length === 1 ? "" : "s"} — Total:{" "}
              {totalTicketsEur.toFixed(2)} EUR
            </Text>
          </Group>

          <Table striped highlightOnHover withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Route</Table.Th>
                <Table.Th>Details</Table.Th>
                <Table.Th>Amount</Table.Th>
                <Table.Th>Participants</Table.Th>
                <Table.Th
                  style={{ width: 80, textAlign: "center" }}
                >
                  Travel
                </Table.Th>
                <Table.Th>Ticket</Table.Th>
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {tickets.map((t) => (
                <Table.Tr key={t.id}>
                  <Table.Td>
                    {t.from_location} → {t.to_location}
                  </Table.Td>

                  <Table.Td>
                    <Text size="sm">
                      {t.travel_mode || "—"} ·{" "}
                      {formatTripType(t.trip_type)}
                    </Text>
                  </Table.Td>

                  <Table.Td>
                    <Text size="sm">
                      {formatAmount(
                        t.currency,
                        t.amount_original,
                        t.amount_eur
                      )}
                    </Text>
                  </Table.Td>

                  <Table.Td>
                    {t.assigned_participants.length > 0
                      ? t.assigned_participants.join(", ")
                      : "—"}
                  </Table.Td>

                  <Table.Td style={{ textAlign: "center" }}>
                    <Text size="lg">
                      {getTravelModeIcon(t.travel_mode)}
                    </Text>
                  </Table.Td>

                  <Table.Td>
                    <Button
                      variant="light"
                      onClick={() =>
                        openTicketFile(t.file_url)
                      }
                    >
                      View
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}

              {tickets.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text size="sm" c="dimmed">
                      No tickets added.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Stack>

        {hasDataIssues && (
          <Alert color="red">
            You need at least one participant and one ticket
            before submitting.
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
