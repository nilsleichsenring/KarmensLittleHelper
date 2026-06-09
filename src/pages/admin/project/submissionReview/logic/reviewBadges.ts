import type { ProjectPartnerOrg, ClaimSummary } from "../../types";

export type ClaimBadge = {
  key: string;
  label: string;
  color: "gray" | "green" | "yellow" | "blue" | "red";
};

export function getClaimBadges(
  submission: ClaimSummary,
  partnerOrg: ProjectPartnerOrg | null,
  opts?: { showDistanceBadge?: boolean }
): ClaimBadge[] {
  const badges: ClaimBadge[] = [];
  const showDistanceBadge = opts?.showDistanceBadge ?? true;

  if (showDistanceBadge && (!partnerOrg || partnerOrg.distance_km == null)) {
    badges.push({
      key: "needs-distance",
      label: "Needs distance entry",
      color: "red",
    });
    return badges;
  }

  if (submission.claim_status === "approved") {
    badges.push({
      key: "approved",
      label: "Approved as claimed",
      color: "green",
    });
  }

  if (submission.claim_status === "adjusted") {
    badges.push({
      key: "adjusted",
      label: "Adjusted & approved",
      color: "yellow",
    });
  }

  if (submission.claim_status === "open") {
    badges.push({
      key: "open",
      label: "Needs review",
      color: "gray",
    });
  }

  if (submission.claim_status === "rejected") {
    badges.push({
      key: "rejected",
      label: "Rejected",
      color: "red",
    });
  }

  const isFinalApproved =
    submission.claim_status === "approved" ||
    submission.claim_status === "adjusted";

  if (isFinalApproved && submission.approved_amount_eur == null) {
    badges.push({
      key: "missing-approved-amount",
      label: "Missing approved amount",
      color: "red",
    });
  }

  return badges;
}