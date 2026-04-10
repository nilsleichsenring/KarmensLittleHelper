import { useEffect, useMemo, useState } from "react";
import { Button, Card, Group, Modal, Stack, Text } from "@mantine/core";

import type {
  SubmissionSummary,
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
import {
  saveClaimDecision,
  reopenSubmission,
} from "./logic/reviewPersistence";

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
  submission: SubmissionSummary;
  participants: Participant[];
  tickets: AdminTicket[];

  project: Project;
  countries: ProjectCountry[];

  getCountryLabel: (code: string | null) => string;

  onReviewComplete: (
    submissionId: string,
    payload: {
      reviewed_at: string | null;
      claim_status: SubmissionSummary["claim_status"];
      approved_amount_eur?: number | null;
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

export default function AdminSubmissionReviewWizard({
  submission,
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

  const baseClaimStatus = submission.claim_status;

  const [claimStatusOverride, setClaimStatusOverride] = useState<
    SubmissionSummary["claim_status"] | null
  >(null);

  const claimStatus = claimStatusOverride ?? baseClaimStatus;

  const effectiveSubmission: SubmissionSummary = {
    ...submission,
    claim_status: claimStatus,
  };

  useEffect(() => {
    setClaimStatusOverride(null);
  }, [baseClaimStatus]);

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
  }, [baseDistanceResult, submission.id]);

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

  const decisionUsesDraftTickets = hasTicketChanges;
  void decisionUsesDraftTickets;

  /* -------------------------------------------------------------- */
  /* Balance                                                        */
  /* -------------------------------------------------------------- */

  const balanceEligibleMinusApproved = useMemo(() => {
    if (eligibleAmount == null) return null;

    const approved = successState?.approvedAmount ?? computedAmountToApprove;
    return eligibleAmount - approved;
  }, [eligibleAmount, successState, computedAmountToApprove]);

  /* -------------------------------------------------------------- */
  /* Decision handler                                               */
  /* -------------------------------------------------------------- */

  async function handleDecision(status: DecisionStatus, approvedAmount: number) {
    if (savingDecision) return;

    setSavingDecision(true);

    let result;

    try {
      result = await saveClaimDecision({
        submissionId: submission.id,
        status,
        approvedAmount,
      });
    } catch (error) {
      console.error("Decision update failed:", error);
      setSavingDecision(false);
      return;
    }

    setClaimStatusOverride(status);

    onReviewComplete(submission.id, {
      claim_status: result.claim_status,
      reviewed_at: result.reviewed_at,
      approved_amount_eur: result.approved_amount_eur,
    });

    setSuccessState({ status, approvedAmount });
    setSavingDecision(false);
  }

  /* -------------------------------------------------------------- */
  /* Reopen submission                                              */
  /* -------------------------------------------------------------- */

  async function handleReopenSubmission() {
    let result;

    try {
      result = await reopenSubmission(submission.id);
    } catch (error) {
      console.error("Reopen failed:", error);
      return;
    }

    setClaimStatusOverride("open");

    onReviewComplete(submission.id, {
      claim_status: result.claim_status,
      reviewed_at: result.reviewed_at,
      approved_amount_eur: result.approved_amount_eur,
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
            submission={effectiveSubmission}
            project={project}
            countries={countries}
            getCountryLabel={getCountryLabel}
            hasDistance={distanceResult != null}
          />
        );

      case "distance":
        return (
          <DistanceStep
            submission={submission}
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
          <TravelTypesStep
            participants={participants}
            tickets={effectiveTickets}
          />
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
              amountToApprove={computedAmountToApprove}
              allTicketsReviewed={allTicketsReviewed}
              isClaimFinal={isClaimFinal}
              claimStatus={claimStatus}
              onApproveAsClaimed={() =>
                handleDecision("approved", computedAmountToApprove)
              }
              onAdjustAndApprove={() =>
                handleDecision("adjusted", computedAmountToApprove)
              }
              onReject={() => handleDecision("rejected", 0)}
              onReopenSubmission={handleReopenSubmission}
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