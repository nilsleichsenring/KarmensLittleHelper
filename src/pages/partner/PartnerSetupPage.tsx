import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import {
  Button,
  Card,
  Group,
  Loader,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";

type Project = {
  id: string;
  name: string;
  organisation_id: string | null;
  start_date: string | null;
  end_date: string | null;
};

type ProjectCountry = {
  country_code: string;
};

type PartnerOrg = {
  id: string;
  organisation_name: string;
  country_code: string | null;
};

export default function PartnerSetupPage() {
  const { projectToken } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [project, setProject] = useState<Project | null>(null);
  const [countries, setCountries] = useState<ProjectCountry[]>([]);
  const [partnerOrgs, setPartnerOrgs] = useState<PartnerOrg[]>([]);

  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedOrgDropdown, setSelectedOrgDropdown] = useState<string | null>(
    null
  );
  const [freeOrg, setFreeOrg] = useState("");

  const [saving, setSaving] = useState(false);

  // -------------------------------------------------------------
  // Load project + countries + host-defined partner orgs
  // -------------------------------------------------------------
  useEffect(() => {
    async function load() {
      if (!projectToken) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const projectId = projectToken;

      // 0) Check submission in localStorage
      const existingSubmissionId = localStorage.getItem(
        `partner_submission_${projectId}`
      );
      if (existingSubmissionId) {
        navigate(`/p/${projectId}/contact`);
        return;
      }

      // 1) Load project
      const { data: proj, error: projError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projError || !proj) {
        console.error("Error loading project", projError);
        setProject(null);
        setLoading(false);
        return;
      }

      setProject(proj as Project);

      // 2) Load countries
      const { data: pc, error: pcError } = await supabase
        .from("project_countries")
        .select("country_code")
        .eq("project_id", projectId);

      if (pcError) {
        console.error("Error loading project countries", pcError);
        setCountries([]);
      } else {
        setCountries((pc || []) as ProjectCountry[]);
      }

      // 3) Load partner orgs
      const { data: po, error: poError } = await supabase
        .from("project_partner_orgs")
        .select("*")
        .eq("project_id", projectId);

      if (poError) {
        console.error("Error loading partner orgs", poError);
        setPartnerOrgs([]);
      } else {
        setPartnerOrgs((po || []) as PartnerOrg[]);
      }

      setLoading(false);
    }

    load();
  }, [projectToken, navigate]);

  // -------------------------------------------------------------
  // Filter orgs for selected country
  // -------------------------------------------------------------
  const orgsForCountry = selectedCountry
    ? partnerOrgs.filter((o) => o.country_code === selectedCountry)
    : [];

  // -------------------------------------------------------------
  // SAVE SETUP
  // -------------------------------------------------------------
  async function handleContinue() {
    if (!project || !selectedCountry) return;

    setSaving(true);

    let finalOrgName: string;

    // Host-defined ORGs exist for this country
    if (orgsForCountry.length > 0) {
      if (selectedOrgDropdown === "other") {
        if (!freeOrg.trim()) {
          setSaving(false);
          return;
        }
        finalOrgName = freeOrg.trim();
      } else if (selectedOrgDropdown) {
        finalOrgName = selectedOrgDropdown;
      } else {
        setSaving(false);
        return;
      }
    } else {
      // Free text only
      if (!freeOrg.trim()) {
        setSaving(false);
        return;
      }
      finalOrgName = freeOrg.trim();
    }

    const projectId = project.id;

    const { data, error } = await supabase
      .from("project_partner_submissions")
      .insert({
        project_id: projectId,
        country_code: selectedCountry,
        organisation_name: finalOrgName,
        submitted: false,
      })
      .select()
      .single();

    setSaving(false);

    if (error || !data) {
      console.error("Error creating submission:", error);
      return;
    }

    // Save submission reference in browser
    localStorage.setItem(`partner_submission_${projectId}`, data.id as string);

    navigate(`/p/${projectToken}/contact`);
  }

  // -------------------------------------------------------------
  // RESET for TESTING ONLY
  // -------------------------------------------------------------
  function handleResetForTesting() {
    if (!project) return;

    const key = `partner_submission_${project.id}`;
    localStorage.removeItem(key);

    navigate(`/p/${project.id}`, { replace: true });
  }

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------
  if (loading) {
    return (
      <Group justify="center" mt="xl">
        <Loader size="lg" />
      </Group>
    );
  }

  if (!project) {
    return <Text>Project not found.</Text>;
  }

  return (
    <Card withBorder radius="md" p="xl" maw={600} mx="auto" mt="xl">
      <Stack gap="xl">
        {/* Header */}
        <Stack gap={0} align="center">
          <Title order={2}>{project.name}</Title>
          <Text size="sm" c="dimmed">
            {project.start_date} → {project.end_date}
          </Text>
        </Stack>

        {/* COUNTRY */}
        <Stack>
          <Text fw={600}>Your country</Text>
          <Select
            placeholder="Select your country"
            data={countries.map((c) => ({
              value: c.country_code,
              label: c.country_code,
            }))}
            value={selectedCountry}
            onChange={(v) => {
              setSelectedCountry(v);
              setSelectedOrgDropdown(null);
              setFreeOrg("");
            }}
            withAsterisk
          />
          <Text size="xs" c="dimmed">
            Participants you add later must reside in this country.
          </Text>
        </Stack>

        {/* ORGANISATION */}
        {selectedCountry && (
          <Stack>
            <Text fw={600}>Your organisation</Text>

            {orgsForCountry.length > 0 ? (
              <>
                <Select
                  label="Select partner organisation"
                  placeholder="Choose"
                  data={[
                    ...orgsForCountry.map((o) => ({
                      value: o.organisation_name,
                      label: o.organisation_name,
                    })),
                    { value: "other", label: "Other (enter manually)" },
                  ]}
                  value={selectedOrgDropdown}
                  onChange={(v) => {
                    setSelectedOrgDropdown(v);
                    if (v !== "other") setFreeOrg("");
                  }}
                  withAsterisk
                />

                {selectedOrgDropdown === "other" && (
                  <TextInput
                    label="Organisation name"
                    placeholder="Enter organisation"
                    value={freeOrg}
                    onChange={(e) => setFreeOrg(e.currentTarget.value)}
                    withAsterisk
                  />
                )}
              </>
            ) : (
              <TextInput
                label="Organisation"
                placeholder="Enter organisation"
                value={freeOrg}
                onChange={(e) => setFreeOrg(e.currentTarget.value)}
                withAsterisk
              />
            )}
          </Stack>
        )}

        {/* BUTTON */}
        <Button
          size="md"
          onClick={handleContinue}
          loading={saving}
          disabled={!selectedCountry}
        >
          Continue
        </Button>

        {/* Testing Reset */}
        <Text
          size="xs"
          c="dimmed"
          ta="center"
          style={{ cursor: "pointer", marginTop: "1rem" }}
          onClick={handleResetForTesting}
        >
          Reset this form (testing)
        </Text>
      </Stack>
    </Card>
  );
}
