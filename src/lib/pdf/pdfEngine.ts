// src/lib/pdf/pdfEngine.ts
import { PDFDocument, StandardFonts } from "pdf-lib";
import { supabase } from "../supabaseClient";

// -----------------------------------------------------
// 1) Unicode Cleaner (global safe)
// -----------------------------------------------------
export function cleanText(input: string | null | undefined): string {
  if (!input) return "";

  return input
    .replace(/→/g, "->")
    .replace(/–/g, "-")
    .replace(/—/g, "-")
    .replace(/[“”«»„]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\t/g, "  ")
    .replace(/\r/g, "");
}

// -----------------------------------------------------
// 2) PDF Engine class
// -----------------------------------------------------
export class PdfEngine {
  private pdf!: PDFDocument;
  private font!: any;
  private page: any;
  private y: number = 0;

  // SETTINGS
  private marginTop = 50;
  private marginSide = 50;
  private lineHeight = 16;

  // Create document
  async init() {
    this.pdf = await PDFDocument.create();
    this.font = await this.pdf.embedFont(StandardFonts.Helvetica);
    this.addPage();
  }

  // Add new page
  addPage() {
    this.page = this.pdf.addPage([595.28, 841.89]);
    this.y = this.page.getSize().height - this.marginTop;
  }

  // Auto page break
  private ensureSpace(min: number = 40) {
    if (this.y < min) {
      this.addPage();
    }
  }

  // -----------------------------------------------------
  // DRAW HELPERS
  // -----------------------------------------------------
  title(text: string) {
    this.ensureSpace(50);
    this.page.drawText(cleanText(text), {
      x: this.marginSide,
      y: this.y,
      size: 18,
      font: this.font,
    });
    this.y -= 30;
  }

  subtitle(text: string) {
    this.ensureSpace();
    this.page.drawText(cleanText(text), {
      x: this.marginSide,
      y: this.y,
      size: 14,
      font: this.font,
    });
    this.y -= 22;
  }

  line() {
    this.ensureSpace();
    this.page.drawText("----------------------------------------------", {
      x: this.marginSide,
      y: this.y,
      size: 10,
      font: this.font,
    });
    this.y -= 20;
  }

  field(label: string, value: string | null) {
    this.ensureSpace();
    this.page.drawText(cleanText(label), {
      x: this.marginSide,
      y: this.y,
      size: 12,
      font: this.font,
    });
    this.page.drawText(cleanText(value || "-"), {
      x: this.marginSide + 110,
      y: this.y,
      size: 12,
      font: this.font,
    });
    this.y -= this.lineHeight;
  }

  paragraph(text: string) {
    const lines = cleanText(text).split("\n");
    for (const line of lines) {
      this.ensureSpace();
      this.page.drawText(line, {
        x: this.marginSide,
        y: this.y,
        size: 12,
        font: this.font,
      });
      this.y -= this.lineHeight;
    }
  }

  list(items: string[]) {
    for (const it of items) {
      this.ensureSpace();
      this.page.drawText("- " + cleanText(it), {
        x: this.marginSide,
        y: this.y,
        size: 12,
        font: this.font,
      });
      this.y -= this.lineHeight;
    }
  }

  // -----------------------------------------------------
  // TICKET PDF IMPORT
  // -----------------------------------------------------
  async attachTicketPdf(ticket: {
    file_url: string | null;
    label: string;
    meta?: string;
  }) {
    if (!ticket.file_url) return;

    const { data: fileBlob } = await supabase.storage
      .from("tickets")
      .download(ticket.file_url);

    if (!fileBlob) return;

    const bytes = await fileBlob.arrayBuffer();
    const ticketPdf = await PDFDocument.load(bytes);

    const pages = await this.pdf.copyPages(ticketPdf, ticketPdf.getPageIndices());

    // First page wrapper
    const orig = pages[0];
    const { width: pw, height: ph } = orig.getSize();

    const wrapper = this.pdf.addPage([pw, ph]);

    wrapper.drawText(cleanText(ticket.label), {
      x: 40,
      y: ph - 40,
      size: 16,
      font: this.font,
    });

    if (ticket.meta) {
      wrapper.drawText(cleanText(ticket.meta), {
        x: 40,
        y: ph - 60,
        size: 12,
        font: this.font,
      });
    }

    const embed = await wrapper.doc.embedPage(orig);
    const scale = 0.8;

    wrapper.drawPage(embed, {
      x: 40,
      y: ph - 100 - ph * scale,
      width: pw * scale,
      height: ph * scale,
    });

    // Remaining pages
    for (let p = 1; p < pages.length; p++) {
      const pg = pages[p];
      const { width: w, height: h } = pg.getSize();
      const newPg = this.pdf.addPage([w * scale, h * scale]);
      const embedded = await this.pdf.embedPage(pg);

      newPg.drawPage(embedded, {
        x: 0,
        y: 0,
        width: w * scale,
        height: h * scale,
      });
    }
  }

  // -----------------------------------------------------
  // Finalize
  // -----------------------------------------------------
  async saveBlob(): Promise<Blob> {
    const bytes = await this.pdf.save();
    const array = new Uint8Array(bytes);
    return new Blob([array], { type: "application/pdf" });
  }
}

// -----------------------------------------------------
// Exported helper: generate + download
// -----------------------------------------------------
export async function generatePdf(
  renderer: (pdf: PdfEngine, data: any) => Promise<void>,
  data: any,
  filename: string
) {
  const pdf = new PdfEngine();
  await pdf.init();
  await renderer(pdf, data);

  const blob = await pdf.saveBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
