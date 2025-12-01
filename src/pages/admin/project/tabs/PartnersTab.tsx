import { type ProjectPartnerOrg } from "../types";
import {
  Button,
  Card,
  Stack,
  Table,
  Text,
  TextInput,
  Select,
  Group,
} from "@mantine/core";

import { CountryFlag } from "../../../../components/CountryFlag";

type Props = {
  partnerOrgs: ProjectPartnerOrg[];
  projectCountryOptions: { value: string; label: string }[];
  newPartnerName: string;
  setNewPartnerName: (v: string) => void;
  newPartnerCountry: string | null;
  setNewPartnerCountry: (v: string | null) => void;
  addPartnerOrg: () => Promise<void>;
  deletePartnerOrg: (id: string) => Promise<void>;
};

export function PartnersTab({
  partnerOrgs,
  projectCountryOptions,
  newPartnerName,
  setNewPartnerName,
  newPartnerCountry,
  setNewPartnerCountry,
  addPartnerOrg,
  deletePartnerOrg,
}: Props) {
  return (
    <Stack gap="lg">
      {/* ---------------------------------------------------
          ADD PARTNER ORG
      --------------------------------------------------- */}
      <Card withBorder radius="md" p="lg" maw={600}>
        <Text fw={600}>Add partner organisation</Text>

        <Stack mt="sm">
          <TextInput
            label="Organisation name"
            placeholder="e.g. Youth NGO Madrid"
            value={newPartnerName}
            onChange={(e) => setNewPartnerName(e.currentTarget.value)}
            withAsterisk
          />

          <Select
            label="Country (optional)"
            data={projectCountryOptions}
            value={newPartnerCountry}
            onChange={setNewPartnerCountry}
            clearable
            searchable
            // ---------- Show flag inside dropdown ----------
            renderOption={({ option }) => (
              <Group gap={8}>
                <CountryFlag code={option.value} size={18} />
                <Text>{option.label}</Text>
              </Group>
            )}
            rightSection={
              newPartnerCountry ? (
                <CountryFlag code={newPartnerCountry} size={20} />
              ) : null
            }
          />

          <Button onClick={addPartnerOrg}>
            Add organisation
          </Button>
        </Stack>
      </Card>

      {/* ---------------------------------------------------
          PARTNER LIST
      --------------------------------------------------- */}
      <Card withBorder radius="md" p="lg">
        {partnerOrgs.length === 0 ? (
          <Text c="dimmed">No partner organisations yet.</Text>
        ) : (
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Organisation</Table.Th>
                <Table.Th>Country</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {partnerOrgs.map((p) => (
                <Table.Tr key={p.id}>
                  <Table.Td>{p.organisation_name}</Table.Td>

                  {/* Country + flag */}
                  <Table.Td>
                    {p.country_code ? (
                      <Group gap={8}>
                        <CountryFlag code={p.country_code} size={20} />
                        <Text>{p.country_code}</Text>
                      </Group>
                    ) : (
                      <Text c="dimmed">—</Text>
                    )}
                  </Table.Td>

                  <Table.Td>
                    {new Date(p.created_at).toLocaleString()}
                  </Table.Td>

                  <Table.Td>
                    <Button
                      size="xs"
                      variant="subtle"
                      color="red"
                      onClick={() => deletePartnerOrg(p.id)}
                    >
                      Delete
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </Stack>
  );
}
