import { supabase } from "../../../../../lib/supabaseClient";
import { applyDistanceUpdate } from "../../../../../lib/travel/applyDistanceUpdate";

export async function saveClaimDecision(args: {
  submissionId: string;
  status: "approved" | "adjusted" | "rejected";
  approvedAmount: number;
  rejectionReason?: string | null;
}) {
  const { submissionId, status, approvedAmount, rejectionReason } = args;

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("project_partner_submissions")
      .update({
        claim_status: status,
        reviewed_at: now,
        approved_amount_eur: approvedAmount,
        rejection_reason: status === "rejected" ? rejectionReason ?? null : null,
      })
    .eq("id", submissionId)
    .select("id, claim_status, reviewed_at, approved_amount_eur, rejection_reason")
    .single();

  if (error) {
    throw error;
  }

  return {
    reviewed_at: now,
    claim_status: data.claim_status as "approved" | "adjusted" | "rejected",
    approved_amount_eur: data.approved_amount_eur as number | null,
    rejection_reason: data.rejection_reason as string | null,
  };
}

export async function reopenClaim(submissionId: string) {
  const { data, error } = await supabase
    .from("project_partner_submissions")
      .update({
        claim_status: "open",
        reviewed_at: null,
        approved_amount_eur: null,
        rejection_reason: null,

        payment_status: "unpaid",
        payment_paid_at: null,
      })
    .eq("id", submissionId)
    .eq("payment_status", "unpaid")
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Paid claims cannot be reopened.");
  }

  return {
    claim_status: "open" as const,
    reviewed_at: null,
    approved_amount_eur: null,
  };
}

export async function updateTicketDecision(args: {
  ticketId: string;
  decision: "approved" | "rejected";
}) {
  const { ticketId, decision } = args;
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("tickets")
    .update({
      review_decision: decision,
      reviewed_at: now,
      approved: decision === "approved",
    })
    .eq("id", ticketId);

  if (error) {
    throw error;
  }

  return {
    review_decision: decision,
    reviewed_at: now,
    approved: decision === "approved",
  };
}

export async function saveDistance(args: {
  projectId: string;
  organisationName: string;
  distanceKm: number;
}) {
  const { projectId, organisationName, distanceKm } = args;

  const update = applyDistanceUpdate(distanceKm);

  const { error } = await supabase
    .from("project_partner_orgs")
    .update({
      distance_km: update.distance_km,
      distance_band: update.distance_band,
      rate_standard_eur: update.rate_standard_eur,
      rate_green_eur: update.rate_green_eur,
    })
    .eq("project_id", projectId)
    .eq("organisation_name", organisationName);

  if (error) {
    throw error;
  }

  return {
    distanceKm: update.distance_km!,
    distanceBand: update.distance_band!,
    standardRate: update.rate_standard_eur!,
    greenRate: update.rate_green_eur!,
  };
}

export async function markClaimPaid(submissionId: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("project_partner_submissions")
    .update({
      payment_status: "paid",
      payment_paid_at: now,
    })
    .eq("id", submissionId)
    .in("claim_status", ["approved", "adjusted"])
    .gt("approved_amount_eur", 0)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Only approved claims with a positive approved amount can be marked as paid."
    );
  }

  return {
    payment_status: "paid" as const,
    payment_paid_at: now,
  };
}

export async function undoClaimPayment(submissionId: string) {
  const { data, error } = await supabase
    .from("project_partner_submissions")
    .update({
      payment_status: "unpaid",
      payment_paid_at: null,
    })
    .eq("id", submissionId)
    .eq("payment_status", "paid")
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Only paid claims can undo the payment status.");
  }

  return {
    payment_status: "unpaid" as const,
    payment_paid_at: null,
  };
}

export async function deleteClaimCascade(submissionId: string) {
  const { data: ticketRows, error: ticketLoadErr } = await supabase
    .from("tickets")
    .select("id")
    .eq("project_partner_submission_id", submissionId);

  if (ticketLoadErr) {
    throw ticketLoadErr;
  }

  const ticketIds = (ticketRows || []).map((t: { id: string }) => t.id);

  if (ticketIds.length > 0) {
    const { error: ticketParticipantsErr } = await supabase
      .from("ticket_participants")
      .delete()
      .in("ticket_id", ticketIds);

    if (ticketParticipantsErr) {
      throw ticketParticipantsErr;
    }
  }

  const { error: ticketsErr } = await supabase
    .from("tickets")
    .delete()
    .eq("project_partner_submission_id", submissionId);

  if (ticketsErr) {
    throw ticketsErr;
  }

  const { error: participantsErr } = await supabase
    .from("participants")
    .delete()
    .eq("project_partner_submission_id", submissionId);

  if (participantsErr) {
    throw participantsErr;
  }

  const { error: submissionErr } = await supabase
    .from("project_partner_submissions")
    .delete()
    .eq("id", submissionId);

  if (submissionErr) {
    throw submissionErr;
  }
}

export async function markTicketReviewed(ticketId: string) {
  const reviewedAt = new Date().toISOString();

  const { error } = await supabase
    .from("tickets")
    .update({ reviewed_at: reviewedAt })
    .eq("id", ticketId);

  if (error) {
    throw error;
  }

  return {
    reviewed_at: reviewedAt,
  };
}