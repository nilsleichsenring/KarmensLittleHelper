import { useState } from "react";
import {
  Box,
  Card,
  Group,
  Stack,
  Text,
  Title,
  Divider,
  UnstyledButton,
} from "@mantine/core";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";

import CountryFlag from "../../../../components/CountryFlag";
import { type ProjectPartnerOrg } from "../types";

type BankInfo = {
  account_holder: string | null;
  iban: string | null;
  bic: string | null;
  bank_name: string | null;
  bank_country: string | null;
};

type Stats = {
  participantCount: number;
  ticketCount: number;
};

type Props = {
  partnerOrgs: ProjectPartnerOrg[];
  bankInfoByOrgName: Record<string, BankInfo>;
  statsByOrgName: Record<string, Stats>;
};

export function PartnersTab({
  partnerOrgs,
  bankInfoByOrgName,
  statsByOrgName,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <Stack gap="lg">
      {/* Header */}
      <Stack gap="xs">
        <Title order={2}>Partner organisations</Title>
        <Text size="sm" c="dimmed">
          This tab provides a read-only overview of partner organisations,
          distances, rates and bank information.
        </Text>
      </Stack>

      {/* List */}
      <Stack gap="sm">
        {partnerOrgs.map((org) => {
          const isOpen = openId === org.id;

          const bankInfo =
            org.organisation_name
              ? bankInfoByOrgName[org.organisation_name] ?? null
              : null;

          const stats =
            org.organisation_name
              ? statsByOrgName[org.organisation_name]
              : null;

          return (
            <Card key={org.id} withBorder radius="md" p={0}>
              {/* ================= HEADER ================= */}
              <UnstyledButton
                onClick={() => toggle(org.id)}
                style={{ width: "100%" }}
              >
                <Group
                  wrap="nowrap"
                  px="md"
                  py="sm"
                  align="center"
                  justify="space-between"
                >
                  {/* LEFT — Identity */}
                  <Group gap="sm" wrap="nowrap">
                    {org.country_code && (
                      <CountryFlag code={org.country_code} size={18} />
                    )}
                    <Stack gap={0}>
                      <Text fw={600}>{org.organisation_name}</Text>
                      <Text size="xs" c="dimmed">
                        {org.country_code ?? "—"}
                      </Text>
                    </Stack>
                  </Group>

                  {/* CENTER — Meta stats */}
                  <Group gap="lg">
                    {stats && (
                      <>
                        <Text size="sm" c="dimmed">
                          {stats.participantCount} participant
                          {stats.participantCount === 1 ? "" : "s"}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {stats.ticketCount} ticket
                          {stats.ticketCount === 1 ? "" : "s"}
                        </Text>
                      </>
                    )}

                    <Text size="sm" c="dimmed">
                      {org.distance_km != null
                        ? `${org.distance_km} km · Band ${org.distance_band ?? "—"}`
                        : "Distance not set"}
                    </Text>
                  </Group>

                  {/* RIGHT — Chevron */}
                  {isOpen ? (
                    <IconChevronUp size={18} />
                  ) : (
                    <IconChevronDown size={18} />
                  )}
                </Group>
              </UnstyledButton>

              {/* ================= PANEL ================= */}
              {isOpen && (
                <Box
                  bg="gray.0"
                  px="md"
                  py="lg"
                  style={{
                    borderTop: "1px solid var(--mantine-color-gray-3)",
                    borderLeft: "3px solid var(--mantine-color-gray-3)",
                  }}
                >
                  <Stack gap="lg">
                    {/* Organisation */}
                    <Stack gap="xs">
                      <Title order={5}>Organisation</Title>

                      <Group grow>
                        <Stack gap={2}>
                          <Text size="xs" c="dimmed">
                            Organisation name
                          </Text>
                          <Text size="sm">{org.organisation_name}</Text>
                        </Stack>

                        <Stack gap={2}>
                          <Text size="xs" c="dimmed">
                            Country
                          </Text>
                          <Group gap={6}>
                            {org.country_code && (
                              <CountryFlag
                                code={org.country_code}
                                size={16}
                              />
                            )}
                            <Text size="sm">
                              {org.country_code ?? "—"}
                            </Text>
                          </Group>
                        </Stack>
                      </Group>

                      <Stack gap={2}>
                        <Text size="xs" c="dimmed">
                          Address
                        </Text>
                        <Text size="sm">
                          {org.address_line1 ?? "—"}
                          {org.address_line2 && (
                            <>
                              <br />
                              {org.address_line2}
                            </>
                          )}
                          {(org.address_postal_code || org.address_city) && (
                            <>
                              <br />
                              {org.address_postal_code} {org.address_city}
                            </>
                          )}
                        </Text>
                      </Stack>
                    </Stack>

                    <Divider />

                    {/* Distance & rates */}
                    <Stack gap="xs">
                      <Title order={5}>Distance & rates</Title>

                      <Group grow>
                        <Stack gap={2}>
                          <Text size="xs" c="dimmed">
                            Distance to venue
                          </Text>
                          <Text size="sm">
                            {org.distance_km != null
                              ? `${org.distance_km} km`
                              : "—"}
                          </Text>
                        </Stack>

                        <Stack gap={2}>
                          <Text size="xs" c="dimmed">
                            Distance band
                          </Text>
                          <Text size="sm">
                            {org.distance_band != null
                              ? `Band ${org.distance_band}`
                              : "—"}
                          </Text>
                        </Stack>

                        <Stack gap={2}>
                          <Text size="xs" c="dimmed">
                            Standard rate (€)
                          </Text>
                          <Text size="sm">
                            {org.rate_standard_eur != null
                              ? `${org.rate_standard_eur} €`
                              : "—"}
                          </Text>
                        </Stack>

                        <Stack gap={2}>
                          <Text size="xs" c="dimmed">
                            Green rate (€)
                          </Text>
                          <Text size="sm">
                            {org.rate_green_eur != null
                              ? `${org.rate_green_eur} €`
                              : "—"}
                          </Text>
                        </Stack>
                      </Group>

                      <Text size="xs" c="dimmed">
                        Distances and rates are defined during submission review.
                      </Text>
                    </Stack>

                    <Divider />

                    {/* Bank */}
                    <Stack gap="xs">
                      <Title order={5}>
                        Bank information{" "}
                        <Text span size="xs" c="dimmed">
                          (from latest submission)
                        </Text>
                      </Title>

                      {bankInfo ? (
                        <Group grow>
                          <Stack gap={2}>
                            <Text size="xs" c="dimmed">
                              Account holder
                            </Text>
                            <Text size="sm">
                              {bankInfo.account_holder ?? "—"}
                            </Text>
                          </Stack>

                          <Stack gap={2}>
                            <Text size="xs" c="dimmed">
                              IBAN
                            </Text>
                            <Text size="sm">
                              {bankInfo.iban ?? "—"}
                            </Text>
                          </Stack>

                          <Stack gap={2}>
                            <Text size="xs" c="dimmed">
                              BIC
                            </Text>
                            <Text size="sm">
                              {bankInfo.bic ?? "—"}
                            </Text>
                          </Stack>

                          <Stack gap={2}>
                            <Text size="xs" c="dimmed">
                              Bank name
                            </Text>
                            <Text size="sm">
                              {bankInfo.bank_name ?? "—"}
                            </Text>
                          </Stack>

                          <Stack gap={2}>
                            <Text size="xs" c="dimmed">
                              Bank country
                            </Text>
                            <Text size="sm">
                              {bankInfo.bank_country ?? "—"}
                            </Text>
                          </Stack>
                        </Group>
                      ) : (
                        <Text size="sm" c="dimmed">
                          No bank information available from submissions.
                        </Text>
                      )}
                    </Stack>
                  </Stack>
                </Box>
              )}
            </Card>
          );
        })}
      </Stack>
    </Stack>
  );
}
