import { type Project } from "../types";
import { Card, Stack, Text, Group, Button, Badge } from "@mantine/core";

type Props = {
  project: Project;
  formatDateRange: (start: string | null, end: string | null) => string;
};

export function OverviewTab({ project, formatDateRange }: Props) {
  const inviteLink = `${window.location.origin}/p/${project.id}`;

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="sm">
        {/* Project type */}
        <Group>
          <Text fw={600}>Project type:</Text>
          <Badge variant="light">
            {project.project_type || "Not set"}
          </Badge>
        </Group>

        {/* Dates */}
        <Text>
          <strong>Dates:</strong>{" "}
          {formatDateRange(project.start_date, project.end_date)}
        </Text>

        {/* Description */}
        {project.description && (
          <Text>
            <strong>Description:</strong> {project.description}
          </Text>
        )}

        {/* Internal notes */}
        {project.internal_notes && (
          <Text c="dimmed">
            <strong>Internal notes:</strong> {project.internal_notes}
          </Text>
        )}

        {/* Invitation link */}
        <Stack gap={4} mt="md">
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
