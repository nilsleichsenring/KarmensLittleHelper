// src/pages/partner/PartnerOnboardingPage.tsx

import { useNavigate, useParams } from "react-router-dom";
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

export default function PartnerOnboardingPage() {
  const { projectToken } = useParams<{ projectToken: string }>();
  const navigate = useNavigate();

  function handleStart() {
    if (!projectToken) return;
    navigate(`/p/${projectToken}/setup`);
  }

  return (
    <Box bg="#f5f6fa" style={{ minHeight: "100vh" }}>
      <Container size="sm" py="xl">
        <Stack gap="xl">
          {/* Header */}
          <Stack gap={6}>
            <Title order={2}>Travel reimbursement</Title>
            <Text size="sm" c="dimmed">
              Partner submission
            </Text>
          </Stack>

          {/* Opener */}
          <Card withBorder radius="md" p="lg">
            <Text size="sm">
              <strong>Dear partner,</strong>
              <br />
              we are using this tool to manage the travel reimbursement of our
              Erasmus+ projects.
            </Text>
          </Card>

          {/* What do I need */}
          <Card withBorder radius="md" p="lg">
            <Stack gap="sm">
              <Text fw={600}>What do I need?</Text>

              <SimpleGrid cols={2} spacing="xs">
                <Text size="sm">• Organisation details</Text>
                <Text size="sm">• Bank details (for reimbursement transfer)</Text>
                <Text size="sm">• Names of all participants</Text>
                <Text size="sm">• Travel tickets (one PDF per ticket)</Text>
              </SimpleGrid>

              <Text size="xs" c="dimmed">
                Please make sure all documents are complete and clearly readable.
              </Text>
            </Stack>
          </Card>

          {/* How does it work */}
          <Card withBorder radius="md" p="lg">
            <Stack gap="sm">
              <Text fw={600}>How does it work?</Text>

              <Text size="sm">
                Once you start the reimbursement process, you will be guided step
                by step through the submission.
              </Text>

              <Text size="sm">
                The process consists of <strong>7 short steps</strong> and can be
                completed in one session or continued later.
              </Text>

              <SimpleGrid cols={2} spacing="xs">
                <Text size="sm">① Setup</Text>
                <Text size="sm">② Organisation</Text>
                <Text size="sm">③ Contact</Text>
                <Text size="sm">④ Bank</Text>
                <Text size="sm">⑤ Participants</Text>
                <Text size="sm">⑥ Tickets</Text>
                <Text size="sm">⑦ Review &amp; submit</Text>
              </SimpleGrid>

              <Text size="xs" c="dimmed">
                Just follow the instructions — no technical knowledge required.
              </Text>
            </Stack>
          </Card>

          {/* CTA */}
          <Stack gap={4} align="center">
            <Button size="md" onClick={handleStart}>
              Start reimbursement process
            </Button>

            <Text size="xs" c="dimmed">
              Takes approx. 10–15 minutes
            </Text>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
