// src/pages/admin/project/hooks/useProjectSubmissions.ts
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import type { SubmissionSummary } from "../types";

export function useProjectSubmissions(projectId: string | null) {
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!projectId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      // 1️⃣ Submission Basisdaten (inkl. Payment-Felder)
      const { data: subs, error } = await supabase
        .from("project_partner_submissions")
        .select(`
          id,
          project_id,
          organisation_name,
          country_code,
          submitted,
          submitted_at,
          reviewed_at,
          claim_status,
          payment_status,
          payment_paid_at
        `)
        .eq("project_id", projectId)
        .order("organisation_name", { ascending: true });

      if (error) {
        console.error("Error loading submissions", error);
        setSubmissions([]);
        setLoading(false);
        return;
      }

      const result: SubmissionSummary[] = [];

      for (const s of subs ?? []) {
        // Participants
        const { count: participantCount } = await supabase
          .from("participants")
          .select("*", { count: "exact", head: true })
          .eq("project_partner_submission_id", s.id);

        // Tickets
        const { data: tickets, count: ticketCount } = await supabase
          .from("tickets")
          .select("amount_eur", { count: "exact" })
          .eq("project_partner_submission_id", s.id);

        const totalEur =
          tickets?.reduce((sum, t) => sum + (t.amount_eur || 0), 0) ?? 0;

        result.push({
          id: s.id,
          project_id: s.project_id,
          organisation_name: s.organisation_name,
          country_code: s.country_code,

          submitted: s.submitted,
          submitted_at: s.submitted_at,

          reviewed_at: s.reviewed_at,
          claim_status: s.claim_status,

          // 🆕 Payment
          payment_status: s.payment_status ?? "unpaid",
          payment_paid_at: s.payment_paid_at ?? null,

          participantCount: participantCount ?? 0,
          ticketCount: ticketCount ?? 0,
          totalEur,
        });
      }

      setSubmissions(result);
      setLoading(false);
    }

    load();
  }, [projectId]);

  // 🔁 Lokales Patchen nach Review (Claim-Entscheidung)
  function updateSubmissionReview(
    submissionId: string,
    payload: {
      reviewed_at: string;
      claim_status: "approved" | "adjusted";
    }
  ) {
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === submissionId ? { ...s, ...payload } : s
      )
    );
  }

  // 🔁 Lokales Patchen nach Payment (Undo-fähig)
  function updateSubmissionPayment(
    submissionId: string,
    payload: {
      payment_status: "unpaid" | "paid";
      payment_paid_at: string | null;
    }
  ) {
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === submissionId ? { ...s, ...payload } : s
      )
    );
  }

  return {
    submissions,
    loading,
    updateSubmissionReview,
    updateSubmissionPayment,
  };
}
