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
import type { SubmissionSummary, Participant, Ticket } from "../types";

type Props = {
  opened: boolean;
  onClose: () => void;
  submission: SubmissionSummary | null;
  participants: Participant[];
  tickets: Ticket[];
  getCountryLabel: (code: string | null) => string;
};

export default function SubmissionDetailsModal({
  opened,
  onClose,
  submission,
  participants,
  tickets,
  getCountryLabel,
}: Props) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={submission ? submission.organisation_name : "Submission"}
      size="lg"
      centered
    >
      {!submission ? (
        <Loader />
      ) : (
        <Stack gap="lg">
          {/* ---------------------------------------------------
              ORGANISATION INFO
          --------------------------------------------------- */}
          <Stack gap={0}>
            <Text fw={600}>Organisation</Text>

            <Text>
              {submission.organisation_name} (
              {getCountryLabel(submission.country_code)})
            </Text>

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
              TICKETS (NEW: includes participants)
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
                      {/* Route */}
                      <Table.Td>
                        {t.from_location} → {t.to_location}
                      </Table.Td>

                      {/* Amount */}
                      <Table.Td>{t.amount_eur.toFixed(2)}</Table.Td>

                      {/* Assigned participants */}
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
                          <Text c="dimmed" size="sm">
                            None
                          </Text>
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
      )}
    </Modal>
  );
}
