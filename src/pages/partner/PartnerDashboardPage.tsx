// src/pages/partner/PartnerDashboardPage.tsx

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  Container,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { supabase } from "../../lib/supabaseClient";

type PartnerOrg = {
  id: string;
  project_id: string;
  organisation_name: string | null;
  country_code: string | null;
  contact_name: string | null;
  contact_email: string | null;
  organisation_setup_completed_at: string | null;
};

export default function PartnerDashboardPage() {
  const { partnerResumeToken } = useParams<{
    partnerResumeToken: string;
  }>();

  const navigate = useNavigate();

  const [partnerOrg, setPartnerOrg] = useState<PartnerOrg | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPartnerOrganisation() {
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
          project_id,
          organisation_name,
          country_code,
          contact_name,
          contact_email,
          organisation_setup_completed_at
        `
        )
        .eq("resume_token", partnerResumeToken)
        .single();

      if (error || !data) {
        console.error(error);
        setError("Partner organisation not found.");
        setLoading(false);
        return;
      }

      setPartnerOrg(data);
      setLoading(false);
    }

    loadPartnerOrganisation();
  }, [partnerResumeToken]);

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

  if (error || !partnerOrg) {
    return (
      <Container size="sm" py="xl">
        <Alert color="red">{error ?? "Could not load dashboard."}</Alert>
      </Container>
    );
  }

  const organisationSetupCompleted =
    partnerOrg.organisation_setup_completed_at !== null;

  return (
    <Box bg="#f5f6fa" style={{ minHeight: "100vh" }}>
      <Container size="lg" py="xl">
        <Stack gap="xl">
          <Stack gap={4}>
            <Title order={2}>Partner Dashboard</Title>
            <Text size="sm" c="dimmed">
              {partnerOrg.organisation_name ?? "Partner organisation"}
            </Text>
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <Card withBorder radius="md" p="lg">
            <Stack gap="sm">
                <Title order={4}>Organisation Setup</Title>
                <Text size="sm" c={organisationSetupCompleted ? "green" : "orange"}>
                {organisationSetupCompleted ? "Completed" : "In progress"}
                </Text>
                <Text size="sm" c="dimmed">
                Organisation and contact details.
                </Text>
                <Button
                variant="light"
                size="sm"
                onClick={() =>
                    navigate(
                    organisationSetupCompleted
                        ? `/partner/${partnerResumeToken}/organisation-details`
                        : `/partner/${partnerResumeToken}/setup`
                    )
                }
                >
                {organisationSetupCompleted
                    ? "View organisation details"
                    : "Continue organisation setup"}
                </Button>
            </Stack>
            </Card>

            <Card withBorder radius="md" p="lg">
              <Stack gap="sm">
                <Title order={4}>Participants Administration</Title>
                <Text size="sm" c="dimmed">
                  Coming next.
                </Text>
              </Stack>
            </Card>

            <Card withBorder radius="md" p="lg">
              <Stack gap="sm">
                <Title order={4}>Reimbursement Claim</Title>
                <Text size="sm" c="dimmed">
                  Claim module will be available later.
                </Text>
              </Stack>
            </Card>
          </SimpleGrid>
        </Stack>
      </Container>
    </Box>
  );
}