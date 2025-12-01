import {
  Card,
  Stack,
  Select,
  Button,
  Text,
  Table,
  Group,
} from "@mantine/core";

import type { ProjectCountry, CountryRef } from "../types";
import { CountryFlag } from "../../../../components/CountryFlag";

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
  // Dropdown options (exclude already selected countries)
  const availableCountryOptions = allCountries
    .filter((c) => !countries.some((pc) => pc.country_code === c.code))
    .map((c) => ({
      value: c.code,
      label: `${c.name} (${c.code})`,
    }));

  return (
    <Stack gap="lg">
      {/* ---------------------------------------------------
          ADD COUNTRY
      --------------------------------------------------- */}
      <Card withBorder radius="md" p="lg" maw={500}>
        <Text fw={600}>Add country</Text>

        <Stack mt="sm">
          <Select
            label="Country"
            placeholder="Select country"
            searchable
            data={availableCountryOptions}
            value={newCountry}
            onChange={(v) => setNewCountry(v || "")}
            withAsterisk
            disabled={availableCountryOptions.length === 0}
            // ---------- SVG Flag inside dropdown ----------
            renderOption={({ option }) => (
              <Group gap={8}>
                <CountryFlag code={option.value} size={18} />
                <Text>{option.label}</Text>
              </Group>
            )}
            rightSection={
              newCountry ? <CountryFlag code={newCountry} size={20} /> : null
            }
          />

          <Button onClick={addCountry} disabled={!newCountry}>
            Add
          </Button>
        </Stack>
      </Card>

      {/* ---------------------------------------------------
          LIST OF COUNTRIES
      --------------------------------------------------- */}
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
                  <Table.Td>
                    <Group gap={8}>
                      <CountryFlag code={c.country_code} size={20} />
                      <Text>{getCountryLabel(c.country_code)}</Text>
                    </Group>
                  </Table.Td>

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
