// src/pages/admin/project/submissionReview/ReviewStepContext.tsx

import { createContext, useContext } from "react";
import type { ReviewStepKey } from "./reviewSteps";

/* ------------------------------------------------------------------ */
/* Step order (zentral definiert) */
/* ------------------------------------------------------------------ */

export const REVIEW_STEP_ORDER: ReviewStepKey[] = [
  "context",
  "distance",
  "tickets",
  "travelTypes",
  "calculations",
  "decision",
];

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

export type ReviewStepContextValue = {
  activeStep: ReviewStepKey;

  setActiveStep: (step: ReviewStepKey) => void;
  markStepCompleted: (step: ReviewStepKey) => void;

  // ✅ Navigation helpers
  goToNextStep: () => void;
  goToPreviousStep: () => void;
};

/* ------------------------------------------------------------------ */
/* Context */
/* ------------------------------------------------------------------ */

export const ReviewStepContext =
  createContext<ReviewStepContextValue | null>(null);

/* ------------------------------------------------------------------ */
/* Hook */
/* ------------------------------------------------------------------ */

export function useReviewStep() {
  const ctx = useContext(ReviewStepContext);

  if (!ctx) {
    throw new Error(
      "useReviewStep must be used inside ReviewStepContext.Provider"
    );
  }

  return ctx;
}
