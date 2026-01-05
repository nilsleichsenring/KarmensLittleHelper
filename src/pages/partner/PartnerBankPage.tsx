import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  Loader,
  Stack,
  Text,
  TextInput,
  Title,
  Group,
} from "@mantine/core";
import { supabase } from "../../lib/supabaseClient";

const SUBMISSION_STORAGE_PREFIX = "partner_submission_";

export default function PartnerBankPage() {
  const { projectToken } = useParams<{ projectToken: string }>();
  const navigate = useNavigate();

  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [organisationName, setOrganisationName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Bank fields
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");
  const [bankName, setBankName] = useState("");

  // Address logic
  const [useOrgAddress, setUseOrgAddress] = useState<boolean>(true);

  const [addrLine1, setAddrLine1] = useState("");
  const [addrLine2, setAddrLine2] = useState("");
  const [addrPostal, setAddrPostal] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrRegion, setAddrRegion] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ------------------------------------------------------------
  // Load submissionId
  // ------------------------------------------------------------
  useEffect(() => {
    const key = SUBMISSION_STORAGE_PREFIX + projectToken;
    const stored = localStorage.getItem(key);

    if (!stored) {
      setErrorMessage("No submission found. Please start again.");
      setLoading(false);
      return;
    }

    setSubmissionId(stored);
  }, [projectToken]);

  // ------------------------------------------------------------
  // Load existing bank info + organisation name
  // ------------------------------------------------------------
  useEffect(() => {
    async function load() {
      if (!submissionId) return;

      const { data, error } = await supabase
        .from("project_partner_submissions")
        .select(
          `
          organisation_name,
          iban,
          bic,
          bank_name,
          use_org_address_for_account_holder,
          account_holder_address_line1,
          account_holder_address_line2,
          account_holder_address_postal_code,
          account_holder_address_city,
          account_holder_address_region
        `
        )
        .eq("id", submissionId)
        .single();

      if (error) {
        console.error(error);
        setErrorMessage("Could not load bank information.");
        setLoading(false);
        return;
      }

      if (data) {
        setOrganisationName(data.organisation_name ?? null);

        if (data.iban) setIban(data.iban);
        if (data.bic) setBic(data.bic);
        if (data.bank_name) setBankName(data.bank_name);

        if (data.use_org_address_for_account_holder != null) {
          setUseOrgAddress(data.use_org_address_for_account_holder);
        }

        if (data.account_holder_address_line1)
          setAddrLine1(data.account_holder_address_line1);
        if (data.account_holder_address_line2)
          setAddrLine2(data.account_holder_address_line2);
        if (data.account_holder_address_postal_code)
          setAddrPostal(data.account_holder_address_postal_code);
        if (data.account_holder_address_city)
          setAddrCity(data.account_holder_address_city);
        if (data.account_holder_address_region)
          setAddrRegion(data.account_holder_address_region);
      }

      setLoading(false);
    }

    load();
  }, [submissionId]);

  // ------------------------------------------------------------
  // SAVE
  // ------------------------------------------------------------
  async function handleContinue() {
    if (!submissionId) return;

    setErrorMessage(null);

    if (!iban.trim()) {
      setErrorMessage("IBAN is required.");
      return;
    }
    if (!bic.trim()) {
      setErrorMessage("BIC is required.");
      return;
    }
    if (!bankName.trim()) {
      setErrorMessage("Bank name is required.");
      return;
    }

    if (!useOrgAddress) {
      if (!addrLine1.trim()) {
        setErrorMessage("Address line 1 is required.");
        return;
      }
      if (!addrPostal.trim()) {
        setErrorMessage("Postal code is required.");
        return;
      }
      if (!addrCity.trim()) {
        setErrorMessage("City is required.");
        return;
      }
    }

    setSaving(true);

    const { error } = await supabase
      .from("project_partner_submissions")
      .update({
        iban: iban.trim(),
        bic: bic.trim(),
        bank_name: bankName.trim(),

        // ⭐ NEW LOGIC
        account_holder: useOrgAddress ? organisationName : null,

        use_org_address_for_account_holder: useOrgAddress,

        account_holder_address_line1: useOrgAddress
          ? null
          : addrLine1.trim(),
        account_holder_address_line2: useOrgAddress
          ? null
          : addrLine2.trim() || null,
        account_holder_address_postal_code: useOrgAddress
          ? null
          : addrPostal.trim(),
        account_holder_address_city: useOrgAddress
          ? null
          : addrCity.trim(),
        account_holder_address_region: useOrgAddress
          ? null
          : addrRegion.trim() || null,
      })
      .eq("id", submissionId);

    setSaving(false);

    if (error) {
      console.error(error);
      setErrorMessage("Could not save bank information.");
      return;
    }

    navigate(`/p/${projectToken}/participants`);
  }

  // ------------------------------------------------------------
  // RENDERING
  // ------------------------------------------------------------
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
              Step 4 of 7
            </Text>
            <Title order={2}>Bank information</Title>
            <Text size="sm" c="dimmed">
              Please enter the bank account information for the reimbursement.
              If your reimbursement claim is approved, the eligible amount will
              be transferred to this bank account.
            </Text>
          </Stack>

          <TextInput
            label="IBAN"
            value={iban}
            onChange={(e) => setIban(e.currentTarget.value)}
            withAsterisk
          />

          <TextInput
            label="BIC"
            value={bic}
            onChange={(e) => setBic(e.currentTarget.value)}
            withAsterisk
          />

          <TextInput
            label="Bank name"
            value={bankName}
            onChange={(e) => setBankName(e.currentTarget.value)}
            withAsterisk
          />

          <Checkbox
            label="Use organisation address as account holder address"
            checked={useOrgAddress}
            onChange={(e) => setUseOrgAddress(e.currentTarget.checked)}
          />

          {!useOrgAddress && (
            <Stack gap="sm" mt="sm">
              <Text fw={600}>Account holder address</Text>

              <TextInput
                label="Address line 1"
                value={addrLine1}
                onChange={(e) => setAddrLine1(e.currentTarget.value)}
                withAsterisk
              />

              <TextInput
                label="Address line 2 (optional)"
                value={addrLine2}
                onChange={(e) => setAddrLine2(e.currentTarget.value)}
              />

              <Group grow>
                <TextInput
                  label="Postal code"
                  value={addrPostal}
                  onChange={(e) => setAddrPostal(e.currentTarget.value)}
                  withAsterisk
                />

                <TextInput
                  label="City"
                  value={addrCity}
                  onChange={(e) => setAddrCity(e.currentTarget.value)}
                  withAsterisk
                />
              </Group>

              <TextInput
                label="Region (optional)"
                value={addrRegion}
                onChange={(e) => setAddrRegion(e.currentTarget.value)}
              />
            </Stack>
          )}

          {errorMessage && <Alert color="red">{errorMessage}</Alert>}

          <Button onClick={handleContinue} loading={saving}>
            Continue
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
