import { useState } from "react";
import {
  Box,
  Button,
  Container,
  Group,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useParams } from "react-router-dom";

import AppHeader from "../../../../components/AppHeader";
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
    steps[0].key
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
            (step.key === "distance" && hasDistance) ||
            (step.key === "tickets" && allTicketsReviewed) ||
            (step.key === "decision" && isClaimFinal),
        },
      ])
    ) as Record<ReviewStepKey, ReviewStepState>
  );

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
          <Group gap="md">
            {steps.map((step, index) => {
              const isActive = step.key === activeStep;
              const isBlocked = isStepBlocked(index);

              return (
                <UnstyledButton
                  key={step.key}
                  disabled={isBlocked}
                  onClick={() =>
                    !isBlocked && setActiveStep(step.key)
                  }
                >
                  <Group
                    gap={6}
                    style={{ opacity: isBlocked ? 0.4 : 1 }}
                  >
                    <Box
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        fontWeight: 600,
                        background: isActive
                          ? "#228be6"
                          : "#dee2e6",
                        color: isActive
                          ? "white"
                          : "#495057",
                      }}
                    >
                      {index + 1}
                    </Box>

                    <Text
                      size="sm"
                      fw={isActive ? 600 : 400}
                      c={isActive ? "blue" : "dimmed"}
                    >
                      {step.label}
                    </Text>
                  </Group>
                </UnstyledButton>
              );
            })}
          </Group>
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