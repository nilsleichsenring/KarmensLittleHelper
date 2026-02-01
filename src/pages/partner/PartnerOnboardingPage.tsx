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

/* --------------------------------------------------
   Step derivation helper
-------------------------------------------------- */
function deriveStepIndex(submission: {
  organisation_name: string | null;
  country_code: string | null;
  contact_name: string | null;
  contact_email: string | null;
  iban: string | null;
  account_holder: string | null;
  participants_count: number;
  tickets_count: number;
  submitted: boolean;
}) {
  let step = 0; // Setup

  if (submission.organisation_name && submission.country_code) {
    step = 1; // Organisation
  }

  if (submission.contact_name && submission.contact_email) {
    step = 2; // Contact
  }

  if (submission.iban && submission.account_holder) {
    step = 3; // Bank
  }

  if (submission.participants_count > 0) {
    step = 4; // Participants
  }

  if (submission.tickets_count > 0) {
    step = 5; // Tickets
  }

  if (submission.submitted) {
    step = 6; // Review & Submit
  }

  return step;
}

const STEP_PATHS = [
  "setup",
  "organisation",
  "contact",
  "bank",
  "participants",
  "tickets",
  "submit",
];

export default function PartnerOnboardingPage() {
  const { projectToken } = useParams<{ projectToken: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const resumeToken = searchParams.get("resume");

  /* --------------------------------------------------
     RESUME ENTRY POINT (DB-driven)
  -------------------------------------------------- */
  useEffect(() => {
    if (!resumeToken || !projectToken) return;

    async function resumeSubmission() {
      const { data, error } = await supabase
        .from("project_partner_submissions")
        .select(
          `
          id,
          organisation_name,
          country_code,
          contact_name,
          contact_email,
          iban,
          account_holder,
          submitted,
          participants:participants(count),
          tickets:tickets(count)
        `
        )
        .eq("resume_token", resumeToken)
        .eq("project_id", projectToken)
        .single();

      if (error || !data) {
        console.error("Resume failed:", error);
        return;
      }

      const submission = {
        ...data,
        participants_count: data.participants?.[0]?.count ?? 0,
        tickets_count: data.tickets?.[0]?.count ?? 0,
      };

      const stepIndex = deriveStepIndex(submission);

      // Restore submission context
      localStorage.setItem(
        `partner_submission_${projectToken}`,
        data.id
      );

      // Restore navigator progress
      localStorage.setItem(
        `partner_max_step_${projectToken}`,
        String(stepIndex)
      );

      navigate(
        `/p/${projectToken}/${STEP_PATHS[stepIndex]}`,
        { replace: true }
      );
    }

    resumeSubmission();
  }, [resumeToken, projectToken, navigate]);

  /* --------------------------------------------------
     START NEW SUBMISSION
  -------------------------------------------------- */
  async function handleStart() {
    if (!projectToken) return;

    // New invite = new flow
    localStorage.removeItem(`partner_submission_${projectToken}`);
    localStorage.removeItem(`partner_max_step_${projectToken}`);

    const resumeToken = crypto.randomUUID();

    const { data, error } = await supabase
      .from("project_partner_submissions")
      .insert({
        project_id: projectToken, // projectToken === project.id
        resume_token: resumeToken,
        resume_created_at: new Date().toISOString(),
        claim_status: "open",
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error(error);
      return;
    }

    localStorage.setItem(
      `partner_submission_${projectToken}`,
      data.id
    );

    navigate(`/p/${projectToken}/setup`);
  }

  /* --------------------------------------------------
     RENDER
  -------------------------------------------------- */
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
                <Text size="sm">
                  • Bank details (for reimbursement transfer)
                </Text>
                <Text size="sm">• Names of all participants</Text>
                <Text size="sm">
                  • Travel tickets (one PDF per ticket)
                </Text>
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
