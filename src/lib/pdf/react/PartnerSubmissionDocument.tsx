import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

// --------------------------------------------------
// Styles
// --------------------------------------------------
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111111",
  },

  section: {
    marginBottom: 16,
  },

  title: {
    fontSize: 17,
    marginBottom: 12,
    fontWeight: "bold",
  },

  subtitle: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: "bold",
  },

  row: {
    flexDirection: "row",
    marginBottom: 4,
    alignItems: "flex-start",
  },

  label: {
    width: 140,
    fontWeight: "bold",
  },

  value: {
    flex: 1,
  },

  divider: {
    marginVertical: 10,
    borderBottom: "1 solid #BDBDBD",
  },

  tableHeader: {
    flexDirection: "row",
    borderBottom: "1.5 solid #222222",
    paddingBottom: 6,
    marginBottom: 8,
    fontWeight: "bold",
  },

  tableRow: {
    flexDirection: "row",
    marginBottom: 6,
    alignItems: "flex-start",
  },

  colNo: {
    width: 24,
  },

  colName: {
    width: 180,
    paddingRight: 8,
  },

  colTravelType: {
    width: 120,
  },

  colRoute: {
    flex: 1,
    paddingRight: 10,
  },

  colMode: {
    width: 60,
  },

  colType: {
    width: 70,
  },

  colAmount: {
    width: 80,
    textAlign: "right",
  },

  ticketParticipantsRow: {
    marginBottom: 10,
    paddingLeft: 24,
  },

  ticketParticipantsText: {
    fontSize: 10,
    color: "#333333",
  },

  summaryBox: {
    marginTop: 6,
    paddingTop: 6,
  },

  summaryText: {
    fontSize: 12,
    fontWeight: "bold",
  },

  muted: {
    color: "#666666",
  },

  greenText: {
    color: "#2b8a3e",
    fontWeight: "bold",
  },

  standardText: {
    color: "#111111",
    fontWeight: "bold",
  },
});

// --------------------------------------------------
// Component
// --------------------------------------------------
export function PartnerSubmissionDocument({
  submission,
  project,
  participants,
  tickets,
}: {
  submission: any;
  project: any;
  participants: any[];
  tickets: any[];
}) {
  const total = (tickets || []).reduce(
    (sum: number, t: any) => sum + Number(t.amount_eur || 0),
    0
  );

  const organisationAddress = joinAddressLines([
    submission?.address_line1,
    submission?.address_line2,
    joinInline([submission?.address_postal_code, submission?.address_city]),
    submission?.address_region,
  ]);

  const useOrgAddress =
    submission?.use_org_address_for_bank ??
    submission?.use_org_address_for_account_holder ??
    false;

  const accountHolder =
    submission?.account_holder ||
    (useOrgAddress ? submission?.organisation_name : null) ||
    "-";

  const accountHolderAddress = useOrgAddress
    ? organisationAddress
    : joinAddressLines([
        submission?.bank_address_line1 ??
          submission?.account_holder_address_line1,
        submission?.bank_address_line2 ??
          submission?.account_holder_address_line2,
        joinInline([
          submission?.bank_address_postal_code ??
            submission?.account_holder_address_postal_code,
          submission?.bank_address_city ??
            submission?.account_holder_address_city,
        ]),
        submission?.bank_address_region ??
          submission?.account_holder_address_region,
      ]);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.section}>
          <Text style={styles.title}>Travel Reimbursement Claim</Text>

          {project && (
            <>
              <FieldRow label="Project:" value={project.name || "-"} />

              {project.project_reference && (
                <FieldRow
                  label="Reference:"
                  value={project.project_reference}
                />
              )}

              {(project.start_date || project.end_date) && (
                <FieldRow
                  label="Project period:"
                  value={formatDateRange(project.start_date, project.end_date)}
                />
              )}
            </>
          )}

          {submission?.submitted_at && (
            <FieldRow
              label="Submitted:"
              value={new Date(submission.submitted_at).toLocaleString()}
            />
          )}
        </View>

        <View style={styles.divider} />

        {/* ORGANISATION */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>Organisation</Text>

          <FieldRow
            label="Name:"
            value={`${submission?.organisation_name || "-"} (${
              submission?.country_code || "-"
            })`}
          />

          <FieldRow label="Address:" value={organisationAddress || "-"} />
        </View>

        <View style={styles.divider} />

        {/* CONTACT */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>Contact person</Text>

          <FieldRow label="Name:" value={submission?.contact_name || "-"} />
          <FieldRow label="Email:" value={submission?.contact_email || "-"} />

          {submission?.contact_phone && (
            <FieldRow label="Phone:" value={submission.contact_phone} />
          )}
        </View>

        <View style={styles.divider} />

        {/* BANK */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>Bank details</Text>

          <FieldRow label="Account holder:" value={accountHolder} />
          <FieldRow label="IBAN:" value={submission?.iban || "-"} />
          <FieldRow label="BIC:" value={submission?.bic || "-"} />

          {submission?.bank_name && (
            <FieldRow label="Bank:" value={submission.bank_name} />
          )}

          {submission?.bank_country && (
            <FieldRow label="Bank country:" value={submission.bank_country} />
          )}

          <FieldRow
            label="Account holder address:"
            value={accountHolderAddress || "-"}
          />
        </View>

        <View style={styles.divider} />

        {/* PARTICIPANTS */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>Participants</Text>

          <View style={styles.tableHeader}>
            <Text style={styles.colNo}>#</Text>
            <Text style={styles.colName}>Name</Text>
            <Text style={styles.colTravelType}>Travel type</Text>
          </View>

          {participants && participants.length > 0 ? (
            participants.map((p: any, index: number) => {
              const isGreen = !!p.is_green_travel;

              return (
                <View style={styles.tableRow} key={p.id ?? index}>
                  <Text style={styles.colNo}>{index + 1}</Text>
                  <Text style={styles.colName}>{p.full_name || "-"}</Text>
                  <Text
                    style={
                      isGreen
                        ? [styles.colTravelType, styles.greenText]
                        : [styles.colTravelType, styles.standardText]
                    }
                  >
                    {isGreen ? "GREEN" : "STANDARD"}
                  </Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.muted}>No participants provided.</Text>
          )}
        </View>

        <View style={styles.divider} />

        {/* TICKETS */}
        <View style={styles.section}>
          <Text style={styles.subtitle}>Tickets</Text>

          <View style={styles.tableHeader}>
            <Text style={styles.colNo}>#</Text>
            <Text style={styles.colRoute}>Route</Text>
            <Text style={styles.colMode}>Mode</Text>
            <Text style={styles.colType}>Type</Text>
            <Text style={styles.colAmount}>Amount</Text>
          </View>

          {tickets && tickets.length > 0 ? (
            tickets.map((t: any, index: number) => (
              <View key={t.id ?? index} wrap={false}>
                <View style={styles.tableRow}>
                  <Text style={styles.colNo}>{index + 1}</Text>

                  <Text style={styles.colRoute}>
                   {t.from_location || "-"} {"-->"} {t.to_location || "-"}
                  </Text>

                  <Text style={styles.colMode}>
                    {formatTravelMode(t.travel_mode)}
                  </Text>

                  <Text style={styles.colType}>
                    {formatTripType(t.trip_type)}
                  </Text>

                  <Text style={styles.colAmount}>{formatAmount(t)}</Text>
                </View>

                <View style={styles.ticketParticipantsRow}>
                  <Text style={styles.ticketParticipantsText}>
                    Participants:{" "}
                    {t.assigned_participants?.length
                      ? t.assigned_participants.join(", ")
                      : "-"}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>No tickets submitted.</Text>
          )}
        </View>

        <View style={styles.divider} />

        {/* SUMMARY */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.subtitle}>Summary</Text>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>
              Total reimbursement claimed: {total.toFixed(2)} EUR
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

// --------------------------------------------------
// Small helper component
// --------------------------------------------------
function FieldRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const lines = String(value || "-").split("\n");

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.value}>
        {lines.map((line, index) => (
          <Text key={`${label}-${index}`}>{line || " "}</Text>
        ))}
      </View>
    </View>
  );
}

// --------------------------------------------------
// Helpers
// --------------------------------------------------
function joinInline(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function joinAddressLines(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join("\n");
}

function formatDateRange(start: string | null, end: string | null) {
  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  if (end) return end;
  return "-";
}

function formatTripType(tt: string | null) {
  if (!tt) return "—";

  switch (tt) {
    case "oneway":
      return "One-way";
    case "return":
      return "Return";
    case "roundtrip":
      return "Roundtrip";
    default:
      return "—";
  }
}

function formatTravelMode(mode: string | null) {
  if (!mode) return "—";

  switch (mode) {
    case "flight":
      return "Plane";
    case "train":
      return "Train";
    case "bus":
      return "Bus";
    case "car":
      return "Car";
    case "carpooling":
      return "Carpool";
    case "ship":
      return "Ship";
    default:
      return "Other";
  }
}

function formatAmount(ticket: {
  currency?: string | null;
  amount_original?: number | null;
  amount_eur?: number | null;
}) {
  const eur = Number(ticket.amount_eur || 0);

  if (
    !ticket.currency ||
    ticket.currency === "EUR" ||
    ticket.amount_original == null
  ) {
    return `${eur.toFixed(2)} EUR`;
  }

  return `${eur.toFixed(2)} EUR`;
}