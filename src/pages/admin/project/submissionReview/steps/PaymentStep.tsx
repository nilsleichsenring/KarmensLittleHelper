// src/pages/admin/project/submissionReview/steps/PaymentStep.tsx

import { Card, Stack, Text, Button, Badge, Group } from "@mantine/core";
import type { SubmissionSummary } from "../../types";

type Props = {
  submission: SubmissionSummary;

  amountToPay: number;

  isPaid: boolean;
  paidAt: string | null;

  onMarkAsPaid: () => Promise<void>;
  onUndoPayment: () => Promise<void>;
};

export default function PaymentStep({
  amountToPay,
  isPaid,
  paidAt,
  onMarkAsPaid,
  onUndoPayment,
}: Props) {
  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="md">
        <Text fw={700}>Payment</Text>

        {/* Amount */}
        <Stack gap={2}>
          <Text size="sm" c="dimmed">
            Amount to pay
          </Text>
          <Text size="xl" fw={700}>
            {amountToPay.toFixed(2)} €
          </Text>
        </Stack>

        {/* Status */}
        <Group gap="sm">
          {isPaid ? (
            <Badge color="green" variant="light">
              Paid {paidAt ? `(${new Date(paidAt).toLocaleDateString()})` : ""}
            </Badge>
          ) : (
            <Badge color="gray" variant="light">
              Not paid
            </Badge>
          )}
        </Group>

        {/* Actions */}
        <Group justify="flex-end">
          {!isPaid && (
            <Button color="green" onClick={onMarkAsPaid}>
              Mark as paid
            </Button>
          )}

          {isPaid && (
            <Button color="red" variant="outline" onClick={onUndoPayment}>
              Undo payment
            </Button>
          )}
        </Group>
      </Stack>
    </Card>
  );
}
