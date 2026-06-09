// src/pages/partner/PartnerOrganisationContactPage.tsx

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Container,
  Loader,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { supabase } from "../../lib/supabaseClient";

type PartnerOrg = {
  id: string;
  contact_name: string | null;
  contact_email: string | null;
};

export default function PartnerOrganisationContactPage() {
  const { partnerResumeToken } = useParams<{ partnerResumeToken: string }>();
  const navigate = useNavigate();

  const [partnerOrg, setPartnerOrg] = useState<PartnerOrg | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");

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
        .select("id, contact_name, contact_email")
        .eq("resume_token", partnerResumeToken)
        .single();

      if (error || !data) {
        console.error(error);
        setError("Could not load contact information.");
        setLoading(false);
        return;
      }

      setPartnerOrg(data);
      setContactName(data.contact_name ?? "");
      setContactEmail(data.contact_email ?? "");
      setLoading(false);
    }

    load();
  }, [partnerResumeToken]);

  async function handleComplete() {
    if (!partnerOrg || !partnerResumeToken) return;

    setError(null);

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
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim(),
        organisation_setup_completed_at: new Date().toISOString(),
      })
      .eq("id", partnerOrg.id);

    setSaving(false);

    if (error) {
      console.error(error);
      setError("Could not save contact information.");
      return;
    }

    navigate(`/partner/${partnerResumeToken}`);
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
              Organisation Setup · Step 3 of 3
            </Text>
            <Title order={2}>Contact person</Title>
            <Text size="sm" c="dimmed">
              Please provide the main contact person for this partner
              organisation.
            </Text>
          </Stack>

          <TextInput
            label="Full name"
            placeholder="Jane Doe"
            value={contactName}
            onChange={(e) => setContactName(e.currentTarget.value)}
            withAsterisk
          />

          <TextInput
            label="Email"
            placeholder="name@example.org"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.currentTarget.value)}
            withAsterisk
          />

          {error && <Alert color="red">{error}</Alert>}

          <Button onClick={handleComplete} loading={saving}>
            Complete organisation setup
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}