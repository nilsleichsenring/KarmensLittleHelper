import {
  Card,
  Stack,
  Select,
  Button,
  Text,
  Table,
} from "@mantine/core";
import type { ProjectCountry, CountryRef } from "../types";



type Props = {
  countries: ProjectCountry[];
  allCountries: CountryRef[];
  newCountry: string;
  setNewCountry: (v: string) => void;
  addCountry: () => void;
  deleteCountry: (id: string) => void;
  getCountryLabel: (code: string | null) => string;
};

export function CountryTab({
  countries,
  allCountries,
  newCountry,
  setNewCountry,
  addCountry,
  deleteCountry,
  getCountryLabel,
}: Props) {
  const availableCountryOptions = allCountries
    .filter((c) => !countries.some((pc) => pc.country_code === c.code))
    .map((c) => ({
      value: c.code,
      label: `${c.name} (${c.code})`,
    }));

  return (
    <Stack gap="lg">
      {/* Add Country */}
      <Card withBorder radius="md" p="lg" maw={500}>
        <Text fw={600}>Add country</Text>

        <Stack mt="sm">
          <Select
            label="Country"
            data={availableCountryOptions}
            value={newCountry}
            onChange={(v) => setNewCountry(v || "")}
            searchable
            withAsterisk
            disabled={availableCountryOptions.length === 0}
          />

          <Button onClick={addCountry} disabled={!newCountry}>
            Add
          </Button>
        </Stack>
      </Card>

      {/* List Countries */}
      <Card withBorder radius="md" p="lg">
        {countries.length === 0 ? (
          <Text c="dimmed">No countries added yet.</Text>
        ) : (
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Country</Table.Th>
                <Table.Th>Added</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {countries.map((c) => (
                <Table.Tr key={c.id}>
                  <Table.Td>{getCountryLabel(c.country_code)}</Table.Td>
                  <Table.Td>
                    {new Date(c.created_at).toLocaleString()}
                  </Table.Td>
                  <Table.Td>
                    <Button
                      size="xs"
                      variant="subtle"
                      color="red"
                      onClick={() => deleteCountry(c.id)}
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
