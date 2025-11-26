// src/pages/admin/project/hooks/useProjectSubmissions.ts
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import type { SubmissionSummary } from "../types";

type ParticipantAggRow = {
  project_partner_submission_id: string;
  count: number;
};

type TicketAggRow = {
  project_partner_submission_id: string;
  total: number;
  count: number;
};

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

      // 1) Submissions
      const { data: subs, error: subsError } = await supabase
        .from("project_partner_submissions")
        .select("id, organisation_name, country_code, submitted, submitted_at")
        .eq("project_id", projectId)
        .order("organisation_name", { ascending: true });

      if (subsError) {
        console.error("Error loading submissions", subsError);
        setSubmissions([]);
        setLoading(false);
        return;
      }

      const submissionsRaw = subs || [];

      if (submissionsRaw.length === 0) {
        setSubmissions([]);
        setLoading(false);
        return;
      }

      const subIds = submissionsRaw.map((s) => s.id);

      // 2) Participant counts
      const { data: participantAgg, error: partError } = await supabase
        .from("participants")
        .select("project_partner_submission_id, count:count(*)")
        .in("project_partner_submission_id", subIds);

      if (partError) {
        console.error("Error loading participant agg", partError);
      }

      // 3) Ticket totals
      const { data: ticketsAgg, error: ticketError } = await supabase
        .from("tickets")
        .select(
          "project_partner_submission_id, total:sum(amount_eur), count:count(*)"
        )
        .in("project_partner_submission_id", subIds);

      if (ticketError) {
        console.error("Error loading ticket agg", ticketError);
      }

      const pAgg =
        (participantAgg as unknown as ParticipantAggRow[]) || [];

    const tAgg =
        (ticketsAgg as unknown as TicketAggRow[]) || [];


      const list: SubmissionSummary[] = submissionsRaw.map((s) => {
        const p = pAgg.find(
          (x: ParticipantAggRow) =>
            x.project_partner_submission_id === s.id
        );
        const t = tAgg.find(
          (x: TicketAggRow) =>
            x.project_partner_submission_id === s.id
        );

        return {
          id: s.id,
          organisation_name: s.organisation_name,
          country_code: s.country_code,
          submitted: s.submitted,
          submitted_at: s.submitted_at,
          participantCount: p?.count ?? 0,
          ticketCount: t?.count ?? 0,
          totalEur: t?.total ?? 0,
        };
      });

      setSubmissions(list);
      setLoading(false);
    }

    load();
  }, [projectId]);

  return { submissions, loading };
}
