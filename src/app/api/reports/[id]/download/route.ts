import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const W = 595.28; // A4 width (pt)
const H = 841.89; // A4 height (pt)
const ML = 50;    // margin left
const MR = 50;    // margin right
const MB = 50;    // margin bottom
const CW = W - ML - MR; // content width

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

/** Split text into lines that fit within maxWidth given font & size */
function breakLines(text: string, font: { widthOfTextAtSize: (t: string, s: number) => number }, size: number, maxWidth: number): string[] {
  if (!text) return [""];
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

// ── Colour palette ─────────────────────────────────────────────────────────
const C = {
  white:   rgb(1, 1, 1),
  bg:      rgb(0.047, 0.047, 0.067),    // #0c0c11
  panel:   rgb(0.09, 0.09, 0.11),       // #171719
  card:    rgb(0.15, 0.15, 0.18),       // #262630
  violet:  rgb(0.545, 0.361, 0.965),    // #8b5cf6
  violetD: rgb(0.427, 0.227, 0.929),    // #6d39ed
  line:    rgb(0.22, 0.22, 0.27),       // #383844
  head:    rgb(0.941, 0.941, 0.961),    // #f0f0f5
  body:    rgb(0.76,  0.76,  0.80),     // #c2c2cc
  muted:   rgb(0.44,  0.44,  0.55),     // #70708c
  success: rgb(0.133, 0.773, 0.369),    // #22c55e
  warning: rgb(0.961, 0.620, 0.043),    // #f59e0b
  blue:    rgb(0.376, 0.647, 0.980),    // #60a5fa
  red:     rgb(0.937, 0.267, 0.267),    // #ef4444
};

const KIND_COLORS: Record<string, ReturnType<typeof rgb>> = {
  LEAD:          C.violet,
  OPPORTUNITY:   C.success,
  NEWS:          C.blue,
  MARKET_SIGNAL: C.warning,
  SYSTEM:        C.muted,
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
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

    // ── Create PDF ─────────────────────────────────────────────────────────
    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle(report.title ?? "Araştırma Raporu");
    pdfDoc.setAuthor("Uptexx Research Automation");
    pdfDoc.setCreationDate(new Date());

    const fontReg  = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // State that persists across pages
    let currentPage = pdfDoc.addPage([W, H]);
    let cursorY = H - ML;

    // Draw the dark background on the first page
    currentPage.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.bg });

    function newPage() {
      currentPage = pdfDoc.addPage([W, H]);
      // dark bg
      currentPage.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.bg });
      // thin violet top stripe
      currentPage.drawRectangle({ x: 0, y: H - 3, width: W, height: 3, color: C.violet });
      cursorY = H - 40;
    }

    function needSpace(required: number) {
      if (cursorY - required < MB) newPage();
    }

    /** Returns height consumed */
    function writeText(
      text: string,
      opts: {
        font?: typeof fontReg;
        size?: number;
        color?: ReturnType<typeof rgb>;
        x?: number;
        maxWidth?: number;
        lineGap?: number;
      } = {}
    ): number {
      const {
        font    = fontReg,
        size    = 10,
        color   = C.body,
        x       = ML,
        maxWidth = CW,
        lineGap  = 1.4,
      } = opts;

      const lineHeight = size * lineGap;
      const lines = breakLines(String(text ?? ""), font, size, maxWidth);
      const totalH = lines.length * lineHeight;

      needSpace(totalH + 4);
      for (const line of lines) {
        currentPage.drawText(line, { x, y: cursorY, size, font, color });
        cursorY -= lineHeight;
      }
      return totalH;
    }

    function hRule(color = C.line, thickness = 0.5) {
      currentPage.drawLine({
        start: { x: ML, y: cursorY },
        end:   { x: W - MR, y: cursorY },
        thickness,
        color,
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // COVER BLOCK
    // ══════════════════════════════════════════════════════════════════════
    const coverH = 140;
    currentPage.drawRectangle({ x: 0, y: H - coverH, width: W, height: coverH, color: C.panel });
    currentPage.drawRectangle({ x: 0, y: H - coverH - 2, width: W, height: 2, color: C.violet });
    // violet left accent bar
    currentPage.drawRectangle({ x: 0, y: H - coverH, width: 4, height: coverH, color: C.violetD });

    // Brand
    currentPage.drawText("UPTEXX RESEARCH", {
      x: ML, y: H - 30, size: 8, font: fontBold, color: C.violet,
    });

    // Title — wrap at 52 chars
    const titleLines = breakLines(report.title ?? "Araştırma Raporu", fontBold, 20, W - ML * 2 - 40);
    let ty = H - 56;
    for (const tl of titleLines) {
      currentPage.drawText(tl, { x: ML, y: ty, size: 20, font: fontBold, color: C.head });
      ty -= 28;
    }

    // Meta bar
    const dateStr = report.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
    const metaLine = `${report.agent.name}  ·  ${dateStr}  ·  ${report.findings.length} bulgu`;
    currentPage.drawText(metaLine, {
      x: ML, y: H - coverH + 18, size: 9, font: fontReg, color: C.muted,
    });

    cursorY = H - coverH - 28;

    // ══════════════════════════════════════════════════════════════════════
    // ÖZET SECTION
    // ══════════════════════════════════════════════════════════════════════
    needSpace(60);
    writeText("ÖZET", { font: fontBold, size: 8, color: C.violet });
    cursorY -= 4;
    hRule(C.violet, 0.8);
    cursorY -= 12;
    writeText(report.summary ?? "Özet bulunamadı.", { size: 10, color: C.body, lineGap: 1.55 });
    cursorY -= 20;

    // ══════════════════════════════════════════════════════════════════════
    // BULGULAR SECTION
    // ══════════════════════════════════════════════════════════════════════
    if (report.findings.length > 0) {
      needSpace(40);
      writeText(`BULGULAR  —  ${report.findings.length} ADET`, { font: fontBold, size: 8, color: C.violet });
      cursorY -= 4;
      hRule(C.violet, 0.8);
      cursorY -= 14;

      for (let i = 0; i < report.findings.length; i++) {
        const f = report.findings[i];
        const kindColor = KIND_COLORS[f.kind] ?? C.muted;

        // Estimate card height
        const titleH  = breakLines(f.title ?? "", fontBold, 11, CW - 30).length * 17;
        const bodyH   = breakLines(f.body  ?? "", fontReg,  10, CW - 8).length  * 16;
        const srcH    = f.sourceUrl ? 16 : 0;
        const cardH   = titleH + bodyH + srcH + 52;

        needSpace(cardH + 10);

        const cardTop = cursorY;
        const cardBot = cursorY - cardH;

        // Card bg
        currentPage.drawRectangle({
          x: ML - 4, y: cardBot, width: CW + 8, height: cardH, color: C.card,
        });
        // Left accent border
        currentPage.drawRectangle({
          x: ML - 4, y: cardBot, width: 3, height: cardH, color: kindColor,
        });

        cursorY = cardTop - 10;

        // Row: index pill  +  kind badge  +  score
        const idxStr = String(i + 1).padStart(2, "0");
        // index
        currentPage.drawRectangle({ x: ML + 2, y: cursorY - 3, width: 24, height: 16, color: C.violet });
        currentPage.drawText(idxStr, { x: ML + 5, y: cursorY, size: 9, font: fontBold, color: C.white });

        // kind
        currentPage.drawText(f.kind, { x: ML + 32, y: cursorY, size: 8, font: fontBold, color: kindColor });

        // score
        if (f.score != null) {
          const scoreX = ML + 32 + fontBold.widthOfTextAtSize(f.kind, 8) + 12;
          currentPage.drawText(`Skor: ${f.score}`, { x: scoreX, y: cursorY, size: 8, font: fontReg, color: C.muted });
        }
        cursorY -= 20;

        // Title
        writeText(f.title ?? "", { font: fontBold, size: 11, color: C.head, x: ML + 8, maxWidth: CW - 16 });
        cursorY -= 4;

        // Body
        writeText(f.body ?? "", { size: 10, color: C.body, x: ML + 8, maxWidth: CW - 16, lineGap: 1.55 });

        // Source
        if (f.sourceUrl) {
          cursorY -= 2;
          writeText(`Kaynak: ${f.sourceUrl}`, { size: 8, color: C.blue, x: ML + 8, maxWidth: CW - 16 });
        }

        cursorY -= 14; // gap between cards
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // FOOTER on every page
    // ══════════════════════════════════════════════════════════════════════
    const allPages = pdfDoc.getPages();
    const total = allPages.length;
    for (let p = 0; p < total; p++) {
      const pg = allPages[p];
      const footTxt = `Uptexx Research Automation  ·  Sayfa ${p + 1} / ${total}`;
      const fw = fontReg.widthOfTextAtSize(footTxt, 8);
      pg.drawLine({ start: { x: ML, y: 38 }, end: { x: W - MR, y: 38 }, thickness: 0.4, color: C.line });
      pg.drawText(footTxt, { x: (W - fw) / 2, y: 22, size: 8, font: fontReg, color: C.muted });
    }

    // ── Serialize ──────────────────────────────────────────────────────────
    const pdfBytes = await pdfDoc.save();
    const buf = Buffer.from(pdfBytes);

    const safeTitle = (report.title ?? "rapor")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60);

    return new NextResponse(buf as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="rapor-${safeTitle}.pdf"`,
        "Content-Length": String(buf.length),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("PDF generation failed:", msg, error);
    return NextResponse.json(
      { error: "PDF oluşturulurken hata meydana geldi.", detail: msg },
      { status: 500 }
    );
  }
}
