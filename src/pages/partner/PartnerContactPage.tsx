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

const STORAGE_PREFIX = "partner_submission_";

export default function PartnerContactPage() {
  const { projectToken } = useParams<{ projectToken: string }>();
  const navigate = useNavigate();

  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* --------------------------------------------------
     Load submissionId from localStorage
  -------------------------------------------------- */
  useEffect(() => {
    if (!projectToken) {
      setError("Invalid access link.");
      setLoading(false);
      return;
    }

    const stored = localStorage.getItem(STORAGE_PREFIX + projectToken);

    if (!stored) {
      setError("No active submission found. Please start again.");
      setLoading(false);
      return;
    }

    setSubmissionId(stored);
  }, [projectToken]);

  /* --------------------------------------------------
     Load existing contact data
  -------------------------------------------------- */
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
        setError("Could not load contact information.");
        setLoading(false);
        return;
      }

      if (data?.contact_name) setContactName(data.contact_name);
      if (data?.contact_email) setContactEmail(data.contact_email);

      setLoading(false);
    }

    load();
  }, [submissionId]);

  /* --------------------------------------------------
     Save & continue
  -------------------------------------------------- */
  async function handleContinue() {
    if (!submissionId) return;

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
      .from("project_partner_submissions")
      .update({
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim(),
      })
      .eq("id", submissionId);

    setSaving(false);

    if (error) {
      console.error(error);
      setError("Could not save contact information.");
      return;
    }

    navigate(`/p/${projectToken}/bank`);
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

  if (error && !submissionId) {
    return (
      <Container size="sm" py="xl">
        <Stack>
          <Title order={2}>Contact person</Title>
          <Alert color="red">{error}</Alert>
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
              Step 3 of 7
            </Text>
            <Title order={2}>Contact person</Title>
            <Text size="sm" c="dimmed">
              Please provide the main contact person for this reimbursement
              claim.
            </Text>
          </Stack>

          <Stack gap="sm">
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

            {error && (
              <Alert color="red">
                <Text size="sm">{error}</Text>
              </Alert>
            )}

            <Button onClick={handleContinue} loading={saving}>
              Continue
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
