// src/routes.tsx

import { Routes, Route, Navigate } from "react-router-dom";

/* Admin */
import OrganisationSelectPage from "./pages/admin/OrganisationSelectPage";
import AdminProjectsPage from "./pages/admin/AdminProjectsPage";
import AdminProjectDetailPage from "./pages/admin/AdminProjectDetailPage";
import { AdminProjectCountriesPage } from "./pages/admin/AdminProjectCountriesPage";

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

export function AppRoutes() {
  return (
    <Routes>
      {/* Admin */}
      <Route path="/" element={<OrganisationSelectPage />} />
      <Route path="/admin/projects" element={<AdminProjectsPage />} />
      <Route
        path="/admin/projects/:projectId"
        element={<AdminProjectDetailPage />}
      />
      <Route
        path="/admin/projects/:projectId/countries"
        element={<AdminProjectCountriesPage />}
      />

      {/* Partner – Einstieg */}
      <Route
        path="/p/:projectToken"
        element={<PartnerOnboardingPage />}
      />

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
      <Route
        path="/p/:projectToken/done"
        element={<PartnerDonePage />}
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
