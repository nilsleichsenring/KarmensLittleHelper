import { Box, Group, Text, UnstyledButton } from "@mantine/core";

export type StepNavigationStatus =
  | "active"
  | "completed"
  | "available"
  | "locked"
  | "pending";

export type StepNavigationItem<TStepKey extends string> = {
  key: TStepKey;
  label: string;
  status: StepNavigationStatus;
};

type Props<TStepKey extends string> = {
  steps: StepNavigationItem<TStepKey>[];
  onStepClick: (stepKey: TStepKey) => void;
};

function getCircleStyles(status: StepNavigationStatus) {
  switch (status) {
    case "active":
      return {
        background: "#228be6",
        border: "2px solid transparent",
        color: "white",
      };

    case "completed":
      return {
        background: "#40c057",
        border: "2px solid transparent",
        color: "white",
      };

    case "available":
      return {
        background: "#e7f5ff",
        border: "2px solid #4dabf7",
        color: "#1971c2",
      };

    case "locked":
      return {
        background: "#dee2e6",
        border: "2px solid transparent",
        color: "#495057",
      };

    case "pending":
    default:
      return {
        background: "#dee2e6",
        border: "2px solid transparent",
        color: "#495057",
      };
  }
}

function getTextColor(status: StepNavigationStatus) {
  if (status === "active" || status === "available") return "blue";
  if (status === "completed") return "dark";
  return "dimmed";
}

export default function StepNavigation<TStepKey extends string>({
  steps,
  onStepClick,
}: Props<TStepKey>) {
  return (
    <Group gap="md">
      {steps.map((step, index) => {
        const isLocked = step.status === "locked";
        const isActive = step.status === "active";
        const circleStyles = getCircleStyles(step.status);

        return (
          <UnstyledButton
            key={step.key}
            disabled={isLocked}
            onClick={() => {
              if (!isLocked) {
                onStepClick(step.key);
              }
            }}
          >
            <Group
              gap={6}
              wrap="nowrap"
              style={{
                cursor: isLocked ? "not-allowed" : "pointer",
                opacity: isLocked ? 0.45 : 1,
              }}
            >
              <Box
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 600,
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                  ...circleStyles,
                }}
              >
                {index + 1}
              </Box>

              <Text
                size="sm"
                fw={isActive ? 600 : 400}
                c={getTextColor(step.status)}
                style={{ whiteSpace: "nowrap" }}
              >
                {step.label}
              </Text>
            </Group>
          </UnstyledButton>
        );
      })}
    </Group>
  );
}