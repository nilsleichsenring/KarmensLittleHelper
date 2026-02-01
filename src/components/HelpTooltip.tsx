import { Tooltip, ActionIcon, type TooltipProps } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

type HelpTooltipProps = {
  label: string;

  /** Optional width override (default = 260) */
  width?: number;

  /** Optional icon size override */
  iconSize?: number;

  /** Optional Mantine Tooltip props passthrough */
  tooltipProps?: Partial<TooltipProps>;
};

export function HelpTooltip({
  label,
  width = 260,
  iconSize = 16,
  tooltipProps,
}: HelpTooltipProps) {
  return (
    <Tooltip
      label={label}
      multiline
      w={width}
      withinPortal
      {...tooltipProps}
    >
      <ActionIcon
        variant="subtle"
        size="sm"
        aria-label="Help information"
      >
        <IconInfoCircle size={iconSize} />
      </ActionIcon>
    </Tooltip>
  );
}
