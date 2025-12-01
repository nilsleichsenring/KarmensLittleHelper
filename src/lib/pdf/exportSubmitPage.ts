// src/lib/pdf/exportSubmitPage.ts
import { supabase } from "../supabaseClient";
import { PDFDocument, StandardFonts } from "pdf-lib";

// Types -----------------------------------------------------------------------
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

type ParticipantRow = { id: string; full_name: string };

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

type ProjectRow = {
  name: string;
  start_date: string | null;
  end_date: string | null;
  project_reference: string | null;
};

export type SubmissionLike = { id: string } | string;

// ============================================================================
// EXPORT FUNCTION
// ============================================================================
export async function exportSubmissionPdf(submission: SubmissionLike) {
  const submissionId =
    typeof submission === "string" ? submission : submission.id;

  // ---------------------------------------------------------------------------
  // LOAD: Submission row
  // ---------------------------------------------------------------------------
  const { data: sub, error: subError } = await supabase
    .from("project_partner_submissions")
    .select(
      `id, project_id, country_code, organisation_name,
       submitted, submitted_at,
       contact_name, contact_email,
       iban, bic, account_holder`
    )
    .eq("id", submissionId)
    .single();

  if (subError || !sub) {
    console.error("PDF export failed: submission not found");
    return;
  }

  const submissionRow = sub as SubmissionRow;

  // ---------------------------------------------------------------------------
  // LOAD: Project (incl. reference number!)
  // ---------------------------------------------------------------------------
  const { data: proj, error: projError } = await supabase
    .from("projects")
    .select("name, start_date, end_date, project_reference")
    .eq("id", submissionRow.project_id)
    .single();

  if (projError) {
    console.error("Could not load project for PDF", projError);
  }

  const project = proj as ProjectRow | null;

  // ---------------------------------------------------------------------------
  // LOAD: Participants
  // ---------------------------------------------------------------------------
  const { data: partRows } = await supabase
    .from("participants")
    .select("id, full_name")
    .eq("project_partner_submission_id", submissionId)
    .order("full_name", { ascending: true });

  const participants = (partRows || []) as ParticipantRow[];

  // ---------------------------------------------------------------------------
  // LOAD: Tickets
  // ---------------------------------------------------------------------------
  const { data: ticketRows } = await supabase
    .from("tickets")
    .select("id, from_location, to_location, amount_eur, file_url")
    .eq("project_partner_submission_id", submissionId)
    .order("created_at", { ascending: true });

  const baseTickets = (ticketRows || []) as TicketRow[];

  // ---------------------------------------------------------------------------
  // LOAD: Ticket participants
  // ---------------------------------------------------------------------------
  let tickets: (TicketRow & { assigned_participants: string[] })[] = [];

  if (baseTickets.length > 0) {
    const ids = baseTickets.map((t) => t.id);

    const { data: tpRows } = await supabase
      .from("ticket_participants")
      .select("ticket_id, participant_id")
      .in("ticket_id", ids);

    const tp = (tpRows || []) as TicketParticipantRow[];

    const nameById = new Map(participants.map((p) => [p.id, p.full_name]));

    tickets = baseTickets.map((t) => {
      const assigned = tp
        .filter((l) => l.ticket_id === t.id)
        .map((l) => nameById.get(l.participant_id) || "unknown");

      return { ...t, assigned_participants: assigned };
    });
  } else {
    tickets = [];
  }

  // ============================================================================
  // PDF CREATION (UNICODE SAFE)
  // ============================================================================
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let page = pdfDoc.addPage([595.28, 841.89]);
  const { height } = page.getSize();

  let y = height - 50;

  const drawLine = () => {
    y -= 15;
    page.drawText("--------------------------------------------", {
      x: 50,
      y,
      size: 10,
      font,
    });
    y -= 20;
  };

  // ---------------------------------------------------------------------------
  // TITLE
  // ---------------------------------------------------------------------------
  page.drawText("Travel Reimbursement Claim", {
    x: 50,
    y,
    size: 18,
    font,
  });
  y -= 30;

  // ---------------------------------------------------------------------------
  // PROJECT INFO
  // ---------------------------------------------------------------------------
  page.drawText("Project:", { x: 50, y, size: 12, font });
  page.drawText(project?.name || "-", { x: 150, y, size: 12, font });
  y -= 18;

  page.drawText("Dates:", { x: 50, y, size: 12, font });

  const dateText =
    project?.start_date && project?.end_date
      ? `${project.start_date} - ${project.end_date}`
      : project?.start_date
      ? `from ${project.start_date}`
      : project?.end_date
      ? `until ${project.end_date}`
      : "-";

  page.drawText(dateText, { x: 150, y, size: 12, font });
  y -= 18;

  page.drawText("Reference:", { x: 50, y, size: 12, font });
  page.drawText(project?.project_reference || "-", {
    x: 150,
    y,
    size: 12,
    font,
  });
  y -= 24;

  // ---------------------------------------------------------------------------
  // ORGANISATION
  // ---------------------------------------------------------------------------
  page.drawText("Organisation:", { x: 50, y, size: 12, font });
  page.drawText(
    `${submissionRow.organisation_name} (${submissionRow.country_code})`,
    { x: 150, y, size: 12, font }
  );
  y -= 20;

  // CONTACT
  if (submissionRow.contact_name || submissionRow.contact_email) {
    page.drawText("Contact:", { x: 50, y, size: 12, font });

    const line = [submissionRow.contact_name, submissionRow.contact_email]
      .filter(Boolean)
      .join(" - ");

    page.drawText(line || "-", { x: 150, y, size: 12, font });
    y -= 20;
  }

  // SUBMISSION TIME
  if (submissionRow.submitted_at) {
    const d = new Date(submissionRow.submitted_at);
    page.drawText("Submitted at:", { x: 50, y, size: 12, font });
    page.drawText(d.toLocaleString(), { x: 150, y, size: 12, font });
    y -= 20;
  }

  drawLine();

  // ---------------------------------------------------------------------------
  // BANK DETAILS
  // ---------------------------------------------------------------------------
  page.drawText("Bank details", { x: 50, y, size: 14, font });
  y -= 22;

  const bankRows = [
    ["Account holder:", submissionRow.account_holder || "-"],
    ["IBAN:", submissionRow.iban || "-"],
    ["BIC:", submissionRow.bic || "-"],
  ];

  bankRows.forEach(([label, value]) => {
    page.drawText(label, { x: 50, y, size: 12, font });
    page.drawText(value, { x: 160, y, size: 12, font });
    y -= 18;
  });

  y -= 10;
  drawLine();

  // ---------------------------------------------------------------------------
  // PARTICIPANTS
  // ---------------------------------------------------------------------------
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
        page.drawText("Participants (cont.)", { x: 50, y, size: 14, font });
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

  // ---------------------------------------------------------------------------
  // TICKETS OVERVIEW
  // ---------------------------------------------------------------------------
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

    page.drawText(
      `${i + 1}. ${t.from_location} - ${t.to_location} (${t.amount_eur.toFixed(
        2
      )} EUR)`,
      { x: 60, y, size: 12, font }
    );
    y -= 16;

    const partLine =
      t.assigned_participants.length > 0
        ? t.assigned_participants.join(", ")
        : "-";

    page.drawText(`   Participants: ${partLine}`, {
      x: 60,
      y,
      size: 11,
      font,
    });
    y -= 18;
  }

  // ---------------------------------------------------------------------------
  // ATTACH TICKET PDFs
  // ---------------------------------------------------------------------------
  for (let i = 0; i < tickets.length; i++) {
    const t = tickets[i];
    if (!t.file_url) continue;

    const { data: fileBlob } = await supabase.storage
      .from("tickets")
      .download(t.file_url);

    if (!fileBlob) continue;

    const arrayBuffer = await fileBlob.arrayBuffer();
    const ticketPdf = await PDFDocument.load(arrayBuffer);

    const pages = await pdfDoc.copyPages(ticketPdf, ticketPdf.getPageIndices());

    // Wrapper with header
    const first = pages[0];
    const { width: w, height: h } = first.getSize();

    const wrapper = pdfDoc.addPage([w, h]);

    wrapper.drawText(`Ticket ${i + 1} of ${tickets.length}`, {
      x: 40,
      y: h - 40,
      size: 16,
      font,
    });

    wrapper.drawText(
      `${t.from_location} - ${t.to_location} (${t.amount_eur.toFixed(2)} EUR)`,
      { x: 40, y: h - 60, size: 12, font }
    );

    if (t.assigned_participants.length > 0) {
      wrapper.drawText(
        `Participants: ${t.assigned_participants.join(", ")}`,
        { x: 40, y: h - 80, size: 12, font }
      );
    }

    const scale = 0.8;
    const embedded = await wrapper.doc.embedPage(first);

    const scaledHeight = h * scale;
    let imgY = h - 100 - scaledHeight;
    if (imgY < 30) imgY = 30;

    wrapper.drawPage(embedded, {
      x: 40,
      y: imgY,
      xScale: scale,
      yScale: scale,
    });

    // Remaining pages
    for (let p = 1; p < pages.length; p++) {
      const orig = pages[p];
      const { width: w2, height: h2 } = orig.getSize();

      const newPg = pdfDoc.addPage([w2, h2]);
      const emb = await pdfDoc.embedPage(orig);

      newPg.drawPage(emb, {
        x: 0,
        y: 0,
        xScale: scale,
        yScale: scale,
      });
    }
  }

  // ============================================================================
  // DOWNLOAD
  // ============================================================================
  const finalBytes = await pdfDoc.save();
  const safeBytes = new Uint8Array(finalBytes);

  const blob = new Blob([safeBytes], { type: "application/pdf" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  a.download = `reimbursement_${submissionRow.organisation_name
    .replace(/\s+/g, "_")
    .toLowerCase()}.pdf`;

  a.click();
  URL.revokeObjectURL(url);
}
