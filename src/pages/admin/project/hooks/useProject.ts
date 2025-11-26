// src/pages/admin/project/hooks/useProject.ts
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import type { Project } from "../types";

export function useProject(projectId?: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: dbError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (dbError) {
      console.error("Error loading project", dbError);
      setError("Could not load project.");
      setProject(null);
    } else {
      setProject(data as Project);
    }

    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateProject(updates: {
    name: string;
    project_type: string | null;
    start_date: string | null;
    end_date: string | null;
    description: string | null;
    internal_notes: string | null;
  }) {
    if (!projectId) return { ok: false as const };

    const { data, error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", projectId)
      .select()
      .single();

    if (error) {
      console.error("Error updating project", error);
      return { ok: false as const, error };
    }

    setProject(data as Project);
    return { ok: true as const, project: data as Project };
  }

  return { project, loading, error, updateProject };
}
