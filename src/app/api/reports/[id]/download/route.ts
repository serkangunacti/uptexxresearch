import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ─── Helpers ───────────────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return rgb((n >> 16) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255);
}

const C = {
  brand:    hexToRgb("8b5cf6"), // violet accent
  dark:     hexToRgb("111114"),
  heading:  hexToRgb("f0f0f5"),
  body:     hexToRgb("d4d4d8"),
  muted:    hexToRgb("71717a"),
  white:    rgb(1, 1, 1),
  success:  hexToRgb("22c55e"),
  warning:  hexToRgb("f59e0b"),
  blue:     hexToRgb("60a5fa"),
  bg:       hexToRgb("18181b"),
  bgCard:   hexToRgb("27272a"),
  line:     hexToRgb("3f3f46"),
};

/** Wrap text manually to avoid pdf-lib width overflow */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

const KIND_COLORS: Record<string, ReturnType<typeof rgb>> = {
  LEAD:          hexToRgb("a78bfa"),
  OPPORTUNITY:   hexToRgb("34d399"),
  NEWS:          hexToRgb("60a5fa"),
  MARKET_SIGNAL: hexToRgb("fbbf24"),
  SYSTEM:        hexToRgb("9ca3af"),
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        agent: true,
        findings: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Rapor bulunamadı." }, { status: 404 });
    }

    // ─── Create document ────────────────────────────────────────────────────
    const pdfDoc = await PDFDocument.create();
    const fontReg  = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const [W, H] = PageSizes.A4; // 595 x 841 pt
    const ML = 52, MR = 52;
    const contentW = W - ML - MR;

    let page = pdfDoc.addPage([W, H]);
    let y = H - 52; // cursor from top

    // ─── Helper: add new page when running out of space ────────────────────
    function ensureSpace(needed: number) {
      if (y - needed < 52) {
        page = pdfDoc.addPage([W, H]);
        y = H - 52;
      }
    }

    function drawRect(x: number, py: number, w: number, h: number, color: ReturnType<typeof rgb>) {
      page.drawRectangle({ x, y: py, width: w, height: h, color });
    }

    function drawLine(py: number, color = C.line) {
      page.drawLine({
        start: { x: ML, y: py },
        end:   { x: W - MR, y: py },
        thickness: 0.5,
        color,
      });
    }

    function drawText(
      text: string,
      opts: {
        x?: number; size?: number; font?: typeof fontReg;
        color?: ReturnType<typeof rgb>; maxWidth?: number;
      } = {}
    ): number {
      const {
        x = ML, size = 10, font = fontReg,
        color = C.body, maxWidth = contentW,
      } = opts;
      const charsPerLine = Math.floor(maxWidth / (size * 0.52));
      const lines = wrapText(String(text), charsPerLine);
      const lineH = size * 1.5;
      ensureSpace(lines.length * lineH + 4);
      for (const line of lines) {
        page.drawText(line, { x, y, size, font, color });
        y -= lineH;
      }
      return lines.length * lineH;
    }

    // ════════════════════════════════════════════════════════════════════════
    // COVER HEADER (dark band)
    // ════════════════════════════════════════════════════════════════════════
    const headerH = 130;
    drawRect(0, H - headerH, W, headerH, C.dark);
    // violet accent stripe
    drawRect(0, H - headerH - 3, W, 3, C.brand);

    // brand label
    page.drawText("UPTEXX RESEARCH", {
      x: ML, y: H - 36,
      size: 9, font: fontBold, color: C.brand,
    });

    // Report title (center-ish, wrapped at 55 chars)
    const titleLines = wrapText(report.title || "Araştırma Raporu", 55);
    let titleY = H - 62;
    for (const tl of titleLines) {
      const tw = fontBold.widthOfTextAtSize(tl, 20);
      page.drawText(tl, {
        x: (W - tw) / 2, y: titleY,
        size: 20, font: fontBold, color: C.heading,
      });
      titleY -= 28;
    }

    // Meta row
    const dateStr = report.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
    const meta = `${report.agent.name}  ·  ${dateStr}`;
    const mw = fontReg.widthOfTextAtSize(meta, 9);
    page.drawText(meta, {
      x: (W - mw) / 2, y: H - headerH + 16,
      size: 9, font: fontReg, color: C.muted,
    });

    y = H - headerH - 24; // move cursor below header

    // ════════════════════════════════════════════════════════════════════════
    // SUMMARY SECTION
    // ════════════════════════════════════════════════════════════════════════
    y -= 8;
    // Section label
    drawText("ÖZET", { size: 8, font: fontBold, color: C.brand });
    y -= 2;
    drawLine(y);
    y -= 12;

    drawText(report.summary || "Özet bulunamadı.", { size: 10, color: C.body });

    // ════════════════════════════════════════════════════════════════════════
    // FINDINGS
    // ════════════════════════════════════════════════════════════════════════
    if (report.findings.length > 0) {
      y -= 20;
      ensureSpace(30);
      drawText(`BULGULAR  (${report.findings.length})`, { size: 8, font: fontBold, color: C.brand });
      y -= 2;
      drawLine(y);
      y -= 14;

      report.findings.forEach((finding, i) => {
        const cardH = 18 + (wrapText(finding.title, 72).length * 15) +
                      (wrapText(finding.body || "", 72).length * 14) + 32;
        ensureSpace(cardH);

        // card background
        drawRect(ML - 6, y - cardH + 18, contentW + 12, cardH, C.bgCard);

        // index pill
        const idxLabel = String(i + 1).padStart(2, "0");
        drawRect(ML - 6, y - 3, 26, 20, C.brand);
        page.drawText(idxLabel, { x: ML - 6 + 5, y: y + 2, size: 9, font: fontBold, color: C.white });

        // kind badge
        const kindColor = KIND_COLORS[finding.kind] ?? C.muted;
        const kindW = fontBold.widthOfTextAtSize(finding.kind, 7) + 10;
        drawRect(ML + 26, y - 1, kindW, 16, rgb(kindColor.red * 0.25, kindColor.green * 0.25, kindColor.blue * 0.25));
        page.drawText(finding.kind, {
          x: ML + 31, y: y + 3,
          size: 7, font: fontBold, color: kindColor,
        });

        // score
        if (finding.score != null) {
          const scoreTxt = `Skor: ${finding.score}`;
          const scoreX = ML + 30 + kindW + 6;
          page.drawText(scoreTxt, { x: scoreX, y: y + 3, size: 7, font: fontReg, color: C.muted });
        }

        y -= 22;

        // title
        drawText(finding.title, { x: ML, size: 11, font: fontBold, color: C.heading });
        y -= 2;

        // body
        drawText(finding.body || "", { x: ML, size: 10, color: C.body });

        // source url
        if (finding.sourceUrl) {
          y -= 2;
          const srcLines = wrapText(`Kaynak: ${finding.sourceUrl}`, 90);
          for (const sl of srcLines) {
            page.drawText(sl, { x: ML, y, size: 8, font: fontReg, color: C.blue });
            y -= 12;
          }
        }

        y -= 14; // gap between findings
      });
    }

    // ════════════════════════════════════════════════════════════════════════
    // FOOTER on every page
    // ════════════════════════════════════════════════════════════════════════
    const pages = pdfDoc.getPages();
    pages.forEach((pg, idx) => {
      const footer = `Uptexx Research Automation  ·  Sayfa ${idx + 1}/${pages.length}`;
      const fw = fontReg.widthOfTextAtSize(footer, 8);
      pg.drawText(footer, { x: (W - fw) / 2, y: 22, size: 8, font: fontReg, color: C.muted });
      pg.drawLine({ start: { x: ML, y: 36 }, end: { x: W - MR, y: 36 }, thickness: 0.5, color: C.line });
    });

    // ─── Serialize ────────────────────────────────────────────────────────
    const pdfBytes = await pdfDoc.save();

    const safeTitle = (report.title || "rapor")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60);

    return new NextResponse(Buffer.from(pdfBytes) as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="rapor-${safeTitle}.pdf"`,
        "Content-Length": String(pdfBytes.length),
      },
    });
  } catch (error) {
    console.error("PDF generation failed:", error);
    return NextResponse.json(
      { error: "PDF oluşturulurken hata meydana geldi." },
      { status: 500 }
    );
  }
}
