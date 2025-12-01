import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Grid,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

// ✅ CountryFlag importiert
import { CountryFlag } from "../../components/CountryFlag";

type Project = {
  id: string;
  name: string;
  organisation_id: string | null;
  project_type: string | null;
  start_date: string | null;
  end_date: string | null;
  internal_notes: string | null;
  created_at: string;
};

type ProjectCountry = {
  id: string;
  project_id: string;
  country_code: string;
};

type CountryRow = {
  id: number;
  countryCode: string;
};

const ORG_LABELS: Record<string, string> = {
  ambitia: "Ambitia Institute",
  jka: "Jugendkulturarbeit",
};

const PROJECT_TYPES = [
  { value: "Youth Exchange", label: "Youth Exchange" },
  { value: "Training Course", label: "Training Course" },
  { value: "Seminar", label: "Seminar" },
];

export function AdminProjectsPage() {
  const navigate = useNavigate();

  const organisation_id = localStorage.getItem("organisation_id") || "ambitia";
  const organisationName = ORG_LABELS[organisation_id] || organisation_id;

  const [projects, setProjects] = useState<Project[]>([]);
  const [countriesByProject, setCountriesByProject] = useState<
    Record<string, ProjectCountry[]>
  >({});

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [countryOptions, setCountryOptions] = useState<
    { value: string; label: string }[]
  >([]);

  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);

  // Formular-States
  const [name, setName] = useState("");
  const [projectType, setProjectType] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [countries, setCountries] = useState<CountryRow[]>([
    { id: 1, countryCode: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // --------------------------------------------------
  // Daten laden: Projekte + Länder
  // --------------------------------------------------
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setLoadError(null);

      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("*")
        .eq("organisation_id", organisation_id)
        .order("created_at", { ascending: false });

      if (projectsError) {
        console.error("Error loading projects", projectsError);
        setLoadError("Could not load projects.");
        setProjects([]);
        setCountriesByProject({});
        setLoading(false);
        return;
      }

      const loadedProjects = projectsData || [];
      setProjects(loadedProjects);

      if (loadedProjects.length === 0) {
        setCountriesByProject({});
        setLoading(false);
        return;
      }

      const projectIds = loadedProjects.map((p) => p.id);

      const { data: countriesData, error: countriesError } = await supabase
        .from("project_countries")
        .select("*")
        .in("project_id", projectIds);

      if (countriesError) {
        console.error("Error loading project countries", countriesError);
        setCountriesByProject({});
        setLoading(false);
        return;
      }

      const map: Record<string, ProjectCountry[]> = {};
      (countriesData || []).forEach((row) => {
        if (!map[row.project_id]) map[row.project_id] = [];
        map[row.project_id].push(row as ProjectCountry);
      });

      setCountriesByProject(map);
      setLoading(false);
    }

    loadData();
  }, [organisation_id]);

  // --------------------------------------------------
  // Länder Optionen laden
  // --------------------------------------------------
  useEffect(() => {
    async function loadCountries() {
      const { data, error } = await supabase
        .from("countries")
        .select("code, name")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error loading countries", error);
        setCountryOptions([]);
        return;
      }

      const options =
        data?.map((c) => ({
          value: c.code,
          label: c.name,
        })) ?? [];

      setCountryOptions(options);
    }

    loadCountries();
  }, []);

  // --------------------------------------------------
  // Formular-Helfer
  // --------------------------------------------------
  function resetForm() {
    setName("");
    setProjectType(null);
    setStartDate("");
    setEndDate("");
    setNotes("");
    setCountries([{ id: 1, countryCode: "" }]);
    setFormError(null);
  }

  function handleOpenModal() {
    resetForm();
    openModal();
  }

  function updateCountryRow(id: number, patch: Partial<CountryRow>) {
    setCountries((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  function addCountryRow() {
    setCountries((rows) => [...rows, { id: Date.now(), countryCode: "" }]);
  }

  function removeCountryRow(id: number) {
    setCountries((rows) =>
      rows.length === 1 ? rows : rows.filter((row) => row.id !== id)
    );
  }

  // --------------------------------------------------
  // Projekt anlegen
  // --------------------------------------------------
  async function handleCreateProject() {
    setFormError(null);

    if (!name.trim()) {
      setFormError("Project name is required.");
      return;
    }

    const validCountries = countries.filter((c) => c.countryCode.trim() !== "");

    if (validCountries.length === 0) {
      setFormError("Please add at least one country.");
      return;
    }

    setSaving(true);

    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .insert({
        name,
        organisation_id,
        project_type: projectType,
        start_date: startDate || null,
        end_date: endDate || null,
        internal_notes: notes || null,
      })
      .select()
      .single();

    if (projectError || !projectData) {
      console.error("Error creating project", projectError);
      setFormError("Could not create project. Please try again.");
      setSaving(false);
      return;
    }

    const newProject = projectData as Project;

    const countryInserts = validCountries.map((c) => ({
      project_id: newProject.id,
      country_code: c.countryCode,
    }));

    const { data: insertedCountries, error: countryError } = await supabase
      .from("project_countries")
      .insert(countryInserts)
      .select();

    if (countryError) {
      console.error("Error saving project countries", countryError);
      setFormError("Project created, but countries could not be saved.");
      setSaving(false);
      return;
    }

    setProjects((prev) => [newProject, ...prev]);
    setCountriesByProject((prev) => ({
      ...prev,
      [newProject.id]: (insertedCountries || []) as ProjectCountry[],
    }));

    setSaving(false);
    closeModal();

    navigate(`/admin/projects/${newProject.id}`);
  }

  // --------------------------------------------------
  // Hilfsfunktionen
  // --------------------------------------------------
  function formatDateRange(start: string | null, end: string | null) {
    if (!start && !end) return "Dates not set";
    if (start && !end) return `from ${start}`;
    if (!start && end) return `until ${end}`;
    return `${start} → ${end}`;
  }

  // --------------------------------------------------
  // Render
  // --------------------------------------------------
  return (
    <Box style={{ minHeight: "100vh" }} bg="#f5f6fa" py="xl">
      <Container size="lg">
        {/* Header */}
        <Group justify="space-between" mb="xl">
          <Stack gap={4}>
            <Text size="sm" c="dimmed">
              Organisation
            </Text>
            <Title order={2}>{organisationName}</Title>
            <Text size="sm" c="dimmed">
              Manage all youth projects and participating countries for this organisation.
            </Text>
          </Stack>

          <Button size="md" onClick={handleOpenModal}>
            + Create project
          </Button>
        </Group>

        {/* Content */}
        {loading ? (
          <Text>Loading projects…</Text>
        ) : loadError ? (
          <Text c="red">{loadError}</Text>
        ) : projects.length === 0 ? (
          <Card withBorder padding="lg" radius="lg" shadow="sm" bg="white">
            <Title order={4} mb="xs">No projects yet</Title>
            <Text c="dimmed" mb="md">
              Create the first project to get started.
            </Text>
            <Button onClick={handleOpenModal}>+ Create project</Button>
          </Card>
        ) : (
          <Grid>
            {projects.map((project) => {
              const projectCountries = countriesByProject[project.id] || [];

              return (
                <Grid.Col key={project.id} span={{ base: 12, sm: 6, md: 4 }}>
                  <Card
                    withBorder
                    padding="lg"
                    radius="lg"
                    shadow="md"
                    bg="white"
                    style={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Stack gap="sm" style={{ flexGrow: 1 }}>
                      <Group justify="space-between" align="flex-start">
                        <Title order={4} lineClamp={2}>
                          {project.name}
                        </Title>

                        {project.project_type ? (
                          <Badge color="blue" variant="light">
                            {project.project_type}
                          </Badge>
                        ) : (
                          <Badge color="gray" variant="light">
                            No type
                          </Badge>
                        )}
                      </Group>

                      <Stack gap={2}>
                        <Text size="xs" c="dimmed" tt="uppercase">
                          Dates
                        </Text>
                        <Text
                          size="sm"
                          c={!project.start_date && !project.end_date ? "dimmed" : undefined}
                        >
                          {formatDateRange(project.start_date, project.end_date)}
                        </Text>
                      </Stack>

                      <Stack gap={4}>
                        <Text size="xs" c="dimmed" tt="uppercase">
                          Countries
                        </Text>

                        <Group gap={6}>
                          {projectCountries.length === 0 ? (
                            <Text size="sm" c="dimmed">None yet</Text>
                          ) : (

                            projectCountries.map((c) => (
                              <Badge key={c.id} variant="outline" pl={6} pr={8}>
                                <CountryFlag code={c.country_code} size={14} radius={2} />{" "}
                                {c.country_code}
                              </Badge>
                
                            ))
                          )}
                        </Group>
                      </Stack>
                    </Stack>

                    <Divider my="md" />

                    <Group justify="space-between">
                      <Button
                        variant="light"
                        size="xs"
                        onClick={() => navigate(`/admin/projects/${project.id}`)}
                      >
                        View project
                      </Button>

                      <Button variant="subtle" color="red" size="xs">
                        Delete
                      </Button>
                    </Group>
                  </Card>
                </Grid.Col>
              );
            })}
          </Grid>
        )}

        {/* Modal */}
        <Modal
          opened={modalOpened}
          onClose={() => (saving ? null : closeModal())}
          title="Create project"
          size="lg"
          centered
        >
          <Stack gap="lg">
            {/* Basic info */}
            <Stack gap="xs">
              <Text size="sm" fw={600}>Basic information</Text>

              <TextInput
                label="Project name"
                placeholder="Youth Exchange 2025"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                withAsterisk
              />

              <Select
                label="Project type"
                placeholder="Select type"
                data={PROJECT_TYPES}
                value={projectType}
                onChange={setProjectType}
                clearable
              />

              <TextInput label="Organisation" value={organisationName} readOnly />
            </Stack>

            {/* Dates */}
            <Stack gap="xs">
              <Text size="sm" fw={600}>Project dates</Text>
              <Group grow>
                <TextInput
                  label="Start date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.currentTarget.value)}
                />
                <TextInput
                  label="End date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.currentTarget.value)}
                />
              </Group>
            </Stack>

            {/* Countries */}
            <Stack gap="xs">
              <Text size="sm" fw={600}>Participating countries</Text>
              <Text size="xs" c="dimmed">At least one country is required.</Text>

              <Stack gap="sm">
                {countries.map((row, index) => (
                  <Group key={row.id} align="flex-end">
                    <Select
                      label="Country"
                      placeholder="Select country"
                      data={countryOptions}
                      value={row.countryCode}
                      onChange={(value) =>
                        updateCountryRow(row.id, { countryCode: value || "" })
                      }
                      withAsterisk={index === 0}
                      flex={1}
                    />

                    <Button
                      variant="subtle"
                      color="red"
                      onClick={() => removeCountryRow(row.id)}
                      disabled={countries.length === 1}
                    >
                      Remove
                    </Button>
                  </Group>
                ))}

                <Button variant="light" size="xs" onClick={addCountryRow}>
                  + Add country
                </Button>
              </Stack>
            </Stack>

            {/* Notes */}
            <Stack gap="xs">
              <Text size="sm" fw={600}>Internal</Text>

              <Textarea
                label="Internal notes"
                placeholder="Notes for accounting, etc."
                value={notes}
                onChange={(e) => setNotes(e.currentTarget.value)}
                minRows={3}
              />
            </Stack>

            {formError && (
              <Text size="sm" c="red">{formError}</Text>
            )}

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={closeModal} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleCreateProject} loading={saving}>
                Create project
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Container>
    </Box>
  );
}

export default AdminProjectsPage;
