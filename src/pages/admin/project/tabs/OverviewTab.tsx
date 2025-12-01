// src/pages/admin/project/tabs/OverviewTab.tsx

import { Card, Stack, Text, Group, Button, Badge, TextInput } from "@mantine/core";
import { useState } from "react";
import type { Project, ProjectCountry } from "../types";

import CountryFlag from "../../../../components/CountryFlag";

type Props = {
  project: Project;
  formatDateRange: (start: string | null, end: string | null) => string;

  projectCountries: ProjectCountry[];
  hostCountryCode: string | null;
  hostOrganisationName: string;

  onUpdateReference: (newRef: string) => Promise<void>;
};

export function OverviewTab({
  project,
  formatDateRange,
  projectCountries,
  hostCountryCode,
  hostOrganisationName,
  onUpdateReference,
}: Props) {
  const inviteLink = `${window.location.origin}/p/${project.id}`;

  // ---------------------------------------------
  // Reference number edit state
  // ---------------------------------------------
  const [editingRef, setEditingRef] = useState(false);
  const [refInput, setRefInput] = useState(project.project_reference ?? "");
  const [savingRef, setSavingRef] = useState(false);

  async function handleSaveRef() {
    setSavingRef(true);
    await onUpdateReference(refInput.trim());
    setSavingRef(false);
    setEditingRef(false);
  }

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="lg">

        {/* ---------------------------------------------
              HOST INFORMATION
        --------------------------------------------- */}
        <Stack gap={4}>
          <Text fw={600}>Project-Host</Text>

          <Group gap={8} align="center">
            <CountryFlag code={hostCountryCode} size={20} />
            <Text>
              {hostOrganisationName}{" "}
              {hostCountryCode && <span style={{ opacity: 0.6 }}>({hostCountryCode})</span>}
            </Text>
          </Group>
        </Stack>

        {/* ---------------------------------------------
              PARTICIPATING COUNTRIES
        --------------------------------------------- */}
        <Stack gap={4}>
          <Text fw={600}>Participating countries</Text>

          {projectCountries.length === 0 ? (
            <Text c="dimmed">No countries added</Text>
          ) : (
            <Group gap="sm">
              {projectCountries.map((c) => (
                <CountryFlag key={c.id} code={c.country_code} size={22} />
              ))}

              {!projectCountries.some((c) => c.country_code === hostCountryCode) &&
                hostCountryCode && <CountryFlag code={hostCountryCode} size={22} />}
            </Group>
          )}
        </Stack>

        {/* ---------------------------------------------
              PROJECT TYPE
        --------------------------------------------- */}
        <Group>
          <Text fw={600}>Project type:</Text>
          <Badge variant="light">{project.project_type || "Not set"}</Badge>
        </Group>

        {/* ---------------------------------------------
              PROJECT REFERENCE NUMBER (editable)
        --------------------------------------------- */}
        <Stack gap={4}>
          <Text fw={600}>Reference number:</Text>

          {editingRef ? (
            <Group align="flex-end">
              <TextInput
                placeholder="e.g. 2024-1-DE04-KA152-xxxxxx"
                value={refInput}
                onChange={(e) => setRefInput(e.currentTarget.value)}
                style={{ flex: 1 }}
              />

              <Button
                onClick={handleSaveRef}
                loading={savingRef}
                variant="light"
              >
                Save
              </Button>

              <Button
                variant="subtle"
                color="red"
                onClick={() => {
                  setRefInput(project.project_reference ?? "");
                  setEditingRef(false);
                }}
              >
                Cancel
              </Button>
            </Group>
          ) : (
            <Group>
              <Text>
                {project.project_reference || (
                  <span style={{ opacity: 0.6 }}>Not set</span>
                )}
              </Text>

              <Button
                variant="subtle"
                size="xs"
                onClick={() => setEditingRef(true)}
              >
                Edit
              </Button>
            </Group>
          )}
        </Stack>

        {/* ---------------------------------------------
              DATES
        --------------------------------------------- */}
        <Text>
          <strong>Dates:</strong> {formatDateRange(project.start_date, project.end_date)}
        </Text>

        {/* DESCRIPTION */}
        {project.description && (
          <Text>
            <strong>Description:</strong> {project.description}
          </Text>
        )}

        {/* INTERNAL NOTES */}
        {project.internal_notes && (
          <Text c="dimmed">
            <strong>Internal notes:</strong> {project.internal_notes}
          </Text>
        )}

        {/* ---------------------------------------------
              INVITE LINK
        --------------------------------------------- */}
        <Stack gap={4}>
          <Text fw={600}>Invitation link</Text>

          <Text size="sm" c="dimmed">
            Share this link with your partner organisations:
          </Text>

          <Group justify="space-between">
            <Text
              size="sm"
              style={{
                background: "#f5f5f5",
                padding: "6px 10px",
                borderRadius: "4px",
                fontFamily: "monospace",
                wordBreak: "break-all",
              }}
            >
              {inviteLink}
            </Text>

            <Button variant="light" onClick={() => navigator.clipboard.writeText(inviteLink)}>
              Copy
            </Button>
          </Group>
        </Stack>
      </Stack>
    </Card>
  );
}

export default OverviewTab;
