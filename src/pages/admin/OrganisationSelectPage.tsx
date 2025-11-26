import { Card, Grid, Title, Text, Button, Stack } from "@mantine/core";
import { useNavigate } from "react-router-dom";

export function OrganisationSelectPage() {
  const navigate = useNavigate();

  const organisations = [
    { id: "ambitia", name: "Ambitia Institute" },
    { id: "jka", name: "Jugendkulturarbeit" },
  ];

  function handleSelect(id: string) {
    localStorage.setItem("organisation_id", id);
    navigate("/admin/projects");
  }

  return (
    <Stack justify="center" align="center" p="xl">
      <Title order={2} mb="md">
        Select your organisation
      </Title>

      <Grid w="100%" maw={500}>
        {organisations.map((org) => (
          <Grid.Col key={org.id} span={12}>
            <Card
              withBorder
              padding="lg"
              radius="md"
              shadow="sm"
              onClick={() => handleSelect(org.id)}
              style={{
                cursor: "pointer",
                transition: "0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <Stack align="flex-start">
                <Title order={4}>{org.name}</Title>

                <Text size="sm" c="dimmed">
                  Click to continue as {org.name}
                </Text>

                <Button
                  variant="light"
                  onClick={(e) => {
                    e.stopPropagation(); // verhindert doppelten Click
                    handleSelect(org.id);
                  }}
                >
                  Select
                </Button>
              </Stack>
            </Card>
          </Grid.Col>
        ))}
      </Grid>
    </Stack>
  );
}

export default OrganisationSelectPage;
