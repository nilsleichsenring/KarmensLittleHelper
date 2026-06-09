import { useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconCopy,
  IconTrash,
} from "@tabler/icons-react";

import CountryFlag from "../../../../components/CountryFlag";
import type { ProjectParticipantSummary } from "../types";

type Props = {
  onboardingLink: string | null;
  participants: ProjectParticipantSummary[];
  getCountryLabel: (code: string | null) => string;
  onDeleteParticipant: (participantId: string) => Promise<void>;
};

export function ParticipantsTab({
  onboardingLink,
  participants,
  getCountryLabel,
  onDeleteParticipant,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  function formatConfirmedAt(value: string | null) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function formatFoodPreferences(values: string[] | null) {
    if (!values || values.length === 0) return "—";

    return values
      .map((value) =>
        value
          .split("_")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ")
      )
      .join(", ");
  }

  function formatConsent(value: boolean | null) {
    if (value == null) return "—";
    return value ? "Granted" : "Not granted";
  }

  function getAgreementLabel(confirmed: boolean) {
    return confirmed ? "Confirmed" : "Open";
  }

  function getAgreementSummaryLabel(confirmed: boolean) {
    return confirmed ? "Agreement confirmed" : "Agreement open";
  }

  async function copyText(value: string, successKey: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopySuccess(successKey);

      window.setTimeout(() => {
        setCopySuccess((current) => (current === successKey ? null : current));
      }, 1500);
    } catch (error) {
      console.error("Copy failed", error);
    }
  }

  async function handleDelete(participantId: string) {
    const confirmed = window.confirm(
      "Do you really want to delete this participant entry?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(participantId);
      await onDeleteParticipant(participantId);

      if (openId === participantId) {
        setOpenId(null);
      }
    } finally {
      setDeletingId(null);
    }
  }

  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      const aName = (a.full_name ?? "").trim().toLowerCase();
      const bName = (b.full_name ?? "").trim().toLowerCase();
      return aName.localeCompare(bName);
    });
  }, [participants]);

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Title order={2}>Participants</Title>
        <Text size="sm" c="dimmed">
          This tab shows project-wide participant onboarding entries, including
          agreement status and resume links.
        </Text>
      </Stack>

      <Card withBorder radius="md" p="lg">
        <Stack gap="sm">
          <Title order={5}>Participant onboarding link</Title>

          {onboardingLink ? (
            <>
              <Alert color="blue">
                <Text size="sm" style={{ wordBreak: "break-all" }}>
                  {onboardingLink}
                </Text>
              </Alert>

              <Group justify="flex-end">
                <Button
                  variant="light"
                  leftSection={<IconCopy size={16} />}
                  onClick={() => copyText(onboardingLink, "onboarding-link")}
                >
                  {copySuccess === "onboarding-link" ? "Copied!" : "Copy link"}
                </Button>
              </Group>
            </>
          ) : (
            <Text size="sm" c="dimmed">
              No participant onboarding link available for this project yet.
            </Text>
          )}
        </Stack>
      </Card>

      <Stack gap="sm">
        {sortedParticipants.length === 0 ? (
          <Card withBorder radius="md" p="lg">
            <Text size="sm" c="dimmed">
              No participant onboarding entries found for this project yet.
            </Text>
          </Card>
        ) : (
          sortedParticipants.map((participant) => {
            const isOpen = openId === participant.id;

            const resumeLink =
              onboardingLink && participant.resume_token
                ? `${onboardingLink}?resume=${participant.resume_token}`
                : null;

            const agreementConfirmed = !!participant.agreement_accepted_at;

            return (
              <Card key={participant.id} withBorder radius="md" p={0}>
                <UnstyledButton
                  onClick={() => toggle(participant.id)}
                  style={{ width: "100%" }}
                >
                  <Group
                    wrap="nowrap"
                    px="md"
                    py="sm"
                    align="center"
                    justify="space-between"
                  >
                    <Group gap="sm" wrap="nowrap">
                      {participant.residence_country && (
                        <CountryFlag
                          code={participant.residence_country}
                          size={18}
                        />
                      )}

                      <Stack gap={0}>
                        <Text fw={600}>
                          {participant.full_name?.trim() || "Unnamed participant"}
                        </Text>

                        <Text size="xs" c="dimmed">
                          {participant.email || "No email"}
                        </Text>
                      </Stack>
                    </Group>

                    <Group gap="lg">
                      <Text size="sm" c="dimmed">
                        {getCountryLabel(participant.residence_country)}
                      </Text>

                      <Text size="sm" c={agreementConfirmed ? "green" : "orange"}>
                        {getAgreementSummaryLabel(agreementConfirmed)}
                      </Text>
                    </Group>

                    {isOpen ? (
                      <IconChevronUp size={18} />
                    ) : (
                      <IconChevronDown size={18} />
                    )}
                  </Group>
                </UnstyledButton>

                {isOpen && (
                  <Box
                    bg="gray.0"
                    px="md"
                    py="lg"
                    style={{
                      borderTop: "1px solid var(--mantine-color-gray-3)",
                      borderLeft: "3px solid var(--mantine-color-gray-3)",
                    }}
                  >
                    <Stack gap="lg">
                      <Stack gap="xs">
                        <Title order={5}>Participant data</Title>

                        <Group grow align="flex-start">
                          <Stack gap={2}>
                            <Text size="xs" c="dimmed">
                              Full name
                            </Text>
                            <Text size="sm">{participant.full_name || "—"}</Text>
                          </Stack>

                          <Stack gap={2}>
                            <Text size="xs" c="dimmed">
                              Email
                            </Text>
                            <Text size="sm">{participant.email || "—"}</Text>
                          </Stack>

                          <Stack gap={2}>
                            <Text size="xs" c="dimmed">
                              Residence country
                            </Text>
                            <Group gap={6}>
                              {participant.residence_country && (
                                <CountryFlag
                                  code={participant.residence_country}
                                  size={16}
                                />
                              )}
                              <Text size="sm">
                                {getCountryLabel(participant.residence_country)}
                              </Text>
                            </Group>
                          </Stack>
                        </Group>
                      </Stack>

                      <Divider />

                      <Stack gap="xs">
                        <Title order={5}>Preferences & consent</Title>

                        <Group grow align="flex-start">
                          <Stack gap={2}>
                            <Text size="xs" c="dimmed">
                              Food preferences
                            </Text>
                            <Text size="sm">
                              {formatFoodPreferences(participant.food_preferences)}
                            </Text>
                          </Stack>

                          <Stack gap={2}>
                            <Text size="xs" c="dimmed">
                              Media consent
                            </Text>
                            <Text size="sm">
                              {formatConsent(participant.media_consent)}
                            </Text>
                          </Stack>

                          <Stack gap={2}>
                            <Text size="xs" c="dimmed">
                              Future projects consent
                            </Text>
                            <Text size="sm">
                              {formatConsent(participant.future_projects_consent)}
                            </Text>
                          </Stack>
                        </Group>

                        <Stack gap={2}>
                          <Text size="xs" c="dimmed">
                            Health issues
                          </Text>
                          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                            {participant.health_issues || "—"}
                          </Text>
                        </Stack>

                        <Stack gap={2}>
                          <Text size="xs" c="dimmed">
                            Additional information
                          </Text>
                          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                            {participant.additional_information || "—"}
                          </Text>
                        </Stack>
                      </Stack>

                      <Divider />

                      <Stack gap="xs">
                        <Title order={5}>Agreement & resume</Title>

                        <Group grow align="flex-start">
                          <Stack gap={2}>
                            <Text size="xs" c="dimmed">
                              Agreement status
                            </Text>
                            <Text size="sm">
                              {getAgreementLabel(agreementConfirmed)}
                            </Text>
                          </Stack>

                          <Stack gap={2}>
                            <Text size="xs" c="dimmed">
                              Confirmed at
                            </Text>
                            <Text size="sm">
                              {formatConfirmedAt(participant.agreement_accepted_at)}
                            </Text>
                          </Stack>

                          <Stack gap={2}>
                            <Text size="xs" c="dimmed">
                              Resume token
                            </Text>
                            <Text size="sm" style={{ wordBreak: "break-all" }}>
                              {participant.resume_token || "—"}
                            </Text>
                          </Stack>
                        </Group>

                        {resumeLink ? (
                          <>
                            <Alert color="blue">
                              <Text size="sm" style={{ wordBreak: "break-all" }}>
                                {resumeLink}
                              </Text>
                            </Alert>

                            <Group justify="space-between">
                              <Button
                                variant="light"
                                leftSection={<IconCopy size={16} />}
                                onClick={() =>
                                  copyText(resumeLink, `resume-${participant.id}`)
                                }
                              >
                                {copySuccess === `resume-${participant.id}`
                                  ? "Copied!"
                                  : "Copy resume link"}
                              </Button>

                              <ActionIcon
                                color="red"
                                variant="light"
                                size="lg"
                                loading={deletingId === participant.id}
                                onClick={() => handleDelete(participant.id)}
                                aria-label="Delete participant"
                              >
                                <IconTrash size={18} />
                              </ActionIcon>
                            </Group>
                          </>
                        ) : (
                          <Group justify="flex-end">
                            <ActionIcon
                              color="red"
                              variant="light"
                              size="lg"
                              loading={deletingId === participant.id}
                              onClick={() => handleDelete(participant.id)}
                              aria-label="Delete participant"
                            >
                              <IconTrash size={18} />
                            </ActionIcon>
                          </Group>
                        )}
                      </Stack>
                    </Stack>
                  </Box>
                )}
              </Card>
            );
          })
        )}
      </Stack>
    </Stack>
  );
}