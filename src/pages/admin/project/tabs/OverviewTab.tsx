// src/pages/admin/project/tabs/OverviewTab.tsx

import { Card, Stack, Text, Group, Button, Badge } from "@mantine/core";
import type { Project, ProjectCountry } from "../types";

// NEU: SVG-Flaggen
import CountryFlag from "../../../../components/CountryFlag";

type Props = {
  project: Project;
  formatDateRange: (start: string | null, end: string | null) => string;

  projectCountries: ProjectCountry[];
  hostCountryCode: string | null;
  hostOrganisationName: string;
  getCountryLabel: (code: string | null) => string;
};

export function OverviewTab({
  project,
  formatDateRange,
  projectCountries,
  hostCountryCode,
  hostOrganisationName,
  getCountryLabel,
}: Props) {
  const inviteLink = `${window.location.origin}/p/${project.id}`;

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
              {hostCountryCode && (
                <span style={{ opacity: 0.6 }}>({hostCountryCode})</span>
              )}
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

              {/* Host participates (but without duplicate bug) */}
              {!projectCountries.some((c) => c.country_code === hostCountryCode) &&
                hostCountryCode && (
                  <CountryFlag code={hostCountryCode} size={22} />
                )}
            </Group>
          )}
        </Stack>

        {/* ---------------------------------------------
            PROJECT TYPE
        --------------------------------------------- */}
        <Group>
          <Text fw={600}>Project type:</Text>
          <Badge variant="light">
            {project.project_type || "Not set"}
          </Badge>
        </Group>

        {/* ---------------------------------------------
            DATES
        --------------------------------------------- */}
        <Text>
          <strong>Dates:</strong>{" "}
          {formatDateRange(project.start_date, project.end_date)}
        </Text>

        {/* ---------------------------------------------
            DESCRIPTION
        --------------------------------------------- */}
        {project.description && (
          <Text>
            <strong>Description:</strong> {project.description}
          </Text>
        )}

        {/* ---------------------------------------------
            INTERNAL NOTES
        --------------------------------------------- */}
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

            <Button
              variant="light"
              onClick={() => navigator.clipboard.writeText(inviteLink)}
            >
              Copy
            </Button>
          </Group>
        </Stack>
      </Stack>
    </Card>
  );
}

export default OverviewTab;
