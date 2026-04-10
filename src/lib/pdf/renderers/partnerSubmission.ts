// src/lib/pdf/renderers/partnerSubmission.ts

import { PdfEngine } from "../pdfEngine";

export async function renderPartnerSubmission(
  pdf: PdfEngine,
  data: {
    submission: any;
    project: any;
    participants: any[];
    tickets: any[];
  }
) {
  const { submission, project, participants, tickets } = data;

  // ---------------------------------------------------------
  // HEADER
  // ---------------------------------------------------------
  pdf.title("Travel Reimbursement Claim");

  if (project) {
    pdf.field("Project:", project.name || "-");

    if (project.project_reference) {
      pdf.field("Reference:", project.project_reference);
    }
  }

  if (submission.submitted_at) {
    pdf.field(
      "Submitted:",
      new Date(submission.submitted_at).toLocaleString()
    );
  }

  pdf.spacer();

  // ---------------------------------------------------------
  // ORGANISATION
  // ---------------------------------------------------------
  pdf.line();
  pdf.subtitle("Organisation");

  pdf.field(
    "Name:",
    `${submission.organisation_name} (${submission.country_code})`
  );

  const orgAddress = [
    submission.address_line1,
    submission.address_line2,
    [submission.address_postal_code, submission.address_city]
      .filter(Boolean)
      .join(" "),
    submission.address_region,
  ]
    .filter(Boolean)
    .join("\n");

  if (orgAddress) {
    pdf.field("Address:", orgAddress);
  }

  pdf.spacer();

  // ---------------------------------------------------------
  // CONTACT
  // ---------------------------------------------------------
  pdf.line();
  pdf.subtitle("Contact person");

  pdf.field("Name:", submission.contact_name || "-");
  pdf.field("Email:", submission.contact_email || "-");

  if (submission.contact_phone) {
    pdf.field("Phone:", submission.contact_phone);
  }

  pdf.spacer();

  // ---------------------------------------------------------
  // BANK DETAILS
  // ---------------------------------------------------------
  pdf.line();
  pdf.subtitle("Bank details");

  const useOrgAddress =
    submission.use_org_address_for_bank ??
    submission.use_org_address_for_account_holder ??
    false;

  const accountHolder =
    submission.account_holder ||
    (useOrgAddress ? submission.organisation_name : "-");

  pdf.field("Account holder:", accountHolder || "-");
  pdf.field("IBAN:", submission.iban || "-");
  pdf.field("BIC:", submission.bic || "-");

  if (submission.bank_name) {
    pdf.field("Bank:", submission.bank_name);
  }

  if (submission.bank_country) {
    pdf.field("Bank country:", submission.bank_country);
  }

  const address = useOrgAddress
    ? {
        line1: submission.address_line1,
        line2: submission.address_line2,
        postal: submission.address_postal_code,
        city: submission.address_city,
        region: submission.address_region,
      }
    : {
        line1:
          submission.bank_address_line1 ??
          submission.account_holder_address_line1,
        line2:
          submission.bank_address_line2 ??
          submission.account_holder_address_line2,
        postal:
          submission.bank_address_postal_code ??
          submission.account_holder_address_postal_code,
        city:
          submission.bank_address_city ??
          submission.account_holder_address_city,
        region:
          submission.bank_address_region ??
          submission.account_holder_address_region,
      };

  const accountAddress = [
    address.line1,
    address.line2,
    [address.postal, address.city].filter(Boolean).join(" "),
    address.region,
  ]
    .filter(Boolean)
    .join("\n");

  if (accountAddress) {
    pdf.field("Account holder address:", accountAddress);
  }

  pdf.spacer();

  // ---------------------------------------------------------
  // PARTICIPANTS
  // ---------------------------------------------------------
  pdf.line();
  pdf.subtitle("Participants");

  if (!participants || participants.length === 0) {
    pdf.paragraph("No participants provided.");
  } else {
    pdf.paragraph(
      `${"#".padEnd(4)}${"Participant name".padEnd(30)}${"Travel type"}`
    );
    pdf.paragraph("----------------------------------------------------");

    participants.forEach((p: any, index: number) => {
      const travelType = p.is_green_travel ? "GREEN" : "STANDARD";
      const participantName = String(p.full_name || "-").slice(0, 28);

      pdf.paragraph(
        `${String(index + 1).padEnd(4)}${participantName.padEnd(
          30
        )}${travelType}`
      );
    });
  }

  pdf.spacer();

  // ---------------------------------------------------------
  // TICKETS
  // ---------------------------------------------------------
  pdf.line();
  pdf.subtitle("Tickets");

  if (!tickets || tickets.length === 0) {
    pdf.paragraph("No tickets submitted.");
  } else {
    pdf.paragraph(
      `${"#".padEnd(4)}${"Route".padEnd(36)}${"Mode".padEnd(
        12
      )}${"Type".padEnd(14)}Amount`
    );
    pdf.paragraph(
      "--------------------------------------------------------------------------"
    );

    tickets.forEach((t: any, index: number) => {
      const route = `${t.from_location} -> ${t.to_location}`.slice(0, 34);
      const amount = `${Number(t.amount_eur || 0).toFixed(2)} EUR`;

      pdf.paragraph(
        `${String(index + 1).padEnd(4)}${route.padEnd(36)}${formatTravelMode(
          t.travel_mode
        ).padEnd(12)}${formatTripType(t.trip_type).padEnd(14)}${amount.padStart(
          10
        )}`
      );

      pdf.paragraph(
        `     Participants: ${t.assigned_participants?.join(", ") || "-"}`
      );
    });
  }

  pdf.spacer();

  // ---------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------
  const total = (tickets || []).reduce(
    (sum: number, t: any) => sum + (t.amount_eur || 0),
    0
  );

  pdf.line();
  pdf.subtitle("Summary");
  pdf.field("Total reimbursement claimed:", `${total.toFixed(2)} EUR`);

  // ---------------------------------------------------------
  // ATTACHMENTS
  // ---------------------------------------------------------
  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i];

    if (!t.file_url) continue;

    await pdf.attachTicketPdf({
      file_url: t.file_url ?? null,
      label: `Ticket ${i + 1} of ${tickets.length}`,
      meta: `${t.from_location} -> ${t.to_location} (${t.amount_eur.toFixed(
        2
      )} EUR)`,
    });
  }
}

// ---------------------------------------------------------
// HELPERS
// ---------------------------------------------------------
function formatTripType(tt: string | null) {
  if (!tt) return "—";
  if (tt === "oneway") return "One-way";
  if (tt === "return") return "Return";
  if (tt === "roundtrip") return "Roundtrip";
  return "—";
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