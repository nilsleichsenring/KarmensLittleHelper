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

import { generatePdf } from "../../../../lib/pdf/pdfEngine";
import { renderAdminSubmission } from "../../../../lib/pdf/renderers/adminSubmission";

/* =========================================================
   BADGE LOGIC
========================================================= */

type SubmissionBadge = {
  key: string;
  label: string;
  color: "gray" | "green" | "yellow" | "blue" | "red";
};

function getSubmissionBadges(
  submission: SubmissionSummary,
  partnerOrg: ProjectPartnerOrg | null,
  opts?: { showDistanceBadge?: boolean }
): SubmissionBadge[] {
  const badges: SubmissionBadge[] = [];
  const showDistanceBadge = opts?.showDistanceBadge ?? true;

  // 1️⃣ Distance missing → highest priority (only if enabled)
  if (showDistanceBadge && (!partnerOrg || partnerOrg.distance_km == null)) {
    badges.push({
      key: "needs-distance",
      label: "Needs distance entry",
      color: "red",
    });
    return badges;
  }

  // 2️⃣ Claim status
  if (submission.claim_status === "approved") {
    badges.push({
      key: "approved",
      label: "Approved as claimed",
      color: "green",
    });
  }

  if (submission.claim_status === "adjusted") {
    badges.push({
      key: "adjusted",
      label: "Adjusted & approved",
      color: "yellow",
    });
  }

  if (submission.claim_status === "open") {
    badges.push({
      key: "open",
      label: "Needs review",
      color: "gray",
    });
  }

  if (submission.claim_status === "rejected") {
    badges.push({
      key: "rejected",
      label: "Rejected",
      color: "red",
    });
  }

  return badges;
}

/* =========================================================
   HELPERS
========================================================= */

type TabKey = "pending" | "approved" | "rejected" | "abandoned";

function classifySubmission(
  submission: SubmissionSummary,
  partnerOrg: ProjectPartnerOrg | null
): TabKey {
  // Abandoned: submitted = false
  if (!submission.submitted) return "abandoned";

  // Pending: submitted true AND (distance missing OR needs review)
  const needsDistance = !partnerOrg || partnerOrg.distance_km == null;
  if (needsDistance) return "pending";
  if (submission.claim_status === "open") return "pending";

  // Approved
  if (
    submission.claim_status === "approved" ||
    submission.claim_status === "adjusted"
  ) {
    return "approved";
  }

  // Rejected
  if (submission.claim_status === "rejected") return "rejected";

  // Fallback (should not happen with your allowed statuses)
  return "pending";
}

async function hardDeleteSubmission(submissionId: string) {
  // 1) ticket_participants
  const { error: tpErr } = await supabase
    .from("ticket_participants")
    .delete()
    .eq("project_partner_submission_id", submissionId);

  // If your schema doesn't have project_partner_submission_id on ticket_participants,
  // you can swap this to:
  // - load ticket ids first, then delete .in("ticket_id", ticketIds)
  if (tpErr) throw tpErr;

  // 2) tickets
  const { error: ticketsErr } = await supabase
    .from("tickets")
    .delete()
    .eq("project_partner_submission_id", submissionId);
  if (ticketsErr) throw ticketsErr;

  // 3) participants
  const { error: participantsErr } = await supabase
    .from("participants")
    .delete()
    .eq("project_partner_submission_id", submissionId);
  if (participantsErr) throw participantsErr;

  // 4) submission
  const { error: subErr } = await supabase
    .from("project_partner_submissions")
    .delete()
    .eq("id", submissionId);
  if (subErr) throw subErr;
}

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
};

export function SubmissionsTab({
  project,
  submissions,
  loading,
  getCountryLabel,
  onOpenSubmission,
}: Props) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [partnerOrgs, setPartnerOrgs] = useState<ProjectPartnerOrg[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  // Local copy so we can remove deleted items without requiring parent refetch
  const [localSubmissions, setLocalSubmissions] =
    useState<SubmissionSummary[]>(submissions);

  useEffect(() => {
    setLocalSubmissions(submissions);
  }, [submissions]);

  // Delete modal state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SubmissionSummary | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /* ---------------------------------------------------------
     Load Partner Organisations (SOURCE OF TRUTH)
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
  }, [project.id]);

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
      await hardDeleteSubmission(deleteTarget.id);

      // Remove locally
      setLocalSubmissions((prev) => prev.filter((s) => s.id !== deleteTarget.id));

      setDeleteOpen(false);
      setDeleteTarget(null);
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
    const result: Record<TabKey, SubmissionSummary[]> = {
      pending: [],
      approved: [],
      rejected: [],
      abandoned: [],
    };

    for (const s of localSubmissions) {
      const partnerOrg = getPartnerOrgForSubmission(s);
      const key = classifySubmission(s, partnerOrg);
      result[key].push(s);
    }

    return result;
  }, [localSubmissions, partnerOrgs]);

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
    const badges = getSubmissionBadges(s, partnerOrg, { showDistanceBadge });

    const canDownloadPdf = tabKey === "pending" || tabKey === "approved";

    // IMPORTANT: per your rule, submitted=true is never deletable.
    // So in practice:
    // - Abandoned (submitted=false) deletable ✅
    // - Rejected (submitted=true) NOT deletable (yet) ❌
    // If you later allow rejected deletion even when submitted=true, we’ll change here.
    const canDeleteByRules = tabKey === "abandoned";

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
          {/* Header */}
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

              {/* Payment status (ALL tabs) */}
              {s.payment_status === "paid" ? (
                <Badge color="green" variant="light">
                  Paid{" "}
                  {s.payment_paid_at
                    ? `(${new Date(s.payment_paid_at).toLocaleDateString()})`
                    : ""}
                </Badge>
              ) : (
                <Badge color="gray" variant="light">
                  Not paid
                </Badge>
              )}
            </Stack>
          </Group>

          <Divider />

          {/* Summary */}
          <Group gap="md">
            <Badge variant="outline">{s.participantCount} participants</Badge>
            <Badge variant="outline">{s.ticketCount} tickets</Badge>
            <Badge variant="outline">EUR total: {s.totalEur.toFixed(2)}</Badge>
          </Group>

          <Divider />

          {/* Actions */}
          <Group justify="flex-end" gap="sm">
            <Button size="xs" variant="light" onClick={() => onOpenSubmission(s)}>
              View details
            </Button>

            {canDownloadPdf && (
              <Button
                size="xs"
                variant="outline"
                loading={downloadingId === s.id}
                onClick={() => handleDownload(s)}
              >
                {downloadingId === s.id ? "Generating…" : "Download admin PDF"}
              </Button>
            )}

            {(tabKey === "pending" || tabKey === "approved") &&
              (s.claim_status === "approved" || s.claim_status === "adjusted") &&
              s.payment_status !== "paid" && (
                <Button
                  size="xs"
                  color="green"
                  onClick={async () => {
                    const now = new Date().toISOString();

                    await supabase
                      .from("project_partner_submissions")
                      .update({
                        payment_status: "paid",
                        payment_paid_at: now,
                      })
                      .eq("id", s.id);

                    // Update locally (immutable)
                    setLocalSubmissions((prev) =>
                      prev.map((x) =>
                        x.id === s.id
                          ? { ...x, payment_status: "paid", payment_paid_at: now }
                          : x
                      )
                    );
                  }}
                >
                  Mark as instructed & paid
                </Button>
              )}

            {(tabKey === "pending" || tabKey === "approved") &&
              s.payment_status === "paid" && (
                <Button
                  size="xs"
                  variant="subtle"
                  color="red"
                  onClick={async () => {
                    await supabase
                      .from("project_partner_submissions")
                      .update({
                        payment_status: "unpaid",
                        payment_paid_at: null,
                      })
                      .eq("id", s.id);

                    setLocalSubmissions((prev) =>
                      prev.map((x) =>
                        x.id === s.id
                          ? { ...x, payment_status: "unpaid", payment_paid_at: null }
                          : x
                      )
                    );
                  }}
                >
                  Undo payment
                </Button>
              )}

            {/* Delete (by your current strict rule: only submitted=false) */}
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

  /* ---------------------------------------------------------
     Render tab content
  --------------------------------------------------------- */
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

  /* ---------------------------------------------------------
     RENDER
  --------------------------------------------------------- */
  return (
    <>
      {/* Delete confirm modal */}
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

        {/* Nested tabs */}
        <Tabs defaultValue="pending" maw={700} w="100%">
          <Tabs.List>
            <Tabs.Tab value="pending">
              Pending ({grouped.pending.length})
            </Tabs.Tab>
            <Tabs.Tab value="approved">
              Approved ({grouped.approved.length})
            </Tabs.Tab>
            <Tabs.Tab value="rejected">
              Rejected ({grouped.rejected.length})
            </Tabs.Tab>
            <Tabs.Tab value="abandoned">
              Abandoned ({grouped.abandoned.length})
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="pending" pt="md">
            <RenderTabList items={grouped.pending} />
          </Tabs.Panel>

          <Tabs.Panel value="approved" pt="md">
            <RenderTabList items={grouped.approved} />
          </Tabs.Panel>

          <Tabs.Panel value="rejected" pt="md">
            <RenderTabList items={grouped.rejected} />
          </Tabs.Panel>

          <Tabs.Panel value="abandoned" pt="md">
            <RenderTabList items={grouped.abandoned} />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </>
  );
}
