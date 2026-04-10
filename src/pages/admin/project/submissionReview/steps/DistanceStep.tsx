import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";

import { supabase } from "../../../../../lib/supabaseClient";
import { applyDistanceUpdate } from "../../../../../lib/travel/applyDistanceUpdate";
import { saveDistance as persistDistance } from "../logic/reviewPersistence";

import type { SubmissionSummary } from "../../types";
import { useReviewStep } from "../ReviewStepContext";

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

type Props = {
  submission: SubmissionSummary;
  isClaimFinal: boolean;
  onDistanceCalculated: (result: {
    distanceKm: number;
    distanceBand: number;
    standardRate: number;
    greenRate: number;
  }) => void;
};

/* ------------------------------------------------------------------ */
/* Component */
/* ------------------------------------------------------------------ */

export default function DistanceStep({
  submission,
  isClaimFinal,
  onDistanceCalculated,
}: Props) {
  const { markStepCompleted } = useReviewStep();

  const [distanceInput, setDistanceInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [startPostalCode, setStartPostalCode] = useState<string | null>(null);
  const [startCity, setStartCity] = useState<string | null>(null);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const projectId = submission.project_id;
  const organisationName = submission.organisation_name;

  /* -------------------------------------------------- */
  /* Helper */
  /* -------------------------------------------------- */

  function notifyWizard(update: ReturnType<typeof applyDistanceUpdate>) {
    if (
      update.distance_km !== null &&
      update.distance_band !== null &&
      update.rate_standard_eur !== null &&
      update.rate_green_eur !== null
    ) {
      onDistanceCalculated({
        distanceKm: update.distance_km,
        distanceBand: update.distance_band,
        standardRate: update.rate_standard_eur,
        greenRate: update.rate_green_eur,
      });

      markStepCompleted("distance");
    }
  }

  /* -------------------------------------------------- */
  /* Load submission address (START) */
  /* -------------------------------------------------- */

  useEffect(() => {
    let active = true;

    async function loadSubmissionAddress() {
      const { data, error } = await supabase
        .from("project_partner_submissions")
        .select("address_postal_code, address_city")
        .eq("id", submission.id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error("Failed to load submission address", error);
      } else {
        setStartPostalCode(data?.address_postal_code ?? null);
        setStartCity(data?.address_city ?? null);
      }
    }

    loadSubmissionAddress();
    return () => {
      active = false;
    };
  }, [submission.id]);

  /* -------------------------------------------------- */
  /* Load stored distance */
  /* -------------------------------------------------- */

  useEffect(() => {
    let active = true;

    async function loadDistance() {
      setLoading(true);

      const { data, error } = await supabase
        .from("project_partner_orgs")
        .select("distance_km")
        .eq("project_id", projectId)
        .eq("organisation_name", organisationName)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error(error);
        setDistanceInput("");
      } else {
        const km = data?.distance_km ?? null;
        setDistanceInput(km !== null ? String(km) : "");

        if (km !== null) {
          const update = applyDistanceUpdate(km);
          notifyWizard(update);
        }
      }

      setLoading(false);
    }

    loadDistance();
    return () => {
      active = false;
    };
  }, [projectId, organisationName]);

  /* -------------------------------------------------- */
  /* Save distance */
  /* -------------------------------------------------- */

  async function saveDistance() {
    const parsed =
      distanceInput.trim() === "" ? null : Number(distanceInput);

    setSaveSuccess(false);
    setSaveError(null);

    if (parsed === null || !Number.isFinite(parsed) || parsed < 0) {
      setSaveError("Please enter a valid distance in kilometers.");
      return;
    }

    setSaving(true);

    let result;

    try {
      result = await persistDistance({
        projectId,
        organisationName,
        distanceKm: parsed,
      });
    } catch (error) {
      console.error(error);
      setSaving(false);
      setSaveError("Could not save distance. Please try again.");
      return;
    }

    setSaving(false);

    setDistanceInput(String(result.distanceKm));
    notifyWizard(applyDistanceUpdate(result.distanceKm));
    setSaveSuccess(true);
  }

  /* -------------------------------------------------- */
  /* Live preview */
  /* -------------------------------------------------- */

  const preview =
    distanceInput.trim() !== "" &&
    Number.isFinite(Number(distanceInput)) &&
    Number(distanceInput) >= 0
      ? applyDistanceUpdate(Number(distanceInput))
      : null;

  if (loading) {
    return <Text c="dimmed">Loading distance…</Text>;
  }

  return (
    <Stack gap="md">
      <Alert color="blue" variant="light">
        <Stack gap={4}>
          <Text fw={600}>How to calculate the distance</Text>

          <Text size="sm">
            <b>Start:</b> {startPostalCode || "—"} {startCity || ""}
            {submission.country_code ? ` (${submission.country_code})` : ""}
          </Text>

          <Text size="sm">
            <b>Destination:</b> City of project venue
          </Text>

          <Text size="sm">
            Use the official Erasmus+ Distance Calculator.
          </Text>

          <Button
            component="a"
            href="https://erasmus-plus.ec.europa.eu/resources-and-tools/distance-calculator"
            target="_blank"
            size="xs"
            variant="white"
          >
            Open distance calculator
          </Button>
        </Stack>
      </Alert>

      <Card withBorder radius="md" p="lg">
        <Stack gap="sm">
          <Text fw={700}>Travel distance</Text>

          <TextInput
            label="Distance (km)"
            placeholder="e.g. 850"
            value={distanceInput}
            onChange={(e) => {
              setDistanceInput(e.currentTarget.value);
              setSaveSuccess(false);
              setSaveError(null);
            }}
            style={{ maxWidth: 200 }}
            disabled={isClaimFinal || saving}
          />

          {!isClaimFinal && (
            <Button
              onClick={saveDistance}
              loading={saving}
              style={{ alignSelf: "flex-start" }}
            >
              Save distance
            </Button>
          )}

          {saveSuccess && !isClaimFinal && (
            <Alert color="green" variant="light">
              Distance saved successfully.
            </Alert>
          )}

          {saveError && (
            <Alert color="red" variant="light">
              {saveError}
            </Alert>
          )}

          {isClaimFinal && (
            <Alert color="gray" variant="light">
              Distance is locked because the claim is final.
            </Alert>
          )}
        </Stack>
      </Card>

      {preview && (
        <Card withBorder radius="md" p="lg">
          <Stack gap="xs">
            <Text fw={700}>Calculated rates</Text>
            <Text size="sm" c="dimmed">
              These values are calculated automatically based on the saved distance.
            </Text>

            <Group grow align="stretch">
              <Card withBorder radius="md" p="md" bg="gray.0">
                <Stack gap={2}>
                  <Text size="xs" c="dimmed">
                    Distance band
                  </Text>
                  <Text fw={700}>Band {preview.distance_band}</Text>
                </Stack>
              </Card>

              <Card withBorder radius="md" p="md" bg="gray.0">
                <Stack gap={2}>
                  <Text size="xs" c="dimmed">
                    Standard rate (€)
                  </Text>
                  <Text fw={700}>{preview.rate_standard_eur}</Text>
                </Stack>
              </Card>

              <Card withBorder radius="md" p="md" bg="gray.0">
                <Stack gap={2}>
                  <Text size="xs" c="dimmed">
                    Green rate (€)
                  </Text>
                  <Text fw={700}>{preview.rate_green_eur}</Text>
                </Stack>
              </Card>
            </Group>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}