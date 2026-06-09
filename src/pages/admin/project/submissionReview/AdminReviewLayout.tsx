import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Container,
  Group,
} from "@mantine/core";
import { useParams } from "react-router-dom";

import AppHeader from "../../../../components/AppHeader";

import StepNavigation, {
  type StepNavigationItem,
} from "../../../../components/StepNavigation";

import {
  reviewSteps,
  type ReviewStep,
  type ReviewStepKey,
} from "./reviewSteps";

import { ReviewStepContext } from "./ReviewStepContext";

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

type ReviewStepState = {
  completed: boolean;
};

type Props = {
  children: React.ReactNode;

  hasDistance: boolean;
  allTicketsReviewed: boolean;
  isClaimFinal: boolean;
};

/* ------------------------------------------------------------------ */
/* Component */
/* ------------------------------------------------------------------ */

export default function AdminReviewLayout({
  children,
  hasDistance,
  allTicketsReviewed,
  isClaimFinal,
}: Props) {
  const { projectId } = useParams<{ projectId: string }>();

  const steps: ReviewStep[] = reviewSteps;

  const [activeStep, setActiveStep] = useState<ReviewStepKey>(
    isClaimFinal ? "decision" : steps[0].key
  );

  /* -------------------------------------------------- */
  /* Step completion state (derived initial)            */
  /* -------------------------------------------------- */

  const [stepState, setStepState] = useState<
    Record<ReviewStepKey, ReviewStepState>
  >(() =>
    Object.fromEntries(
      steps.map((step) => [
        step.key,
        {
          completed:
            isClaimFinal ||
            step.key === "context" ||
            (step.key === "distance" && hasDistance) ||
            (step.key === "tickets" && allTicketsReviewed),
        },
      ])
    ) as Record<ReviewStepKey, ReviewStepState>
  );

  useEffect(() => {
    if (!isClaimFinal) return;

    setActiveStep("decision");

    setStepState(
      Object.fromEntries(
        steps.map((step) => [
          step.key,
          {
            completed: true,
          },
        ])
      ) as Record<ReviewStepKey, ReviewStepState>
    );
  }, [isClaimFinal, steps]);

  function markStepCompleted(step: ReviewStepKey) {
    setStepState((prev) => ({
      ...prev,
      [step]: { completed: true },
    }));
  }

  /* -------------------------------------------------- */
  /* Navigation helpers 🚀                              */
  /* -------------------------------------------------- */

  const stepKeys = steps.map((s) => s.key);
  const currentIndex = stepKeys.indexOf(activeStep);

  function goToNextStep() {
    if (currentIndex < stepKeys.length - 1) {
      setActiveStep(stepKeys[currentIndex + 1]);
    }
  }

  function goToPreviousStep() {
    if (currentIndex > 0) {
      setActiveStep(stepKeys[currentIndex - 1]);
    }
  }

  /* -------------------------------------------------- */
  /* Blocking logic                                     */
  /* -------------------------------------------------- */

  function isStepBlocked(targetIndex: number): boolean {
    for (let i = 0; i < targetIndex; i++) {
      const step = steps[i];

      if (step.blocking && !stepState[step.key].completed) {
        return true;
      }
    }
    return false;
  }

  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === stepKeys.length - 1;
  const nextStepBlocked = !isLastStep && isStepBlocked(currentIndex + 1);

  const navigationSteps: StepNavigationItem<ReviewStepKey>[] = steps.map(
    (step, index) => {
      const isActive = step.key === activeStep;
      const isBlocked = isStepBlocked(index);
      const isCompleted = stepState[step.key].completed;

      return {
        key: step.key,
        label: step.label,
          status: isActive
            ? "active"
            : isCompleted || index < currentIndex
              ? "completed"
              : isBlocked
                ? "locked"
                : "available"
      };
    }
  );

  /* -------------------------------------------------- */
  /* Render                                             */
  /* -------------------------------------------------- */

  return (
    <ReviewStepContext.Provider
      value={{
        activeStep,
        setActiveStep,
        markStepCompleted,
        goToNextStep,
        goToPreviousStep,
      }}
    >
      <AppHeader homePath={`/admin/projects/${projectId}`} />

      {/* Step Navigation */}
      <Box
        style={{
          position: "sticky",
          top: 88,
          zIndex: 90,
          borderBottom: "1px solid #e9ecef",
          background: "#ffffff",
        }}
      >
        <Container size="lg" py="sm">
          <StepNavigation
            steps={navigationSteps}
            onStepClick={setActiveStep}
          />
        </Container>
      </Box>

      {/* Step Content */}
      <Container size="lg" py="xl">
        {children}

        {/* Bottom Navigation */}
        <Group justify="space-between" mt="xl">
          <Button
            variant="default"
            onClick={goToPreviousStep}
            disabled={isFirstStep}
          >
            Previous step
          </Button>

          <Button
            onClick={goToNextStep}
            disabled={isLastStep || nextStepBlocked}
          >
            Next step
          </Button>
        </Group>
      </Container>
    </ReviewStepContext.Provider>
  );
}