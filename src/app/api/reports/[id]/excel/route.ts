import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ─── Brand colours (ARGB hex for ExcelJS) ─────────────────────────────────
const BRAND = {
  violet:       "FF8B5CF6",
  violetDark:   "FF6D28D9",
  violetLight:  "FFF5F3FF",
  bgDark:       "FF18181B",
  bgCard:       "FF27272A",
  heading:      "FFF0F0F5",
  muted:        "FF71717A",
  white:        "FFFFFFFF",
  borderLine:   "FF3F3F46",
  success:      "FF22C55E",
  successLight: "FFD1FAE5",
  warning:      "FFF59E0B",
  warningLight: "FFFEF3C7",
  blue:         "FF60A5FA",
  blueLight:    "FFDBEAFE",
  red:          "FFEF4444",
  redLight:     "FFFEE2E2",
  gray:         "FF9CA3AF",
  grayLight:    "FFF3F4F6",
};

const KIND_META: Record<string, { label: string; fgColor: string; bgColor: string }> = {
  LEAD:          { label: "FIDAN",         fgColor: BRAND.violet,  bgColor: BRAND.violetLight },
  OPPORTUNITY:   { label: "FIRSAT",        fgColor: "FF059669",    bgColor: BRAND.successLight },
  NEWS:          { label: "HABER",         fgColor: "FF2563EB",    bgColor: BRAND.blueLight },
  MARKET_SIGNAL: { label: "PİYASA",        fgColor: "FFD97706",    bgColor: BRAND.warningLight },
  SYSTEM:        { label: "SİSTEM",        fgColor: "FF6B7280",    bgColor: BRAND.grayLight },
};

function kindMeta(kind: string) {
  return KIND_META[kind] ?? { label: kind, fgColor: BRAND.gray, bgColor: BRAND.grayLight };
}

function applyBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top:    { style: "thin", color: { argb: BRAND.borderLine } },
    left:   { style: "thin", color: { argb: BRAND.borderLine } },
    bottom: { style: "thin", color: { argb: BRAND.borderLine } },
    right:  { style: "thin", color: { argb: BRAND.borderLine } },
  };
}

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

    const wb = new ExcelJS.Workbook();
    wb.creator  = "Uptexx Research Automation";
    wb.created  = new Date();
    wb.modified = new Date();

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 1 — ÖZET (Summary)
    // ════════════════════════════════════════════════════════════════════════
    const ws1 = wb.addWorksheet("Özet", {
      pageSetup: { paperSize: 9, orientation: "portrait" },
      views: [{ showGridLines: false }],
    });

    ws1.columns = [
      { key: "label", width: 24 },
      { key: "value", width: 72 },
    ];

    // ── Brand header row ──
    ws1.mergeCells("A1:B1");
    const headerCell = ws1.getCell("A1");
    headerCell.value  = "UPTEXX RESEARCH AUTOMATION";
    headerCell.font   = { name: "Calibri", bold: true, size: 16, color: { argb: BRAND.white } };
    headerCell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.violetDark } };
    headerCell.alignment = { vertical: "middle", horizontal: "center" };
    ws1.getRow(1).height = 40;

    // ── Subtitle row ──
    ws1.mergeCells("A2:B2");
    const subCell = ws1.getCell("A2");
    subCell.value = "Araştırma Raporu";
    subCell.font  = { name: "Calibri", size: 11, italic: true, color: { argb: BRAND.muted } };
    subCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.bgDark } };
    subCell.alignment = { horizontal: "center", vertical: "middle" };
    ws1.getRow(2).height = 22;

    // blank separator
    ws1.addRow([]);

    // ── Meta table ──
    const metaRows = [
      { label: "Rapor Başlığı", value: report.title },
      { label: "Ajan",          value: report.agent.name },
      { label: "Tarih",         value: report.createdAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" }) },
      { label: "Bulgu Sayısı",  value: report.findings.length },
    ];

    metaRows.forEach((mr, idx) => {
      const row = ws1.addRow([mr.label, mr.value]);
      row.height = 22;

      const labelCell = row.getCell(1);
      labelCell.font  = { name: "Calibri", bold: true, size: 11, color: { argb: BRAND.white } };
      labelCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? BRAND.bgDark : BRAND.bgCard } };
      labelCell.alignment = { vertical: "middle", wrapText: true };
      applyBorder(labelCell);

      const valCell = row.getCell(2);
      valCell.font  = { name: "Calibri", size: 11, color: { argb: BRAND.heading } };
      valCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: idx % 2 === 0 ? BRAND.bgDark : BRAND.bgCard } };
      valCell.alignment = { vertical: "middle", wrapText: true };
      applyBorder(valCell);
    });

    // blank
    ws1.addRow([]);

    // ── Summary text header ──
    const ozRow = ws1.addRow(["ÖZET", ""]);
    ws1.mergeCells(`A${ozRow.number}:B${ozRow.number}`);
    const ozCell = ws1.getCell(`A${ozRow.number}`);
    ozCell.value = "ÖZET";
    ozCell.font  = { name: "Calibri", bold: true, size: 12, color: { argb: BRAND.violet } };
    ozCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.bgDark } };
    ozCell.alignment = { horizontal: "left", vertical: "middle" };
    ozRow.height = 26;
    applyBorder(ozCell);

    // summary body
    const sumRow = ws1.addRow(["", report.summary || "Özet bulunamadı."]);
    ws1.mergeCells(`A${sumRow.number}:B${sumRow.number}`);
    const sumCell = ws1.getCell(`A${sumRow.number}`);
    sumCell.value = report.summary || "Özet bulunamadı.";
    sumCell.font  = { name: "Calibri", size: 11, color: { argb: BRAND.heading } };
    sumCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.bgCard } };
    sumCell.alignment = { wrapText: true, vertical: "top" };
    applyBorder(sumCell);
    sumRow.height = Math.max(60, Math.min(240, (report.summary?.length ?? 0) / 3));

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 2 — BULGULAR (Findings)
    // ════════════════════════════════════════════════════════════════════════
    const ws2 = wb.addWorksheet("Bulgular", {
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
      views: [{ showGridLines: false }],
    });

    ws2.columns = [
      { key: "no",       width: 5  },
      { key: "kind",     width: 14 },
      { key: "score",    width: 8  },
      { key: "title",    width: 42 },
      { key: "body",     width: 72 },
      { key: "source",   width: 40 },
    ];

    // ── Sheet header ──
    ws2.mergeCells("A1:F1");
    const f1 = ws2.getCell("A1");
    f1.value = `BULGULAR — ${report.title}`;
    f1.font  = { name: "Calibri", bold: true, size: 14, color: { argb: BRAND.white } };
    f1.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.violetDark } };
    f1.alignment = { horizontal: "center", vertical: "middle" };
    ws2.getRow(1).height = 36;

    // ── Column headers ──
    const colHeaders = ["#", "TÜR", "SKOR", "BAŞLIK", "İÇERİK", "KAYNAK"];
    const colHeaderRow = ws2.addRow(colHeaders);
    colHeaderRow.height = 24;
    colHeaderRow.eachCell((cell) => {
      cell.font  = { name: "Calibri", bold: true, size: 10, color: { argb: BRAND.white } };
      cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.bgDark } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      applyBorder(cell);
    });

    // ── Data rows ──
    report.findings.forEach((finding, i) => {
      const km = kindMeta(finding.kind);
      const row = ws2.addRow([
        i + 1,
        km.label,
        finding.score ?? "—",
        finding.title,
        finding.body,
        finding.sourceUrl ?? "",
      ]);

      row.height = Math.max(32, Math.min(120, (finding.body?.length ?? 0) / 4 + 24));

      row.eachCell((cell, colNum) => {
        const isEven = i % 2 === 0;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isEven ? BRAND.bgCard : BRAND.bgDark } };
        cell.font = { name: "Calibri", size: 10, color: { argb: BRAND.heading } };
        cell.alignment = { wrapText: true, vertical: "top" };
        applyBorder(cell);

        // index — centered
        if (colNum === 1) {
          cell.font = { name: "Calibri", bold: true, size: 10, color: { argb: BRAND.violet } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
        }

        // kind — colored pill style
        if (colNum === 2) {
          cell.font = { name: "Calibri", bold: true, size: 9, color: { argb: km.fgColor } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: km.bgColor + "44" } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
        }

        // score — centered
        if (colNum === 3) {
          cell.alignment = { horizontal: "center", vertical: "top" };
          cell.font = { name: "Calibri", size: 10, color: { argb: BRAND.warning } };
        }

        // title — bold
        if (colNum === 4) {
          cell.font = { name: "Calibri", bold: true, size: 10, color: { argb: BRAND.heading } };
        }

        // source — hyperlink style
        if (colNum === 6 && finding.sourceUrl) {
          cell.font = { name: "Calibri", size: 9, color: { argb: BRAND.blue }, underline: true };
          cell.value = { text: finding.sourceUrl, hyperlink: finding.sourceUrl };
        }
      });
    });

    // ─── Freeze header rows ────────────────────────────────────────────────
    ws2.views = [{ state: "frozen", xSplit: 0, ySplit: 2, showGridLines: false }];

    // ─── Serialize ─────────────────────────────────────────────────────────
    const buf = Buffer.from(await wb.xlsx.writeBuffer());

    const safeTitle = (report.title || "rapor")
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
    console.error("Excel generation failed:", error);
    return NextResponse.json(
      { error: "Excel oluşturulurken hata meydana geldi." },
      { status: 500 }
    );
  }
}
