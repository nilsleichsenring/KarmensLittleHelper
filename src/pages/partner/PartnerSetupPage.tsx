import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Container,
  Loader,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  Group,
} from "@mantine/core";
import { supabase } from "../../lib/supabaseClient";
import { countryCodeToName } from "../../lib/flags";

const STORAGE_PREFIX = "partner_submission_";

/** Flag image helper (FILES ARE UPPERCASE: /flags/DE.svg) */
function flagUrl(code: string | null) {
  if (!code) return undefined;
  return `/flags/${code.toUpperCase()}.svg`;
}

export default function PartnerSetupPage() {
  const { projectToken } = useParams<{ projectToken: string }>();
  const navigate = useNavigate();

  const [projectId, setProjectId] = useState<string | null>(null);

  const [countryOptions, setCountryOptions] = useState<
    { value: string; label: string }[]
  >([]);

  const [country, setCountry] = useState<string | null>(null);
  const [organisationName, setOrganisationName] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* --------------------------------------------------
     Load project + allowed countries
  -------------------------------------------------- */
  useEffect(() => {
    async function load() {
      if (!projectToken) {
        setError("Invalid project link.");
        setLoading(false);
        return;
      }

      // 1) Load project (invite link currently uses project.id)
      const { data: project, error: pErr } = await supabase
        .from("projects")
        .select("id")
        .eq("id", projectToken)
        .single();

      if (pErr || !project) {
        setError("Invalid or expired project link.");
        setLoading(false);
        return;
      }

      setProjectId(project.id);

      // 2) Load allowed countries for this project
      const { data: countries, error: cErr } = await supabase
        .from("project_countries")
        .select("country_code")
        .eq("project_id", project.id)
        .order("country_code");

      if (cErr) {
        console.error(cErr);
        setError("Could not load project countries.");
        setLoading(false);
        return;
      }

      setCountryOptions(
        (countries || []).map((c) => ({
          value: c.country_code,
          label: countryCodeToName(c.country_code, "en"),
        }))
      );

      setLoading(false);
    }

    load();
  }, [projectToken]);

  /* --------------------------------------------------
     Create submission (Mini-Setup)
  -------------------------------------------------- */
  async function handleContinue() {
    if (!projectId) return;

    setError(null);

    if (!country) {
      setError("Please select your country.");
      return;
    }

    if (!organisationName.trim()) {
      setError("Organisation name is required.");
      return;
    }

    setSaving(true);

    const resumeToken = crypto.randomUUID();

    const { data, error } = await supabase
      .from("project_partner_submissions")
      .insert({
        project_id: projectId,
        country_code: country,
        organisation_name: organisationName.trim(),
        resume_token: resumeToken,
        resume_created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    setSaving(false);

    if (error || !data) {
      console.error(error);
      setError("Could not create submission. Please try again.");
      return;
    }

    // Persist submission id locally (browser-bound)
    localStorage.setItem(STORAGE_PREFIX + projectToken, data.id);

    // Continue with organisation details
    navigate(`/p/${projectToken}/organisation`);
  }

  /* --------------------------------------------------
     Render
  -------------------------------------------------- */
  if (loading) {
    return (
      <Box
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Loader />
      </Box>
    );
  }

  return (
    <Box style={{ minHeight: "100vh" }} bg="#f5f6fa">
      <Container size="sm" py="xl">
        <Stack gap="xl">
          <Stack gap={4}>
            <Text size="sm" c="dimmed">
              Step 1 of 7
            </Text>
            <Title order={2}>Partner organisation setup</Title>
            <Text size="sm" c="dimmed">
              Please select country and enter the full legal name of your organisation.
            </Text>
          </Stack>

          <Select
            label="Country"
            placeholder="Select your country"
            data={countryOptions}
            value={country}
            onChange={setCountry}
            withAsterisk
            searchable
            renderOption={({ option }) => (
              <Group gap={8}>
                <img
                  src={flagUrl(option.value)}
                  alt={option.value}
                  width={20}
                  height={14}
                  style={{
                    objectFit: "cover",
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
                <Text>{option.label}</Text>
              </Group>
            )}
            rightSection={
              country ? (
                <img
                  src={flagUrl(country)}
                  alt={country}
                  width={20}
                  height={14}
                  style={{ borderRadius: 2 }}
                />
              ) : null
            }
          />

          <TextInput
            label="Organisation name"
            placeholder="Full legal name"
            value={organisationName}
            onChange={(e) => setOrganisationName(e.currentTarget.value)}
            withAsterisk
          />

          {error && <Alert color="red">{error}</Alert>}

          <Button onClick={handleContinue} loading={saving}>
            Continue
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
