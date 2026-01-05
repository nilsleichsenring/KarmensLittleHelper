// src/pages/admin/project/components/SubmissionDetailsModal.tsx

import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "../../../../lib/supabaseClient";

import {
  Accordion,
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";

import { applyDistanceUpdate } from "../../../../lib/travel/applyDistanceUpdate";
import { getTravelModeIcon } from "../../../../lib/travel/travelIcons";

import {
  deriveParticipantTravelTypes,
} from "../../../../lib/travel/travel";

import type {
  SubmissionSummary,
  Participant,
  Ticket,
  Project,
  ProjectCountry,
} from "../types";

import CountryFlag from "../../../../components/CountryFlag";
import { openTicketFile } from "../../../../lib/tickets/openTicketFile";


type AdminTicket = Ticket & {
  assigned_participants?: {
    id: string;
    full_name: string;
  }[];
};

type Props = {
  opened: boolean;
  onClose: () => void;

  submission: SubmissionSummary | null;
  participants: Participant[];
  tickets: AdminTicket[];

  getCountryLabel: (code: string | null) => string;

  project: Project;
  countries: ProjectCountry[];

  onReviewComplete: (
    submissionId: string,
    payload: {
      reviewed_at: string;
      claim_status: "approved" | "adjusted" | "rejected";
    }
  ) => void;
};

type SubmissionStatusBadge =
  | "open"
  | "needs_distance"
  | "approved_as_claimed"
  | "adjusted_approved"
  | "rejected";

type PaymentBadge = "unpaid" | "paid";

type TicketReviewState = {
  reviewed: boolean;
  decision: "approved" | "rejected" | null;
};



function SectionCard({
  title,
  children,
  disabled,
}: {
  title: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <Card
      withBorder
      radius="md"
      p="lg"
      style={{
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? "none" : "auto",
      }}
    >
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Text fw={700}>{title}</Text>
        </Group>

        <Divider />

        {children}
      </Stack>
    </Card>
  );
}

function AddressBlock({
  label,
  line1,
  line2,
  postalCode,
  city,
  region,
}: {
  label: string;
  line1?: string | null;
  line2?: string | null;
  postalCode?: string | null;
  city?: string | null;
  region?: string | null;
}) {
  const hasAny = line1 || line2 || postalCode || city || region;

  return (
    <Stack gap={4}>
      <Text fw={600} size="sm">
        {label}
      </Text>

      {hasAny ? (
        <Stack gap={0} pl="xs">
          {line1 && <Text size="sm">{line1}</Text>}
          {line2 && <Text size="sm">{line2}</Text>}
          {(postalCode || city) && (
            <Text size="sm">
              {(postalCode || "").trim()} {(city || "").trim()}
            </Text>
          )}
          {region && <Text size="sm">{region}</Text>}
        </Stack>
      ) : (
        <Text size="sm" c="dimmed">
          —
        </Text>
      )}
    </Stack>
  );
}

export default function SubmissionDetailsModal({
  opened,
  onClose,
  submission,
  participants,
  tickets,
  getCountryLabel,
  project,
  countries,
  onReviewComplete,
}: Props) {

  // ---------------------------------------------------------------------------
  // Claim persistence helpers (admin decision)
  // ---------------------------------------------------------------------------
  async function persistClaimDecision(params: {
    status: "approved" | "adjusted" | "rejected";
    approvedAmountEur: number;
  }) {
    const { status, approvedAmountEur } = params;

    const { error } = await supabase
      .from("project_partner_submissions")
      .update({
        claim_status: status,
        approved_amount_eur: approvedAmountEur,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", submission!.id);

    if (error) {
      console.error("Failed to persist claim decision", error);
      throw error;
    }

    onReviewComplete?.(submission!.id, {
      reviewed_at: new Date().toISOString(),
      claim_status: status,
    });
  }

  // ---------------------------------------------------------------------------
  // IMPORTANT: This is ONLY the visual + semantic skeleton (no real logic).
  // ---------------------------------------------------------------------------

  // Keep modal shell stable
  if (!submission) {
    return (
      <Modal opened={opened} onClose={onClose} centered title="Submission">
        <Text c="dimmed">Loading…</Text>
      </Modal>
    );
  }


      // 🔹 K-2.2 — Ticket review state (local, admin-only)
      const [ticketReviewState, setTicketReviewState] = useState<
        Record<string, TicketReviewState>
      >({});

      /* ---------------------------------------------
        Claiming organisation details (read-only)
      --------------------------------------------- */
      const [orgDetails, setOrgDetails] = useState<{
        address_line1: string | null;
        address_line2: string | null;
        address_postal_code: string | null;
        address_city: string | null;
        address_region: string | null;
        contact_name: string | null;
        contact_email: string | null;
      } | null>(null);

      useEffect(() => {
        if (!tickets || tickets.length === 0) {
          setTicketReviewState({});
          return;
        }

        const initialState: Record<string, TicketReviewState> = {};

        tickets.forEach((t) => {
          initialState[t.id] = {
            reviewed: false,
            decision: null,
          };
        });


        setTicketReviewState(initialState);
      }, [tickets]);

      /* ---------------------------------------------
        Load claiming organisation details
      --------------------------------------------- */
      useEffect(() => {
        if (!submission?.id) return;

        supabase
          .from("project_partner_submissions")
          .select(`
            address_line1,
            address_line2,
            address_postal_code,
            address_city,
            address_region,
            contact_name,
            contact_email
          `)
          .eq("id", submission.id)
          .single()
          .then(({ data, error }) => {
            if (error) {
              console.error("Failed to load organisation details", error);
              return;
            }

            setOrgDetails(data);
          });
      }, [submission?.id]);


      // 🔹 K-2.6 — Decision button visibility (derived from ticket review state)

      const ticketStates = Object.values(ticketReviewState);

      const allTicketsReviewed =
        ticketStates.length > 0 &&
        ticketStates.every((s) => s.reviewed === true);

      const allTicketsDecided =
        ticketStates.length > 0 &&
        ticketStates.every(
          (s) => s.reviewed && (s.decision === "approved" || s.decision === "rejected")
        );

      const undecidedTicketsCount = ticketStates.filter(
        (s) => s.decision === null
      ).length;

      // 🔹 K-3.3.1 — Approved amount (derived from reviewed & approved tickets)

      const approvedAmount = tickets.reduce((sum, t) => {
        const state = ticketReviewState[t.id];

        if (!state || !state.reviewed || state.decision !== "approved") {
          return sum;
        }

        return sum + (t.amount_eur ?? 0);
      }, 0);


  // ---------------------------------------------------------------------------
  // Minimal derived state (so TS comparisons are valid)
  // ---------------------------------------------------------------------------

  // Distance is stored on project_partner_orgs (per project + organisation)
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [distanceInput, setDistanceInput] = useState<string>("");

  // --------------------------------------------------
  // Derived distance preview (input OR persisted value)
  // --------------------------------------------------
  const previewDistanceKm =
    distanceInput.trim() !== ""
      ? Number(distanceInput)
      : distanceKm;

  const distancePreview =
    previewDistanceKm !== null &&
    Number.isFinite(previewDistanceKm) &&
    previewDistanceKm >= 0
      ? applyDistanceUpdate(previewDistanceKm)
      : null;

  const [loadingDistance, setLoadingDistance] = useState<boolean>(true);

  const submissionProjectId = submission.project_id;
  const submissionOrgName = submission.organisation_name;

  useEffect(() => {
    let active = true;

    async function loadDistance() {
      setLoadingDistance(true);

      const { data, error } = await supabase
        .from("project_partner_orgs")
        .select("distance_km")
        .eq("project_id", submissionProjectId)
        .eq("organisation_name", submissionOrgName)
        .maybeSingle();


      if (!active) return;

      if (error) {
        console.error(error);
        // If we can't read distance, behave safely: lock review
        setDistanceKm(null);
        setLoadingDistance(false);
        return;
      }

      const km = data?.distance_km ?? null;

      setDistanceKm(km);
      setDistanceInput(km !== null ? String(km) : "");

      setLoadingDistance(false);
    }

    loadDistance();
    return () => {
      active = false;
    };
    }, [submissionProjectId, submissionOrgName]);

    // --------------------------------------------------
    // Save distance (admin action)
    // --------------------------------------------------
    async function saveDistance() {
      const parsed =
        distanceInput.trim() === "" ? null : Number(distanceInput);

      if (parsed === null) return;
      if (!Number.isFinite(parsed) || parsed < 0) {
        // später: Error State
        return;
      }

      try {
      // 1️⃣ reine Berechnung (keine DB!)
      const distanceUpdate = applyDistanceUpdate(parsed);

      // 2️⃣ persistieren
      const { error } = await supabase
        .from("project_partner_orgs")
        .update({
          distance_km: distanceUpdate.distance_km,
          distance_band: distanceUpdate.distance_band,
          rate_standard_eur: distanceUpdate.rate_standard_eur,
          rate_green_eur: distanceUpdate.rate_green_eur,
        })
        .eq("project_id", submissionProjectId)
        .eq("organisation_name", submissionOrgName);

      if (error) {
        console.error(error);
        return;
      }

      // 3️⃣ Modal sofort freischalten
      setDistanceKm(distanceUpdate.distance_km);
      setDistanceInput(String(distanceUpdate.distance_km));

      } catch (err) {
        console.error(err);
      }
    }

    const needsDistanceEntry =
      loadingDistance || distanceKm === null;

    const submissionStatusBadge: SubmissionStatusBadge = (() => {
    if (needsDistanceEntry) return "needs_distance";

    // claim_status currently: "open" | "approved" | "adjusted" (and later maybe "rejected")
    if (submission.claim_status === "approved") return "approved_as_claimed";
    if (submission.claim_status === "adjusted") return "adjusted_approved";

    // If/when you extend ClaimStatus with "rejected" later, this will kick in.
    if ((submission.claim_status as string) === "rejected") return "rejected";

    return "open";
  })();

  const paymentBadge: PaymentBadge =
    submission.payment_status === "paid" ? "paid" : "unpaid";

  // Lock everything except “Claimed” facts when distance is missing
  const isLockedForMissingDistance = submissionStatusBadge === "needs_distance";

  // ---------------------------------------------------------------------------
  // TICKET ↔ PARTICIPANT JOIN (UI-level, no business logic)
  // ---------------------------------------------------------------------------
  const ticketParticipants = tickets.flatMap((t) =>
    t.assigned_participants?.map((p) => ({
      ticket_id: t.id,
      participant_id: p.id,
    })) ?? []
  );

  // ---------------------------------------------------------------------------
  // TRAVEL TYPE DERIVATION (single source of truth: travel.ts)
  // ---------------------------------------------------------------------------
  const participantTravelTypes = deriveParticipantTravelTypes({
    participants,
    tickets,
    ticketParticipants,
  });

  /* ------------------------------------------------------------------
    SECTION 5 / 6 eligibility gating + computed values
  ------------------------------------------------------------------ */

  // Financial sections (eligibility, comparison, decision) are only active
  // when distance exists AND all tickets were decided
  const isFinancialReviewUnlocked =
    !needsDistanceEntry && allTicketsDecided;


  // We can only calculate eligible amounts if we have rates (distancePreview)
  const DISTANCE_BAND_RANGES: Record<number, string> = {
    1: "10–99 km",
    2: "100–499 km",
    3: "500–1999 km",
    4: "2000–2999 km",
    5: "3000–3999 km",
    6: "4000–7999 km",
    7: "8000+ km",
  };

  const distanceBandLabel =
    distancePreview?.distance_band != null
      ? `Band ${distancePreview.distance_band} (${DISTANCE_BAND_RANGES[distancePreview.distance_band] ?? "—"})`
      : "—";


  const standardRate =
    distancePreview?.rate_standard_eur != null
      ? Number(distancePreview.rate_standard_eur)
      : null;

  const greenRate =
    distancePreview?.rate_green_eur != null
      ? Number(distancePreview.rate_green_eur)
      : null;

  // Participant counts by travel type
  const greenParticipantsCount = participants.filter(
    (p) => participantTravelTypes[p.id] === "green"
  ).length;

  const standardParticipantsCount = participants.filter(
    (p) => participantTravelTypes[p.id] === "standard"
  ).length;

  // System-calculated maximum eligible amount
  const eligibleAmountEur =
    isFinancialReviewUnlocked &&
    standardRate != null &&
    greenRate != null
      ? standardParticipantsCount * standardRate +
        greenParticipantsCount * greenRate
      : null;


  // --------------------------------------------------
  // SECTION 6 — Comparison & balances (derived values)
  // --------------------------------------------------

  // Claimed amount = sum of ALL submitted tickets (partner)
  const claimedAmountEur = tickets.reduce(
    (sum, t) => sum + (t.amount_eur ?? 0),
    0
  );

// Approved amount = sum of admin-approved tickets
const approvedAmountEur = approvedAmount;

// Comparison A: Partner vs Admin
const claimDifferenceEur =
  claimedAmountEur - approvedAmountEur;


  // Comparison B: Admin vs System
  const eligibilityDifferenceEur =
    approvedAmountEur != null && eligibleAmountEur != null
      ? approvedAmountEur - eligibleAmountEur
      : null;

  // --------------------------------------------------
  // SECTION 7 — Decision (derived flags)
  // --------------------------------------------------

  // Approve as claimed:
  // - keine Kürzung
  // - förderkonform
  const canApproveAsClaimed =
    isFinancialReviewUnlocked &&
    claimDifferenceEur === 0 &&
    eligibilityDifferenceEur != null &&
    eligibilityDifferenceEur <= 0;

  // Adjust & approve:
  // - mindestens ein Ticket abgelehnt
  // - positiver Auszahlungsbetrag
  // - förderkonform
  const canAdjustAndApprove =
    isFinancialReviewUnlocked &&
    claimDifferenceEur > 0 &&
    approvedAmountEur > 0 &&
    eligibilityDifferenceEur != null &&
    eligibilityDifferenceEur <= 0;

  // --------------------------------------------------
  // SECTION 8 — Payment (derived flags)
  // --------------------------------------------------

  const isClaimApproved =
    submission.claim_status === "approved" ||
    submission.claim_status === "adjusted";

  const isClaimFinal =
    submission.claim_status === "approved" ||
    submission.claim_status === "adjusted" ||
    submission.claim_status === "rejected";
  
  const isPaid =
    submission.payment_status === "paid";

  const canMarkAsPaid =
    isClaimApproved && !isPaid; 

  // ---------------------------------------------------------------------------
  // HEADER DISPLAY
  // ---------------------------------------------------------------------------
  const modalTitle = `Submission – ${submission.organisation_name}`;
  const subCountryCode = submission.country_code ?? null;

  // Host / countries (read-only context)
  const hostName = project.organisations?.name ?? "Unknown host";
  const hostCountry = project.organisations?.country_code ?? null;

  const participantCountryCodes = countries.map((c) => c.country_code);
  const hostAppearsInList =
    !!hostCountry && participantCountryCodes.includes(hostCountry);



  // ---------------------------------------------------------------------------
  // BADGE LABELS
  // ---------------------------------------------------------------------------
  function renderStatusBadge() {
    if (submissionStatusBadge === "needs_distance") {
      return (
        <Badge color="red" variant="light" size="lg">
          NEEDS DISTANCE ENTRY
        </Badge>
      );
    }

    if (submissionStatusBadge === "approved_as_claimed") {
      return (
        <Badge color="green" variant="light" size="lg">
          APPROVED AS CLAIMED
        </Badge>
      );
    }

    if (submissionStatusBadge === "adjusted_approved") {
      return (
        <Badge color="yellow" variant="light" size="lg">
          ADJUSTED &amp; APPROVED
        </Badge>
      );
    }

    if (submissionStatusBadge === "rejected") {
      return (
        <Badge color="red" variant="light" size="lg">
          REJECTED
        </Badge>
      );
    }

    return (
      <Badge color="gray" variant="light" size="lg">
        NEEDS REVIEW
      </Badge>
    );
  }

  function renderPaymentBadge() {
    if (paymentBadge === "paid") {
      return (
        <Badge color="green" variant="light" size="lg">
          PAID
        </Badge>
      );
    }

    return (
      <Badge color="gray" variant="light" size="lg">
        NOT PAID
      </Badge>
    );
  }

  function renderTicketStatusBadge(state?: TicketReviewState): ReactNode {
    if (!state) return null;

    // 1) Decision badges have highest priority
    if (state.decision === "approved") {
      return (
        <Badge size="sm" color="green" variant="light">
          approved
        </Badge>
      );
    }

    if (state.decision === "rejected") {
      return (
        <Badge size="sm" color="red" variant="light">
          rejected
        </Badge>
      );
    }

    // 2) Seen but no decision yet → pending decision
    if (state.reviewed) {
      return (
        <Badge size="sm" color="yellow" variant="light">
          pending decision
        </Badge>
      );
    }

    // 3) Unseen → no badge
    return null;
  }



    /* --------------------------------------------------
      SECTION 3.1 – Participant header meta (derived)
    -------------------------------------------------- */
    function buildParticipantHeaderMeta({
      travelType,
      tickets,
    }: {
      travelType: "green" | "standard";
      tickets: { travel_mode: string | null }[];
    }) {
      const travelLabel =
        travelType === "green" ? "GREEN TRAVEL" : "STANDARD TRAVEL";

      const ticketCountLabel = `${tickets.length} ticket${
        tickets.length === 1 ? "" : "s"
      }`;

      // dedupe icons
      const iconsSet = new Set<string>();
      for (const t of tickets) {
        iconsSet.add(getTravelModeIcon(t.travel_mode));
      }

      const travelIcons = Array.from(iconsSet).filter((i) => i !== "—");

      return {
        travelLabel,
        ticketCountLabel,
        travelIcons,
      };
    }


  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={modalTitle}
      size="xl"
      centered
    >
      <Stack gap="lg">
        {/* ------------------------------------------------------------------
            HEADER SUBLINE + RIGHT BADGES
        ------------------------------------------------------------------ */}
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Group gap={8} wrap="nowrap">
              <CountryFlag code={subCountryCode} size={20} />
              <Text
                fw={700}
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {submission.organisation_name}
              </Text>
            </Group>
            <Text size="sm" c="dimmed">
              {getCountryLabel(subCountryCode)}
              {subCountryCode ? ` (${subCountryCode})` : ""}
            </Text>
          </Stack>

          <Group gap="sm" justify="flex-end" wrap="wrap">
            {renderStatusBadge()}
            {renderPaymentBadge()}
          </Group>
        </Group>

        {/* ------------------------------------------------------------------
            DISTANCE STATUS / INPUT
        ------------------------------------------------------------------ */}
        {loadingDistance ? (
          <Alert color="gray" title="Loading distance">
            Checking whether a travel distance is stored for this partner…
          </Alert>
        ) : (
          <Card withBorder radius="md" p="md">
            <Stack gap="sm">
              <Text fw={600}>
                {needsDistanceEntry ? "Travel distance required" : "Travel distance"}
              </Text>

              {needsDistanceEntry && (
                <Text size="sm" c="dimmed">
                  Please enter the distance between the partner organisation and the host
                  venue. This is required to calculate eligible rates.
                </Text>
              )}

              <TextInput
                label="Distance (km)"
                placeholder="e.g. 850"
                value={distanceInput}
                onChange={(e) => setDistanceInput(e.currentTarget.value)}
                style={{ maxWidth: 200 }}
                disabled={!needsDistanceEntry}
              />

              {!needsDistanceEntry && (
                <Text size="xs" c="dimmed">
                  If you need to change the distance, please do so in the Partners tab.
                </Text>
              )}

              {needsDistanceEntry && (
                <Button
                  onClick={saveDistance}
                  disabled={
                    distanceInput.trim() === "" ||
                    Number.isNaN(Number(distanceInput))
                  }
                  style={{ alignSelf: "flex-start" }}
                >
                  Save distance
                </Button>
              )}

              {distancePreview && (
                <Card withBorder radius="sm" p="sm" mt="sm">
                  <Stack gap="xs">
                    <Text size="sm" fw={600}>
                      Distance &amp; calculated rates
                    </Text>

                    <Group grow>
                      <TextInput
                        label="Entered distance (km)"
                        value={String(distancePreview.distance_km)}
                        disabled
                      />

                      <TextInput
                        label="Distance band"
                        value={`Band ${distancePreview.distance_band}`}
                        disabled
                      />
                    </Group>

                    <Group grow>
                      <TextInput
                        label="Standard rate (€)"
                        value={String(distancePreview.rate_standard_eur)}
                        disabled
                      />

                      <TextInput
                        label="Green rate (€)"
                        value={String(distancePreview.rate_green_eur)}
                        disabled
                      />
                    </Group>
                  </Stack>
                </Card>
              )}
            </Stack>
          </Card>
        )}

        {/* ------------------------------------------------------------------
            SECTION 1 — Project context (read-only)
        ------------------------------------------------------------------ */}
        <SectionCard title="Project & host">
          <Stack gap="sm">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Stack gap={4}>
                <Text size="sm" c="dimmed">
                  Project
                </Text>
                <Text fw={600}>{project.name}</Text>
              </Stack>

              <Stack gap={4}>
                <Text size="sm" c="dimmed">
                  Reference
                </Text>
                <Text>{project.project_reference || "—"}</Text>
              </Stack>
            </SimpleGrid>

            <Divider />

            <Stack gap={6}>
              <Text size="sm" fw={600}>
                Host organisation
              </Text>

              <Group gap={8}>
                <CountryFlag code={hostCountry} size={20} />
                <Text>
                  {hostName}{" "}
                  {hostCountry && (
                    <span style={{ opacity: 0.6 }}>({hostCountry})</span>
                  )}
                </Text>
              </Group>
            </Stack>

            <Divider />

            <Stack gap={6}>
              <Text size="sm" fw={600}>
                Participating countries
              </Text>

              <Group gap="sm">
                {participantCountryCodes.map((code) => (
                  <CountryFlag key={code} code={code} size={22} />
                ))}
                {!hostAppearsInList && <CountryFlag code={hostCountry} size={22} />}
              </Group>
            </Stack>

            <Divider />

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Stack gap={4}>
                <Text size="sm" c="dimmed">
                  Start date
                </Text>
                <Text>{project.start_date || "—"}</Text>
              </Stack>

              <Stack gap={4}>
                <Text size="sm" c="dimmed">
                  End date
                </Text>
                <Text>{project.end_date || "—"}</Text>
              </Stack>
            </SimpleGrid>
          </Stack>
        </SectionCard>

        {/* ------------------------------------------------------------------
            SECTION 2 — Claiming organisation (read-only)
        ------------------------------------------------------------------ */}
        <SectionCard title="Claiming organisation">
          <Stack gap="sm">
            <Group gap={8}>
              <CountryFlag code={subCountryCode} size={20} />
              <Stack gap={0}>
                <Text fw={600}>{submission.organisation_name}</Text>
                <Text size="sm" c="dimmed">
                  {getCountryLabel(subCountryCode)}
                </Text>
              </Stack>
            </Group>

            <Divider />

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <AddressBlock
                label="Organisation address"
                line1={orgDetails?.address_line1}
                line2={orgDetails?.address_line2}
                postalCode={orgDetails?.address_postal_code}
                city={orgDetails?.address_city}
                region={orgDetails?.address_region}
              />

              <Stack gap={6}>
                <Text fw={600} size="sm">
                  Contact person
                </Text>
                <Text size="sm">
                  {orgDetails?.contact_name || "—"}
                </Text>

                <Text fw={600} size="sm" mt="xs">
                  Email
                </Text>
                <Text size="sm">
                  {orgDetails?.contact_email || "—"}
                </Text>
              </Stack>
            </SimpleGrid>
          </Stack>
        </SectionCard>

        {/* ------------------------------------------------------------------
            SECTION 3 — Participants & travel (Accordion)
            (disabled if distance missing)
        ------------------------------------------------------------------ */}
        <SectionCard
          title="Participants & travel"
          disabled={isLockedForMissingDistance}
        >
          {participants.length === 0 ? (
            <Text c="dimmed">No participants</Text>
          ) : (
            <Accordion variant="contained" radius="md">
                {participants.map((p) => {
                  const participantTickets = tickets.filter((t) =>
                    t.assigned_participants?.some((ap) => ap.id === p.id)
                  );

                  const travelType = participantTravelTypes[p.id];

                  const headerMeta = buildParticipantHeaderMeta({
                    travelType,
                    tickets: participantTickets,
                  });

                return (
                  <Accordion.Item key={p.id} value={p.id}>
                    <Accordion.Control>
                      <Group justify="space-between" align="center" wrap="nowrap">
                        {/* Name */}
                        <Text fw={600} style={{ minWidth: 0 }}>
                          {p.full_name}
                        </Text>

                        {/* Meta line */}
                        <Group gap={6} wrap="nowrap">
                          <Text
                            size="xs"
                            fw={600}
                            c={travelType === "green" ? "green" : "gray"}
                          >
                            {headerMeta.travelLabel}
                          </Text>

                          <Text size="xs" c="dimmed">
                            · {headerMeta.ticketCountLabel}
                          </Text>

                          {headerMeta.travelIcons.length > 0 && (
                            <Group gap={2}>
                              {headerMeta.travelIcons.map((icon: string) => (
                                <Text key={icon} size="sm">
                                  {icon}
                                </Text>
                              ))}
                            </Group>
                          )}
                        </Group>
                      </Group>
                    </Accordion.Control>

                      <Accordion.Panel>
                        <Stack gap="sm">
                          {/* 1️⃣ Travel type (claimed) */}
                          <Stack gap={4}>
                            <Text fw={600} size="sm">
                              Travel type
                            </Text>

                            <Text
                              size="xs"
                              fw={600}
                              c={travelType === "green" ? "green" : "gray"}
                            >
                              {headerMeta.travelLabel}
                            </Text>

                            <Text size="xs" c="dimmed">
                              Determined automatically by the system based on the submitted tickets.
                            </Text>
                          </Stack>
                        </Stack>
                      </Accordion.Panel>

                  </Accordion.Item>
                );
              })}
            </Accordion>
          )}
        </SectionCard>

        {/* ------------------------------------------------------------------
            SECTION 3.5 — Tickets
        ------------------------------------------------------------------ */}
        <SectionCard
          title="Tickets"
          disabled={isLockedForMissingDistance || isClaimFinal}
        >
          {tickets.length === 0 ? (
            <Text c="dimmed">No tickets submitted</Text>
          ) : (
            <>
              {/* --------------------------------------------------------------
                  UX-3 — Global clarity signal
              -------------------------------------------------------------- */}
              {!allTicketsDecided && (
                <Alert color="yellow" variant="light" mb="md">
                  <Text size="sm" fw={600}>
                    {undecidedTicketsCount} ticket
                    {undecidedTicketsCount !== 1 ? "s are" : " is"} still awaiting a decision.
                  </Text>
                  <Text size="xs" c="dimmed">
                    Please review and decide all tickets before continuing.
                  </Text>
                </Alert>
              )}

              {allTicketsDecided && (
                <Alert color="green" variant="light" mb="md">
                  <Text size="sm" fw={600}>
                    All tickets have been reviewed.
                  </Text>
                </Alert>
              )}

              {/* --------------------------------------------------------------
                  Ticket list
              -------------------------------------------------------------- */}
              <Accordion variant="contained" radius="md">
                {tickets.map((t) => (
                  <Accordion.Item key={t.id} value={t.id}>
                    <Accordion.Control>
                      <Group justify="space-between" align="center" wrap="nowrap">
                        {/* Left side: icon + route */}
                        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                          <Text>
                            {getTravelModeIcon(t.travel_mode)}
                          </Text>

                          <Text fw={600} style={{ minWidth: 0 }}>
                            {t.from_location} → {t.to_location}
                          </Text>
                        </Group>

                        {/* Right side: status + amount */}
                        <Group gap="sm" wrap="nowrap">
                          {renderTicketStatusBadge(ticketReviewState[t.id])}

                          <Text fw={600}>
                            {t.amount_eur?.toFixed(2)} €
                          </Text>
                        </Group>
                      </Group>
                    </Accordion.Control>

                    <Accordion.Panel>
                      {(() => {
                        const state = ticketReviewState[t.id];

                        return (
                          <Stack gap="sm">
                            {/* Route */}
                            <Stack gap={4}>
                              <Text size="sm" fw={600}>
                                Route
                              </Text>
                              <Text size="sm">
                                {t.from_location} → {t.to_location}
                              </Text>
                            </Stack>

                            {/* Participants */}
                            <Stack gap={4}>
                              <Text size="sm" fw={600}>
                                Participants on this ticket
                              </Text>

                              {"assigned_participants" in t && t.assigned_participants?.length ? (
                                <Group gap={6}>
                                  {t.assigned_participants.map(
                                    (p: { id: string; full_name: string }) => (
                                      <Badge key={p.id} variant="light">
                                        {p.full_name}
                                      </Badge>
                                    )
                                  )}
                                </Group>
                              ) : (
                                <Text size="sm" c="dimmed">
                                  —
                                </Text>
                              )}
                            </Stack>

                            {/* Amount */}
                            <Stack gap={4}>
                              <Text size="sm" fw={600}>
                                Ticket price (EUR)
                              </Text>
                              <Text size="sm">{t.amount_eur?.toFixed(2)} €</Text>
                            </Stack>

                            {/* View ticket */}
                            <Group justify="flex-end">
                              <Button
                                size="xs"
                                variant="light"
                                leftSection={<span>👁</span>}
                                onClick={() => {
                                  console.log("ADMIN ticket file_url:", t.file_url);
                                  setTicketReviewState((prev) => ({
                                    ...prev,
                                    [t.id]: { ...prev[t.id], reviewed: true },
                                  }));
                                  openTicketFile(t.file_url);
                                }}
                              >
                                View ticket
                              </Button>

                            </Group>

                            {/* Decision (only when viewed & undecided) */}
                            {!isClaimFinal && state?.reviewed && state.decision === null && (
                              <Stack gap={4} mt="sm">

                                <Text size="sm" fw={600}>
                                  Decision
                                </Text>

                                <Group gap="xs">
                                  <Button
                                    size="xs"
                                    color="green"
                                    variant="outline"
                                    onClick={() =>
                                      setTicketReviewState((prev) => ({
                                        ...prev,
                                        [t.id]: {
                                          ...prev[t.id],
                                          decision: "approved",
                                        },
                                      }))
                                    }
                                  >
                                    Approve
                                  </Button>

                                  <Button
                                    size="xs"
                                    color="red"
                                    variant="outline"
                                    onClick={() =>
                                      setTicketReviewState((prev) => ({
                                        ...prev,
                                        [t.id]: {
                                          ...prev[t.id],
                                          decision: "rejected",
                                        },
                                      }))
                                    }
                                  >
                                    Reject
                                  </Button>
                                </Group>
                              </Stack>
                            )}
                            {/* Read-only hint after decision */}
                            {state?.decision !== null && (
                              <Text size="xs" c="dimmed" mt="sm">
                                Decision already made. This ticket is now read-only.
                              </Text>
                            )}                            
                          </Stack>
                        );
                      })()}
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            </>
          )}
        </SectionCard>


        {/* ------------------------------------------------------------------
            SECTION 4 — Financial facts (read-only)
        ------------------------------------------------------------------ */}
        <SectionCard title="Financial facts" disabled={isLockedForMissingDistance}>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <Card withBorder radius="md" p="md">
              <Text size="sm" c="dimmed">
                Participants
              </Text>
              <Text fw={700} size="lg">
                {participants.length}
              </Text>
            </Card>

            <Card withBorder radius="md" p="md">
              <Text size="sm" c="dimmed">
                Tickets
              </Text>
              <Text fw={700} size="lg">
                {tickets.length}
              </Text>
            </Card>

            <Card withBorder radius="md" p="md">
              <Text size="sm" c="dimmed">
                Claimed ticket costs (EUR)
              </Text>
              <Text fw={700} size="lg">
                —
              </Text>
            </Card>
          </SimpleGrid>

          <Text size="xs" c="dimmed">
            Claimed totals will be wired to ticket amounts later.
          </Text>
        </SectionCard>

        {/* ------------------------------------------------------------------
            SECTION 5 — Eligible grant (system)
        ------------------------------------------------------------------ */}
        <SectionCard
          title="Eligible grant (system-calculated)"
          disabled={isLockedForMissingDistance || !allTicketsReviewed}
        >
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <Card withBorder radius="md" p="md">
              <Text size="sm" c="dimmed">
                Distance band
              </Text>

              {isFinancialReviewUnlocked && distancePreview ? (
                <Stack gap={0}>
                  <Text fw={700} size="lg">
                    Band {distancePreview.distance_band}
                  </Text>
                  <Text size="sm" c="dimmed">
                    ({distanceBandLabel.replace(/^Band \d+\s*/, "")})
                  </Text>
                </Stack>
              ) : (
                <Text fw={700} size="lg">—</Text>
              )}
            </Card>

            <Card withBorder radius="md" p="md">
              <Text size="sm" c="dimmed">
                Rate per participant (EUR)
              </Text>

              {!isFinancialReviewUnlocked ? (
                <Text fw={700} size="lg">
                  —
                </Text>
              ) : (
                <Stack gap={6} mt={4}>
                  <Stack gap={0}>
                    <Text fw={600}>
                      Standard: {standardRate?.toFixed(2)} €
                    </Text>
                    <Text size="xs" c="dimmed">
                      → {standardParticipantsCount} participant{standardParticipantsCount !== 1 ? "s" : ""}
                    </Text>
                  </Stack>

                  <Stack gap={0}>
                    <Text fw={600}>
                      Green: {greenRate?.toFixed(2)} €
                    </Text>
                    <Text size="xs" c="dimmed">
                      → {greenParticipantsCount} participant{greenParticipantsCount !== 1 ? "s" : ""}
                    </Text>
                  </Stack>
                </Stack>
              )}
            </Card>

            <Card withBorder radius="md" p="md">
              <Text size="sm" c="dimmed">
                Total eligible amount (EUR)
              </Text>
              <Text fw={700} size="lg">
                {isFinancialReviewUnlocked && eligibleAmountEur != null
                  ? `${eligibleAmountEur.toFixed(2)} €`
                  : "—"}
              </Text>
            </Card>
          </SimpleGrid>

              <Text size="xs" c="dimmed">
                Eligibility is calculated after all tickets have been approved or rejected.
              </Text>

        </SectionCard>

        {/* ------------------------------------------------------------------
            SECTION 6 — Comparison & balances
        ------------------------------------------------------------------ */}
        <SectionCard
          title="Comparison & balances"
          disabled={!isFinancialReviewUnlocked}
        >
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            {/* Claimed */}
            <Card withBorder radius="md" p="md">
              <Text size="sm" c="dimmed">
                Claimed amount (Partner)
              </Text>
              <Text fw={700} size="lg">
                {isFinancialReviewUnlocked
                  ? `${claimedAmountEur.toFixed(2)} €`
                  : "—"}
              </Text>
            </Card>

            {/* Approved */}
            <Card withBorder radius="md" p="md">
              <Text size="sm" c="dimmed">
                Approved amount (Admin)
              </Text>
              <Text fw={700} size="lg">
                {isFinancialReviewUnlocked
                  ? `${approvedAmountEur.toFixed(2)} €`
                  : "—"}
              </Text>
            </Card>

            {/* Eligible */}
            <Card withBorder radius="md" p="md">
              <Text size="sm" c="dimmed">
                Eligible amount (System)
              </Text>
              <Text fw={700} size="lg">
                {isFinancialReviewUnlocked && eligibleAmountEur != null
                  ? `${eligibleAmountEur.toFixed(2)} €`
                  : "—"}
              </Text>
            </Card>
          </SimpleGrid>

          <Divider my="md" />

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            {/* Claim review */}
            <Card withBorder radius="md" p="md">
              <Text size="sm" c="dimmed">
                Claim review (Claimed − Approved)
              </Text>
              <Text
                fw={700}
                size="lg"
                c={claimDifferenceEur === 0 ? "green" : "red"}
              >
                {isFinancialReviewUnlocked
                  ? `${claimDifferenceEur.toFixed(2)} €`
                  : "—"}
              </Text>
              <Text size="xs" c="dimmed">
                Difference shows whether the claim was fully accepted.
              </Text>
            </Card>

            {/* Eligibility check */}
            <Card withBorder radius="md" p="md">
              <Text size="sm" c="dimmed">
                Eligibility check (Approved − Eligible)
              </Text>
              <Text
                fw={700}
                size="lg"
                c={
                  eligibilityDifferenceEur != null &&
                  eligibilityDifferenceEur > 0
                    ? "red"
                    : "green"
                }
              >
                {isFinancialReviewUnlocked && eligibilityDifferenceEur != null
                  ? `${eligibilityDifferenceEur.toFixed(2)} €`
                  : "—"}
              </Text>
              <Text size="xs" c="dimmed">
                Approved amount must not exceed eligible maximum.
              </Text>
            </Card>
          </SimpleGrid>
        </SectionCard>

        {/* ------------------------------------------------------------------
            SECTION 7 — Decision
        ------------------------------------------------------------------ */}
        <SectionCard title="Decision" disabled={isClaimFinal}>
          <Stack gap="md">
            {/* Primary decisions */}
            <Group gap="sm" wrap="wrap">
              <Button
                color="green"
                variant="filled"
                disabled={!canApproveAsClaimed || isClaimFinal}
                onClick={() =>
                  persistClaimDecision({
                    status: "approved",
                    approvedAmountEur,
                  })
                }
              >
                Approve as claimed
              </Button>

              <Button
                color="yellow"
                variant="filled"
                disabled={!canAdjustAndApprove || isClaimFinal}
                onClick={() =>
                  persistClaimDecision({
                    status: "adjusted",
                    approvedAmountEur,
                  })
                }
              >
                Adjust &amp; approve
              </Button>
            </Group>

            {/* Dangerous action */}
            <Divider label="Danger zone" labelPosition="center" />

            <Group gap="sm">
              <Button
                color="red"
                variant="outline"
                disabled={isClaimFinal}
                onClick={() =>
                  persistClaimDecision({
                    status: "rejected",
                    approvedAmountEur: 0,
                  })
                }
              >
                Reject claim
              </Button>

            </Group>

            {/* Reason */}
            <Textarea
              label="Reason"
              description="Required for adjustment or rejection. Will appear in admin and partner PDFs."
              minRows={3}
              required
              value=""
              onChange={() => {}}
            />

            <Text size="xs" c="dimmed">
              Decisions are final. Rejecting a claim denies any payment.
            </Text>
          </Stack>
        </SectionCard>

        {/* ------------------------------------------------------------------
            SECTION 8 — Payment
        ------------------------------------------------------------------ */}
        <SectionCard title="Payment">
          <Stack gap="sm">
            {!isClaimApproved && (
              <Alert color="gray" variant="light">
                <Text size="sm">
                  Payment is only possible after a claim has been approved or adjusted.
                </Text>
              </Alert>
            )}

            {submission.claim_status === "rejected" && (
              <Alert color="red" variant="light">
                <Text size="sm">
                  This claim was rejected and will not be paid.
                </Text>
              </Alert>
            )}

            {isClaimApproved && (
              <Group justify="space-between" align="center">
                <Stack gap={2}>
                  <Text size="sm" c="dimmed">
                    Payment status
                  </Text>

                  <Text fw={700}>
                    {isPaid ? "Paid" : "Not paid"}
                  </Text>

                  {isPaid && submission.payment_paid_at && (
                    <Text size="xs" c="dimmed">
                      Paid at{" "}
                      {new Date(submission.payment_paid_at).toLocaleString()}
                    </Text>
                  )}
                </Stack>

                <Button
                  variant="light"
                  disabled={!canMarkAsPaid}
                >
                  Mark as instructed &amp; paid
                </Button>
              </Group>
            )}

            <Text size="xs" c="dimmed">
              Payment marking is a single-step operation. An undo option can be added later.
            </Text>
          </Stack>
        </SectionCard>

        {/* ------------------------------------------------------------------
            FOOTER
        ------------------------------------------------------------------ */}
        <Card withBorder radius="md" p="md">
          <Group justify="space-between" align="center" wrap="wrap">
            <Stack gap={2}>
              <Text size="sm" c="dimmed">
                Submitted at
              </Text>
              <Text size="sm">
                {submission.submitted_at
                  ? new Date(submission.submitted_at).toLocaleString()
                  : "—"}
              </Text>

              <Text size="sm" c="dimmed" mt="xs">
                Reviewed at
              </Text>
              <Text size="sm">
                {submission.reviewed_at
                  ? new Date(submission.reviewed_at).toLocaleString()
                  : "—"}
              </Text>
            </Stack>

            <Group gap="sm">
              <Button variant="subtle" onClick={onClose}>
                Close
              </Button>
            </Group>
          </Group>
        </Card>

        {/* Keep prop referenced (skeleton-only) */}
        <div style={{ display: "none" }}>{String(!!onReviewComplete)}</div>
      </Stack>
    </Modal>
  );
}
