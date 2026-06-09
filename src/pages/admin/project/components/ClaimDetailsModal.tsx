import { Modal, Text } from "@mantine/core";

import type {
  ClaimSummary,
  Ticket,
  Project,
  ProjectCountry,
} from "../types";

import AdminReviewLayout from "../submissionReview/AdminReviewLayout";
import AdminClaimReviewWizard from "../submissionReview/AdminClaimReviewWizard";
import { useClaimReview } from "../submissionReview/hooks/useClaimReview";

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

type AdminTicket = Ticket & {
  assigned_participants?: {
    id: string;
    full_name: string;
  }[];
};

type Props = {
  opened: boolean;
  onClose: () => void;

  claim: ClaimSummary | null;

  getCountryLabel: (code: string | null) => string;

  project: Project;
  countries: ProjectCountry[];

  onReviewComplete: (
    submissionId: string,
    payload: {
      reviewed_at: string | null;
      claim_status: ClaimSummary["claim_status"];
      approved_amount_eur?: number | null;
    }
  ) => void;
};

/* ------------------------------------------------------------------ */
/* Component */
/* ------------------------------------------------------------------ */

export default function ClaimDetailsModal({
  opened,
  onClose,
  claim,
  project,
  countries,
  getCountryLabel,
  onReviewComplete,
}: Props) {
  const review = useClaimReview(claim?.id ?? null, opened);
  const hookClaim = review.submission;

  if (!claim || review.loading || !hookClaim) {
    return (
      <Modal opened={opened} onClose={onClose} centered title="Claim">
        <Text c="dimmed">Loading…</Text>
      </Modal>
    );
  }

  if (review.error) {
    return (
      <Modal opened={opened} onClose={onClose} centered title="Claim">
        <Text c="red">{review.error}</Text>
      </Modal>
    );
  }

  const reviewParticipants = review.participants;
  const reviewTickets = review.tickets as AdminTicket[];

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Claim – ${hookClaim.organisation_name}`}
      size="xl"
      centered
    >
      <AdminReviewLayout
        hasDistance={review.hasDistance}
        allTicketsReviewed={review.allTicketsReviewed}
        isClaimFinal={review.isClaimFinal}
      >
        <AdminClaimReviewWizard
          claim={hookClaim}
          participants={reviewParticipants}
          tickets={reviewTickets}
          project={project}
          countries={countries}
          getCountryLabel={getCountryLabel}
          onReviewComplete={(submissionId, payload) => {
            review.updateClaim(payload);
            onReviewComplete(submissionId, payload);
          }}
          onClose={onClose}
          initialDistanceResult={review.initialDistanceResult}
        />
      </AdminReviewLayout>
    </Modal>
  );
}