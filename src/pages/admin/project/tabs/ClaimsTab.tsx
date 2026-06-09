// src/pages/admin/project/tabs/ClaimsTab.tsx

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
  ClaimSummary,
  Project,
  ProjectCountry,
  ProjectPartnerOrg,
} from "../types";

import CountryFlag from "../../../../components/CountryFlag";
import { HelpTooltip } from "../../../../components/HelpTooltip";

import { generatePdf } from "../../../../lib/pdf/pdfEngine";
import { renderAdminSubmission } from "../../../../lib/pdf/renderers/adminSubmission";
import { deriveParticipantTravelTypes } from "../../../../lib/travel/travel";
import { classifySubmission } from "../submissionReview/logic/reviewClassification";
import { getClaimBadges } from "../submissionReview/logic/reviewBadges";
import {
  markClaimPaid,
  undoClaimPayment,
  deleteClaimCascade,
} from "../submissionReview/logic/reviewPersistence";

import {
  canMarkClaimPaid,
  canUndoClaimPayment,
  canDeleteClaim,
  isApprovedOrAdjustedClaim,
} from "../../../../lib/claims/claimStateMachine";

import { calculateClaimSummary } from "../submissionReview/logic/reviewCalculations";

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
  submissions: ClaimSummary[];
  loading: boolean;
  getCountryLabel: (code: string | null) => string;
  onOpenClaim: (claim: ClaimSummary) => void;
  refreshKey: number;
  preferredTab?: Exclude<TabKey, "all"> | null;
  onPreferredTabApplied?: () => void;
  onRequireRefresh: () => void;
  onDeleteClaim: (submissionId: string) => void;
  onPaymentUpdated: (
    submissionId: string,
    payload: {
      payment_status: ClaimSummary["payment_status"];
      payment_paid_at: string | null;
    }
  ) => void;
};

export function ClaimsTab({
  project,
  submissions,
  loading,
  getCountryLabel,
  onOpenClaim,
  refreshKey,
  preferredTab,
  onPreferredTabApplied,
  onRequireRefresh,
  onDeleteClaim,
  onPaymentUpdated,
}: Props) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [partnerOrgs, setPartnerOrgs] = useState<ProjectPartnerOrg[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  const [activeTab, setActiveTab] = useState<TabKey>("pending");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClaimSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (preferredTab) {
      setActiveTab(preferredTab);
      onPreferredTabApplied?.();
    }
  }, [preferredTab, onPreferredTabApplied]);

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

  function getPartnerOrgForClaim(
    submission: ClaimSummary
  ): ProjectPartnerOrg | null {
    return (
      partnerOrgs.find(
        (o) =>
          o.project_id === submission.project_id &&
          o.organisation_name === submission.organisation_name
      ) ?? null
    );
  }

  async function handleDownload(claim: ClaimSummary) {
    try {
      setDownloadingId(claim.id);

      const { data: parts } = await supabase
        .from("participants")
        .select("id, full_name")
        .eq("project_partner_submission_id", claim.id);

      const { data: tix } = await supabase
        .from("tickets")
        .select(
          `
          id,
          from_location,
          to_location,
          amount_eur,
          file_url,
          travel_mode,
          review_decision,
          reviewed_at,
          ticket_participants (
            participant: participants (
              id,
              full_name
            )
          )
        `
        )
        .eq("project_partner_submission_id", claim.id);

      const partnerOrg = getPartnerOrgForClaim(claim);

      const rawParticipants = (parts || []) as {
        id: string;
        full_name: string;
      }[];

      const pdfTickets = (tix || []).map((ticket: any) => ({
        id: ticket.id,
        from_location: ticket.from_location,
        to_location: ticket.to_location,
        amount_eur: Number(ticket.amount_eur ?? 0),
        file_url: ticket.file_url ?? null,
        travel_mode: ticket.travel_mode ?? null,
        review_decision: ticket.review_decision ?? null,
        reviewed_at: ticket.reviewed_at ?? null,
        assigned_participants:
          ticket.ticket_participants
            ?.map((row: any) => row.participant?.full_name)
            .filter(Boolean) ?? [],
      }));

      const approvedPdfTickets = pdfTickets.filter(
        (ticket) => ticket.review_decision === "approved"
      );

      const ticketParticipants = approvedPdfTickets.flatMap((ticket) =>
        (tix || [])
          .find((rawTicket: any) => rawTicket.id === ticket.id)
          ?.ticket_participants?.map((row: any) => ({
            ticket_id: ticket.id,
            participant_id: row.participant?.id,
          }))
          .filter((row: any) => Boolean(row.participant_id)) ?? []
      );

      const travelTypesByParticipant = deriveParticipantTravelTypes({
        participants: rawParticipants,
        tickets: approvedPdfTickets,
        ticketParticipants,
      });

      const pdfParticipants = rawParticipants.map((participant) => ({
        id: participant.id,
        full_name: participant.full_name,
        travel_type: travelTypesByParticipant[participant.id],
      }));

        const pdfSummary = calculateClaimSummary({
          participants: rawParticipants,
          tickets: pdfTickets.map((ticket) => ({
          ...ticket,
          project_partner_submission_id: claim.id,
          approved: ticket.review_decision === "approved",
          assigned_participants:
            (tix || [])
              .find((rawTicket: any) => rawTicket.id === ticket.id)
              ?.ticket_participants?.map((row: any) => ({
                id: row.participant?.id,
                full_name: row.participant?.full_name,
              }))
              .filter((participant: any) => participant.id) ?? [],
        })),
        participantTravelTypes: travelTypesByParticipant,
        distanceResult: partnerOrg
          ? {
              distanceKm: partnerOrg.distance_km ?? 0,
              distanceBand: partnerOrg.distance_band ?? 0,
              standardRate: partnerOrg.rate_standard_eur ?? 0,
              greenRate: partnerOrg.rate_green_eur ?? 0,
            }
          : null,
      });

      await generatePdf(
        renderAdminSubmission,
        {
          submission: claim,
          participants: pdfParticipants,
          tickets: pdfTickets,
          summary: pdfSummary,
          project,
          rates: {
            standard: partnerOrg?.rate_standard_eur ?? 0,
            green: partnerOrg?.rate_green_eur ?? 0,
          },
        },
        `reimbursement_${claim.organisation_name.replace(/\s+/g, "_")}.pdf`
      );
    } finally {
      setDownloadingId(null);
    }
  }

  function openDeleteModal(sub: ClaimSummary) {
    setDeleteError(null);
    setDeleteTarget(sub);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      await deleteClaimCascade(deleteTarget.id);
      onDeleteClaim(deleteTarget.id);
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

  const grouped = useMemo(() => {
    const result: Record<Exclude<TabKey, "all">, ClaimSummary[]> = {
      pending: [],
      approved: [],
      paid: [],
      rejected: [],
      abandoned: [],
    };

    for (const s of submissions) {
      const partnerOrg = getPartnerOrgForClaim(s);
      const key = classifySubmission(s, partnerOrg);
      result[key].push(s);
    }

    const allOrdered: ClaimSummary[] = [
      ...result.pending,
      ...result.approved,
      ...result.paid,
      ...result.rejected,
      ...result.abandoned,
    ];

    return {
      ...result,
      all: allOrdered,
    } as Record<TabKey, ClaimSummary[]>;
  }, [submissions, partnerOrgs]);

  if (loading || loadingOrgs) {
    return (
      <Group justify="center" mt="xl">
        <Loader size="lg" />
      </Group>
    );
  }

  function ClaimCard({ s }: { s: ClaimSummary }) {
    const partnerOrg = getPartnerOrgForClaim(s);
    const tabKey = classifySubmission(s, partnerOrg);

    const showDistanceBadge = tabKey === "pending";
    const badges = getClaimBadges(s, partnerOrg, {
      showDistanceBadge,
    });

    const canDownloadPdf = tabKey !== "abandoned";
    const canDeleteByRules = canDeleteClaim({
      submitted: s.submitted,
      claim_status: s.claim_status,
      payment_status: s.payment_status,
    });

    const approvedAmount = s.approved_amount_eur ?? null;
    const hasApprovedAmount =
      approvedAmount != null && Number.isFinite(Number(approvedAmount));
    const isApprovedAmountPositive =
      hasApprovedAmount && Number(approvedAmount) > 0;

    const canMarkPaid = canMarkClaimPaid(s);

    const canMarkPaidBase =
      (tabKey === "approved" || tabKey === "paid") &&
      isApprovedOrAdjustedClaim(s) &&
      s.payment_status !== "paid";

    const canUndoPaid =
      (tabKey === "approved" || tabKey === "paid") &&
      canUndoClaimPayment(s);

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
            <Button size="xs" variant="light" onClick={() => onOpenClaim(s)}>
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
                    if (!canMarkPaid) return;

                    let result;

                    try {
                      result = await markClaimPaid(s.id);
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
                    result = await undoClaimPayment(s.id);
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

  function RenderTabList({ items }: { items: ClaimSummary[] }) {
    if (items.length === 0) {
      return (
        <Alert color="gray" variant="light" maw={700} w="100%">
          No claims in this category.
        </Alert>
      );
    }

    return (
      <Stack gap="md" align="center" w="100%">
        {items.map((s) => (
          <ClaimCard key={s.id} s={s} />
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
        title="Delete claim?"
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
                Claim ID: {deleteTarget.id}
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
          <Title order={3}>Project claims</Title>
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