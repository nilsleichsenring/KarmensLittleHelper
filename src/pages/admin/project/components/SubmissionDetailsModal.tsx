import { Modal, Text } from "@mantine/core";

import type {
  SubmissionSummary,
  Ticket,
  Project,
  ProjectCountry,
} from "../types";

import AdminReviewLayout from "../submissionReview/AdminReviewLayout";
import AdminSubmissionReviewWizard from "../submissionReview/AdminSubmissionReviewWizard";
import { useSubmissionReview } from "../submissionReview/hooks/useSubmissionReview";

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

  submission: SubmissionSummary | null;

  getCountryLabel: (code: string | null) => string;

  project: Project;
  countries: ProjectCountry[];

  onReviewComplete: (
    submissionId: string,
    payload: {
      reviewed_at: string | null;
      claim_status: SubmissionSummary["claim_status"];
      approved_amount_eur?: number | null;
    }
  ) => void;
};

/* ------------------------------------------------------------------ */
/* Component */
/* ------------------------------------------------------------------ */

export default function SubmissionDetailsModal({
  opened,
  onClose,
  submission,
  project,
  countries,
  getCountryLabel,
  onReviewComplete,
}: Props) {
  const review = useSubmissionReview(submission?.id ?? null, opened);
  const hookSubmission = review.submission;

  if (!submission || review.loading || !hookSubmission) {
    return (
      <Modal opened={opened} onClose={onClose} centered title="Submission">
        <Text c="dimmed">Loading…</Text>
      </Modal>
    );
  }

  if (review.error) {
    return (
      <Modal opened={opened} onClose={onClose} centered title="Submission">
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
      title={`Submission – ${hookSubmission.organisation_name}`}
      size="xl"
      centered
    >
      <AdminReviewLayout
        hasDistance={review.hasDistance}
        allTicketsReviewed={review.allTicketsReviewed}
        isClaimFinal={review.isClaimFinal}
      >
        <AdminSubmissionReviewWizard
          submission={hookSubmission}
          participants={reviewParticipants}
          tickets={reviewTickets}
          project={project}
          countries={countries}
          getCountryLabel={getCountryLabel}
          onReviewComplete={onReviewComplete}
          onClose={onClose}
          initialDistanceResult={review.initialDistanceResult}
        />
      </AdminReviewLayout>
    </Modal>
  );
}