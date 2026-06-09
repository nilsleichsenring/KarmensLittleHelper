// src/pages/partner/PartnerOrganisationDetailsViewPage.tsx

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
  address_line1: string | null;
  address_line2: string | null;
  address_postal_code: string | null;
  address_city: string | null;
  address_region: string | null;
  contact_name: string | null;
  contact_email: string | null;
};

export default function PartnerOrganisationDetailsViewPage() {
  const { partnerResumeToken } = useParams<{ partnerResumeToken: string }>();
  const navigate = useNavigate();

  const [partnerOrg, setPartnerOrg] = useState<PartnerOrg | null>(null);
  const [countryOptions, setCountryOptions] = useState<
    { value: string; label: string }[]
  >([]);

  const [country, setCountry] = useState<string | null>(null);
  const [organisationName, setOrganisationName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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
        .select(
          `
          id,
          project_id,
          country_code,
          organisation_name,
          address_line1,
          address_line2,
          address_postal_code,
          address_city,
          address_region,
          contact_name,
          contact_email
        `
        )
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
      setAddressLine1(org.address_line1 ?? "");
      setAddressLine2(org.address_line2 ?? "");
      setPostalCode(org.address_postal_code ?? "");
      setCity(org.address_city ?? "");
      setRegion(org.address_region ?? "");
      setContactName(org.contact_name ?? "");
      setContactEmail(org.contact_email ?? "");

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

  async function handleSave() {
    if (!partnerOrg) return;

    setError(null);
    setSaved(false);

    if (!country) {
      setError("Please select your country.");
      return;
    }

    if (!organisationName.trim()) {
      setError("Organisation name is required.");
      return;
    }

    if (!addressLine1.trim()) {
      setError("Address line 1 is required.");
      return;
    }

    if (!postalCode.trim() || !city.trim()) {
      setError("Postal code and city are required.");
      return;
    }

    if (!contactName.trim()) {
      setError("Contact person name is required.");
      return;
    }

    if (!contactEmail.trim()) {
      setError("Email address is required.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(contactEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("project_partner_orgs")
      .update({
        country_code: country,
        organisation_name: organisationName.trim(),
        address_line1: addressLine1.trim(),
        address_line2: addressLine2.trim() || null,
        address_postal_code: postalCode.trim(),
        address_city: city.trim(),
        address_region: region.trim() || null,
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim(),
        organisation_setup_completed_at: new Date().toISOString(),
      })
      .eq("id", partnerOrg.id);

    setSaving(false);

    if (error) {
      console.error(error);
      setError("Could not save organisation details.");
      return;
    }

    setSaved(true);
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
              Partner organisation
            </Text>
            <Title order={2}>Organisation details</Title>
            <Text size="sm" c="dimmed">
              Review and update the saved organisation and contact details.
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
            value={organisationName}
            onChange={(e) => setOrganisationName(e.currentTarget.value)}
            withAsterisk
          />

          <Text fw={600}>Organisation address</Text>

          <TextInput
            label="Address line 1"
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.currentTarget.value)}
            withAsterisk
          />

          <TextInput
            label="Address line 2"
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.currentTarget.value)}
          />

          <Group grow>
            <TextInput
              label="Postal code"
              value={postalCode}
              onChange={(e) => setPostalCode(e.currentTarget.value)}
              withAsterisk
            />

            <TextInput
              label="City"
              value={city}
              onChange={(e) => setCity(e.currentTarget.value)}
              withAsterisk
            />
          </Group>

          <TextInput
            label="Region / State"
            value={region}
            onChange={(e) => setRegion(e.currentTarget.value)}
          />

          <Text fw={600}>Contact person</Text>

          <TextInput
            label="Full name"
            value={contactName}
            onChange={(e) => setContactName(e.currentTarget.value)}
            withAsterisk
          />

          <TextInput
            label="Email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.currentTarget.value)}
            withAsterisk
          />

          {error && <Alert color="red">{error}</Alert>}
          {saved && <Alert color="green">Organisation details saved.</Alert>}

          <Group justify="space-between">
            <Button
              variant="subtle"
              onClick={() => navigate(`/partner/${partnerResumeToken}`)}
            >
              Back to dashboard
            </Button>

            <Button onClick={handleSave} loading={saving}>
              Save changes
            </Button>
          </Group>
        </Stack>
      </Container>
    </Box>
  );
}