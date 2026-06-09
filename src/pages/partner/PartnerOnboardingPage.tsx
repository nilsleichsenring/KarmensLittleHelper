// src/pages/partner/PartnerOnboardingPage.tsx

import { useEffect } from "react";
import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  Box,
  Button,
  Card,
  Container,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { supabase } from "../../lib/supabaseClient";

export default function PartnerOnboardingPage() {
  const { projectToken } = useParams<{ projectToken: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const resumeToken = searchParams.get("resume");

  useEffect(() => {
    if (!resumeToken || !projectToken) return;

    async function resumePartnerOrganisation() {
      const { data, error } = await supabase
        .from("project_partner_orgs")
        .select("id")
        .eq("resume_token", resumeToken)
        .eq("project_id", projectToken)
        .single();

      if (error || !data) {
        console.error("Resume failed:", error);
        return;
      }

      localStorage.setItem(`partner_org_${projectToken}`, data.id);

      navigate(`/p/${projectToken}/setup`, { replace: true });
    }

    resumePartnerOrganisation();
  }, [resumeToken, projectToken, navigate]);

  async function handleStart() {
    if (!projectToken) return;

    localStorage.removeItem(`partner_org_${projectToken}`);
    localStorage.removeItem(`partner_submission_${projectToken}`);
    localStorage.removeItem(`partner_max_step_${projectToken}`);

    const resumeToken = crypto.randomUUID();

    const { data, error } = await supabase
      .from("project_partner_orgs")
      .insert({
        project_id: projectToken,
        resume_token: resumeToken,
        resume_created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error(error);
      return;
    }

    localStorage.setItem(`partner_org_${projectToken}`, data.id);
    localStorage.setItem(`partner_max_step_${projectToken}`, "0");

    navigate(`/p/${projectToken}/setup`);
  }

  return (
    <Box bg="#f5f6fa" style={{ minHeight: "100vh" }}>
      <Container size="sm" py="xl">
        <Stack gap="xl">
          <Stack gap={6}>
            <Title order={2}>Partner organisation</Title>
            <Text size="sm" c="dimmed">
              Organisation setup
            </Text>
          </Stack>

          <Card withBorder radius="md" p="lg">
            <Text size="sm">
              <strong>Dear partner,</strong>
              <br />
              we are using this tool to manage your organisation details,
              participants and reimbursement claim for this project.
            </Text>
          </Card>

          <Card withBorder radius="md" p="lg">
            <Stack gap="sm">
              <Text fw={600}>What do I need?</Text>

              <SimpleGrid cols={2} spacing="xs">
                <Text size="sm">• Organisation details</Text>
                <Text size="sm">• Contact person details</Text>
                <Text size="sm">• Participant information</Text>
                <Text size="sm">• Travel claim documents later</Text>
              </SimpleGrid>
            </Stack>
          </Card>

          <Card withBorder radius="md" p="lg">
            <Stack gap="sm">
              <Text fw={600}>How does it work?</Text>

              <Text size="sm">
                First, you will set up your partner organisation. Participants
                and reimbursement claims are handled separately afterwards.
              </Text>
            </Stack>
          </Card>

          <Stack gap={4} align="center">
            <Button size="md" onClick={handleStart}>
              Start organisation setup
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}