// src/pages/partner/PartnerOrganisationDetailsPage.tsx

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Container,
  Group,
  Loader,
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
  country_code: string | null;
  organisation_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_postal_code: string | null;
  address_city: string | null;
  address_region: string | null;
};

export default function PartnerOrganisationDetailsPage() {
  const { partnerResumeToken } = useParams<{ partnerResumeToken: string }>();
  const navigate = useNavigate();

  const [partnerOrg, setPartnerOrg] = useState<PartnerOrg | null>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [organisationName, setOrganisationName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");

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

      const { data, error } = await supabase
        .from("project_partner_orgs")
        .select(
          `
          id,
          country_code,
          organisation_name,
          address_line1,
          address_line2,
          address_postal_code,
          address_city,
          address_region
        `
        )
        .eq("resume_token", partnerResumeToken)
        .single();

      if (error || !data) {
        console.error(error);
        setError("Could not load organisation details.");
        setLoading(false);
        return;
      }

      setPartnerOrg(data);
      setCountryCode(data.country_code);
      setOrganisationName(data.organisation_name ?? "");
      setAddressLine1(data.address_line1 ?? "");
      setAddressLine2(data.address_line2 ?? "");
      setPostalCode(data.address_postal_code ?? "");
      setCity(data.address_city ?? "");
      setRegion(data.address_region ?? "");

      setLoading(false);
    }

    load();
  }, [partnerResumeToken]);

  async function handleContinue() {
    if (!partnerOrg || !partnerResumeToken) return;

    setError(null);

    if (!addressLine1.trim()) {
      setError("Address line 1 is required.");
      return;
    }

    if (!postalCode.trim() || !city.trim()) {
      setError("Postal code and city are required.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("project_partner_orgs")
      .update({
        address_line1: addressLine1.trim(),
        address_line2: addressLine2.trim() || null,
        address_postal_code: postalCode.trim(),
        address_city: city.trim(),
        address_region: region.trim() || null,
      })
      .eq("id", partnerOrg.id);

    setSaving(false);

    if (error) {
      console.error(error);
      setError("Could not save organisation details.");
      return;
    }

    navigate(`/partner/${partnerResumeToken}/contact`);
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
              Organisation Setup · Step 2 of 3
            </Text>
            <Title order={2}>Partner organisation</Title>
            <Text size="sm" c="dimmed">
              Please provide the official address of your organisation.
            </Text>
          </Stack>

          {countryCode && (
            <Box>
              <Text size="sm" fw={600}>
                Country
              </Text>

              <Group gap={8} align="center" mt={6}>
                <img
                  src={flagUrl(countryCode)}
                  alt={countryCode}
                  width={20}
                  height={14}
                  style={{ borderRadius: 2, objectFit: "cover" }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display =
                      "none";
                  }}
                />
                <Text size="sm">{countryCodeToName(countryCode, "en")}</Text>
              </Group>
            </Box>
          )}

          <TextInput
            label="Organisation name"
            value={organisationName}
            disabled
          />

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

          <TextInput
            label="Region / State"
            value={region}
            onChange={(e) => setRegion(e.currentTarget.value)}
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