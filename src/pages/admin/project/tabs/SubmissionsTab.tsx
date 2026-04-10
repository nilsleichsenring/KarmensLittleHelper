// src/pages/admin/project/tabs/SubmissionsTab.tsx

import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  Modal,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";

import type {
  SubmissionSummary,
  Project,
  ProjectCountry,
  Participant,
  Ticket,
  ProjectPartnerOrg,
} from "../types";

import CountryFlag from "../../../../components/CountryFlag";
import { HelpTooltip } from "../../../../components/HelpTooltip";

import { generatePdf } from "../../../../lib/pdf/pdfEngine";
import { renderAdminSubmission } from "../../../../lib/pdf/renderers/adminSubmission";
import { classifySubmission } from "../submissionReview/logic/reviewClassification";
import { getSubmissionBadges } from "../submissionReview/logic/reviewBadges";
import {
  markSubmissionPaid,
  undoSubmissionPayment,
  deleteSubmissionCascade,
} from "../submissionReview/logic/reviewPersistence";

/* =========================================================
   HELPERS (Formatting)
========================================================= */

function formatEur(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Number(value).toFixed(2)} €`;
}

/* =========================================================
   HELPERS
========================================================= */

type TabKey =
  | "pending"
  | "approved"
  | "paid"
  | "rejected"
  | "abandoned"
  | "all";


/* =========================================================
   COMPONENT
========================================================= */

type Props = {
  project: Project;
  countries: ProjectCountry[];
  submissions: SubmissionSummary[];
  loading: boolean;
  getCountryLabel: (code: string | null) => string;
  onOpenSubmission: (submission: SubmissionSummary) => void;
  refreshKey: number;
  preferredTab?: Exclude<TabKey, "all"> | null;
  onPreferredTabApplied?: () => void;
  onRequireRefresh: () => void;
  onDeleteSubmission: (submissionId: string) => void;
  onPaymentUpdated: (
    submissionId: string,
    payload: {
      payment_status: SubmissionSummary["payment_status"];
      payment_paid_at: string | null;
    }
  ) => void;
};

export function SubmissionsTab({
  project,
  submissions,
  loading,
  getCountryLabel,
  onOpenSubmission,
  refreshKey,
  preferredTab,
  onPreferredTabApplied,
  onRequireRefresh,
  onDeleteSubmission,
  onPaymentUpdated,
}: Props) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [partnerOrgs, setPartnerOrgs] = useState<ProjectPartnerOrg[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  const [activeTab, setActiveTab] = useState<TabKey>("pending");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SubmissionSummary | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /* ---------------------------------------------------------
     Sync preferred tab from parent
  --------------------------------------------------------- */
  useEffect(() => {
    if (preferredTab) {
      setActiveTab(preferredTab);
      onPreferredTabApplied?.();
    }
  }, [preferredTab, onPreferredTabApplied]);

  /* ---------------------------------------------------------
     Load Partner Organisations
  --------------------------------------------------------- */
  useEffect(() => {
    let active = true;

    async function loadPartnerOrgs() {
      setLoadingOrgs(true);

      const { data, error } = await supabase
        .from("project_partner_orgs")
        .select("*")
        .eq("project_id", project.id);

      if (!error && active) {
        setPartnerOrgs((data || []) as ProjectPartnerOrg[]);
      }

      if (active) setLoadingOrgs(false);
    }

    loadPartnerOrgs();

    return () => {
      active = false;
    };
  }, [project.id, refreshKey]);

  /* ---------------------------------------------------------
     Helpers
  --------------------------------------------------------- */
  function getPartnerOrgForSubmission(
    submission: SubmissionSummary
  ): ProjectPartnerOrg | null {
    return (
      partnerOrgs.find(
        (o) =>
          o.project_id === submission.project_id &&
          o.organisation_name === submission.organisation_name
      ) ?? null
    );
  }

  /* ---------------------------------------------------------
     PDF DOWNLOAD
  --------------------------------------------------------- */
  async function handleDownload(submission: SubmissionSummary) {
    try {
      setDownloadingId(submission.id);

      const { data: parts } = await supabase
        .from("participants")
        .select("id, full_name, is_green_travel")
        .eq("project_partner_submission_id", submission.id);

      const { data: tix } = await supabase
        .from("tickets")
        .select("id, from_location, to_location, amount_eur")
        .eq("project_partner_submission_id", submission.id);

      const partnerOrg = getPartnerOrgForSubmission(submission);

      await generatePdf(
        renderAdminSubmission,
        {
          submission,
          participants: (parts || []) as Participant[],
          tickets: (tix || []) as Ticket[],
          project,
          rates: {
            standard: partnerOrg?.rate_standard_eur ?? 0,
            green: partnerOrg?.rate_green_eur ?? 0,
          },
        },
        `reimbursement_${submission.organisation_name.replace(/\s+/g, "_")}.pdf`
      );
    } finally {
      setDownloadingId(null);
    }
  }

  /* ---------------------------------------------------------
     Delete
  --------------------------------------------------------- */
  function openDeleteModal(sub: SubmissionSummary) {
    setDeleteError(null);
    setDeleteTarget(sub);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      await deleteSubmissionCascade(deleteTarget.id);
      onDeleteSubmission(deleteTarget.id);
      setDeleteOpen(false);
      setDeleteTarget(null);
      setActiveTab("abandoned");
    } catch (err) {
      console.error(err);
      setDeleteError("Could not delete submission. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  /* ---------------------------------------------------------
     Derived tab lists
  --------------------------------------------------------- */
  const grouped = useMemo(() => {
    const result: Record<Exclude<TabKey, "all">, SubmissionSummary[]> = {
      pending: [],
      approved: [],
      paid: [],
      rejected: [],
      abandoned: [],
    };

    for (const s of submissions) {
      const partnerOrg = getPartnerOrgForSubmission(s);
      const key = classifySubmission(s, partnerOrg);
      result[key].push(s);
    }

    const allOrdered: SubmissionSummary[] = [
      ...result.pending,
      ...result.approved,
      ...result.paid,
      ...result.rejected,
      ...result.abandoned,
    ];

    return {
      ...result,
      all: allOrdered,
    } as Record<TabKey, SubmissionSummary[]>;
  }, [submissions, partnerOrgs]);

  /* ---------------------------------------------------------
     Loading state
  --------------------------------------------------------- */
  if (loading || loadingOrgs) {
    return (
      <Group justify="center" mt="xl">
        <Loader size="lg" />
      </Group>
    );
  }

  /* ---------------------------------------------------------
     Reusable card renderer
  --------------------------------------------------------- */
  function SubmissionCard({ s }: { s: SubmissionSummary }) {
    const partnerOrg = getPartnerOrgForSubmission(s);
    const tabKey = classifySubmission(s, partnerOrg);

    const showDistanceBadge = tabKey === "pending";
    const badges = getSubmissionBadges(s, partnerOrg, {
      showDistanceBadge,
    });

    const canDownloadPdf = tabKey !== "abandoned";
    const canDeleteByRules = tabKey === "abandoned";

    const canMarkPaidBase =
      (tabKey === "approved" || tabKey === "paid") &&
      (s.claim_status === "approved" || s.claim_status === "adjusted") &&
      s.payment_status !== "paid";

    const canUndoPaid =
      (tabKey === "approved" || tabKey === "paid") &&
      s.payment_status === "paid";

    const approvedAmount = s.approved_amount_eur ?? null;
    const hasApprovedAmount =
      approvedAmount != null && Number.isFinite(Number(approvedAmount));
    const isApprovedAmountPositive =
      hasApprovedAmount && Number(approvedAmount) > 0;

    const canMarkPaid =
      canMarkPaidBase && hasApprovedAmount && isApprovedAmountPositive;

    const claimed = Number(s.totalEur ?? 0);
    const diff = hasApprovedAmount ? claimed - Number(approvedAmount) : null;

    const showOverclaimed =
      diff != null && Number.isFinite(diff) && diff > 0.009;

    const showUnderclaimed =
      diff != null && Number.isFinite(diff) && diff < -0.009;

    const paymentTooltipLabel = !hasApprovedAmount
      ? "Cannot mark as paid yet: no approved amount stored. Please complete the decision step first."
      : !isApprovedAmountPositive
      ? "Cannot mark as paid: approved amount is 0.00 €. If this is correct, payment is not required."
      : "Ready for payment based on the stored approved amount.";

    return (
      <Card
        key={s.id}
        withBorder
        radius="md"
        p="lg"
        shadow="sm"
        maw={700}
        w="100%"
      >
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Stack gap={2}>
              <Text fw={600} size="lg">
                {s.organisation_name}
              </Text>
              <Group gap={6}>
                <CountryFlag code={s.country_code} size={18} />
                <Text size="sm" c="dimmed">
                  {getCountryLabel(s.country_code)}
                </Text>
              </Group>
            </Stack>

            <Stack gap={4} align="flex-end">
              {badges.map((b) => (
                <Badge key={b.key} color={b.color} variant="light" size="lg">
                  {b.label}
                </Badge>
              ))}

              {s.payment_status === "paid" ? (
                <Badge color="green" variant="light">
                  Paid{" "}
                  {s.payment_paid_at
                    ? `(${new Date(s.payment_paid_at).toLocaleDateString()})`
                    : ""}
                  {hasApprovedAmount ? ` · ${formatEur(approvedAmount)}` : ""}
                </Badge>
              ) : (
                <Badge color="gray" variant="light">
                  Not paid
                  {hasApprovedAmount ? ` · ${formatEur(approvedAmount)}` : ""}
                </Badge>
              )}
            </Stack>
          </Group>

          <Divider />

          <Group gap="md" wrap="wrap">
            <Badge variant="outline">{s.participantCount} participants</Badge>
            <Badge variant="outline">{s.ticketCount} tickets</Badge>

            <Badge variant="outline">Claimed: {formatEur(claimed)}</Badge>

            {hasApprovedAmount ? (
              <Badge color="green" variant="light">
                Approved: {formatEur(approvedAmount)}
              </Badge>
            ) : (
              <Badge color="gray" variant="light">
                Approved: —
              </Badge>
            )}

            {diff != null && Number.isFinite(diff) && (
              <Badge
                color={
                  showOverclaimed
                    ? "yellow"
                    : showUnderclaimed
                    ? "blue"
                    : "gray"
                }
                variant="light"
              >
                Difference: {formatEur(diff)}
              </Badge>
            )}

            {showOverclaimed && (
              <Badge color="yellow" variant="outline">
                Overclaimed
              </Badge>
            )}
          </Group>

          <Divider />

          <Group justify="flex-end" gap="sm">
            <Button
              size="xs"
              variant="light"
              onClick={() => onOpenSubmission(s)}
            >
              View details
            </Button>

            {canDownloadPdf && (
              <Button
                size="xs"
                variant="outline"
                loading={downloadingId === s.id}
                onClick={() => handleDownload(s)}
              >
                {downloadingId === s.id
                  ? "Generating…"
                  : "Download admin PDF"}
              </Button>
            )}

            {canMarkPaidBase && (
              <Group gap={6}>
                <Button
                  size="xs"
                  color="green"
                  disabled={!canMarkPaid}
                  onClick={async () => {
                    if (!hasApprovedAmount || !isApprovedAmountPositive) return;

                    let result;

                    try {
                      result = await markSubmissionPaid(s.id);
                    } catch (error) {
                      console.error(error);
                      return;
                    }

                    onPaymentUpdated(s.id, result);

                    onRequireRefresh();
                    setActiveTab("paid");
                  }}
                >
                  Mark as instructed & paid
                </Button>

                <HelpTooltip label={paymentTooltipLabel} />
              </Group>
            )}

            {canUndoPaid && (
              <Button
                size="xs"
                variant="subtle"
                color="red"
                onClick={async () => {
                  let result;

                  try {
                    result = await undoSubmissionPayment(s.id);
                  } catch (error) {
                    console.error(error);
                    return;
                  }

                  onPaymentUpdated(s.id, result);

                  onRequireRefresh();
                  setActiveTab("approved");
                }}
              >
                Undo payment
              </Button>
            )}

            {canDeleteByRules && (
              <Button
                size="xs"
                color="red"
                variant="light"
                onClick={() => openDeleteModal(s)}
              >
                Delete
              </Button>
            )}
          </Group>
        </Stack>
      </Card>
    );
  }

  function RenderTabList({ items }: { items: SubmissionSummary[] }) {
    if (items.length === 0) {
      return (
        <Alert color="gray" variant="light" maw={700} w="100%">
          No submissions in this category.
        </Alert>
      );
    }

    return (
      <Stack gap="md" align="center" w="100%">
        {items.map((s) => (
          <SubmissionCard key={s.id} s={s} />
        ))}
      </Stack>
    );
  }

  return (
    <>
      <Modal
        opened={deleteOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteOpen(false);
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        title="Delete submission?"
        centered
      >
        <Stack gap="sm">
          <Text size="sm">
            This will permanently delete the submission and all related data
            (participants, tickets, assignments). This cannot be undone.
          </Text>

          {deleteTarget && (
            <Alert color="yellow" variant="light">
              <Text size="sm" fw={600}>
                {deleteTarget.organisation_name}
              </Text>
              <Text size="sm" c="dimmed">
                Submission ID: {deleteTarget.id}
              </Text>
            </Alert>
          )}

          {deleteError && <Alert color="red">{deleteError}</Alert>}

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                if (!deleting) {
                  setDeleteOpen(false);
                  setDeleteTarget(null);
                  setDeleteError(null);
                }
              }}
            >
              Cancel
            </Button>
            <Button color="red" loading={deleting} onClick={confirmDelete}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Stack gap="xl" align="center">
        <Stack gap="xs" maw={700} w="100%">
          <Title order={3}>Project submissions</Title>
          <Text size="sm" c="dimmed">
            {project.name}
          </Text>
        </Stack>

        <Tabs
          value={activeTab}
          onChange={(value) => setActiveTab((value as TabKey) || "pending")}
          maw={700}
          w="100%"
        >
          <Tabs.List>
            <Tabs.Tab value="pending">
              Pending ({grouped.pending.length})
            </Tabs.Tab>
            <Tabs.Tab value="approved">
              Approved ({grouped.approved.length})
            </Tabs.Tab>
            <Tabs.Tab value="paid">Paid ({grouped.paid.length})</Tabs.Tab>
            <Tabs.Tab value="rejected">
              Rejected ({grouped.rejected.length})
            </Tabs.Tab>
            <Tabs.Tab value="abandoned">
              Abandoned ({grouped.abandoned.length})
            </Tabs.Tab>
            <Tabs.Tab value="all">All ({grouped.all.length})</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="pending" pt="md">
            <RenderTabList items={grouped.pending} />
          </Tabs.Panel>

          <Tabs.Panel value="approved" pt="md">
            <RenderTabList items={grouped.approved} />
          </Tabs.Panel>

          <Tabs.Panel value="paid" pt="md">
            <RenderTabList items={grouped.paid} />
          </Tabs.Panel>

          <Tabs.Panel value="rejected" pt="md">
            <RenderTabList items={grouped.rejected} />
          </Tabs.Panel>

          <Tabs.Panel value="abandoned" pt="md">
            <RenderTabList items={grouped.abandoned} />
          </Tabs.Panel>

          <Tabs.Panel value="all" pt="md">
            <RenderTabList items={grouped.all} />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </>
  );
}