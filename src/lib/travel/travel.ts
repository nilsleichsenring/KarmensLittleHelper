// src/lib/travel/travel.ts

/**
 * Central travel derivation logic.
 *
 * FINAL RULES (agreed):
 * - A participant travels "standard" if at least ONE of their tickets is a flight.
 * - A participant travels "green" if NONE of their tickets is a flight.
 *
 * Consequences:
 * - No manual override by partner
 * - No admin review required
 * - Deterministic & fraud-resistant
 *
 * This module is:
 * - UI-agnostic
 * - Side-effect free
 * - Reusable across Partner, Admin, PDF, Reporting
 */

/**
 * Resulting travel type derived by the system.
 */
export type TravelType = "green" | "standard";

/**
 * Minimal participant shape required for travel derivation.
 */
export type TravelParticipant = {
  id: string;
};

/**
 * Minimal ticket shape required for travel derivation.
 *
 * travel_mode examples:
 * - "flight"
 * - "train"
 * - "bus"
 * - "car"
 * - null
 */
export type TravelTicket = {
  id: string;
  travel_mode: string | null;
};

/**
 * Join table row linking tickets to participants.
 */
export type TicketParticipantLink = {
  ticket_id: string;
  participant_id: string;
};

/**
 * Derives travel type per participant based on assigned tickets.
 *
 * @returns Record<participantId, TravelType>
 */
export function deriveParticipantTravelTypes({
  participants,
  tickets,
  ticketParticipants,
}: {
  participants: TravelParticipant[];
  tickets: TravelTicket[];
  ticketParticipants: TicketParticipantLink[];
}): Record<string, TravelType> {
  // Index tickets by ID for fast lookup
  const ticketById = new Map<string, TravelTicket>();
  for (const ticket of tickets) {
    ticketById.set(ticket.id, ticket);
  }

  // Default: everyone is green
  const result: Record<string, TravelType> = {};
  for (const participant of participants) {
    result[participant.id] = "green";
  }

  // Apply rule: ANY flight → standard
  for (const link of ticketParticipants) {
    const ticket = ticketById.get(link.ticket_id);
    if (!ticket) continue;

    if (ticket.travel_mode === "flight") {
      result[link.participant_id] = "standard";
    }
  }

  return result;
}
