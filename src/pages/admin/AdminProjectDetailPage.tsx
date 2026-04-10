import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import {
  Button,
  Group,
  Loader,
  Stack,
  Text,
  Title,
  Tabs,
} from "@mantine/core";

import { OverviewTab } from "./project/tabs/OverviewTab";
import { CountryTab } from "./project/tabs/CountryTab";
import { PartnersTab } from "./project/tabs/PartnersTab";
import { SubmissionsTab } from "./project/tabs/SubmissionsTab";

import SubmissionDetailsModal from "./project/components/SubmissionDetailsModal";
import { useProjectSubmissions } from "./project/hooks/useProjectSubmissions";

import type {
  Project,
  ProjectCountry,
  ProjectPartnerOrg,
  CountryRef,
  SubmissionSummary,
} from "./project/types";

/* ---------------------------------------------
   Types
--------------------------------------------- */

type BankInfo = {
  account_holder: string | null;
  iban: string | null;
  bic: string | null;
  bank_name: string | null;
  bank_country: string | null;
};

type OrgStats = {
  participantCount: number;
  ticketCount: number;
};

/* ---------------------------------------------
   Component
--------------------------------------------- */

export default function AdminProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();

  /* -------------------------------------------
     Submissions
  ------------------------------------------- */
  const { submissions: fetchedSubmissions, loading: loadingSubmissions } =
    useProjectSubmissions(projectId ?? "");

  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [submissionsRefreshKey, setSubmissionsRefreshKey] = useState(0);
  const [preferredSubmissionTab, setPreferredSubmissionTab] = useState<
    "pending" | "approved" | "paid" | "rejected" | "abandoned" | null
  >(null);

  function refreshSubmissionsTab() {
    setSubmissionsRefreshKey((prev) => prev + 1);
  }

  useEffect(() => {
    setSubmissions(fetchedSubmissions);
  }, [fetchedSubmissions]);

  /* -------------------------------------------
     Project meta
  ------------------------------------------- */
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const [countries, setCountries] = useState<ProjectCountry[]>([]);
  const [partnerOrgs, setPartnerOrgs] = useState<ProjectPartnerOrg[]>([]);
  const [allCountries, setAllCountries] = useState<CountryRef[]>([]);

  const [newCountry, setNewCountry] = useState("");

  /* -------------------------------------------
     Bank info
  ------------------------------------------- */
  const [bankInfoByOrgName, setBankInfoByOrgName] = useState<
    Record<string, BankInfo>
  >({});

  /* -------------------------------------------
     Stats
  ------------------------------------------- */
  const [statsByOrgName, setStatsByOrgName] = useState<
    Record<string, OrgStats>
  >({});

  /* -------------------------------------------
     Modal state
  ------------------------------------------- */
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [activeSubmission, setActiveSubmission] =
    useState<SubmissionSummary | null>(null);

  /* -------------------------------------------
     Load project & meta
  ------------------------------------------- */
  useEffect(() => {
    async function load() {
      if (!projectId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data: proj } = await supabase
        .from("projects")
        .select(
          `
          id,
          name,
          description,
          created_at,
          organisation_id,
          project_type,
          start_date,
          end_date,
          internal_notes,
          project_reference,
          organisations:organisations!organisation_id (
            name,
            country_code
          )
        `
        )
        .eq("id", projectId)
        .single();

      setProject(proj as Project | null);

      const { data: pc } = await supabase
        .from("project_countries")
        .select("*")
        .eq("project_id", projectId)
        .order("country_code", { ascending: true });
      setCountries(pc || []);

      const { data: po } = await supabase
        .from("project_partner_orgs")
        .select("*")
        .eq("project_id", projectId)
        .order("country_code", { ascending: true })
        .order("organisation_name", { ascending: true });
      setPartnerOrgs(po || []);

      const { data: allC } = await supabase
        .from("countries")
        .select("code,name")
        .order("name", { ascending: true });
      setAllCountries(allC || []);

      const { data: subs } = await supabase
        .from("project_partner_submissions")
        .select(
          `
          organisation_name,
          account_holder,
          iban,
          bic,
          bank_name,
          bank_country
        `
        )
        .eq("project_id", projectId);

      const bankMap: Record<string, BankInfo> = {};
      const statsMap: Record<string, OrgStats> = {};

      (subs || []).forEach((s: any) => {
        const orgName = (s.organisation_name ?? "").trim();
        if (!orgName) return;

        bankMap[orgName] = {
          account_holder: s.account_holder ?? null,
          iban: s.iban ?? null,
          bic: s.bic ?? null,
          bank_name: s.bank_name ?? null,
          bank_country: s.bank_country ?? null,
        };

        if (!statsMap[orgName]) {
          statsMap[orgName] = {
            participantCount: 0,
            ticketCount: 0,
          };
        }
      });

      fetchedSubmissions.forEach((s) => {
        const org = (s.organisation_name ?? "").trim();
        if (!org) return;

        statsMap[org] = {
          participantCount: s.participantCount,
          ticketCount: s.ticketCount,
        };
      });

      setBankInfoByOrgName(bankMap);
      setStatsByOrgName(statsMap);

      setLoading(false);
    }

    load();
  }, [projectId, fetchedSubmissions]);

  /* -------------------------------------------
     Helpers
  ------------------------------------------- */
  function getCountryLabel(code: string | null) {
    if (!code) return "—";
    const found = allCountries.find((c) => c.code === code);
    return found ? `${found.name} (${found.code})` : code;
  }

  function formatDateRange(start: string | null, end: string | null) {
    if (!start && !end) return "Not set";
    if (start && !end) return `from ${start}`;
    if (!start && end) return `until ${end}`;
    return `${start} → ${end}`;
  }

  function getTabForClaimStatus(
    claimStatus: SubmissionSummary["claim_status"]
  ): "pending" | "approved" | "rejected" {
    if (claimStatus === "approved" || claimStatus === "adjusted") {
      return "approved";
    }

    if (claimStatus === "rejected") {
      return "rejected";
    }

    return "pending";
  }

  /* -------------------------------------------
     Country handling
  ------------------------------------------- */
  async function addCountry() {
    if (!projectId || !newCountry) return;

    if (countries.some((c) => c.country_code === newCountry)) return;

    const { data } = await supabase
      .from("project_countries")
      .insert({
        project_id: projectId,
        country_code: newCountry,
      })
      .select()
      .single();

    if (data) {
      setCountries((prev) => [...prev, data]);
      setNewCountry("");
    }
  }

  async function deleteCountry(id: string) {
    await supabase.from("project_countries").delete().eq("id", id);
    setCountries((prev) => prev.filter((c) => c.id !== id));
  }

  /* -------------------------------------------
     Modal handling
  ------------------------------------------- */
  function openSubmissionModal(sub: SubmissionSummary) {
    setActiveSubmission(sub);
    setSubModalOpen(true);
  }

  /* -------------------------------------------
     Parent-level submission mutations
  ------------------------------------------- */
  function handleDeleteSubmission(submissionId: string) {
    setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));

    if (activeSubmission?.id === submissionId) {
      setSubModalOpen(false);
      setActiveSubmission(null);
    }
  }

  function handlePaymentUpdated(
    submissionId: string,
    payload: {
      payment_status: SubmissionSummary["payment_status"];
      payment_paid_at: string | null;
    }
  ) {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === submissionId ? { ...s, ...payload } : s))
    );
  }

  /* -------------------------------------------
     Review callback
  ------------------------------------------- */
  async function handleReviewComplete(
    submissionId: string,
    payload: {
      reviewed_at: string | null;
      claim_status: SubmissionSummary["claim_status"];
      approved_amount_eur?: number | null;
    }
  ) {
    const { error } = await supabase
      .from("project_partner_submissions")
      .update({
        reviewed_at: payload.reviewed_at,
        claim_status: payload.claim_status,
        approved_amount_eur: payload.approved_amount_eur ?? null,
      })
      .eq("id", submissionId);

    if (error) {
      console.error("Review update failed", error);
      return;
    }

    setPreferredSubmissionTab(getTabForClaimStatus(payload.claim_status));

    setSubmissions((prev) =>
      prev.map((s) => (s.id === submissionId ? { ...s, ...payload } : s))
    );

    setSubmissionsRefreshKey((prev) => prev + 1);
  }

  /* -------------------------------------------
     Render
  ------------------------------------------- */
  if (loading) {
    return (
      <Group justify="center" mt="xl">
        <Loader />
      </Group>
    );
  }

  if (!project) {
    return (
      <Stack>
        <Text>Project not found.</Text>
        <Button component={Link} to="/admin/projects" variant="light">
          ← Back to projects
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>{project.name}</Title>
        <Button component={Link} to="/admin/projects" variant="subtle">
          ← Back
        </Button>
      </Group>

      <Tabs defaultValue="overview">
        <Tabs.List>
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="countries">Countries</Tabs.Tab>
          <Tabs.Tab value="partners">Partner organisations</Tabs.Tab>
          <Tabs.Tab value="submissions">Submissions</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <OverviewTab
            project={project}
            projectCountries={countries}
            hostCountryCode={project.organisations?.country_code ?? null}
            hostOrganisationName={project.organisations?.name ?? "Unknown host"}
            formatDateRange={formatDateRange}
            onUpdateReference={async () => {}}
          />
        </Tabs.Panel>

        <Tabs.Panel value="countries" pt="md">
          <CountryTab
            countries={countries}
            allCountries={allCountries}
            newCountry={newCountry}
            setNewCountry={setNewCountry}
            addCountry={addCountry}
            deleteCountry={deleteCountry}
            getCountryLabel={getCountryLabel}
          />
        </Tabs.Panel>

        <Tabs.Panel value="partners" pt="md">
          <PartnersTab
            partnerOrgs={partnerOrgs}
            bankInfoByOrgName={bankInfoByOrgName}
            statsByOrgName={statsByOrgName}
          />
        </Tabs.Panel>

        <Tabs.Panel value="submissions" pt="md">
          <SubmissionsTab
            project={project}
            countries={countries}
            submissions={submissions}
            loading={loadingSubmissions}
            getCountryLabel={getCountryLabel}
            onOpenSubmission={openSubmissionModal}
            refreshKey={submissionsRefreshKey}
            preferredTab={preferredSubmissionTab}
            onPreferredTabApplied={() => setPreferredSubmissionTab(null)}
            onRequireRefresh={refreshSubmissionsTab}
            onDeleteSubmission={handleDeleteSubmission}
            onPaymentUpdated={handlePaymentUpdated}
          />
        </Tabs.Panel>
      </Tabs>

      <SubmissionDetailsModal
        opened={subModalOpen}
        onClose={() => setSubModalOpen(false)}
        submission={activeSubmission}
        getCountryLabel={getCountryLabel}
        project={project}
        countries={countries}
        onReviewComplete={handleReviewComplete}
      />
    </Stack>
  );
}