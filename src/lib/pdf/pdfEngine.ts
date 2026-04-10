// src/lib/pdf/pdfEngine.ts
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";
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
  private fontSans!: PDFFont;
  private fontMono!: PDFFont;
  private page!: PDFPage;
  private y = 0;

  // SETTINGS
  private readonly pageWidth = 595.28;
  private readonly pageHeight = 841.89;

  private readonly marginTop = 50;
  private readonly marginBottom = 50;
  private readonly marginSide = 50;

  private readonly lineHeight = 16;

  private readonly fontSizeTitle = 18;
  private readonly fontSizeSubtitle = 14;
  private readonly fontSizeBody = 12;

  private readonly defaultLabelWidth = 150;
  private readonly lineColor = rgb(0.65, 0.65, 0.65);

  // -----------------------------------------------------
  // Create document
  // -----------------------------------------------------
  async init() {
    this.pdf = await PDFDocument.create();
    this.fontSans = await this.pdf.embedFont(StandardFonts.Helvetica);
    this.fontMono = await this.pdf.embedFont(StandardFonts.Courier);
    this.addPage();
  }

  // -----------------------------------------------------
  // Add new page
  // -----------------------------------------------------
  addPage() {
    this.page = this.pdf.addPage([this.pageWidth, this.pageHeight]);
    this.y = this.page.getSize().height - this.marginTop;
  }

  // -----------------------------------------------------
  // Auto page break
  // -----------------------------------------------------
  private ensureSpace(min: number = 40) {
    if (this.y < this.marginBottom + min) {
      this.addPage();
    }
  }

  // -----------------------------------------------------
  // Helpers
  // -----------------------------------------------------
  private getContentWidth() {
    return this.page.getSize().width - this.marginSide * 2;
  }

  private wrapText(
    text: string,
    options?: {
      font?: PDFFont;
      size?: number;
      maxWidth?: number;
    }
  ): string[] {
    const clean = cleanText(text);
    const paragraphs = clean.split("\n");

    const font = options?.font ?? this.fontMono;
    const size = options?.size ?? this.fontSizeBody;
    const maxWidth = options?.maxWidth ?? this.getContentWidth();

    const wrappedLines: string[] = [];

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        wrappedLines.push("");
        continue;
      }

      const words = paragraph.split(/\s+/);
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = font.widthOfTextAtSize(testLine, size);

        if (width <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            wrappedLines.push(currentLine);
            currentLine = word;
          } else {
            // very long single word fallback
            wrappedLines.push(word);
            currentLine = "";
          }
        }
      }

      if (currentLine) {
        wrappedLines.push(currentLine);
      }
    }

    return wrappedLines;
  }

  private drawWrappedText(
    text: string,
    options?: {
      x?: number;
      font?: PDFFont;
      size?: number;
      maxWidth?: number;
      lineHeight?: number;
    }
  ) {
    const x = options?.x ?? this.marginSide;
    const font = options?.font ?? this.fontMono;
    const size = options?.size ?? this.fontSizeBody;
    const maxWidth = options?.maxWidth ?? this.getContentWidth();
    const lineHeight = options?.lineHeight ?? this.lineHeight;

    const lines = this.wrapText(text, { font, size, maxWidth });

    for (const line of lines) {
      this.ensureSpace(lineHeight);
      this.page.drawText(line, {
        x,
        y: this.y,
        size,
        font,
      });
      this.y -= lineHeight;
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
      size: this.fontSizeTitle,
      font: this.fontSans,
    });
    this.y -= 30;
  }

  subtitle(text: string) {
    this.ensureSpace(28);
    this.page.drawText(cleanText(text), {
      x: this.marginSide,
      y: this.y,
      size: this.fontSizeSubtitle,
      font: this.fontSans,
    });
    this.y -= 22;
  }

  line() {
    this.ensureSpace(16);
    const y = this.y + 4;

    this.page.drawLine({
      start: { x: this.marginSide, y },
      end: { x: this.marginSide + this.getContentWidth(), y },
      thickness: 1,
      color: this.lineColor,
    });

    this.y -= 18;
  }

  spacer(lines: number = 1) {
    this.y -= this.lineHeight * lines;
  }

  field(
    label: string,
    value: string | null,
    options?: { labelWidth?: number }
  ) {
    const labelWidth = options?.labelWidth ?? this.defaultLabelWidth;
    const safeValue = cleanText(value || "-");

    this.ensureSpace(this.lineHeight);

    // label
    this.page.drawText(cleanText(label), {
      x: this.marginSide,
      y: this.y,
      size: this.fontSizeBody,
      font: this.fontMono,
    });

    const valueX = this.marginSide + labelWidth;
    const valueMaxWidth =
      this.page.getSize().width - valueX - this.marginSide;

    const lines = this.wrapText(safeValue, {
      font: this.fontMono,
      size: this.fontSizeBody,
      maxWidth: valueMaxWidth,
    });

    for (let i = 0; i < lines.length; i++) {
      this.ensureSpace(this.lineHeight);

      this.page.drawText(lines[i], {
        x: valueX,
        y: this.y,
        size: this.fontSizeBody,
        font: this.fontMono,
      });

      this.y -= this.lineHeight;
    }

    if (lines.length === 0) {
      this.y -= this.lineHeight;
    }
  }

  paragraph(text: string) {
    this.drawWrappedText(text, {
      x: this.marginSide,
      font: this.fontMono,
      size: this.fontSizeBody,
      maxWidth: this.getContentWidth(),
      lineHeight: this.lineHeight,
    });
  }

  list(items: string[]) {
    for (const item of items) {
      const bulletPrefix = "- ";
      const bulletWidth = this.fontMono.widthOfTextAtSize(
        bulletPrefix,
        this.fontSizeBody
      );

      this.ensureSpace(this.lineHeight);

      this.page.drawText(bulletPrefix, {
        x: this.marginSide,
        y: this.y,
        size: this.fontSizeBody,
        font: this.fontMono,
      });

      const wrapped = this.wrapText(cleanText(item), {
        font: this.fontMono,
        size: this.fontSizeBody,
        maxWidth: this.getContentWidth() - bulletWidth,
      });

      for (let i = 0; i < wrapped.length; i++) {
        if (i === 0) {
          this.page.drawText(wrapped[i], {
            x: this.marginSide + bulletWidth,
            y: this.y,
            size: this.fontSizeBody,
            font: this.fontMono,
          });
          this.y -= this.lineHeight;
        } else {
          this.ensureSpace(this.lineHeight);
          this.page.drawText(wrapped[i], {
            x: this.marginSide + bulletWidth,
            y: this.y,
            size: this.fontSizeBody,
            font: this.fontMono,
          });
          this.y -= this.lineHeight;
        }
      }
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

    try {
      const { data: fileBlob, error } = await supabase.storage
        .from("tickets")
        .download(ticket.file_url);

      if (error || !fileBlob) {
        console.error("Could not download ticket PDF:", error);
        return;
      }

      const bytes = await fileBlob.arrayBuffer();
      const ticketPdf = await PDFDocument.load(bytes);

      const pages = await this.pdf.copyPages(
        ticketPdf,
        ticketPdf.getPageIndices()
      );

      if (pages.length === 0) return;

      // First page wrapper
      const orig = pages[0];
      const { width: pw, height: ph } = orig.getSize();
      const wrapper = this.pdf.addPage([pw, ph]);

      wrapper.drawText(cleanText(ticket.label), {
        x: 40,
        y: ph - 40,
        size: 16,
        font: this.fontSans,
      });

      if (ticket.meta) {
        wrapper.drawText(cleanText(ticket.meta), {
          x: 40,
          y: ph - 60,
          size: 12,
          font: this.fontMono,
        });
      }

      const embed = await wrapper.doc.embedPage(orig);

      const availableWidth = pw - 80;
      const availableHeight = ph - 130;
      const scale = Math.min(
        availableWidth / pw,
        availableHeight / ph,
        1
      );

      const drawWidth = pw * scale;
      const drawHeight = ph * scale;
      const drawX = (pw - drawWidth) / 2;
      const drawY = ph - 90 - drawHeight;

      wrapper.drawPage(embed, {
        x: drawX,
        y: Math.max(drawY, 20),
        width: drawWidth,
        height: drawHeight,
      });

      // Remaining pages
      for (let p = 1; p < pages.length; p++) {
        const pg = pages[p];
        const { width: w, height: h } = pg.getSize();
        const newPg = this.pdf.addPage([w, h]);
        const embedded = await this.pdf.embedPage(pg);

        newPg.drawPage(embedded, {
          x: 0,
          y: 0,
          width: w,
          height: h,
        });
      }
    } catch (err) {
      console.error("Unexpected error while attaching ticket PDF:", err);
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

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}