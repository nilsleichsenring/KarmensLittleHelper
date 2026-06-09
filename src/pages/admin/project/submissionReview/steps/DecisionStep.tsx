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
  Textarea,
} from "@mantine/core";
import { useState } from "react";

import type { ClaimSummary } from "../../types";
import { HelpTooltip } from "../../../../../components/HelpTooltip";
import {
  canReopenClaim,
  isApprovedClaim,
  isAdjustedClaim,
  isRejectedClaim,
} from "../../../../../lib/claims/claimStateMachine";

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

type Props = {
  claimedAmount: number;
  ticketsApprovedAmount: number;
  eligibleAmount: number | null;

  amountToApprove: number;
  storedApprovedAmount?: number | null;

  allTicketsReviewed: boolean;
  isClaimFinal: boolean;

  claimStatus?: ClaimSummary["claim_status"];
  paymentStatus: ClaimSummary["payment_status"];
  paymentPaidAt: string | null;
  reviewedAt: string | null;
  rejectionReason?: string | null;

  onApproveAsClaimed: () => void;
  onAdjustAndApprove: () => void;
  onReject: (reason: string) => void | Promise<void>;

  onReopenClaim: () => void;
};

/* ------------------------------------------------------------------ */
/* Helpers */
/* ------------------------------------------------------------------ */

function formatEur(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)} €`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

/* ------------------------------------------------------------------ */
/* Component */
/* ------------------------------------------------------------------ */

export default function DecisionStep({
  claimedAmount,
  ticketsApprovedAmount,
  eligibleAmount,
  amountToApprove,
  storedApprovedAmount,
  allTicketsReviewed,
  isClaimFinal,
  claimStatus,
  paymentStatus,
  paymentPaidAt,
  reviewedAt,
  rejectionReason,
  onApproveAsClaimed,
  onAdjustAndApprove,
  onReject,
  onReopenClaim,
}: Props) {
  const [reopenModalOpen, setReopenModalOpen] = useState(false);

  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const hasEligibilityCap =
    eligibleAmount != null && ticketsApprovedAmount > eligibleAmount;

  const hasMissingEligibility = eligibleAmount == null;

  const isAdjusted = ticketsApprovedAmount !== claimedAmount || hasEligibilityCap;

  const displayApprovedAmount =
    isClaimFinal && storedApprovedAmount != null
      ? storedApprovedAmount
      : amountToApprove;

  const balance =
    eligibleAmount != null ? eligibleAmount - displayApprovedAmount : null;

  const claimState = {
    claim_status: claimStatus ?? "open",
    payment_status: paymentStatus,
    approved_amount_eur: displayApprovedAmount,
  };

  const isApproved = isApprovedClaim(claimState);
  const isAdjustedFinal = isAdjustedClaim(claimState);
  const isRejected = isRejectedClaim(claimState);

  const canReopen = canReopenClaim(claimState);

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

          <Stack gap={4}>
            <Text size="sm">
              💰 Claimed amount: <strong>{formatEur(claimedAmount)}</strong>
            </Text>

            <Text size="sm">
              ✅ Tickets approved:{" "}
              <strong>{formatEur(ticketsApprovedAmount)}</strong>
            </Text>

            <Text size="sm">
              📏 Eligible amount: <strong>{formatEur(eligibleAmount)}</strong>
            </Text>
          </Stack>

          {isClaimFinal ? (
            <Card withBorder radius="md" p="lg" bg={decisionBg}>
              <Stack gap="sm" align="center">
                <Badge size="lg" color={decisionColor} variant="filled">
                  {isApproved && "✅ Approved as claimed"}
                  {isAdjustedFinal && "🟡 Adjusted & approved"}
                  {isRejected && "❌ Rejected"}
                </Badge>

                <Text size="sm" c="dimmed">
                  Approved amount
                </Text>

                <Text fw={800} size="xl">
                  {formatEur(displayApprovedAmount)}
                </Text>

              <Card withBorder radius="md" p="md" w="100%" bg="white">
                <Stack gap={4}>
                  <Text size="sm">
                    <strong>Reviewed at:</strong> {formatDateTime(reviewedAt)}
                  </Text>

                  <Text size="sm">
                    <strong>Payment status:</strong> {paymentStatus}
                  </Text>

                  {paymentStatus === "paid" && (
                    <Text size="sm">
                      <strong>Paid at:</strong> {formatDateTime(paymentPaidAt)}
                    </Text>
                  )}
                </Stack>
              </Card>

                {isRejected && (
                  <Card withBorder radius="md" p="md" w="100%" bg="white">
                    <Stack gap={4}>
                      <Text size="sm" fw={600} c="red">
                        Reason for rejection
                      </Text>

                      <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                        {rejectionReason?.trim()
                          ? rejectionReason
                          : "No rejection reason stored."}
                      </Text>
                    </Stack>
                  </Card>
                )}

                <Group gap={6} mt="sm">
                  <Button
                    variant="subtle"
                    color="gray"
                    disabled={!canReopen}
                    onClick={() => {
                      if (!canReopen) return;
                      setReopenModalOpen(true);
                    }}
                  >
                    Reopen claim
                  </Button>

                  {!canReopen && paymentStatus === "paid" && (
                    <HelpTooltip label="This claim is already marked as paid. Undo the payment before reopening the claim." />
                  )}
                </Group>
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

          {balance != null && (
            <Text size="sm" c="dimmed">
              ⚖️ Balance (Eligible − Approved):{" "}
              <strong>{formatEur(balance)}</strong>
            </Text>
          )}

          {hasMissingEligibility && !isClaimFinal && (
            <Text size="sm" c="red">
              A valid distance calculation is required before approving this claim.
            </Text>
          )}

          {!allTicketsReviewed && !isClaimFinal && (
            <Text size="sm" c="red">
              All tickets must be reviewed before a decision can be made.
            </Text>
          )}

          {!isClaimFinal && (
            <>
              <Group justify="flex-end">
                <Button
                  variant="default"
                  color="red"
                  onClick={() => setShowRejectBox(true)}
                  disabled={!allTicketsReviewed}
                >
                  Reject
                </Button>

                {isAdjusted ? (
                  <Button
                    color="yellow"
                    onClick={onAdjustAndApprove}
                    disabled={
                      !allTicketsReviewed ||
                      amountToApprove <= 0 ||
                      hasMissingEligibility
                    }
                  >
                    Adjust & approve
                  </Button>
                ) : (
                  <Button
                    color="green"
                    onClick={onApproveAsClaimed}
                    disabled={!allTicketsReviewed || hasMissingEligibility}
                  >
                    Approve as claimed
                  </Button>
                )}
              </Group>

              {showRejectBox && (
                <Card withBorder radius="md" p="md" bg="red.0">
                  <Stack gap="sm">
                    <Text fw={600} c="red">
                      Reject claim
                    </Text>

                    <Textarea
                      label="Reason for rejection"
                      placeholder="Explain why this claim is rejected..."
                      minRows={4}
                      value={rejectReason}
                      onChange={(event) =>
                        setRejectReason(event.currentTarget.value)
                      }
                    />

                    <Group justify="flex-end">
                      <Button
                        variant="default"
                        onClick={() => {
                          setShowRejectBox(false);
                          setRejectReason("");
                        }}
                      >
                        Cancel
                      </Button>

                      <Button
                        color="red"
                        disabled={rejectReason.trim().length === 0}
                        onClick={() => {
                          onReject(rejectReason.trim());
                          setShowRejectBox(false);
                          setRejectReason("");
                        }}
                      >
                        Confirm rejection
                      </Button>
                    </Group>
                  </Stack>
                </Card>
              )}
            </>
          )}
        </Stack>
      </Card>

      <Modal
        opened={reopenModalOpen}
        onClose={() => setReopenModalOpen(false)}
        centered
        title="Reopen claim?"
      >
        <Stack>
          <Text size="sm">
            This will reset the claim decision. Ticket reviews will remain
            unchanged.
          </Text>

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setReopenModalOpen(false)}>
              Cancel
            </Button>

            <Button
              color="red"
              onClick={() => {
                setReopenModalOpen(false);
                onReopenClaim();
              }}
            >
              Reopen claim
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}