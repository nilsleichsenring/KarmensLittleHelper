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

export default function PartnerBankPage() {
  const { projectToken } = useParams<{ projectToken: string }>();
  const navigate = useNavigate();

  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");
  const [accountHolder, setAccountHolder] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --------------------------------------------------
  // Load submissionId from localStorage
  // --------------------------------------------------
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

  // --------------------------------------------------
  // Load existing bank info
  // --------------------------------------------------
  useEffect(() => {
    async function loadBank() {
      if (!submissionId) return;

      const { data, error } = await supabase
        .from("project_partner_submissions")
        .select("iban, bic, account_holder")
        .eq("id", submissionId)
        .single();

      if (error) {
        console.error(error);
        setErrorMessage("Could not load bank information.");
        setLoading(false);
        return;
      }

      if (data?.iban) setIban(data.iban);
      if (data?.bic) setBic(data.bic);
      if (data?.account_holder) setAccountHolder(data.account_holder);

      setLoading(false);
    }

    if (submissionId) {
      loadBank();
    }
  }, [submissionId]);

  // --------------------------------------------------
  // Save + Continue
  // --------------------------------------------------
  async function handleContinue() {
    if (!submissionId) return;

    setErrorMessage(null);

    if (!accountHolder.trim()) {
      setErrorMessage("Account holder name is required.");
      return;
    }
    if (!iban.trim()) {
      setErrorMessage("IBAN is required.");
      return;
    }
    if (!bic.trim()) {
      setErrorMessage("BIC is required.");
      return;
    }

    // Optional basic IBAN/BIC checks (light)
    if (iban.replace(/\s/g, "").length < 12) {
      setErrorMessage("Please enter a valid IBAN.");
      return;
    }
    if (bic.length < 8) {
      setErrorMessage("Please enter a valid BIC.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("project_partner_submissions")
      .update({
        iban: iban.trim(),
        bic: bic.trim(),
        account_holder: accountHolder.trim(),
      })
      .eq("id", submissionId);

    setSaving(false);

    if (error) {
      console.error(error);
      setErrorMessage("Could not save bank information.");
      return;
    }

    // Weiter zur participants page
    navigate(`/p/${projectToken!}/participants`);
  }

  // --------------------------------------------------
  // Rendering
  // --------------------------------------------------
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
          <Title order={2}>Bank information</Title>
          <Alert color="red">{errorMessage}</Alert>
        </Stack>
      </Container>
    );
  }

  return (
    <Box style={{ minHeight: "100vh" }} bg="#f5f6fa">
      <Container size="sm" py="xl">
        <Stack gap="xl">
          {/* HEADER */}
          <Stack gap={4}>
            <Text size="sm" c="dimmed">
              Step 3
            </Text>
            <Title order={2}>Bank information</Title>

            <Text size="sm" c="dimmed">
              Please provide your bank details for reimbursement.
            </Text>
          </Stack>

          {/* FORM */}
          <Stack gap="sm">
            <TextInput
              label="Account holder name"
              placeholder="John Smith"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.currentTarget.value)}
              withAsterisk
            />

            <TextInput
              label="IBAN"
              placeholder="DE45 1234 5678 9000 1234 56"
              value={iban}
              onChange={(e) => setIban(e.currentTarget.value)}
              withAsterisk
            />

            <TextInput
              label="BIC"
              placeholder="MARKDEF1465"
              value={bic}
              onChange={(e) => setBic(e.currentTarget.value)}
              withAsterisk
            />

            {errorMessage && (
              <Alert color="red" mt="sm">
                {errorMessage}
              </Alert>
            )}

            <Button mt="md" onClick={handleContinue} loading={saving}>
              Continue
            </Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
