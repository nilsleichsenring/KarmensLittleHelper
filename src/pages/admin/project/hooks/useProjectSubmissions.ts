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

      // 1) Basic submission info
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

      // 2) For each submission → load participant count + ticket count + sum
      const result: SubmissionSummary[] = [];

      for (const s of submissionsRaw) {
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

        // Sum amounts
        const totalEur =
          tickets?.reduce((sum, t) => sum + (t.amount_eur || 0), 0) ?? 0;

        result.push({
          id: s.id,
          organisation_name: s.organisation_name,
          country_code: s.country_code,
          submitted: s.submitted,
          submitted_at: s.submitted_at,
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

  return { submissions, loading };
}
