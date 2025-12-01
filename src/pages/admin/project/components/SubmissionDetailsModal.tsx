// src/pages/admin/project/components/SubmissionDetailsModal.tsx

import {
  Badge,
  Button,
  Divider,
  Group,
  Loader,
  Modal,
  Stack,
  Table,
  Text,
} from "@mantine/core";

import type {
  SubmissionSummary,
  Participant,
  Ticket,
  Project,
  ProjectCountry,
} from "../types";

import CountryFlag from "../../../../components/CountryFlag";

type Props = {
  opened: boolean;
  onClose: () => void;
  submission: SubmissionSummary | null;
  participants: Participant[];
  tickets: Ticket[];
  getCountryLabel: (code: string | null) => string;

  project: Project;
  countries: ProjectCountry[];
};

export default function SubmissionDetailsModal({
  opened,
  onClose,
  submission,
  participants,
  tickets,
  getCountryLabel,
  project,
  countries,
}: Props) {
  if (!submission) {
    return (
      <Modal opened={opened} onClose={onClose} centered>
        <Loader />
      </Modal>
    );
  }

  // Host info (from joined organisation)
  const hostName = project.organisations?.name ?? "Unknown host";
  const hostCountry = project.organisations?.country_code ?? null;

  // participant countries
  const participantCountryCodes = countries.map((c) => c.country_code);

  const hostAppearsInList =
    !!hostCountry && participantCountryCodes.includes(hostCountry);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Submission – ${submission.organisation_name}`}
      size="lg"
      centered
    >
      <Stack gap="lg">

        {/* ---------------------------------------------------
            PROJECT HOST & PARTICIPATING COUNTRIES
        --------------------------------------------------- */}
        <Stack gap={6}>
          {/* HOST */}
          <Text fw={600} size="sm">Project-Host</Text>
          <Group gap={8} align="center">
            <CountryFlag code={hostCountry} size={20} />
            <Text>
              {hostName}{" "}
              {hostCountry && (
                <span style={{ opacity: 0.6 }}>({hostCountry})</span>
              )}
            </Text>
          </Group>

          <Divider />

          {/* PARTICIPATING COUNTRIES */}
          <Text fw={600} size="sm">Participating countries</Text>
          <Group gap="sm">
            {participantCountryCodes.map((code, idx) => (
              <CountryFlag key={idx} code={code} size={22} />
            ))}

            {/* Host (only if not already included) */}
            {!hostAppearsInList && (
              <CountryFlag code={hostCountry} size={22} />
            )}
          </Group>
        </Stack>

        <Divider />

        {/* ---------------------------------------------------
            SUBMISSION ORGANISATION INFO
        --------------------------------------------------- */}
        <Stack gap={4}>
          <Text fw={600}>Organisation</Text>

          <Group gap={8} align="center">
            <CountryFlag code={submission.country_code} size={20} />
            <Text>
              {submission.organisation_name} (
              {getCountryLabel(submission.country_code)})
            </Text>
          </Group>

          <Text size="sm" c="dimmed">
            Status:{" "}
            {submission.submitted ? (
              <Badge color="green">Submitted</Badge>
            ) : (
              <Badge color="yellow">In progress</Badge>
            )}
          </Text>
        </Stack>

        <Divider />

        {/* ---------------------------------------------------
            PARTICIPANTS
        --------------------------------------------------- */}
        <Stack gap="xs">
          <Text fw={600}>Participants</Text>

          {participants.length === 0 ? (
            <Text c="dimmed">No participants</Text>
          ) : (
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {participants.map((p) => (
                  <Table.Tr key={p.id}>
                    <Table.Td>{p.full_name}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Stack>

        <Divider />

        {/* ---------------------------------------------------
            TICKETS
        --------------------------------------------------- */}
        <Stack gap="xs">
          <Text fw={600}>Tickets</Text>

          {tickets.length === 0 ? (
            <Text c="dimmed">No tickets</Text>
          ) : (
            <Table highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Route</Table.Th>
                  <Table.Th>EUR</Table.Th>
                  <Table.Th>Participants</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {tickets.map((t) => (
                  <Table.Tr key={t.id}>
                    <Table.Td>
                      {t.from_location} → {t.to_location}
                    </Table.Td>

                    <Table.Td>{t.amount_eur.toFixed(2)}</Table.Td>

                    <Table.Td>
                      {t.assigned_participants &&
                      t.assigned_participants.length > 0 ? (
                        <Stack gap={2}>
                          {t.assigned_participants.map((p) => (
                            <Text size="sm" key={p.id}>
                              • {p.full_name}
                            </Text>
                          ))}
                        </Stack>
                      ) : (
                        <Text c="dimmed" size="sm">None</Text>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Stack>

        <Divider />

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            Close
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
