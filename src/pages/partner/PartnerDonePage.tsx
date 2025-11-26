import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Alert, Box, Container, Loader, Stack, Text, Title } from "@mantine/core";
import { supabase } from "../../lib/supabaseClient";

const SUBMISSION_STORAGE_PREFIX = "partner_submission_";

type SubmissionInfo = {
  organisation_name: string;
  country_code: string;
  submitted_at: string | null;
};

export default function PartnerDonePage() {
  const { projectToken } = useParams<{ projectToken: string }>();

  const [info, setInfo] = useState<SubmissionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!projectToken) {
        setLoading(false);
        return;
      }

      const key = SUBMISSION_STORAGE_PREFIX + projectToken;
      const stored = localStorage.getItem(key);

      if (!stored) {
        // Kein localStorage -> z.B. anderer Browser oder gelöscht
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("project_partner_submissions")
        .select("organisation_name, country_code, submitted_at")
        .eq("id", stored)
        .single();

      if (error) {
        console.error(error);
        setErrorMessage("We could not load your submission details.");
        setLoading(false);
        return;
      }

      setInfo(data as SubmissionInfo);
      setLoading(false);
    }

    load();
  }, [projectToken]);

  // -------------------------------------------
  // LOADING SCREEN
  // -------------------------------------------
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

  // -------------------------------------------
  // PAGE CONTENT
  // -------------------------------------------
  return (
    <Box style={{ minHeight: "100vh" }} bg="#f5f6fa">
      <Container size="sm" py="xl">
        <Stack gap="xl">
          {/* Header */}
          <Stack gap={4}>
            <Title order={2}>Thank you!</Title>
            <Text size="sm" c="dimmed">
              Your submission has been received.  
              The host organisation will contact you if anything is missing.
            </Text>
          </Stack>

          {/* Submission info */}
          {info && (
            <Stack gap={4}>
              <Text size="sm" c="dimmed">Organisation</Text>
              <Text>
                {info.organisation_name} ({info.country_code})
              </Text>

              {info.submitted_at && (
                <>
                  <Text size="sm" c="dimmed">Submitted at</Text>
                  <Text>
                    {new Date(info.submitted_at).toLocaleString()}
                  </Text>
                </>
              )}
            </Stack>
          )}

          {/* Error fallback */}
          {errorMessage && <Alert color="red">{errorMessage}</Alert>}

          {/* No-info fallback */}
          {!info && !errorMessage && (
            <Text size="sm" c="dimmed">
              Your submission is completed, but we could not load the details.
            </Text>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
