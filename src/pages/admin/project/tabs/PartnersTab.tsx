// src/pages/admin/project/tabs/PartnersTab.tsx

import { useState } from "react";
import {
  Button,
  Card,
  Group,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Select,
} from "@mantine/core";

import CountryFlag from "../../../../components/CountryFlag";
import { type ProjectPartnerOrg } from "../types";

import { applyDistanceUpdate } from "../../../../lib/travel/applyDistanceUpdate";

type Props = {
  partnerOrgs: ProjectPartnerOrg[];
  projectCountryOptions: { value: string; label: string }[];

  updatePartnerOrg: (
    id: string,
    patch: Partial<ProjectPartnerOrg>
  ) => Promise<void>;

  deletePartnerOrg: (id: string) => Promise<void>;
};

export function PartnersTab({
  partnerOrgs,
  projectCountryOptions,
  updatePartnerOrg,
  deletePartnerOrg,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = partnerOrgs.find((p) => p.id === activeId) || null;

  const [form, setForm] = useState<Partial<ProjectPartnerOrg>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------------------------------------------------------
     Select organisation
  --------------------------------------------------------- */
  function selectOrg(id: string) {
    setActiveId(id);
    setError(null);

    const org = partnerOrgs.find((p) => p.id === id);
    if (!org) return;

    setForm({
      organisation_name: org.organisation_name,
      country_code: org.country_code,

      address_line1: org.address_line1,
      address_line2: org.address_line2,
      address_postal_code: org.address_postal_code,
      address_city: org.address_city,
      address_region: org.address_region,

      distance_km: org.distance_km,
      distance_band: org.distance_band,
      rate_standard_eur: org.rate_standard_eur,
      rate_green_eur: org.rate_green_eur,

      account_holder: org.account_holder,
      iban: org.iban,
      bic: org.bic,
    });
  }

  /* ---------------------------------------------------------
     Field update helper (distance logic centralized)
  --------------------------------------------------------- */
  function updateField<K extends keyof ProjectPartnerOrg>(
    key: K,
    value: ProjectPartnerOrg[K] | null
  ) {
    const updated: Partial<ProjectPartnerOrg> = {
      ...form,
      [key]: value as any,
    };

    if (key === "distance_km") {
      Object.assign(
        updated,
        applyDistanceUpdate(
          value === null || value === undefined ? null : Number(value)
        )
      );
    }

    setForm(updated);
  }

  /* ---------------------------------------------------------
     Save
  --------------------------------------------------------- */
  async function saveChanges() {
    if (!activeId) return;

    setSaving(true);
    setError(null);

    try {
      await updatePartnerOrg(activeId, form);

      // UX: zurück zur Liste
      setActiveId(null);
      setForm({});
    } catch (err) {
      console.error(err);
      setError("Could not save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  /* ---------------------------------------------------------
     Render
  --------------------------------------------------------- */
  return (
    <Stack gap="lg">
      {/* Header */}
      <Stack gap="xs">
        <Title order={2}>Partner organisations</Title>
        <Text size="sm" c="dimmed">
          This is the master data of partner organisations. Distances and rates
          entered here affect all submitted claims.
        </Text>
      </Stack>

      {/* List */}
      <Card withBorder p="md">
        {partnerOrgs.length === 0 ? (
          <Text c="dimmed">No partner organisations yet.</Text>
        ) : (
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Country</Table.Th>
                <Table.Th>Distance</Table.Th>
                <Table.Th>Rates</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {partnerOrgs.map((p) => (
                <Table.Tr
                  key={p.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => selectOrg(p.id)}
                >
                  <Table.Td>{p.organisation_name}</Table.Td>

                  <Table.Td>
                    <Group gap={8}>
                      {p.country_code && (
                        <CountryFlag code={p.country_code} size={18} />
                      )}
                      <Text>{p.country_code || "—"}</Text>
                    </Group>
                  </Table.Td>

                  <Table.Td>
                    {p.distance_km != null ? `${p.distance_km} km` : "—"}
                  </Table.Td>

                  <Table.Td>
                    {p.rate_standard_eur != null ? (
                      <>
                        <Text size="sm">
                          Standard: {p.rate_standard_eur} €
                        </Text>
                        <Text size="sm">
                          Green: {p.rate_green_eur} €
                        </Text>
                      </>
                    ) : (
                      <Text size="sm">—</Text>
                    )}
                  </Table.Td>

                  <Table.Td>
                    <Button
                      size="xs"
                      variant="subtle"
                      color="red"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePartnerOrg(p.id);
                      }}
                    >
                      Delete
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      {/* Detail editor */}
      {active && (
        <Card withBorder radius="md" p="lg">
          <Stack gap="lg">
            <Title order={4}>{active.organisation_name}</Title>

            <Group grow>
              <TextInput
                label="Organisation name"
                value={form.organisation_name || ""}
                onChange={(e) =>
                  updateField("organisation_name", e.currentTarget.value)
                }
              />

              <Select
                label="Country"
                data={projectCountryOptions}
                value={form.country_code || null}
                onChange={(v) => updateField("country_code", v || null)}
              />
            </Group>

            {/* Distance */}
            <Stack gap="xs">
              <Title order={5}>Distance & rates</Title>

              <Group grow>
                <TextInput
                  label="Distance to venue (km)"
                  value={
                    form.distance_km !== null &&
                    form.distance_km !== undefined
                      ? String(form.distance_km)
                      : ""
                  }
                  onChange={(e) =>
                    updateField(
                      "distance_km",
                      e.currentTarget.value === ""
                        ? null
                        : Number(e.currentTarget.value)
                    )
                  }
                />

                <TextInput
                  label="Distance band"
                  value={
                    form.distance_band != null
                      ? `Band ${form.distance_band}`
                      : ""
                  }
                  disabled
                />
              </Group>

              <Group grow>
                <TextInput
                  label="Standard rate (€)"
                  value={
                    form.rate_standard_eur != null
                      ? String(form.rate_standard_eur)
                      : ""
                  }
                  disabled
                />
                <TextInput
                  label="Green rate (€)"
                  value={
                    form.rate_green_eur != null
                      ? String(form.rate_green_eur)
                      : ""
                  }
                  disabled
                />
              </Group>

              <Text size="xs" c="dimmed">
                Rates are calculated automatically based on the distance.
              </Text>
            </Stack>

            {/* Bank */}
            <Stack gap="xs">
              <Title order={5}>Bank information</Title>

              <TextInput
                label="Account holder"
                value={form.account_holder || ""}
                onChange={(e) =>
                  updateField("account_holder", e.currentTarget.value)
                }
              />

              <Group grow>
                <TextInput
                  label="IBAN"
                  value={form.iban || ""}
                  onChange={(e) => updateField("iban", e.currentTarget.value)}
                />
                <TextInput
                  label="BIC"
                  value={form.bic || ""}
                  onChange={(e) => updateField("bic", e.currentTarget.value)}
                />
              </Group>
            </Stack>

            {error && (
              <Text size="sm" c="red">
                {error}
              </Text>
            )}

            <Group justify="flex-end">
              <Button
                onClick={saveChanges}
                loading={saving}
                disabled={saving}
              >
                Save changes
              </Button>
            </Group>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}

