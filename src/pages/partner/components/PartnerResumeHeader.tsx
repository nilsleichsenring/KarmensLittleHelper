import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Group,
  Loader,
  Stack,
  Text,
} from "@mantine/core";
import { supabase } from "../../../lib/supabaseClient";

import { HelpTooltip } from "../../../components/HelpTooltip";

type Props = {
  projectToken: string;
  submissionId: string;
};

export default function PartnerResumeHeader({
  projectToken,
  submissionId,
}: Props) {
  const [resumeToken, setResumeToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copyOk, setCopyOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resumeLink = useMemo(() => {
    if (!resumeToken) return "";
    return `${window.location.origin}/p/${projectToken}?resume=${resumeToken}`;
  }, [projectToken, resumeToken]);

  useEffect(() => {
    let alive = true;

    async function loadResumeToken() {
      if (!submissionId) return;

      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("project_partner_submissions")
        .select("resume_token")
        .eq("id", submissionId)
        .single();

      if (!alive) return;

      if (error) {
        console.error(error);
        setError("Could not load resume link.");
        setLoading(false);
        return;
      }

      setResumeToken(data?.resume_token ?? null);
      setLoading(false);
    }

    loadResumeToken();

    return () => {
      alive = false;
    };
  }, [submissionId]);

  async function handleCopy() {
    if (!resumeLink) return;

    try {
      await navigator.clipboard.writeText(resumeLink);
      setCopyOk(true);
      setTimeout(() => setCopyOk(false), 1500);
    } catch (err) {
      console.error(err);
      setError("Could not copy resume link. Please try again.");
    }
  }

  return (
    <Box>
      <Group align="center" gap="sm">
        <Stack gap={2}>
          <Text fw={600} size="sm">
            Resume link
          </Text>
          <Text size="xs" c="dimmed">
            Save this link to continue later.
          </Text>
        </Stack>

        {loading ? (
          <Group gap="xs">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              Loading…
            </Text>
          </Group>
        ) : !resumeToken ? (
          <Text size="sm" c="dimmed">
            Resume link not available yet.
          </Text>
        ) : (
      <Group gap="xs">
        <Button
          variant="light"
          onClick={handleCopy}
          size="sm"
        >
          {copyOk ? "Copied!" : "Copy resume link"}
        </Button>

        <HelpTooltip
          label="Use this link to continue your submission later or on another device."
        />
      </Group>
        )}
      </Group>

      {error && (
        <Alert mt="sm" color="red">
          {error}
        </Alert>
      )}
    </Box>
  );
}
