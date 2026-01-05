// src/pages/partner/PartnerLayout.tsx

import { Outlet, useLocation, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import PartnerResumeHeader from "./components/PartnerResumeHeader";

const STORAGE_PREFIX = "partner_submission_";

export default function PartnerLayout() {
  const { projectToken } = useParams<{ projectToken: string }>();
  const location = useLocation();

  const [submissionId, setSubmissionId] = useState<string | null>(null);

  // --------------------------------------------------
  // Load submissionId from localStorage (browser-bound)
  // --------------------------------------------------
  useEffect(() => {
    if (!projectToken) return;

    const stored = localStorage.getItem(STORAGE_PREFIX + projectToken);
    setSubmissionId(stored);
  }, [projectToken]);

  // --------------------------------------------------
  // Header visibility rules
  // --------------------------------------------------
  const isOnboarding = location.pathname === `/p/${projectToken}`;
  const isSetup = location.pathname === `/p/${projectToken}/setup`;

  const showHeader =
    !isOnboarding && !isSetup && !!submissionId && !!projectToken;

  return (
    <>
      {showHeader && (
        <PartnerResumeHeader
          projectToken={projectToken!}
          submissionId={submissionId}
        />
      )}

      <Outlet />
    </>
  );
}
