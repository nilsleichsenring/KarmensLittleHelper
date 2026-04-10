import type { ProjectPartnerOrg, SubmissionSummary } from "../../types";

export type SubmissionTabKey =
  | "pending"
  | "approved"
  | "paid"
  | "rejected"
  | "abandoned";

export function classifySubmission(
  submission: SubmissionSummary,
  partnerOrg: ProjectPartnerOrg | null
): SubmissionTabKey {
  if (!submission.submitted) return "abandoned";

  if (submission.payment_status === "paid") return "paid";

  const needsDistance = !partnerOrg || partnerOrg.distance_km == null;
  if (needsDistance) return "pending";

  if (submission.claim_status === "open") return "pending";

  if (
    submission.claim_status === "approved" ||
    submission.claim_status === "adjusted"
  ) {
    return "approved";
  }

  if (submission.claim_status === "rejected") return "rejected";

  return "pending";
}