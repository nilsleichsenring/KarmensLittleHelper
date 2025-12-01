import {
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { useState } from "react";

import type {
  SubmissionSummary,
  Project,
  ProjectCountry,
  Participant,
  Ticket,
} from "../types";

import { CountryFlag } from "../../../../components/CountryFlag";

import { generatePdf } from "../../../../lib/pdf/pdfEngine";
import { renderAdminSubmission } from "../../../../lib/pdf/renderers/adminSubmission";
import { supabase } from "../../../../lib/supabaseClient";

type Props = {
  project: Project;
  countries: ProjectCountry[];
  submissions: SubmissionSummary[];
  loading: boolean;
  getCountryLabel: (code: string | null) => string;
  onOpenSubmission: (submission: SubmissionSummary) => void;
};

export function SubmissionsTab({
  project,
  countries,
  submissions,
  loading,
  getCountryLabel,
  onOpenSubmission,
}: Props) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // ---------------------------------------------------------
  // Load full submission details (participants + tickets)
  // ---------------------------------------------------------
  async function loadSubmissionFull(submissionId: string) {
    // Participants
    const { data: parts } = await supabase
      .from("participants")
      .select("id, full_name")
      .eq("project_partner_submission_id", submissionId)
      .order("full_name", { ascending: true });

    const participants = (parts || []) as Participant[];

    // Tickets
    const { data: tix } = await supabase
      .from("tickets")
      .select(`
        id,
        from_location,
        to_location,
        amount_eur,
        file_url,
        ticket_participants (
          participant: participants ( id, full_name )
        )
      `)
      .eq("project_partner_submission_id", submissionId)
      .order("created_at", { ascending: true });

    const tickets: Ticket[] =
      (tix || []).map((t) => ({
        id: t.id,
        from_location: t.from_location,
        to_location: t.to_location,
        amount_eur: t.amount_eur,
        file_url: t.file_url,
        assigned_participants:
          t.ticket_participants?.map((tp: any) => tp.participant.full_name) ??
          [],
      })) ?? [];

    return { participants, tickets };
  }

  // ---------------------------------------------------------
  // PDF DOWNLOAD (new engine)
  // ---------------------------------------------------------
  async function handleDownload(submission: SubmissionSummary) {
    try {
      setDownloadingId(submission.id);

      // fetch full details
      const { participants, tickets } = await loadSubmissionFull(
        submission.id
      );

      await generatePdf(
        renderAdminSubmission,
        {
          submission,
          participants,
          tickets,
          project,
        },
        `reimbursement_${submission.organisation_name.replace(/\s+/g, "_")}.pdf`
      );
    } finally {
      setDownloadingId(null);
    }
  }

  // ---------------------------------------------
  // Host info
  // ---------------------------------------------
  const hostName = project.organisations?.name ?? "Unknown host";
  const hostCountry = project.organisations?.country_code ?? null;

  const participantCountries = countries
    .filter((c) => c.country_code !== hostCountry)
    .map((c) => c.country_code);

  if (loading) {
    return (
      <Group justify="center" mt="xl">
        <Loader size="lg" />
      </Group>
    );
  }

  return (
    <Stack gap="xl" align="center">
      <Stack gap="xs" maw={700} w="100%">
        <Title order={3}>Project submissions</Title>
        <Text size="sm" c="dimmed">
          {project.name}
        </Text>
      </Stack>

      <Card withBorder shadow="sm" radius="md" p="lg" maw={700} w="100%">
        <Stack gap="lg">
          <Stack gap={2}>
            <Text fw={600}>Project-Host</Text>

            <Group gap={6}>
              <CountryFlag code={hostCountry} size={20} />
              <Text size="md">
                {hostName}{" "}
                {hostCountry && (
                  <span style={{ opacity: 0.6 }}>({hostCountry})</span>
                )}
              </Text>
            </Group>
          </Stack>

          <Divider />

          <Stack gap={2}>
            <Text fw={600}>Participating countries</Text>

            <Group gap="sm">
              {participantCountries.map((code) => (
                <CountryFlag key={code} code={code} size={26} />
              ))}

              <CountryFlag code={hostCountry} size={26} />
            </Group>
          </Stack>
        </Stack>
      </Card>

      {submissions.length === 0 && (
        <Text c="dimmed" maw={700} w="100%">
          No submissions yet.
        </Text>
      )}

      {submissions.map((s) => (
        <Card
          key={s.id}
          withBorder
          radius="md"
          p="lg"
          shadow="sm"
          maw={700}
          w="100%"
        >
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <Stack gap={2}>
                <Text fw={600} size="lg">
                  {s.organisation_name}
                </Text>

                <Group gap={6}>
                  <CountryFlag code={s.country_code} size={18} />
                  <Text size="sm" c="dimmed">
                    {getCountryLabel(s.country_code)}
                  </Text>
                </Group>
              </Stack>

              <Badge
                color={s.submitted ? "green" : "yellow"}
                variant="light"
                size="lg"
              >
                {s.submitted ? "Submitted" : "In progress"}
              </Badge>
            </Group>

            <Divider />

            <Group gap="md">
              <Badge variant="outline">
                {s.participantCount} participants
              </Badge>

              <Badge variant="outline">{s.ticketCount} tickets</Badge>

              <Badge variant="outline">
                EUR total: {s.totalEur.toFixed(2)}
              </Badge>

              <Badge variant="outline">
                Avg / participant:{" "}
                {s.participantCount > 0
                  ? (s.totalEur / s.participantCount).toFixed(2)
                  : "0.00"}
              </Badge>
            </Group>

            <Divider />

            <Group justify="flex-end" gap="sm">
              <Button
                size="xs"
                variant="light"
                onClick={() => onOpenSubmission(s)}
              >
                View details
              </Button>

              {s.submitted && (
                <Button
                  size="xs"
                  variant="outline"
                  loading={downloadingId === s.id}
                  onClick={() => handleDownload(s)}
                >
                  {downloadingId === s.id
                    ? "Generating..."
                    : "Download PDF"}
                </Button>
              )}
            </Group>
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}
