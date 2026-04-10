type DecisionContext = {
  claimedAmount: number;
  eligibleAmount: number;
  ticketsApprovedAmount: number;
  allTicketsReviewed: boolean;
  isClaimFinal: boolean;
};

export function getDecisionState(ctx: DecisionContext) {
  const {
    claimedAmount,
    eligibleAmount,
    ticketsApprovedAmount,
    allTicketsReviewed,
    isClaimFinal,
  } = ctx;

  const amountToApprove = Math.min(
    ticketsApprovedAmount,
    eligibleAmount
  );

  const canApproveAsClaimed =
    !isClaimFinal &&
    allTicketsReviewed &&
    ticketsApprovedAmount === claimedAmount &&
    claimedAmount <= eligibleAmount &&
    claimedAmount > 0;

  const canAdjustAndApprove =
    !isClaimFinal &&
    allTicketsReviewed &&
    amountToApprove > 0 &&
    (
      ticketsApprovedAmount !== claimedAmount ||
      ticketsApprovedAmount > eligibleAmount
    );

  const canReject =
    !isClaimFinal &&
    allTicketsReviewed;

  return {
    amountToApprove,
    canApproveAsClaimed,
    canAdjustAndApprove,
    canReject,
  };
}
