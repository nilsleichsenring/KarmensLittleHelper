import {
  Badge,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import CountryFlag from "../../../../../components/CountryFlag";

import type {
  SubmissionSummary,
  Project,
  ProjectCountry,
} from "../../types";

type Props = {
  submission: SubmissionSummary;
  project: Project;
  countries: ProjectCountry[];
  getCountryLabel: (code: string | null) => string;
  hasDistance: boolean;
};

/* ------------------------------------------------------------------ */
/* Helpers */
/* ------------------------------------------------------------------ */

function getStatusLabel(
  claimStatus: SubmissionSummary["claim_status"] | null
): string {
  switch (claimStatus) {
    case "approved":
      return "Approved";

    case "adjusted":
      return "Adjusted & approved";

    case "rejected":
      return "Rejected";

    case "open":
    default:
      return "Needs review";
  }
}

function getStatusColor(
  claimStatus: SubmissionSummary["claim_status"] | null
): string {
  switch (claimStatus) {
    case "approved":
      return "green";

    case "adjusted":
      return "yellow";

    case "rejected":
      return "red";

    case "open":
    default:
      return "gray";
  }
}

function getPaymentColor(
  paymentStatus: SubmissionSummary["payment_status"] | null
): string {
  switch (paymentStatus) {
    case "paid":
      return "green";

    case "unpaid":
    default:
      return "red";
  }
}

/* ------------------------------------------------------------------ */
/* Component */
/* ------------------------------------------------------------------ */

export default function ContextStep({
  submission,
  project,
  countries,
  getCountryLabel,
  hasDistance,
}: Props) {
  const subCountryCode = submission.country_code ?? null;

  const hostName = project.organisations?.name ?? "Unknown host";
  const hostCountry = project.organisations?.country_code ?? null;

  const participantCountryCodes = countries.map((c) => c.country_code);
  const hostAppearsInList =
    !!hostCountry && participantCountryCodes.includes(hostCountry);

  /* --------------------------------------------------------------
     Derived UI states
  -------------------------------------------------------------- */

  const needsDistanceEntry =
    submission.claim_status === "open" && !hasDistance;

  return (
    <Stack gap="lg">
      <Card withBorder radius="md" p="lg">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Group gap={8}>
              <CountryFlag code={subCountryCode} size={22} />

              <Text fw={700} size="lg">
                {submission.organisation_name}
              </Text>
            </Group>

            <Text size="sm" c="dimmed">
              {getCountryLabel(subCountryCode)}
            </Text>
          </Stack>

          <Stack gap={6} align="flex-end">
            <Badge
              variant="light"
              color={getStatusColor(submission.claim_status)}
              size="md"
            >
              Status: {getStatusLabel(submission.claim_status)}
            </Badge>

            <Badge
              variant="light"
              color={getPaymentColor(submission.payment_status)}
              size="md"
            >
              Payment: {submission.payment_status ?? "unpaid"}
            </Badge>

            {needsDistanceEntry && (
              <Badge variant="light" color="red" size="md">
                Needs distance entry
              </Badge>
            )}
          </Stack>
        </Group>
      </Card>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Card withBorder radius="md" p="md">
          <Stack gap={4}>
            <Text fw={600}>Project</Text>

            <Text>{project.name}</Text>

            <Text size="sm" c="dimmed">
              {project.project_reference || "—"}
            </Text>
          </Stack>
        </Card>

        <Card withBorder radius="md" p="md">
          <Stack gap={6}>
            <Text fw={600}>Host organisation</Text>

            <Group gap={8}>
              <CountryFlag code={hostCountry} size={20} />

              <Text>
                {hostName}{" "}
                {hostCountry && (
                  <span style={{ opacity: 0.6 }}>
                    ({hostCountry})
                  </span>
                )}
              </Text>
            </Group>
          </Stack>
        </Card>
      </SimpleGrid>

      <Card withBorder radius="md" p="md">
        <Stack gap={6}>
          <Text fw={600}>Participating countries</Text>

          <Group gap="sm">
            {participantCountryCodes.map((code) => (
              <CountryFlag key={code} code={code} size={22} />
            ))}

            {!hostAppearsInList && hostCountry && (
              <CountryFlag code={hostCountry} size={22} />
            )}
          </Group>
        </Stack>
      </Card>

      <Card withBorder radius="md" p="md">
        <Stack gap={4}>
          <Text fw={600}>Submission meta</Text>

          <Text size="sm">
            Submitted at:{" "}
            {submission.submitted_at
              ? new Date(submission.submitted_at).toLocaleString()
              : "—"}
          </Text>

          <Text size="sm">
            Reviewed at:{" "}
            {submission.reviewed_at
              ? new Date(submission.reviewed_at).toLocaleString()
              : "—"}
          </Text>
        </Stack>
      </Card>
    </Stack>
  );
}