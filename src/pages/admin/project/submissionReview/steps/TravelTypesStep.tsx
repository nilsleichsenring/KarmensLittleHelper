import { Accordion, Badge, Button, Card, Group, Stack, Text } from "@mantine/core";

import type { Participant, Ticket } from "../../types";
import { deriveParticipantTravelTypes } from "../../../../../lib/travel/travel";
import { getTravelModeIcon } from "../../../../../lib/travel/travelIcons";
import { openTicketFile } from "../../../../../lib/tickets/openTicketFile";

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

type AdminTicket = Ticket & {
  assigned_participants?: { id: string; full_name: string }[];
};

type Props = {
  participants: Participant[];
  tickets: AdminTicket[];
};

/* ------------------------------------------------------------------ */
/* Helpers */
/* ------------------------------------------------------------------ */

function getParticipantTickets(participantId: string, tickets: AdminTicket[]) {
  return tickets.filter((t) =>
    t.assigned_participants?.some((p) => p.id === participantId)
  );
}

function getParticipantTicketStats(
  participantId: string,
  tickets: AdminTicket[]
) {
  const participantTickets = getParticipantTickets(participantId, tickets);

  const approvedTickets = participantTickets.filter(
    (t) => t.review_decision === "approved"
  );

  return {
    approved: approvedTickets.length,
    total: participantTickets.length,
  };
}

/* ------------------------------------------------------------------ */
/* Component */
/* ------------------------------------------------------------------ */

export default function TravelTypesStep({ participants, tickets }: Props) {
  /* -------------------------------------------------- */
  /* Approved tickets only (admin review truth) */
  /* -------------------------------------------------- */

  const approvedTickets = tickets.filter(
    (t) => t.review_decision === "approved"
  );

  const ticketParticipants = approvedTickets.flatMap(
    (t) =>
      t.assigned_participants?.map((p) => ({
        ticket_id: t.id,
        participant_id: p.id,
      })) ?? []
  );

  /* -------------------------------------------------- */
  /* Derived travel types */
  /* -------------------------------------------------- */

  const participantTravelTypes = deriveParticipantTravelTypes({
    participants,
    tickets: approvedTickets,
    ticketParticipants,
  });

  if (participants.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No participants available.
      </Text>
    );
  }

  return (
    <Stack gap="md">
      <Card withBorder radius="md" p="md" bg="blue.0">
        <Text size="sm">
          Travel types are determined automatically based on approved tickets.
          No manual action is required.
        </Text>
      </Card>

      <Accordion variant="contained" radius="md">
        {participants.map((p) => {
          const travelType = participantTravelTypes[p.id];
          const stats = getParticipantTicketStats(p.id, tickets);

          const participantTickets = getParticipantTickets(p.id, tickets);
          const participantApprovedTickets = participantTickets.filter(
            (t) => t.review_decision === "approved"
          );

          const hasNoTickets = stats.total === 0;

          return (
            <Accordion.Item key={p.id} value={p.id}>
              <Accordion.Control>
                <Group justify="space-between">
                  <Group gap="xs">
                    <Text fw={600}>{p.full_name}</Text>

                    <Badge size="sm" variant="outline">
                      {stats.approved} / {stats.total}
                    </Badge>
                  </Group>

                  <Badge
                    color={
                      hasNoTickets
                        ? "red"
                        : travelType === "green"
                        ? "green"
                        : "gray"
                    }
                    variant="light"
                  >
                    {hasNoTickets
                      ? "No tickets!"
                      : travelType === "green"
                      ? "Green travel"
                      : "Standard travel"}
                  </Badge>
                </Group>
              </Accordion.Control>

              <Accordion.Panel>
                <Card withBorder radius="md" p="md">
                  <Stack gap="xs">
                    {hasNoTickets && (
                      <Text size="sm" c="red">
                        This participant has no approved ticket. Therefore,
                        the participant is not eligible to reimburse travel
                        costs.
                      </Text>
                    )}

                    {!hasNoTickets && participantApprovedTickets.length === 0 && (
                      <Text size="sm" c="orange">
                        No approved tickets yet.
                      </Text>
                    )}

                    {participantApprovedTickets.map((t) => (
                      <Group key={t.id} justify="space-between">
                        <Group gap="xs">
                          <Text>{getTravelModeIcon(t.travel_mode)}</Text>
                          <Text size="sm">
                            {t.from_location} → {t.to_location}
                          </Text>
                        </Group>

                        {t.file_url && (
                          <Button
                            size="xs"
                            variant="subtle"
                            onClick={() => openTicketFile(t.file_url)}
                          >
                            View ticket
                          </Button>
                        )}
                      </Group>
                    ))}
                  </Stack>
                </Card>
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </Stack>
  );
}