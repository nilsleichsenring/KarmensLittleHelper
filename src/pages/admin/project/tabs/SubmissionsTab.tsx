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
} from "../types";

import { CountryFlag } from "../../../../components/CountryFlag";
import { exportSubmissionPdf } from "../../../../lib/pdf/exportSubmitPage";

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

  async function handleDownload(id: string) {
    try {
      setDownloadingId(id);
      await exportSubmissionPdf(id);
    } finally {
      setDownloadingId(null);
    }
  }

  // ---------------------------------------------
  // Host info (comes from joined organisations table)
  // ---------------------------------------------
  const hostName = project.organisations?.name ?? "Unknown host";
  const hostCountry = project.organisations?.country_code ?? null;

  // Participating countries WITHOUT host
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

      {/* ---------------------------------------------
          HEADER
      --------------------------------------------- */}
      <Stack gap="xs" maw={700} w="100%">
        <Title order={3}>Project submissions</Title>
        <Text size="sm" c="dimmed">
          {project.name}
        </Text>
      </Stack>

      {/* ---------------------------------------------
          HOST + PARTICIPATING COUNTRIES CARD
      --------------------------------------------- */}
      <Card withBorder shadow="sm" radius="md" p="lg" maw={700} w="100%">
        <Stack gap="lg">

          {/* HOST */}
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

          {/* PARTICIPATING COUNTRIES */}
          <Stack gap={2}>
            <Text fw={600}>Participating countries</Text>

            <Group gap="sm">
              {participantCountries.map((code) => (
                <CountryFlag key={code} code={code} size={26} />
              ))}

              {/* Host participates as well */}
              <CountryFlag code={hostCountry} size={26} />
            </Group>
          </Stack>
        </Stack>
      </Card>

      {/* ---------------------------------------------
          EMPTY STATE
      --------------------------------------------- */}
      {submissions.length === 0 && (
        <Text c="dimmed" maw={700} w="100%">
          No submissions yet.
        </Text>
      )}

      {/* ---------------------------------------------
          SUBMISSION CARDS
      --------------------------------------------- */}
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

            {/* HEADER ROW */}
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

            {/* STATS */}
            <Group gap="md">
              <Badge variant="outline">
                {s.participantCount} participants
              </Badge>

              <Badge variant="outline">
                {s.ticketCount} tickets
              </Badge>

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

            {/* ACTIONS */}
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
                  onClick={() => handleDownload(s.id)}
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
