import { useEffect, useMemo, useState } from "react";
import { Button, Card, Group, Modal, Stack, Text } from "@mantine/core";

import type {
  ClaimSummary,
  Participant,
  Ticket,
  Project,
  ProjectCountry,
} from "../types";

import { useReviewStep } from "./ReviewStepContext";

import ContextStep from "./steps/ContextStep";
import DistanceStep from "./steps/DistanceStep";
import TicketsStep from "./steps/TicketsStep";
import TravelTypesStep from "./steps/TravelTypesStep";
import ClaimCalculationStep from "./steps/ClaimCalculationStep";
import DecisionStep from "./steps/DecisionStep";

import { deriveParticipantTravelTypes } from "../../../../lib/travel/travel";
import { calculateClaimSummary } from "./logic/reviewCalculations";
import { saveClaimDecision, reopenClaim } from "./logic/reviewPersistence";

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

type AdminTicket = Ticket & {
  assigned_participants?: { id: string; full_name: string }[];
};

export type DistanceResult = {
  distanceKm: number;
  distanceBand: number;
  standardRate: number;
  greenRate: number;
};

type DecisionStatus = "approved" | "adjusted" | "rejected";

type SuccessState = {
  status: DecisionStatus;
  approvedAmount: number;
};

type Props = {
  claim: ClaimSummary;
  participants: Participant[];
  tickets: AdminTicket[];

  project: Project;
  countries: ProjectCountry[];

  getCountryLabel: (code: string | null) => string;

  onReviewComplete: (
    submissionId: string,
    payload: {
      reviewed_at: string | null;
      claim_status: ClaimSummary["claim_status"];
      approved_amount_eur?: number | null;
      rejection_reason?: string | null;
    }
  ) => void;

  onClose: () => void;

  initialDistanceResult?: DistanceResult | null;
};

/* ------------------------------------------------------------------ */
/* Helpers */
/* ------------------------------------------------------------------ */

function formatEur(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)} €`;
}

function getDecisionBadge(status: DecisionStatus) {
  switch (status) {
    case "approved":
      return {
        icon: "✅",
        label: "Approved as claimed",
        color: "green" as const,
      };

    case "adjusted":
      return {
        icon: "🟡",
        label: "Adjusted & approved",
        color: "yellow" as const,
      };

    case "rejected":
      return {
        icon: "❌",
        label: "Rejected",
        color: "red" as const,
      };
  }
}

function areTicketReviewFieldsEqual(a: AdminTicket, b: AdminTicket) {
  return (
    a.review_decision === b.review_decision &&
    a.reviewed_at === b.reviewed_at &&
    a.approved === b.approved
  );
}

/* ------------------------------------------------------------------ */
/* Component */
/* ------------------------------------------------------------------ */

export default function AdminClaimReviewWizard({
  claim,
  participants,
  tickets,
  project,
  countries,
  getCountryLabel,
  onReviewComplete,
  onClose,
  initialDistanceResult = null,
}: Props) {
  const { activeStep } = useReviewStep();

  const baseDistanceResult = initialDistanceResult ?? null;

  /* -------------------------------------------------------------- */
  /* Claim status: base value + local override                      */
  /* -------------------------------------------------------------- */

  const baseClaimStatus = claim.claim_status;

  const [claimStatusOverride, setClaimStatusOverride] = useState<
    ClaimSummary["claim_status"] | null
  >(null);

  const claimStatus = claimStatusOverride ?? baseClaimStatus;

  const effectiveClaim: ClaimSummary = {
    ...claim,
    claim_status: claimStatus,
  };

  useEffect(() => {
    setClaimStatusOverride(null);
  }, [claim.id]);

  const isClaimFinal =
    claimStatus === "approved" ||
    claimStatus === "adjusted" ||
    claimStatus === "rejected";

  /* -------------------------------------------------------------- */
  /* Tickets: base value + local working state                      */
  /* -------------------------------------------------------------- */

  const baseTickets = tickets;

  const [workingTickets, setWorkingTickets] = useState<AdminTicket[]>(
    baseTickets
  );

  useEffect(() => {
    setWorkingTickets(baseTickets);
  }, [baseTickets]);

  const effectiveTickets = workingTickets;

  const hasTicketChanges = useMemo(() => {
    if (baseTickets.length !== workingTickets.length) {
      return true;
    }

    return baseTickets.some((baseTicket, index) => {
      const workingTicket = workingTickets[index];

      if (!workingTicket) return true;
      if (baseTicket.id !== workingTicket.id) return true;

      return !areTicketReviewFieldsEqual(baseTicket, workingTicket);
    });
  }, [baseTickets, workingTickets]);

  /* -------------------------------------------------------------- */
  /* Distance: base value + local override                          */
  /* -------------------------------------------------------------- */

  const [distanceOverride, setDistanceOverride] =
    useState<DistanceResult | null>(null);

  const distanceResult = distanceOverride ?? baseDistanceResult;

  useEffect(() => {
    setDistanceOverride(null);
  }, [baseDistanceResult, claim.id]);

  /* -------------------------------------------------------------- */
  /* Success popup state                                            */
  /* -------------------------------------------------------------- */

  const [successState, setSuccessState] = useState<SuccessState | null>(null);
  const [savingDecision, setSavingDecision] = useState(false);

  /* -------------------------------------------------------------- */
  /* Derived: approved tickets (funding-relevant subset)            */
  /* -------------------------------------------------------------- */

  const approvedEffectiveTickets = useMemo(
    () => effectiveTickets.filter((t) => t.review_decision === "approved"),
    [effectiveTickets]
  );

  /* -------------------------------------------------------------- */
  /* Derived: approved ticketParticipants                           */
  /* -------------------------------------------------------------- */

  const approvedTicketParticipants = useMemo(
    () =>
      approvedEffectiveTickets.flatMap(
        (t) =>
          t.assigned_participants?.map((p) => ({
            ticket_id: t.id,
            participant_id: p.id,
          })) ?? []
      ),
    [approvedEffectiveTickets]
  );

  /* -------------------------------------------------------------- */
  /* Derived: participantTravelTypes (funding-relevant)             */
  /* -------------------------------------------------------------- */

  const participantTravelTypes = useMemo(
    () =>
      deriveParticipantTravelTypes({
        participants,
        tickets: approvedEffectiveTickets,
        ticketParticipants: approvedTicketParticipants,
      }),
    [participants, approvedEffectiveTickets, approvedTicketParticipants]
  );

  /* -------------------------------------------------------------- */
  /* Derived amounts                                                */
  /* -------------------------------------------------------------- */

  const claimSummary = useMemo(
    () =>
      calculateClaimSummary({
        participants,
        tickets: effectiveTickets,
        participantTravelTypes,
        distanceResult,
      }),
    [participants, effectiveTickets, participantTravelTypes, distanceResult]
  );

  const claimedAmount = claimSummary.claimedAmount;
  const ticketsApprovedAmount = claimSummary.approvedTicketsAmount;
  const allTicketsReviewed = claimSummary.allTicketsReviewed;
  const eligibleAmount = claimSummary.eligibleAmount;
  const computedAmountToApprove = claimSummary.amountToApprove;

  const effectiveAmountToApprove =
    claimStatus === "rejected" ? 0 : computedAmountToApprove;

  const decisionUsesDraftTickets = hasTicketChanges;
  void decisionUsesDraftTickets;

  /* -------------------------------------------------------------- */
  /* Balance                                                        */
  /* -------------------------------------------------------------- */

  const balanceEligibleMinusApproved = useMemo(() => {
    if (eligibleAmount == null) return null;

    const approved = successState?.approvedAmount ?? effectiveAmountToApprove;
    return eligibleAmount - approved;
  }, [eligibleAmount, successState, effectiveAmountToApprove]);

  /* -------------------------------------------------------------- */
  /* Decision handler                                               */
  /* -------------------------------------------------------------- */

  async function handleDecision(
    status: DecisionStatus,
    approvedAmount: number,
    rejectionReason?: string | null
  ) {
    if (savingDecision) return;

    setSavingDecision(true);

    let result;

    try {
      result = await saveClaimDecision({
        submissionId: claim.id,
        status,
        approvedAmount,
        rejectionReason,
      });
    } catch (error) {
      console.error("Decision update failed:", error);
      setSavingDecision(false);
      return;
    }

    setClaimStatusOverride(status);

    onReviewComplete(claim.id, {
      claim_status: result.claim_status,
      reviewed_at: result.reviewed_at,
      approved_amount_eur: result.approved_amount_eur,
      rejection_reason: result.rejection_reason,
    });

    setSuccessState({ status, approvedAmount });
    setSavingDecision(false);
  }

  /* -------------------------------------------------------------- */
  /* Reopen claim                                                   */
  /* -------------------------------------------------------------- */

  async function handleReopenClaim() {
    let result;

    try {
      result = await reopenClaim(claim.id);
    } catch (error) {
      console.error("Reopen failed:", error);
      return;
    }

    setClaimStatusOverride("open");

    onReviewComplete(claim.id, {
      claim_status: result.claim_status,
      reviewed_at: result.reviewed_at,
      approved_amount_eur: result.approved_amount_eur,
      rejection_reason: null,
    });
  }

  /* -------------------------------------------------------------- */
  /* Step rendering                                                 */
  /* -------------------------------------------------------------- */

  function renderStep() {
    switch (activeStep) {
      case "context":
        return (
          <ContextStep
            submission={effectiveClaim}
            project={project}
            countries={countries}
            getCountryLabel={getCountryLabel}
            hasDistance={distanceResult != null}
          />
        );

      case "distance":
        return (
          <DistanceStep
            submission={claim}
            isClaimFinal={isClaimFinal}
            onDistanceCalculated={setDistanceOverride}
          />
        );

      case "tickets":
        return (
          <TicketsStep
            tickets={effectiveTickets}
            isClaimFinal={isClaimFinal}
            onTicketsChange={setWorkingTickets}
          />
        );

      case "travelTypes":
        return (
          <TravelTypesStep participants={participants} tickets={effectiveTickets} />
        );

      case "calculations":
        return (
          <ClaimCalculationStep
            participants={participants}
            tickets={effectiveTickets}
            participantTravelTypes={participantTravelTypes}
            standardRate={distanceResult?.standardRate ?? null}
            greenRate={distanceResult?.greenRate ?? null}
          />
        );

      case "decision":
        return (
          <>
            {decisionUsesDraftTickets && (
              <Text size="sm" c="dimmed">
                The current decision preview reflects unsaved ticket review
                changes from this session.
              </Text>
            )}

            <DecisionStep
              claimedAmount={claimedAmount}
              eligibleAmount={eligibleAmount}
              ticketsApprovedAmount={ticketsApprovedAmount}
              amountToApprove={effectiveAmountToApprove}
              storedApprovedAmount={claim.approved_amount_eur}
              allTicketsReviewed={allTicketsReviewed}
              isClaimFinal={isClaimFinal}
              claimStatus={claimStatus}
              paymentStatus={claim.payment_status}
              paymentPaidAt={claim.payment_paid_at}
              reviewedAt={claim.reviewed_at}
              rejectionReason={claim.rejection_reason}
              onApproveAsClaimed={() =>
                handleDecision("approved", computedAmountToApprove)
              }
              onAdjustAndApprove={() =>
                handleDecision("adjusted", computedAmountToApprove)
              }
              onReject={(reason: string) => handleDecision("rejected", 0, reason)}
              onReopenClaim={handleReopenClaim}
            />
          </>
        );

      default:
        return null;
    }
  }

  /* -------------------------------------------------------------- */
  /* Success popup                                                  */
  /* -------------------------------------------------------------- */

  const decisionBadge = successState && getDecisionBadge(successState.status);

  return (
    <>
      <Modal
        opened={successState !== null}
        onClose={() => {
          // force explicit confirmation via button
        }}
        withCloseButton={false}
        closeOnClickOutside={false}
        closeOnEscape={false}
        centered
        size="lg"
      >
        {successState && decisionBadge && (
          <Stack gap="md">
            <Text fw={800} size="lg">
              {decisionBadge.icon} {decisionBadge.label}
            </Text>

            <Card withBorder radius="md" p="md">
              <Stack gap={6}>
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

                <Card
                  withBorder
                  radius="md"
                  p="md"
                  bg={successState.status === "rejected" ? "red.0" : "green.0"}
                >
                  <Text size="sm" c="dimmed">
                    Approved amount
                  </Text>

                  <Text fw={800} size="xl">
                    {formatEur(successState.approvedAmount)}
                  </Text>
                </Card>

                {successState.status === "rejected" && claim.rejection_reason && (
                  <Card withBorder radius="md" p="md" bg="red.0">
                    <Text size="sm" c="dimmed">
                      Rejection reason
                    </Text>

                    <Text size="sm">{claim.rejection_reason}</Text>
                  </Card>
                )}

                {balanceEligibleMinusApproved != null && (
                  <Text size="sm" c="dimmed">
                    ⚖ Balance (Eligible − Approved):{" "}
                    <strong>{formatEur(balanceEligibleMinusApproved)}</strong>
                  </Text>
                )}
              </Stack>
            </Card>

            <Group justify="flex-end">
              <Button
                onClick={() => {
                  setSuccessState(null);
                  onClose();
                }}
              >
                Cool 😎
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      <Card withBorder radius="md" p="lg">
        <Stack gap="md">{renderStep()}</Stack>
      </Card>
    </>
  );
}