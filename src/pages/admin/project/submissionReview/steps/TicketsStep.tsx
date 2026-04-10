import { useEffect, useState } from "react";
import {
  Accordion,
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Alert,
  Progress,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";

import { getTravelModeIcon } from "../../../../../lib/travel/travelIcons";
import { openTicketFile } from "../../../../../lib/tickets/openTicketFile";
import { HelpTooltip } from "../../../../../components/HelpTooltip";
import { updateTicketDecision } from "../logic/reviewPersistence";
import { markTicketReviewed } from "../logic/reviewPersistence";

import type { Ticket } from "../../types";
import { useReviewStep } from "../ReviewStepContext";

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

type AdminTicket = Ticket & {
  assigned_participants?: { id: string; full_name: string }[];
};

type Props = {
  tickets: AdminTicket[];
  isClaimFinal: boolean;
  onTicketsChange: (tickets: AdminTicket[]) => void;
};

/* ------------------------------------------------------------------ */
/* Helpers */
/* ------------------------------------------------------------------ */

function isDecisionFinal(decision: Ticket["review_decision"]): boolean {
  return decision === "approved" || decision === "rejected";
}

function renderTicketStatusBadge(ticket: AdminTicket) {
  if (ticket.review_decision === "approved") {
    return (
      <Badge size="sm" color="green" variant="light">
        Approved
      </Badge>
    );
  }

  if (ticket.review_decision === "rejected") {
    return (
      <Badge size="sm" color="red" variant="light">
        Rejected
      </Badge>
    );
  }

  if (ticket.reviewed_at) {
    return (
      <Badge size="sm" color="blue" variant="light">
        Viewed
      </Badge>
    );
  }

  return null;
}

/* ------------------------------------------------------------------ */
/* Component */
/* ------------------------------------------------------------------ */

export default function TicketsStep({
  tickets,
  isClaimFinal,
  onTicketsChange,
}: Props) {
  const { markStepCompleted } = useReviewStep();
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);

  /* --------------------------------------------------
     Completion state
  -------------------------------------------------- */
  const allTicketsReviewed =
    tickets.length > 0 &&
    tickets.every((t) => isDecisionFinal(t.review_decision));

  useEffect(() => {
    if (allTicketsReviewed) {
      markStepCompleted("tickets");
    }
  }, [allTicketsReviewed, markStepCompleted]);

  if (tickets.length === 0) {
    return <Text c="dimmed">No tickets submitted.</Text>;
  }

  /* --------------------------------------------------
     Progress calculation
  -------------------------------------------------- */
  const reviewedCount = tickets.filter((t) =>
    isDecisionFinal(t.review_decision)
  ).length;

  const totalCount = tickets.length;

  const progressPercent =
    totalCount === 0 ? 0 : (reviewedCount / totalCount) * 100;

  /* --------------------------------------------------
     Local optimistic updates
  -------------------------------------------------- */
  function updateDecisionLocal(
    ticketId: string,
    decision: "approved" | "rejected"
  ) {
    const now = new Date().toISOString();

    onTicketsChange(
      tickets.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              review_decision: decision,
              reviewed_at: t.reviewed_at ?? now,
              approved: decision === "approved",
            }
          : t
      )
    );
  }

  function markReviewedLocal(ticketId: string) {
    const now = new Date().toISOString();

    onTicketsChange(
      tickets.map((t) =>
        t.id === ticketId ? { ...t, reviewed_at: now } : t
      )
    );
  }

  /* --------------------------------------------------
     Supabase updates
  -------------------------------------------------- */

  async function approveTicket(ticketId: string) {
    try {
      setUpdatingTicketId(ticketId);

      updateDecisionLocal(ticketId, "approved");

      await updateTicketDecision({
        ticketId,
        decision: "approved",
      });

      notifications.show({
        title: "Ticket approved",
        message: "Decision saved",
        color: "green",
      });
    } catch (err) {
      console.error(err);
      notifications.show({
        title: "Update failed",
        message: "Could not approve ticket",
        color: "red",
      });
    } finally {
      setUpdatingTicketId(null);
    }
  }

  async function rejectTicket(ticketId: string) {
    try {
      setUpdatingTicketId(ticketId);

      updateDecisionLocal(ticketId, "rejected");

      await updateTicketDecision({
        ticketId,
        decision: "rejected",
      });

      notifications.show({
        title: "Ticket rejected",
        message: "Decision saved",
        color: "yellow",
      });
    } catch (err) {
      console.error(err);
      notifications.show({
        title: "Update failed",
        message: "Could not reject ticket",
        color: "red",
      });
    } finally {
      setUpdatingTicketId(null);
    }
  }

  async function markReviewed(ticketId: string) {
    try {
      await markTicketReviewed(ticketId);
    } catch (err) {
      console.error("Failed to mark reviewed", err);
    }
  }

  /* --------------------------------------------------
     Render
  -------------------------------------------------- */

  return (
    <Stack gap="md">
      <Alert color="blue" variant="light">
        <Text size="sm">
          Review each ticket one by one. A decision can only be made after the
          ticket has been viewed.
        </Text>
      </Alert>

      <Card withBorder radius="md" p="md">
        <Stack gap={6}>
          <Group justify="space-between">
            <Text size="sm" fw={600}>
              Review progress
            </Text>

            <Badge color="blue" variant="light">
              {reviewedCount} / {totalCount} reviewed
            </Badge>
          </Group>

          <Progress
            value={progressPercent}
            animated={progressPercent < 100}
            color={progressPercent === 100 ? "green" : "blue"}
          />
        </Stack>
      </Card>

      <Accordion variant="contained" radius="md">
        {tickets.map((t) => {
          const isFinal = isDecisionFinal(t.review_decision);
          const canDecide = !!t.reviewed_at;
          const isApproved = t.review_decision === "approved";
          const isRejected = t.review_decision === "rejected";

          return (
            <Accordion.Item key={t.id} value={t.id}>
              <Accordion.Control>
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="xs" wrap="nowrap">
                    <Text>{getTravelModeIcon(t.travel_mode)}</Text>
                    <Text fw={600}>
                      {t.from_location} → {t.to_location}
                    </Text>
                  </Group>

                  <Group gap="sm">
                    {renderTicketStatusBadge(t)}
                    <Text fw={600}>{t.amount_eur.toFixed(2)} €</Text>
                  </Group>
                </Group>
              </Accordion.Control>

              <Accordion.Panel>
                <Card withBorder radius="md" p="md">
                  <Stack gap="sm">
                    <Stack gap={4}>
                      <Text size="xs" c="dimmed">
                        Participants
                      </Text>

                      {t.assigned_participants &&
                      t.assigned_participants.length > 0 ? (
                        <Group gap={6} wrap="wrap">
                          {t.assigned_participants.map((p) => (
                            <Badge key={p.id} size="sm" variant="light">
                              {p.full_name}
                            </Badge>
                          ))}
                        </Group>
                      ) : (
                        <Text size="sm" c="dimmed">
                          No participants assigned
                        </Text>
                      )}
                    </Stack>

                    <Group justify="flex-end">
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => {
                          markReviewedLocal(t.id);
                          markReviewed(t.id);
                          openTicketFile(t.file_url);
                        }}
                      >
                        View ticket
                      </Button>
                    </Group>

                    {!isClaimFinal && (
                      <Group gap="xs" align="center">
                        <Button
                          size="xs"
                          color="green"
                          variant={isApproved ? "filled" : "outline"}
                          loading={updatingTicketId === t.id}
                          disabled={
                            !canDecide ||
                            updatingTicketId !== null ||
                            isApproved
                          }
                          onClick={() => approveTicket(t.id)}
                        >
                          {isRejected ? "Change to approved" : "Approve"}
                        </Button>

                        <Button
                          size="xs"
                          color="red"
                          variant={isRejected ? "filled" : "outline"}
                          loading={updatingTicketId === t.id}
                          disabled={
                            !canDecide ||
                            updatingTicketId !== null ||
                            isRejected
                          }
                          onClick={() => rejectTicket(t.id)}
                        >
                          {isApproved ? "Change to rejected" : "Reject"}
                        </Button>

                        <HelpTooltip
                          label={
                            canDecide
                              ? isFinal
                                ? "Decision already made. You can still change it until the claim is finalized."
                                : "Ticket viewed. You may decide."
                              : "Please view the ticket before deciding."
                          }
                        />
                      </Group>
                    )}

                    {!isClaimFinal && isFinal && (
                      <Text size="xs" c="dimmed">
                        Decision already made. You can still change it until
                        the claim is finalized.
                      </Text>
                    )}

                    {isClaimFinal && (
                      <Text size="xs" c="dimmed">
                        Decision already made. This ticket is read-only.
                      </Text>
                    )}
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