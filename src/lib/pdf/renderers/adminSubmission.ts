// src/lib/pdf/renderers/adminSubmission.ts
import { PdfEngine, cleanText } from "../pdfEngine";

export async function renderAdminSubmission(
  pdf: PdfEngine,
  data: {
    submission: {
      organisation_name: string;
      country_code: string;
      contact_name: string | null;
      contact_email: string | null;
      submitted_at: string | null;
      account_holder: string | null;
      iban: string | null;
      bic: string | null;
    };
    participants: { full_name: string }[];
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
  }
) {
  const { submission, participants, tickets, project } = data;

  // ---------------------------------------------------
  // HEADER
  // ---------------------------------------------------
  pdf.title("Travel Reimbursement Claim");

  // ---------------------------------------------------
  // PROJECT INFO
  // ---------------------------------------------------
  pdf.subtitle("Project information");
  pdf.field("Project:", cleanText(project.name));

  // Dates
  let dateLine = "-";
  if (project.start_date && project.end_date) {
    dateLine = `${project.start_date} -> ${project.end_date}`;
  } else if (project.start_date) {
    dateLine = `from ${project.start_date}`;
  } else if (project.end_date) {
    dateLine = `until ${project.end_date}`;
  }
  pdf.field("Dates:", cleanText(dateLine));

  pdf.field("Reference no.:", cleanText(project.project_reference || "-"));

  pdf.line();

  // ---------------------------------------------------
  // ORGANISATION
  // ---------------------------------------------------
  pdf.subtitle("Organisation");

  pdf.field(
    "Organisation:",
    `${cleanText(submission.organisation_name)} (${cleanText(
      submission.country_code
    )})`
  );

  pdf.field(
    "Contact:",
    cleanText(
      [submission.contact_name, submission.contact_email]
        .filter(Boolean)
        .join(" - ")
    )
  );

  if (submission.submitted_at) {
    const s = new Date(submission.submitted_at).toLocaleString();
    pdf.field("Submitted at:", cleanText(s));
  }

  pdf.line();

  // ---------------------------------------------------
  // BANK DETAILS
  // ---------------------------------------------------
  pdf.subtitle("Bank details");

  pdf.field("Account holder:", cleanText(submission.account_holder));
  pdf.field("IBAN:", cleanText(submission.iban));
  pdf.field("BIC:", cleanText(submission.bic));

  pdf.line();

  // ---------------------------------------------------
  // PARTICIPANTS
  // ---------------------------------------------------
  pdf.subtitle("Participants");

  if (participants.length === 0) {
    pdf.paragraph("None");
  } else {
    pdf.list(participants.map((p) => cleanText(p.full_name)));
  }

  pdf.line();

  // ---------------------------------------------------
  // TICKETS OVERVIEW
  // ---------------------------------------------------
  pdf.subtitle("Tickets (overview)");

  if (tickets.length === 0) {
    pdf.paragraph("No tickets.");
  } else {
    tickets.forEach((t, i) => {
      pdf.paragraph(
        `${i + 1}. ${cleanText(t.from_location)} -> ${cleanText(
          t.to_location
        )} (${t.amount_eur.toFixed(2)} EUR)\nParticipants: ${
          t.assigned_participants.length
            ? cleanText(t.assigned_participants.join(", "))
            : "-"
        }`
      );
    });
  }

  // ---------------------------------------------------
  // ATTACH TICKET PDFs
  // ---------------------------------------------------
  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i];

    await pdf.attachTicketPdf({
      file_url: t.file_url,
      label: `Ticket ${i + 1} of ${tickets.length}`,
      meta: `${cleanText(t.from_location)} -> ${cleanText(
        t.to_location
      )} (${t.amount_eur.toFixed(2)} EUR)${
        t.assigned_participants.length
          ? " | " + cleanText(t.assigned_participants.join(", "))
          : ""
      }`,
    });
  }
}
