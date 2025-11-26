import { Routes, Route, Navigate } from "react-router-dom";

import OrganisationSelectPage from "./pages/admin/OrganisationSelectPage";
import AdminProjectsPage from "./pages/admin/AdminProjectsPage";
import AdminProjectDetailPage from "./pages/admin/AdminProjectDetailPage";
import { AdminProjectCountriesPage } from "./pages/admin/AdminProjectCountriesPage";

// Partner pages
import PartnerSetupPage from "./pages/partner/PartnerSetupPage";
import PartnerContactPage from "./pages/partner/PartnerContactPage";
import PartnerBankPage from "./pages/partner/PartnerBankPage";
import PartnerParticipantsPage from "./pages/partner/PartnerParticipantsPage";
import PartnerTicketsPage from "./pages/partner/PartnerTicketsPage";
import PartnerSubmitPage from "./pages/partner/PartnerSubmitPage";
import PartnerDonePage from "./pages/partner/PartnerDonePage";

export function AppRoutes() {
  return (
    <Routes>
      {/* Organisation auswählen */}
      <Route path="/" element={<OrganisationSelectPage />} />

      {/* Admin: Projekte */}
      <Route path="/admin/projects" element={<AdminProjectsPage />} />
      <Route
        path="/admin/projects/:projectId"
        element={<AdminProjectDetailPage />}
      />
      <Route
        path="/admin/projects/:projectId/countries"
        element={<AdminProjectCountriesPage />}
      />

      {/* Partnerportal – flache Routen */}
      <Route path="/p/:projectToken" element={<PartnerSetupPage />} />
      <Route
        path="/p/:projectToken/contact"
        element={<PartnerContactPage />}
      />
      <Route path="/p/:projectToken/bank" element={<PartnerBankPage />} />
      <Route
        path="/p/:projectToken/participants"
        element={<PartnerParticipantsPage />}
      />
      <Route
        path="/p/:projectToken/tickets"
        element={<PartnerTicketsPage />}
      />
      <Route path="/p/:projectToken/submit" element={<PartnerSubmitPage />} />
      <Route path="/p/:projectToken/done" element={<PartnerDonePage />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
