// src\pages\admin\project\submissionReview\logic\reviewCalculations.ts

import type { Participant, Ticket } from "../../types";

type AdminTicket = Ticket & {
  assigned_participants?: { id: string; full_name: string }[];
};

export type ParticipantTravelType = "standard" | "green";

export type DistanceResult = {
  distanceKm: number;
  distanceBand: number;
  standardRate: number;
  greenRate: number;
};

export type ClaimSummary = {
  claimedAmount: number;
  approvedTicketsAmount: number;
  eligibleAmount: number | null;
  amountToApprove: number;
  balance: number | null;

  standardParticipantsCount: number;
  greenParticipantsCount: number;

  allTicketsReviewed: boolean;
  approvedParticipantIds: string[];
};

function isApproved(decision: Ticket["review_decision"]) {
  return decision === "approved";
}

function isReviewed(decision: Ticket["review_decision"]) {
  return decision === "approved" || decision === "rejected";
}

export function calculateClaimSummary(args: {
  participants: Participant[];
  tickets: AdminTicket[];
  participantTravelTypes: Record<string, ParticipantTravelType>;
  distanceResult: DistanceResult | null;
}): ClaimSummary {
  const { participants, tickets, participantTravelTypes, distanceResult } = args;

  const claimedAmount = tickets.reduce((sum, ticket) => {
    return sum + (ticket.amount_eur ?? 0);
  }, 0);

  const approvedTicketsAmount = tickets.reduce((sum, ticket) => {
    return isApproved(ticket.review_decision)
      ? sum + (ticket.amount_eur ?? 0)
      : sum;
  }, 0);

  const approvedParticipantIdsSet = new Set<string>();

  tickets.forEach((ticket) => {
    if (!isApproved(ticket.review_decision)) return;

    ticket.assigned_participants?.forEach((participant) => {
      approvedParticipantIdsSet.add(participant.id);
    });
  });

  let standardParticipantsCount = 0;
  let greenParticipantsCount = 0;

  participants.forEach((participant) => {
    if (!approvedParticipantIdsSet.has(participant.id)) return;

    const travelType = participantTravelTypes[participant.id];

    if (travelType === "green") {
      greenParticipantsCount += 1;
    } else {
      standardParticipantsCount += 1;
    }
  });

  const eligibleAmount =
    distanceResult != null
      ? standardParticipantsCount * distanceResult.standardRate +
        greenParticipantsCount * distanceResult.greenRate
      : null;

  const amountToApprove =
    eligibleAmount != null
      ? Math.min(approvedTicketsAmount, eligibleAmount)
      : approvedTicketsAmount;

  const balance =
    eligibleAmount != null ? eligibleAmount - amountToApprove : null;

  const allTicketsReviewed =
    tickets.length > 0 && tickets.every((ticket) => isReviewed(ticket.review_decision));

  return {
    claimedAmount,
    approvedTicketsAmount,
    eligibleAmount,
    amountToApprove,
    balance,
    standardParticipantsCount,
    greenParticipantsCount,
    allTicketsReviewed,
    approvedParticipantIds: Array.from(approvedParticipantIdsSet),
  };
}