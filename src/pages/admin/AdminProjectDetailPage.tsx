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
  Participant,
  Ticket,
} from "./project/types";

export default function AdminProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const { submissions, loading: loadingSubmissions } =
    useProjectSubmissions(projectId ?? "");

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const [countries, setCountries] = useState<ProjectCountry[]>([]);
  const [partnerOrgs, setPartnerOrgs] = useState<ProjectPartnerOrg[]>([]);
  const [allCountries, setAllCountries] = useState<CountryRef[]>([]);

  // Submission modal
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [activeSubmission, setActiveSubmission] =
    useState<SubmissionSummary | null>(null);
  const [modalParticipants, setModalParticipants] = useState<Participant[]>([]);
  const [modalTickets, setModalTickets] = useState<Ticket[]>([]);

  // Country form
  const [newCountry, setNewCountry] = useState("");

  // Partner form
  const [newPartnerName, setNewPartnerName] = useState("");
  const [newPartnerCountry, setNewPartnerCountry] = useState<string | null>(
    null
  );

  // ---------------------------------------------------
  // Load project + host organisation + countries + partners
  // ---------------------------------------------------
  useEffect(() => {
    async function load() {
      if (!projectId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      // Project incl. host organisation
      const { data: proj } = await supabase
        .from("projects")
        .select(`
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
        `)
        .eq("id", projectId)
        .single();

      setProject(proj as Project | null);

      // Countries
      const { data: pc } = await supabase
        .from("project_countries")
        .select("*")
        .eq("project_id", projectId)
        .order("country_code", { ascending: true });
      setCountries(pc || []);

      // Partner orgs
      const { data: po } = await supabase
        .from("project_partner_orgs")
        .select("*")
        .eq("project_id", projectId)
        .order("country_code", { ascending: true })
        .order("organisation_name", { ascending: true });
      setPartnerOrgs(po || []);

      // All countries (reference list)
      const { data: allC } = await supabase
        .from("countries")
        .select("code,name")
        .order("name", { ascending: true });
      setAllCountries(allC || []);

      setLoading(false);
    }

    load();
  }, [projectId]);

  // Helpers
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

  // ---------------------------------------------------
  // Update project reference number
  // ---------------------------------------------------
  async function updateProjectReference(newRef: string) {
    if (!projectId) return;

    await supabase
      .from("projects")
      .update({ project_reference: newRef })
      .eq("id", projectId);

    setProject((prev) =>
      prev ? { ...prev, project_reference: newRef } : prev
    );
  }

  // ---------------------------------------------------
  // Submission details loader
  // ---------------------------------------------------
  async function loadSubmissionDetails(submissionId: string) {
    const { data: parts } = await supabase
      .from("participants")
      .select("id, full_name")
      .eq("project_partner_submission_id", submissionId)
      .order("full_name", { ascending: true });

    const { data: tix } = await supabase
      .from("tickets")
      .select(`
        id,
        from_location,
        to_location,
        amount_eur,
        ticket_participants (
          participant: participants ( id, full_name )
        )
      `)
      .eq("project_partner_submission_id", submissionId)
      .order("created_at", { ascending: true });

    const normalizedTickets =
      (tix || []).map((t) => ({
        id: t.id,
        from_location: t.from_location,
        to_location: t.to_location,
        amount_eur: t.amount_eur,
        assigned_participants:
          t.ticket_participants?.map((tp: any) => tp.participant) ?? [],
      })) ?? [];

    return {
      participants: (parts || []) as Participant[],
      tickets: normalizedTickets,
    };
  }

  async function openSubmissionModal(sub: SubmissionSummary) {
    setActiveSubmission(sub);
    setSubModalOpen(true);

    const details = await loadSubmissionDetails(sub.id);
    setModalParticipants(details.participants);
    setModalTickets(details.tickets);
  }

  // ---------------------------------------------------
  // Render
  // ---------------------------------------------------
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

  const projectCountryOptions = countries.map((c) => ({
    value: c.country_code,
    label: getCountryLabel(c.country_code),
  }));

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
            onUpdateReference={updateProjectReference}
          />
        </Tabs.Panel>

        <Tabs.Panel value="countries" pt="md">
          <CountryTab
            countries={countries}
            allCountries={allCountries}
            newCountry={newCountry}
            setNewCountry={setNewCountry}
            addCountry={async () => {}}
            deleteCountry={async () => {}}
            getCountryLabel={getCountryLabel}
          />
        </Tabs.Panel>

        <Tabs.Panel value="partners" pt="md">
          <PartnersTab
            partnerOrgs={partnerOrgs}
            projectCountryOptions={projectCountryOptions}
            newPartnerName={newPartnerName}
            setNewPartnerName={setNewPartnerName}
            newPartnerCountry={newPartnerCountry}
            setNewPartnerCountry={setNewPartnerCountry}
            addPartnerOrg={async () => {}}
            deletePartnerOrg={async () => {}}
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
/>

        </Tabs.Panel>
      </Tabs>

      <SubmissionDetailsModal
        opened={subModalOpen}
        onClose={() => setSubModalOpen(false)}
        submission={activeSubmission}
        participants={modalParticipants}
        tickets={modalTickets}
        getCountryLabel={getCountryLabel}
        project={project}
        countries={countries}
      />
    </Stack>
  );
}
