// src/lib/pdf/renderers/adminSubmission.ts
import { PdfEngine, cleanText } from "../pdfEngine";

type Participant = {
  full_name: string;
  is_green_travel: boolean | null;
};

export async function renderAdminSubmission(
  pdf: PdfEngine,
  data: {
    submission: {
      organisation_name: string;
      country_code: string;
      submitted_at: string | null;
      reviewed_at: string | null;
      claim_status: "open" | "approved" | "adjusted";
    };
    participants: Participant[];
    tickets: {
      from_location: string;
      to_location: string;
      amount_eur: number;
      file_url: string | null;
      assigned_participants: string[];
    }[];
    project: {
      name: string;
      start_date: string | null;
      end_date: string | null;
      project_reference: string | null;
    };
    rates: {
      standard: number;
      green: number;
    };
  }
) {
  const { submission, participants, tickets, project, rates } = data;

  // ---------------------------------------------------
  // HEADER
  // ---------------------------------------------------
  pdf.title("Travel Reimbursement – Admin Review");

  // ---------------------------------------------------
  // PROJECT
  // ---------------------------------------------------
  pdf.subtitle("Project");
  pdf.field("Project:", cleanText(project.name));
  pdf.field("Reference:", cleanText(project.project_reference || "—"));

  let dateLine = "—";
  if (project.start_date && project.end_date) {
    dateLine = `${project.start_date} → ${project.end_date}`;
  } else if (project.start_date) {
    dateLine = `from ${project.start_date}`;
  } else if (project.end_date) {
    dateLine = `until ${project.end_date}`;
  }
  pdf.field("Dates:", cleanText(dateLine));
  pdf.line();

  // ---------------------------------------------------
  // SUBMISSION META
  // ---------------------------------------------------
  pdf.subtitle("Submission");

  pdf.field(
    "Organisation:",
    `${cleanText(submission.organisation_name)} (${cleanText(
      submission.country_code
    )})`
  );

  if (submission.submitted_at) {
    pdf.field("Submitted at:", new Date(submission.submitted_at).toLocaleString());
  }

  if (submission.reviewed_at) {
    pdf.field("Reviewed at:", new Date(submission.reviewed_at).toLocaleString());
  }

  const statusLabel =
    submission.claim_status === "approved"
      ? "Approved"
      : submission.claim_status === "adjusted"
      ? "Approved with changes"
      : "Open (not reviewed)";

  pdf.field("Status:", statusLabel);
  pdf.line();

  // ---------------------------------------------------
  // RATES (what admin used)
  // ---------------------------------------------------
  pdf.subtitle("Rates used (from partner organisation)");
  pdf.field("Standard rate:", `${Number(rates.standard || 0).toFixed(2)} EUR`);
  pdf.field("Green rate:", `${Number(rates.green || 0).toFixed(2)} EUR`);
  pdf.line();

  // ---------------------------------------------------
  // CLAIMED TOTAL (Tickets)
  // ---------------------------------------------------
  const claimedTotal = tickets.reduce((sum, t) => sum + (t.amount_eur || 0), 0);

  pdf.subtitle("Claimed amount (submitted)");
  pdf.field("Tickets:", `${tickets.length}`);
  pdf.field("Total claimed:", `${claimedTotal.toFixed(2)} EUR`);
  pdf.line();

  // ---------------------------------------------------
  // APPROVED TOTAL (Participants × Rates)
  // ---------------------------------------------------
  let approvedTotal = 0;
  let greenCount = 0;
  let standardCount = 0;

  participants.forEach((p) => {
    // Fallback: wenn null/undefined => Standard
    const isGreen = !!p.is_green_travel;

    if (isGreen) {
      approvedTotal += rates.green || 0;
      greenCount++;
    } else {
      approvedTotal += rates.standard || 0;
      standardCount++;
    }
  });

  pdf.subtitle("Approved amount (after admin review)");
  pdf.field("Participants total:", `${participants.length}`);
  pdf.field("Breakdown:", `${greenCount} × Green, ${standardCount} × Standard`);
  pdf.field("Approved total:", `${approvedTotal.toFixed(2)} EUR`);
  pdf.line();

  // ---------------------------------------------------
  // DIFFERENCE
  // ---------------------------------------------------
  const diff = claimedTotal - approvedTotal;

  pdf.subtitle("Claimed vs approved");
  pdf.field("Claimed (submitted):", `${claimedTotal.toFixed(2)} EUR`);
  pdf.field("Approved (max allowed):", `${approvedTotal.toFixed(2)} EUR`);
  pdf.field("Claimed − Approved:", `${diff.toFixed(2)} EUR`);

  if (diff > 0) {
    pdf.paragraph("⚠ Overclaimed: claimed amount exceeds approved maximum.");
  } else if (diff < 0) {
    pdf.paragraph("ℹ Below maximum: claimed amount is below approved maximum.");
  } else {
    pdf.paragraph("✓ Exact match: claimed amount equals approved maximum.");
  }

  pdf.line();

  // ---------------------------------------------------
  // PARTICIPANTS (APPROVED STATE)
  // ---------------------------------------------------
  pdf.subtitle("Participants (approved travel type)");

  if (participants.length === 0) {
    pdf.paragraph("None");
  } else {
    participants.forEach((p) => {
      pdf.paragraph(
        `• ${cleanText(p.full_name)} – ${
          p.is_green_travel ? "Green travel" : "Standard travel"
        }`
      );
    });
  }

  pdf.line();

  // ---------------------------------------------------
  // TICKETS (CLAIMED)
  // ---------------------------------------------------
  pdf.subtitle("Tickets (claimed)");

  if (tickets.length === 0) {
    pdf.paragraph("No tickets submitted.");
  } else {
    tickets.forEach((t, i) => {
      pdf.paragraph(
        `${i + 1}. ${cleanText(t.from_location)} → ${cleanText(
          t.to_location
        )} – ${t.amount_eur.toFixed(2)} EUR`
      );
    });
  }

  // ---------------------------------------------------
  // ATTACHMENTS
  // ---------------------------------------------------
  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i];

    await pdf.attachTicketPdf({
      file_url: t.file_url,
      label: `Ticket ${i + 1}`,
      meta: `${cleanText(t.from_location)} → ${cleanText(
        t.to_location
      )} (${t.amount_eur.toFixed(2)} EUR)`,
    });
  }
}
