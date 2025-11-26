// src/pages/admin/project/hooks/useProjectCountries.ts
import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import type { CountryRef, ProjectCountry } from "../types";

export function useProjectCountries(projectId?: string) {
  const [countries, setCountries] = useState<ProjectCountry[]>([]);
  const [allCountries, setAllCountries] = useState<CountryRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!projectId) {
        setLoading(false);
        return;
      }
      setLoading(true);

      const [{ data: pc }, { data: allC }] = await Promise.all([
        supabase
          .from("project_countries")
          .select("*")
          .eq("project_id", projectId)
          .order("country_code", { ascending: true }),
        supabase.from("countries").select("code, name").order("name", {
          ascending: true,
        }),
      ]);

      setCountries((pc || []) as ProjectCountry[]);
      setAllCountries((allC || []) as CountryRef[]);
      setLoading(false);
    }

    load();
  }, [projectId]);

  async function addCountry(code: string) {
    if (!projectId || !code) return;
    setSaving(true);

    const { data, error } = await supabase
      .from("project_countries")
      .insert({
        project_id: projectId,
        country_code: code,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      console.error("Error adding country", error);
      return;
    }

    if (data) {
      setCountries((prev) => [...prev, data as ProjectCountry]);
    }
  }

  async function deleteCountry(id: string) {
    const { error } = await supabase
      .from("project_countries")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting country", error);
      return;
    }

    setCountries((prev) => prev.filter((c) => c.id !== id));
  }

  function getCountryLabel(code: string | null) {
    if (!code) return "—";
    const found = allCountries.find((c) => c.code === code);
    return found ? `${found.name} (${found.code})` : code;
  }

  const availableCountryOptions = allCountries
    .filter((c) => !countries.some((pc) => pc.country_code === c.code))
    .map((c) => ({
      value: c.code,
      label: `${c.name} (${c.code})`,
    }));

  const projectCountryOptions = countries.map((c) => ({
    value: c.country_code,
    label: getCountryLabel(c.country_code),
  }));

  return {
    countries,
    allCountries,
    loading,
    saving,
    addCountry,
    deleteCountry,
    getCountryLabel,
    availableCountryOptions,
    projectCountryOptions,
  };
}
