// src/pages/admin/project/submissionReview/steps/DecisionStep.tsx

import {
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Alert,
  Modal,
} from "@mantine/core";
import { useState } from "react";

import type { SubmissionSummary } from "../../types";

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

type Props = {
  claimedAmount: number;
  ticketsApprovedAmount: number;
  eligibleAmount: number | null;

  amountToApprove: number;

  allTicketsReviewed: boolean;
  isClaimFinal: boolean;

  claimStatus?: SubmissionSummary["claim_status"];

  onApproveAsClaimed: () => void;
  onAdjustAndApprove: () => void;
  onReject: () => void;

  onReopenSubmission: () => void; // ✅ NEW
};

/* ------------------------------------------------------------------ */
/* Helpers */
/* ------------------------------------------------------------------ */

function formatEur(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)} €`;
}

/* ------------------------------------------------------------------ */
/* Component */
/* ------------------------------------------------------------------ */

export default function DecisionStep({
  claimedAmount,
  ticketsApprovedAmount,
  eligibleAmount,
  amountToApprove,
  allTicketsReviewed,
  isClaimFinal,
  claimStatus,
  onApproveAsClaimed,
  onAdjustAndApprove,
  onReject,
  onReopenSubmission,
}: Props) {
  const [reopenModalOpen, setReopenModalOpen] = useState(false);

  const hasEligibilityCap =
    eligibleAmount != null &&
    ticketsApprovedAmount > eligibleAmount;

  const isAdjusted =
    ticketsApprovedAmount !== claimedAmount ||
    hasEligibilityCap;

  const balance =
    eligibleAmount != null
      ? eligibleAmount - amountToApprove
      : null;

  const isApproved = claimStatus === "approved";
  const isAdjustedFinal = claimStatus === "adjusted";
  const isRejected = claimStatus === "rejected";

  const decisionColor = isRejected
    ? "red"
    : isAdjustedFinal
    ? "yellow"
    : "green";

  const decisionBg = isRejected
    ? "red.0"
    : isAdjustedFinal
    ? "yellow.0"
    : "green.0";

  return (
    <Stack gap="md">
      {/* ✅ Hint */}
      <Alert color="blue" variant="light">
        <Text size="sm">
          {isClaimFinal
            ? "Decision already made."
            : "Review summary. Confirm the final reimbursement decision."}
        </Text>
      </Alert>

      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Text fw={700}>Decision</Text>

          {/* Summary */}
          <Stack gap={4}>
            <Text size="sm">
              💰 Claimed amount:{" "}
              <strong>{formatEur(claimedAmount)}</strong>
            </Text>

            <Text size="sm">
              ✅ Tickets approved:{" "}
              <strong>{formatEur(ticketsApprovedAmount)}</strong>
            </Text>

            <Text size="sm">
              📏 Eligible amount:{" "}
              <strong>{formatEur(eligibleAmount)}</strong>
            </Text>
          </Stack>

          {/* 🔥 FINAL DECISION BOX */}
          {isClaimFinal ? (
            <Card withBorder radius="md" p="lg" bg={decisionBg}>
              <Stack gap="sm" align="center">
                <Badge
                  size="lg"
                  color={decisionColor}
                  variant="filled"
                >
                  {isApproved && "✅ Approved as claimed"}
                  {isAdjustedFinal && "🟡 Adjusted & approved"}
                  {isRejected && "❌ Rejected"}
                </Badge>

                <Text size="sm" c="dimmed">
                  Approved amount
                </Text>

                <Text fw={800} size="xl">
                  {formatEur(amountToApprove)}
                </Text>

                {/* ✅ Reopen button */}
                <Button
                  variant="subtle"
                  color="gray"
                  mt="sm"
                  onClick={() => setReopenModalOpen(true)}
                >
                  Reopen submission
                </Button>
              </Stack>
            </Card>
          ) : (
            <Card withBorder radius="md" p="md" bg="gray.0">
              <Text size="sm" c="dimmed">
                Amount to approve
              </Text>

              <Text fw={700} size="xl">
                {formatEur(amountToApprove)}
              </Text>
            </Card>
          )}

          {/* Balance */}
          {balance != null && (
            <Text size="sm" c="dimmed">
              ⚖️ Balance (Eligible − Approved):{" "}
              <strong>{formatEur(balance)}</strong>
            </Text>
          )}

          {/* Validation */}
          {!allTicketsReviewed && !isClaimFinal && (
            <Text size="sm" c="red">
              All tickets must be reviewed before a decision can be made.
            </Text>
          )}

          {/* Actions */}
          {!isClaimFinal && (
            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={onReject}
                disabled={!allTicketsReviewed}
              >
                Reject
              </Button>

              {isAdjusted ? (
                <Button
                  color="yellow"
                  onClick={onAdjustAndApprove}
                  disabled={!allTicketsReviewed || amountToApprove <= 0}
                >
                  Adjust & approve
                </Button>
              ) : (
                <Button
                  color="green"
                  onClick={onApproveAsClaimed}
                  disabled={!allTicketsReviewed}
                >
                  Approve as claimed
                </Button>
              )}
            </Group>
          )}
        </Stack>
      </Card>

      {/* ⚠️ Reopen confirm modal */}
      <Modal
        opened={reopenModalOpen}
        onClose={() => setReopenModalOpen(false)}
        centered
        title="Reopen submission?"
      >
        <Stack>
          <Text size="sm">
            This will reset the submission decision.
            Ticket reviews will remain unchanged.
          </Text>

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => setReopenModalOpen(false)}
            >
              Cancel
            </Button>

            <Button
              color="red"
              onClick={() => {
                setReopenModalOpen(false);
                onReopenSubmission();
              }}
            >
              Reopen submission
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
