// src/pages/partner/PartnerOrganisationSetupPage.tsx

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Container,
  Group,
  Loader,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { supabase } from "../../lib/supabaseClient";
import { countryCodeToName } from "../../lib/flags";

function flagUrl(code: string | null) {
  if (!code) return undefined;
  return `/flags/${code.toUpperCase()}.svg`;
}

type PartnerOrg = {
  id: string;
  project_id: string;
  country_code: string | null;
  organisation_name: string | null;
};

export default function PartnerOrganisationSetupPage() {
  const { partnerResumeToken } = useParams<{
    partnerResumeToken: string;
  }>();

  const navigate = useNavigate();

  const [partnerOrg, setPartnerOrg] = useState<PartnerOrg | null>(null);
  const [countryOptions, setCountryOptions] = useState<
    { value: string; label: string }[]
  >([]);

  const [country, setCountry] = useState<string | null>(null);
  const [organisationName, setOrganisationName] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!partnerResumeToken) {
        setError("Invalid partner link.");
        setLoading(false);
        return;
      }

      const { data: org, error: orgError } = await supabase
        .from("project_partner_orgs")
        .select("id, project_id, country_code, organisation_name")
        .eq("resume_token", partnerResumeToken)
        .single();

      if (orgError || !org) {
        console.error(orgError);
        setError("Partner organisation not found.");
        setLoading(false);
        return;
      }

      setPartnerOrg(org);
      setCountry(org.country_code);
      setOrganisationName(org.organisation_name ?? "");

      const { data: countries, error: countriesError } = await supabase
        .from("project_countries")
        .select("country_code")
        .eq("project_id", org.project_id)
        .order("country_code");

      if (countriesError) {
        console.error(countriesError);
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
  }, [partnerResumeToken]);

  async function handleContinue() {
    if (!partnerOrg || !partnerResumeToken) return;

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

    const { error } = await supabase
      .from("project_partner_orgs")
      .update({
        country_code: country,
        organisation_name: organisationName.trim(),
      })
      .eq("id", partnerOrg.id);

    setSaving(false);

    if (error) {
      console.error(error);
      setError("Could not save data. Please try again.");
      return;
    }

    navigate(`/partner/${partnerResumeToken}/organisation`);
  }

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
              Organisation Setup · Step 1 of 3
            </Text>
            <Title order={2}>Partner organisation setup</Title>
            <Text size="sm" c="dimmed">
              Please select the country and enter the full legal name of your
              organisation.
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
                    (e.currentTarget as HTMLImageElement).style.display =
                      "none";
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