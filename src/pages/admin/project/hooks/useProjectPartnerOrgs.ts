// src/pages/admin/project/hooks/useProjectPartnerOrgs.ts
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import type { ProjectPartnerOrg } from "../types";

export function useProjectPartnerOrgs(projectId?: string) {
  const [partnerOrgs, setPartnerOrgs] = useState<ProjectPartnerOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!projectId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("project_partner_orgs")
        .select("*")
        .eq("project_id", projectId)
        .order("country_code", { ascending: true })
        .order("organisation_name", { ascending: true });

      if (error) {
        console.error("Error loading partner orgs", error);
        setPartnerOrgs([]);
      } else {
        setPartnerOrgs((data || []) as ProjectPartnerOrg[]);
      }

      setLoading(false);
    }

    load();
  }, [projectId]);

  async function addPartnerOrg(input: {
    organisation_name: string;
    country_code: string | null;
  }) {
    if (!projectId || !input.organisation_name.trim()) return;

    setSaving(true);

    const { data, error } = await supabase
      .from("project_partner_orgs")
      .insert({
        project_id: projectId,
        organisation_name: input.organisation_name.trim(),
        country_code: input.country_code,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      console.error("Error adding partner org", error);
      return;
    }

    if (data) {
      setPartnerOrgs((prev) => [...prev, data as ProjectPartnerOrg]);
    }
  }

  async function deletePartnerOrg(id: string) {
    const { error } = await supabase
      .from("project_partner_orgs")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting partner org", error);
      return;
    }

    setPartnerOrgs((prev) => prev.filter((p) => p.id !== id));
  }

  return { partnerOrgs, loading, saving, addPartnerOrg, deletePartnerOrg };
}
