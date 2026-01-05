// src/lib/travel/participantTravel.ts

/**
 * Helper logic to derive travel-related information per participant
 * based on ticket assignments.
 *
 * This is NOT business logic (green vs standard),
 * but explanatory / relational logic for UI & admin views.
 */

export type TravelMode = string;

export type ParticipantRef = {
  id: string;
};

export type TicketRef = {
  id: string;
  travel_mode: TravelMode | null;
};

export type TicketParticipantLink = {
  ticket_id: string;
  participant_id: string;
};

/**
 * Returns all distinct travel modes used by a participant.
 *
 * Example:
 * - 2× bus, 1× train, 1× flight → ["bus", "train", "flight"]
 */
export function getParticipantTravelModes(
  participantId: string,
  tickets: TicketRef[],
  ticketParticipants: TicketParticipantLink[]
): TravelMode[] {
  const ticketIds = ticketParticipants
    .filter((tp) => tp.participant_id === participantId)
    .map((tp) => tp.ticket_id);

  const modes = tickets
    .filter((t) => ticketIds.includes(t.id))
    .map((t) => t.travel_mode)
    .filter((m): m is TravelMode => Boolean(m));

  // deduplicate
  return Array.from(new Set(modes));
}
