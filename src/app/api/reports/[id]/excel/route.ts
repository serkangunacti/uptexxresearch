import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ── Corporate colour palette (ARGB) ────────────────────────────────────────
const P = {
  // Brand / Navy
  navyDark:   "FF1E2D5A",   // darkest navy header
  navy:       "FF2E4080",   // section headers
  navyLight:  "FF3D55B0",   // accent
  navyBg:     "FFE8EDF8",   // light navy background for alternating rows

  // Greys
  white:      "FFFFFFFF",
  rowAlt:     "FFF7F8FB",   // very light grey for alternating
  headerBg:   "FFF0F3FA",   // column header bg (light)
  border:     "FFD0D7E8",   // subtle border
  dark:       "FF1A1A2E",
  bodyText:   "FF2D3748",
  mutedText:  "FF718096",

  // Semantic
  violet:     "FF6D5ACD",
  green:      "FF1A7F4B",
  greenBg:    "FFE6F4ED",
  blue:       "FF1A56A8",
  blueBg:     "FFE8F0FD",
  amber:      "FFB45309",
  amberBg:    "FFFEF3C7",
  gray:       "FF6B7280",
  grayBg:     "FFF3F4F6",
  red:        "FFB91C1C",
  redBg:      "FFFEE2E2",
};

const KIND_STYLE: Record<string, { fg: string; bg: string; label: string }> = {
  LEAD:          { fg: P.violet,  bg: "FFE9E5FF", label: "Fırsat Lideri" },
  OPPORTUNITY:   { fg: P.green,   bg: P.greenBg,  label: "Fırsat"        },
  NEWS:          { fg: P.blue,    bg: P.blueBg,   label: "Haber"         },
  MARKET_SIGNAL: { fg: P.amber,   bg: P.amberBg,  label: "Piyasa Sinyali"},
  SYSTEM:        { fg: P.gray,    bg: P.grayBg,   label: "Sistem"        },
};

function kind(k: string) {
  return KIND_STYLE[k] ?? { fg: P.gray, bg: P.grayBg, label: k };
}

function border(cell: ExcelJS.Cell, style: ExcelJS.BorderStyle = "thin") {
  cell.border = {
    top:    { style, color: { argb: P.border } },
    bottom: { style, color: { argb: P.border } },
    left:   { style, color: { argb: P.border } },
    right:  { style, color: { argb: P.border } },
  };
}

function fill(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function font(
  cell: ExcelJS.Cell,
  opts: { bold?: boolean; size?: number; color?: string; italic?: boolean; name?: string }
) {
  cell.font = {
    name:   opts.name   ?? "Calibri",
    size:   opts.size   ?? 10,
    bold:   opts.bold   ?? false,
    italic: opts.italic ?? false,
    color:  { argb: opts.color ?? P.bodyText },
  };
}

function align(cell: ExcelJS.Cell, h: ExcelJS.Alignment["horizontal"] = "left", wrap = true) {
  cell.alignment = { horizontal: h, vertical: "middle", wrapText: wrap };
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

    const dateStr = report.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });

    const wb = new ExcelJS.Workbook();
    wb.creator  = "Uptexx Research Automation";
    wb.created  = new Date();
    wb.modified = new Date();

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 1 — RAPOR ÖZETİ
    // ════════════════════════════════════════════════════════════════════════
    const ws = wb.addWorksheet("Rapor Özeti", {
      pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1 },
      views: [{ showGridLines: false }],
      properties: { tabColor: { argb: P.navyDark } },
    });

    ws.columns = [
      { key: "a", width: 26 },
      { key: "b", width: 70 },
    ];

    // ── Row 1: Company banner ─────────────────────────────────────────────
    ws.mergeCells("A1:B1");
    const bannerCell = ws.getCell("A1");
    bannerCell.value = "UPTEXX RESEARCH AUTOMATION";
    fill(bannerCell, P.navyDark);
    font(bannerCell, { bold: true, size: 18, color: P.white, name: "Calibri" });
    align(bannerCell, "center", false);
    ws.getRow(1).height = 46;

    // ── Row 2: Report subtitle ────────────────────────────────────────────
    ws.mergeCells("A2:B2");
    const subCell = ws.getCell("A2");
    subCell.value = "Araştırma Raporu";
    fill(subCell, P.navy);
    font(subCell, { italic: true, size: 11, color: "FFD0D9F0" });
    align(subCell, "center", false);
    ws.getRow(2).height = 26;

    // ── Row 3: blank ─────────────────────────────────────────────────────
    ws.addRow([]);
    ws.getRow(3).height = 8;

    // ── Row 4: "RAPOR BİLGİLERİ" section heading ─────────────────────────
    ws.mergeCells("A4:B4");
    const metaHead = ws.getCell("A4");
    metaHead.value = "RAPOR BİLGİLERİ";
    fill(metaHead, P.navyBg);
    font(metaHead, { bold: true, size: 9, color: P.navyDark });
    metaHead.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    border(metaHead, "thin");
    ws.getRow(4).height = 20;

    // ── Rows 5-8: Meta key-value table ────────────────────────────────────
    const metaRows = [
      { label: "Rapor Başlığı", value: report.title },
      { label: "Araştırma Ajanı", value: report.agent.name },
      { label: "Oluşturulma Tarihi", value: dateStr },
      { label: "Toplam Bulgu Sayısı", value: report.findings.length },
    ];

    metaRows.forEach(({ label, value }, i) => {
      const row = ws.addRow([label, value]);
      const isAlt = i % 2 === 0;
      row.height = 22;

      const la = row.getCell(1);
      fill(la, isAlt ? P.navyBg : P.white);
      font(la, { bold: true, size: 10, color: P.navyDark });
      la.alignment = { horizontal: "left", vertical: "middle", indent: 1, wrapText: false };
      border(la);

      const va = row.getCell(2);
      fill(va, isAlt ? P.navyBg : P.white);
      font(va, { size: 10, color: P.bodyText });
      va.alignment = { horizontal: "left", vertical: "middle", indent: 1, wrapText: true };
      border(va);
    });

    // ── Blank row ─────────────────────────────────────────────────────────
    ws.addRow([]);
    ws.getRow(ws.lastRow!.number).height = 10;

    // ── "ÖZET" section heading ────────────────────────────────────────────
    ws.mergeCells(`A${ws.lastRow!.number + 1}:B${ws.lastRow!.number + 1}`);
    const sumHead = ws.getCell(`A${ws.lastRow!.number}`);
    sumHead.value = "ÖZET";
    fill(sumHead, P.navyBg);
    font(sumHead, { bold: true, size: 9, color: P.navyDark });
    sumHead.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    border(sumHead, "thin");
    ws.getRow(Number(sumHead.row)).height = 20;

    // ── Summary body ──────────────────────────────────────────────────────
    ws.mergeCells(`A${ws.lastRow!.number + 1}:B${ws.lastRow!.number + 1}`);
    const sumBody = ws.getCell(`A${ws.lastRow!.number}`);
    sumBody.value = report.summary ?? "Özet bulunamadı.";
    fill(sumBody, P.white);
    font(sumBody, { size: 10, color: P.bodyText });
    sumBody.alignment = { horizontal: "left", vertical: "top", wrapText: true, indent: 1 };
    border(sumBody);
    ws.getRow(Number(sumBody.row)).height = Math.max(50, Math.min(200, (report.summary?.length ?? 0) / 2.5));

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 2 — BULGULAR
    // ════════════════════════════════════════════════════════════════════════
    const ws2 = wb.addWorksheet("Bulgular", {
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
      views: [{ state: "frozen", xSplit: 0, ySplit: 3, showGridLines: false }],
      properties: { tabColor: { argb: P.navyLight } },
    });

    ws2.columns = [
      { key: "no",      width: 5   },
      { key: "kind",    width: 16  },
      { key: "title",   width: 46  },
      { key: "body",    width: 80  },
      { key: "source",  width: 42  },
      { key: "score",   width: 8   },
    ];

    // ── Row 1: Sheet title ────────────────────────────────────────────────
    ws2.mergeCells("A1:F1");
    const sh2title = ws2.getCell("A1");
    sh2title.value = `BULGULAR — ${report.title}`;
    fill(sh2title, P.navyDark);
    font(sh2title, { bold: true, size: 13, color: P.white });
    align(sh2title, "center", false);
    ws2.getRow(1).height = 34;

    // ── Row 2: Sub-header (meta) ──────────────────────────────────────────
    ws2.mergeCells("A2:F2");
    const sh2meta = ws2.getCell("A2");
    sh2meta.value = `${report.agent.name}  ·  ${dateStr}  ·  Toplam ${report.findings.length} bulgu`;
    fill(sh2meta, P.navy);
    font(sh2meta, { italic: true, size: 9, color: "FFD0D9F0" });
    align(sh2meta, "center", false);
    ws2.getRow(2).height = 20;

    // ── Row 3: Column headers ─────────────────────────────────────────────
    const colHeaders = ["#", "TÜR / KATEGORİ", "BAŞLIK", "İÇERİK / DETAY", "KAYNAK BAĞLANTI", "SKOR"];
    const headerRow = ws2.addRow(colHeaders);
    headerRow.height = 28;
    headerRow.eachCell((cell, col) => {
      fill(cell, P.navyBg);
      font(cell, { bold: true, size: 9, color: P.navyDark });
      align(cell, col === 1 || col === 6 ? "center" : "left", false);
      cell.border = {
        top:    { style: "medium", color: { argb: P.navy } },
        bottom: { style: "medium", color: { argb: P.navy } },
        left:   { style: "thin",   color: { argb: P.border } },
        right:  { style: "thin",   color: { argb: P.border } },
      };
    });

    // ── Data rows ─────────────────────────────────────────────────────────
    report.findings.forEach((f, i) => {
      const km      = kind(f.kind);
      const isAlt   = i % 2 === 0;
      const rowBg   = isAlt ? P.white : P.rowAlt;
      const bodyTxt = f.body ?? "";
      const rowH    = Math.max(40, Math.min(160, bodyTxt.length / 3.5 + 24));

      const dataRow = ws2.addRow([
        i + 1,
        km.label,
        f.title ?? "",
        bodyTxt,
        f.sourceUrl ?? "",
        f.score ?? "",
      ]);
      dataRow.height = rowH;

      dataRow.eachCell((cell, col) => {
        fill(cell, rowBg);
        font(cell, { size: 10, color: P.bodyText });
        align(cell, "left");
        border(cell);

        // #
        if (col === 1) {
          font(cell, { bold: true, size: 10, color: P.navyDark });
          align(cell, "center", false);
        }

        // Kind badge
        if (col === 2) {
          fill(cell, km.bg);
          font(cell, { bold: true, size: 9, color: km.fg });
          align(cell, "center", false);
        }

        // Title
        if (col === 3) {
          font(cell, { bold: true, size: 10, color: P.navyDark });
        }

        // Source hyperlink
        if (col === 5 && f.sourceUrl) {
          cell.value = { text: f.sourceUrl, hyperlink: f.sourceUrl };
          font(cell, { size: 9, color: P.blue });
          cell.font!.underline = true;
        }

        // Score
        if (col === 6) {
          font(cell, { bold: true, size: 10, color: f.score != null ? P.amber : P.mutedText });
          align(cell, "center", false);
        }
      });
    });

    // ── Add totals/summary row ────────────────────────────────────────────
    ws2.addRow([]);
    const totalRow = ws2.addRow([`Toplam: ${report.findings.length} bulgu`, "", "", "", "", ""]);
    ws2.mergeCells(`A${totalRow.number}:F${totalRow.number}`);
    const totalCell = ws2.getCell(`A${totalRow.number}`);
    fill(totalCell, P.navyBg);
    font(totalCell, { bold: true, size: 9, color: P.navyDark });
    totalCell.alignment = { horizontal: "right", vertical: "middle", indent: 1 };
    totalRow.height = 22;
    border(totalCell);

    // ─── Serialize ────────────────────────────────────────────────────────
    const buf = Buffer.from(await wb.xlsx.writeBuffer());

    const safeTitle = (report.title ?? "rapor")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60);

    return new NextResponse(buf as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="rapor-${safeTitle}.xlsx"`,
        "Content-Length": String(buf.length),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Excel generation failed:", msg, error);
    return NextResponse.json(
      { error: "Excel oluşturulurken hata meydana geldi.", detail: msg },
      { status: 500 }
    );
  }
}
