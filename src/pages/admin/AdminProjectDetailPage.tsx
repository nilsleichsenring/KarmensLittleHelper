import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import {
  Button,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
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



const PROJECT_TYPES = [
  { value: "Youth Exchange", label: "Youth Exchange" },
  { value: "Training Course", label: "Training Course" },
  { value: "Seminar", label: "Seminar" },
];



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

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editProjectType, setEditProjectType] = useState<string | null>(null);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);



  // ---------------------------------------------------
  // Load project + countries + partner orgs + country ref
  // ---------------------------------------------------
  useEffect(() => {
    async function load() {
      if (!projectId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      // Project
      const { data: proj } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      setProject(proj as Project | null);

      if (proj) {
        setEditName(proj.name);
        setEditProjectType(proj.project_type);
        setEditStartDate(proj.start_date ?? "");
        setEditEndDate(proj.end_date ?? "");
        setEditDescription(proj.description ?? "");
        setEditNotes(proj.internal_notes ?? "");
      }

      // Countries
      const { data: pc } = await supabase
        .from("project_countries")
        .select("*")
        .eq("project_id", projectId)
        .order("country_code", { ascending: true });

      setCountries((pc || []) as ProjectCountry[]);

      // Partner orgs
      const { data: po } = await supabase
        .from("project_partner_orgs")
        .select("*")
        .eq("project_id", projectId)
        .order("country_code", { ascending: true })
        .order("organisation_name", { ascending: true });

      setPartnerOrgs((po || []) as ProjectPartnerOrg[]);

      // Country reference list
      const { data: allC } = await supabase
        .from("countries")
        .select("code,name")
        .order("name", { ascending: true });

      setAllCountries((allC || []) as CountryRef[]);

      setLoading(false);
    }

    load();
  }, [projectId]);



  // ---------------------------------------------------
  // Helpers
  // ---------------------------------------------------
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
  // Load submission details (modal)
  // ---------------------------------------------------
  async function loadSubmissionDetails(submissionId: string) {
    // 1. Participants
    const { data: parts } = await supabase
      .from("participants")
      .select("id, full_name")
      .eq("project_partner_submission_id", submissionId)
      .order("full_name", { ascending: true });

    // 2. Tickets + assigned participants (via ticket_participants)
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

    // 3. Tickets normalisieren
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

  // ---------------------------------------------------
  // Add country
  // ---------------------------------------------------
  async function addCountry() {
    if (!projectId || !newCountry) return;

    const { data } = await supabase
      .from("project_countries")
      .insert({
        project_id: projectId,
        country_code: newCountry,
      })
      .select()
      .single();

    if (data) {
      setCountries((prev) => [...prev, data as ProjectCountry]);
      setNewCountry("");
    }
  }



  // ---------------------------------------------------
  // Delete country
  // ---------------------------------------------------
  async function deleteCountry(id: string) {
    await supabase.from("project_countries").delete().eq("id", id);
    setCountries((prev) => prev.filter((c) => c.id !== id));
  }



  // ---------------------------------------------------
  // Add partner org
  // ---------------------------------------------------
  async function addPartnerOrg() {
    if (!projectId || !newPartnerName.trim()) return;

    const { data } = await supabase
      .from("project_partner_orgs")
      .insert({
        project_id: projectId,
        organisation_name: newPartnerName.trim(),
        country_code: newPartnerCountry || null,
      })
      .select()
      .single();

    if (data) {
      setPartnerOrgs((prev) => [...prev, data as ProjectPartnerOrg]);
      setNewPartnerName("");
      setNewPartnerCountry(null);
    }
  }



  // ---------------------------------------------------
  // Delete partner org
  // ---------------------------------------------------
  async function deletePartnerOrg(id: string) {
    await supabase.from("project_partner_orgs").delete().eq("id", id);
    setPartnerOrgs((prev) => prev.filter((p) => p.id !== id));
  }



  // ---------------------------------------------------
  // Open submission modal
  // ---------------------------------------------------
  async function openSubmissionModal(sub: SubmissionSummary) {
    setActiveSubmission(sub);
    setSubModalOpen(true);

    const details = await loadSubmissionDetails(sub.id);
    setModalParticipants(details.participants);
    setModalTickets(details.tickets);
  }



  // ---------------------------------------------------
  // Save project edits
  // ---------------------------------------------------
  async function handleSaveEdit() {
    if (!projectId) return;

    if (!editName.trim()) {
      setFormError("Project name is required.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("projects")
      .update({
        name: editName.trim(),
        project_type: editProjectType,
        start_date: editStartDate || null,
        end_date: editEndDate || null,
        description: editDescription || null,
        internal_notes: editNotes || null,
      })
      .eq("id", projectId)
      .select()
      .single();

    setSaving(false);

    if (error) {
      setFormError("Could not save changes.");
      return;
    }

    setProject(data as Project);
    setEditOpen(false);
  }



  // ---------------------------------------------------
  // Rendering
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
      {/* Header */}
      <Group justify="space-between">
        <Title order={2}>{project.name}</Title>

        <Group>
          <Button variant="light" onClick={() => setEditOpen(true)}>
            Edit project
          </Button>
          <Button component={Link} to="/admin/projects" variant="subtle">
            ← Back
          </Button>
        </Group>
      </Group>

      {/* TABS */}
      <Tabs defaultValue="overview">
        <Tabs.List>
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="countries">Countries</Tabs.Tab>
          <Tabs.Tab value="partners">Partner organisations</Tabs.Tab>
          <Tabs.Tab value="submissions">Submissions</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <OverviewTab project={project} formatDateRange={formatDateRange} />
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
            projectCountryOptions={projectCountryOptions}
            newPartnerName={newPartnerName}
            setNewPartnerName={setNewPartnerName}
            newPartnerCountry={newPartnerCountry}
            setNewPartnerCountry={setNewPartnerCountry}
            addPartnerOrg={addPartnerOrg}
            deletePartnerOrg={deletePartnerOrg}
          />
        </Tabs.Panel>

        <Tabs.Panel value="submissions" pt="md">
          <SubmissionsTab
            projectName={project.name}
            submissions={submissions}
            loading={loadingSubmissions}
            getCountryLabel={getCountryLabel}
            onOpenSubmission={openSubmissionModal}
          />
        </Tabs.Panel>
      </Tabs>

      {/* Submission Modal */}
      <SubmissionDetailsModal
        opened={subModalOpen}
        onClose={() => setSubModalOpen(false)}
        submission={activeSubmission}
        participants={modalParticipants}
        tickets={modalTickets}
        getCountryLabel={getCountryLabel}
      />

      {/* Edit project modal */}
      <Modal
        opened={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit project"
        centered
      >
        <Stack gap="sm">
          <TextInput
            label="Project name"
            value={editName}
            onChange={(e) => setEditName(e.currentTarget.value)}
            withAsterisk
          />

          <Select
            label="Project type"
            data={PROJECT_TYPES}
            value={editProjectType}
            onChange={setEditProjectType}
            clearable
          />

          <Group grow>
            <TextInput
              label="Start date"
              type="date"
              value={editStartDate}
              onChange={(e) => setEditStartDate(e.currentTarget.value)}
            />
            <TextInput
              label="End date"
              type="date"
              value={editEndDate}
              onChange={(e) => setEditEndDate(e.currentTarget.value)}
            />
          </Group>

          <Textarea
            label="Description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.currentTarget.value)}
          />

          <Textarea
            label="Internal notes"
            value={editNotes}
            onChange={(e) => setEditNotes(e.currentTarget.value)}
          />

          {formError && (
            <Text c="red" size="sm">
              {formError}
            </Text>
          )}

          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={handleSaveEdit}>
              Save changes
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
