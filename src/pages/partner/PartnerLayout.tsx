// src/pages/partner/PartnerLayout.tsx

import { Box, Container, Group, Text } from "@mantine/core";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import AppHeader from "../../components/AppHeader";
import PartnerResumeHeader from "./components/PartnerResumeHeader";

const STORAGE_PREFIX = "partner_submission_";

// STEP MASTER DEFINITION
const STEPS = [
  { label: "Setup", path: "setup" },
  { label: "Organisation", path: "organisation" },
  { label: "Contact", path: "contact" },
  { label: "Bank", path: "bank" },
  { label: "Participants", path: "participants" },
  { label: "Tickets", path: "tickets" },
  { label: "Review & Submit", path: "submit" },
];

export default function PartnerLayout() {
  const { projectToken } = useParams<{ projectToken: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [maxReachedStepIndex, setMaxReachedStepIndex] = useState(0);

  // --------------------------------------------------
  // Load submissionId
  // --------------------------------------------------
  useEffect(() => {
    if (!projectToken) return;
    const stored = localStorage.getItem(STORAGE_PREFIX + projectToken);
    setSubmissionId(stored);
  }, [projectToken]);

  // --------------------------------------------------
  // Current Step Detection
  // --------------------------------------------------
  const currentStepIndex = useMemo(() => {
    if (!projectToken) return 0;

    const foundIndex = STEPS.findIndex((s) =>
      location.pathname.includes(`/p/${projectToken}/${s.path}`)
    );

    return foundIndex >= 0 ? foundIndex : 0;
  }, [location.pathname, projectToken]);

  const safeStepIndex = Math.max(0, currentStepIndex);

  // --------------------------------------------------
  // Load max reached step (initial)
  // --------------------------------------------------
  useEffect(() => {
    if (!projectToken) return;

    const storedMax = Number(
      localStorage.getItem(`partner_max_step_${projectToken}`) ?? 0
    );

    setMaxReachedStepIndex(storedMax);
  }, [projectToken]);

  // --------------------------------------------------
  // ⭐ BULLETPROOF MAX STEP MEMORY
  // --------------------------------------------------
  useEffect(() => {
    if (!projectToken) return;

    const storageKey = `partner_max_step_${projectToken}`;
    const storedMax = Number(localStorage.getItem(storageKey) ?? 0);

    const newMax = Math.max(storedMax, safeStepIndex);

    if (newMax !== storedMax) {
      localStorage.setItem(storageKey, String(newMax));
    }

    if (newMax !== maxReachedStepIndex) {
      setMaxReachedStepIndex(newMax);
    }
  }, [safeStepIndex, projectToken, maxReachedStepIndex]);

  // --------------------------------------------------
  // Header visibility
  // --------------------------------------------------
  const isOnboarding = location.pathname === `/p/${projectToken}`;

  const showHeader =
    !isOnboarding && !!submissionId && !!projectToken;

  // --------------------------------------------------
  // Navigation
  // --------------------------------------------------
  function handleStepClick(stepIndex: number) {
    if (!projectToken) return;
    if (stepIndex > maxReachedStepIndex) return;

    navigate(`/p/${projectToken}/${STEPS[stepIndex].path}`);
  }

  // --------------------------------------------------
  // Inline Styling Base
  // --------------------------------------------------
  const circleBaseStyle = {
    width: 28,
    height: 28,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 600,
    transition: "all 0.15s ease",
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  return (
    <>
      {showHeader && (
        <AppHeader
          homePath={`/p/${projectToken}`}
          right={
            <PartnerResumeHeader
              projectToken={projectToken!}
              submissionId={submissionId}
            />
          }
        />
      )}

      {/* STEP NAVIGATOR */}
      {showHeader && (
          <Box
            style={{
              position: "sticky",
              top: 88, // Höhe des AppHeaders
              zIndex: 90,
              borderBottom: "1px solid #e9ecef",
              background: "#ffffff",
            }}
          >

          <Container size="lg" py="sm">
            <Group gap="md">
              {STEPS.map((step, index) => {
                const isActive = index === safeStepIndex;
                const isCompleted = index < safeStepIndex;
                const isAvailable =
                  index > safeStepIndex &&
                  index <= maxReachedStepIndex;
                const isLocked = index > maxReachedStepIndex;

                const isClickable = !isLocked;

                return (
                  <Group
                    key={step.label}
                    gap={6}
                    style={{
                      cursor: isClickable ? "pointer" : "not-allowed",
                      opacity: isLocked ? 0.5 : 1,
                    }}
                    onClick={() => handleStepClick(index)}
                  >
                    <Box
                      style={{
                        ...circleBaseStyle,
                        background: isActive
                          ? "#228be6"
                          : isCompleted
                          ? "#40c057"
                          : isAvailable
                          ? "#e7f5ff"
                          : "#dee2e6",
                        border: isAvailable
                          ? "2px solid #4dabf7"
                          : "2px solid transparent",
                        color:
                          isActive || isCompleted
                            ? "white"
                            : "#495057",
                      }}
                    >
                      {index + 1}
                    </Box>

                    <Text
                      size="sm"
                      fw={isActive ? 600 : 400}
                      c={
                        isActive
                          ? "blue"
                          : isCompleted
                          ? "dark"
                          : isAvailable
                          ? "blue"
                          : "dimmed"
                      }
                    >
                      {step.label}
                    </Text>
                  </Group>
                );
              })}
            </Group>
          </Container>
        </Box>
      )}

      <Outlet />
    </>
  );
}
