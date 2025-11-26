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
import type { SubmissionSummary } from "../types";
import { exportSubmissionPdf } from "../../../../lib/pdf/exportSubmitPage";

type Props = {
  projectName: string; // ← Neu!
  submissions: SubmissionSummary[];
  loading: boolean;
  getCountryLabel: (code: string | null) => string;
  onOpenSubmission: (submission: SubmissionSummary) => void;
};

export function SubmissionsTab({
  projectName,
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

  // Loading
  if (loading) {
    return (
      <Group justify="center" mt="xl">
        <Loader size="lg" />
      </Group>
    );
  }

  return (
    <Stack gap="xl">
      {/* PAGE HEADER */}
      <Stack gap={0}>
        <Title order={3}>Project submissions</Title>
        <Text size="sm" c="dimmed">
          {projectName}
        </Text>
      </Stack>

      {/* EMPTY */}
      {submissions.length === 0 && (
        <Text c="dimmed">No submissions yet.</Text>
      )}

      {/* SUBMISSION CARDS */}
      {submissions.map((s) => (
        <Card key={s.id} withBorder radius="md" p="lg" shadow="sm">
          <Stack gap="md">
            {/* Header row */}
            <Group justify="space-between" align="flex-start">
              <Stack gap={2}>
                <Text fw={600} size="lg">
                  {s.organisation_name}
                </Text>
                <Text size="sm" c="dimmed">
                  {getCountryLabel(s.country_code)}
                </Text>
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

            {/* Stats row */}
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

            {/* Action row */}
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
                  onClick={() => handleDownload(s.id)}
                  loading={downloadingId === s.id}
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
