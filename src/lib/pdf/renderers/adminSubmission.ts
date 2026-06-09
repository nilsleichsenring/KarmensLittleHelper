// src/lib/pdf/renderers/adminSubmission.ts
import { PdfEngine, cleanText } from "../pdfEngine";

type Participant = {
  id: string;
  full_name: string;
  travel_type: "green" | "standard";
};

type AdminPdfTicket = {
  from_location: string;
  to_location: string;
  amount_eur: number;
  file_url: string | null;
  travel_mode?: string | null;
  review_decision?: "approved" | "rejected" | null;
  reviewed_at?: string | null;
  assigned_participants?: string[];
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function formatEur(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return `${Number(value).toFixed(2)} EUR`;
}

function getStatusLabel(status: "open" | "approved" | "adjusted" | "rejected") {
  switch (status) {
    case "approved":
      return "Approved";

    case "adjusted":
      return "Partially approved";

    case "rejected":
      return "Rejected";

    case "open":
    default:
      return "Open";
  }
}

function getTicketDecisionLabel(
  decision: "approved" | "rejected" | null | undefined
) {
  switch (decision) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return "Not reviewed";
  }
}

export async function renderAdminSubmission(
  pdf: PdfEngine,
  data: {
    submission: {
      organisation_name: string;
      country_code: string;
      submitted_at: string | null;
      reviewed_at: string | null;
      claim_status: "open" | "approved" | "adjusted" | "rejected";
      approved_amount_eur: number | null;
      rejection_reason: string | null;
      payment_status: "unpaid" | "paid";
      payment_paid_at: string | null;
    };
      participants: Participant[];
      tickets: AdminPdfTicket[];

      summary: {
        claimedAmount: number;
        approvedTicketsAmount: number;
        eligibleAmount: number | null;
        amountToApprove: number;
        standardParticipantsCount: number;
        greenParticipantsCount: number;
      };

    project: {
      name: string;
      start_date: string | null;
      end_date: string | null;
      project_reference: string | null;
      organisations?: {
        name: string;
        country_code: string;
      } | null;
    };
    rates: {
      standard: number;
      green: number;
    };
  }
) {
  const {
    submission,
    participants,
    tickets,
    summary,
    project,
    rates,
  } = data;

  const finalApprovedAmount =
    submission.approved_amount_eur ??
    (submission.claim_status === "open" ? null : 0);

  const claimedTotal = summary.claimedAmount;

  const approvedTicketsTotal = summary.approvedTicketsAmount;

  const eligibleAmount = summary.eligibleAmount;

  const greenCount = summary.greenParticipantsCount;

  const standardCount = summary.standardParticipantsCount;

  // removed: balance is intentionally not shown in this summary PDF

  pdf.title("Travel Reimbursement Claim Summary");

  pdf.subtitle("Project information");
  pdf.field("Project:", cleanText(project.name));
  pdf.field("Reference:", cleanText(project.project_reference || "—"));

  let dateLine = "—";
  if (project.start_date && project.end_date) {
    dateLine = `${project.start_date} -> ${project.end_date}`;
  } else if (project.start_date) {
    dateLine = `from ${project.start_date}`;
  } else if (project.end_date) {
    dateLine = `until ${project.end_date}`;
  }

  pdf.field("Dates:", cleanText(dateLine));

  pdf.field(
    "Host organisation:",
    project.organisations
      ? `${cleanText(project.organisations.name)} (${cleanText(
          project.organisations.country_code
        )})`
      : "—"
  );

  pdf.line();

  pdf.subtitle("Claim information");
  pdf.field(
    "Partner organisation:",
    `${cleanText(submission.organisation_name)} (${cleanText(
      submission.country_code
    )})`
  );

  pdf.field("Submitted on:", formatDateTime(submission.submitted_at));
  pdf.field("Reviewed on:", formatDateTime(submission.reviewed_at));
  pdf.line();

  pdf.subtitle("Financial summary");
  pdf.field("Claimed amount:", formatEur(claimedTotal));
  pdf.field("Approved tickets amount:", formatEur(approvedTicketsTotal));
  pdf.field("Eligible amount:", formatEur(eligibleAmount));
  pdf.field("Final approved amount:", formatEur(finalApprovedAmount));
  pdf.line();

  pdf.subtitle("Rates used");
  pdf.field("Standard rate:", formatEur(rates.standard));
  pdf.field("Green rate:", formatEur(rates.green));
  pdf.field(
    "Participant breakdown:",
    `${greenCount} green, ${standardCount} standard`
  );
  pdf.line();

  pdf.subtitle("Participants and travel type");

  if (participants.length === 0) {
    pdf.paragraph("None");
  } else {
    participants.forEach((participant) => {
      pdf.paragraph(
        `- ${cleanText(participant.full_name)} - ${
          participant.travel_type === "green" ? "Green travel" : "Standard travel"
        }`
      );
    });
  }

  pdf.line();

  pdf.subtitle("Tickets and supporting documents");

  if (tickets.length === 0) {
    pdf.paragraph("No tickets submitted.");
  } else {
    tickets.forEach((ticket, index) => {
    pdf.paragraph(`Ticket ${index + 1}`);

    pdf.field(
      "Route:",
      `${cleanText(ticket.from_location)} -> ${cleanText(
        ticket.to_location
      )}`
    );

    pdf.field(
      "Travel mode:",
      cleanText(ticket.travel_mode || "—")
    );

    pdf.field(
      "Participants:",
      ticket.assigned_participants?.length
        ? cleanText(ticket.assigned_participants.join(", "))
        : "—"
    );

    pdf.field(
      "Amount:",
      formatEur(ticket.amount_eur)
    );

    pdf.field(
      "Decision:",
      getTicketDecisionLabel(ticket.review_decision)
    );

    if (ticket.reviewed_at) {
      pdf.field(
        "Reviewed on:",
        formatDateTime(ticket.reviewed_at)
      );
    }

    pdf.spacer(1);
    });
  }

  pdf.line();

  pdf.subtitle("Final decision");

  pdf.field("Decision:", getStatusLabel(submission.claim_status));

  pdf.field(
    "Approved amount:",
    formatEur(finalApprovedAmount)
  );

  pdf.field("Payment status:", submission.payment_status);

  if (submission.payment_status === "paid") {
    pdf.field(
      "Paid on:",
      formatDateTime(submission.payment_paid_at)
    );
  }

  if (submission.claim_status === "rejected") {
    pdf.field(
      "Reason for rejection:",
      cleanText(
        submission.rejection_reason || "No rejection reason stored."
      )
    );
  }

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];

    await pdf.attachTicketPdf({
      file_url: ticket.file_url,
      label: `Ticket ${i + 1}`,
      meta: `${cleanText(ticket.from_location)} -> ${cleanText(
        ticket.to_location
      )} (${formatEur(ticket.amount_eur)})`,
    });
  }
}