// src/pages/partner/PartnerLayout.tsx

import { Box, Container } from "@mantine/core";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import AppHeader from "../../components/AppHeader";
import StepNavigation, {
  type StepNavigationItem,
} from "../../components/StepNavigation";
import PartnerResumeHeader from "./components/PartnerResumeHeader";

const STORAGE_PREFIX = "partner_org_";

const STEPS = [
  { label: "Setup", path: "setup" },
  { label: "Organisation", path: "organisation" },
  { label: "Contact", path: "contact" },
  { label: "Bank", path: "bank" },
  { label: "Participants", path: "participants" },
  { label: "Tickets", path: "tickets" },
  { label: "Review & Submit", path: "submit" },
] as const;

type PartnerStepPath = (typeof STEPS)[number]["path"];

export default function PartnerLayout() {
  const { projectToken } = useParams<{ projectToken: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [partnerOrgId, setPartnerOrgId] = useState<string | null>(null);
  const [maxReachedStepIndex, setMaxReachedStepIndex] = useState(0);

  useEffect(() => {
    if (!projectToken) return;

    const stored = localStorage.getItem(STORAGE_PREFIX + projectToken);
    setPartnerOrgId(stored);
  }, [projectToken]);

  const currentStepIndex = useMemo(() => {
    if (!projectToken) return 0;

    const foundIndex = STEPS.findIndex((step) =>
      location.pathname.includes(`/p/${projectToken}/${step.path}`)
    );

    return foundIndex >= 0 ? foundIndex : 0;
  }, [location.pathname, projectToken]);

  const safeStepIndex = Math.max(0, currentStepIndex);

  useEffect(() => {
    if (!projectToken) return;

    const storedMax = Number(
      localStorage.getItem(`partner_max_step_${projectToken}`) ?? 0
    );

    setMaxReachedStepIndex(storedMax);
  }, [projectToken]);

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

  const isOnboarding = location.pathname === `/p/${projectToken}`;
  const showHeader = !isOnboarding && !!partnerOrgId && !!projectToken;

  function handleStepClick(stepPath: PartnerStepPath) {
    if (!projectToken) return;

    const stepIndex = STEPS.findIndex((step) => step.path === stepPath);

    if (stepIndex < 0) return;
    if (stepIndex > maxReachedStepIndex) return;

    navigate(`/p/${projectToken}/${stepPath}`);
  }

  const navigationSteps: StepNavigationItem<PartnerStepPath>[] = STEPS.map(
    (step, index) => {
      const isActive = index === safeStepIndex;
      const isCompleted = index < safeStepIndex;
      const isAvailable =
        index > safeStepIndex && index <= maxReachedStepIndex;
      const isLocked = index > maxReachedStepIndex;

      return {
        key: step.path,
        label: step.label,
        status: isActive
          ? "active"
          : isCompleted
            ? "completed"
            : isAvailable
              ? "available"
              : isLocked
                ? "locked"
                : "pending",
      };
    }
  );

  return (
    <>
      {showHeader && (
        <AppHeader
          homePath={`/p/${projectToken}`}
          right={
            <PartnerResumeHeader
              projectToken={projectToken}
              partnerOrgId={partnerOrgId}
            />
          }
        />
      )}

      {showHeader && (
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
              onStepClick={handleStepClick}
            />
          </Container>
        </Box>
      )}

      <Outlet />
    </>
  );
}