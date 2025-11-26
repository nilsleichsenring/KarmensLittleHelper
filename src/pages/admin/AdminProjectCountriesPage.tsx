import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import {
  Button,
  Card,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";

type CountryEntry = {
  id: string;
  project_id: string;
  country_code: string;
  partner_organisation_name: string;
  created_at: string;
};

export function AdminProjectCountriesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [countries, setCountries] = useState<CountryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [countryCode, setCountryCode] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCountries() {
      if (!projectId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("project_countries")
        .select("*")
        .eq("project_id", projectId)
        .order("country_code", { ascending: true });

      if (error) {
        console.error("Error loading countries:", error);
      } else {
        setCountries((data || []) as CountryEntry[]);
      }
      setLoading(false);
    }

    loadCountries();
  }, [projectId]);

  async function handleAddCountry(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!projectId) return;

    if (!countryCode.trim() || !partnerName.trim()) {
      setFormError("Country code and partner name are required.");
      return;
    }
    setSaving(true);

    const { data, error } = await supabase
      .from("project_countries")
      .insert({
        project_id: projectId,
        country_code: countryCode.toUpperCase(),
        partner_organisation_name: partnerName.trim(),
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      console.error("Error adding country:", error);
      setFormError("Could not add country. Please try again.");
      return;
    }

    if (data) {
      setCountries((prev) => [...prev, data as CountryEntry]);
      setCountryCode("");
      setPartnerName("");
    }
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Stack gap={4}>
          <Title order={2}>Manage countries</Title>
          <Text size="sm" c="dimmed">
            Add or review participating countries for this project.
          </Text>
        </Stack>

        <Button
          variant="subtle"
          component={Link}
          to={`/admin/projects/${projectId}`}
        >
          ← Back to project
        </Button>
      </Group>

      {/* Add Country Form */}
      <Card withBorder shadow="sm" radius="md" p="lg" maw={500}>
        <form onSubmit={handleAddCountry}>
          <Stack gap="sm">
            <Title order={4}>Add country</Title>

            <TextInput
              label="Country code (e.g. DE)"
              placeholder="DE"
              value={countryCode}
              onChange={(e) => setCountryCode(e.currentTarget.value)}
              withAsterisk
            />

            <TextInput
              label="Partner organisation name"
              placeholder="Organisation"
              value={partnerName}
              onChange={(e) => setPartnerName(e.currentTarget.value)}
              withAsterisk
            />

            {formError && (
              <Text size="sm" c="red">
                {formError}
              </Text>
            )}

            <Group justify="flex-end">
              <Button type="submit" loading={saving}>
                Add country
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>

      {/* Countries Table */}
      {loading ? (
        <Group justify="center" mt="md">
          <Loader />
        </Group>
      ) : countries.length === 0 ? (
        <Text size="sm" c="dimmed">
          No countries added yet.
        </Text>
      ) : (
        <Card withBorder shadow="sm" radius="md" p="lg">
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Country code</Table.Th>
                <Table.Th>Partner organisation</Table.Th>
                <Table.Th>Created</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {countries.map((c) => (
                <Table.Tr key={c.id}>
                  <Table.Td>{c.country_code}</Table.Td>
                  <Table.Td>{c.partner_organisation_name}</Table.Td>
                  <Table.Td>
                    {new Date(c.created_at).toLocaleString()}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}
    </Stack>
  );
}
