export type ClaimStatus = "open" | "approved" | "adjusted" | "rejected";

export type PaymentStatus = "unpaid" | "paid";

export type ClaimStateInput = {
  claim_status: ClaimStatus;
  payment_status: PaymentStatus;
  approved_amount_eur: number | null;
};

export type DeleteClaimInput = {
  submitted?: boolean | null;
  claim_status?: string | null;
  payment_status?: string | null;
};

export type ReopenClaimInput = {
  claim_status?: string | null;
  payment_status?: string | null;
};

export function isOpenClaim(claim: ClaimStateInput): boolean {
  return claim.claim_status === "open";
}

export function isApprovedClaim(claim: ClaimStateInput): boolean {
  return claim.claim_status === "approved";
}

export function isAdjustedClaim(claim: ClaimStateInput): boolean {
  return claim.claim_status === "adjusted";
}

export function isRejectedClaim(claim: ClaimStateInput): boolean {
  return claim.claim_status === "rejected";
}

export function isApprovedOrAdjustedClaim(claim: ClaimStateInput): boolean {
  return isApprovedClaim(claim) || isAdjustedClaim(claim);
}

export function isClaimFinal(claim: ClaimStateInput): boolean {
  return (
    isApprovedClaim(claim) ||
    isAdjustedClaim(claim) ||
    isRejectedClaim(claim)
  );
}

export function canMarkClaimPaid(claim: ClaimStateInput): boolean {
  return (
    isApprovedOrAdjustedClaim(claim) &&
    claim.payment_status === "unpaid" &&
    claim.approved_amount_eur != null &&
    Number.isFinite(Number(claim.approved_amount_eur)) &&
    Number(claim.approved_amount_eur) > 0
  );
}

export function canUndoClaimPayment(claim: ClaimStateInput): boolean {
  return claim.payment_status === "paid";
}

export function canReopenClaim(claim: ReopenClaimInput): boolean {
  const isFinal =
    claim.claim_status === "approved" ||
    claim.claim_status === "adjusted" ||
    claim.claim_status === "rejected";

  return isFinal && claim.payment_status !== "paid";
}

export function canDeleteClaim(claim: DeleteClaimInput): boolean {
  return (
    !claim.submitted &&
    claim.claim_status === "open" &&
    claim.payment_status === "unpaid"
  );
}