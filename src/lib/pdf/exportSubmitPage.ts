// src/lib/pdf/exportSubmitPage.ts
import { supabase } from "../supabaseClient";
import { PDFDocument, StandardFonts } from "pdf-lib";

type SubmissionRow = {
  id: string;
  project_id: string;
  country_code: string;
  organisation_name: string;
  submitted: boolean;
  submitted_at: string | null;
  contact_name: string | null;
  contact_email: string | null;
  iban: string | null;
  bic: string | null;
  account_holder: string | null;
};

type ParticipantRow = {
  id: string;
  full_name: string;
};

type TicketRow = {
  id: string;
  from_location: string;
  to_location: string;
  amount_eur: number;
  file_url: string | null;
};

type TicketParticipantRow = {
  ticket_id: string;
  participant_id: string;
};

// -------------------------------------------------------
// Allow either submission object or just an ID
// -------------------------------------------------------
type SubmissionLike = { id: string } | string;

// =======================================================
// EXPORT FUNCTION
// =======================================================
export async function exportSubmissionPdf(submission: SubmissionLike) {
  const submissionId =
    typeof submission === "string" ? submission : submission.id;

  // ------------------------------------------------------
  // LOAD: Submission
  // ------------------------------------------------------
  const { data: sub, error: subError } = await supabase
    .from("project_partner_submissions")
    .select(
      "id, project_id, country_code, organisation_name, submitted, submitted_at, contact_name, contact_email, iban, bic, account_holder"
    )
    .eq("id", submissionId)
    .single();

  if (subError || !sub) {
    console.error("Could not load submission for PDF export", subError);
    return;
  }

  const submissionRow = sub as SubmissionRow;

  // ------------------------------------------------------
  // LOAD: Participants
  // ------------------------------------------------------
  const { data: partRows, error: partError } = await supabase
    .from("participants")
    .select("id, full_name")
    .eq("project_partner_submission_id", submissionId)
    .order("full_name", { ascending: true });

  if (partError) {
    console.error("Could not load participants", partError);
    return;
  }

  const participants = (partRows || []) as ParticipantRow[];

  // ------------------------------------------------------
  // LOAD: Tickets
  // ------------------------------------------------------
  const { data: ticketRows, error: ticketError } = await supabase
    .from("tickets")
    .select("id, from_location, to_location, amount_eur, file_url")
    .eq("project_partner_submission_id", submissionId)
    .order("created_at", { ascending: true });

  if (ticketError) {
    console.error("Could not load tickets", ticketError);
    return;
  }

  const baseTickets = (ticketRows || []) as TicketRow[];

  // ------------------------------------------------------
  // LOAD: Ticket-Participants
  // ------------------------------------------------------
  let tickets: (TicketRow & { assigned_participants: string[] })[] = [];

  if (baseTickets.length > 0) {
    const ticketIds = baseTickets.map((t) => t.id);

    const { data: tpRows, error: tpError } = await supabase
      .from("ticket_participants")
      .select("ticket_id, participant_id")
      .in("ticket_id", ticketIds);

    if (tpError) {
      console.error("Could not load ticket_participants", tpError);
      return;
    }

    const links = (tpRows || []) as TicketParticipantRow[];
    const nameById = new Map(participants.map((p) => [p.id, p.full_name]));

    tickets = baseTickets.map((t) => {
      const assigned = links
        .filter((l) => l.ticket_id === t.id)
        .map((l) => nameById.get(l.participant_id) || "(unknown)");

      return { ...t, assigned_participants: assigned };
    });
  } else {
    tickets = [];
  }

  // =======================================================
  // CREATE PDF (SUMMARY PAGE)
  // =======================================================
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let page = pdfDoc.addPage([595.28, 841.89]);
  const { height } = page.getSize();
  let y = height - 50;

  const drawLine = () => {
    y -= 15;
    page.drawText("----------------------------------------------", {
      x: 50,
      y,
      size: 10,
      font,
    });
    y -= 20;
  };

  // Title
  page.drawText("Travel Reimbursement Summary", {
    x: 50,
    y,
    size: 18,
    font,
  });
  y -= 30;

  // Organisation
  page.drawText("Organisation:", { x: 50, y, size: 12, font });
  page.drawText(
    `${submissionRow.organisation_name} (${submissionRow.country_code})`,
    { x: 150, y, size: 12, font }
  );
  y -= 20;

  // Contact
  if (submissionRow.contact_name || submissionRow.contact_email) {
    page.drawText("Contact:", { x: 50, y, size: 12, font });
    const line = [submissionRow.contact_name, submissionRow.contact_email]
      .filter(Boolean)
      .join(" - ");
    page.drawText(line || "-", { x: 150, y, size: 12, font });
    y -= 20;
  }

  // Submitted at
  if (submissionRow.submitted_at) {
    const date = new Date(submissionRow.submitted_at);
    page.drawText("Submitted at:", { x: 50, y, size: 12, font });
    page.drawText(date.toLocaleString(), { x: 150, y, size: 12, font });
    y -= 20;
  }

  drawLine();

  // Bank
  page.drawText("Bank details", { x: 50, y, size: 14, font });
  y -= 20;

  page.drawText("Account holder:", { x: 50, y, size: 12, font });
  page.drawText(submissionRow.account_holder || "-", {
    x: 160,
    y,
    size: 12,
    font,
  });
  y -= 18;

  page.drawText("IBAN:", { x: 50, y, size: 12, font });
  page.drawText(submissionRow.iban || "-", { x: 160, y, size: 12, font });
  y -= 18;

  page.drawText("BIC:", { x: 50, y, size: 12, font });
  page.drawText(submissionRow.bic || "-", { x: 160, y, size: 12, font });
  y -= 30;

  drawLine();

  // Participants
  page.drawText("Participants", { x: 50, y, size: 14, font });
  y -= 20;

  if (participants.length === 0) {
    page.drawText("None", { x: 60, y, size: 12, font });
    y -= 20;
  } else {
    for (const p of participants) {
      if (y < 80) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = page.getSize().height - 50;
        page.drawText("Participants (cont.)", {
          x: 50,
          y,
          size: 14,
          font,
        });
        y -= 25;
      }

      page.drawText("- " + p.full_name, {
        x: 60,
        y,
        size: 12,
        font,
      });
      y -= 16;
    }
  }

  y -= 10;
  drawLine();

  // Tickets overview
  page.drawText("Tickets (overview)", { x: 50, y, size: 14, font });
  y -= 20;

  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i];

    if (y < 80) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = page.getSize().height - 50;
      page.drawText("Tickets (cont.)", { x: 50, y, size: 14, font });
      y -= 25;
    }

    const names =
      t.assigned_participants.length > 0
        ? t.assigned_participants.join(", ")
        : "-";

    page.drawText(
      `${i + 1}. ${t.from_location} -> ${t.to_location} (${t.amount_eur.toFixed(
        2
      )} EUR)`,
      { x: 60, y, size: 12, font }
    );
    y -= 16;

    page.drawText(`   Participants: ${names}`, {
      x: 60,
      y,
      size: 11,
      font,
    });
    y -= 18;
  }

  // =======================================================
  // ATTACH TICKET PDFs — SCALED & NO OVERLAP
  // =======================================================

  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i];
    if (!t.file_url) continue;

    // Download PDF
    const { data: fileBlob } = await supabase.storage
      .from("tickets")
      .download(t.file_url);

    if (!fileBlob) continue;

    const fileData = await fileBlob.arrayBuffer();
    const ticketPdf = await PDFDocument.load(fileData);

    const pages = await pdfDoc.copyPages(
      ticketPdf,
      ticketPdf.getPageIndices()
    );

    // First page: add header + scaled PDF
    const origPage = pages[0];
    const { width: pw, height: ph } = origPage.getSize();

    const wrapper = pdfDoc.addPage([pw, ph]);

    // HEADER
    wrapper.drawText(`Ticket ${i + 1} of ${tickets.length}`, {
      x: 40,
      y: ph - 40,
      size: 16,
      font,
    });

    wrapper.drawText(
      `${t.from_location} -> ${t.to_location} (${t.amount_eur.toFixed(2)} EUR)`,
      {
        x: 40,
        y: ph - 60,
        size: 12,
        font,
      }
    );

    if (t.assigned_participants.length > 0) {
      wrapper.drawText(
        `Participants: ${t.assigned_participants.join(", ")}`,
        {
          x: 40,
          y: ph - 80,
          size: 12,
          font,
        }
      );
    }

    // SCALE ORIGINAL PAGE TO 80%
    const scale = 0.8;
    const embed = await wrapper.doc.embedPage(origPage);

    wrapper.drawPage(embed, {
      x: 40,
      y: ph - 80 - 20 - ph * scale,
      width: pw * scale,
      height: ph * scale,
    });

    // Remaining pages: scale them too
    for (let p = 1; p < pages.length; p++) {
      const pg = pages[p];
      const { width: w2, height: h2 } = pg.getSize();
      const newPg = pdfDoc.addPage([w2 * scale, h2 * scale]);
      const embedded = await pdfDoc.embedPage(pg);

      newPg.drawPage(embedded, {
        x: 0,
        y: 0,
        width: w2 * scale,
        height: h2 * scale,
      });
    }
  }

  // =======================================================
  // SAVE & TRIGGER DOWNLOAD
  // =======================================================
  const bytes = await pdfDoc.save();
  const blob = new Blob([new Uint8Array(bytes)], {
    type: "application/pdf",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reimbursement_${submissionRow.organisation_name.replace(
    /\s+/g,
    "_"
  )}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
