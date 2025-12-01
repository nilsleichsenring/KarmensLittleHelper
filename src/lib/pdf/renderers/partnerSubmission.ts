// src/lib/pdf/renderers/partnerSubmission.ts
import { PdfEngine, cleanText } from "../pdfEngine";

export async function renderPartnerSubmission(pdf: PdfEngine, data: {
  submission: any;
  participants: any[];
  tickets: any[];
}) {

  const { submission, participants, tickets } = data;

  pdf.title("Travel Reimbursement Claim");

  pdf.field("Organisation:", `${submission.organisation_name} (${submission.country_code})`);
  pdf.field("Contact:", cleanText(
    [submission.contact_name, submission.contact_email].filter(Boolean).join(" - ")
  ));

  pdf.line();
  pdf.subtitle("Bank details");

  pdf.field("Account holder:", submission.account_holder);
  pdf.field("IBAN:", submission.iban);
  pdf.field("BIC:", submission.bic);

  pdf.line();
  pdf.subtitle("Participants");

  if (participants.length === 0) {
    pdf.paragraph("None");
  } else {
    pdf.list(participants.map(p => p.full_name));
  }

  pdf.line();
  pdf.subtitle("Tickets (overview)");

  tickets.forEach((t, i) => {
    pdf.paragraph(
      `${i + 1}. ${t.from_location} -> ${t.to_location} (${t.amount_eur.toFixed(2)} EUR)\nParticipants: ${t.assigned_participants.join(", ") || "-"}`
    );
  });

  // Attach pages
  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i];
    await pdf.attachTicketPdf({
      file_url: t.file_url,
      label: `Ticket ${i + 1} of ${tickets.length}`,
      meta: `${t.from_location} -> ${t.to_location} (${t.amount_eur.toFixed(2)} EUR)`,
    });
  }
}
