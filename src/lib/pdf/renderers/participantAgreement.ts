import type { PdfEngine } from "../pdfEngine";

export async function renderParticipantAgreementPdf(
  pdf: PdfEngine,
  data: any
) {
  const doc = data;

  // -----------------------------------------
  // Header
  // -----------------------------------------
    pdf.title(doc.project?.name ?? "Agreement");

    pdf.subtitle("Participant Agreement");

    pdf.field("Version", String(doc.version));
    pdf.field("Language", doc.language);

    pdf.spacer(1);
    pdf.line();
    pdf.spacer(2);

    pdf.field("Generated at", new Date(doc.generated_at).toLocaleString());

  // -----------------------------------------
  // Sections
  // -----------------------------------------
  for (const section of doc.sections) {
    pdf.spacer(1);
    pdf.line();
    pdf.spacer(1);

    pdf.subtitle(section.title);

    if (section.intro) {
      pdf.paragraph(section.intro);
      pdf.spacer(1);
    }

    if (section.paragraphs?.length > 0) {
      for (const p of section.paragraphs) {
        pdf.paragraph(p);
      }
    }

    if (section.bullets?.length > 0) {
      pdf.list(section.bullets);
      pdf.spacer(1);
    }

    if (section.closingNote) {
        pdf.spacer(1);
        pdf.line();
        pdf.spacer(1);

        pdf.paragraph(section.closingNote);
      pdf.spacer(1);
    }

    pdf.spacer(1);
  }
}