import { type ProjectPartnerOrg } from "../types";
import { Button, Card, Stack, Table, Text, TextInput, Select } from "@mantine/core";

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
      {/* Add partner org */}
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
          />

          <Button onClick={addPartnerOrg}>
            Add organisation
          </Button>
        </Stack>
      </Card>

      {/* List partner orgs */}
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
                  <Table.Td>{p.country_code || "—"}</Table.Td>
                  <Table.Td>{new Date(p.created_at).toLocaleString()}</Table.Td>
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
