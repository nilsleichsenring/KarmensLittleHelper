// src/pages/admin/project/submissionReview/reviewSteps.ts

/* ------------------------------------------------------------------ */
/* Step keys */
/* ------------------------------------------------------------------ */

export type ReviewStepKey =
  | "context"
  | "distance"
  | "tickets"
  | "travelTypes"
  | "calculations"
  | "decision"
  | "payment";

/* ------------------------------------------------------------------ */
/* Step definition */
/* ------------------------------------------------------------------ */

export type ReviewStep = {
  key: ReviewStepKey;
  label: string;

  /**
   * blocking = true
   * → dieser Step kann den weiteren Review blockieren
   *   (z. B. fehlende Eingabe oder fehlende Entscheidung)
   *
   * blocking = false
   * → rein erklärend / ableitend
   */
  blocking: boolean;
};

/* ------------------------------------------------------------------ */
/* Central review step configuration (single source of truth)
   ------------------------------------------------------------------ */

export const reviewSteps: ReviewStep[] = [
  {
    key: "context",
    label: "Context",
    blocking: false,
  },

  // Eingabe → kann blockieren
  {
    key: "distance",
    label: "Distance & rates",
    blocking: true,
  },

  // Review / Entscheidung → kann blockieren
  {
    key: "tickets",
    label: "Tickets",
    blocking: true,
  },

  // Rein ableitend
  {
    key: "travelTypes",
    label: "Travel types",
    blocking: false,
  },
  {
    key: "calculations",
    label: "Calculations",
    blocking: false,
  },

  // Finale Entscheidung
  {
    key: "decision",
    label: "Decision",
    blocking: true,
  },
];
