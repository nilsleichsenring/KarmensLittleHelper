import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Container,
  Loader,
  Stack,
  TextInput,
  Title,
  Text,
} from "@mantine/core";
import { supabase } from "../../lib/supabaseClient";

const SUBMISSION_STORAGE_PREFIX = "partner_submission_";

export default function PartnerContactPage() {
  const { projectToken } = useParams<{ projectToken: string }>();
  const navigate = useNavigate();

  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --------------------------------------------------------------------
  // Load submissionId from localStorage
  // --------------------------------------------------------------------
  useEffect(() => {
    if (!projectToken) {
      setErrorMessage("Invalid access link.");
      setLoading(false);
      return;
    }

    const key = SUBMISSION_STORAGE_PREFIX + projectToken;
    const stored = localStorage.getItem(key);

    if (!stored) {
      setErrorMessage("No submission found. Please start again.");
      setLoading(false);
      return;
    }

    setSubmissionId(stored);
  }, [projectToken]);

  // --------------------------------------------------------------------
  // Load existing contact info
  // --------------------------------------------------------------------
  useEffect(() => {
    async function load() {
      if (!submissionId) return;

      const { data, error } = await supabase
        .from("project_partner_submissions")
        .select("contact_name, contact_email")
        .eq("id", submissionId)
        .single();

      if (error) {
        console.error(error);
        setErrorMessage("Could not load contact data.");
        setLoading(false);
        return;
      }

      if (data?.contact_name) setContactName(data.contact_name);
      if (data?.contact_email) setContactEmail(data.contact_email);

      setLoading(false);
    }

    load();
  }, [submissionId]);

  // --------------------------------------------------------------------
  // Save + Continue
  // --------------------------------------------------------------------
  async function handleContinue() {
    if (!submissionId) return;

    setErrorMessage(null);

    if (!contactName.trim()) {
      setErrorMessage("Contact person name is required.");
      return;
    }

    if (!contactEmail.trim()) {
      setErrorMessage("Email is required.");
      return;
    }

    // Basic email validation
    if (!/^\S+@\S+\.\S+$/.test(contactEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("project_partner_submissions")
      .update({
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim(),
      })
      .eq("id", submissionId);

    setSaving(false);

    if (error) {
      console.error(error);
      setErrorMessage("Could not save contact information.");
      return;
    }

    // Weiter zur Bank Page
    navigate(`/p/${projectToken}/bank`);
  }

  // --------------------------------------------------------------------
  // Reset for testing (clears local storage + back to setup)
  // --------------------------------------------------------------------
  function handleResetForTesting() {
    if (!projectToken) return;

    const key = SUBMISSION_STORAGE_PREFIX + projectToken;
    localStorage.removeItem(key);

    navigate(`/p/${projectToken}`, { replace: true });
  }

  // --------------------------------------------------------------------
  // Rendering
  // --------------------------------------------------------------------
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

  if (errorMessage) {
    return (
      <Container size="sm" py="xl">
        <Stack gap="md">
          <Title order={2}>Contact person</Title>
          <Alert color="red">{errorMessage}</Alert>
        </Stack>
      </Container>
    );
  }

  return (
    <Box style={{ minHeight: "100vh" }} bg="#f5f6fa">
      <Container size="sm" py="xl">
        <Stack gap="xl">
          <Stack gap={4}>
            <Text size="sm" c="dimmed">
              Step 2
            </Text>
            <Title order={2}>Contact person</Title>

            <Text size="sm" c="dimmed">
              Please provide the main contact person for this project.
            </Text>
          </Stack>

          <Stack gap="sm">
            <TextInput
              label="Full name"
              placeholder="John Smith"
              value={contactName}
              onChange={(e) => setContactName(e.currentTarget.value)}
              withAsterisk
            />

            <TextInput
              label="Email"
              placeholder="name@example.com"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.currentTarget.value)}
              withAsterisk
            />

            {errorMessage && (
              <Alert color="red" mt="sm">
                <Text>{errorMessage}</Text>
              </Alert>
            )}

            <Button mt="md" onClick={handleContinue} loading={saving}>
              Continue
            </Button>

            {/* Testing-only reset link */}
            <Text
              size="xs"
              c="dimmed"
              ta="center"
              style={{ cursor: "pointer" }}
              onClick={handleResetForTesting}
            >
              Reset this submission (testing)
            </Text>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
