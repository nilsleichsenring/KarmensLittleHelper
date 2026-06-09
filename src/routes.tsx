// src/routes.tsx

import { Routes, Route, Navigate } from "react-router-dom";

/* Admin */
import OrganisationSelectPage from "./pages/admin/OrganisationSelectPage";
import AdminProjectsPage from "./pages/admin/AdminProjectsPage";
import AdminProjectDetailPage from "./pages/admin/AdminProjectDetailPage";
import { AdminProjectCountriesPage } from "./pages/admin/AdminProjectCountriesPage";
import { AdminLayout } from "./pages/admin/AdminLayout";

/* Partner layout */
import PartnerLayout from "./pages/partner/PartnerLayout";

/* Partner pages */
import PartnerOnboardingPage from "./pages/partner/PartnerOnboardingPage";
import PartnerSetupPage from "./pages/partner/PartnerSetupPage";
import PartnerOrganisationPage from "./pages/partner/PartnerOrganisationPage";
import PartnerContactPage from "./pages/partner/PartnerContactPage";
import PartnerBankPage from "./pages/partner/PartnerBankPage";
import PartnerParticipantsPage from "./pages/partner/PartnerParticipantsPage";
import PartnerTicketsPage from "./pages/partner/PartnerTicketsPage";
import PartnerSubmitPage from "./pages/partner/PartnerSubmitPage";
import PartnerDonePage from "./pages/partner/PartnerDonePage";
import PartnerDashboardPage from "./pages/partner/PartnerDashboardPage";
import PartnerOrganisationSetupPage from "./pages/partner/PartnerOrganisationSetupPage";
import PartnerOrganisationDetailsPage from "./pages/partner/PartnerOrganisationDetailsPage";
import PartnerOrganisationContactPage from "./pages/partner/PartnerOrganisationContactPage";
import PartnerOrganisationDetailsViewPage from "./pages/partner/PartnerOrganisationDetailsViewPage";

/* Participant pages */
import ParticipantOnboardingPage from "./pages/participant/ParticipantOnboardingPage";

export function AppRoutes() {
  return (
    <Routes>
      {/* Admin */}
      <Route path="/" element={<OrganisationSelectPage />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route path="projects" element={<AdminProjectsPage />} />
        <Route
          path="projects/:projectId"
          element={<AdminProjectDetailPage />}
        />
        <Route
          path="projects/:projectId/countries"
          element={<AdminProjectCountriesPage />}
        />
      </Route>

      {/* Partner Dashboard 2.0 */}
      <Route
        path="/partner/:partnerResumeToken"
        element={<PartnerDashboardPage />}
      />

      <Route
        path="/partner/:partnerResumeToken/setup"
        element={<PartnerOrganisationSetupPage />}
      />

      <Route
        path="/partner/:partnerResumeToken/organisation"
        element={<PartnerOrganisationDetailsPage />}
      />

      <Route
        path="/partner/:partnerResumeToken/contact"
        element={<PartnerOrganisationContactPage />}
      />

      <Route
        path="/partner/:partnerResumeToken/organisation-details"
        element={<PartnerOrganisationDetailsViewPage />}
      />

      {/* Partner – Einstieg */}

      {/* Partner – Einstieg */}
      <Route path="/p/:projectToken" element={<PartnerOnboardingPage />} />

      {/* Partner – aktiver Flow (MIT Layout) */}
      <Route path="/p/:projectToken" element={<PartnerLayout />}>
        <Route path="setup" element={<PartnerSetupPage />} />
        <Route path="organisation" element={<PartnerOrganisationPage />} />
        <Route path="contact" element={<PartnerContactPage />} />
        <Route path="bank" element={<PartnerBankPage />} />
        <Route path="participants" element={<PartnerParticipantsPage />} />
        <Route path="tickets" element={<PartnerTicketsPage />} />
        <Route path="submit" element={<PartnerSubmitPage />} />
      </Route>

      {/* Partner – Abschluss (OHNE Layout) */}
      <Route path="/p/:projectToken/done" element={<PartnerDonePage />} />

      {/* Participant onboarding */}
      <Route
        path="/participant/:projectToken"
        element={<ParticipantOnboardingPage />}
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}