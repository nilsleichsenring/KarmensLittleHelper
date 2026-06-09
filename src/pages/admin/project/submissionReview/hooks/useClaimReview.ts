import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../../lib/supabaseClient";

import type {
  ClaimSummary,
  Participant,
  Ticket,
  ProjectPartnerOrg,
} from "../../types";

import { deriveParticipantTravelTypes } from "../../../../../lib/travel/travel";
import { calculateClaimSummary } from "../logic/reviewCalculations";

type AdminTicket = Ticket & {
  assigned_participants?: { id: string; full_name: string }[];
};

type DistanceState = {
  distanceKm: number | null;
  distanceBand: number | null;
  standardRate: number | null;
  greenRate: number | null;
};

type InitialDistanceResult = {
  distanceKm: number;
  distanceBand: number;
  standardRate: number;
  greenRate: number;
} | null;

type UseClaimReviewResult = {
  loading: boolean;
  error: string | null;

  submission: ClaimSummary | null;
  updateClaim: (payload: Partial<ClaimSummary>) => void;
  partnerOrg: ProjectPartnerOrg | null;
  participants: Participant[];
  tickets: AdminTicket[];

  distance: DistanceState;
  initialDistanceResult: InitialDistanceResult;

  participantTravelTypes: Record<string, "standard" | "green">;
  claimedAmount: number;
  approvedTicketsAmount: number;
  eligibleAmount: number | null;
  amountToApprove: number;
  balance: number | null;
  allTicketsReviewed: boolean;
  isClaimFinal: boolean;
  hasDistance: boolean;
};

export function useClaimReview(
  submissionId: string | null,
  enabled = true
): UseClaimReviewResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [claim, setClaim] = useState<ClaimSummary | null>(null);
  const [partnerOrg, setPartnerOrg] = useState<ProjectPartnerOrg | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tickets, setTickets] = useState<AdminTicket[]>([]);

  useEffect(() => {
    if (!submissionId || !enabled) {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const { data: submissionData, error: subError } = await supabase
          .from("project_partner_submissions")
          .select("*")
          .eq("id", submissionId)
          .single();

        if (subError) throw subError;
        if (!active) return;

        setClaim(submissionData as ClaimSummary);

        const { data: orgData, error: orgError } = await supabase
          .from("project_partner_orgs")
          .select("*")
          .eq("project_id", submissionData.project_id)
          .eq("organisation_name", submissionData.organisation_name)
          .maybeSingle();

        if (orgError) throw orgError;
        if (!active) return;

        setPartnerOrg((orgData as ProjectPartnerOrg | null) ?? null);

        const { data: partsData, error: partsError } = await supabase
          .from("participants")
          .select("id, full_name, is_green_travel")
          .eq("project_partner_submission_id", submissionId);

        if (partsError) throw partsError;
        if (!active) return;

        setParticipants((partsData || []) as Participant[]);

        const { data: ticketsData, error: ticketsError } = await supabase
          .from("tickets")
          .select(
            `
            id,
            project_partner_submission_id,
            from_location,
            to_location,
            travel_mode,
            amount_eur,
            file_url,
            admin_note,
            review_decision,
            reviewed_at,
            ticket_participants (
              participant: participants ( id, full_name )
            )
          `
          )
          .eq("project_partner_submission_id", submissionId);

        if (ticketsError) throw ticketsError;
        if (!active) return;

        const mappedTickets: AdminTicket[] =
          (ticketsData || []).map((t: any) => ({
            id: t.id,
            project_partner_submission_id: t.project_partner_submission_id,
            from_location: t.from_location,
            to_location: t.to_location,
            travel_mode: t.travel_mode,
            amount_eur: Number(t.amount_eur ?? 0),
            approved: t.review_decision === "approved",
            admin_note: t.admin_note ?? null,
            review_decision: t.review_decision ?? null,
            reviewed_at: t.reviewed_at ?? null,
            file_url: t.file_url ?? null,
            assigned_participants:
              t.ticket_participants?.map((tp: any) => tp.participant) ?? [],
          })) ?? [];

        setTickets(mappedTickets);
      } catch (err) {
        console.error(err);
        if (!active) return;
        setError("Could not load submission review.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [submissionId, enabled]);

  const distance: DistanceState = useMemo(
    () => ({
      distanceKm: partnerOrg?.distance_km ?? null,
      distanceBand: partnerOrg?.distance_band ?? null,
      standardRate: partnerOrg?.rate_standard_eur ?? null,
      greenRate: partnerOrg?.rate_green_eur ?? null,
    }),
    [partnerOrg]
  );

  const initialDistanceResult: InitialDistanceResult = useMemo(() => {
    if (
      distance.distanceKm == null ||
      distance.distanceBand == null ||
      distance.standardRate == null ||
      distance.greenRate == null
    ) {
      return null;
    }

    return {
      distanceKm: Number(distance.distanceKm),
      distanceBand: Number(distance.distanceBand),
      standardRate: Number(distance.standardRate),
      greenRate: Number(distance.greenRate),
    };
  }, [distance]);

  const ticketParticipants = useMemo(
    () =>
      tickets.flatMap(
        (t) =>
          t.assigned_participants?.map((p) => ({
            ticket_id: t.id,
            participant_id: p.id,
          })) ?? []
      ),
    [tickets]
  );

  const participantTravelTypes = useMemo(
    () =>
      deriveParticipantTravelTypes({
        participants,
        tickets,
        ticketParticipants,
      }),
    [participants, tickets, ticketParticipants]
  );

  const claimSummary = useMemo(
    () =>
      calculateClaimSummary({
        participants,
        tickets,
        participantTravelTypes,
        distanceResult: initialDistanceResult,
      }),
    [participants, tickets, participantTravelTypes, initialDistanceResult]
  );

  const isClaimFinal =
    claim?.claim_status === "approved" ||
    claim?.claim_status === "adjusted" ||
    claim?.claim_status === "rejected";

  const hasDistance = distance.distanceKm != null;

  function updateClaim(payload: Partial<ClaimSummary>) {
    setClaim((prev) => (prev ? { ...prev, ...payload } : prev));
  }

  return {
    loading,
    error,

    submission: claim,
    updateClaim,
    partnerOrg,
    participants,
    tickets,

    distance,
    initialDistanceResult,

    participantTravelTypes,
    claimedAmount: claimSummary.claimedAmount,
    approvedTicketsAmount: claimSummary.approvedTicketsAmount,
    eligibleAmount: claimSummary.eligibleAmount,
    amountToApprove: claimSummary.amountToApprove,
    balance: claimSummary.balance,
    allTicketsReviewed: claimSummary.allTicketsReviewed,
    isClaimFinal,
    hasDistance,
  };
}