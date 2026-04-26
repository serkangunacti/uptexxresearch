import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PDFDocument, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ── A4 dimensions ──────────────────────────────────────────────────────────
const W = 595.28;
const H = 841.89;
const ML = 56;
const MR = 56;
const MT = 56;
const MB = 64;
const CW = W - ML - MR;

// ── Corporate colour palette ───────────────────────────────────────────────
const C = {
  white:      rgb(1, 1, 1),
  offWhite:   rgb(0.976, 0.976, 0.984),   // #f9f9fb
  navy:       rgb(0.118, 0.176, 0.353),   // #1e2d5a
  navyLight:  rgb(0.180, 0.255, 0.435),   // #2e416f
  accent:     rgb(0.427, 0.333, 0.804),   // #6d55cd
  heading:    rgb(0.10, 0.12, 0.20),      // #1a1e33
  body:       rgb(0.22, 0.24, 0.30),      // #383d4d
  muted:      rgb(0.50, 0.52, 0.58),      // #808594
  light:      rgb(0.75, 0.77, 0.82),      // #c0c4d1
  divider:    rgb(0.85, 0.87, 0.90),      // #d9dee6
  tagBg:      rgb(0.93, 0.94, 0.97),      // #eef0f7
  success:    rgb(0.10, 0.50, 0.29),      // #1a804a
  warning:    rgb(0.71, 0.33, 0.04),      // #b5540a
  blue:       rgb(0.10, 0.34, 0.66),      // #1a56a8
};

const KIND_LABELS: Record<string, { label: string; color: ReturnType<typeof rgb> }> = {
  LEAD:          { label: "Potansiyel Müşteri", color: C.accent },
  OPPORTUNITY:   { label: "Fırsat",             color: C.success },
  NEWS:          { label: "Haber",              color: C.blue },
  MARKET_SIGNAL: { label: "Piyasa Sinyali",     color: C.warning },
  SYSTEM:        { label: "Sistem",             color: C.muted },
};

// ── Font type alias ────────────────────────────────────────────────────────
type Font = Awaited<ReturnType<PDFDocument["embedFont"]>>;

/** Break text into lines that fit a given pixel width */
function wrapText(text: string, font: Font, size: number, maxW: number): string[] {
  if (!text || !text.trim()) return [];
  const words = text.replace(/\n/g, " ").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

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

    // ── Fonts ──────────────────────────────────────────────────────────────
    const pdfDoc = await PDFDocument.create();
    const fontkit = (await import("@pdf-lib/fontkit")).default;
    pdfDoc.registerFontkit(fontkit);

    const fontsDir = path.join(process.cwd(), "src", "fonts");
    const fontReg  = await pdfDoc.embedFont(fs.readFileSync(path.join(fontsDir, "Roboto-Regular.ttf")));
    const fontBold = await pdfDoc.embedFont(fs.readFileSync(path.join(fontsDir, "Roboto-Bold.ttf")));

    pdfDoc.setTitle(report.title ?? "Rapor");
    pdfDoc.setAuthor("Uptexx Research Automation");
    pdfDoc.setCreationDate(new Date());

    // ── Cursor state ───────────────────────────────────────────────────────
    let page = pdfDoc.addPage([W, H]);
    let y = H - MT;

    function addPage() {
      page = pdfDoc.addPage([W, H]);
      y = H - MT;
    }

    function need(h: number) {
      if (y - h < MB) addPage();
    }

    /** Draw wrapped text, returns total height consumed */
    function text(
      str: string,
      opts: {
        font?: Font; size?: number; color?: ReturnType<typeof rgb>;
        x?: number; maxW?: number; leading?: number;
      } = {}
    ): number {
      const { font = fontReg, size = 10, color = C.body, x = ML, maxW = CW, leading = 1.5 } = opts;
      const lineH = size * leading;
      const lines = wrapText(str, font, size, maxW);
      const totalH = lines.length * lineH;
      need(totalH);
      for (const l of lines) {
        page.drawText(l, { x, y, size, font, color });
        y -= lineH;
      }
      return totalH;
    }

    function hLine(color = C.divider, thickness = 0.6) {
      page.drawLine({ start: { x: ML, y }, end: { x: W - MR, y }, thickness, color });
    }

    function rect(x: number, ry: number, w: number, h: number, color: ReturnType<typeof rgb>) {
      page.drawRectangle({ x, y: ry, width: w, height: h, color });
    }

    const dateStr = report.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });

    // ════════════════════════════════════════════════════════════════════════
    //  HEADER BAND
    // ════════════════════════════════════════════════════════════════════════
    const bandH = 100;
    rect(0, H - bandH, W, bandH, C.navy);
    // thin accent stripe below band
    rect(0, H - bandH - 2, W, 2, C.accent);

    // Company name — top left
    page.drawText("UPTEXX RESEARCH AUTOMATION", {
      x: ML, y: H - 28, size: 8, font: fontBold, color: C.light,
    });

    // Report title — left-aligned, wrapped
    const titleLines = wrapText(report.title ?? "Araştırma Raporu", fontBold, 18, CW);
    let ty = H - 48;
    for (const tl of titleLines) {
      page.drawText(tl, { x: ML, y: ty, size: 18, font: fontBold, color: C.white });
      ty -= 24;
    }

    // Meta — bottom of band
    page.drawText(`${report.agent.name}  |  ${dateStr}  |  ${report.findings.length} Bulgu`, {
      x: ML, y: H - bandH + 14, size: 8.5, font: fontReg, color: C.light,
    });

    y = H - bandH - 30;

    // ════════════════════════════════════════════════════════════════════════
    //  ÖZET
    // ════════════════════════════════════════════════════════════════════════
    text("ÖZET", { font: fontBold, size: 11, color: C.navy });
    y -= 4;
    hLine(C.navy, 1);
    y -= 14;

    text(report.summary ?? "Özet bilgi bulunamadı.", {
      size: 10, color: C.body, leading: 1.65,
    });

    y -= 28;

    // ════════════════════════════════════════════════════════════════════════
    //  BULGULAR
    // ════════════════════════════════════════════════════════════════════════
    if (report.findings.length > 0) {
      need(30);
      text(`BULGULAR (${report.findings.length})`, { font: fontBold, size: 11, color: C.navy });
      y -= 4;
      hLine(C.navy, 1);
      y -= 18;

      for (let i = 0; i < report.findings.length; i++) {
        const f = report.findings[i];
        const km = KIND_LABELS[f.kind] ?? { label: f.kind, color: C.muted };

        // Pre-calculate heights
        const titleLines = wrapText(f.title ?? "", fontBold, 11, CW - 20);
        const bodyLines  = wrapText(f.body  ?? "", fontReg,  9.5, CW - 20);
        const srcLines   = f.sourceUrl ? wrapText(f.sourceUrl, fontReg, 8, CW - 20) : [];

        const titleH = titleLines.length * 16;
        const bodyH  = bodyLines.length * 14.5;
        const srcH   = srcLines.length * 12;
        const metaH  = 14;
        const innerH = metaH + 8 + titleH + 6 + bodyH + (srcH > 0 ? 8 + srcH : 0);
        const cardH  = innerH + 24; // padding top + bottom

        need(cardH + 12);

        // Card background
        const cardTop = y;
        rect(ML, y - cardH, CW, cardH, C.offWhite);

        // Left accent bar
        rect(ML, y - cardH, 3, cardH, km.color);

        // Card inner padding
        const px = ML + 14;
        const pw = CW - 28;
        y -= 12; // top padding

        // Index + Kind label row
        const idxStr = `#${i + 1}`;
        page.drawText(idxStr, { x: px, y, size: 9, font: fontBold, color: C.navy });
        const idxW = fontBold.widthOfTextAtSize(idxStr, 9);

        // Kind tag
        const kindStr = km.label.toUpperCase();
        const kindTxtW = fontBold.widthOfTextAtSize(kindStr, 7.5);
        const tagX = px + idxW + 10;
        rect(tagX, y - 3, kindTxtW + 10, 14, C.tagBg);
        page.drawText(kindStr, { x: tagX + 5, y: y + 0.5, size: 7.5, font: fontBold, color: km.color });

        // Score (right side)
        if (f.score != null) {
          const scoreStr = `Skor: ${f.score}`;
          const sw = fontReg.widthOfTextAtSize(scoreStr, 8);
          page.drawText(scoreStr, { x: ML + CW - 14 - sw, y, size: 8, font: fontReg, color: C.muted });
        }

        y -= metaH + 8;

        // Title
        for (const tl of titleLines) {
          page.drawText(tl, { x: px, y, size: 11, font: fontBold, color: C.heading });
          y -= 16;
        }
        y -= 6;

        // Body
        for (const bl of bodyLines) {
          page.drawText(bl, { x: px, y, size: 9.5, font: fontReg, color: C.body });
          y -= 14.5;
        }

        // Source URL
        if (srcLines.length > 0) {
          y -= 8;
          for (const sl of srcLines) {
            page.drawText(sl, { x: px, y, size: 8, font: fontReg, color: C.blue });
            y -= 12;
          }
        }

        y -= 12; // bottom padding
        y -= 10; // gap between cards
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    //  FOOTER on every page
    // ════════════════════════════════════════════════════════════════════════
    const allPages = pdfDoc.getPages();
    const total = allPages.length;
    for (let p = 0; p < total; p++) {
      const pg = allPages[p];

      // divider line
      pg.drawLine({
        start: { x: ML, y: 42 },
        end:   { x: W - MR, y: 42 },
        thickness: 0.4,
        color: C.divider,
      });

      // left: company
      pg.drawText("Uptexx Research Automation", {
        x: ML, y: 28, size: 7.5, font: fontReg, color: C.muted,
      });

      // right: page number
      const pgStr = `Sayfa ${p + 1} / ${total}`;
      const pgW = fontReg.widthOfTextAtSize(pgStr, 7.5);
      pg.drawText(pgStr, {
        x: W - MR - pgW, y: 28, size: 7.5, font: fontReg, color: C.muted,
      });
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
