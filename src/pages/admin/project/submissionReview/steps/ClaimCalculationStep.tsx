import {
  Alert,
  Badge,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";

import type { Participant, Ticket } from "../../types";
import { calculateClaimSummary } from "../logic/reviewCalculations";

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

type AdminTicket = Ticket & {
  assigned_participants?: { id: string; full_name: string }[];
};

type Props = {
  participants: Participant[];
  tickets: AdminTicket[];

  standardRate: number | null;
  greenRate: number | null;

  participantTravelTypes: Record<string, "standard" | "green">;
};

/* ------------------------------------------------------------------ */
/* Helpers */
/* ------------------------------------------------------------------ */

function formatEur(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)} €`;
}

/* ------------------------------------------------------------------ */
/* Component */
/* ------------------------------------------------------------------ */

export default function ClaimCalculationStep({
  participants,
  tickets,
  standardRate,
  greenRate,
  participantTravelTypes,
}: Props) {
  const distanceResult =
    standardRate != null && greenRate != null
      ? {
          distanceKm: 0,
          distanceBand: 0,
          standardRate,
          greenRate,
        }
      : null;

  const claimSummary = calculateClaimSummary({
    participants,
    tickets,
    participantTravelTypes,
    distanceResult,
  });

  const claimedAmountEur = claimSummary.claimedAmount;
  const approvedTicketsAmountEur = claimSummary.approvedTicketsAmount;
  const eligibleAmountEur = claimSummary.eligibleAmount;
  const amountToApprove = claimSummary.amountToApprove;
  const balanceEur = claimSummary.balance;
  const standardParticipantsCount = claimSummary.standardParticipantsCount;
  const greenParticipantsCount = claimSummary.greenParticipantsCount;

  const isCapped =
    eligibleAmountEur != null &&
    approvedTicketsAmountEur > eligibleAmountEur;

  const balanceColor =
    balanceEur == null
      ? "gray"
      : balanceEur > 0
      ? "green"
      : balanceEur === 0
      ? "yellow"
      : "red";

  const formattedBalance =
    balanceEur == null
      ? "—"
      : `${balanceEur > 0 ? "+" : ""}${balanceEur.toFixed(2)} €`;

  return (
    <Stack gap="md">
      <Alert color="blue" variant="light">
        <Text size="sm">
          All values are calculated automatically based on approved tickets,
          participant travel types, and distance rates. No manual action is
          required.
        </Text>
      </Alert>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Card withBorder radius="md" p="md">
          <Text size="xs" c="dimmed">
            🧾 Claimed amount
          </Text>
          <Text fw={700} size="lg">
            {formatEur(claimedAmountEur)}
          </Text>
        </Card>

        <Card withBorder radius="md" p="md">
          <Text size="xs" c="dimmed">
            ✅ Approved tickets
          </Text>
          <Text fw={700} size="lg">
            {formatEur(approvedTicketsAmountEur)}
          </Text>
        </Card>

        <Card withBorder radius="md" p="md">
          <Text size="xs" c="dimmed">
            🎯 Eligible amount
          </Text>

          <Text fw={700} size="lg">
            {formatEur(eligibleAmountEur)}
          </Text>

          <Text size="xs" c="dimmed">
            {standardParticipantsCount} standard · {greenParticipantsCount} green
          </Text>
        </Card>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Card
          withBorder
          radius="md"
          p="lg"
          style={{
            background: isCapped ? "#fff9db" : "#f0fff4",
          }}
        >
          <Text size="sm" c="dimmed">
            💰 Amount to approve
          </Text>

          <Text fw={900} size="xl">
            {formatEur(amountToApprove)}
          </Text>

          {isCapped && (
            <Badge color="yellow" variant="light" mt={8}>
              System cap applied
            </Badge>
          )}
        </Card>

        <Card
          withBorder
          radius="md"
          p="lg"
          style={{
            background:
              balanceColor === "green"
                ? "#f0fff4"
                : balanceColor === "yellow"
                ? "#fff9db"
                : "#fff5f5",
          }}
        >
          <Text size="sm" c="dimmed">
            ⚖️ Balance
          </Text>

          <Group gap={10}>
            <Text fw={900} size="xl" c={balanceColor}>
              {formattedBalance}
            </Text>

            {balanceEur != null && (
              <Badge color={balanceColor} variant="light">
                {balanceEur > 0
                  ? "Below eligible"
                  : balanceEur === 0
                  ? "Exact match"
                  : "Over limit"}
              </Badge>
            )}
          </Group>
        </Card>
      </SimpleGrid>

      <Card withBorder radius="md" p="md">
        <Group gap="xl">
          <Stack gap={0}>
            <Text size="xs" c="dimmed">
              Standard rate
            </Text>
            <Text fw={600}>{formatEur(standardRate)}</Text>
          </Stack>

          <Stack gap={0}>
            <Text size="xs" c="dimmed">
              Green rate
            </Text>
            <Text fw={600}>{formatEur(greenRate)}</Text>
          </Stack>
        </Group>
      </Card>
    </Stack>
  );
}